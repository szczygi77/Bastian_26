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
import { getSystemHealth } from '@/services/systemHealthService'
import { resolveIkLocations, syncDroneCoordinates } from '@/services/ikLocationService'

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
  updateObjectStatus: (id, status) =>
    set(state => ({
      ikObjects: state.ikObjects.map(o => (o.id === id ? { ...o, status } : o)),
    })),
  resetObjectStatuses: () =>
    set(state => ({
      ikObjects: IK_OBJECTS.map(base => {
        const current = state.ikObjects.find(o => o.id === base.id)
        return current ? { ...base, coordinates: current.coordinates } : base
      }),
    })),

  alerts: [],
  addAlerts: (alerts) =>
    set(state => ({ alerts: [...alerts, ...state.alerts] })),
  updateAlert: (id, patch) =>
    set(state => ({
      alerts: state.alerts.map(a => (a.id === id ? { ...a, ...patch } : a)),
    })),
  clearAlerts: () => set({ alerts: [] }),

  incidents: [],
  addIncident: (incident) =>
    set(state => ({ incidents: [incident, ...state.incidents] })),

  activeScenarioRun: null,
  setActiveScenarioRun: (run) => set({ activeScenarioRun: run }),
  cascadeResult: null,
  setCascadeResult: (result) => set({ cascadeResult: result }),

  recommendations: [],
  addRecommendation: (rec) =>
    set(state => ({ recommendations: [rec, ...state.recommendations] })),
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
  addMission: (mission) =>
    set(state => ({ missions: [mission, ...state.missions] })),

  auditEntries: [],
  addAuditEntry: (entry) =>
    set(state => ({ auditEntries: [entry, ...state.auditEntries] })),

  systemHealth: getSystemHealth(navigator.onLine, 'live'),
  refreshSystemHealth: async () => {
    const state = get()
    const base = getSystemHealth(state.online, state.mode)

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
      })
    } catch {
      set({ systemHealth: base })
    }
  },

  sidebarExpanded: true,
  setSidebarExpanded: (val) => set({ sidebarExpanded: val }),
  activeView: 'dashboard',
  setActiveView: (view) => set({ activeView: view }),
}))
