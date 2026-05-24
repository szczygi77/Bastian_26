import type { FIRMSAlert, SyncStatus } from '@/types'
import type { AdapterFetchMode } from '@/adapters/adapterState'
import { migrateLegacyCache, readApiCache, writeApiCache } from '@/services/publicApiCache'

/** Stalowa Wola — west,south,east,north */
const AREA_BBOX = '21.70,50.30,22.50,50.90'
const CACHE_KEY = 'bastion_firms_cache'
const CACHE_SOURCE = 'firms'
const TIMEOUT_MS = 15000

let lastSync: Date | null = null
let cachedAlerts: FIRMSAlert[] = []
let lastFetchMode: AdapterFetchMode = 'empty'
let lastError: string | undefined

async function readCacheAsync(): Promise<FIRMSAlert[] | null> {
  if (cachedAlerts.length > 0) return cachedAlerts
  const migrated = await migrateLegacyCache<FIRMSAlert[]>(CACHE_SOURCE, CACHE_KEY, 240)
  if (migrated) {
    cachedAlerts = migrated
    lastFetchMode = 'cached'
    return migrated
  }
  const cached = await readApiCache<FIRMSAlert[]>(CACHE_SOURCE)
  if (!cached) return null
  cachedAlerts = cached.data
  lastFetchMode = 'cached'
  lastSync = new Date(cached.cachedAt)
  return cached.data
}

export async function fetchFIRMSAlerts(apiKey?: string): Promise<FIRMSAlert[]> {
  if (!apiKey) {
    lastFetchMode = 'missing_key'
    lastError = 'VITE_FIRMS_API_KEY not configured'
    const cached = await readCacheAsync()
    return cached ?? []
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${apiKey}/VIIRS_SNPP_NRT/${AREA_BBOX}/2`
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const text = await res.text()
    const lines = text.trim().split('\n')
    if (lines.length < 2) {
      lastSync = new Date()
      lastFetchMode = 'live'
      lastError = undefined
      cachedAlerts = []
      return []
    }

    const headerCols = lines[0].split(',').map(c => c.trim().toLowerCase())
    const latIdx = headerCols.indexOf('latitude') >= 0 ? headerCols.indexOf('latitude') : 0
    const lonIdx = headerCols.indexOf('longitude') >= 0 ? headerCols.indexOf('longitude') : 1
    const brightIdx = headerCols.indexOf('bright_ti4') >= 0 ? headerCols.indexOf('bright_ti4') : 2
    const confIdx = headerCols.indexOf('confidence') >= 0 ? headerCols.indexOf('confidence') : 9

    const alerts: FIRMSAlert[] = lines.slice(1).map((line, i) => {
      const cells = line.split(',')
      const lat = parseFloat(cells[latIdx])
      const lon = parseFloat(cells[lonIdx])
      const confRaw = cells[confIdx]?.trim() ?? '50'
      const confidence =
        confRaw === 'h' ? 90 : confRaw === 'n' ? 70 : confRaw === 'l' ? 40 : parseInt(confRaw, 10) || 50

      return {
        id: `firms-${lat.toFixed(4)}-${lon.toFixed(4)}-${i}`,
        latitude: lat,
        longitude: lon,
        brightness: parseFloat(cells[brightIdx]) || 300,
        confidence,
        detectedAt: new Date(),
        instrument: 'VIIRS SNPP NRT',
      }
    })

    cachedAlerts = alerts
    lastSync = new Date()
    lastFetchMode = 'live'
    lastError = undefined
    await writeApiCache(CACHE_SOURCE, alerts, 240)
    return alerts
  } catch (error) {
    clearTimeout(timeoutId)
    lastError = error instanceof Error ? error.message : 'fetch failed'
    const cached = await readCacheAsync()
    if (cached) {
      lastFetchMode = 'cached'
      cachedAlerts = cached
      return cached
    }
    lastFetchMode = 'error'
    return cachedAlerts
  }
}

export function getFIRMSSyncStatus(): SyncStatus {
  const dataAge = lastSync ? Math.floor((Date.now() - lastSync.getTime()) / 60000) : 999
  const status =
    lastFetchMode === 'missing_key' || lastFetchMode === 'error'
      ? 'error'
      : lastFetchMode === 'cached'
        ? 'offline'
        : dataAge < 120
          ? 'synced'
          : 'offline'

  return { status, lastSync, dataAge }
}

export function getFirmsFetchMode(): AdapterFetchMode {
  return lastFetchMode
}

export function getFirmsLastError(): string | undefined {
  return lastError
}

export { cachedAlerts }
