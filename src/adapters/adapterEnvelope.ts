import type { PublicSourceStatus } from '@/types'
import type { AdapterFetchMode } from '@/adapters/adapterState'

export interface AdapterEnvelope<T> {
  data: T
  status: PublicSourceStatus
  sourceName: string
  lastSync: Date | null
  latencyMs: number | null
  recordsFetched: number | null
  authMode: string
  cacheTTLMinutes: number
  errorMessage?: string
  isMock: boolean
  isStale: boolean
}

export function mapFetchModeToStatus(
  mode: AdapterFetchMode,
  online: boolean,
  dataAgeMinutes?: number,
  cacheTtlMinutes = 120,
): PublicSourceStatus {
  if (mode === 'missing_key') return 'missing_key'
  if (mode === 'mock') return 'mock'
  if (!online) return 'offline'
  if (mode === 'live') return 'live'
  if (mode === 'cached') {
    if (dataAgeMinutes != null && dataAgeMinutes > cacheTtlMinutes) return 'stale'
    return 'cached'
  }
  if (mode === 'error' || mode === 'empty') return 'error'
  return 'degraded'
}

export function buildAdapterEnvelope<T>(params: {
  data: T
  sourceName: string
  fetchMode: AdapterFetchMode
  online: boolean
  lastSync: Date | null
  latencyMs?: number | null
  recordsFetched?: number | null
  authMode?: string
  cacheTTLMinutes?: number
  errorMessage?: string
}): AdapterEnvelope<T> {
  const cacheTTLMinutes = params.cacheTTLMinutes ?? 120
  const dataAgeMinutes = params.lastSync
    ? Math.floor((Date.now() - params.lastSync.getTime()) / 60_000)
    : undefined
  const status = mapFetchModeToStatus(params.fetchMode, params.online, dataAgeMinutes, cacheTTLMinutes)

  return {
    data: params.data,
    status,
    sourceName: params.sourceName,
    lastSync: params.lastSync,
    latencyMs: params.latencyMs ?? null,
    recordsFetched: params.recordsFetched ?? null,
    authMode: params.authMode ?? 'public',
    cacheTTLMinutes,
    errorMessage: params.errorMessage,
    isMock: params.fetchMode === 'mock',
    isStale: status === 'stale',
  }
}
