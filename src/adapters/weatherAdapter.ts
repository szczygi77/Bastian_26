import type { WeatherData, SyncStatus } from '@/types'

const STALOWA_WOLA_LAT = 50.579
const STALOWA_WOLA_LON = 22.040
const CACHE_KEY = 'bastion_weather_cache'
const TIMEOUT_MS = 8000

let lastSync: Date | null = null
let cachedData: WeatherData | null = null

export async function fetchWeather(): Promise<WeatherData> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${STALOWA_WOLA_LAT}&longitude=${STALOWA_WOLA_LON}&current=temperature_2m,wind_speed_10m,wind_direction_10m,precipitation,visibility,weather_code`
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const json = await res.json()
    const current = json.current

    const data: WeatherData = {
      temperature: current.temperature_2m,
      windSpeed: current.wind_speed_10m,
      windDirection: current.wind_direction_10m,
      precipitation: current.precipitation,
      visibility: current.visibility ?? 10000,
      condition: weatherCodeToCondition(current.weather_code),
      lastUpdate: new Date(),
    }

    cachedData = data
    lastSync = new Date()
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }))
    return data
  } catch {
    clearTimeout(timeoutId)
    return getFromCacheOrMock()
  }
}

function getFromCacheOrMock(): WeatherData {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (raw) {
      const { data } = JSON.parse(raw)
      return { ...data, lastUpdate: new Date(data.lastUpdate) }
    }
  } catch {}
  return getMockWeather()
}

function getMockWeather(): WeatherData {
  return {
    temperature: 14.2,
    windSpeed: 18,
    windDirection: 270,
    precipitation: 0,
    visibility: 8000,
    condition: 'Pochmurno',
    lastUpdate: new Date(),
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
  return {
    status: dataAge < 30 ? 'synced' : dataAge < 120 ? 'synced' : 'offline',
    lastSync,
    dataAge,
  }
}

export { cachedData }
