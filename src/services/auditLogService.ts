import type { AuditEntry, AuditAction, SystemMode } from '@/types'
import { generateId } from '@/utils/format'
import { saveAuditEntry } from '@/services/databaseService'

let inMemoryLog: AuditEntry[] = []
let sequenceCounter = 0
let lastChainHash = 'GENESIS'

export const AUDIT_RETENTION_DAYS = 1825

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

export function setAuditLog(entries: AuditEntry[]): void {
  const normalized = entries.map((entry, index) => ({
    ...entry,
    sequenceId: entry.sequenceId ?? entries.length - index,
    chainHash: entry.chainHash ?? entry.exportHash,
    previousHash: entry.previousHash ?? 'GENESIS',
  }))
  inMemoryLog = [...normalized].sort((a, b) => b.sequenceId - a.sequenceId)
  sequenceCounter = normalized.reduce((max, entry) => Math.max(max, entry.sequenceId ?? 0), 0)
  lastChainHash = normalized[0]?.chainHash ?? normalized[0]?.exportHash ?? 'GENESIS'
}

export async function logAction(params: {
  operator: string
  action: AuditAction
  details: string
  affectedObject?: string
  incidentId?: string
  alertId?: string
  mode: SystemMode
}): Promise<AuditEntry> {
  const severity: AuditEntry['severity'] =
    ['scenario_start', 'alert_escalate', 'drone_dispatch', 'containment_executed'].includes(params.action)
      ? 'warning'
      : ['alert_resolve', 'recommendation_approve', 'cascade_generated'].includes(params.action)
        ? 'critical'
        : 'info'

  sequenceCounter += 1
  const previousHash = lastChainHash
  const timestampMs = Date.now()
  const payload = `${sequenceCounter}|${params.action}|${params.details}|${params.operator}|${timestampMs}`
  const exportHash = await sha256Hex(payload)
  const chainHash = await sha256Hex(`${previousHash}:${exportHash}`)

  const entry: AuditEntry = {
    id: `audit-${generateId()}`,
    sequenceId: sequenceCounter,
    timestamp: new Date(timestampMs),
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

export function getAuditChainHead(): string {
  return lastChainHash
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

export async function verifyAuditChain(entries?: AuditEntry[]): Promise<{
  valid: boolean
  checked: number
  brokenAt?: number
  headHash: string
  algorithm: string
}> {
  const sorted = [...(entries ?? inMemoryLog)].sort((a, b) => a.sequenceId - b.sequenceId)
  let previousHash = 'GENESIS'

  for (const entry of sorted) {
    if (entry.previousHash !== previousHash) {
      return {
        valid: false,
        checked: entry.sequenceId - 1,
        brokenAt: entry.sequenceId,
        headHash: lastChainHash,
        algorithm: 'SHA-256',
      }
    }

    const payload = `${entry.sequenceId}|${entry.action}|${entry.details}|${entry.operator}|${entry.timestamp.getTime()}`
    const expectedExportHash = await sha256Hex(payload)
    if (entry.exportHash && entry.exportHash !== expectedExportHash) {
      return {
        valid: false,
        checked: entry.sequenceId,
        brokenAt: entry.sequenceId,
        headHash: lastChainHash,
        algorithm: 'SHA-256',
      }
    }

    const expectedChainHash = await sha256Hex(`${previousHash}:${entry.exportHash ?? expectedExportHash}`)
    if (entry.chainHash && entry.chainHash !== expectedChainHash) {
      return {
        valid: false,
        checked: entry.sequenceId,
        brokenAt: entry.sequenceId,
        headHash: lastChainHash,
        algorithm: 'SHA-256',
      }
    }

    previousHash = entry.chainHash ?? expectedChainHash
  }

  return {
    valid: sorted.length > 0,
    checked: sorted.length,
    headHash: lastChainHash,
    algorithm: 'SHA-256',
  }
}

export function exportAuditLog(format: 'json' | 'csv'): string {
  if (format === 'json') {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        chainHead: lastChainHash,
        hashAlgorithm: 'SHA-256',
        retentionDays: AUDIT_RETENTION_DAYS,
        entries: inMemoryLog,
      },
      null,
      2,
    )
  }
  const headers = 'sequenceId,timestamp,operator,action,severity,details,mode,exportHash,chainHash,previousHash'
  const rows = inMemoryLog.map(entry =>
    [
      entry.sequenceId,
      entry.timestamp.toISOString(),
      entry.operator,
      entry.action,
      entry.severity,
      `"${entry.details.replace(/"/g, '""')}"`,
      entry.mode,
      entry.exportHash ?? '',
      entry.chainHash ?? '',
      entry.previousHash ?? '',
    ].join(','),
  )
  return [headers, ...rows].join('\n')
}

export async function exportSignedAuditJson(): Promise<string> {
  const head = lastChainHash
  const signature = await sha256Hex(`${head}:${inMemoryLog.length}:${Date.now()}`)
  return JSON.stringify(
    {
      signedAt: new Date().toISOString(),
      chainHead: head,
      entryCount: inMemoryLog.length,
      hashAlgorithm: 'SHA-256',
      signature,
      entries: inMemoryLog,
    },
    null,
    2,
  )
}
