import { SCENARIOS } from '@/data/scenarios'
import { runCinematicScenarioLaunch } from '@/services/cinematicScenarioFlow'
import { logAction } from '@/services/auditLogService'
import { generateId } from '@/utils/format'
import { useAppStore } from '@/store/useAppStore'
import type { Alert, ScenarioDefinition, ScenarioRun } from '@/types'

export async function launchCinematicScenario(
  scenario: ScenarioDefinition,
  options?: {
    onStep?: (label: string) => void
    onComplete?: (run: ScenarioRun) => void
  },
): Promise<ScenarioRun | null> {
  const store = useAppStore.getState()
  const { ikObjects, mode, operator } = store

  const run: ScenarioRun = {
    id: `run-${generateId()}`,
    scenarioId: scenario.id,
    startedAt: new Date(),
    status: 'running',
    generatedAlertIds: [],
    operatorId: operator?.id ?? 'anonymous',
    mode,
  }
  store.setActiveScenarioRun(run)

  store.addAuditEntry(await logAction({
    operator: operator?.name ?? 'OPERATOR',
    action: 'scenario_start',
    details: `Uruchomiono scenariusz: ${scenario.name} (ID: ${scenario.id})`,
    affectedObject: scenario.triggerObjectId,
    mode,
  }))

  try {
    const result = await runCinematicScenarioLaunch({
      scenario,
      objects: ikObjects,
      operatorId: operator?.id ?? 'anonymous',
      mode,
      runId: run.id,
      callbacks: {
        onStep: (step, detail) => {
          options?.onStep?.(detail ? `${step}: ${detail}` : step)
          void logAction({
            operator: operator?.name ?? 'OPERATOR',
            action: 'scenario_start',
            details: `Cinematic flow — ${step}${detail ? `: ${detail}` : ''}`,
            affectedObject: scenario.triggerObjectId,
            mode,
          }).then(entry => store.addAuditEntry(entry))
        },
        updateObjectStatus: store.updateObjectStatus,
        setCascadeResult: store.setCascadeResult,
        addAlerts: store.addAlerts,
        addRecommendation: store.addRecommendation,
        addIncident: store.addIncident,
        openIncidentCommand: store.openIncidentCommand,
        pulseEventHeartbeat: store.pulseEventHeartbeat,
      },
    })

    const completedRun: ScenarioRun = {
      ...result.run,
      cascadeResult: result.cascadeResult,
      generatedAlertIds: result.alerts.map((a: Alert) => a.id),
    }
    store.setActiveScenarioRun(completedRun)
    store.startCascadeReplay()
    void store.runThreatScan()
    options?.onComplete?.(completedRun)
    return completedRun
  } catch {
    store.setActiveScenarioRun({ ...run, status: 'aborted', endedAt: new Date() })
    return null
  }
}

export function launchDefaultDemoScenario(options?: {
  onStep?: (label: string) => void
  onComplete?: (run: ScenarioRun) => void
}): Promise<ScenarioRun | null> {
  const scenario = SCENARIOS[0]
  if (!scenario) return Promise.resolve(null)
  return launchCinematicScenario(scenario, options)
}
