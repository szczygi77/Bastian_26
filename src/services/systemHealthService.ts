import type { SystemHealth } from '@/types'
import { getLocalDbStatus, getSyncQueueLength, isRemoteDatabaseAvailable } from '@/services/databaseService'
import { getRCBLinkStatus } from '@/adapters/rcbMockAdapter'
import { getTetraLinkStatus } from '@/adapters/tetraMockAdapter'
import { getWeatherSyncStatus } from '@/adapters/weatherAdapter'
import { getFIRMSSyncStatus } from '@/adapters/firmsAdapter'
import { getOpenSkySyncStatus } from '@/adapters/openskyAdapter'
import { getOsmSyncStatus, getCachedIkCoordinateCount } from '@/adapters/osmAdapter'
import { getSentinelSyncStatus } from '@/adapters/sentinelAdapter'
import { IK_GEOCODE_SPECS } from '@/data/ikGeocoding'

let startTime = Date.now()

function buildPublicDataSyncStatus(online: boolean): SystemHealth['publicDataSyncStatus'] {
  const weather = getWeatherSyncStatus()
  const firms = getFIRMSSyncStatus()
  const opensky = getOpenSkySyncStatus()
  const osm = getOsmSyncStatus(getCachedIkCoordinateCount(), IK_GEOCODE_SPECS.length)
  const sentinel = getSentinelSyncStatus()

  return {
    weather: online ? weather : { ...weather, status: 'offline' },
    firms: online ? firms : { ...firms, status: 'offline' },
    opensky: online ? opensky : { ...opensky, status: 'offline' },
    osm: online ? osm : { ...osm, status: 'offline' },
    sentinel: online ? sentinel : { ...sentinel, status: 'offline' },
  }
}

export async function buildSystemHealth(online: boolean, mode: import('@/types').SystemMode): Promise<SystemHealth> {
  const [localDbStatus, syncQueueLength] = await Promise.all([
    getLocalDbStatus(),
    getSyncQueueLength(),
  ])
  const remoteDb = isRemoteDatabaseAvailable()
  const rcb = getRCBLinkStatus()
  const tetra = getTetraLinkStatus(online, mode === 'simulation')

  return {
    mode,
    online,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    lastSync: online && remoteDb ? new Date() : null,
    satelliteCacheStatus: 'stale',
    satelliteCacheAge: 18,
    localDbStatus,
    localAiReady: false,
    encryptionActive: true,
    watchdogActive: true,
    hotStandbyActive: true,
    upsActive: true,
    rcbLinkStatus: online ? rcb.status : 'offline',
    tetraLinkStatus: tetra.status,
    gsmFallbackStatus: 'ready',
    syncQueueLength: online ? syncQueueLength : Math.max(syncQueueLength, 1),
    publicDataSyncStatus: buildPublicDataSyncStatus(online),
  }
}

export function getSystemHealth(online: boolean, mode: import('@/types').SystemMode): SystemHealth {
  const rcb = getRCBLinkStatus()
  const tetra = getTetraLinkStatus(online, mode === 'simulation')

  return {
    mode,
    online,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    lastSync: online ? new Date() : null,
    satelliteCacheStatus: 'stale',
    satelliteCacheAge: 18,
    localDbStatus: 'healthy',
    localAiReady: false,
    encryptionActive: true,
    watchdogActive: true,
    hotStandbyActive: true,
    upsActive: true,
    rcbLinkStatus: online ? rcb.status : 'offline',
    tetraLinkStatus: tetra.status,
    gsmFallbackStatus: 'ready',
    syncQueueLength: online ? 0 : 1,
    publicDataSyncStatus: buildPublicDataSyncStatus(online),
  }
}

export function resetUptime() {
  startTime = Date.now()
}
