import type {
  Alert,
  AuditEntry,
  CascadeResult,
  ContainmentSimulationResult,
  IKObject,
  Incident,
  PublicDataSourceStatus,
  Recommendation,
  SystemHealth,
} from '@/types'
import { averageTrustScore } from '@/services/sourceTrustService'
import { getActiveIncidents, getPrimaryActiveIncident } from '@/services/incidentLifecycleService'
import type { AppState } from '@/store/types'

export interface OperationalOverview {
  systemMode: AppState['mode']
  online: boolean
  openIncident: Incident | null
  activeAlertCount: number
  criticalAlertCount: number
  regionalThreat: number
  infraHealthPct: number
  avgSourceTrust: number
  syncQueueLength: number
  degradedObjectCount: number
  activeMissionCount: number
  availableDroneCount: number
  cascadeActive: boolean
  cascadeImpact: number | null
  cascadeAffectedCount: number | null
}

export function computeRegionalThreat(params: {
  openIncident: Incident | null
  activeAlerts: Alert[]
  degradedObjects: IKObject[]
  cascadeResult: CascadeResult | null
}): number {
  const { openIncident, activeAlerts, degradedObjects, cascadeResult } = params
  let score = 0

  if (openIncident) {
    const sev = { critical: 45, high: 32, medium: 18, low: 8, info: 4 }[openIncident.severity] ?? 10
    score += sev
  }

  score += Math.min(35, activeAlerts.filter(a => a.severity === 'critical').length * 12)
  score += Math.min(25, degradedObjects.length * 5)

  if (cascadeResult && openIncident) {
    score = Math.max(score, Math.min(100, Math.round(cascadeResult.totalImpactScore * 0.85)))
  }

  return Math.min(100, Math.round(score))
}

export function computeInfraHealth(objects: IKObject[]): number {
  if (objects.length === 0) return 100
  const operational = objects.filter(o => o.status === 'operational').length
  return Math.round((operational / objects.length) * 100)
}

export function selectOperationalOverview(state: Pick<
  AppState,
  'mode' | 'online' | 'incidents' | 'alerts' | 'ikObjects' | 'cascadeResult' | 'publicDataSources' | 'systemHealth' | 'missions' | 'drones'
>): OperationalOverview {
  const activeIncident = getPrimaryActiveIncident(state.incidents)
  const activeAlerts = state.alerts.filter(a => a.status === 'active' || a.status === 'escalated')
  const degradedObjects = state.ikObjects.filter(o => o.status !== 'operational')
  const cascadeResult = activeIncident ? state.cascadeResult : null

  return {
    systemMode: state.mode,
    online: state.online,
    openIncident: activeIncident,
    activeAlertCount: activeAlerts.length,
    criticalAlertCount: activeAlerts.filter(a => a.severity === 'critical').length,
    regionalThreat: computeRegionalThreat({
      openIncident: activeIncident,
      activeAlerts,
      degradedObjects,
      cascadeResult,
    }),
    infraHealthPct: computeInfraHealth(state.ikObjects),
    avgSourceTrust: averageTrustScore(state.publicDataSources),
    syncQueueLength: state.systemHealth.syncQueueLength,
    degradedObjectCount: degradedObjects.length,
    activeMissionCount: state.missions.filter(m => m.status !== 'completed').length,
    availableDroneCount: state.drones.filter(d => d.availability).length,
    cascadeActive: !!cascadeResult && !!activeIncident,
    cascadeImpact: cascadeResult?.totalImpactScore ?? null,
    cascadeAffectedCount: cascadeResult?.affectedCount ?? null,
  }
}

export function selectActiveAlertsForDisplay(alerts: Alert[], incidents: Incident[]): Alert[] {
  const resolvedIncidentIds = new Set(
    incidents.filter(i => i.status === 'resolved').map(i => i.id),
  )
  return alerts
    .filter(a => a.status !== 'resolved')
    .filter(a => !a.incidentId || !resolvedIncidentIds.has(a.incidentId))
    .filter(a => a.status === 'active' || a.status === 'escalated' || a.status === 'acknowledged')
}

export function selectRecommendationsForActiveIncidents(
  recommendations: Recommendation[],
  incidents: Incident[],
): Recommendation[] {
  const activeIds = new Set(getActiveIncidents(incidents).map(i => i.id))
  return recommendations.filter(r => !r.incidentId || activeIds.has(r.incidentId))
}

export function formatThreatLabel(level: number): string {
  if (level >= 80) return 'Krytyczny'
  if (level >= 60) return 'Wysoki'
  if (level >= 40) return 'Podwyższony'
  if (level >= 20) return 'Umiarkowany'
  return 'Normalny'
}

export function formatSystemState(health: SystemHealth, online: boolean): string {
  if (!online) return 'Offline'
  if (health.localDbStatus === 'error') return 'Degradacja'
  if (health.syncQueueLength > 0) return 'Synchronizacja'
  return 'Operacyjny'
}

export function countLivePublicSources(sources: PublicDataSourceStatus[]): number {
  return sources.filter(s => s.status === 'live' && !s.isMock).length
}

export function selectRecentAuditEntries(entries: AuditEntry[], limit = 6): AuditEntry[] {
  return entries.slice(0, limit)
}
