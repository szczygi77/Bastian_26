import type { AuditEntry, AuditAction, SystemMode } from '@/types'
import { generateId } from '@/utils/format'
import { saveAuditEntry } from '@/services/databaseService'

let inMemoryLog: AuditEntry[] = []
let sequenceCounter = 0
let lastChainHash = 'GENESIS'

export function setAuditLog(entries: AuditEntry[]): void {
  const normalized = entries.map((entry, index) => ({
    ...entry,
    sequenceId: entry.sequenceId ?? entries.length - index,
    chainHash: entry.chainHash ?? entry.exportHash,
    previousHash: entry.previousHash ?? 'GENESIS',
  }))
  inMemoryLog = [...normalized].sort((a, b) => b.sequenceId - a.sequenceId)
  sequenceCounter = normalized.reduce((max, e) => Math.max(max, e.sequenceId ?? 0), 0)
  lastChainHash = normalized[0]?.chainHash ?? normalized[0]?.exportHash ?? 'GENESIS'
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
    ['scenario_start', 'alert_escalate', 'drone_dispatch', 'containment_executed'].includes(params.action)
      ? 'warning'
      : ['alert_resolve', 'recommendation_approve', 'cascade_generated'].includes(params.action)
        ? 'critical'
        : 'info'

  sequenceCounter += 1
  const previousHash = lastChainHash
  const payload = `${sequenceCounter}|${params.action}|${params.details}|${params.operator}|${Date.now()}`
  const exportHash = generateHash(payload)
  const chainHash = generateHash(`${previousHash}:${exportHash}`)

  const entry: AuditEntry = {
    id: `audit-${generateId()}`,
    sequenceId: sequenceCounter,
    timestamp: new Date(),
    operator: params.operator,
    action: params.action,
    details: params.details,
    affectedObject: params.affectedObject,
    incidentId: params.incidentId,
    alertId: params.alertId,
    mode: params.mode,
    severity,
    exportHash,
    previousHash,
    chainHash,
  }

  lastChainHash = chainHash
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
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        chainHead: lastChainHash,
        entries: inMemoryLog,
      },
      null,
      2,
    )
  }
  const headers = 'sequenceId,timestamp,operator,action,severity,details,mode,exportHash,chainHash,previousHash'
  const rows = inMemoryLog.map(e =>
    [
      e.sequenceId,
      e.timestamp.toISOString(),
      e.operator,
      e.action,
      e.severity,
      `"${e.details.replace(/"/g, '""')}"`,
      e.mode,
      e.exportHash ?? '',
      e.chainHash ?? '',
      e.previousHash ?? '',
    ].join(','),
  )
  return [headers, ...rows].join('\n')
}

export function exportSignedAuditJson(): string {
  const head = lastChainHash
  const signature = generateHash(`${head}:${inMemoryLog.length}:${Date.now()}`)
  return JSON.stringify(
    {
      signedAt: new Date().toISOString(),
      chainHead: head,
      entryCount: inMemoryLog.length,
      signature,
      entries: inMemoryLog,
    },
    null,
    2,
  )
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
