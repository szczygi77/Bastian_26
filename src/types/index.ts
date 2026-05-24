// ─── IK Objects ─────────────────────────────────────────────────────────────

export type IKCategory =
  | 'energy'
  | 'water'
  | 'transport'
  | 'telecommunications'
  | 'military'
  | 'emergency'
  | 'government'
  | 'fuel'

export type CriticalityLevel = 1 | 2 | 3 | 4 | 5

export type ObjectStatus = 'operational' | 'degraded' | 'offline' | 'unknown' | 'under_attack'

export interface RiskProfile {
  cyber: number      // 0-100
  physical: number   // 0-100
  supply: number     // 0-100
  overall: number    // 0-100
}

export interface IKObject {
  id: string
  name: string
  shortName: string
  category: IKCategory
  coordinates: [number, number]  // [lat, lng]
  criticality: CriticalityLevel
  status: ObjectStatus
  owner: string
  dependencies: string[]          // ids of objects this depends on
  dependents: string[]            // ids of objects that depend on this
  backupPowerHours: number
  recoveryTimeHours: number
  contactChannel: string
  riskProfile: RiskProfile
  publicDataSources: string[]
  notes?: string
}

// ─── Cascade ────────────────────────────────────────────────────────────────

export interface CascadeNode {
  objectId: string
  depth: number
  affectedAt: number   // minutes from incident start
  severity: 'critical' | 'high' | 'medium' | 'low'
  impactScore: number  // 0-100
  via: string[]        // which dependencies triggered this
  parentNodeId?: string
  propagationPath?: string[]
  dependencyReason?: string
  confidence?: number
}

export interface CascadeResult {
  incidentObjectId: string
  rootCauseNodeId?: string
  nodes: CascadeNode[]
  impactedNodes?: string[]
  totalImpactScore: number
  timelineMinutes: number
  affectedCount: number
  criticalCount: number
  computedAt: Date
  generatedAt?: Date
  engineVersion?: string
  inputHash?: string
  deterministicSignature?: string
}

export interface CascadeReplayFrame {
  timeMinutes: number
  revealedNodeIds: string[]
  label: string
}

export interface ContainmentSimulationResult {
  containedNodeIds: string[]
  baseline: CascadeResult
  contained: CascadeResult
  preventedNodeIds: string[]
  impactReduction: number
  timeSavedMinutes: number
  residualRisk: number
  beforeImpact: number
  afterImpact: number
  beforeAffectedCount: number
  afterAffectedCount: number
  tradeoffBackupLoadIncrease?: number
}

export interface NodeImpactExplanation {
  objectId: string
  name: string
  shortName: string
  parents: string[]
  downstream: string[]
  whyImpacted: string
  criticality: number
  propagationDelayMinutes: number
  recoveryDependencies: string[]
  cascadeNode?: CascadeNode
}

export type OperationalEventType =
  | 'source_refresh'
  | 'cache_validation'
  | 'stale_detected'
  | 'telemetry_pulse'
  | 'graph_verification'
  | 'sync_queue_check'
  | 'integrity_check'
  | 'propagation_pressure'
  | 'connectivity_probe'
  | 'action_executed'
  | 'containment_applied'
  | 'graph_compute'
  | 'recovery_progress'
  | 'stress_signal'
  | 'source_degraded'

export interface OperationalEvent {
  id: string
  type: OperationalEventType
  message: string
  severity: 'info' | 'warning' | 'critical'
  timestamp: Date
}

export interface OperationalPulse {
  syncQueuePressure: number
  propagationPressure: number
  sourceFreshnessAvg: number
  integrityOk: boolean
  lastProbeAt: Date
  eventRatePerMin?: number
  graphComputeMs?: number
  activeSyncJobs?: number
}

export interface OperationalTelemetry {
  packetsProcessed: number
  edgePulsePhase: number
  mapScanPhase: number
  throughputEps: number
  lastTickAt: Date
  stressLevel: number
}

