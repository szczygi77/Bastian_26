import type { IKObject, CascadeResult, CascadeNode } from '@/types'
import { buildGraph, type Graph } from './graphEngine'

const CASCADE_SPEED_MINUTES: Record<string, number> = {
  energy: 0,
  telecommunications: 5,
  water: 15,
  transport: 30,
  fuel: 10,
  military: 2,
  emergency: 3,
  government: 10,
}

function getSeverityFromImpact(impactScore: number): CascadeNode['severity'] {
  if (impactScore >= 80) return 'critical'
  if (impactScore >= 55) return 'high'
  if (impactScore >= 30) return 'medium'
  return 'low'
}

export function runCascadeBFS(
  objects: IKObject[],
  incidentObjectId: string,
  overrideStatuses?: Map<string, string>
): CascadeResult {
  const graph: Graph = buildGraph(objects)
  const visited = new Set<string>()
  const nodes: CascadeNode[] = []

  const queue: { id: string; depth: number; affectedAt: number; via: string[] }[] = [
    { id: incidentObjectId, depth: 0, affectedAt: 0, via: [] },
  ]

  while (queue.length > 0) {
    const { id, depth, affectedAt, via } = queue.shift()!
    if (visited.has(id)) continue
    visited.add(id)

    const obj = objects.find(o => o.id === id)
    if (!obj) continue

    const status = overrideStatuses?.get(id) ?? obj.status
    const isIncidentNode = id === incidentObjectId

    if (!isIncidentNode) {
      const impactScore = Math.min(
        100,
        (obj.criticality / 5) * 60 +
          (obj.riskProfile.overall / 100) * 40 -
          (obj.backupPowerHours > 0 ? 15 : 0)
      )

      nodes.push({
        objectId: id,
        depth,
        affectedAt,
        severity: getSeverityFromImpact(impactScore),
        impactScore,
        via,
      })
    }

    const dependents = graph.adjacency.get(id) ?? new Set()
    for (const depId of dependents) {
      if (!visited.has(depId)) {
        const depObj = objects.find(o => o.id === depId)
        const delay = depObj ? (CASCADE_SPEED_MINUTES[depObj.category] ?? 20) : 20
        queue.push({
          id: depId,
          depth: depth + 1,
          affectedAt: affectedAt + delay,
          via: [...via, id],
        })
      }
    }
  }

  const totalImpactScore =
    nodes.reduce((sum, n) => sum + n.impactScore, 0) / Math.max(nodes.length, 1)
  const timelineMinutes = Math.max(...nodes.map(n => n.affectedAt), 0)
  const criticalCount = nodes.filter(n => n.severity === 'critical').length

  return {
    incidentObjectId,
    nodes,
    totalImpactScore,
    timelineMinutes,
    affectedCount: nodes.length,
    criticalCount,
    computedAt: new Date(),
  }
}

export function getImpactTimeline(result: CascadeResult, objects: IKObject[]): {
  time: number
  objectId: string
  name: string
  severity: CascadeNode['severity']
}[] {
  return result.nodes
    .sort((a, b) => a.affectedAt - b.affectedAt)
    .map(node => {
      const obj = objects.find(o => o.id === node.objectId)
      return {
        time: node.affectedAt,
        objectId: node.objectId,
        name: obj?.shortName ?? node.objectId,
        severity: node.severity,
      }
    })
}
