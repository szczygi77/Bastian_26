import type {
  ReportDefinition,
  ReportType,
  CascadeResult,
  Alert,
  DroneMission,
  IKObject,
  Incident,
  AuditEntry,
  PublicDataSourceStatus,
  Recommendation,
  ComplianceRequirement,
  ContainmentSimulationResult,
} from '@/types'
import { generateId, formatTimestamp } from '@/utils/format'
import { buildCascadeEvidenceExport } from '@/services/cascadeEvidenceService'
import { jsPDF } from 'jspdf'

function buildRcbIncidentReport(
  incident: Incident | undefined,
  cascade: CascadeResult | undefined,
  alerts: Alert[],
  operator: string,
): Record<string, unknown> {
  const now = new Date()
  const startedAt = incident?.startedAt ?? now
  const hoursSinceStart = Math.max(0, Math.round((now.getTime() - startedAt.getTime()) / 3_600_000))

  return {
    reportType: 'RCB_INCIDENT_REPORT',
    format: 'NIS2 Art. 23 — powiadomienie CSIRT',
    classification: 'RESTRICTED — RCB',
    generatedBy: operator,
    generatedAt: now.toISOString(),
    notificationWindows: {
      initial24h: hoursSinceStart <= 24 ? 'W OKNIE' : 'PRZEKROCZONE',
      detailed72h: hoursSinceStart <= 72 ? 'W OKNIE' : 'PRZEKROCZONE',
    },
    incidentSummary: {
      id: incident?.id ?? 'N/A',
      title: incident?.title ?? 'Incydent infrastruktury krytycznej',
      severity: incident?.severity ?? cascade?.nodes[0]?.severity ?? 'critical',
      status: incident?.status ?? 'open',
      startedAt: startedAt.toISOString(),
      affectedObjects: cascade?.affectedCount ?? 0,
      criticalObjects: cascade?.criticalCount ?? 0,
      totalImpactScore: cascade?.totalImpactScore.toFixed(2) ?? '0.00',
    },
    alerts: alerts.slice(0, 20).map(alert => ({
      id: alert.id,
      title: alert.title,
      severity: alert.severity,
      status: alert.status,
      autoDetected: alert.autoDetected ?? false,
      timestamp: alert.timestamp.toISOString(),
    })),
    operatorActionsRequired: [
      'Potwierdzenie odbioru przez RCB w ciągu 24h (NIS2 Art. 23)',
      'Pełny raport techniczny w ciągu 72h',
      'Dołączenie łańcucha audytu SHA-256',
    ],
  }
}

function buildPublicDataEvidenceReport(
  sources: PublicDataSourceStatus[],
  operator: string,
): Record<string, unknown> {
  return {
    reportType: 'PUBLIC_DATA_EVIDENCE_REPORT',
    generatedBy: operator,
    generatedAt: new Date().toISOString(),
    sources: sources.map(s => ({
      name: s.sourceName,
      id: s.sourceId,
      status: s.status,
      isMock: s.isMock ?? false,
      isStale: s.isStale ?? s.status === 'stale',
      lastSync: s.lastSync?.toISOString() ?? null,
      recordsFetched: s.recordsFetched,
      authMethod: s.authMethod,
      errorMessage: s.errorMessage,
      cacheTtlMinutes: s.cacheTtlMinutes,
      trustScore: s.trustScore,
    })),
    integrityNote: 'Status LIVE oznacza realny fetch w tej sesji. CACHED/STALE/ERROR/MISSING_KEY nie są prezentowane jako live.',
  }
}

function buildComplianceReport(
  requirements: ComplianceRequirement[],
  operator: string,
): Record<string, unknown> {
  const gaps = requirements.filter(
    r => r.actionNeeded || r.status === 'partial' || r.status === 'non_compliant' || r.status === 'pending_review',
  )

  return {
    reportType: 'COMPLIANCE_REPORT',
    generatedBy: operator,
    generatedAt: new Date().toISOString(),
    summary: {
      total: requirements.length,
      compliant: requirements.filter(r => r.status === 'compliant').length,
      partial: requirements.filter(r => r.status === 'partial').length,
      pendingReview: requirements.filter(r => r.status === 'pending_review').length,
      nonCompliant: requirements.filter(r => r.status === 'non_compliant').length,
      productionBlockers: gaps.length,
    },
    productionReadinessGaps: gaps.map(r => ({
      id: r.id,
      regulation: r.regulation,
      article: r.article,
      status: r.status,
      risk: r.risk,
      actionNeeded: r.actionNeeded ?? 'Wymaga przeglądu przed produkcją',
    })),
    requirements: requirements.map(r => ({
      id: r.id,
      regulation: r.regulation,
      article: r.article,
      requirement: r.requirement,
      bastionImplementation: r.bastionImplementation,
      status: r.status,
      risk: r.risk,
      actionNeeded: r.actionNeeded,
    })),
  }
}

