import { envConfig } from '@/config/env'
import type { OpenSkyFlight, SyncStatus } from '@/types'

/** Bbox Stalowa Wola (zgodny z konfiguracją użytkownika) */
const BBOX = { minLat: 50.5, maxLat: 50.7, minLon: 22.0, maxLon: 22.2 }
const TIMEOUT_MS = 12000

let lastSync: Date | null = null
let cachedFlights: OpenSkyFlight[] = []

function buildAuthHeaders(): HeadersInit {
  const headers: HeadersInit = { Accept: 'application/json' }

  if (envConfig.openskyBearerToken) {
    headers.Authorization = `Bearer ${envConfig.openskyBearerToken}`
    return headers
  }

  if (envConfig.openskyUsername && envConfig.openskyPassword) {
    const encoded = btoa(
      `${envConfig.openskyUsername}:${envConfig.openskyPassword}`
    )
    headers.Authorization = `Basic ${encoded}`
    return headers
  }

  return headers
}

export async function fetchOpenSkyFlights(): Promise<OpenSkyFlight[]> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const url =
      `https://opensky-network.org/api/states/all` +
      `?lamin=${BBOX.minLat}&lomin=${BBOX.minLon}` +
      `&lamax=${BBOX.maxLat}&lomax=${BBOX.maxLon}`

    const res = await fetch(url, {
      signal: controller.signal,
      headers: buildAuthHeaders(),
    })
    clearTimeout(timeoutId)

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const json = await res.json()
    const states = json.states ?? []

    const flights: OpenSkyFlight[] = states
      .filter((s: unknown[]) => s[5] != null && s[6] != null)
      .map((s: unknown[]) => ({
        icao24: String(s[0]),
        callsign: String(s[1] ?? '').trim(),
        latitude: Number(s[6]),
        longitude: Number(s[5]),
        altitude: Number(s[7] ?? 0),
        velocity: Number(s[9] ?? 0),
        heading: Number(s[10] ?? 0),
        lastContact: Number(s[4]),
      }))

    cachedFlights = flights
    lastSync = new Date()
    return flights
  } catch {
    clearTimeout(timeoutId)
    return cachedFlights.length > 0 ? cachedFlights : getMockFlights()
  }
}

function getMockFlights(): OpenSkyFlight[] {
  return [
    {
      icao24: 'abc123',
      callsign: 'LOT431',
      latitude: 50.61,
      longitude: 22.12,
      altitude: 8500,
      velocity: 820,
      heading: 270,
      lastContact: Date.now() / 1000,
    },
    {
      icao24: 'def456',
      callsign: 'RYR8821',
      latitude: 50.55,
      longitude: 22.08,
      altitude: 11000,
      velocity: 890,
      heading: 85,
      lastContact: Date.now() / 1000,
    },
  ]
}

export function getOpenSkySyncStatus(): SyncStatus {
  const dataAge = lastSync
    ? Math.floor((Date.now() - lastSync.getTime()) / 60000)
    : 999

  return {
    status: dataAge < 5 ? 'synced' : 'offline',
    lastSync,
    dataAge,
  }
}

export { cachedFlights }
