import type {
  CascadeResult,
  IKObject,
  Incident,
  Recommendation,
  ScenarioDefinition,
  ScenarioRun,
  SystemMode,
} from '@/types'
import { runCascadeBFS } from '@/services/cascadeEngine'
import { createAlertFromCascade } from '@/services/alertEngine'
import { generateRecommendation } from '@/services/recommendationEngine'
import { generateId } from '@/utils/format'
import type { Alert } from '@/types'

export interface ScenarioLaunchResult {
  run: ScenarioRun
  cascadeResult: CascadeResult
  alerts: Alert[]
  recommendation: Recommendation
  incident: Incident
}

export function buildIncidentFromScenario(
  scenario: ScenarioDefinition,
  cascadeResult: CascadeResult,
  alertIds: string[],
  scenarioRunId: string,
  operatorId: string,
): Incident {
  const affectedObjectIds = [
    cascadeResult.incidentObjectId,
    ...cascadeResult.nodes.map(n => n.objectId),
  ]

  return {
    id: `inc-${generateId()}`,
    title: scenario.name,
    severity: scenario.severity,
    status: 'open',
    startedAt: new Date(),
    affectedObjectIds: [...new Set(affectedObjectIds)],
    alertIds,
    scenarioRunId,
    droneAssignmentIds: [],
    operatorId,
    notes: scenario.description,
  }
}

export function computeScenarioCascade(
  objects: IKObject[],
  scenario: ScenarioDefinition,
): CascadeResult {
  return runCascadeBFS(objects, scenario.triggerObjectId)
}

export function buildScenarioLaunchResult(params: {
  scenario: ScenarioDefinition
  objects: IKObject[]
  operatorId: string
  mode: SystemMode
  runId?: string
}): ScenarioLaunchResult {
  const { scenario, objects, operatorId, mode } = params
  const runId = params.runId ?? `run-${generateId()}`

  const cascadeResult = computeScenarioCascade(objects, scenario)
  const alerts = createAlertFromCascade(cascadeResult, scenario, objects)
  const recommendation = generateRecommendation({ cascade: cascadeResult, scenario, objects: objects })

  const run: ScenarioRun = {
    id: runId,
    scenarioId: scenario.id,
    startedAt: new Date(),
    endedAt: new Date(),
    status: 'completed',
    cascadeResult,
    generatedAlertIds: alerts.map(a => a.id),
    operatorId,
    mode,
  }

  const incident = buildIncidentFromScenario(
    scenario,
    cascadeResult,
    alerts.map(a => a.id),
    run.id,
    operatorId,
  )

  const alertsWithIncident = alerts.map(alert => ({ ...alert, incidentId: incident.id }))

  return {
    run,
    cascadeResult,
    alerts: alertsWithIncident,
    recommendation,
    incident,
  }
}
