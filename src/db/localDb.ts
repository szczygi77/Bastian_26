import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type {
  Alert,
  AuditEntry,
  DroneMission,
  IKObject,
  Incident,
  Recommendation,
  ScenarioRun,
} from '@/types'

const DB_NAME = 'bastion-local'
const DB_VERSION = 1

export type SyncEntity =
  | 'audit_entries'
  | 'alerts'
  | 'incidents'
  | 'drone_missions'
  | 'ik_object_states'
  | 'scenario_runs'
  | 'recommendations'

export interface SyncQueueItem {
  id: string
  entity: SyncEntity
  entityId: string
  payload: Record<string, unknown>
  createdAt: string
  attempts: number
}

interface BastionLocalDB extends DBSchema {
  audit_entries: { key: string; value: AuditEntry; indexes: { 'by-timestamp': string } }
  alerts: { key: string; value: Alert; indexes: { 'by-timestamp': string } }
  incidents: { key: string; value: Incident }
  drone_missions: { key: string; value: DroneMission; indexes: { 'by-assigned': string } }
  ik_object_states: { key: string; value: Pick<IKObject, 'id' | 'status' | 'coordinates'> }
  scenario_runs: { key: string; value: ScenarioRun }
  recommendations: { key: string; value: Recommendation }
  sync_queue: { key: string; value: SyncQueueItem; indexes: { 'by-created': string } }
  meta: { key: string; value: { key: string; value: string } }
}

let dbPromise: Promise<IDBPDatabase<BastionLocalDB>> | null = null

export function getLocalDb(): Promise<IDBPDatabase<BastionLocalDB>> {
  if (!dbPromise) {
    dbPromise = openDB<BastionLocalDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const audit = db.createObjectStore('audit_entries', { keyPath: 'id' })
        audit.createIndex('by-timestamp', 'timestamp')

        const alerts = db.createObjectStore('alerts', { keyPath: 'id' })
        alerts.createIndex('by-timestamp', 'timestamp')

        db.createObjectStore('incidents', { keyPath: 'id' })

        const missions = db.createObjectStore('drone_missions', { keyPath: 'id' })
        missions.createIndex('by-assigned', 'assignedAt')

        db.createObjectStore('ik_object_states', { keyPath: 'id' })
        db.createObjectStore('scenario_runs', { keyPath: 'id' })
        db.createObjectStore('recommendations', { keyPath: 'id' })

        const queue = db.createObjectStore('sync_queue', { keyPath: 'id' })
        queue.createIndex('by-created', 'createdAt')

        db.createObjectStore('meta', { keyPath: 'key' })
      },
    })
  }
  return dbPromise
}

export async function putAuditEntry(entry: AuditEntry): Promise<void> {
  const db = await getLocalDb()
  await db.put('audit_entries', entry)
}

export async function getAllAuditEntries(): Promise<AuditEntry[]> {
  const db = await getLocalDb()
  const rows = await db.getAllFromIndex('audit_entries', 'by-timestamp')
  return rows.reverse()
}

export async function putAlert(alert: Alert): Promise<void> {
  const db = await getLocalDb()
  await db.put('alerts', alert)
}

export async function putAlerts(alerts: Alert[]): Promise<void> {
  const db = await getLocalDb()
  const tx = db.transaction('alerts', 'readwrite')
  await Promise.all(alerts.map(a => tx.store.put(a)))
  await tx.done
}

export async function getAllAlerts(): Promise<Alert[]> {
  const db = await getLocalDb()
  const rows = await db.getAllFromIndex('alerts', 'by-timestamp')
  return rows.reverse()
}

export async function putIncident(incident: Incident): Promise<void> {
  const db = await getLocalDb()
  await db.put('incidents', incident)
}

export async function getAllIncidents(): Promise<Incident[]> {
  const db = await getLocalDb()
  return db.getAll('incidents')
}

export async function putMission(mission: DroneMission): Promise<void> {
  const db = await getLocalDb()
  await db.put('drone_missions', mission)
}

export async function putMissions(missions: DroneMission[]): Promise<void> {
  const db = await getLocalDb()
  const tx = db.transaction('drone_missions', 'readwrite')
  await Promise.all(missions.map(m => tx.store.put(m)))
  await tx.done
}

export async function getAllMissions(): Promise<DroneMission[]> {
  const db = await getLocalDb()
  const rows = await db.getAllFromIndex('drone_missions', 'by-assigned')
  return rows.reverse()
}

export async function putIkState(state: Pick<IKObject, 'id' | 'status' | 'coordinates'>): Promise<void> {
  const db = await getLocalDb()
  await db.put('ik_object_states', state)
}

export async function getAllIkStates(): Promise<Array<Pick<IKObject, 'id' | 'status' | 'coordinates'>>> {
  const db = await getLocalDb()
  return db.getAll('ik_object_states')
}

export async function putScenarioRun(run: ScenarioRun): Promise<void> {
  const db = await getLocalDb()
  await db.put('scenario_runs', run)
}

export async function getAllScenarioRuns(): Promise<ScenarioRun[]> {
  const db = await getLocalDb()
  return db.getAll('scenario_runs')
}

export async function putRecommendation(rec: Recommendation): Promise<void> {
  const db = await getLocalDb()
  await db.put('recommendations', rec)
}

export async function getAllRecommendations(): Promise<Recommendation[]> {
  const db = await getLocalDb()
  return db.getAll('recommendations')
}

export async function enqueueSync(item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'attempts'>): Promise<void> {
  const db = await getLocalDb()
  await db.put('sync_queue', {
    ...item,
    id: `${item.entity}:${item.entityId}:${Date.now()}`,
    createdAt: new Date().toISOString(),
    attempts: 0,
  })
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getLocalDb()
  return db.getAllFromIndex('sync_queue', 'by-created')
}

export async function removeSyncItem(id: string): Promise<void> {
  const db = await getLocalDb()
  await db.delete('sync_queue', id)
}

export async function incrementSyncAttempt(id: string): Promise<void> {
  const db = await getLocalDb()
  const item = await db.get('sync_queue', id)
  if (!item) return
  await db.put('sync_queue', { ...item, attempts: item.attempts + 1 })
}

export async function setMeta(key: string, value: string): Promise<void> {
  const db = await getLocalDb()
  await db.put('meta', { key, value })
}

export async function getMeta(key: string): Promise<string | null> {
  const db = await getLocalDb()
  const row = await db.get('meta', key)
  return row?.value ?? null
}

export async function checkLocalDbHealth(): Promise<'healthy' | 'degraded' | 'error'> {
  try {
    const db = await getLocalDb()
    await db.count('meta')
    return 'healthy'
  } catch {
    return 'error'
  }
}
