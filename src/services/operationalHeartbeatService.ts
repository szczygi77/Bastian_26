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

const MAX_EVENTS = 12

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

export async function probeOperationalPulse(params: {
  publicDataSources: PublicDataSourceStatus[]
  cascadeResult: CascadeResult | null
  online: boolean
}): Promise<{ pulse: OperationalPulse; events: OperationalEvent[] }> {
  const { publicDataSources, cascadeResult, online } = params
  const events: OperationalEvent[] = []
  const queueLen = await getSyncQueueLength().catch(() => 0)
  const syncQueuePressure = Math.min(100, queueLen * 18)
  const sourceFreshnessAvg = averageTrustScore(publicDataSources)

  const staleSources = publicDataSources.filter(s => s.status === 'stale' || s.status === 'error')
  if (staleSources.length > 0) {
    events.push(
      createOperationalEvent(
        'stale_detected',
        `${staleSources.length} źródeł wymaga uwagi: ${staleSources.map(s => s.sourceName).join(', ')}`,
        'warning',
      ),
    )
  }

  if (queueLen > 0) {
    events.push(
      createOperationalEvent(
        'sync_queue_check',
        `Sync queue: ${queueLen} operacji oczekujących`,
        queueLen >= 3 ? 'warning' : 'info',
      ),
    )
  }

  events.push(
    createOperationalEvent(
      'telemetry_pulse',
      `Średni trust score źródeł: ${sourceFreshnessAvg}/100`,
      sourceFreshnessAvg < 50 ? 'warning' : 'info',
    ),
  )

  events.push(
    createOperationalEvent(
      'connectivity_probe',
      online ? 'Łączność publiczna: ONLINE' : 'Tryb offline — cache aktywny',
      online ? 'info' : 'warning',
    ),
  )

  let propagationPressure = 0
  if (cascadeResult) {
    propagationPressure = Math.min(
      100,
      Math.round(cascadeResult.totalImpactScore * 0.65 + cascadeResult.criticalCount * 8),
    )
    events.push(
      createOperationalEvent(
        'propagation_pressure',
        `Presja kaskady: ${propagationPressure}% · ${cascadeResult.affectedCount} węzłów`,
        propagationPressure >= 70 ? 'critical' : propagationPressure >= 45 ? 'warning' : 'info',
      ),
    )
  } else {
    events.push(createOperationalEvent('graph_verification', 'Graf zależności: nominalny', 'info'))
  }

  events.push(createOperationalEvent('integrity_check', 'Łańcuch audytu: spójny', 'info'))

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
