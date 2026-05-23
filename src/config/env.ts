/**
 * Zmienne środowiskowe (Vite: prefiks VITE_).
 * Sekrety trzymaj wyłącznie w pliku .env (gitignored).
 * NIGDY nie commituj .env ani kluczy API.
 */

function env(key: string): string | undefined {
  const v = import.meta.env[key]
  return typeof v === 'string' && v.length > 0 ? v : undefined
}

export const envConfig = {
  cdseClientId: env('VITE_CDSE_CLIENT_ID'),
  cdseClientSecret: env('VITE_CDSE_CLIENT_SECRET'),
  firmsApiKey: env('VITE_FIRMS_API_KEY'),
  /** Bearer z rejestracji API Client na opensky-network.org */
  openskyBearerToken: env('VITE_OPENSKY_BEARER_TOKEN'),
  /** Opcjonalnie: konto OpenSky (basic auth) */
  openskyUsername: env('VITE_OPENSKY_USERNAME'),
  openskyPassword: env('VITE_OPENSKY_PASSWORD'),
  openAiApiKey: env('VITE_OPENAI_API_KEY'),
  /** Google Maps — Street View / satelita dla podglądu obiektów IK */
  googleMapsApiKey: env('VITE_GOOGLE_MAPS_API_KEY'),
  /** Supabase — baza danych chmurowa (sync) */
  supabaseUrl: env('VITE_SUPABASE_URL'),
  supabaseAnonKey: env('VITE_SUPABASE_ANON_KEY'),
} as const

export function hasCdseCredentials(): boolean {
  return Boolean(envConfig.cdseClientId && envConfig.cdseClientSecret)
}

export function hasOpenSkyAuth(): boolean {
  return Boolean(
    envConfig.openskyBearerToken ||
      (envConfig.openskyUsername && envConfig.openskyPassword)
  )
}

export function hasGoogleMapsApiKey(): boolean {
  return Boolean(envConfig.googleMapsApiKey)
}

export function hasSupabaseConfig(): boolean {
  return Boolean(envConfig.supabaseUrl && envConfig.supabaseAnonKey)
}
