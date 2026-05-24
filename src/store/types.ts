import type {
  Alert,
  AuditEntry,
  CascadeReplayFrame,
  CascadeResult,
  ContainmentRecoveryState,
  ContainmentSimulationResult,
  DroneMission,
  DroneUnit,
  GraphComputeState,
  IKObject,
  Incident,
  NationalRegionSummary,
  OperationalEvent,
  OperationalPulse,
  OperationalTelemetry,
  Operator,
  PublicDataSourceStatus,
  Recommendation,
  ScenarioRun,
  SystemHealth,
  SystemMode,
} from '@/types'

export interface AppState {
  operator: Operator | null
  setOperator: (op: Operator | null) => void

  mode: SystemMode
  setMode: (mode: SystemMode) => void

  online: boolean
  setOnline: (online: boolean) => void

  ikObjects: IKObject[]
  ikLocationsLoading: boolean
  ikLocationsResolved: boolean
  mapCenter: [number, number]
  loadIkLocations: (force?: boolean) => Promise<void>
  updateObjectStatus: (id: string, status: IKObject['status']) => void
  resetObjectStatuses: () => void

  alerts: Alert[]
  addAlerts: (alerts: Alert[]) => void
  updateAlert: (id: string, patch: Partial<Alert>) => void
  clearAlerts: () => void

  incidents: Incident[]
  addIncident: (incident: Incident) => void
  updateIncident: (id: string, patch: Partial<Incident>) => void
  restoreIncidentContext: (incidentId?: string, forceScenarioReapply?: boolean) => boolean
  containIncident: (incidentId: string, summary: string) => void
  handoverIncident: (incidentId: string, toShift: string, summary: string) => void
  resolveIncident: (incidentId: string, summary: string) => void
  abortScenarioOperation: (summary?: string) => void

  activeScenarioRun: ScenarioRun | null
  setActiveScenarioRun: (run: ScenarioRun | null) => void
  cascadeResult: CascadeResult | null
  setCascadeResult: (result: CascadeResult | null) => void

  recommendations: Recommendation[]
  addRecommendation: (rec: Recommendation) => void
  approveAction: (recId: string, actionId: string) => Promise<void>
  rejectAction: (recId: string) => void

  cascadeReplayFrames: CascadeReplayFrame[]
  cascadeReplayIndex: number
  setCascadeReplayIndex: (index: number) => void
  startCascadeReplay: () => void
  containmentResult: ContainmentSimulationResult | null
  simulateContainmentAt: (nodeIds: string[]) => void
  clearContainment: () => void
  activeCascadeView: CascadeResult | null
  selectedNodeForContainment: string | null
  setSelectedNodeForContainment: (id: string | null) => void

  operationalEvents: OperationalEvent[]
  operationalPulse: OperationalPulse | null
  operationalTelemetry: OperationalTelemetry
  graphComputeState: GraphComputeState
  containmentRecovery: ContainmentRecoveryState | null
  runOperationalHeartbeat: () => Promise<void>
  tickOperationalTelemetry: () => void
  updateGraphComputeState: (simRunning?: boolean) => void

  nationalRegions: NationalRegionSummary[]
  refreshNationalOverview: () => void

  drones: DroneUnit[]
  updateDrone: (id: string, patch: Partial<DroneUnit>) => void
  missions: DroneMission[]
  addMission: (mission: DroneMission) => void
  updateMission: (id: string, patch: Partial<DroneMission>) => void
  tickActiveMissions: () => void

  auditEntries: AuditEntry[]
  addAuditEntry: (entry: AuditEntry) => void

  systemHealth: SystemHealth
  refreshSystemHealth: () => Promise<void>

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

  hydrateDatabase: (data: import('@/services/databaseService').HydratedAppData) => void
}