export interface GraphComputeState {
  active: boolean
  algorithm: 'BFS' | 'DFS' | 'CONTAINMENT' | 'RECOVERY' | null
  visitedNodes: number
  totalNodes: number
  iterationMs: number
  label: string
}

export interface ContainmentRecoveryState {
  active: boolean
  progress: number
  threatReduction: number
  trustRecovery: number
  recoveringNodeIds: string[]
  containedNodeIds: string[]
}

export interface ActionImpactPreview {
  impactReductionPct?: number
  collateralRiskPct?: number
  redundancyLossPct?: number
  responseEtaMinutes?: number
  executionComplexity?: 'low' | 'medium' | 'high'
  confidenceAfter?: number
  dependencyRisk?: string
}

export type ActionExecutionState =
  | 'pending'
  | 'approved'
  | 'queued'
  | 'executing'
  | 'executed'
  | 'failed'
  | 'reverted'

export interface ActionExecution {
  id: string
  recommendationId: string
  actionId: string
  incidentId?: string
  state: ActionExecutionState
  queuedAt?: Date
  executedAt?: Date
  error?: string
  operator?: string
}

export interface NationalRegionSummary {
  id: string
  name: string
  sector: string
  incidentCount: number
  openIncidents: number
  ikObjects: number
  degradedObjects: number
  trustScoreAvg: number
  threatLevel: number
  isLiveRegion: boolean
}

// ─── Scenarios ──────────────────────────────────────────────────────────────

export type ScenarioType =
  | 'blackout'
  | 'cyber_attack_ot'
  | 'water_failure'
  | 'power_plant_sabotage'
  | 'connectivity_loss'
  | 'fire'
  | 'flood'
  | 'hsw_attack'
  | 'multi_point_incident'

export interface ScenarioDefinition {
  id: string
  name: string
  type: ScenarioType
  description: string
  triggerObjectId: string
  additionalAffected?: string[]
  initialStatus: ObjectStatus
  severity: 'critical' | 'high' | 'medium'
  icon: string
}

export interface ScenarioRun {
  id: string
  scenarioId: string
  startedAt: Date
  endedAt?: Date
  status: 'running' | 'completed' | 'aborted'
  cascadeResult?: CascadeResult
  generatedAlertIds: string[]
  operatorId: string
  mode: SystemMode
}

// ─── Alerts ─────────────────────────────────────────────────────────────────

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'
export type AlertStatus = 'active' | 'acknowledged' | 'assigned' | 'resolved' | 'escalated'
export type AlertSource =
  | 'cascade_engine'
  | 'scenario_engine'
  | 'public_data'
  | 'manual'
  | 'skymarshal'
  | 'system'

export interface Alert {
  id: string
  title: string
  description: string
  severity: AlertSeverity
  source: AlertSource
  timestamp: Date
  affectedNodes: string[]
  confidence: number           // 0-100
  status: AlertStatus
  assignedOperator?: string
  recommendedActions: string[]
  incidentId?: string
  acknowledgedAt?: Date
  resolvedAt?: Date
  escalatedAt?: Date
  exportId?: string
}

// ─── Incidents ──────────────────────────────────────────────────────────────

export interface Incident {
  id: string
  title: string
  severity: AlertSeverity
  status: 'open' | 'contained' | 'resolved'
  startedAt: Date
  resolvedAt?: Date
  affectedObjectIds: string[]
  alertIds: string[]
  scenarioRunId?: string
  droneAssignmentIds: string[]
  operatorId: string
  notes: string
}

// ─── Drones ─────────────────────────────────────────────────────────────────

export type DroneAgency = 'police' | 'psp' | 'osp' | 'crisis_unit'
export type DroneStatus = 'available' | 'on_mission' | 'charging' | 'maintenance' | 'offline'
export type MissionType =
  | 'reconnaissance'
  | 'thermal_inspection'
  | 'perimeter_monitoring'
  | 'communication_relay'
  | 'fire_assessment'
  | 'medical_delivery'

