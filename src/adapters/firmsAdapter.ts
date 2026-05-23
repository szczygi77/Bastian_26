import type { FIRMSAlert, SyncStatus } from '@/types'

let lastSync: Date | null = null
let cachedAlerts: FIRMSAlert[] = []

export async function fetchFIRMSAlerts(apiKey?: string): Promise<FIRMSAlert[]> {
  if (!apiKey) {
    lastSync = new Date()
    return getMockAlerts()
  }

  try {
    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${apiKey}/VIIRS_SNPP_NRT/world/1`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const text = await res.text()
    const lines = text.trim().split('\n').slice(1)
    const alerts: FIRMSAlert[] = lines.slice(0, 50).map((line, i) => {
      const cols = line.split(',')
      return {
        id: `firms-${i}-${Date.now()}`,
        latitude: parseFloat(cols[0]),
        longitude: parseFloat(cols[1]),
        brightness: parseFloat(cols[2]),
        confidence: parseInt(cols[8] ?? '50'),
        detectedAt: new Date(),
        instrument: 'VIIRS',
      }
    })

    cachedAlerts = alerts
    lastSync = new Date()
    return alerts
  } catch {
    return cachedAlerts.length > 0 ? cachedAlerts : getMockAlerts()
  }
}

function getMockAlerts(): FIRMSAlert[] {
  return [
    { id: 'firms-mock-1', latitude: 50.59, longitude: 22.06, brightness: 340, confidence: 75, detectedAt: new Date(), instrument: 'VIIRS (MOCK)' },
  ]
}

export function getFIRMSSyncStatus(): SyncStatus {
  const dataAge = lastSync ? Math.floor((Date.now() - lastSync.getTime()) / 60000) : 999
  return {
    status: dataAge < 60 ? 'synced' : 'offline',
    lastSync,
    dataAge,
  }
}
