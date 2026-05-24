import { FileOutput } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { generateReport, downloadReportFile } from '@/services/reportGenerator'
import { exportSignedAuditJson, logAction } from '@/services/auditLogService'
import type { Alert, AuditEntry, CascadeResult, IKObject, Incident, PublicDataSourceStatus, Recommendation } from '@/types'
import type { SystemMode } from '@/types'

export function IncidentReportActions({
  incident,
  cascadeResult,
  alerts,
  recommendations,
  auditEntries,
  publicDataSources,
  ikObjects,
  operator,
  mode,
  onExported,
}: {
  incident: Incident
  cascadeResult: CascadeResult | null
  alerts: Alert[]
  recommendations: Recommendation[]
  auditEntries: AuditEntry[]
  publicDataSources: PublicDataSourceStatus[]
  ikObjects: IKObject[]
  operator: string
  mode: SystemMode
  onExported: (details: string) => void
}) {
  function exportIncident(format: 'json' | 'html') {
    if (!cascadeResult) return
    const report = generateReport({
      type: 'incident',
      incident,
      cascade: cascadeResult,
      alerts,
      recommendations,
      auditEntries,
      publicDataSources,
      objects: ikObjects,
      operator,
    })
    downloadReportFile(report, format)
    onExported(`Wygenerowano raport incydentu (${format.toUpperCase()})`)
  }

  function exportCascade(format: 'json' | 'html') {
    if (!cascadeResult) return
    const report = generateReport({
      type: 'cascade',
      cascade: cascadeResult,
      objects: ikObjects,
      operator,
    })
    downloadReportFile(report, format)
    onExported('Wygenerowano raport kaskady')
  }

  function exportPublicData() {
    const report = generateReport({
      type: 'public_data',
      publicDataSources,
      objects: ikObjects,
      operator,
    })
    downloadReportFile(report, 'json')
    onExported('Wygenerowano raport źródeł publicznych')
  }

  function exportAudit() {
    const blob = new Blob([exportSignedAuditJson()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `bastion-audit-signed-${incident.id}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    onExported('Wyeksportowano podpisany audit JSON')
  }

  return (
    <div className="icm-report-actions">
      <Button size="sm" variant="secondary" disabled={!cascadeResult} onClick={() => exportIncident('json')}>
        <FileOutput size={12} /> Raport incydentu
      </Button>
      <Button size="sm" variant="secondary" disabled={!cascadeResult} onClick={() => exportCascade('html')}>
        <FileOutput size={12} /> Kaskada HTML
      </Button>
      <Button size="sm" variant="secondary" onClick={exportPublicData}>
        <FileOutput size={12} /> Public API
      </Button>
      <Button size="sm" variant="ghost" onClick={exportAudit}>
        <FileOutput size={12} /> Audit signed
      </Button>
    </div>
  )
}

export function logReportExport(details: string, incidentId: string, operator: string, mode: SystemMode) {
  return logAction({
    operator,
    action: 'report_export',
    details,
    incidentId,
    mode,
  })
}
