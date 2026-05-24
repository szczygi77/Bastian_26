import { create } from 'zustand'
import type {
  Alert,
  AuditEntry,
  CascadeResult,
  ContainmentRecoveryState,
  ContainmentSimulationResult,
  DroneMission,
  DroneUnit,
  GraphComputeState,
  IKObject,
  Incident,
  NationalRegionSummary,
  OperationalEvent,
  OperationalPulse,
  OperationalTelemetry,
  Operator,
  Recommendation,
  ScenarioRun,
  SystemHealth,
  SystemMode,
} from '@/types'
import { IK_OBJECTS, STALOWA_WOLA_CENTER } from '@/data/stalowa-wola'
import {
  buildNominalIkObjects,
  normalizeHydratedSession,
  runtimeClearPatch,
} from '@/services/operationalSessionService'
import { DRONE_FLEET } from '@/data/drones'
import { logAction } from '@/services/auditLogService'
import { orchestratePublicDataSync } from '@/services/apiOrchestrator'
import { buildNationalOverview } from '@/services/nationalOverviewService'
import { getSystemHealth, buildSystemHealth } from '@/services/systemHealthService'
import { getPublicDataSources } from '@/services/publicDataStatusService'
import type { PublicDataSourceStatus } from '@/types'
import { resolveIkLocations, syncDroneCoordinates } from '@/services/ikLocationService'
import { tickMissionState } from '@/services/missionSimulation'
import {
  probeOperationalPulse,
  pushOperationalEvent,
  createOperationalEvent,
} from '@/services/operationalHeartbeatService'
import {
  buildExecutionOutcome,
  createApprovalAuditEntry,
  createExecutionAuditEntry,
  markActionState,
} from '@/services/executionPipelineService'
import { simulateContainment, buildCascadeReplayFrames } from '@/services/cascadeSimulationService'
import type { CascadeReplayFrame } from '@/types'
import {
  scanThreats,
  threatSignalToAlert,
} from '@/services/threatDetectionService'
import type { ThreatSignal } from '@/types'
import {
  applyIkStatusPatches,
  commitCascadeState,
} from '@/services/operationalCommitService'
import {
  buildClosureNote,
  buildHandoverNote,
  canCloseIncident,
  findAlertsBoundToIncident,
  restoreCascadeForIncident,
} from '@/services/incidentLifecycleService'
import {
  buildGraphComputeState,
  createInitialTelemetry,
  tickContainmentRecovery,
  tickOperationalTelemetry,
} from '@/services/operationalTelemetryService'
import {
  applyIkStates,
  saveAlert,
  saveAlerts,
  saveAuditEntry,
  saveIkObjectState,
  saveIncident,
  saveMission,
  saveRecommendation,
  saveScenarioRun,
  type HydratedAppData,
} from '@/services/databaseService'
import type { AppState } from '@/store/types'

export type { AppState } from '@/store/types'

