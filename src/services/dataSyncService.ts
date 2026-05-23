import { fetchWeather, getWeatherSyncStatus } from '@/adapters/weatherAdapter'
import { fetchFIRMSAlerts, getFIRMSSyncStatus } from '@/adapters/firmsAdapter'
import { fetchOpenSkyFlights, getOpenSkySyncStatus } from '@/adapters/openskyAdapter'
import {
  fetchSentinelMetadata,
  getSentinelSyncStatus,
  getSatelliteCacheFromSentinel,
} from '@/adapters/sentinelAdapter'
import { envConfig } from '@/config/env'
import type { SystemHealth, SyncStatus } from '@/types'

type PublicSyncKey = keyof SystemHealth['publicDataSyncStatus']

const OSM_SYNC: SyncStatus = {
  status: 'synced',
  lastSync: new Date(),
  dataAge: 0,
}

/**
 * Pobiera publiczne źródła (LIVE) i zwraca statusy synchronizacji + cache satelitarny.
 */
export async function refreshPublicDataLayer(): Promise<{
  publicDataSyncStatus: SystemHealth['publicDataSyncStatus']
  satelliteCacheStatus: SystemHealth['satelliteCacheStatus']
  satelliteCacheAge: number
}> {
  const [, , , sentinelResult] = await Promise.allSettled([
    fetchWeather(),
    fetchOpenSkyFlights(),
    fetchFIRMSAlerts(envConfig.firmsApiKey),
    fetchSentinelMetadata(),
  ])

  const sentinelMeta =
    sentinelResult.status === 'fulfilled' ? sentinelResult.value : null
  const sat = getSatelliteCacheFromSentinel(sentinelMeta)

  const publicDataSyncStatus: SystemHealth['publicDataSyncStatus'] = {
    weather: getWeatherSyncStatus(),
    firms: getFIRMSSyncStatus(),
    opensky: getOpenSkySyncStatus(),
    osm: OSM_SYNC,
    sentinel: getSentinelSyncStatus(),
  }

  return {
    publicDataSyncStatus,
    satelliteCacheStatus: sat.status,
    satelliteCacheAge: sat.ageHours,
  }
}

export function getIdlePublicSyncStatus(): SystemHealth['publicDataSyncStatus'] {
  return {
    weather: getWeatherSyncStatus(),
    firms: getFIRMSSyncStatus(),
    opensky: getOpenSkySyncStatus(),
    osm: OSM_SYNC,
    sentinel: getSentinelSyncStatus(),
  }
}

export type { PublicSyncKey }
