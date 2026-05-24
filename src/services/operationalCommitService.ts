import { buildCascadeReplayFrames } from '@/services/cascadeSimulationService'
import { startContainmentRecovery } from '@/services/operationalTelemetryService'
import { createOperationalEvent } from '@/services/operationalHeartbeatService'
import type {
  CascadeResult,
  ContainmentRecoveryState,
  ContainmentSimulationResult,
  GraphComputeState,
  IKObject,
  Incident,
  OperationalEvent,
} from '@/types'

export interface OperationalCommitResult {
  cascadeResult: CascadeResult
  containmentResult: ContainmentSimulationResult | null
  cascadeReplayFrames: ReturnType<typeof buildCascadeReplayFrames>
  cascadeReplayIndex: number
  activeCascadeView: CascadeResult
  recovery: ContainmentRecoveryState | null
  graphCompute: GraphComputeState
  operationalEvents: OperationalEvent[]
  incidentPatch?: Partial<Incident>
}

export function commitCascadeState(params: {
  cascadeResult: CascadeResult
  containmentResult?: ContainmentSimulationResult | null
  baselineContainment?: ContainmentSimulationResult | null
  incident?: Incident | null
  startRecovery?: boolean
  eventMessage?: string
}): OperationalCommitResult {
  const {
    cascadeResult,
    containmentResult = null,
    incident,
    startRecovery = false,
    eventMessage,
  } = params

  const replayFrames = buildCascadeReplayFrames(cascadeResult)
  const recovery = startRecovery && containmentResult
    ? startContainmentRecovery(containmentResult)
    : null

  const events: OperationalEvent[] = []
  if (containmentResult) {
    events.push(createOperationalEvent(
      'containment_applied',
      eventMessage ?? `Containment · -${containmentResult.impactReduction.toFixed(1)} impact · ${containmentResult.preventedNodeIds.length} prevented`,
      'info',
    ))
    events.push(createOperationalEvent(
      'graph_compute',
      `Recompute grafu: ${containmentResult.contained.affectedCount} aktywnych / ${containmentResult.baseline.affectedCount} baseline`,
      'info',
    ))
  }

  const incidentPatch = incident && containmentResult
    ? {
        notes: `${incident.notes}\n[COMMIT] Containment applied · impact -${containmentResult.impactReduction.toFixed(1)} · residual risk ${containmentResult.residualRisk.toFixed(0)}/100`,
        severity: containmentResult.residualRisk >= 60 ? incident.severity : 'high' as const,
      }
    : undefined

  return {
    cascadeResult: containmentResult?.contained ?? cascadeResult,
    containmentResult,
    cascadeReplayFrames: replayFrames,
    cascadeReplayIndex: 0,
    activeCascadeView: containmentResult?.contained ?? cascadeResult,
    recovery,
    graphCompute: {
      active: true,
      algorithm: containmentResult ? 'CONTAINMENT' : 'BFS',
      visitedNodes: cascadeResult.affectedCount,
      totalNodes: cascadeResult.nodes.length,
      iterationMs: 38,
      label: containmentResult ? 'CONTAINMENT COMMIT' : 'CASCADE UPDATE',
    },
    operationalEvents: events,
    incidentPatch,
  }
}

export function applyIkStatusPatches(
  ikObjects: IKObject[],
  patches: Array<{ id: string; status: IKObject['status'] }>,
): IKObject[] {
  if (patches.length === 0) return ikObjects
  const map = new Map(patches.map(p => [p.id, p.status]))
  return ikObjects.map(o => (map.has(o.id) ? { ...o, status: map.get(o.id)! } : o))
}
