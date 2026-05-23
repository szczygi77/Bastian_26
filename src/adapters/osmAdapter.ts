import {
  IK_GEOCODE_SPECS,
  IK_VERIFIED_COORDINATES,
  STALOWA_WOLA_BBOX,
  type IkGeocodeSpec,
} from '@/data/ikGeocoding'
import type { SyncStatus } from '@/types'

const OVERPASS_ENDPOINTS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
]
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const CACHE_KEY = 'bastion_ik_coordinates_v2'
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000
const NOMINATIM_DELAY_MS = 1100

const { south, west, north, east } = STALOWA_WOLA_BBOX
const BBOX_FRAGMENT = `(${south},${west},${north},${east})`

let lastSync: Date | null = null
let lastError: string | null = null

interface CachedCoords {
  coordinates: Record<string, [number, number]>
  fetchedAt: number
  source: 'overpass' | 'nominatim' | 'verified'
}

interface OverpassElement {
  type: string
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function readCacheRaw(): CachedCoords | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CachedCoords
  } catch {
    return null
  }
}

function readCache(): CachedCoords | null {
  const parsed = readCacheRaw()
  if (!parsed) return null
  if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null
  return parsed
}

function writeCache(
  coordinates: Record<string, [number, number]>,
  source: CachedCoords['source']
): void {
  const payload: CachedCoords = { coordinates, fetchedAt: Date.now(), source }
  localStorage.setItem(CACHE_KEY, JSON.stringify(payload))
  lastSync = new Date()
}

function elementCenter(el: OverpassElement): [number, number] | null {
  if (el.lat != null && el.lon != null) return [el.lat, el.lon]
  if (el.center) return [el.center.lat, el.center.lon]
  return null
}

function buildOverpassQuery(): string {
  const selectors = IK_GEOCODE_SPECS.map(
    spec => spec.overpass.replace(/;$/, '') + BBOX_FRAGMENT + ';'
  ).join('\n  ')

  return `[out:json][timeout:30];
(
  ${selectors}
);
out center tags;`
}

function matchElementToSpec(
  spec: IkGeocodeSpec,
  elements: OverpassElement[]
): [number, number] | null {
  const anchor = IK_VERIFIED_COORDINATES[spec.id]

  const candidates = elements
    .map(el => {
      const center = elementCenter(el)
      if (!center) return null
      const name = el.tags?.name ?? el.tags?.operator ?? el.tags?.brand ?? ''
      if (!spec.namePattern.test(name) && spec.id !== 'bts') return null
      return { center, name, el, d2: anchor ? dist2(center, anchor) : 0 }
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)

  if (spec.id === 'bts') {
    const masts = elements
      .map(el => {
        const center = elementCenter(el)
        if (!center || el.tags?.['man_made'] !== 'mast') return null
        return center
      })
      .filter((c): c is [number, number] => c !== null)
    if (masts.length > 0) {
      // Maszt najbliżej centrum miasta
      const cityCenter: [number, number] = [50.5826, 22.0534]
      masts.sort((a, b) => dist2(a, cityCenter) - dist2(b, cityCenter))
      return masts[0]
    }
  }

  if (candidates.length === 0) return null

  // Najpierw: najbliżej zweryfikowanej kotwicy (jeśli istnieje), potem jakość dopasowania nazwy.
  candidates.sort((a, b) => {
    if (anchor) {
      const dd = a.d2 - b.d2
      if (Math.abs(dd) > 1e-10) return dd
    }
    return scoreName(spec, b.name) - scoreName(spec, a.name)
  })
  return candidates[0].center
}

function dist2(a: [number, number], b: [number, number]): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2
}

function scoreName(spec: IkGeocodeSpec, name: string): number {
  if (spec.namePattern.test(name)) return name.length
  return 0
}

async function fetchOverpassLocations(): Promise<Map<string, [number, number]>> {
  const query = buildOverpassQuery()
  let lastStatus = 'Overpass unavailable'

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      })
      if (!res.ok) {
        lastStatus = `${endpoint} HTTP ${res.status}`
        continue
      }

      const json = (await res.json()) as { elements?: OverpassElement[] }
      return parseOverpassElements(json.elements ?? [])
    } catch (e) {
      lastStatus = e instanceof Error ? e.message : 'Overpass error'
    }
  }

  throw new Error(lastStatus)
}