export const useAppStore = create<AppState>((set, get) => ({
  operator: null,
  setOperator: (op) => set({ operator: op }),

  mode: 'live',
  setMode: (mode) => {
    const op = get().operator
    void logAction({
      operator: op?.name ?? 'SYSTEM',
      action: 'mode_change',
      details: `Zmiana trybu systemu na: ${mode.toUpperCase()}`,
      mode,
    }).then(entry => {
      set(state => ({ mode, auditEntries: [entry, ...state.auditEntries] }))
    })
  },

  online: navigator.onLine,
  setOnline: (online) => set({ online }),

  ikObjects: IK_OBJECTS,
  ikLocationsLoading: false,
  ikLocationsResolved: false,
  mapCenter: STALOWA_WOLA_CENTER,
  loadIkLocations: async (force = false) => {
    const state = get()
    if (state.ikLocationsLoading) return
    if (state.ikLocationsResolved && !force) return

    set({ ikLocationsLoading: true })

    try {
      const result = await resolveIkLocations({ force })
      const drones = syncDroneCoordinates(state.drones, result.objects)

      set({
        ikObjects: result.objects,
        drones,
        mapCenter: result.mapCenter,
        ikLocationsResolved: true,
        ikLocationsLoading: false,
      })
    } catch {
      set({ ikLocationsResolved: true, ikLocationsLoading: false })
    }
  },
  updateObjectStatus: (id, status) => {
    set(state => {
      const ikObjects = state.ikObjects.map(o => (o.id === id ? { ...o, status } : o))
      const updated = ikObjects.find(o => o.id === id)
      if (updated) {
        void saveIkObjectState({ id: updated.id, status: updated.status, coordinates: updated.coordinates }).catch(() => {})
      }
      return { ikObjects }
    })
  },
  resetObjectStatuses: () =>
    set(state => ({
      ikObjects: IK_OBJECTS.map(base => {
        const current = state.ikObjects.find(o => o.id === base.id)
        return current ? { ...base, coordinates: current.coordinates } : base
      }),
    })),

  alerts: [],
  addAlerts: (alerts) => {
    set(state => ({ alerts: [...alerts, ...state.alerts] }))
    void saveAlerts(alerts).catch(() => {})
  },
  updateAlert: (id, patch) => {
    set(state => {
      const alerts = state.alerts.map(a => (a.id === id ? { ...a, ...patch } : a))
      const updated = alerts.find(a => a.id === id)
      if (updated) void saveAlert(updated).catch(() => {})
      return { alerts }
    })
  },
  clearAlerts: () => set({ alerts: [] }),

  incidents: [],
  addIncident: (incident) => {
    set(state => ({ incidents: [incident, ...state.incidents] }))
    void saveIncident(incident).catch(() => {})
  },
  updateIncident: (id, patch) => {
    set(state => {
      const incidents = state.incidents.map(i => (i.id === id ? { ...i, ...patch } : i))
      const updated = incidents.find(i => i.id === id)
      if (updated) void saveIncident(updated).catch(() => {})
      return { incidents }
    })
  },

  restoreIncidentContext: (incidentId, forceScenarioReapply = false) => {
    const state = get()
    const incident = state.incidents.find(i =>
      i.id === (incidentId ?? state.activeIncidentId ?? state.incidents.find(x => x.status === 'open')?.id),
    )
    if (!incident || incident.status === 'resolved') return false

    const restored = restoreCascadeForIncident({
      incident,
      ikObjects: state.ikObjects,
      activeScenarioRun: state.activeScenarioRun,
      forceScenarioReapply,
    })

    const replayFrames = buildCascadeReplayFrames(restored.cascadeResult)
    const events = [
      createOperationalEvent(
        'graph_compute',
        `Przywrócono kontekst kaskady (${restored.restoredFrom}) · ${restored.cascadeResult.affectedCount} węzłów`,
        'info',
      ),
    ]

    set(s => ({
      ikObjects: restored.ikObjects,
      cascadeResult: restored.cascadeResult,
      activeCascadeView: restored.cascadeResult,
      cascadeReplayFrames: replayFrames,
      cascadeReplayIndex: 0,
      incidentMapFilter: [
        restored.cascadeResult.incidentObjectId,
        ...restored.cascadeResult.nodes.map(n => n.objectId),
      ],
      graphComputeState: buildGraphComputeState({
        cascadeResult: restored.cascadeResult,
        replayIndex: 0,
        replayFrameCount: replayFrames.length,
        simRunning: false,
        containmentActive: false,
      }),
      operationalEvents: events.reduce(
        (acc, ev) => pushOperationalEvent(acc, ev),
        s.operationalEvents,
      ),
    }))

    for (const obj of restored.ikObjects) {
      void saveIkObjectState({ id: obj.id, status: obj.status, coordinates: obj.coordinates }).catch(() => {})
    }

    get().startCascadeReplay()
    get().refreshNationalOverview()
    return true
  },

  containIncident: (incidentId, summary) => {
    const state = get()
    const incident = state.incidents.find(i => i.id === incidentId)
    if (!incident) return
    const operator = state.operator?.name ?? 'OPERATOR'
    const patch = {
      status: 'contained' as const,
      notes: buildClosureNote({ incident, operator, mode: 'contained', summary }),
    }
    get().updateIncident(incidentId, patch)
    void logAction({
      operator,
      action: 'incident_contain',
      details: `Incydent oznaczony jako opanowany: ${incident.title}. ${summary}`,
      incidentId,
      mode: state.mode,
    }).then(entry => get().addAuditEntry(entry))
    set(s => ({
      operationalEvents: pushOperationalEvent(
        s.operationalEvents,
        createOperationalEvent('recovery_progress', `Incydent CONTAINED · ${incident.title}`, 'info'),
      ),
    }))
    get().pulseEventHeartbeat()
    get().refreshNationalOverview()
  },

  handoverIncident: (incidentId, toShift, summary) => {
    const state = get()
    const incident = state.incidents.find(i => i.id === incidentId)
    if (!incident) return
    const operator = state.operator?.name ?? 'OPERATOR'
    get().updateIncident(incidentId, {
      notes: buildHandoverNote({ fromOperator: operator, toShift, summary, incident }),
    })
    void logAction({
      operator,
      action: 'incident_handover',
      details: `Przekazanie zmiany → ${toShift}: ${summary}`,
      incidentId,
      mode: state.mode,
    }).then(entry => get().addAuditEntry(entry))
    set(s => ({
      operationalEvents: pushOperationalEvent(
        s.operationalEvents,
        createOperationalEvent('telemetry_pulse', `Handover ${operator} → ${toShift}`, 'info'),
      ),
    }))
    get().pulseEventHeartbeat()
  },

  resolveIncident: (incidentId, summary) => {
    const state = get()
    const incident = state.incidents.find(i => i.id === incidentId)
    if (!incident) return

    const gate = canCloseIncident({
      incident,
      containmentResult: state.containmentResult,
      containmentRecovery: state.containmentRecovery,
    })
    if (!gate.ok) return

    const operator = state.operator?.name ?? 'OPERATOR'
    get().updateIncident(incidentId, {
      status: 'resolved',
      resolvedAt: new Date(),
      notes: buildClosureNote({ incident, operator, mode: 'resolved', summary }),
    })

    const relatedAlerts = findAlertsBoundToIncident(incident, state.alerts)
    for (const alert of relatedAlerts) {
      get().updateAlert(alert.id, { status: 'resolved', resolvedAt: new Date(), incidentId: incident.id })
    }

    const resolvedRecs = state.recommendations.map(r =>
      r.incidentId === incidentId
        ? { ...r, actions: r.actions.map(a => ({ ...a, approved: false, executionState: 'reverted' as const })) }
        : r,
    )

    void logAction({
      operator,
      action: 'incident_resolve',
      details: `Zamknięto incydent: ${incident.title}. ${summary}`,
      incidentId,
      mode: state.mode,
    }).then(entry => get().addAuditEntry(entry))

    for (const rec of resolvedRecs) {
      if (rec.incidentId === incidentId) void saveRecommendation(rec).catch(() => {})
    }

    if (state.activeScenarioRun) {
      get().setActiveScenarioRun({
        ...state.activeScenarioRun,
        status: 'completed',
        endedAt: new Date(),
      })
    }

    get().resetObjectStatuses()
    set({
      recommendations: resolvedRecs,
      cascadeResult: null,
      containmentResult: null,
      containmentRecovery: null,
      cascadeReplayFrames: [],
      cascadeReplayIndex: 0,
      activeCascadeView: null,
      activeIncidentId: null,
      incidentMapFilter: null,
      selectedNodeForContainment: null,
      graphComputeState: {
        active: false,
        algorithm: null,
        visitedNodes: 0,
        totalNodes: 0,
        iterationMs: 0,
        label: 'NOMINAL',
      },
      operationalEvents: pushOperationalEvent(
        get().operationalEvents,
        createOperationalEvent('integrity_check', `Incydent RESOLVED · ${incident.title}`, 'info'),
      ),
      activeView: 'dashboard',
    })
    get().refreshNationalOverview()
    get().pulseEventHeartbeat()
  },

  abortScenarioOperation: (summary = 'Operacja przerwana przez operatora') => {
    const state = get()
    const openIncident = state.incidents.find(i => i.status === 'open' || i.status === 'contained')
    const operator = state.operator?.name ?? 'OPERATOR'

    if (state.activeScenarioRun) {
      get().setActiveScenarioRun({
        ...state.activeScenarioRun,
        status: 'aborted',
        endedAt: new Date(),
      })
    }

    if (openIncident) {
      get().updateIncident(openIncident.id, {
        status: 'resolved',
        resolvedAt: new Date(),
        notes: buildClosureNote({
          incident: openIncident,
          operator,
          mode: 'resolved',
          summary: `[ABORT] ${summary}`,
        }),
      })
      const boundAlerts = findAlertsBoundToIncident(openIncident, state.alerts)
      for (const alert of boundAlerts) {
        get().updateAlert(alert.id, { status: 'resolved', resolvedAt: new Date(), incidentId: openIncident.id })
      }
    }

    void logAction({
      operator,
      action: 'scenario_abort',
      details: summary,
      incidentId: openIncident?.id,
      mode: state.mode,
    }).then(entry => get().addAuditEntry(entry))
    get().resetObjectStatuses()
    set({
      cascadeResult: null,
      containmentResult: null,
      containmentRecovery: null,
      cascadeReplayFrames: [],
      activeIncidentId: null,
      incidentMapFilter: null,
      activeView: 'incidents',
    })
    get().refreshNationalOverview()
  },

  activeScenarioRun: null,
  setActiveScenarioRun: (run) => {
    set({ activeScenarioRun: run })
    if (run) void saveScenarioRun(run).catch(() => {})
  },
  cascadeResult: null,
  setCascadeResult: (result) => {
    set({
      cascadeResult: result,
      activeCascadeView: result,
      cascadeReplayFrames: result ? buildCascadeReplayFrames(result) : [],
      cascadeReplayIndex: result ? buildCascadeReplayFrames(result).length - 1 : 0,
    })
    if (result) {
      void logAction({
        operator: get().operator?.name ?? 'SYSTEM',
        action: 'cascade_generated',
        details: `Kaskada wygenerowana: ${result.affectedCount} węzłów, impact ${result.totalImpactScore.toFixed(1)}, hash ${result.deterministicSignature ?? 'n/a'}`,
        affectedObject: result.incidentObjectId,
        incidentId: get().activeIncidentId ?? undefined,
        mode: get().mode,
      }).then(entry => {
        set(s => ({ auditEntries: [entry, ...s.auditEntries] }))
        void saveAuditEntry(entry).catch(() => {})
      })
    }
  },

  recommendations: [],
  addRecommendation: (rec) => {
    set(state => ({ recommendations: [rec, ...state.recommendations] }))
    void saveRecommendation(rec).catch(() => {})
  },
  approveAction: async (recId, actionId) => {
    const state = get()
    const rec = state.recommendations.find(r => r.id === recId)
    const action = rec?.actions.find(a => a.id === actionId)
    if (!rec || !action) return

    const operator = state.operator?.name ?? 'OPERATOR'
    const incident = state.incidents.find(i => i.id === rec.incidentId || i.id === state.activeIncidentId) ?? null

    const approvalEntry = await createApprovalAuditEntry({
      operator,
      recommendation: rec,
      action,
      incidentId: incident?.id,
      mode: state.mode,
    })

    const queuedRec = {
      ...rec,
      actions: rec.actions.map(a =>
        a.id === actionId ? markActionState(a, 'queued', operator) : a,
      ),
      approvedBy: operator,
      approvedAt: new Date(),
    }

    set(s => ({
      recommendations: s.recommendations.map(r => (r.id === recId ? queuedRec : r)),
      auditEntries: [approvalEntry, ...s.auditEntries],
    }))
    void saveRecommendation(queuedRec).catch(() => {})
    void saveAuditEntry(approvalEntry).catch(() => {})

    const outcome = await buildExecutionOutcome({
      recommendation: rec,
      action,
      incident,
      ikObjects: state.ikObjects,
      cascadeResult: state.cascadeResult,
      operator,
      mode: state.mode,
    })

    const executedRec = {
      ...queuedRec,
      actions: queuedRec.actions.map(a =>
        a.id === actionId
          ? markActionState(a, outcome.execution.state === 'executed' ? 'executed' : 'failed', operator)
          : a,
      ),
    }

    const execEntry = await createExecutionAuditEntry({
      operator,
      details: outcome.auditDetails,
      incidentId: incident?.id,
      mode: state.mode,
    })

    set(s => {
      let ikObjects = applyIkStatusPatches(s.ikObjects, outcome.objectStatusUpdates)
      for (const upd of outcome.objectStatusUpdates) {
        const updated = ikObjects.find(o => o.id === upd.id)
        if (updated) void saveIkObjectState({ id: updated.id, status: updated.status, coordinates: updated.coordinates }).catch(() => {})
      }

      let incidents = s.incidents
      if (incident && outcome.incidentPatch) {
        incidents = incidents.map(i => (i.id === incident.id ? { ...i, ...outcome.incidentPatch! } : i))
        const updated = incidents.find(i => i.id === incident.id)
        if (updated) void saveIncident(updated).catch(() => {})
      }

      const cascadeResult = outcome.cascadeResult ?? s.cascadeResult
      let containmentResult = outcome.containmentResult ?? s.containmentResult
      let cascadeReplayFrames = s.cascadeReplayFrames
      let cascadeReplayIndex = s.cascadeReplayIndex
      let containmentRecovery = s.containmentRecovery
      let graphComputeState = s.graphComputeState
      let operationalEvents = pushOperationalEvent(
        s.operationalEvents,
        createOperationalEvent('action_executed', outcome.auditDetails, outcome.execution.state === 'executed' ? 'info' : 'warning'),
      )

      if (cascadeResult && outcome.containmentResult) {
        const commit = commitCascadeState({
          cascadeResult: s.cascadeResult ?? cascadeResult,
          containmentResult: outcome.containmentResult,
          incident: incident ?? undefined,
          startRecovery: outcome.startRecovery,
          eventMessage: outcome.auditDetails,
        })
        containmentResult = commit.containmentResult
        cascadeReplayFrames = commit.cascadeReplayFrames
        cascadeReplayIndex = commit.cascadeReplayIndex
        containmentRecovery = commit.recovery
        graphComputeState = commit.graphCompute
        operationalEvents = commit.operationalEvents.reduce(
          (acc, ev) => pushOperationalEvent(acc, ev),
          operationalEvents,
        )
        if (commit.incidentPatch && incident) {
          incidents = incidents.map(i => (i.id === incident.id ? { ...i, ...commit.incidentPatch! } : i))
        }
      } else if (cascadeResult) {
        cascadeReplayFrames = buildCascadeReplayFrames(cascadeResult)
        cascadeReplayIndex = cascadeReplayFrames.length - 1
      }

      return {
        recommendations: s.recommendations.map(r => (r.id === recId ? executedRec : r)),
        auditEntries: [execEntry, ...s.auditEntries],
        ikObjects,
        incidents,
        cascadeResult,
        containmentResult,
        cascadeReplayFrames,
        cascadeReplayIndex,
        activeCascadeView: cascadeResult,
        containmentRecovery,
        graphComputeState,
        operationalEvents,
        operationalPulse: s.operationalPulse ? {
          ...s.operationalPulse,
          propagationPressure: cascadeResult
            ? Math.min(100, Math.round(cascadeResult.totalImpactScore * 0.65 + cascadeResult.criticalCount * 8))
            : 0,
        } : s.operationalPulse,
      }
    })

    void saveRecommendation(executedRec).catch(() => {})
    void saveAuditEntry(execEntry).catch(() => {})
    get().refreshNationalOverview()
    get().pulseEventHeartbeat()
    get().startCascadeReplay()
  },

  rejectAction: (recId) => {
    const state = get()
    const rec = state.recommendations.find(r => r.id === recId)
    if (!rec) return
    void logAction({
      operator: state.operator?.name ?? 'OPERATOR',
      action: 'recommendation_reject',
      details: `Odrzucono rekomendację: ${rec.summary}`,
      incidentId: rec.incidentId,
      mode: state.mode,
    }).then(entry => {
      const updated = {
        ...rec,
        actions: rec.actions.map(a => ({ ...a, executionState: 'reverted' as const, approved: false })),
      }
      set(s => ({
        recommendations: s.recommendations.map(r => (r.id === recId ? updated : r)),
        auditEntries: [entry, ...s.auditEntries],
      }))
      void saveRecommendation(updated).catch(() => {})
      void saveAuditEntry(entry).catch(() => {})
    })
  },

  cascadeReplayFrames: [],
  cascadeReplayIndex: 0,
  setCascadeReplayIndex: (index) => set({ cascadeReplayIndex: index }),
  startCascadeReplay: () => {
    const { cascadeResult } = get()
    if (!cascadeResult) return
    const frames = buildCascadeReplayFrames(cascadeResult)
    set({ cascadeReplayFrames: frames, cascadeReplayIndex: 0, activeCascadeView: cascadeResult })
  },
  containmentResult: null,
  simulateContainmentAt: (nodeIds) => {
    const { ikObjects, cascadeResult, incidents, activeIncidentId } = get()
    if (!cascadeResult || nodeIds.length === 0) return
    const result = simulateContainment(ikObjects, cascadeResult, nodeIds)
    const incident = incidents.find(i => i.id === activeIncidentId || i.status === 'open')
    const commit = commitCascadeState({
      cascadeResult,
      containmentResult: result,
      incident: incident ?? undefined,
      startRecovery: true,
    })

    set(s => ({
      containmentResult: commit.containmentResult,
      cascadeResult: commit.cascadeResult,
      activeCascadeView: commit.activeCascadeView,
      cascadeReplayFrames: commit.cascadeReplayFrames,
      cascadeReplayIndex: commit.cascadeReplayIndex,
      containmentRecovery: commit.recovery,
      graphComputeState: commit.graphCompute,
      incidents: incident && commit.incidentPatch
        ? s.incidents.map(i => (i.id === incident.id ? { ...i, ...commit.incidentPatch! } : i))
        : s.incidents,
      operationalEvents: commit.operationalEvents.reduce(
        (acc, ev) => pushOperationalEvent(acc, ev),
        s.operationalEvents,
      ),
    }))

    void logAction({
      operator: get().operator?.name ?? 'OPERATOR',
      action: 'containment_executed',
      details: `Containment: ${result.beforeAffectedCount}→${result.afterAffectedCount} węzłów, impact ${result.beforeImpact.toFixed(1)}→${result.afterImpact.toFixed(1)}, prevented: ${result.preventedNodeIds.join(', ') || 'none'}`,
      incidentId: incident?.id,
      mode: get().mode,
    }).then(entry => get().addAuditEntry(entry))
    get().refreshNationalOverview()
    get().startCascadeReplay()
  },
  clearContainment: () => {
    const { containmentResult } = get()
    if (!containmentResult) return
    set({
      containmentResult: null,
      cascadeResult: containmentResult.baseline,
      activeCascadeView: containmentResult.baseline,
      cascadeReplayFrames: buildCascadeReplayFrames(containmentResult.baseline),
    })
  },
  activeCascadeView: null,
  selectedNodeForContainment: null,
  setSelectedNodeForContainment: (id) => set({ selectedNodeForContainment: id }),

  operationalEvents: [],
  operationalPulse: null,
  operationalTelemetry: createInitialTelemetry(),
  graphComputeState: {
    active: false,
    algorithm: null,
    visitedNodes: 0,
    totalNodes: 0,
    iterationMs: 0,
    label: 'NOMINAL',
  },
  containmentRecovery: null,
  threatSignals: [] as ThreatSignal[],
  lastThreatScanAt: null as Date | null,
  runThreatScan: async () => {
    const state = get()
    const signals = await scanThreats({
      ikObjects: state.ikObjects,
      cascadeResult: state.cascadeResult,
      activeScenarioRun: state.activeScenarioRun,
    })
    const newAlerts: Alert[] = []
    for (const sig of signals) {
      if (sig.status === 'clear') continue
      const alert = threatSignalToAlert(sig)
      if (!alert) continue
      const duplicate = state.alerts.some(
        a => a.autoDetected && a.threatCategory === sig.category && a.status !== 'resolved',
      )
      if (!duplicate) newAlerts.push(alert)
    }
    set({
      threatSignals: signals,
      lastThreatScanAt: new Date(),
      ...(newAlerts.length > 0 ? { alerts: [...newAlerts, ...state.alerts] } : {}),
    })
  },
  runOperationalHeartbeat: async () => {
    const state = get()
    const { pulse, events } = await probeOperationalPulse({
      publicDataSources: state.publicDataSources,
      cascadeResult: state.cascadeResult,
      online: state.online,
    })
    set(s => ({
      operationalPulse: {
        ...pulse,
        eventRatePerMin: s.operationalTelemetry.throughputEps,
        graphComputeMs: s.graphComputeState.iterationMs,
        activeSyncJobs: pulse.syncQueuePressure > 0 ? 1 : 0,
      },
      operationalEvents: events.reduce(
        (acc, ev) => pushOperationalEvent(acc, ev),
        s.operationalEvents,
      ),
      eventHeartbeatAt: new Date(),
    }))
    await get().runThreatScan()
  },
  tickOperationalTelemetry: () => {
    const state = get()
    const tick = tickOperationalTelemetry({
      telemetry: state.operationalTelemetry,
      publicDataSources: state.publicDataSources,
      cascadeResult: state.cascadeResult,
      online: state.online,
      recovery: state.containmentRecovery,
    })

    let ikObjects = state.ikObjects
    let containmentRecovery = state.containmentRecovery
    let operationalEvents = tick.events.reduce(
      (acc, ev) => pushOperationalEvent(acc, ev),
      state.operationalEvents,
    )

    if (state.containmentRecovery?.active) {
      const recoveryTick = tickContainmentRecovery({
        recovery: state.containmentRecovery,
        ikObjects,
      })
      containmentRecovery = recoveryTick.recovery
      ikObjects = applyIkStatusPatches(ikObjects, recoveryTick.ikPatches)
      operationalEvents = recoveryTick.events.reduce(
        (acc, ev) => pushOperationalEvent(acc, ev),
        operationalEvents,
      )
      for (const patch of recoveryTick.ikPatches) {
        const updated = ikObjects.find(o => o.id === patch.id)
        if (updated) void saveIkObjectState({ id: updated.id, status: updated.status, coordinates: updated.coordinates }).catch(() => {})
      }
      if (recoveryTick.done) {
        get().refreshNationalOverview()
      }
    }

    const graphComputeState = buildGraphComputeState({
      cascadeResult: state.cascadeResult,
      replayIndex: state.cascadeReplayIndex,
      replayFrameCount: state.cascadeReplayFrames.length,
      simRunning: state.graphComputeState.active,
      containmentActive: !!state.containmentRecovery?.active,
    })

    set({
      operationalTelemetry: tick.telemetry,
      containmentRecovery,
      ikObjects,
      operationalEvents,
      graphComputeState,
      operationalPulse: state.operationalPulse ? {
        ...state.operationalPulse,
        eventRatePerMin: tick.telemetry.throughputEps,
        graphComputeMs: graphComputeState.iterationMs,
      } : state.operationalPulse,
    })
  },
  updateGraphComputeState: (simRunning = false) => {
    const state = get()
    set({
      graphComputeState: buildGraphComputeState({
        cascadeResult: state.cascadeResult,
        replayIndex: state.cascadeReplayIndex,
        replayFrameCount: state.cascadeReplayFrames.length,
        simRunning,
        containmentActive: !!state.containmentRecovery?.active,
      }),
    })
  },

  nationalRegions: [],
  refreshNationalOverview: () => {
    const state = get()
    set({
      nationalRegions: buildNationalOverview({
        ikObjects: state.ikObjects,
        incidents: state.incidents,
        publicDataSources: state.publicDataSources,
      }),
    })
  },

  drones: DRONE_FLEET,
  updateDrone: (id, patch) =>
    set(state => ({
      drones: state.drones.map(d => (d.id === id ? { ...d, ...patch } : d)),
    })),
  missions: [],
  addMission: (mission) => {
    set(state => ({ missions: [mission, ...state.missions] }))
    void saveMission(mission).catch(() => {})
  },
  updateMission: (id, patch) => {
    set(state => {
      const missions = state.missions.map(m => (m.id === id ? { ...m, ...patch } : m))
      const updated = missions.find(m => m.id === id)
      if (updated) void saveMission(updated).catch(() => {})
      return { missions }
    })
  },
  tickActiveMissions: () =>
    set(state => {
      let missions = [...state.missions]
      let drones = [...state.drones]
      let changed = false

      for (const mission of missions) {
        if (mission.status === 'completed') continue
        const droneIndex = drones.findIndex(d => d.id === mission.droneId)
        if (droneIndex === -1) continue

        const target = state.ikObjects.find(o => o.id === mission.targetObjectId)
        const { mission: nextMission, drone: dronePatch } = tickMissionState(mission, drones[droneIndex], target)

        const missionChanged =
          nextMission.status !== mission.status ||
          nextMission.progressPercent !== mission.progressPercent ||
          nextMission.onSiteTicks !== mission.onSiteTicks ||
          nextMission.currentActivityIndex !== mission.currentActivityIndex ||
          nextMission.activityLabel !== mission.activityLabel ||
          nextMission.activityProgress !== mission.activityProgress ||
          (nextMission.findings?.length ?? 0) !== (mission.findings?.length ?? 0) ||
          nextMission.result !== mission.result

        if (missionChanged) {
          missions = missions.map(m => (m.id === mission.id ? nextMission : m))
          void saveMission(nextMission).catch(() => {})
          changed = true
        }

        const droneUpdate: Partial<typeof drones[number]> = {
          ...(dronePatch ?? {}),
          mission: nextMission.status === 'completed' ? undefined : nextMission,
        }

        if (dronePatch || missionChanged) {
          drones[droneIndex] = { ...drones[droneIndex], ...droneUpdate }
          changed = true
        }
      }

      return changed ? { missions, drones } : state
    }),

  auditEntries: [],
  addAuditEntry: (entry) => {
    set(state => ({ auditEntries: [entry, ...state.auditEntries] }))
    void saveAuditEntry(entry).catch(() => {})
  },

  systemHealth: getSystemHealth(navigator.onLine, 'live'),
  refreshSystemHealth: async () => {
    const state = get()
    const base = await buildSystemHealth(state.online, state.mode)

    if (state.mode !== 'live' || !state.online) {
      set({ systemHealth: base })
      return
    }

    try {
      const orchestration = await orchestratePublicDataSync({
        online: state.online,
        mode: state.mode,
      })
      set(s => ({
        systemHealth: {
          ...base,
          publicDataSyncStatus: orchestration.publicDataSyncStatus,
          satelliteCacheStatus: orchestration.satelliteCacheStatus,
          satelliteCacheAge: orchestration.satelliteCacheAge,
          lastSync: new Date(),
        },
        publicDataSources: orchestration.publicDataSources,
        operationalEvents: orchestration.events.reduce(
          (acc, ev) => pushOperationalEvent(acc, ev),
          s.operationalEvents,
        ),
      }))
      get().refreshNationalOverview()
    } catch {
      set({ systemHealth: base })
    }
  },

  sidebarExpanded: true,
  setSidebarExpanded: (val) => set({ sidebarExpanded: val }),
  activeView: 'dashboard',
  setActiveView: (view) => set({ activeView: view }),
  activeIncidentId: null,
  setActiveIncidentId: (id) => set({ activeIncidentId: id }),
  openIncidentCommand: (incidentId) => {
    const state = get()
    const id = incidentId ?? state.activeIncidentId ?? state.incidents.find(i => i.status === 'open')?.id ?? null
    const incident = id ? state.incidents.find(i => i.id === id) : null
    set({
      activeIncidentId: id,
      activeView: 'incident-command',
      incidentMapFilter: incident?.affectedObjectIds ?? state.cascadeResult
        ? [state.cascadeResult!.incidentObjectId, ...state.cascadeResult!.nodes.map(n => n.objectId)]
        : null,
      cascadeResult: state.cascadeResult,
    })
    if (incident && !state.cascadeResult) {
      get().restoreIncidentContext(incident.id)
    }
  },
  incidentMapFilter: null,
  setIncidentMapFilter: (ids) => set({ incidentMapFilter: ids }),
  publicDataSources: getPublicDataSources(navigator.onLine),
  refreshPublicDataSources: () => {
    set({ publicDataSources: getPublicDataSources(get().online) })
    get().refreshNationalOverview()
  },
  eventHeartbeatAt: new Date(),
  pulseEventHeartbeat: () => set({ eventHeartbeatAt: new Date() }),
  focusedIkObjectId: null,
  setFocusedIkObjectId: (id) => set({ focusedIkObjectId: id }),
  openIkObjectOnMap: (id) => set({ focusedIkObjectId: id, activeView: 'map' }),
  openIkObjectOnGraph: (id) => set({ focusedIkObjectId: id, activeView: 'graph' }),
  openIkObjectAlerts: (id) => set({ focusedIkObjectId: id, activeView: 'alerts' }),
  openScenarios: () => set({ activeView: 'incidents' }),
  focusedDroneMissionId: null,
  setFocusedDroneMissionId: (id) => set({ focusedDroneMissionId: id }),
  openDroneMissionOnMap: (missionId) => set({ focusedDroneMissionId: missionId, activeView: 'map' }),

  hydrateDatabase: (data) => {
    const normalized = normalizeHydratedSession(data)
    const ikObjects = buildNominalIkObjects(IK_OBJECTS, normalized.data.ikStates)

    set(state => ({
      auditEntries: normalized.data.auditEntries.length > 0 ? normalized.data.auditEntries : state.auditEntries,
      alerts: normalized.data.alerts,
      incidents: normalized.data.incidents,
      missions: normalized.shouldClearRuntime
        ? state.missions.map(m => (m.status === 'completed' ? m : { ...m, status: 'completed' as const }))
        : normalized.data.missions.length > 0 ? normalized.data.missions : state.missions,
      recommendations: normalized.shouldClearRuntime ? [] : normalized.data.recommendations,
      ikObjects,
      ...(normalized.shouldClearRuntime ? runtimeClearPatch() : {}),
    }))

    if (normalized.shouldClearRuntime) {
      for (const obj of ikObjects) {
        void saveIkObjectState({ id: obj.id, status: obj.status, coordinates: obj.coordinates }).catch(() => {})
      }
      for (const alert of normalized.data.alerts) {
        const prev = data.alerts.find(a => a.id === alert.id)
        if (prev && prev.status !== alert.status) {
          void saveAlert(alert).catch(() => {})
        }
      }
    } else if (normalized.activeIncident) {
      set({ activeIncidentId: normalized.activeIncident.id })
      if (!get().cascadeResult) {
        get().restoreIncidentContext(normalized.activeIncident.id)
      }
    }
  },
}))
