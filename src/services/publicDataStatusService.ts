import { getWeatherFetchMode, getWeatherLastError, getWeatherSyncStatus } from '@/adapters/weatherAdapter'
import { getFirmsFetchMode, getFirmsLastError, getFIRMSSyncStatus } from '@/adapters/firmsAdapter'
import { getOpenSkyFetchMode, getOpenSkyLastError, getOpenSkySyncStatus } from '@/adapters/openskyAdapter'
import { getSentinelFetchMode, getSentinelLastError, getSentinelSyncStatus } from '@/adapters/sentinelAdapter'
import { getCachedIkCoordinateCount, getOsmSyncStatus } from '@/adapters/osmAdapter'
import { getRCBLinkStatus } from '@/adapters/rcbMockAdapter'
import { getTetraLinkStatus } from '@/adapters/tetraMockAdapter'
import { envConfig, hasCdseCredentials, hasOpenSkyAuth } from '@/config/env'
import { IK_GEOCODE_SPECS } from '@/data/ikGeocoding'
import { mapFetchModeToStatus } from '@/adapters/adapterEnvelope'
import { enrichAllSourceTrust } from '@/services/sourceTrustService'
import type { PublicDataSourceStatus, PublicSourceStatus } from '@/types'
import type { AdapterFetchMode } from '@/adapters/adapterState'

function mapAdapterMode(mode: AdapterFetchMode, online: boolean, dataAgeMinutes?: number, ttl = 120): PublicSourceStatus {
  return mapFetchModeToStatus(mode, online, dataAgeMinutes, ttl)
}

function resolveAgeStatus(dataAgeMinutes: number, online: boolean, ttl = 120): PublicSourceStatus {
  if (!online) return 'offline'
  if (dataAgeMinutes >= 999) return 'error'
  if (dataAgeMinutes <= 30) return 'live'
  if (dataAgeMinutes <= ttl) return 'cached'
  return 'stale'
}

function buildSource(
  sourceName: string,
  sourceId: PublicDataSourceStatus['sourceId'],
  status: PublicSourceStatus,
  lastSync: Date | null,
  recordsFetched: number | null,
  authMethod?: string,
  errorMessage?: string,
  cacheTtlMinutes = 120,
  isMock = false,
): Omit<PublicDataSourceStatus, 'trustScore' | 'staleDurationMinutes' | 'fallbackMode'> {
  return {
    sourceName,
    sourceId,
    status,
    lastSync,
    latencyMs: null,
    recordsFetched,
    authMethod,
    errorMessage,
    cacheTtlMinutes,
    isMock,
    isStale: status === 'stale',
  }
}

export function getPublicDataSources(online: boolean): PublicDataSourceStatus[] {
  const weather = getWeatherSyncStatus()
  const firms = getFIRMSSyncStatus()
  const opensky = getOpenSkySyncStatus()
  const osm = getOsmSyncStatus(getCachedIkCoordinateCount(), IK_GEOCODE_SPECS.length)
  const sentinel = getSentinelSyncStatus()
  const weatherMode = getWeatherFetchMode()
  const firmsMode = getFirmsFetchMode()
  const openskyMode = getOpenSkyFetchMode()
  const sentinelMode = getSentinelFetchMode()

  const osmStatus: PublicSourceStatus = !online
    ? 'offline'
    : osm.lastSync
      ? resolveAgeStatus(osm.dataAge, online, 10_080)
      : getCachedIkCoordinateCount() > 0
        ? 'cached'
        : 'error'

  const sentinelStatus: PublicSourceStatus = !hasCdseCredentials()
    ? sentinelMode === 'cached' || sentinelMode === 'mock'
      ? sentinelMode === 'mock' ? 'mock' : 'cached'
      : 'missing_key'
    : mapAdapterMode(sentinelMode, online, sentinel.dataAge, 360)

  const rcb = getRCBLinkStatus()
  const tetra = getTetraLinkStatus(online)

  return enrichAllSourceTrust([
    buildSource(
      'Open-Meteo',
      'weather',
      mapAdapterMode(weatherMode, online, weather.dataAge, 120),
      weather.lastSync,
      weather.lastSync ? 1 : 0,
      'public (no key)',
      getWeatherLastError(),
      120,
    ),
    buildSource(
      'NASA FIRMS',
      'firms',
      envConfig.firmsApiKey
        ? mapAdapterMode(firmsMode, online, firms.dataAge, 240)
        : 'missing_key',
      firms.lastSync,
      firmsMode === 'live' ? (getFirmsFetchMode() === 'live' ? null : 0) : 0,
      envConfig.firmsApiKey ? 'MAP_KEY' : undefined,
      getFirmsLastError() ?? (envConfig.firmsApiKey ? undefined : 'VITE_FIRMS_API_KEY not configured'),
      240,
    ),
    buildSource(
      'OpenSky Network',
      'opensky',
      mapAdapterMode(openskyMode, online, opensky.dataAge, 30),
      opensky.lastSync,
      null,
      hasOpenSkyAuth() ? 'basic/bearer' : 'public (rate-limited)',
      getOpenSkyLastError(),
      30,
    ),
    buildSource('OpenStreetMap / Overpass', 'osm', osmStatus, osm.lastSync, getCachedIkCoordinateCount(), 'public', undefined, 10_080),
    buildSource(
      'Copernicus CDSE',
      'sentinel',
      sentinelStatus,
      sentinel.lastSync,
      sentinelMode === 'live' ? 1 : 0,
      hasCdseCredentials() ? 'OAuth2 client' : undefined,
      getSentinelLastError() ?? (hasCdseCredentials() ? undefined : 'VITE_CDSE_CLIENT_ID/SECRET not configured'),
      360,
      sentinelMode === 'mock',
    ),
    buildSource(
      'RCB Alert Gateway',
      'rcb',
      'mock',
      rcb.lastHeartbeat,
      rcb.reportQueueLength,
      'mock adapter',
      'Brak skonfigurowanego endpointu RCB — dane symulacyjne',
      0,
      true,
    ),
    buildSource(
      'TETRA / PIONIER',
      'tetra',
      'mock',
      tetra.lastHeartbeat,
      null,
      'mock adapter',
      'Brak integracji TETRA — status symulacyjny',
      0,
      true,
    ),
    buildSource(
      'PIONIER Backbone',
      'pionier',
      'mock',
      rcb.lastHeartbeat,
      null,
      'mock adapter',
      'Agregacja statusu łącza — nie jest to live telemetry',
      0,
      true,
    ),
  ])
}

export function countLiveSources(sources: PublicDataSourceStatus[]): number {
  return sources.filter(s => s.status === 'live' && !s.isMock).length
}

export function countProblemSources(sources: PublicDataSourceStatus[]): number {
  return sources.filter(s => ['error', 'missing_key', 'stale', 'offline'].includes(s.status)).length
}
