import { refreshPublicDataLayer } from '@/services/dataSyncService'
import { getPublicDataSources } from '@/services/publicDataStatusService'
import { createOperationalEvent } from '@/services/operationalHeartbeatService'
import type { OperationalEvent, PublicDataSourceStatus, SystemHealth } from '@/types'

const MAX_RETRIES = 2
const RETRY_DELAY_MS = 650

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export interface ApiOrchestrationResult {
  publicDataSyncStatus: SystemHealth['publicDataSyncStatus']
  satelliteCacheStatus: SystemHealth['satelliteCacheStatus']
  satelliteCacheAge: number
  publicDataSources: PublicDataSourceStatus[]
  events: OperationalEvent[]
  totalLatencyMs: number
  partialFailure: boolean
}

export async function orchestratePublicDataSync(params: {
  online: boolean
  mode: string
}): Promise<ApiOrchestrationResult> {
  const started = performance.now()
  const events: OperationalEvent[] = []
  let lastError: unknown = null

  if (params.mode !== 'live' || !params.online) {
    const sources = getPublicDataSources(false)
    events.push(createOperationalEvent(
      'source_degraded',
      'Tryb offline/symulacja — publiczne API w stanie cache-only',
      'warning',
    ))
    return {
      publicDataSyncStatus: {
        weather: { status: 'offline', lastSync: null, dataAge: 999 },
        firms: { status: 'offline', lastSync: null, dataAge: 999 },
        opensky: { status: 'offline', lastSync: null, dataAge: 999 },
        osm: { status: 'offline', lastSync: null, dataAge: 999 },
        sentinel: { status: 'offline', lastSync: null, dataAge: 999 },
      },
      satelliteCacheStatus: 'stale',
      satelliteCacheAge: 48,
      publicDataSources: sources,
      events,
      totalLatencyMs: 0,
      partialFailure: true,
    }
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      events.push(createOperationalEvent(
        'source_refresh',
        attempt === 0 ? 'Orchestracja sync public API…' : `Retry sync public API (${attempt}/${MAX_RETRIES})`,
        attempt > 0 ? 'warning' : 'info',
      ))

      const sync = await refreshPublicDataLayer()
      const sources = getPublicDataSources(true)

      events.push(createOperationalEvent(
        'cache_validation',
        `Walidacja cache: ${sources.filter(s => s.status === 'live' || s.status === 'cached').length}/${sources.length} źródeł OK`,
        'info',
      ))

      const stale = sources.filter(s => s.status === 'stale' || s.status === 'error' || s.status === 'missing_key')
      if (stale.length > 0) {
        events.push(createOperationalEvent(
          'source_degraded',
          `${stale.length} źródeł w stanie obniżonym: ${stale.map(s => s.sourceId).join(', ')}`,
          'warning',
        ))
      }

      return {
        ...sync,
        publicDataSources: sources,
        events,
        totalLatencyMs: Math.round(performance.now() - started),
        partialFailure: stale.length > 0,
      }
    } catch (error) {
      lastError = error
      if (attempt < MAX_RETRIES) await delay(RETRY_DELAY_MS)
    }
  }

  const sources = getPublicDataSources(false)
  events.push(createOperationalEvent(
    'source_degraded',
    `Sync public API failed: ${lastError instanceof Error ? lastError.message : 'unknown error'}`,
    'critical',
  ))

  return {
    publicDataSyncStatus: {
      weather: { status: 'error', lastSync: null, dataAge: 999 },
      firms: { status: 'error', lastSync: null, dataAge: 999 },
      opensky: { status: 'error', lastSync: null, dataAge: 999 },
      osm: { status: 'error', lastSync: null, dataAge: 999 },
      sentinel: { status: 'error', lastSync: null, dataAge: 999 },
    },
    satelliteCacheStatus: 'stale',
    satelliteCacheAge: 72,
    publicDataSources: sources,
    events,
    totalLatencyMs: Math.round(performance.now() - started),
    partialFailure: true,
  }
}
