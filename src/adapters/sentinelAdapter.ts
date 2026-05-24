import { envConfig, hasCdseCredentials } from '@/config/env'
import type { SyncStatus } from '@/types'
import type { AdapterFetchMode } from '@/adapters/adapterState'

const TOKEN_URL =
  'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token'
const CATALOG_URL = 'https://catalogue.dataspace.copernicus.eu/odata/v1/Products'

/** Stalowa Wola — punkt referencyjny */
const LON = 22.040
const LAT = 50.579

const CACHE_KEY = 'bastion_sentinel_cache'
const TIMEOUT_MS = 12000

export interface SentinelSceneMeta {
  productId: string
  productName: string
  acquisitionStart: Date
  platform: string
  lastUpdate: Date
}

let lastSync: Date | null = null
let cachedMeta: SentinelSceneMeta | null = null
let tokenCache: { accessToken: string; expiresAt: number } | null = null
let lastFetchMode: AdapterFetchMode = 'empty'
let lastError: string | undefined

const DEMO_BASELINE_META: SentinelSceneMeta = {
  productId: 'DEMO-S1-STALOWA-WOLA',
  productName: 'SENTINEL-1 IW GRD (baseline cache)',
  acquisitionStart: new Date(Date.now() - 48 * 3600 * 1000),
  platform: 'SENTINEL-1',
  lastUpdate: new Date(),
}

async function fetchAccessToken(): Promise<string> {
  const clientId = envConfig.cdseClientId
  const clientSecret = envConfig.cdseClientSecret
  if (!clientId || !clientSecret) {
    throw new Error('Brak VITE_CDSE_CLIENT_ID / VITE_CDSE_CLIENT_SECRET w .env')
  }

  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.accessToken
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  })

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`CDSE token HTTP ${res.status}: ${text.slice(0, 120)}`)
    }

    const json = (await res.json()) as { access_token: string; expires_in?: number }
    const expiresIn = (json.expires_in ?? 3600) * 1000
    tokenCache = {
      accessToken: json.access_token,
      expiresAt: Date.now() + expiresIn,
    }
    return json.access_token
  } catch (e) {
    clearTimeout(timeoutId)
    throw e
  }
}

/**
 * Ostatni produkt Sentinel-1 w okolicy Stalowej Woli (metadane katalogu CDSE).
 */
export async function fetchSentinelMetadata(): Promise<SentinelSceneMeta | null> {
  if (!hasCdseCredentials()) {
    lastFetchMode = 'missing_key'
    lastError = 'VITE_CDSE_CLIENT_ID/SECRET not configured'
    const cached = getFromCacheOrNull()
    if (cached) {
      lastFetchMode = 'cached'
      return cached
    }
    lastFetchMode = 'mock'
    cachedMeta = DEMO_BASELINE_META
    lastSync = new Date()
    return DEMO_BASELINE_META
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const token = await fetchAccessToken()

    const filter = encodeURIComponent(
      `Collection/Name eq 'SENTINEL-1' and OData.CSC.Intersects(area=geography'SRID=4326;POINT(${LON} ${LAT})')`
    )
    const url =
      `${CATALOG_URL}?$filter=${filter}` +
      '&$orderby=ContentDate/Start desc&$top=1'

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!res.ok) {
      throw new Error(`CDSE catalog HTTP ${res.status}`)
    }

    const json = (await res.json()) as {
      value?: Array<{
        Id: string
        Name: string
        ContentDate?: { Start?: string }
        Platforms?: Array<{ PlatformShortName?: string }>
      }>
    }

    const item = json.value?.[0]
    if (!item) {
      lastSync = new Date()
      return null
    }

    const meta: SentinelSceneMeta = {
      productId: item.Id,
      productName: item.Name,
      acquisitionStart: new Date(item.ContentDate?.Start ?? Date.now()),
      platform: item.Platforms?.[0]?.PlatformShortName ?? 'SENTINEL-1',
      lastUpdate: new Date(),
    }

    cachedMeta = meta
    lastSync = new Date()
    lastFetchMode = 'live'
    lastError = undefined
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ meta, timestamp: Date.now() })
    )
    return meta
  } catch (e) {
    clearTimeout(timeoutId)
    lastError = e instanceof Error ? e.message : 'fetch failed'
    const cached = getFromCacheOrNull()
    if (cached) {
      lastFetchMode = 'cached'
      return cached
    }
    lastFetchMode = 'error'
    return null
  }
}

function getFromCacheOrNull(): SentinelSceneMeta | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (raw) {
      const { meta } = JSON.parse(raw) as { meta: SentinelSceneMeta }
      return {
        ...meta,
        acquisitionStart: new Date(meta.acquisitionStart),
        lastUpdate: new Date(meta.lastUpdate),
      }
    }
  } catch {
    /* ignore */
  }
  return cachedMeta
}

export function getSentinelSyncStatus(): SyncStatus {
  if (!hasCdseCredentials()) {
    const dataAge = lastSync
      ? Math.floor((Date.now() - lastSync.getTime()) / 60000)
      : 999
    return {
      status: lastFetchMode === 'cached' || lastFetchMode === 'mock' ? 'offline' : 'error',
      lastSync,
      dataAge,
    }
  }

  const dataAge = lastSync
    ? Math.floor((Date.now() - lastSync.getTime()) / 60000)
    : 999

  return {
    status: lastFetchMode === 'error'
      ? 'error'
      : dataAge < 360
        ? 'synced'
        : dataAge < 1440
          ? 'synced'
          : 'offline',
    lastSync,
    dataAge,
  }
}

export function getSentinelFetchMode(): AdapterFetchMode {
  return lastFetchMode
}

export function getSentinelLastError(): string | undefined {
  return lastError
}

export function getSatelliteCacheFromSentinel(meta: SentinelSceneMeta | null): {
  status: 'fresh' | 'stale' | 'empty'
  ageHours: number
} {
  if (!meta) {
    return { status: 'empty', ageHours: 0 }
  }

  const ageHours = Math.floor(
    (Date.now() - meta.acquisitionStart.getTime()) / (3600 * 1000)
  )
  return {
    status: ageHours <= 72 ? 'fresh' : 'stale',
    ageHours,
  }
}

export { cachedMeta }
