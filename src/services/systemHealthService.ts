import type { SystemHealth, SyncStatus } from '@/types'

let startTime = Date.now()

const mockSyncStatus = (ageMinutes: number, err = false): SyncStatus => ({
  status: err ? 'error' : ageMinutes < 10 ? 'synced' : ageMinutes < 60 ? 'synced' : 'offline',
  lastSync: err ? null : new Date(Date.now() - ageMinutes * 60 * 1000),
  dataAge: ageMinutes,
})

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
    syncQueueLength: online ? 0 : 3,
    publicDataSyncStatus: {
      weather: mockSyncStatus(online ? 5 : 45),
      firms: mockSyncStatus(online ? 12 : 90, !online),
      opensky: mockSyncStatus(online ? 1 : 60),
      osm: mockSyncStatus(online ? 120 : 1440),
    },
  }
}

export function resetUptime() {
  startTime = Date.now()
}