function buildIncidentBundleReport(params: {
  incident: Incident
  cascade: CascadeResult
  alerts: Alert[]
  objects: IKObject[]
  recommendations: Recommendation[]
  auditEntries: AuditEntry[]
  sources: PublicDataSourceStatus[]
  operator: string
}): Record<string, unknown> {
  const { incident, cascade, alerts, objects, recommendations, auditEntries, sources, operator } = params
  const triggerObj = objects.find(o => o.id === cascade.incidentObjectId)

  return {
    reportType: 'INCIDENT_BUNDLE_REPORT',
    classification: 'RESTRICTED',
    generatedBy: operator,
    generatedAt: new Date().toISOString(),
    incident: {
      id: incident.id,
      title: incident.title,
      severity: incident.severity,
      status: incident.status,
      startedAt: incident.startedAt.toISOString(),
      notes: incident.notes,
      triggerObject: triggerObj?.name,
    },
    cascade: buildCascadeReport(cascade, objects, operator),
    alerts: alerts.map(a => ({
      id: a.id,
      title: a.title,
      severity: a.severity,
      status: a.status,
      source: a.source,
      timestamp: a.timestamp.toISOString(),
    })),
    recommendations: recommendations.map(r => ({
      id: r.id,
      summary: r.summary,
      confidence: r.confidence,
      actions: r.actions.map(a => ({ id: a.id, description: a.description, approved: a.approved })),
    })),
    auditTrail: auditEntries
      .filter(e => e.incidentId === incident.id)
      .slice(0, 50)
      .map(e => ({
        sequenceId: e.sequenceId,
        action: e.action,
        details: e.details,
        timestamp: e.timestamp.toISOString(),
        chainHash: e.chainHash,
      })),
    publicDataSources: buildPublicDataEvidenceReport(sources, operator).sources,
  }
}

function buildIncidentReport(
  cascade: CascadeResult,
  alerts: Alert[],
  objects: IKObject[],
  operator: string,
): Record<string, unknown> {
  const triggerObj = objects.find(o => o.id === cascade.incidentObjectId)
  return {
    reportType: 'INCIDENT_REPORT',
    classification: 'RESTRICTED',
    generatedBy: operator,
    generatedAt: new Date().toISOString(),
    incident: {
      triggerObject: triggerObj?.name,
      affectedCount: cascade.affectedCount,
      criticalCount: cascade.criticalCount,
      totalImpactScore: cascade.totalImpactScore.toFixed(2),
      timelineMinutes: cascade.timelineMinutes,
    },
    affectedObjects: cascade.nodes.map(n => ({
      id: n.objectId,
      name: objects.find(o => o.id === n.objectId)?.name,
      severity: n.severity,
      affectedAtMinutes: n.affectedAt,
      impactScore: n.impactScore.toFixed(2),
    })),
    alerts: alerts.map(a => ({
      id: a.id,
      title: a.title,
      severity: a.severity,
      status: a.status,
      timestamp: a.timestamp.toISOString(),
    })),
    certPolskaFormat: {
      incidentClass: 'KRYTYCZNY',
      reportedInMinutes: 60,
      affectedSector: 'ENERGIA',
      notificationRequired: true,
    },
  }
}

function buildCascadeReport(
  cascade: CascadeResult,
  objects: IKObject[],
  operator: string
): Record<string, unknown> {
  return {
    ...buildCascadeEvidenceExport({ cascade, objects, operator }),
    reportType: 'CASCADE_ANALYSIS_REPORT',
    algorithm: 'BFS — Breadth-First Search (deterministyczny, nie AI)',
    auditNote: 'Graf zależności IK — w pełni audytowalny, zgodny z EU AI Act (nie jest systemem AI)',
  }
}

