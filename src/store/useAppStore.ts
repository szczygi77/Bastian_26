import { create } from 'zustand'
import type {
  Alert,
  AuditEntry,
  CascadeResult,
  DroneMission,
  DroneUnit,
  IKObject,
  Incident,
  Operator,
  Recommendation,
  ScenarioRun,
  SystemHealth,
  SystemMode,
} from '@/types'
import { IK_OBJECTS, STALOWA_WOLA_CENTER } from '@/data/stalowa-wola'
import { DRONE_FLEET } from '@/data/drones'
import { logAction } from '@/services/auditLogService'
import { refreshPublicDataLayer } from '@/services/dataSyncService'
import { getSystemHealth, buildSystemHealth } from '@/services/systemHealthService'
import { getPublicDataSources } from '@/services/publicDataStatusService'
import type { PublicDataSourceStatus } from '@/types'
import { resolveIkLocations, syncDroneCoordinates } from '@/services/ikLocationService'
import { tickMissionState } from '@/services/missionSimulation'
import {
  applyIkStates,
  saveAlert,
  saveAlerts,
  saveAuditEntry,
  saveIkObjectState,
  saveIncident,
  saveMission,
  saveRecommendation,
  saveScenarioRun,
  type HydratedAppData,
} from '@/services/databaseService'

interface AppState {
  // Auth
  operator: Operator | null
  setOperator: (op: Operator | null) => void

  // Mode
  mode: SystemMode
  setMode: (mode: SystemMode) => void

  // Online
  online: boolean
  setOnline: (online: boolean) => void

  // IK Objects
  ikObjects: IKObject[]
  ikLocationsLoading: boolean
  ikLocationsResolved: boolean
  mapCenter: [number, number]
  loadIkLocations: (force?: boolean) => Promise<void>
  updateObjectStatus: (id: string, status: IKObject['status']) => void
  resetObjectStatuses: () => void

  // Alerts
  alerts: Alert[]
  addAlerts: (alerts: Alert[]) => void
  updateAlert: (id: string, patch: Partial<Alert>) => void
  clearAlerts: () => void

  // Incidents
  incidents: Incident[]
  addIncident: (incident: Incident) => void
  updateIncident: (id: string, patch: Partial<Incident>) => void

  // Scenario
  activeScenarioRun: ScenarioRun | null
  setActiveScenarioRun: (run: ScenarioRun | null) => void
  cascadeResult: CascadeResult | null
  setCascadeResult: (result: CascadeResult | null) => void

  // Recommendations
  recommendations: Recommendation[]
  addRecommendation: (rec: Recommendation) => void
  approveAction: (recId: string, actionId: string) => void

  // Drones
  drones: DroneUnit[]
  updateDrone: (id: string, patch: Partial<DroneUnit>) => void
  missions: DroneMission[]
  addMission: (mission: DroneMission) => void
  updateMission: (id: string, patch: Partial<DroneMission>) => void
  tickActiveMissions: () => void

  // Audit
  auditEntries: AuditEntry[]
  addAuditEntry: (entry: AuditEntry) => void

  // System Health
  systemHealth: SystemHealth
  refreshSystemHealth: () => Promise<void>

  // UI
  sidebarExpanded: boolean
  setSidebarExpanded: (val: boolean) => void
  activeView: string
  setActiveView: (view: string) => void
  activeIncidentId: string | null
  setActiveIncidentId: (id: string | null) => void
  openIncidentCommand: (incidentId?: string | null) => void
  incidentMapFilter: string[] | null
  setIncidentMapFilter: (ids: string[] | null) => void
  publicDataSources: PublicDataSourceStatus[]
  refreshPublicDataSources: () => void
  eventHeartbeatAt: Date
  pulseEventHeartbeat: () => void
  focusedIkObjectId: string | null
  setFocusedIkObjectId: (id: string | null) => void
  openIkObjectOnMap: (id: string) => void
  openIkObjectOnGraph: (id: string) => void
  openIkObjectAlerts: (id: string) => void
  openScenarios: () => void
  focusedDroneMissionId: string | null
  setFocusedDroneMissionId: (id: string | null) => void
  openDroneMissionOnMap: (missionId: string) => void

  // Database
  hydrateDatabase: (data: HydratedAppData) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  operator: null,
  setOperator: (op) => set({ operator: op }),

  mode: 'live',
  setMode: (mode) => {
    const op = get().operator
    const entry = logAction({
      operator: op?.name ?? 'SYSTEM',
      action: 'mode_change',
      details: `Zmiana trybu systemu na: ${mode.toUpperCase()}`,
      mode,
    })
    set(state => ({ mode, auditEntries: [entry, ...state.auditEntries] }))
  },

