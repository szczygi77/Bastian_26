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
} from '@/types'
import { generateId, formatTimestamp } from '@/utils/format'

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
      lastSync: s.lastSync?.toISOString() ?? null,
      recordsFetched: s.recordsFetched,
      authMethod: s.authMethod,
      errorMessage: s.errorMessage,
      cacheTtlMinutes: s.cacheTtlMinutes,
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
    reportType: 'CASCADE_ANALYSIS_REPORT',
    generatedBy: operator,
    generatedAt: new Date().toISOString(),
    cascadeRoot: cascade.incidentObjectId,
    propagationTree: cascade.nodes.map(n => ({
      depth: n.depth,
      objectId: n.objectId,
      name: objects.find(o => o.id === n.objectId)?.shortName,
      via: n.via,
      affectedAt: n.affectedAt,
      severity: n.severity,
      impactScore: n.impactScore.toFixed(2),
    })),
    summary: {
      totalAffected: cascade.affectedCount,
      criticalAffected: cascade.criticalCount,
      maxPropagationTime: cascade.timelineMinutes,
      overallImpactScore: cascade.totalImpactScore.toFixed(2),
    },
    algorithm: 'BFS — Breadth-First Search (deterministyczny, nie AI)',
    auditNote: 'Graf zależności IK — w pełni audytowalny, zgodny z EU AI Act (nie jest systemem AI)',
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
  } = params

  let content: Record<string, unknown> = {}
  let title = ''

  switch (type) {
    case 'incident':
      title = 'Raport Incydentu'
      if (incident && cascade && publicDataSources) {
        content = buildIncidentBundleReport({
          incident,
          cascade,
          alerts: alerts ?? [],
          objects,
          recommendations: recommendations ?? [],
          auditEntries: auditEntries ?? [],
          sources: publicDataSources,
          operator,
        })
      } else {
        content = cascade ? buildIncidentReport(cascade, alerts ?? [], objects, operator) : {}
      }
      break
    case 'cascade':
      title = 'Raport Analizy Kaskadowej'
      content = cascade ? buildCascadeReport(cascade, objects, operator) : {}
      break
    case 'public_data':
      title = 'Raport Źródeł Publicznych'
      content = buildPublicDataEvidenceReport(publicDataSources ?? [], operator)
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

export function downloadReportFile(report: ReportDefinition, format: 'json' | 'html' = 'json'): void {
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

export function renderReportHTML(report: ReportDefinition): string {
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
</style>
</head>
<body>
<h1>BASTION — ${report.title}</h1>
<div class="meta">
  Wygenerowano: ${formatTimestamp(report.generatedAt)} | Operator: ${report.generatedBy} | ID: ${report.id}
</div>
<pre>${JSON.stringify(report.content, null, 2)}</pre>
</body>
</html>`
}
