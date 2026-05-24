import { getImpactTimeline } from '@/services/cascadeEngine'
import { buildGraph } from '@/services/graphEngine'
import { enrichCascadeResult } from '@/services/cascadeEvidenceService'
import type {
  CascadeReplayFrame,
  CascadeResult,
  ContainmentSimulationResult,
  IKObject,
  NodeImpactExplanation,
} from '@/types'

export { getImpactTimeline }

export function buildCascadeReplayFrames(result: CascadeResult): CascadeReplayFrame[] {
  const frames: CascadeReplayFrame[] = [
    {
      timeMinutes: 0,
      revealedNodeIds: [result.incidentObjectId],
      label: 'ROOT INCIDENT',
    },
  ]

  const ordered = [...result.nodes].sort((a, b) => a.affectedAt - b.affectedAt)
  const revealed = new Set<string>([result.incidentObjectId])

  for (const node of ordered) {
    revealed.add(node.objectId)
    frames.push({
      timeMinutes: node.affectedAt,
      revealedNodeIds: [...revealed],
      label: `T+${node.affectedAt} · ${node.objectId.toUpperCase()}`,
    })
  }

  return frames
}

export function runCascadeWithContainment(
  objects: IKObject[],
  incidentObjectId: string,
  containedNodeIds: string[],
): CascadeResult {
  const contained = new Set(containedNodeIds)
  const graph = buildGraph(objects)
  const visited = new Set<string>()
  const nodes: CascadeResult['nodes'] = []

  const queue: { id: string; depth: number; affectedAt: number; via: string[] }[] = [
    { id: incidentObjectId, depth: 0, affectedAt: 0, via: [] },
  ]

  const CASCADE_SPEED: Record<string, number> = {
    energy: 0,
    telecommunications: 5,
    water: 15,
    transport: 30,
    fuel: 10,
    military: 2,
    emergency: 3,
    government: 10,
  }

  while (queue.length > 0) {
    const { id, depth, affectedAt, via } = queue.shift()!
    if (visited.has(id)) continue
    visited.add(id)

    const obj = objects.find(o => o.id === id)
    if (!obj) continue

    if (id !== incidentObjectId) {
      const impactScore = Math.min(
        100,
        (obj.criticality / 5) * 60 + (obj.riskProfile.overall / 100) * 40 - (obj.backupPowerHours > 0 ? 15 : 0),
      )
      const severity =
        impactScore >= 80 ? 'critical' as const :
        impactScore >= 55 ? 'high' as const :
        impactScore >= 30 ? 'medium' as const : 'low' as const

      nodes.push({ objectId: id, depth, affectedAt, severity, impactScore, via })
    }

    if (contained.has(id)) continue

    const dependents = graph.adjacency.get(id) ?? new Set()
    for (const depId of dependents) {
      if (!visited.has(depId)) {
        const depObj = objects.find(o => o.id === depId)
        const delay = depObj ? (CASCADE_SPEED[depObj.category] ?? 20) : 20
        queue.push({ id: depId, depth: depth + 1, affectedAt: affectedAt + delay, via: [...via, id] })
      }
    }
  }

  const totalImpactScore = nodes.reduce((sum, n) => sum + n.impactScore, 0) / Math.max(nodes.length, 1)
  const timelineMinutes = Math.max(...nodes.map(n => n.affectedAt), 0)

  return enrichCascadeResult(
    {
      incidentObjectId,
      nodes,
      totalImpactScore,
      timelineMinutes,
      affectedCount: nodes.length,
      criticalCount: nodes.filter(n => n.severity === 'critical').length,
      computedAt: new Date(),
    },
    objects,
    containedNodeIds,
  )
}

function computeBackupLoadTradeoff(
  objects: IKObject[],
  containedNodeIds: string[],
  preventedNodeIds: string[],
): number {
  const containedEnergy = containedNodeIds.filter(id => {
    const obj = objects.find(o => o.id === id)
    return obj?.category === 'energy' || obj?.category === 'fuel'
  }).length
  const preventedCritical = preventedNodeIds.filter(id => {
    const obj = objects.find(o => o.id === id)
    return (obj?.criticality ?? 0) >= 4
  }).length
  return Math.min(45, containedEnergy * 9 + preventedCritical * 3)
}

export function simulateContainment(
  objects: IKObject[],
  baseline: CascadeResult,
  containedNodeIds: string[],
): ContainmentSimulationResult {
  const contained = runCascadeWithContainment(objects, baseline.incidentObjectId, containedNodeIds)
  const baselineIds = new Set(baseline.nodes.map(n => n.objectId))
  const containedIds = new Set(contained.nodes.map(n => n.objectId))
  const preventedNodeIds = [...baselineIds].filter(id => !containedIds.has(id))

  const beforeImpact = baseline.totalImpactScore
  const afterImpact = contained.totalImpactScore
  const impactReduction = Math.max(0, beforeImpact - afterImpact)
  const timeSavedMinutes = Math.max(0, baseline.timelineMinutes - contained.timelineMinutes)
  const residualRisk = Math.min(100, afterImpact)
  const tradeoffBackupLoadIncrease = computeBackupLoadTradeoff(objects, containedNodeIds, preventedNodeIds)

  return {
    containedNodeIds,
    baseline,
    contained,
    preventedNodeIds,
    impactReduction,
    timeSavedMinutes,
    residualRisk,
    beforeImpact,
    afterImpact,
    beforeAffectedCount: baseline.affectedCount,
    afterAffectedCount: contained.affectedCount,
    tradeoffBackupLoadIncrease,
  }
}

export function explainNodeImpact(
  objects: IKObject[],
  cascadeResult: CascadeResult | null,
  nodeId: string,
): NodeImpactExplanation | null {
  const obj = objects.find(o => o.id === nodeId)
  if (!obj) return null

  const graph = buildGraph(objects)
  const cascadeNode = cascadeResult?.nodes.find(n => n.objectId === nodeId)
  const parents = [...(graph.reverseAdjacency.get(nodeId) ?? [])]
  const downstream = [...(graph.adjacency.get(nodeId) ?? [])]

  const whyImpacted = cascadeNode
    ? `Propagacja kaskady T+${cascadeNode.affectedAt}min przez: ${cascadeNode.via.join(' → ') || 'bezpośrednio od root'}. Impact ${cascadeNode.impactScore.toFixed(0)}/100.`
    : obj.status !== 'operational'
      ? `Status obiektu: ${obj.status}. Brak aktywnej kaskady — monitorowany w grafie zależności.`
      : 'Obiekt nominalny — brak aktywnej propagacji.'

  return {
    objectId: nodeId,
    name: obj.name,
    shortName: obj.shortName,
    parents,
    downstream,
    whyImpacted,
    criticality: obj.criticality,
    propagationDelayMinutes: cascadeNode?.affectedAt ?? 0,
    recoveryDependencies: obj.dependencies,
    cascadeNode,
  }
}

export function getRootCausePath(
  cascadeResult: CascadeResult,
  nodeId: string,
): string[] {
  const node = cascadeResult.nodes.find(n => n.objectId === nodeId)
  if (!node) return [cascadeResult.incidentObjectId]
  return [cascadeResult.incidentObjectId, ...node.via, nodeId]
}
