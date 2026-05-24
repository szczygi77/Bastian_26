import { getWeatherSyncStatus } from '@/adapters/weatherAdapter'
import { getFIRMSSyncStatus } from '@/adapters/firmsAdapter'
import { getOpenSkySyncStatus } from '@/adapters/openskyAdapter'
import { getSentinelSyncStatus } from '@/adapters/sentinelAdapter'
import { getCachedIkCoordinateCount, getOsmSyncStatus } from '@/adapters/osmAdapter'
import { envConfig, hasCdseCredentials, hasOpenSkyAuth } from '@/config/env'
import { IK_GEOCODE_SPECS } from '@/data/ikGeocoding'
import type { PublicDataSourceStatus, PublicSourceStatus } from '@/types'

function resolveAgeStatus(dataAgeMinutes: number, online: boolean): PublicSourceStatus {
  if (!online) return 'offline'
  if (dataAgeMinutes >= 999) return 'error'
  if (dataAgeMinutes <= 30) return 'live'
  if (dataAgeMinutes <= 120) return 'cached'
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
): PublicDataSourceStatus {
  return {
    sourceName,
    sourceId,
    status,
    lastSync,
    latencyMs: null,
    recordsFetched,
    authMethod,
    errorMessage,
    cacheTtlMinutes: sourceId === 'osm' ? 10_080 : 120,
  }
}

export function getPublicDataSources(online: boolean): PublicDataSourceStatus[] {
  const weather = getWeatherSyncStatus()
  const firms = getFIRMSSyncStatus()
  const opensky = getOpenSkySyncStatus()
  const osm = getOsmSyncStatus(getCachedIkCoordinateCount(), IK_GEOCODE_SPECS.length)
  const sentinel = getSentinelSyncStatus()

  const weatherStatus: PublicSourceStatus = !online
    ? 'offline'
    : weather.lastSync
      ? resolveAgeStatus(weather.dataAge, online)
      : 'error'

  const firmsStatus: PublicSourceStatus = !envConfig.firmsApiKey
    ? 'missing_key'
    : !online
      ? 'offline'
      : firms.lastSync
        ? resolveAgeStatus(firms.dataAge, online)
        : 'error'

  const openskyStatus: PublicSourceStatus = !online
    ? 'offline'
    : opensky.lastSync
      ? resolveAgeStatus(opensky.dataAge, online)
      : hasOpenSkyAuth()
        ? 'error'
        : 'cached'

  const osmStatus: PublicSourceStatus = !online
    ? 'offline'
    : osm.lastSync
      ? resolveAgeStatus(osm.dataAge, online)
      : getCachedIkCoordinateCount() > 0
        ? 'cached'
        : 'error'

  const sentinelStatus: PublicSourceStatus = !hasCdseCredentials()
    ? 'missing_key'
    : !online
      ? 'offline'
      : sentinel.lastSync
        ? resolveAgeStatus(sentinel.dataAge, online)
        : 'error'

  return [
    buildSource('Open-Meteo', 'weather', weatherStatus, weather.lastSync, weather.lastSync ? 1 : 0, 'public'),
    buildSource(
      'NASA FIRMS',
      'firms',
      firmsStatus,
      firms.lastSync,
      firmsStatus === 'missing_key' ? 0 : null,
      envConfig.firmsApiKey ? 'MAP_KEY' : undefined,
      firmsStatus === 'missing_key' ? 'VITE_FIRMS_API_KEY not configured' : undefined,
    ),
    buildSource(
      'OpenSky Network',
      'opensky',
      openskyStatus,
      opensky.lastSync,
      null,
      hasOpenSkyAuth() ? 'basic/bearer' : 'public (rate-limited)',
    ),
    buildSource(
      'OpenStreetMap / Overpass',
      'osm',
      osmStatus,
      osm.lastSync,
      getCachedIkCoordinateCount(),
      'public',
    ),
    buildSource(
      'Copernicus CDSE',
      'sentinel',
      sentinelStatus,
      sentinel.lastSync,
      null,
      hasCdseCredentials() ? 'OAuth2 client' : undefined,
      sentinelStatus === 'missing_key' ? 'VITE_CDSE_CLIENT_ID/SECRET not configured' : undefined,
    ),
  ]
}

export function countLiveSources(sources: PublicDataSourceStatus[]): number {
  return sources.filter(s => s.status === 'live').length
}

export function countProblemSources(sources: PublicDataSourceStatus[]): number {
  return sources.filter(s => ['error', 'missing_key', 'stale', 'offline'].includes(s.status)).length
}
