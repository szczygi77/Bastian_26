import type {
  Alert,
  AuditEntry,
  DroneMission,
  IKObject,
  Incident,
  Recommendation,
  ScenarioRun,
} from '@/types'
import {
  checkLocalDbHealth,
  enqueueSync,
  getAllAlerts,
  getAllAuditEntries,
  getAllIkStates,
  getAllIncidents,
  getAllMissions,
  getAllRecommendations,
  getAllScenarioRuns,
  getMeta,
  getSyncQueue,
  incrementSyncAttempt,
  putAlert,
  putAlerts,
  putAuditEntry,
  putIkState,
  putIncident,
  putMission,
  putRecommendation,
  putScenarioRun,
  removeSyncItem,
  setMeta,
  type SyncEntity,
} from '@/db/localDb'
import {
  deserializeAlert,
  deserializeAuditEntry,
  deserializeIncident,
  deserializeMission,
  deserializeRecommendation,
  deserializeScenarioRun,
  serializeAlert,
  serializeAuditEntry,
  serializeIkState,
  serializeIncident,
  serializeMission,
  serializeRecommendation,
  serializeScenarioRun,
} from '@/db/serializers'
import { getSupabaseClient, testSupabaseConnection } from '@/db/supabaseClient'
import { hasSupabaseConfig } from '@/config/env'

export interface HydratedAppData {
  auditEntries: AuditEntry[]
  alerts: Alert[]
  incidents: Incident[]
  missions: DroneMission[]
  recommendations: Recommendation[]
  scenarioRuns: ScenarioRun[]
  ikStates: Array<Pick<IKObject, 'id' | 'status' | 'coordinates'>>
}

let remoteAvailable = false

export function isRemoteDatabaseAvailable(): boolean {
  return remoteAvailable && hasSupabaseConfig()
}

async function queueRemote(entity: SyncEntity, entityId: string, payload: Record<string, unknown>): Promise<void> {
  if (!hasSupabaseConfig()) return
  await enqueueSync({ entity, entityId, payload })
}

async function upsertRemote(entity: SyncEntity, payload: Record<string, unknown>): Promise<boolean> {
  const supabase = getSupabaseClient()
  if (!supabase || !remoteAvailable) return false

  const table = entity
  const { error } = await supabase.from(table).upsert(payload, { onConflict: 'id' })
  return !error
}

export async function initDatabase(): Promise<{ localOk: boolean; remoteOk: boolean }> {
  const localStatus = await checkLocalDbHealth()
  remoteAvailable = hasSupabaseConfig() ? await testSupabaseConnection() : false
  return {
    localOk: localStatus === 'healthy',
    remoteOk: remoteAvailable,
  }
}

export async function hydrateFromDatabase(): Promise<HydratedAppData> {
  if (remoteAvailable) {
    await pullFromRemote()
  }

  const [auditEntries, alerts, incidents, missions, recommendations, scenarioRuns, ikStates] = await Promise.all([
    getAllAuditEntries(),
    getAllAlerts(),
    getAllIncidents(),
    getAllMissions(),
    getAllRecommendations(),
    getAllScenarioRuns(),
    getAllIkStates(),
  ])

  return { auditEntries, alerts, incidents, missions, recommendations, scenarioRuns, ikStates }
}

async function pullFromRemote(): Promise<void> {
  const supabase = getSupabaseClient()
  if (!supabase) return

  const lastSync = await getMeta('last_remote_sync')
  const since = lastSync ?? '1970-01-01T00:00:00.000Z'

  const [auditRes, alertsRes, missionsRes] = await Promise.all([
    supabase.from('audit_entries').select('*').gte('timestamp', since).order('timestamp', { ascending: false }).limit(500),
    supabase.from('alerts').select('*').gte('updated_at', since).order('timestamp', { ascending: false }).limit(200),
    supabase.from('drone_missions').select('*').gte('updated_at', since).order('assigned_at', { ascending: false }).limit(100),
  ])

  if (auditRes.data) {
    for (const row of auditRes.data) {
      await putAuditEntry(deserializeAuditEntry(row as Record<string, unknown>))
    }
  }
  if (alertsRes.data) {
    for (const row of alertsRes.data) {
      await putAlert(deserializeAlert(row as Record<string, unknown>))
    }
  }
  if (missionsRes.data) {
    for (const row of missionsRes.data) {
      await putMission(deserializeMission(row as Record<string, unknown>))
    }
  }

  await setMeta('last_remote_sync', new Date().toISOString())
}

export async function saveAuditEntry(entry: AuditEntry): Promise<void> {
  await putAuditEntry(entry)
  const payload = serializeAuditEntry(entry)
  if (await upsertRemote('audit_entries', payload)) return
  await queueRemote('audit_entries', entry.id, payload)
}

export async function saveAlert(alert: Alert): Promise<void> {
  await putAlert(alert)
  const payload = serializeAlert(alert)
  if (await upsertRemote('alerts', payload)) return
  await queueRemote('alerts', alert.id, payload)
}

export async function saveAlerts(alerts: Alert[]): Promise<void> {
  await putAlerts(alerts)
  for (const alert of alerts) {
    const payload = serializeAlert(alert)
    if (!(await upsertRemote('alerts', payload))) {
      await queueRemote('alerts', alert.id, payload)
    }
  }
}

export async function saveIncident(incident: Incident): Promise<void> {
  await putIncident(incident)
  const payload = serializeIncident(incident)
  if (await upsertRemote('incidents', payload)) return
  await queueRemote('incidents', incident.id, payload)
}

export async function saveMission(mission: DroneMission): Promise<void> {
  await putMission(mission)
  const payload = serializeMission(mission)
  if (await upsertRemote('drone_missions', payload)) return
  await queueRemote('drone_missions', mission.id, payload)
}

export async function saveIkObjectState(state: Pick<IKObject, 'id' | 'status' | 'coordinates'>): Promise<void> {
  await putIkState(state)
  const payload = serializeIkState(state)
  if (await upsertRemote('ik_object_states', payload)) return
  await queueRemote('ik_object_states', state.id, payload)
}

export async function saveScenarioRun(run: ScenarioRun): Promise<void> {
  await putScenarioRun(run)
  const payload = serializeScenarioRun(run)
  if (await upsertRemote('scenario_runs', payload)) return
  await queueRemote('scenario_runs', run.id, payload)
}

export async function saveRecommendation(rec: Recommendation): Promise<void> {
  await putRecommendation(rec)
  const payload = serializeRecommendation(rec)
  if (await upsertRemote('recommendations', payload)) return
  await queueRemote('recommendations', rec.id, payload)
}

export async function flushSyncQueue(): Promise<number> {
  if (!remoteAvailable) return 0
  const queue = await getSyncQueue()
  let synced = 0

  for (const item of queue) {
    const ok = await upsertRemote(item.entity, item.payload)
    if (ok) {
      await removeSyncItem(item.id)
      synced += 1
    } else {
      await incrementSyncAttempt(item.id)
    }
  }

  return synced
}

export async function getSyncQueueLength(): Promise<number> {
  const queue = await getSyncQueue()
  return queue.length
}

export async function getLocalDbStatus(): Promise<'healthy' | 'degraded' | 'error'> {
  return checkLocalDbHealth()
}

export function applyIkStates(objects: IKObject[], states: HydratedAppData['ikStates']): IKObject[] {
  if (states.length === 0) return objects
  const byId = new Map(states.map(s => [s.id, s]))
  return objects.map(obj => {
    const saved = byId.get(obj.id)
    if (!saved) return obj
    return { ...obj, status: saved.status, coordinates: saved.coordinates }
  })
}