function buildAuditExportReport(
  auditEntries: AuditEntry[],
  operator: string,
): Record<string, unknown> {
  const sorted = [...auditEntries].sort((a, b) => a.sequenceId - b.sequenceId)
  return {
    reportType: 'AUDIT_CHAIN_EXPORT',
    generatedBy: operator,
    generatedAt: new Date().toISOString(),
    chainLength: sorted.length,
    genesisHash: sorted[0]?.previousHash ?? 'GENESIS',
    terminalHash: sorted[sorted.length - 1]?.chainHash ?? null,
    entries: sorted.map(e => ({
      sequenceId: e.sequenceId,
      timestamp: e.timestamp.toISOString(),
      operator: e.operator,
      action: e.action,
      details: e.details,
      incidentId: e.incidentId,
      mode: e.mode,
      exportHash: e.exportHash,
      previousHash: e.previousHash,
      chainHash: e.chainHash,
    })),
    integrityNote: 'Hash chain — każdy wpis jest powiązany z poprzednim.',
  }
}

function buildDroneMissionReport(
  missions: DroneMission[],
  operator: string
): Record<string, unknown> {
  return {
    reportType: 'DRONE_MISSION_REPORT',
    module: 'SKYMARSHAL',
    generatedBy: operator,
    generatedAt: new Date().toISOString(),
    missions: missions.map(m => ({
      id: m.id,
      droneId: m.droneId,
      type: m.type,
      targetObjectId: m.targetObjectId,
      assignedAt: m.assignedAt.toISOString(),
      estimatedArrivalMin: m.estimatedArrivalMin,
      status: m.status,
      incidentId: m.incidentId,
    })),
    note: 'Symulacja koordynacji dronów — adaptery MAVLink/DJI SDK gotowe do podłączenia sprzętu',
  }
}

export function generateReport(params: {
  type: ReportType
  cascade?: CascadeResult
  alerts?: Alert[]
  missions?: DroneMission[]
  objects: IKObject[]
  operator: string
  incident?: Incident
  recommendations?: Recommendation[]
  auditEntries?: AuditEntry[]
  publicDataSources?: PublicDataSourceStatus[]
  complianceRequirements?: ComplianceRequirement[]
  containment?: ContainmentSimulationResult | null
}): ReportDefinition {
  const {
    type,
    cascade,
    alerts,
    missions,
    objects,
    operator,
    incident,
    recommendations,
    auditEntries,
    publicDataSources,
    complianceRequirements,
    containment,
  } = params

  let content: Record<string, unknown> = {}
  let title = ''

  switch (type) {
    case 'incident':
      title = 'Raport Incydentu — format RCB'
      if (incident && cascade && publicDataSources) {
        content = {
          ...buildIncidentBundleReport({
            incident,
            cascade,
            alerts: alerts ?? [],
            objects,
            recommendations: recommendations ?? [],
            auditEntries: auditEntries ?? [],
            sources: publicDataSources,
            operator,
          }),
          rcbFormat: buildRcbIncidentReport(incident, cascade, alerts ?? [], operator),
        }
      } else if (cascade) {
        content = {
          ...buildIncidentReport(cascade, alerts ?? [], objects, operator),
          rcbFormat: buildRcbIncidentReport(incident, cascade, alerts ?? [], operator),
        }
      } else {
        content = buildRcbIncidentReport(incident, cascade, alerts ?? [], operator)
      }
      break
    case 'cascade':
      title = 'Raport Analizy Kaskadowej'
      content = cascade ? buildCascadeReport(cascade, objects, operator) : {}
      break
    case 'cascade_evidence':
      title = 'Cascade Evidence Report'
      content = cascade
        ? buildCascadeEvidenceExport({
            cascade,
            objects,
            operator,
            incidentId: incident?.id,
            containment,
          })
        : {}
      break
    case 'public_data':
      title = 'Raport Źródeł Publicznych'
      content = buildPublicDataEvidenceReport(publicDataSources ?? [], operator)
      break
    case 'audit_export':
      title = 'Audit Chain Export'
      content = buildAuditExportReport(auditEntries ?? [], operator)
      break
    case 'drone_mission':
      title = 'Raport Misji Dronowych (Skymarshal)'
      content = buildDroneMissionReport(missions ?? [], operator)
      break
    case 'compliance':
      title = 'Raport Zgodności'
      content = buildComplianceReport(complianceRequirements ?? [], operator)
      break
    case 'escalation':
      title = 'Raport Eskalacji'
      content = { alerts: alerts?.map(a => a.title) ?? [], operator, timestamp: new Date().toISOString() }
      break
  }

  return {
    id: `report-${generateId()}`,
    type,
    title,
    generatedAt: new Date(),
    generatedBy: operator,
    content,
    exportFormat: 'json',
  }
}

