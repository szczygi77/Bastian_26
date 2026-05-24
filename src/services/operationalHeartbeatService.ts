import { getSyncQueueLength } from '@/services/databaseService'
import { averageTrustScore } from '@/services/sourceTrustService'
import type {
  CascadeResult,
  OperationalEvent,
  OperationalEventType,
  OperationalPulse,
  PublicDataSourceStatus,
} from '@/types'
import { generateId } from '@/utils/format'

const MAX_EVENTS = 8
const MIN_PROBE_INTERVAL_MS = 18_000
let lastProbeAt = 0
let lastEventSignatures = new Set<string>()

export function createOperationalEvent(
  type: OperationalEventType,
  message: string,
  severity: OperationalEvent['severity'] = 'info',
): OperationalEvent {
  return {
    id: `op-${generateId()}`,
    type,
    message,
    severity,
    timestamp: new Date(),
  }
}

export function trimOperationalEvents(events: OperationalEvent[]): OperationalEvent[] {
  return events.slice(0, MAX_EVENTS)
}

export function pushOperationalEvent(
  events: OperationalEvent[],
  event: OperationalEvent,
): OperationalEvent[] {
  return trimOperationalEvents([event, ...events])
}

function shouldEmitEvent(type: OperationalEventType, message: string): boolean {
  const sig = `${type}:${message.slice(0, 80)}`
  if (lastEventSignatures.has(sig)) return false
  lastEventSignatures.add(sig)
  if (lastEventSignatures.size > 24) {
    lastEventSignatures = new Set([...lastEventSignatures].slice(-12))
  }
  return true
}

function pushUnique(events: OperationalEvent[], event: OperationalEvent): OperationalEvent[] {
  if (!shouldEmitEvent(event.type, event.message)) return events
  return pushOperationalEvent(events, event)
}

export async function probeOperationalPulse(params: {
  publicDataSources: PublicDataSourceStatus[]
  cascadeResult: CascadeResult | null
  online: boolean
  force?: boolean
}): Promise<{ pulse: OperationalPulse; events: OperationalEvent[] }> {
  const now = Date.now()
  if (!params.force && now - lastProbeAt < MIN_PROBE_INTERVAL_MS) {
    const queueLen = await getSyncQueueLength().catch(() => 0)
    const sourceFreshnessAvg = averageTrustScore(params.publicDataSources)
    return {
      pulse: {
        syncQueuePressure: Math.min(100, queueLen * 18),
        propagationPressure: params.cascadeResult
          ? Math.min(100, Math.round(params.cascadeResult.totalImpactScore * 0.65 + params.cascadeResult.criticalCount * 8))
          : 0,
        sourceFreshnessAvg,
        integrityOk: sourceFreshnessAvg >= 40,
        lastProbeAt: new Date(lastProbeAt),
      },
      events: [],
    }
  }
  lastProbeAt = now

  const { publicDataSources, cascadeResult, online } = params
  let events: OperationalEvent[] = []
  const queueLen = await getSyncQueueLength().catch(() => 0)
  const syncQueuePressure = Math.min(100, queueLen * 18)
  const sourceFreshnessAvg = averageTrustScore(publicDataSources)

  const staleSources = publicDataSources.filter(
    s => s.status === 'stale' || s.status === 'error' || s.status === 'missing_key',
  )
  if (staleSources.length > 0) {
    events = pushUnique(
      events,
      createOperationalEvent(
        'stale_detected',
        `${staleSources.length} źródeł wymaga uwagi: ${staleSources.map(s => s.sourceName).join(', ')}`,
        'warning',
      ),
    )
  }

  if (queueLen > 0) {
    events = pushUnique(
      events,
      createOperationalEvent(
        'sync_queue_check',
        `Sync queue: ${queueLen} operacji oczekujących`,
        queueLen >= 3 ? 'warning' : 'info',
      ),
    )
  }

  let propagationPressure = 0
  if (cascadeResult) {
    propagationPressure = Math.min(
      100,
      Math.round(cascadeResult.totalImpactScore * 0.65 + cascadeResult.criticalCount * 8),
    )
    events = pushUnique(
      events,
      createOperationalEvent(
        'propagation_pressure',
        `Presja kaskady: ${propagationPressure}% · ${cascadeResult.affectedCount} węzłów`,
        propagationPressure >= 70 ? 'critical' : propagationPressure >= 45 ? 'warning' : 'info',
      ),
    )
  }

  return {
    pulse: {
      syncQueuePressure,
      propagationPressure,
      sourceFreshnessAvg,
      integrityOk: staleSources.length === 0 && sourceFreshnessAvg >= 40,
      lastProbeAt: new Date(),
    },
    events,
  }
}

export function resetHeartbeatThrottle(): void {
  lastProbeAt = 0
  lastEventSignatures.clear()
}