export interface DroneUnit {
  id: string
  agency: DroneAgency
  model: string
  status: DroneStatus
  battery: number              // 0-100
  payload: string[]
  coordinates: [number, number]
  range: number                // km
  mission?: DroneMission
  availability: boolean
  base: string
  operator: string
  maxFlightTimeMin: number
  protocol: 'mavlink' | 'dji_sdk' | 'mock'
}

export interface DroneMission {
  id: string
  droneId: string
  type: MissionType
  targetObjectId: string
  targetName?: string
  targetShortName?: string
  targetCoordinates: [number, number]
  assignedAt: Date
  estimatedArrivalMin: number
  status: 'dispatched' | 'en_route' | 'on_site' | 'returning' | 'completed'
  incidentId: string
  operatorId: string
  routeOrigin: [number, number]
  currentPosition: [number, number]
  progressPercent: number
  onSiteTicks?: number
  activitySteps?: MissionActivityStep[]
  currentActivityIndex?: number
  activityTick?: number
  activityLabel?: string
  activityProgress?: number
  findings?: MissionFinding[]
  result?: MissionResult
}

export interface MissionActivityStep {
  id: string
  label: string
  description: string
  durationTicks: number
  feedMode?: 'rgb' | 'thermal'
}

export type MissionFindingSeverity = 'info' | 'warning' | 'critical'

export interface MissionFinding {
  id: string
  timestamp: Date
  severity: MissionFindingSeverity
  message: string
}

export type MissionVerdict = 'success' | 'partial' | 'failed'

export interface MissionResult {
  verdict: MissionVerdict
  summary: string
  details: string[]
  recommendations: string[]
  completedAt: Date
}

export interface DroneAssignmentScore {
  droneId: string
  totalScore: number
  distanceScore: number
  batteryScore: number
  payloadScore: number
  availabilityScore: number
  recommended: boolean
}

// ─── Audit Log ──────────────────────────────────────────────────────────────

export type AuditAction =
  | 'login'
  | 'logout'
  | 'scenario_start'
  | 'scenario_abort'
  | 'cascade_generated'
  | 'containment_executed'
  | 'alert_acknowledge'
  | 'alert_escalate'
  | 'alert_resolve'
  | 'alert_assign'
  | 'drone_assign'
  | 'drone_dispatch'
  | 'mode_change'
  | 'report_export'
  | 'recommendation_approve'
  | 'recommendation_reject'
  | 'incident_contain'
  | 'incident_resolve'
  | 'incident_handover'
  | 'system_config'
  | 'data_sync'

export interface AuditEntry {
  id: string
  sequenceId: number
  timestamp: Date
  operator: string
  action: AuditAction
  details: string
  affectedObject?: string
  incidentId?: string
  alertId?: string
  mode: SystemMode
  exportHash?: string
  chainHash?: string
  previousHash?: string
  severity: 'info' | 'warning' | 'critical'
}

// ─── Compliance ──────────────────────────────────────────────────────────────

export type ComplianceStatus = 'compliant' | 'partial' | 'non_compliant' | 'pending_review'

export interface ComplianceRequirement {
  id: string
  regulation: string
  article: string
  requirement: string
  bastionImplementation: string
  status: ComplianceStatus
  risk: string
  actionNeeded?: string
}

// ─── System ──────────────────────────────────────────────────────────────────

export type SystemMode = 'live' | 'simulation'

