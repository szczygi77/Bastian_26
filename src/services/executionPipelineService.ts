import { enqueueAction } from '@/services/offlineDataManager'
import { logAction } from '@/services/auditLogService'
import { simulateContainment } from '@/services/cascadeSimulationService'
import type {
  ActionExecution,
  ActionExecutionState,
  CascadeResult,
  ContainmentSimulationResult,
  IKObject,
  Incident,
  Recommendation,
  RecommendationAction,
  SystemMode,
} from '@/types'
import { generateId } from '@/utils/format'

export interface ExecutionContext {
  recommendation: Recommendation
  action: RecommendationAction
  incident: Incident | null
  ikObjects: IKObject[]
  cascadeResult: CascadeResult | null
  operator: string
  mode: SystemMode
}

export interface ExecutionOutcome {
  execution: ActionExecution
  auditDetails: string
  cascadeResult?: CascadeResult | null
  containmentResult?: ContainmentSimulationResult | null
  objectStatusUpdates: Array<{ id: string; status: IKObject['status'] }>
  incidentPatch?: Partial<Incident>
  startRecovery?: boolean
}

function inferContainmentTargets(description: string, cascade: CascadeResult | null): string[] {
  if (!cascade) return []
  const lower = description.toLowerCase()
  if (lower.includes('blackout') || lower.includes('protokół')) {
    return cascade.nodes.filter(n => n.severity === 'critical').slice(0, 2).map(n => n.objectId)
  }
  if (lower.includes('agregat') || lower.includes('awaryjn')) {
    return cascade.nodes.filter(n => n.depth <= 2).slice(0, 1).map(n => n.objectId)
  }
  if (lower.includes('odizoluj') || lower.includes('air-gap')) {
    return [cascade.incidentObjectId]
  }
  return []
}

export async function buildExecutionOutcome(ctx: ExecutionContext): Promise<ExecutionOutcome> {
  const { recommendation, action, incident, ikObjects, cascadeResult, operator, mode } = ctx
  const now = new Date()
  const execution: ActionExecution = {
    id: `exec-${generateId()}`,
    recommendationId: recommendation.id,
    actionId: action.id,
    incidentId: incident?.id,
    state: 'executing',
    queuedAt: now,
    operator,
  }

  const objectStatusUpdates: Array<{ id: string; status: IKObject['status'] }> = []
  let nextCascade = cascadeResult
  let containmentResult: ContainmentSimulationResult | null = null
  let startRecovery = false
  let incidentPatch: Partial<Incident> | undefined

  try {
    await enqueueAction({
      entity: 'audit_entries',
      entityId: execution.id,
      payload: {
        type: 'action_execution',
        recommendationId: recommendation.id,
        actionId: action.id,
        description: action.description,
      },
    })

    const lower = action.description.toLowerCase()

    if (lower.includes('blackout') && cascadeResult) {
      objectStatusUpdates.push({ id: cascadeResult.incidentObjectId, status: 'under_attack' })
    }

    if ((lower.includes('agregat') || lower.includes('zabezpiecz')) && cascadeResult) {
      for (const node of cascadeResult.nodes.filter(n => n.severity === 'critical').slice(0, 2)) {
        objectStatusUpdates.push({ id: node.objectId, status: 'degraded' })
      }
    }

    const containmentTargets = inferContainmentTargets(action.description, cascadeResult)
    if (containmentTargets.length > 0 && cascadeResult) {
      const sim = simulateContainment(ikObjects, cascadeResult, containmentTargets)
      containmentResult = sim
      nextCascade = sim.contained
      startRecovery = true
      for (const id of containmentTargets) {
        objectStatusUpdates.push({ id, status: 'operational' })
      }
      for (const id of sim.preventedNodeIds.slice(0, 4)) {
        objectStatusUpdates.push({ id, status: 'degraded' })
      }
      if (incident) {
        incidentPatch = {
          notes: `${incident.notes}\n[EXEC] Containment: ${containmentTargets.join(', ')} · prevented ${sim.preventedNodeIds.length} nodes · -${sim.impactReduction.toFixed(1)} impact · residual ${sim.residualRisk.toFixed(0)}/100`,
        }
      }
    }

    if (incident && lower.includes('eskal')) {
      incidentPatch = { ...incidentPatch, severity: 'critical' }
    }

    execution.state = 'executed'
    execution.executedAt = new Date()

    return {
      execution,
      auditDetails: `Wykonano akcję [${action.priority}]: ${action.description}`,
      cascadeResult: nextCascade,
      containmentResult,
      objectStatusUpdates,
      incidentPatch,
      startRecovery,
    }
  } catch (error) {
    execution.state = 'failed'
    execution.error = error instanceof Error ? error.message : 'execution failed'
    return {
      execution,
      auditDetails: `Błąd wykonania akcji: ${action.description}`,
      objectStatusUpdates,
    }
  }
}

export function markActionState(
  action: RecommendationAction,
  state: ActionExecutionState,
  operator: string,
): RecommendationAction {
  return {
    ...action,
    approved: state === 'approved' || state === 'queued' || state === 'executing' || state === 'executed',
    executionState: state,
    approvedBy: operator,
    approvedAt: action.approvedAt ?? new Date(),
    executedAt: state === 'executed' ? new Date() : action.executedAt,
  }
}

export function createApprovalAuditEntry(params: {
  operator: string
  recommendation: Recommendation
  action: RecommendationAction
  incidentId?: string
  mode: SystemMode
}) {
  return logAction({
    operator: params.operator,
    action: 'recommendation_approve',
    details: `Zatwierdzono i zakolejkowano: ${params.action.description}`,
    incidentId: params.incidentId,
    mode: params.mode,
  })
}

export function createExecutionAuditEntry(params: {
  operator: string
  details: string
  incidentId?: string
  mode: SystemMode
}) {
  return logAction({
    operator: params.operator,
    action: 'recommendation_approve',
    details: params.details,
    incidentId: params.incidentId,
    mode: params.mode,
  })
}