  online: navigator.onLine,
  setOnline: (online) => set({ online }),

  ikObjects: IK_OBJECTS,
  ikLocationsLoading: false,
  ikLocationsResolved: false,
  mapCenter: STALOWA_WOLA_CENTER,
  loadIkLocations: async (force = false) => {
    const state = get()
    if (state.ikLocationsLoading) return
    if (state.ikLocationsResolved && !force) return

    set({ ikLocationsLoading: true })

    try {
      const result = await resolveIkLocations({ force })
      const drones = syncDroneCoordinates(state.drones, result.objects)

      set({
        ikObjects: result.objects,
        drones,
        mapCenter: result.mapCenter,
        ikLocationsResolved: true,
        ikLocationsLoading: false,
      })
    } catch {
      set({ ikLocationsResolved: true, ikLocationsLoading: false })
    }
  },
  updateObjectStatus: (id, status) => {
    set(state => {
      const ikObjects = state.ikObjects.map(o => (o.id === id ? { ...o, status } : o))
      const updated = ikObjects.find(o => o.id === id)
      if (updated) {
        void saveIkObjectState({ id: updated.id, status: updated.status, coordinates: updated.coordinates }).catch(() => {})
      }
      return { ikObjects }
    })
  },
  resetObjectStatuses: () =>
    set(state => ({
      ikObjects: IK_OBJECTS.map(base => {
        const current = state.ikObjects.find(o => o.id === base.id)
        return current ? { ...base, coordinates: current.coordinates } : base
      }),
    })),

  alerts: [],
  addAlerts: (alerts) => {
    set(state => ({ alerts: [...alerts, ...state.alerts] }))
    void saveAlerts(alerts).catch(() => {})
  },
  updateAlert: (id, patch) => {
    set(state => {
      const alerts = state.alerts.map(a => (a.id === id ? { ...a, ...patch } : a))
      const updated = alerts.find(a => a.id === id)
      if (updated) void saveAlert(updated).catch(() => {})
      return { alerts }
    })
  },
  clearAlerts: () => set({ alerts: [] }),

  incidents: [],
  addIncident: (incident) => {
    set(state => ({ incidents: [incident, ...state.incidents] }))
    void saveIncident(incident).catch(() => {})
  },
  updateIncident: (id, patch) => {
    set(state => {
      const incidents = state.incidents.map(i => (i.id === id ? { ...i, ...patch } : i))
      const updated = incidents.find(i => i.id === id)
      if (updated) void saveIncident(updated).catch(() => {})
      return { incidents }
    })
  },

  activeScenarioRun: null,
  setActiveScenarioRun: (run) => {
    set({ activeScenarioRun: run })
    if (run) void saveScenarioRun(run).catch(() => {})
  },
  cascadeResult: null,
  setCascadeResult: (result) => set({ cascadeResult: result }),

  recommendations: [],
  addRecommendation: (rec) => {
    set(state => ({ recommendations: [rec, ...state.recommendations] }))
    void saveRecommendation(rec).catch(() => {})
  },
  approveAction: (recId, actionId) =>
    set(state => ({
      recommendations: state.recommendations.map(r =>
        r.id === recId
          ? { ...r, actions: r.actions.map(a => (a.id === actionId ? { ...a, approved: true } : a)) }
          : r
      ),
    })),

  drones: DRONE_FLEET,
  updateDrone: (id, patch) =>
    set(state => ({
      drones: state.drones.map(d => (d.id === id ? { ...d, ...patch } : d)),
    })),
  missions: [],
  addMission: (mission) => {
    set(state => ({ missions: [mission, ...state.missions] }))
    void saveMission(mission).catch(() => {})
  },
  updateMission: (id, patch) => {
    set(state => {
      const missions = state.missions.map(m => (m.id === id ? { ...m, ...patch } : m))
      const updated = missions.find(m => m.id === id)
      if (updated) void saveMission(updated).catch(() => {})
      return { missions }
    })
  },
  tickActiveMissions: () =>
    set(state => {
      let missions = [...state.missions]
      let drones = [...state.drones]
      let changed = false

      for (const mission of missions) {
        if (mission.status === 'completed') continue
        const droneIndex = drones.findIndex(d => d.id === mission.droneId)
        if (droneIndex === -1) continue

        const target = state.ikObjects.find(o => o.id === mission.targetObjectId)
        const { mission: nextMission, drone: dronePatch } = tickMissionState(mission, drones[droneIndex], target)

        const missionChanged =
          nextMission.status !== mission.status ||
          nextMission.progressPercent !== mission.progressPercent ||
          nextMission.onSiteTicks !== mission.onSiteTicks ||
          nextMission.currentActivityIndex !== mission.currentActivityIndex ||
          nextMission.activityLabel !== mission.activityLabel ||
          nextMission.activityProgress !== mission.activityProgress ||
          (nextMission.findings?.length ?? 0) !== (mission.findings?.length ?? 0) ||
          nextMission.result !== mission.result

        if (missionChanged) {
          missions = missions.map(m => (m.id === mission.id ? nextMission : m))
          void saveMission(nextMission).catch(() => {})
          changed = true
        }

        const droneUpdate: Partial<typeof drones[number]> = {
          ...(dronePatch ?? {}),
          mission: nextMission.status === 'completed' ? undefined : nextMission,
        }

        if (dronePatch || missionChanged) {
          drones[droneIndex] = { ...drones[droneIndex], ...droneUpdate }
          changed = true
        }
      }

      return changed ? { missions, drones } : state
    }),