export interface SystemHealth {
  mode: SystemMode
  online: boolean
  uptime: number               // seconds
  lastSync: Date | null
  satelliteCacheStatus: 'fresh' | 'stale' | 'empty'
  satelliteCacheAge: number    // hours
  localDbStatus: 'healthy' | 'degraded' | 'error'
  localAiReady: boolean
  encryptionActive: boolean
  watchdogActive: boolean
  hotStandbyActive: boolean
  upsActive: boolean
  rcbLinkStatus: 'connected' | 'degraded' | 'offline'
  tetraLinkStatus: 'connected' | 'degraded' | 'offline'
  gsmFallbackStatus: 'ready' | 'active' | 'offline'
  syncQueueLength: number
  publicDataSyncStatus: {
    weather: SyncStatus
    firms: SyncStatus
    opensky: SyncStatus
    osm: SyncStatus
    sentinel: SyncStatus
  }
}

export interface SyncStatus {
  status: 'synced' | 'syncing' | 'error' | 'offline'
  lastSync: Date | null
  dataAge: number              // minutes
}

export type PublicSourceStatus =
  | 'live'
  | 'cached'
  | 'stale'
  | 'offline'
  | 'error'
  | 'missing_key'
  | 'mock'
  | 'degraded'

export interface PublicDataSourceStatus {
  sourceName: string
  sourceId: 'weather' | 'firms' | 'opensky' | 'osm' | 'sentinel' | 'rcb' | 'tetra' | 'pionier'
  status: PublicSourceStatus
  lastSync: Date | null
  latencyMs: number | null
  recordsFetched: number | null
  errorMessage?: string
  cacheTtlMinutes?: number
  authMethod?: string
  isMock?: boolean
  isStale?: boolean
  trustScore: number
  staleDurationMinutes: number
  fallbackMode: 'none' | 'cache' | 'offline' | 'mock' | 'degraded'
}

// ─── Operator ────────────────────────────────────────────────────────────────

export type OperatorRole = 'operator' | 'analyst' | 'commander' | 'admin' | 'auditor'

export interface Operator {
  id: string
  name: string
  role: OperatorRole
  clearanceLevel: number       // 1-5
  unit: string
  mfaVerified: boolean
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export type ReportType =
  | 'incident'
  | 'cascade'
  | 'cascade_evidence'
  | 'escalation'
  | 'drone_mission'
  | 'compliance'
  | 'public_data'
  | 'audit_export'

export interface ReportDefinition {
  id: string
  type: ReportType
  title: string
  generatedAt: Date
  generatedBy: string
  content: Record<string, unknown>
  exportFormat: 'json' | 'html' | 'pdf'
}

// ─── Public Data ─────────────────────────────────────────────────────────────

export interface WeatherData {
  temperature: number
  windSpeed: number
  windDirection: number
  precipitation: number
  visibility: number
  condition: string
  lastUpdate: Date
  /** Rozszerzone pola z Open-Meteo hourly */
  cloudCover?: number
  rainMm?: number
  windSpeed180m?: number
  windDirection80m?: number
}

export interface FIRMSAlert {
  id: string
  latitude: number
  longitude: number
  brightness: number
  confidence: number
  detectedAt: Date
  instrument: string
}

export interface OpenSkyFlight {
  icao24: string
  callsign: string
  latitude: number
  longitude: number
  altitude: number
  velocity: number
  heading: number
  lastContact: number
}

// ─── Recommendation ──────────────────────────────────────────────────────────

export interface Recommendation {
  id: string
  incidentId?: string
  alertId?: string
  riskLevel: 'critical' | 'high' | 'medium' | 'low'
  summary: string
  actions: RecommendationAction[]
  confidence: number
  reasoning: string
  whyThisAction?: string
  ifIgnored?: string
  affectedNodes?: string[]
  requiresApproval: boolean
  approvedBy?: string
  approvedAt?: Date
  generatedAt: Date
}

export interface RecommendationAction {
  id: string
  priority: number
  description: string
  responsible: string
  timeframe: string
  approved: boolean
  executionState?: ActionExecutionState
  approvedBy?: string
  approvedAt?: Date
  executedAt?: Date
  tradeoffs?: string[]
  consequences?: string[]
  impactPreview?: ActionImpactPreview
}
