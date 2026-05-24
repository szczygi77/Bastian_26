import { getWeatherFetchMode, getWeatherLastError, getWeatherSyncStatus } from '@/adapters/weatherAdapter'
import { getFirmsFetchMode, getFirmsLastError, getFIRMSSyncStatus } from '@/adapters/firmsAdapter'
import { getOpenSkyFetchMode, getOpenSkyLastError, getOpenSkySyncStatus } from '@/adapters/openskyAdapter'
import { getSentinelSyncStatus } from '@/adapters/sentinelAdapter'
import { getCachedIkCoordinateCount, getOsmSyncStatus } from '@/adapters/osmAdapter'
import { envConfig, hasCdseCredentials, hasOpenSkyAuth } from '@/config/env'
import { IK_GEOCODE_SPECS } from '@/data/ikGeocoding'
import type { PublicDataSourceStatus, PublicSourceStatus } from '@/types'
import type { AdapterFetchMode } from '@/adapters/adapterState'

function mapAdapterMode(mode: AdapterFetchMode, online: boolean): PublicSourceStatus {
  if (!online && mode !== 'missing_key') return 'offline'
  if (mode === 'live') return 'live'
  if (mode === 'cached') return 'cached'
  if (mode === 'missing_key') return 'missing_key'
  if (mode === 'mock') return 'mock'
  if (mode === 'error' || mode === 'empty') return 'error'
  return 'stale'
}

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
    buildSource(
      'Open-Meteo',
      'weather',
      mapAdapterMode(getWeatherFetchMode(), online),
      weather.lastSync,
      weather.lastSync ? 1 : 0,
      'public',
      getWeatherLastError(),
    ),
    buildSource(
      'NASA FIRMS',
      'firms',
      envConfig.firmsApiKey
        ? mapAdapterMode(getFirmsFetchMode(), online)
        : 'missing_key',
      firms.lastSync,
      getFirmsFetchMode() === 'missing_key' ? 0 : null,
      envConfig.firmsApiKey ? 'MAP_KEY' : undefined,
      getFirmsLastError() ?? (envConfig.firmsApiKey ? undefined : 'VITE_FIRMS_API_KEY not configured'),
    ),
    buildSource(
      'OpenSky Network',
      'opensky',
      mapAdapterMode(getOpenSkyFetchMode(), online),
      opensky.lastSync,
      null,
      hasOpenSkyAuth() ? 'basic/bearer' : 'public (rate-limited)',
      getOpenSkyLastError(),
    ),
    buildSource('OpenStreetMap / Overpass', 'osm', osmStatus, osm.lastSync, getCachedIkCoordinateCount(), 'public'),
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
