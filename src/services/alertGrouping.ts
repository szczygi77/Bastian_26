import type { Alert, AlertSeverity, Incident } from '@/types'

export interface AlertGroup {
  key: string
  incidentId: string | null
  title: string
  severity: AlertSeverity
  alerts: Alert[]
  rootAlert: Alert
  isCascadeRoot: boolean
}

const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
}

export function groupAlertsByIncident(alerts: Alert[], incidents: Incident[]): AlertGroup[] {
  const incidentMap = new Map(incidents.map(i => [i.id, i]))
  const buckets = new Map<string, Alert[]>()

  for (const alert of alerts) {
    const key = alert.incidentId ?? `orphan:${alert.source}:${alert.affectedNodes[0] ?? alert.id}`
    const list = buckets.get(key) ?? []
    list.push(alert)
    buckets.set(key, list)
  }

  const groups: AlertGroup[] = []

  for (const [key, groupAlerts] of buckets) {
    const sorted = [...groupAlerts].sort(
      (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
    )
    const rootAlert =
      sorted.find(a => a.source === 'scenario_engine') ??
      sorted.find(a => a.title.includes('[KASKADA]') && !a.title.includes('za ')) ??
      sorted[0]

    const incidentId = key.startsWith('orphan:') ? null : key
    const incident = incidentId ? incidentMap.get(incidentId) : undefined

    groups.push({
      key,
      incidentId,
      title: incident?.title ?? rootAlert.title.replace(/^\[KASKADA\]\s*/, ''),
      severity: sorted[0].severity,
      alerts: sorted,
      rootAlert,
      isCascadeRoot: rootAlert.source === 'scenario_engine' || rootAlert.source === 'cascade_engine',
    })
  }

  return groups.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
}

export function alertKindLabel(alert: Alert, isRoot: boolean): string {
  if (isRoot) return 'ROOT ALERT'
  if (alert.source === 'cascade_engine') return 'CASCADE ALERT'
  if (alert.source === 'scenario_engine') return 'SCENARIO ALERT'
  if (alert.source === 'system') return 'SYSTEM ALERT'
  return 'ALERT'
}
