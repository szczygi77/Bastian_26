import type {
  Recommendation,
  RecommendationAction,
  CascadeResult,
  ScenarioDefinition,
  IKObject,
  ActionImpactPreview,
} from '@/types'
import { generateId } from '@/utils/format'

interface RuleContext {
  cascade: CascadeResult
  scenario: ScenarioDefinition
  objects: IKObject[]
}

function impactForAction(
  description: string,
  ctx: RuleContext,
): ActionImpactPreview {
  const lower = description.toLowerCase()
  const baseReduction = Math.min(55, Math.round(ctx.cascade.totalImpactScore * 0.18))
  const preview: ActionImpactPreview = {
    impactReductionPct: baseReduction,
    collateralRiskPct: 8,
    redundancyLossPct: 5,
    responseEtaMinutes: 12,
    executionComplexity: 'medium',
    confidenceAfter: 82,
    dependencyRisk: 'Niskie ryzyko zależności bezpośrednich',
  }

  if (lower.includes('blackout') || lower.includes('protokół')) {
    return {
      ...preview,
      impactReductionPct: Math.min(62, baseReduction + 18),
      collateralRiskPct: 22,
      redundancyLossPct: 18,
      responseEtaMinutes: 5,
      executionComplexity: 'high',
      confidenceAfter: 76,
      dependencyRisk: 'Redukcja redundancji zasilania w regionie operacyjnym',
    }
  }
  if (lower.includes('agregat') || lower.includes('awaryjn')) {
    return {
      ...preview,
      impactReductionPct: Math.min(48, baseReduction + 12),
      collateralRiskPct: 14,
      redundancyLossPct: 9,
      responseEtaMinutes: 15,
      executionComplexity: 'medium',
      confidenceAfter: 85,
      dependencyRisk: 'Obciążenie generatorów w węzłach krytycznych',
    }
  }
  if (lower.includes('odizoluj') || lower.includes('air-gap')) {
    return {
      ...preview,
      impactReductionPct: Math.min(58, baseReduction + 22),
      collateralRiskPct: 28,
      redundancyLossPct: 24,
      responseEtaMinutes: 8,
      executionComplexity: 'high',
      confidenceAfter: 71,
      dependencyRisk: 'Utrata łączności między OT/IT w węźle incydentu',
    }
  }
  if (lower.includes('zamknij') || lower.includes('dk77')) {
    return {
      ...preview,
      impactReductionPct: 35,
      collateralRiskPct: 31,
      redundancyLossPct: 12,
      responseEtaMinutes: 10,
      executionComplexity: 'medium',
      confidenceAfter: 78,
      dependencyRisk: 'Opóźnienia transportu i logistyki ratowniczej',
    }
  }
  if (lower.includes('ewakuuj')) {
    return {
      ...preview,
      impactReductionPct: 28,
      collateralRiskPct: 18,
      redundancyLossPct: 4,
      responseEtaMinutes: 20,
      executionComplexity: 'high',
      confidenceAfter: 80,
      dependencyRisk: 'Presja na kanały komunikacji TETRA/RCB',
    }
  }
  if (lower.includes('raport')) {
    return {
      impactReductionPct: 0,
      collateralRiskPct: 2,
      redundancyLossPct: 0,
      responseEtaMinutes: 45,
      executionComplexity: 'low',
      confidenceAfter: 95,
      dependencyRisk: 'Brak wpływu na propagację — obowiązek compliance',
    }
  }

  return preview
}

function tradeoffsForAction(description: string, ctx: RuleContext): string[] {
  const lower = description.toLowerCase()
  const tradeoffs: string[] = []

  if (lower.includes('blackout')) {
    tradeoffs.push('Redukcja propagacji kaskady o ~42%, lecz obniżenie redundancji komunikacyjnej regionu o ~18%')
    tradeoffs.push('Tymczasowe obciążenie generatorów w węzłach krytycznych')
  }
  if (lower.includes('agregat')) {
    tradeoffs.push('Stabilizacja obiektów medycznych, koszt: zużycie rezerwy paliwa w 4–6h')
  }
  if (lower.includes('odizoluj') || lower.includes('air-gap')) {
    tradeoffs.push('Containment cyber OT skuteczny, ale utrata zdalnego monitoringu SCADA')
  }
  if (lower.includes('zamknij')) {
    tradeoffs.push('Ograniczenie ryzyka eksplozji, opóźnienie ewakuacji medycznej o 12–25 min')
  }
  if (lower.includes('zabezpiecz')) {
    tradeoffs.push(`Presja operacyjna na ${ctx.cascade.criticalCount} węzłów krytycznych jednocześnie`)
  }
  if (tradeoffs.length === 0) {
    tradeoffs.push('Operacja wymaga koordynacji między służbami — opóźnienie decyzji zwiększa presję kaskady')
  }
  return tradeoffs
}