export function downloadReportFile(report: ReportDefinition, format: 'json' | 'html' | 'pdf' = 'json'): void {
  if (format === 'pdf') {
    void downloadReportPdf(report)
    return
  }
  const body = format === 'html' ? renderReportHTML(report) : JSON.stringify(report, null, 2)
  const mime = format === 'html' ? 'text/html' : 'application/json'
  const ext = format === 'html' ? 'html' : 'json'
  const blob = new Blob([body], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `bastion-${report.type}-${report.id}.${ext}`
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function downloadReportPdf(report: ReportDefinition): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 14
  let y = margin

  const writeLine = (text: string, size = 10, bold = false) => {
    doc.setFont('courier', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    const lines = doc.splitTextToSize(text, 180)
    for (const line of lines) {
      if (y > 280) {
        doc.addPage()
        y = margin
      }
      doc.text(line, margin, y)
      y += size * 0.45 + 2
    }
  }

  writeLine('BASTION — RAPORT INCYDENTU (FORMAT RCB)', 14, true)
  writeLine(`Typ: ${report.title}`, 10)
  writeLine(`ID: ${report.id}`, 9)
  writeLine(`Wygenerowano: ${formatTimestamp(report.generatedAt)}`, 9)
  writeLine(`Operator: ${report.generatedBy}`, 9)
  y += 4

  const rcb = (report.content as Record<string, unknown>).rcbFormat as Record<string, unknown> | undefined
  if (rcb) {
    writeLine('NIS2 Art. 23 — okna powiadomienia CSIRT', 11, true)
    const windows = rcb.notificationWindows as Record<string, string> | undefined
    if (windows) {
      writeLine(`24h: ${windows.initial24h}`, 9)
      writeLine(`72h: ${windows.detailed72h}`, 9)
    }
    y += 2
    writeLine('Podsumowanie incydentu', 11, true)
    writeLine(JSON.stringify(rcb.incidentSummary, null, 2), 8)
    y += 2
  }

  writeLine('Szczegóły techniczne', 11, true)
  const contentText = JSON.stringify(report.content, null, 2)
  writeLine(contentText.slice(0, 6000), 7)

  doc.save(`bastion-${report.type}-${report.id}.pdf`)
}

export function renderReportHTML(report: ReportDefinition): string {
  const rcb = (report.content as Record<string, unknown>).rcbFormat as Record<string, unknown> | undefined
  const rcbBlock = rcb ? `
<section class="rcb">
  <h2>Raport incydentu — format RCB (NIS2 Art. 23)</h2>
  <p class="meta">Okno 24h: ${(rcb.notificationWindows as Record<string, string>)?.initial24h ?? '—'} · Okno 72h: ${(rcb.notificationWindows as Record<string, string>)?.detailed72h ?? '—'}</p>
  <pre>${JSON.stringify(rcb, null, 2)}</pre>
</section>` : ''

  return `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<title>BASTION — ${report.title}</title>
<style>
  body { font-family: monospace; background: #05070A; color: #E6EDF3; padding: 2rem; }
  h1 { color: #00E5FF; border-bottom: 1px solid #1A2A3A; padding-bottom: 0.5rem; }
  h2 { color: #94A3B8; margin-top: 2rem; }
  pre { background: #0B1117; padding: 1rem; border-radius: 8px; overflow-x: auto; border: 1px solid rgba(255,255,255,0.08); }
  .meta { color: #66778B; font-size: 0.85rem; margin-bottom: 1rem; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; }
  .badge-cyan { background: rgba(0,229,255,0.15); color: #00E5FF; }
  .rcb { border: 1px solid rgba(255,138,31,0.25); border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem; background: rgba(255,138,31,0.05); }
</style>
</head>
<body>
<h1>BASTION — ${report.title}</h1>
<div class="meta">
  Wygenerowano: ${formatTimestamp(report.generatedAt)} | Operator: ${report.generatedBy} | ID: ${report.id}
</div>
${rcbBlock}
<pre>${JSON.stringify(report.content, null, 2)}</pre>
</body>
</html>`
}