function parseOverpassElements(elements: OverpassElement[]): Map<string, [number, number]> {
  const resolved = new Map<string, [number, number]>()

  for (const spec of IK_GEOCODE_SPECS) {
    const coords = matchElementToSpec(spec, elements)
    if (coords) resolved.set(spec.id, coords)
  }

  return resolved
}

async function geocodeQuery(query: string): Promise<[number, number] | null> {
  const viewbox = `${west},${north},${east},${south}`
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: '1',
    countrycodes: 'pl',
    viewbox,
    bounded: '1',
  })

  const res = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'pl',
      'User-Agent': 'BASTION-Enterprise/1.0 (critical-infrastructure-map)',
    },
  })

  if (!res.ok) return null

  const results = (await res.json()) as Array<{ lat: string; lon: string }>
  if (results.length === 0) return null
  return [parseFloat(results[0].lat), parseFloat(results[0].lon)]
}

async function fillMissingWithNominatim(
  resolved: Map<string, [number, number]>
): Promise<void> {
  const missing = IK_GEOCODE_SPECS.filter(s => !resolved.has(s.id))
  for (let i = 0; i < missing.length; i++) {
    const spec = missing[i]
    try {
      const coords = await geocodeQuery(spec.query)
      if (coords) resolved.set(spec.id, coords)
    } catch {
      /* skip */
    }
    if (i < missing.length - 1) await sleep(NOMINATIM_DELAY_MS)
  }
}

function applyVerifiedFallback(resolved: Map<string, [number, number]>): void {
  for (const spec of IK_GEOCODE_SPECS) {
    if (!resolved.has(spec.id) && IK_VERIFIED_COORDINATES[spec.id]) {
      resolved.set(spec.id, IK_VERIFIED_COORDINATES[spec.id])
    }
  }
}

/**
 * Pobiera współrzędne obiektów IK z OpenStreetMap (Overpass + opcjonalnie Nominatim).
 */
export async function fetchIkCoordinates(options?: {
  force?: boolean
  onProgress?: (id: string) => void
}): Promise<Map<string, [number, number]>> {
  if (!options?.force) {
    const cached = readCache()
    if (cached) {
      lastSync = new Date(cached.fetchedAt)
      return new Map(Object.entries(cached.coordinates))
    }
  }

  lastError = null
  const resolved = new Map<string, [number, number]>()

  try {
    const overpass = await fetchOverpassLocations()
    overpass.forEach((coords, id) => {
      resolved.set(id, coords)
      options?.onProgress?.(id)
    })
  } catch (e) {
    lastError = e instanceof Error ? e.message : 'Overpass failed'
  }

  if (resolved.size < IK_GEOCODE_SPECS.length && navigator.onLine) {
    await fillMissingWithNominatim(resolved)
  }

  applyVerifiedFallback(resolved)

  if (resolved.size > 0) {
    const source: CachedCoords['source'] =
      resolved.size >= IK_GEOCODE_SPECS.length ? 'overpass' : 'verified'
    writeCache(Object.fromEntries(resolved), source)
  }

  return resolved
}

export function getOsmSyncStatus(resolvedCount: number, totalCount: number): SyncStatus {
  const cached = readCacheRaw()
  if (cached && !lastSync) lastSync = new Date(cached.fetchedAt)

  const dataAge = lastSync ? Math.floor((Date.now() - lastSync.getTime()) / 60000) : 999
  const effectiveCount = resolvedCount || (cached ? Object.keys(cached.coordinates).length : 0)
  const allResolved = effectiveCount >= totalCount

  let status: SyncStatus['status'] = 'offline'
  if (lastError && effectiveCount === 0) status = 'error'
  else if (allResolved || effectiveCount > 0) status = 'synced'

  return { status, lastSync, dataAge }
}

export function getCachedIkCoordinateCount(): number {
  const cached = readCache()
  return cached ? Object.keys(cached.coordinates).length : 0
}

export { lastError as osmLastError }
