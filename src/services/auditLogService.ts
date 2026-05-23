import type { AuditEntry, AuditAction, SystemMode } from '@/types'
import { generateId } from '@/utils/format'
import { saveAuditEntry } from '@/services/databaseService'

let inMemoryLog: AuditEntry[] = []

export function setAuditLog(entries: AuditEntry[]): void {
  inMemoryLog = [...entries]
}

export function logAction(params: {
  operator: string
  action: AuditAction
  details: string
  affectedObject?: string
  incidentId?: string
  alertId?: string
  mode: SystemMode
}): AuditEntry {
  const severity: AuditEntry['severity'] =
    ['scenario_start', 'alert_escalate', 'drone_dispatch'].includes(params.action)
      ? 'warning'
      : ['alert_resolve', 'recommendation_approve'].includes(params.action)
      ? 'critical'
      : 'info'

  const entry: AuditEntry = {
    id: `audit-${generateId()}`,
    timestamp: new Date(),
    operator: params.operator,
    action: params.action,
    details: params.details,
    affectedObject: params.affectedObject,
    incidentId: params.incidentId,
    alertId: params.alertId,
    mode: params.mode,
    severity,
    exportHash: generateHash(params.details + params.operator + Date.now()),
  }

  inMemoryLog = [entry, ...inMemoryLog]
  void saveAuditEntry(entry).catch(() => {})
  return entry
}

export function getAuditLog(): AuditEntry[] {
  return [...inMemoryLog]
}

export function filterAuditLog(filters: {
  action?: AuditAction
  operator?: string
  severity?: AuditEntry['severity']
  mode?: SystemMode
}): AuditEntry[] {
  return inMemoryLog.filter(entry => {
    if (filters.action && entry.action !== filters.action) return false
    if (filters.operator && !entry.operator.toLowerCase().includes(filters.operator.toLowerCase())) return false
    if (filters.severity && entry.severity !== filters.severity) return false
    if (filters.mode && entry.mode !== filters.mode) return false
    return true
  })
}

export function exportAuditLog(format: 'json' | 'csv'): string {
  if (format === 'json') {
    return JSON.stringify(inMemoryLog, null, 2)
  }
  const headers = 'timestamp,operator,action,severity,details,mode,exportHash'
  const rows = inMemoryLog.map(e =>
    [
      e.timestamp.toISOString(),
      e.operator,
      e.action,
      e.severity,
      `"${e.details.replace(/"/g, '""')}"`,
      e.mode,
      e.exportHash ?? '',
    ].join(',')
  )
  return [headers, ...rows].join('\n')
}

function generateHash(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return Math.abs(hash).toString(16).padStart(8, '0').toUpperCase()
}
