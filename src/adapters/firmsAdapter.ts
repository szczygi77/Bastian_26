import type { FIRMSAlert, SyncStatus } from '@/types'

/** Stalowa Wola — west,south,east,north */
const AREA_BBOX = '21.70,50.30,22.50,50.90'
const CACHE_KEY = 'bastion_firms_cache'
const TIMEOUT_MS = 15000

let lastSync: Date | null = null
let cachedAlerts: FIRMSAlert[] = []

export async function fetchFIRMSAlerts(apiKey?: string): Promise<FIRMSAlert[]> {
  if (!apiKey) {
    return getFromCacheOrMock()
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
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ alerts, timestamp: Date.now() })
    )
    return alerts
  } catch {
    clearTimeout(timeoutId)
    return getFromCacheOrMock()
  }
}

function getFromCacheOrMock(): FIRMSAlert[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (raw) {
      const { alerts } = JSON.parse(raw) as { alerts: FIRMSAlert[] }
      cachedAlerts = alerts.map(a => ({
        ...a,
        detectedAt: new Date(a.detectedAt),
      }))
      return cachedAlerts
    }
  } catch {
    /* ignore */
  }

  if (cachedAlerts.length > 0) return cachedAlerts
  lastSync = new Date()
  return getMockAlerts()
}

function getMockAlerts(): FIRMSAlert[] {
  return [
    {
      id: 'firms-mock-1',
      latitude: 50.59,
      longitude: 22.06,
      brightness: 340,
      confidence: 75,
      detectedAt: new Date(),
      instrument: 'VIIRS (MOCK)',
    },
  ]
}

export function getFIRMSSyncStatus(): SyncStatus {
  const dataAge = lastSync
    ? Math.floor((Date.now() - lastSync.getTime()) / 60000)
    : 999

  return {
    status: dataAge < 120 ? 'synced' : 'offline',
    lastSync,
    dataAge,
  }
}

export { cachedAlerts }
