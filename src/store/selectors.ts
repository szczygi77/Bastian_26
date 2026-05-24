import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/useAppStore'
import type { AppState } from '@/store/types'

export function useGraphState() {
  return useAppStore(
    useShallow(s => ({
      ikObjects: s.ikObjects,
      cascadeResult: s.cascadeResult,
      cascadeReplayFrames: s.cascadeReplayFrames,
      cascadeReplayIndex: s.cascadeReplayIndex,
      containmentResult: s.containmentResult,
      containmentRecovery: s.containmentRecovery,
      selectedNodeForContainment: s.selectedNodeForContainment,
      focusedIkObjectId: s.focusedIkObjectId,
      setFocusedIkObjectId: s.setFocusedIkObjectId,
      setSelectedNodeForContainment: s.setSelectedNodeForContainment,
      updateGraphComputeState: s.updateGraphComputeState,
    })),
  )
}

export function useIncidentState() {
  return useAppStore(
    useShallow(s => ({
      incidents: s.incidents,
      activeIncidentId: s.activeIncidentId,
      activeScenarioRun: s.activeScenarioRun,
      cascadeResult: s.cascadeResult,
      containmentResult: s.containmentResult,
      recommendations: s.recommendations,
      alerts: s.alerts,
      restoreIncidentContext: s.restoreIncidentContext,
      openIncidentCommand: s.openIncidentCommand,
    })),
  )
}

export function usePublicDataState() {
  return useAppStore(
    useShallow(s => ({
      publicDataSources: s.publicDataSources,
      online: s.online,
      refreshPublicDataSources: s.refreshPublicDataSources,
      refreshSystemHealth: s.refreshSystemHealth,
    })),
  )
}

export function useOperationalState() {
  return useAppStore(
    useShallow(s => ({
      operationalEvents: s.operationalEvents,
      operationalPulse: s.operationalPulse,
      operationalTelemetry: s.operationalTelemetry,
      graphComputeState: s.graphComputeState,
      eventHeartbeatAt: s.eventHeartbeatAt,
    })),
  )
}

export function useUiState() {
  return useAppStore(
    useShallow(s => ({
      sidebarExpanded: s.sidebarExpanded,
      setSidebarExpanded: s.setSidebarExpanded,
      activeView: s.activeView,
      setActiveView: s.setActiveView,
      incidentMapFilter: s.incidentMapFilter,
      setIncidentMapFilter: s.setIncidentMapFilter,
    })),
  )
}

export function useAuditState() {
  return useAppStore(
    useShallow(s => ({
      auditEntries: s.auditEntries,
      addAuditEntry: s.addAuditEntry,
      mode: s.mode,
      operator: s.operator,
    })),
  )
}

export function useSkyMarshalState() {
  return useAppStore(
    useShallow(s => ({
      drones: s.drones,
      missions: s.missions,
      updateDrone: s.updateDrone,
      addMission: s.addMission,
      updateMission: s.updateMission,
      tickActiveMissions: s.tickActiveMissions,
      focusedDroneMissionId: s.focusedDroneMissionId,
      setFocusedDroneMissionId: s.setFocusedDroneMissionId,
    })),
  )
}

export function useSystemState() {
  return useAppStore(
    useShallow(s => ({
      mode: s.mode,
      setMode: s.setMode,
      online: s.online,
      systemHealth: s.systemHealth,
      nationalRegions: s.nationalRegions,
      refreshNationalOverview: s.refreshNationalOverview,
    })),
  )
}

export function selectActiveIncident(state: AppState) {
  return state.incidents.find(
    i => i.id === state.activeIncidentId || i.status === 'open',
  ) ?? null
}
