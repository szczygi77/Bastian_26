import type { SystemHealth, SyncStatus } from '@/types'
import { getLocalDbStatus, getSyncQueueLength, isRemoteDatabaseAvailable } from '@/services/databaseService'

let startTime = Date.now()

const mockSyncStatus = (ageMinutes: number, err = false): SyncStatus => ({
  status: err ? 'error' : ageMinutes < 10 ? 'synced' : ageMinutes < 60 ? 'synced' : 'offline',
  lastSync: err ? null : new Date(Date.now() - ageMinutes * 60 * 1000),
  dataAge: ageMinutes,
})

export async function buildSystemHealth(online: boolean, mode: import('@/types').SystemMode): Promise<SystemHealth> {
  const [localDbStatus, syncQueueLength] = await Promise.all([
    getLocalDbStatus(),
    getSyncQueueLength(),
  ])
  const remoteDb = isRemoteDatabaseAvailable()

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
    rcbLinkStatus: online ? 'connected' : 'offline',
    tetraLinkStatus: 'connected',
    gsmFallbackStatus: 'ready',
    syncQueueLength: online ? syncQueueLength : Math.max(syncQueueLength, 1),
    publicDataSyncStatus: {
      weather: mockSyncStatus(online ? 5 : 45),
      firms: mockSyncStatus(online ? 12 : 90, !online),
      opensky: mockSyncStatus(online ? 1 : 60),
      osm: mockSyncStatus(online ? 120 : 1440),
      sentinel: mockSyncStatus(online ? 18 : 120, !online),
    },
  }
}

export function getSystemHealth(online: boolean, mode: import('@/types').SystemMode): SystemHealth {
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
    rcbLinkStatus: online ? 'connected' : 'offline',
    tetraLinkStatus: 'connected',
    gsmFallbackStatus: 'ready',
    syncQueueLength: online ? 0 : 1,
    publicDataSyncStatus: {
      weather: mockSyncStatus(online ? 5 : 45),
      firms: mockSyncStatus(online ? 12 : 90, !online),
      opensky: mockSyncStatus(online ? 1 : 60),
      osm: mockSyncStatus(online ? 120 : 1440),
      sentinel: mockSyncStatus(online ? 18 : 120, !online),
    },
  }
}

export function resetUptime() {
  startTime = Date.now()
}