  auditEntries: [],
  addAuditEntry: (entry) => {
    set(state => ({ auditEntries: [entry, ...state.auditEntries] }))
    void saveAuditEntry(entry).catch(() => {})
  },

  systemHealth: getSystemHealth(navigator.onLine, 'live'),
  refreshSystemHealth: async () => {
    const state = get()
    const base = await buildSystemHealth(state.online, state.mode)

    if (state.mode !== 'live' || !state.online) {
      set({ systemHealth: base })
      return
    }

    try {
      const sync = await refreshPublicDataLayer()
      set({
        systemHealth: {
          ...base,
          publicDataSyncStatus: sync.publicDataSyncStatus,
          satelliteCacheStatus: sync.satelliteCacheStatus,
          satelliteCacheAge: sync.satelliteCacheAge,
          lastSync: new Date(),
        },
        publicDataSources: getPublicDataSources(state.online),
      })
    } catch {
      set({ systemHealth: base })
    }
  },

  sidebarExpanded: true,
  setSidebarExpanded: (val) => set({ sidebarExpanded: val }),
  activeView: 'dashboard',
  setActiveView: (view) => set({ activeView: view }),
  activeIncidentId: null,
  setActiveIncidentId: (id) => set({ activeIncidentId: id }),
  openIncidentCommand: (incidentId) => {
    const state = get()
    const id = incidentId ?? state.activeIncidentId ?? state.incidents.find(i => i.status === 'open')?.id ?? null
    const incident = id ? state.incidents.find(i => i.id === id) : null
    set({
      activeIncidentId: id,
      activeView: 'incident-command',
      incidentMapFilter: incident?.affectedObjectIds ?? state.cascadeResult
        ? [state.cascadeResult!.incidentObjectId, ...state.cascadeResult!.nodes.map(n => n.objectId)]
        : null,
      cascadeResult: state.cascadeResult,
    })
  },
  incidentMapFilter: null,
  setIncidentMapFilter: (ids) => set({ incidentMapFilter: ids }),
  publicDataSources: getPublicDataSources(navigator.onLine),
  refreshPublicDataSources: () => set({ publicDataSources: getPublicDataSources(get().online) }),
  eventHeartbeatAt: new Date(),
  pulseEventHeartbeat: () => set({ eventHeartbeatAt: new Date() }),
  focusedIkObjectId: null,
  setFocusedIkObjectId: (id) => set({ focusedIkObjectId: id }),
  openIkObjectOnMap: (id) => set({ focusedIkObjectId: id, activeView: 'map' }),
  openIkObjectOnGraph: (id) => set({ focusedIkObjectId: id, activeView: 'graph' }),
  openIkObjectAlerts: (id) => set({ focusedIkObjectId: id, activeView: 'alerts' }),
  openScenarios: () => set({ activeView: 'incidents' }),
  focusedDroneMissionId: null,
  setFocusedDroneMissionId: (id) => set({ focusedDroneMissionId: id }),
  openDroneMissionOnMap: (missionId) => set({ focusedDroneMissionId: missionId, activeView: 'map' }),

  hydrateDatabase: (data) =>
    set(state => ({
      auditEntries: data.auditEntries.length > 0 ? data.auditEntries : state.auditEntries,
      alerts: data.alerts.length > 0 ? data.alerts : state.alerts,
      incidents: data.incidents.length > 0 ? data.incidents : state.incidents,
      missions: data.missions.length > 0 ? data.missions : state.missions,
      recommendations: data.recommendations.length > 0 ? data.recommendations : state.recommendations,
      ikObjects: applyIkStates(state.ikObjects, data.ikStates),
    })),
}))
