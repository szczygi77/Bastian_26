import type { PublicDataSourceStatus, PublicSourceStatus } from '@/types'

function resolveFallbackMode(status: PublicSourceStatus): PublicDataSourceStatus['fallbackMode'] {
  if (status === 'live') return 'none'
  if (status === 'cached' || status === 'stale') return 'cache'
  if (status === 'offline') return 'offline'
  if (status === 'mock') return 'mock'
  if (status === 'degraded') return 'degraded'
  return 'degraded'
}

export function computeSourceTrustScore(source: Omit<PublicDataSourceStatus, 'trustScore' | 'staleDurationMinutes' | 'fallbackMode'>): {
  trustScore: number
  staleDurationMinutes: number
  fallbackMode: PublicDataSourceStatus['fallbackMode']
} {
  const staleDurationMinutes = source.lastSync
    ? Math.max(0, Math.floor((Date.now() - source.lastSync.getTime()) / 60_000))
    : 999

  const ttl = source.cacheTtlMinutes ?? 120
  const fallbackMode = resolveFallbackMode(source.status)

  let trustScore = 0

  switch (source.status) {
    case 'live':
      trustScore = 96 - Math.min(20, Math.floor((source.latencyMs ?? 0) / 200))
      break
    case 'cached':
      trustScore = Math.max(55, 82 - Math.floor(staleDurationMinutes / 10))
      break
    case 'stale':
      trustScore = Math.max(25, 58 - Math.floor((staleDurationMinutes - ttl) / 15))
      break
    case 'degraded':
      trustScore = 48
      break
    case 'offline':
      trustScore = 22
      break
    case 'error':
      trustScore = 12
      break
    case 'missing_key':
      trustScore = 0
      break
    case 'mock':
      trustScore = 28
      break
    default:
      trustScore = 15
  }

  return {
    trustScore: Math.max(0, Math.min(100, trustScore)),
    staleDurationMinutes,
    fallbackMode,
  }
}

export function enrichSourceTrust(
  source: Omit<PublicDataSourceStatus, 'trustScore' | 'staleDurationMinutes' | 'fallbackMode'>,
): PublicDataSourceStatus {
  const trust = computeSourceTrustScore(source)
  return { ...source, ...trust }
}

export function enrichAllSourceTrust(
  sources: Omit<PublicDataSourceStatus, 'trustScore' | 'staleDurationMinutes' | 'fallbackMode'>[],
): PublicDataSourceStatus[] {
  return sources.map(enrichSourceTrust)
}

export function averageTrustScore(sources: PublicDataSourceStatus[]): number {
  if (sources.length === 0) return 0
  return Math.round(sources.reduce((sum, s) => sum + s.trustScore, 0) / sources.length)
}

export function isTrustworthyForLiveLabel(source: PublicDataSourceStatus): boolean {
  return source.status === 'live' && source.trustScore >= 75 && source.fallbackMode === 'none'
}
