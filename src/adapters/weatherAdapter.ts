import type { WeatherData, SyncStatus } from '@/types'
import type { AdapterFetchMode } from '@/adapters/adapterState'
import { migrateLegacyCache, readApiCache, writeApiCache } from '@/services/publicApiCache'

const STALOWA_WOLA_LAT = 50.579
const STALOWA_WOLA_LON = 22.040
const CACHE_KEY = 'bastion_weather_cache'
const CACHE_SOURCE = 'weather'
const TIMEOUT_MS = 10000

let lastSync: Date | null = null
let cachedData: WeatherData | null = null
let lastFetchMode: AdapterFetchMode = 'empty'
let lastError: string | undefined

function buildForecastUrl(): string {
  const params = new URLSearchParams({
    latitude: String(STALOWA_WOLA_LAT),
    longitude: String(STALOWA_WOLA_LON),
    timezone: 'auto',
    current: [
      'temperature_2m',
      'wind_speed_10m',
      'wind_direction_10m',
      'precipitation',
      'visibility',
      'weather_code',
      'cloud_cover',
      'rain',
    ].join(','),
    hourly: [
      'temperature_2m',
      'wind_speed_10m',
      'wind_speed_180m',
      'wind_direction_80m',
      'cloud_cover',
      'rain',
    ].join(','),
    forecast_days: '2',
  })
  return `https://api.open-meteo.com/v1/forecast?${params}`
}

function readCacheSync(): WeatherData | null {
  return cachedData
}

async function readCacheAsync(): Promise<WeatherData | null> {
  if (cachedData) return cachedData
  const migrated = await migrateLegacyCache<WeatherData>(CACHE_SOURCE, CACHE_KEY, 120)
  if (migrated) {
    cachedData = migrated
    lastFetchMode = 'cached'
    return migrated
  }
  const cached = await readApiCache<WeatherData>(CACHE_SOURCE)
  if (!cached) return null
  cachedData = cached.data
  lastFetchMode = 'cached'
  lastSync = new Date(cached.cachedAt)
  return cached.data
}

function unavailableWeather(reason: string): WeatherData {
  return {
    temperature: 0,
    windSpeed: 0,
    windDirection: 0,
    precipitation: 0,
    visibility: 0,
    condition: reason,
    lastUpdate: new Date(),
    cloudCover: 0,
    rainMm: 0,
  }
}

export async function fetchWeather(): Promise<WeatherData> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(buildForecastUrl(), { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const json = await res.json()
    const current = json.current
    const hourly = json.hourly
    const hIdx = hourly?.time?.length ? hourly.time.length - 1 : 0

    const data: WeatherData = {
      temperature: current.temperature_2m,
      windSpeed: current.wind_speed_10m,
      windDirection: current.wind_direction_10m,
      precipitation: current.precipitation ?? 0,
      visibility: current.visibility ?? 10000,
      condition: weatherCodeToCondition(current.weather_code),
      lastUpdate: new Date(),
      cloudCover: current.cloud_cover ?? hourly?.cloud_cover?.[hIdx],
      rainMm: current.rain ?? hourly?.rain?.[hIdx] ?? 0,
      windSpeed180m: hourly?.wind_speed_180m?.[hIdx],
      windDirection80m: hourly?.wind_direction_80m?.[hIdx],
    }

    cachedData = data
    lastSync = new Date()
    lastFetchMode = 'live'
    lastError = undefined
    await writeApiCache(CACHE_SOURCE, data, 120)
    return data
  } catch (error) {
    clearTimeout(timeoutId)
    lastError = error instanceof Error ? error.message : 'fetch failed'
    const cached = readCacheSync() ?? (await readCacheAsync())
    if (cached) {
      lastFetchMode = 'cached'
      cachedData = cached
      return cached
    }
    lastFetchMode = 'error'
    return unavailableWeather('Brak danych pogodowych')
  }
}

function weatherCodeToCondition(code: number): string {
  if (code === 0) return 'Bezchmurnie'
  if (code <= 3) return 'Pochmurno'
  if (code <= 48) return 'Mgła'
  if (code <= 67) return 'Deszcz'
  if (code <= 77) return 'Śnieg'
  if (code <= 82) return 'Przelotne opady'
  if (code >= 95) return 'Burza'
  return 'Nieznane'
}

export function getWeatherSyncStatus(): SyncStatus {
  const dataAge = lastSync ? Math.floor((Date.now() - lastSync.getTime()) / 60000) : 999
  const status =
    lastFetchMode === 'error' || lastFetchMode === 'empty'
      ? 'error'
      : lastFetchMode === 'cached'
        ? 'offline'
        : dataAge < 120
          ? 'synced'
          : 'offline'

  return { status, lastSync, dataAge }
}

export function getWeatherFetchMode(): AdapterFetchMode {
  return lastFetchMode
}

export function getWeatherLastError(): string | undefined {
  return lastError
}

export { cachedData }
