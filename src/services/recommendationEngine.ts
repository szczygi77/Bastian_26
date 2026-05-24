import type {
  Recommendation,
  RecommendationAction,
  CascadeResult,
  ScenarioDefinition,
  IKObject,
} from '@/types'
import { generateId } from '@/utils/format'

interface RuleContext {
  cascade: CascadeResult
  scenario: ScenarioDefinition
  objects: IKObject[]
}

function buildActionsForScenario(ctx: RuleContext): RecommendationAction[] {
  const actions: RecommendationAction[] = []
  const { scenario, cascade, objects } = ctx

  const triggerObj = objects.find(o => o.id === cascade.incidentObjectId)
  const criticalNodes = cascade.nodes.filter(n => n.severity === 'critical')

  let priority = 1

  if (scenario.type === 'power_plant_sabotage' || scenario.type === 'blackout') {
    actions.push({
      id: generateId(),
      priority: priority++,
      description: `Aktywuj protokół BLACKOUT dla ${triggerObj?.name ?? 'obiektu IK'}`,
      responsible: 'Dyżurny CZK',
      timeframe: 'Natychmiast (0-5 min)',
      approved: false,
    })
    actions.push({
      id: generateId(),
      priority: priority++,
      description: 'Powiadom PSP i Policję o zagrożeniu dla infrastruktury krytycznej',
      responsible: 'Oficer dyżurny',
      timeframe: '0-5 min',
      approved: false,
    })
    actions.push({
      id: generateId(),
      priority: priority++,
      description: 'Aktywuj agregaty awaryjne w szpitalu i centrum kryzysowym',
      responsible: 'Techniczny PSP',
      timeframe: '5-15 min',
      approved: false,
    })
  }

  if (scenario.type === 'fire') {
    actions.push({
      id: generateId(),
      priority: priority++,
      description: 'Ewakuuj personel z obszaru 500m od magazynu paliw',
      responsible: 'PSP / Policja',
      timeframe: 'Natychmiast',
      approved: false,
    })
    actions.push({
      id: generateId(),
      priority: priority++,
      description: 'Zamknij DK77 — ryzyko eksplozji',
      responsible: 'GDDKiA / Policja',
      timeframe: '0-10 min',
      approved: false,
    })
  }

  if (scenario.type === 'cyber_attack_ot') {
    actions.push({
      id: generateId(),
      priority: priority++,
      description: 'Odizoluj sieć OT od reszty infrastruktury (air-gap)',
      responsible: 'CISO / Administrator OT',
      timeframe: 'Natychmiast',
      approved: false,
    })
    actions.push({
      id: generateId(),
      priority: priority++,
      description: 'Zgłoś incydent do CERT Polska i ABW',
      responsible: 'Dyżurny bezpieczeństwa',
      timeframe: '15 min (wymóg KSC)',
      approved: false,
    })
  }

  for (const node of criticalNodes) {
    const obj = objects.find(o => o.id === node.objectId)
    if (!obj) continue
    actions.push({
      id: generateId(),
      priority: priority++,
      description: `Zabezpiecz ${obj.name} — awaria przewidywana za ${node.affectedAt}min`,
      responsible: obj.contactChannel,
      timeframe: `Do ${node.affectedAt}min`,
      approved: false,
    })
  }

  actions.push({
    id: generateId(),
    priority: priority++,
    description: 'Wygeneruj raport incydentu dla RCB zgodnie z formatem NIS2 Art. 23',
    responsible: 'Analityk / Dowódca',
    timeframe: '60 min (obowiązek prawny)',
    approved: false,
  })

  return actions
}

export function generateRecommendation(ctx: RuleContext): Recommendation {
  const { cascade, scenario, objects } = ctx
  const actions = buildActionsForScenario(ctx)
  const triggerObj = objects.find(o => o.id === cascade.incidentObjectId)

  const riskLevel =
    cascade.totalImpactScore >= 75
      ? 'critical'
      : cascade.totalImpactScore >= 50
      ? 'high'
      : cascade.totalImpactScore >= 25
      ? 'medium'
      : 'low'

  const reasoning = [
    `Scenariusz "${scenario.name}" dotknął ${cascade.affectedCount} obiektów IK.`,
    `Łączny impact score: ${cascade.totalImpactScore.toFixed(1)}/100.`,
    `${cascade.criticalCount} obiektów w stanie KRYTYCZNYM.`,
    `Maksymalny czas propagacji kaskady: ${cascade.timelineMinutes} minut.`,
    `Obiekt inicjujący: ${triggerObj?.name ?? cascade.incidentObjectId} (Criticality: ${triggerObj?.criticality}/5).`,
    `Rekomendacje wygenerowane przez silnik reguł IF-THEN (nie AI). Audytowalny, deterministyczny.`,
  ].join(' ')

  return {
    id: `rec-${generateId()}`,
    riskLevel,
    summary: `Wymagane natychmiastowe działania operacyjne. ${cascade.criticalCount} krytycznych obiektów IK zagrożonych.`,
    actions,
    confidence: 90,
    reasoning,
    whyThisAction: `Kaskada dotknęła ${cascade.affectedCount} obiektów (impact ${cascade.totalImpactScore.toFixed(1)}/100). Pierwsze działanie minimalizuje propagację od ${triggerObj?.shortName ?? cascade.incidentObjectId}.`,
    ifIgnored: cascade.nodes.length > 0
      ? `Brak reakcji w ciągu ${Math.min(...cascade.nodes.map(n => n.affectedAt))} min grozi eskalacją do ${cascade.criticalCount} obiektów krytycznych i naruszeniem ciągłości usług.`
      : `Brak reakcji w ciągu ${cascade.timelineMinutes} min grozi eskalacją kaskady i naruszeniem ciągłości usług.`,
    affectedNodes: [
      cascade.incidentObjectId,
      ...cascade.nodes.map(n => n.objectId),
    ],
    requiresApproval: riskLevel === 'critical' || riskLevel === 'high',
    generatedAt: new Date(),
  }
}
