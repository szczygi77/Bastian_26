import { fetchWeather, getWeatherSyncStatus } from '@/adapters/weatherAdapter'
import { fetchFIRMSAlerts, getFIRMSSyncStatus } from '@/adapters/firmsAdapter'
import { fetchOpenSkyFlights, getOpenSkySyncStatus } from '@/adapters/openskyAdapter'
import {
  fetchSentinelMetadata,
  getSentinelSyncStatus,
  getSatelliteCacheFromSentinel,
} from '@/adapters/sentinelAdapter'
import { getCachedIkCoordinateCount, getOsmSyncStatus } from '@/adapters/osmAdapter'
import { IK_GEOCODE_SPECS } from '@/data/ikGeocoding'
import { envConfig } from '@/config/env'
import type { SystemHealth, SyncStatus } from '@/types'

type PublicSyncKey = keyof SystemHealth['publicDataSyncStatus']

const OSM_TOTAL = IK_GEOCODE_SPECS.length

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
    osm: getOsmSyncStatus(getCachedIkCoordinateCount(), OSM_TOTAL),
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
    osm: getOsmSyncStatus(getCachedIkCoordinateCount(), OSM_TOTAL),
    sentinel: getSentinelSyncStatus(),
  }
}

export type { PublicSyncKey }
