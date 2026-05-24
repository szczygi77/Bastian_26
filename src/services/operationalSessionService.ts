import { IK_OBJECTS } from '@/data/stalowa-wola'
import { getActiveIncidents, getOpenIncident, findAlertsBoundToIncident } from '@/services/incidentLifecycleService'
import type { HydratedAppData } from '@/services/databaseService'
import type { IKObject, Incident } from '@/types'

export interface NormalizedSession {
  data: HydratedAppData
  activeIncident: Incident | null
  shouldClearRuntime: boolean
}

/** Przywraca spójność po hydrate — bez aktywnego incydentu wszystko wraca do stanu nominalnego. */
export function normalizeHydratedSession(raw: HydratedAppData): NormalizedSession {
  const activeIncidents = getActiveIncidents(raw.incidents)
  const activeIncident = getOpenIncident(raw.incidents) ?? activeIncidents[0] ?? null

  if (activeIncident) {
    const boundAlertIds = new Set(findAlertsBoundToIncident(activeIncident, raw.alerts).map(a => a.id))
    const alerts = raw.alerts.map(alert => {
      if (alert.status === 'resolved') return alert
      if (boundAlertIds.has(alert.id) || alert.incidentId === activeIncident.id) return alert
      if (alert.source === 'scenario_engine' || alert.source === 'cascade_engine') {
        return { ...alert, status: 'resolved' as const, resolvedAt: alert.resolvedAt ?? new Date() }
      }
      return alert
    })
    return {
      data: { ...raw, alerts },
      activeIncident,
      shouldClearRuntime: false,
    }
  }

  const coordById = new Map(
    raw.ikStates.map(s => [s.id, s.coordinates]),
  )

  const nominalStates: HydratedAppData['ikStates'] = IK_OBJECTS.map(base => ({
    id: base.id,
    status: 'operational',
    coordinates: coordById.get(base.id) ?? base.coordinates,
  }))

  const alerts = raw.alerts.map(alert => {
    if (alert.status === 'resolved') return alert
    return {
      ...alert,
      status: 'resolved' as const,
      resolvedAt: alert.resolvedAt ?? new Date(),
    }
  })

  return {
    data: {
      ...raw,
      ikStates: nominalStates,
      alerts,
    },
    activeIncident: null,
    shouldClearRuntime: true,
  }
}

export function buildNominalIkObjects(
  baseline: IKObject[] = IK_OBJECTS,
  states: HydratedAppData['ikStates'],
): IKObject[] {
  const byId = new Map(states.map(s => [s.id, s]))
  return baseline.map(base => {
    const saved = byId.get(base.id)
    if (!saved) return { ...base }
    return { ...base, status: saved.status, coordinates: saved.coordinates }
  })
}

export function runtimeClearPatch() {
  return {
    cascadeResult: null as null,
    containmentResult: null as null,
    containmentRecovery: null as null,
    cascadeReplayFrames: [] as [],
    cascadeReplayIndex: 0,
    activeCascadeView: null as null,
    activeIncidentId: null as null,
    incidentMapFilter: null as null,
    selectedNodeForContainment: null as null,
    activeScenarioRun: null as null,
    graphComputeState: {
      active: false,
      algorithm: null as null,
      visitedNodes: 0,
      totalNodes: 0,
      iterationMs: 0,
      label: 'NOMINAL',
    },
  }
}
