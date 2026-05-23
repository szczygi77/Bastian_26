import type { Alert, AlertSeverity, CascadeResult, IKObject, ScenarioDefinition } from '@/types'
import { generateId } from '@/utils/format'

const SEVERITY_RECOMMENDATIONS: Record<AlertSeverity, string[]> = {
  critical: [
    'Natychmiast eskaluj do dowódcy i CZK',
    'Uruchom protokół awaryjny',
    'Zadysponuj wszystkie dostępne zasoby',
    'Powiadom RCB i CERT Polska',
    'Aktywuj plan ciągłości działania',
  ],
  high: [
    'Eskaluj do oficera dyżurnego',
    'Aktywuj zasoby rezerwowe',
    'Monitoruj sytuację w czasie rzeczywistym',
    'Przygotuj raport incydentu',
  ],
  medium: [
    'Powiadom służby odpowiedzialności',
    'Monitoruj trend',
    'Przygotuj raport prewencyjny',
  ],
  low: [
    'Odnotuj w systemie',
    'Monitoruj przez następne 2 godziny',
  ],
  info: ['Zaloguj zdarzenie'],
}

export function createAlertFromCascade(
  cascade: CascadeResult,
  scenario: ScenarioDefinition,
  objects: IKObject[]
): Alert[] {
  const alerts: Alert[] = []
  const triggerObj = objects.find(o => o.id === cascade.incidentObjectId)

  const mainAlert: Alert = {
    id: `alert-${generateId()}`,
    title: `[KASKADA] ${scenario.name} — ${triggerObj?.shortName ?? cascade.incidentObjectId}`,
    description: `Uruchomiono scenariusz: ${scenario.description}. Dotkniętych obiektów IK: ${cascade.affectedCount}. Łączny impact score: ${cascade.totalImpactScore.toFixed(1)}/100.`,
    severity: scenario.severity as AlertSeverity,
    source: 'scenario_engine',
    timestamp: new Date(),
    affectedNodes: [cascade.incidentObjectId, ...cascade.nodes.map(n => n.objectId)],
    confidence: 95,
    status: 'active',
    recommendedActions: SEVERITY_RECOMMENDATIONS[scenario.severity as AlertSeverity] ?? [],
  }
  alerts.push(mainAlert)

  for (const node of cascade.nodes) {
    if (node.severity === 'critical' || node.severity === 'high') {
      const obj = objects.find(o => o.id === node.objectId)
      alerts.push({
        id: `alert-${generateId()}`,
        title: `[KASKADA] ${obj?.shortName ?? node.objectId} — awaria za ${node.affectedAt}min`,
        description: `Obiekt ${obj?.name ?? node.objectId} zostanie dotknięty kaskadą awarii za ${node.affectedAt} minut. Impact score: ${node.impactScore.toFixed(1)}/100.`,
        severity: node.severity,
        source: 'cascade_engine',
        timestamp: new Date(),
        affectedNodes: [node.objectId],
        confidence: 88,
        status: 'active',
        recommendedActions: SEVERITY_RECOMMENDATIONS[node.severity] ?? [],
      })
    }
  }

  return alerts
}

export function createManualAlert(
  title: string,
  description: string,
  severity: AlertSeverity,
  affectedNodes: string[]
): Alert {
  return {
    id: `alert-${generateId()}`,
    title,
    description,
    severity,
    source: 'manual',
    timestamp: new Date(),
    affectedNodes,
    confidence: 100,
    status: 'active',
    recommendedActions: SEVERITY_RECOMMENDATIONS[severity] ?? [],
  }
}

export function createSystemAlert(title: string, description: string, severity: AlertSeverity): Alert {
  return {
    id: `alert-${generateId()}`,
    title,
    description,
    severity,
    source: 'system',
    timestamp: new Date(),
    affectedNodes: [],
    confidence: 100,
    status: 'active',
    recommendedActions: [],
  }
}
