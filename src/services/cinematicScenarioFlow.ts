import type { Alert, CascadeResult, IKObject, ScenarioDefinition, SystemMode } from '@/types'
import { buildScenarioLaunchResult, type ScenarioLaunchResult } from '@/services/scenarioEngine'
import { getImpactTimeline } from '@/services/cascadeEngine'

export type CinematicStep =
  | 'scenario_selected'
  | 'root_status_change'
  | 'cascade_calculated'
  | 'node_impacted'
  | 'alert_created'
  | 'recommendation_ready'
  | 'incident_opened'

export interface CinematicCallbacks {
  onStep: (step: CinematicStep, detail?: string) => void
  updateObjectStatus: (id: string, status: IKObject['status']) => void
  setCascadeResult: (result: CascadeResult | null) => void
  addAlerts: (alerts: Alert[]) => void
  addRecommendation: (rec: ScenarioLaunchResult['recommendation']) => void
  addIncident: (incident: ScenarioLaunchResult['incident']) => void
  openIncidentCommand: (incidentId: string) => void
  pulseEventHeartbeat: () => void
}

function severityToStatus(severity: string): IKObject['status'] {
  if (severity === 'critical') return 'under_attack'
  if (severity === 'high') return 'degraded'
  return 'degraded'
}

function scaleDelay(minutes: number): number {
  return Math.min(900, Math.max(180, minutes * 80))
}

export async function runCinematicScenarioLaunch(params: {
  scenario: ScenarioDefinition
  objects: IKObject[]
  operatorId: string
  mode: SystemMode
  runId: string
  callbacks: CinematicCallbacks
}): Promise<ScenarioLaunchResult> {
  const { scenario, objects, operatorId, mode, runId, callbacks } = params

  callbacks.onStep('scenario_selected', scenario.name)
  callbacks.updateObjectStatus(scenario.triggerObjectId, scenario.initialStatus)
  if (scenario.additionalAffected) {
    for (const id of scenario.additionalAffected) {
      callbacks.updateObjectStatus(id, 'degraded')
    }
  }
  callbacks.onStep('root_status_change', scenario.triggerObjectId)

  await new Promise(r => setTimeout(r, 500))

  const result = buildScenarioLaunchResult({
    scenario,
    objects,
    operatorId,
    mode,
    runId,
  })

  callbacks.setCascadeResult(result.cascadeResult)
  callbacks.onStep('cascade_calculated', `${result.cascadeResult.affectedCount} obiektów`)

  const timeline = getImpactTimeline(result.cascadeResult, objects)
  for (const item of timeline) {
    await new Promise(r => setTimeout(r, scaleDelay(item.time)))
    callbacks.updateObjectStatus(item.objectId, severityToStatus(item.severity))
    callbacks.onStep('node_impacted', `${item.name} T+${item.time}min`)
  }

  for (const alert of result.alerts) {
    await new Promise(r => setTimeout(r, 220))
    callbacks.addAlerts([alert])
    callbacks.onStep('alert_created', alert.title)
  }

  callbacks.addRecommendation({ ...result.recommendation, incidentId: result.incident.id })
  callbacks.onStep('recommendation_ready', result.recommendation.summary)

  callbacks.addIncident(result.incident)
  callbacks.pulseEventHeartbeat()
  callbacks.openIncidentCommand(result.incident.id)
  callbacks.onStep('incident_opened', result.incident.id)

  return result
}
