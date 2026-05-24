import { SCENARIOS } from '@/data/scenarios'
import { runCascadeBFS } from '@/services/cascadeEngine'
import { computeScenarioCascade } from '@/services/scenarioEngine'
import type { CascadeResult, IKObject, Incident, ScenarioDefinition, ScenarioRun } from '@/types'

export function findScenarioForIncident(incident: Incident): ScenarioDefinition | null {
  const byTitle = SCENARIOS.find(s => s.name === incident.title)
  if (byTitle) return byTitle
  const rootId = incident.affectedObjectIds[0]
  if (rootId) {
    return SCENARIOS.find(s => s.triggerObjectId === rootId) ?? null
  }
  return null
}

export function rehydrateScenarioOperationalState(
  scenario: ScenarioDefinition,
  ikObjects: IKObject[],
): { ikObjects: IKObject[]; cascadeResult: CascadeResult } {
  const nextObjects = ikObjects.map(obj => {
    if (obj.id === scenario.triggerObjectId) {
      return { ...obj, status: scenario.initialStatus }
    }
    if (scenario.additionalAffected?.includes(obj.id)) {
      return { ...obj, status: 'degraded' as const }
    }
    return obj
  })

  return {
    ikObjects: nextObjects,
    cascadeResult: computeScenarioCascade(nextObjects, scenario),
  }
}

export function restoreCascadeForIncident(params: {
  incident: Incident
  ikObjects: IKObject[]
  activeScenarioRun?: ScenarioRun | null
  forceScenarioReapply?: boolean
}): {
  cascadeResult: CascadeResult
  ikObjects: IKObject[]
  scenario: ScenarioDefinition | null
  restoredFrom: 'scenario_run' | 'scenario_reapply' | 'recompute'
} {
  const { incident, ikObjects, activeScenarioRun, forceScenarioReapply } = params

  if (
    activeScenarioRun?.cascadeResult &&
    activeScenarioRun.scenarioId &&
    (!incident.scenarioRunId || activeScenarioRun.id === incident.scenarioRunId)
  ) {
    return {
      cascadeResult: activeScenarioRun.cascadeResult,
      ikObjects,
      scenario: SCENARIOS.find(s => s.id === activeScenarioRun.scenarioId) ?? null,
      restoredFrom: 'scenario_run',
    }
  }

  const scenario = findScenarioForIncident(incident)
  const rootId = incident.affectedObjectIds[0] ?? scenario?.triggerObjectId ?? 'elc'
  const rootObj = ikObjects.find(o => o.id === rootId)
  const needsReapply = forceScenarioReapply
    || (scenario && rootObj && rootObj.status === 'operational' && incident.status === 'open')

  if (scenario && needsReapply) {
    const rehydrated = rehydrateScenarioOperationalState(scenario, ikObjects)
    return {
      ...rehydrated,
      scenario,
      restoredFrom: 'scenario_reapply',
    }
  }

  return {
    cascadeResult: runCascadeBFS(ikObjects, rootId),
    ikObjects,
    scenario,
    restoredFrom: 'recompute',
  }
}

export function canCloseIncident(params: {
  incident: Incident
  containmentResult: { residualRisk: number } | null
  containmentRecovery: { active: boolean } | null
}): { ok: boolean; reason?: string } {
  const { incident, containmentResult, containmentRecovery } = params

  if (incident.status === 'resolved') {
    return { ok: false, reason: 'Incydent jest już zamknięty.' }
  }

  if (containmentRecovery?.active) {
    return { ok: false, reason: 'Trwa stabilizacja — poczekaj na zakończenie recovery.' }
  }

  if (containmentResult && containmentResult.residualRisk >= 75) {
    return { ok: false, reason: 'Residual risk zbyt wysoki — wymagane dodatkowe działania containment.' }
  }

  return { ok: true }
}

export function buildHandoverNote(params: {
  fromOperator: string
  toShift: string
  summary: string
  incident: Incident
}): string {
  const stamp = new Date().toISOString()
  return `${params.incident.notes}\n[HANDOVER ${stamp}] Od: ${params.fromOperator} → Zmiana: ${params.toShift}\n${params.summary}`
}

export function buildClosureNote(params: {
  incident: Incident
  operator: string
  mode: 'resolved' | 'contained'
  summary: string
}): string {
  const stamp = new Date().toISOString()
  const label = params.mode === 'resolved' ? 'RESOLVED' : 'CONTAINED'
  return `${params.incident.notes}\n[${label} ${stamp}] Operator: ${params.operator}\n${params.summary}`
}
