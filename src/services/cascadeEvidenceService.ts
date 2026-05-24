import type {
  CascadeResult,
  ContainmentSimulationResult,
  IKObject,
} from '@/types'

export const CASCADE_ENGINE_VERSION = 'bastion-cascade/1.2.0'

function stableHash(input: string): string {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

export function computeCascadeInputHash(
  objects: IKObject[],
  incidentObjectId: string,
  containedNodeIds: string[] = [],
): string {
  const payload = [
    incidentObjectId,
    ...containedNodeIds.sort(),
    ...objects
      .map(o => `${o.id}:${o.status}:${o.criticality}:${o.dependencies.sort().join('+')}`)
      .sort(),
  ].join('|')
  return stableHash(payload)
}

export function enrichCascadeResult(
  result: CascadeResult,
  objects: IKObject[],
  containedNodeIds: string[] = [],
): CascadeResult {
  const inputHash = computeCascadeInputHash(objects, result.incidentObjectId, containedNodeIds)
  const nodes = result.nodes.map(node => {
    const parentNodeId = node.via.length > 0 ? node.via[node.via.length - 1] : result.incidentObjectId
    const obj = objects.find(o => o.id === node.objectId)
    return {
      ...node,
      parentNodeId,
      propagationPath: [result.incidentObjectId, ...node.via, node.objectId],
      dependencyReason: node.via.length > 0
        ? `Zależność operacyjna od ${node.via.join(' → ')}`
        : `Bezpośrednia propagacja od root ${result.incidentObjectId}`,
      confidence: Math.min(100, 72 + node.depth * 4 + (obj?.criticality ?? 3) * 3),
    }
  })

  return {
    ...result,
    nodes,
    rootCauseNodeId: result.incidentObjectId,
    impactedNodes: nodes.map(n => n.objectId),
    engineVersion: CASCADE_ENGINE_VERSION,
    generatedAt: result.computedAt,
    inputHash,
    deterministicSignature: stableHash(
      `${inputHash}|${nodes.map(n => `${n.objectId}:${n.affectedAt}:${n.impactScore.toFixed(2)}`).join(';')}`,
    ),
  }
}

export function buildCascadeEvidenceExport(params: {
  cascade: CascadeResult
  objects: IKObject[]
  operator: string
  incidentId?: string
  containment?: ContainmentSimulationResult | null
}): Record<string, unknown> {
  const { cascade, objects, operator, incidentId, containment } = params
  const trigger = objects.find(o => o.id === cascade.incidentObjectId)

  return {
    reportType: 'CASCADE_EVIDENCE_REPORT',
    classification: 'OPERATIONAL_EVIDENCE',
    generatedBy: operator,
    generatedAt: new Date().toISOString(),
    incidentId: incidentId ?? null,
    engineVersion: cascade.engineVersion ?? CASCADE_ENGINE_VERSION,
    deterministicSignature: cascade.deterministicSignature ?? null,
    inputHash: cascade.inputHash ?? null,
    rootCauseNodeId: cascade.rootCauseNodeId ?? cascade.incidentObjectId,
    rootCauseName: trigger?.name ?? cascade.incidentObjectId,
    summary: {
      totalImpactScore: cascade.totalImpactScore,
      affectedCount: cascade.affectedCount,
      criticalCount: cascade.criticalCount,
      timelineMinutes: cascade.timelineMinutes,
      computedAt: cascade.computedAt.toISOString(),
    },
    propagationTimeline: cascade.nodes
      .slice()
      .sort((a, b) => a.affectedAt - b.affectedAt)
      .map(n => ({
        timeMinutes: n.affectedAt,
        label: `T+${n.affectedAt}`,
        objectId: n.objectId,
        name: objects.find(o => o.id === n.objectId)?.shortName ?? n.objectId,
        severity: n.severity,
        impactScore: n.impactScore,
        parentNodeId: n.parentNodeId ?? cascade.incidentObjectId,
        propagationPath: n.propagationPath ?? [cascade.incidentObjectId, ...n.via, n.objectId],
        dependencyReason: n.dependencyReason ?? n.via.join(' → '),
        confidence: n.confidence ?? 75,
      })),
    containmentComparison: containment
      ? {
          before: {
            affectedCount: containment.beforeAffectedCount,
            impactScore: containment.beforeImpact,
            nodeIds: containment.baseline.nodes.map(n => n.objectId),
          },
          after: {
            affectedCount: containment.afterAffectedCount,
            impactScore: containment.afterImpact,
            nodeIds: containment.contained.nodes.map(n => n.objectId),
          },
          preventedNodeIds: containment.preventedNodeIds,
          preventedNames: containment.preventedNodeIds.map(
            id => objects.find(o => o.id === id)?.shortName ?? id.toUpperCase(),
          ),
          impactReduction: containment.impactReduction,
          timeSavedMinutes: containment.timeSavedMinutes,
          residualRisk: containment.residualRisk,
          tradeoffBackupLoadIncrease: containment.tradeoffBackupLoadIncrease ?? 0,
        }
      : null,
    integrityNote:
      'Wynik deterministyczny — ten sam inputHash i graf IK dają identyczny output. Nie jest to animacja dekoracyjna.',
  }
}
