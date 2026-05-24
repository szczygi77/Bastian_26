import { createOperationalEvent } from '@/services/operationalHeartbeatService'
import type {
  CascadeResult,
  ContainmentRecoveryState,
  ContainmentSimulationResult,
  GraphComputeState,
  IKObject,
  OperationalEvent,
  OperationalTelemetry,
  PublicDataSourceStatus,
} from '@/types'

export function createInitialTelemetry(): OperationalTelemetry {
  return {
    packetsProcessed: 0,
    edgePulsePhase: 0,
    mapScanPhase: 0,
    throughputEps: 0,
    lastTickAt: new Date(),
    stressLevel: 0,
  }
}

export function tickOperationalTelemetry(params: {
  telemetry: OperationalTelemetry
  publicDataSources: PublicDataSourceStatus[]
  cascadeResult: CascadeResult | null
  online: boolean
  recovery: ContainmentRecoveryState | null
}): {
  telemetry: OperationalTelemetry
  events: OperationalEvent[]
  stressLevel: number
} {
  const { telemetry, publicDataSources, cascadeResult, online, recovery } = params
  const events: OperationalEvent[] = []

  const staleCount = publicDataSources.filter(s =>
    s.status === 'stale' || s.status === 'error' || s.status === 'missing_key',
  ).length
  const cascadeStress = cascadeResult
    ? Math.min(100, Math.round(cascadeResult.totalImpactScore * 0.55 + cascadeResult.criticalCount * 6))
    : 0
  const offlineStress = online ? 0 : 18
  const recoveryRelief = recovery?.active ? -Math.round(recovery.progress * 0.35) : 0

  const stressLevel = Math.max(0, Math.min(100, staleCount * 8 + cascadeStress + offlineStress + recoveryRelief))

  const throughputEps = Math.round(
    12 + (cascadeResult ? cascadeResult.affectedCount * 1.4 : 0) + staleCount * 2 + (online ? 4 : 0),
  )

  const next: OperationalTelemetry = {
    packetsProcessed: telemetry.packetsProcessed + throughputEps,
    edgePulsePhase: (telemetry.edgePulsePhase + 0.08) % 1,
    mapScanPhase: (telemetry.mapScanPhase + 0.04) % 1,
    throughputEps,
    lastTickAt: new Date(),
    stressLevel,
  }

  if (stressLevel >= 55 && stressLevel > telemetry.stressLevel + 4) {
    events.push(createOperationalEvent(
      'stress_signal',
      `Presja operacyjna ${stressLevel}% — ${staleCount} źródeł obniżonych, kaskada ${cascadeResult?.affectedCount ?? 0} węzłów`,
      stressLevel >= 75 ? 'critical' : 'warning',
    ))
  }

  return { telemetry: next, events, stressLevel }
}

export function buildGraphComputeState(params: {
  cascadeResult: CascadeResult | null
  replayIndex: number
  replayFrameCount: number
  simRunning: boolean
  containmentActive: boolean
}): GraphComputeState {
  const { cascadeResult, replayIndex, replayFrameCount, simRunning, containmentActive } = params

  if (containmentActive) {
    return {
      active: true,
      algorithm: 'CONTAINMENT',
      visitedNodes: cascadeResult?.affectedCount ?? 0,
      totalNodes: cascadeResult?.nodes.length ?? 0,
      iterationMs: 42,
      label: 'CONTAINMENT RECOMPUTE',
    }
  }

  if (replayFrameCount > 1 && replayIndex < replayFrameCount - 1) {
    const frame = replayIndex + 1
    return {
      active: true,
      algorithm: 'BFS',
      visitedNodes: frame,
      totalNodes: replayFrameCount,
      iterationMs: 28 + frame * 4,
      label: `BFS TRAVERSAL T+${frame}`,
    }
  }

  if (simRunning) {
    return {
      active: true,
      algorithm: 'BFS',
      visitedNodes: cascadeResult?.affectedCount ?? 0,
      totalNodes: cascadeResult?.nodes.length ?? 0,
      iterationMs: 35,
      label: 'GRAPH COMPUTE',
    }
  }

  return {
    active: false,
    algorithm: null,
    visitedNodes: cascadeResult?.affectedCount ?? 0,
    totalNodes: cascadeResult?.nodes.length ?? 0,
    iterationMs: 0,
    label: 'NOMINAL',
  }
}

export function startContainmentRecovery(
  containment: ContainmentSimulationResult,
): ContainmentRecoveryState {
  return {
    active: true,
    progress: 0,
    threatReduction: containment.impactReduction,
    trustRecovery: 0,
    recoveringNodeIds: containment.preventedNodeIds.slice(0, 6),
    containedNodeIds: containment.containedNodeIds,
  }
}

export function tickContainmentRecovery(params: {
  recovery: ContainmentRecoveryState
  ikObjects: IKObject[]
}): {
  recovery: ContainmentRecoveryState
  ikPatches: Array<{ id: string; status: IKObject['status'] }>
  events: OperationalEvent[]
  done: boolean
} {
  const { recovery, ikObjects } = params
  if (!recovery.active) {
    return { recovery, ikPatches: [], events: [], done: true }
  }

  const progress = Math.min(100, recovery.progress + 14)
  const trustRecovery = Math.min(100, recovery.trustRecovery + 11)
  const events: OperationalEvent[] = []
  const ikPatches: Array<{ id: string; status: IKObject['status'] }> = []

  const recoverCount = Math.ceil((progress / 100) * recovery.recoveringNodeIds.length)
  for (const id of recovery.recoveringNodeIds.slice(0, recoverCount)) {
    const obj = ikObjects.find(o => o.id === id)
    if (obj && (obj.status === 'degraded' || obj.status === 'under_attack' || obj.status === 'offline')) {
      ikPatches.push({ id, status: 'operational' })
    }
  }

  if (progress >= 100) {
    events.push(createOperationalEvent(
      'recovery_progress',
      `Stabilizacja zakończona · trust +${trustRecovery}% · ${recovery.recoveringNodeIds.length} węzłów odzyskanych`,
      'info',
    ))
    return {
      recovery: { ...recovery, active: false, progress: 100, trustRecovery },
      ikPatches,
      events,
      done: true,
    }
  }

  events.push(createOperationalEvent(
    'recovery_progress',
    `Stabilizacja ${progress}% · redukcja zagrożenia -${recovery.threatReduction.toFixed(0)} impact`,
    'info',
  ))

  return {
    recovery: { ...recovery, progress, trustRecovery },
    ikPatches,
    events,
    done: false,
  }
}