function consequencesForAction(description: string, ctx: RuleContext): string[] {
  const lower = description.toLowerCase()
  const preview = impactForAction(description, ctx)
  const consequences: string[] = []

  if (preview.impactReductionPct && preview.impactReductionPct > 0) {
    consequences.push(`Szacowana redukcja impact score: ~${preview.impactReductionPct}%`)
  }
  if (lower.includes('blackout') || lower.includes('odizoluj') || lower.includes('agregat')) {
    consequences.push('Graf zależności przeliczy propagację — węzły downstream stabilizują się stopniowo')
    consequences.push('Audit trail + trust score recovery w ciągu 2–4 min operacyjnych')
  }
  if (lower.includes('raport')) {
    consequences.push('Zgodność NIS2 Art. 23 — brak wpływu na kaskadę operacyjną')
  }
  if (consequences.length === 0) {
    consequences.push(`Wpływ na ${ctx.cascade.affectedCount} obiektów IK w bieżącej kaskadzie`)
  }
  return consequences
}

function enrichAction(action: Omit<RecommendationAction, 'tradeoffs' | 'consequences' | 'impactPreview'>, ctx: RuleContext): RecommendationAction {
  return {
    ...action,
    tradeoffs: tradeoffsForAction(action.description, ctx),
    consequences: consequencesForAction(action.description, ctx),
    impactPreview: impactForAction(action.description, ctx),
  }
}

function buildActionsForScenario(ctx: RuleContext): RecommendationAction[] {
  const actions: RecommendationAction[] = []
  const { scenario, cascade, objects } = ctx

  const triggerObj = objects.find(o => o.id === cascade.incidentObjectId)
  const criticalNodes = cascade.nodes.filter(n => n.severity === 'critical')

  let priority = 1

  if (scenario.type === 'power_plant_sabotage' || scenario.type === 'blackout') {
    actions.push(enrichAction({
      id: generateId(),
      priority: priority++,
      description: `Aktywuj protokół BLACKOUT dla ${triggerObj?.name ?? 'obiektu IK'}`,
      responsible: 'Dyżurny CZK',
      timeframe: 'Natychmiast (0-5 min)',
      approved: false,
    }, ctx))
    actions.push(enrichAction({
      id: generateId(),
      priority: priority++,
      description: 'Powiadom PSP i Policję o zagrożeniu dla infrastruktury krytycznej',
      responsible: 'Oficer dyżurny',
      timeframe: '0-5 min',
      approved: false,
    }, ctx))
    actions.push(enrichAction({
      id: generateId(),
      priority: priority++,
      description: 'Aktywuj agregaty awaryjne w szpitalu i centrum kryzysowym',
      responsible: 'Techniczny PSP',
      timeframe: '5-15 min',
      approved: false,
    }, ctx))
  }

  if (scenario.type === 'fire') {
    actions.push(enrichAction({
      id: generateId(),
      priority: priority++,
      description: 'Ewakuuj personel z obszaru 500m od magazynu paliw',
      responsible: 'PSP / Policja',
      timeframe: 'Natychmiast',
      approved: false,
    }, ctx))
    actions.push(enrichAction({
      id: generateId(),
      priority: priority++,
      description: 'Zamknij DK77 — ryzyko eksplozji',
      responsible: 'GDDKiA / Policja',
      timeframe: '0-10 min',
      approved: false,
    }, ctx))
  }

  if (scenario.type === 'cyber_attack_ot') {
    actions.push(enrichAction({
      id: generateId(),
      priority: priority++,
      description: 'Odizoluj sieć OT od reszty infrastruktury (air-gap)',
      responsible: 'CISO / Administrator OT',
      timeframe: 'Natychmiast',
      approved: false,
    }, ctx))
    actions.push(enrichAction({
      id: generateId(),
      priority: priority++,
      description: 'Zgłoś incydent do CERT Polska i ABW',
      responsible: 'Dyżurny bezpieczeństwa',
      timeframe: '15 min (wymóg KSC)',
      approved: false,
    }, ctx))
  }

  for (const node of criticalNodes) {
    const obj = objects.find(o => o.id === node.objectId)
    if (!obj) continue
    actions.push(enrichAction({
      id: generateId(),
      priority: priority++,
      description: `Zabezpiecz ${obj.name} — awaria przewidywana za ${node.affectedAt}min`,
      responsible: obj.contactChannel,
      timeframe: `Do ${node.affectedAt}min`,
      approved: false,
    }, ctx))
  }

  actions.push(enrichAction({
    id: generateId(),
    priority: priority++,
    description: 'Wygeneruj raport incydentu dla RCB zgodnie z formatem NIS2 Art. 23',
    responsible: 'Analityk / Dowódca',
    timeframe: '60 min (obowiązek prawny)',
    approved: false,
  }, ctx))

  return actions
}

export function generateRecommendation(ctx: RuleContext): Recommendation {
  const startedAt = performance.now()
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
    generationTimeMs: Math.round(performance.now() - startedAt),
  }
}
