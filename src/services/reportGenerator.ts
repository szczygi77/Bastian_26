import type { ReportDefinition, ReportType, CascadeResult, Alert, DroneMission, IKObject } from '@/types'
import { generateId, formatTimestamp } from '@/utils/format'

function buildIncidentReport(
  cascade: CascadeResult,
  alerts: Alert[],
  objects: IKObject[],
  operator: string
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
}): ReportDefinition {
  const { type, cascade, alerts, missions, objects, operator } = params

  let content: Record<string, unknown> = {}
  let title = ''

  switch (type) {
    case 'incident':
      title = 'Raport Incydentu'
      content = cascade ? buildIncidentReport(cascade, alerts ?? [], objects, operator) : {}
      break
    case 'cascade':
      title = 'Raport Analizy Kaskadowej'
      content = cascade ? buildCascadeReport(cascade, objects, operator) : {}
      break
    case 'drone_mission':
      title = 'Raport Misji Dronowych (Skymarshal)'
      content = buildDroneMissionReport(missions ?? [], operator)
      break
    case 'compliance':
      title = 'Raport Zgodności'
      content = { note: 'Patrz moduł Compliance Center' }
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
