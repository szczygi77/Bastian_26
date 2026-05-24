import { envConfig } from '@/config/env'
import type { OpenSkyFlight, SyncStatus } from '@/types'
import type { AdapterFetchMode } from '@/adapters/adapterState'
import { readApiCache, writeApiCache } from '@/services/publicApiCache'

/** Bbox Stalowa Wola (zgodny z konfiguracją użytkownika) */
const BBOX = { minLat: 50.5, maxLat: 50.7, minLon: 22.0, maxLon: 22.2 }
const CACHE_SOURCE = 'opensky'
const TIMEOUT_MS = 12000

let lastSync: Date | null = null
let cachedFlights: OpenSkyFlight[] = []
let lastFetchMode: AdapterFetchMode = 'empty'
let lastError: string | undefined

function buildAuthHeaders(): HeadersInit {
  const headers: HeadersInit = { Accept: 'application/json' }

  if (envConfig.openskyBearerToken) {
    headers.Authorization = `Bearer ${envConfig.openskyBearerToken}`
    return headers
  }

  if (envConfig.openskyUsername && envConfig.openskyPassword) {
    const encoded = btoa(`${envConfig.openskyUsername}:${envConfig.openskyPassword}`)
    headers.Authorization = `Basic ${encoded}`
    return headers
  }

  return headers
}

async function readCacheAsync(): Promise<OpenSkyFlight[] | null> {
  if (cachedFlights.length > 0) return cachedFlights
  const cached = await readApiCache<OpenSkyFlight[]>(CACHE_SOURCE)
  if (!cached) return null
  cachedFlights = cached.data
  lastFetchMode = 'cached'
  lastSync = new Date(cached.cachedAt)
  return cached.data
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
    lastFetchMode = 'live'
    lastError = undefined
    await writeApiCache(CACHE_SOURCE, flights, 5)
    return flights
  } catch (error) {
    clearTimeout(timeoutId)
    lastError = error instanceof Error ? error.message : 'fetch failed'
    const cached = await readCacheAsync()
    if (cached && cached.length > 0) {
      lastFetchMode = 'cached'
      cachedFlights = cached
      return cached
    }
    if (cachedFlights.length > 0) {
      lastFetchMode = 'cached'
      return cachedFlights
    }
    lastFetchMode = 'error'
    return []
  }
}

export function getOpenSkySyncStatus(): SyncStatus {
  const dataAge = lastSync ? Math.floor((Date.now() - lastSync.getTime()) / 60000) : 999
  const status =
    lastFetchMode === 'error'
      ? 'error'
      : lastFetchMode === 'cached'
        ? 'offline'
        : dataAge < 5
          ? 'synced'
          : 'offline'

  return { status, lastSync, dataAge }
}

export function getOpenSkyFetchMode(): AdapterFetchMode {
  return lastFetchMode
}

export function getOpenSkyLastError(): string | undefined {
  return lastError
}

export { cachedFlights }
