import { envConfig, hasGoogleMapsApiKey } from '@/config/env'

export interface GoogleMediaResult {
  url: string
  attribution: string
}

interface PlacesSearchResponse {
  places?: Array<{
    displayName?: { text?: string }
    photos?: Array<{ name?: string }>
  }>
}

interface StreetViewMetadataResponse {
  status?: string
}

/** Zapytania Google Places dopasowane do obiektów IK w Stalowej Woli. */
export const GOOGLE_PLACE_QUERY: Record<string, string> = {
  hsw: 'Huta Stalowa Wola',
  elc: 'Elektrociepłownia Stalowa Wola',
  szpital: 'Szpital Specjalistyczny im. Edmunda Biernackiego Stalowa Wola',
  wod: 'Przedsiębiorstwo Wodociągów i Kanalizacji Stalowa Wola',
  most: 'Most na Sanie Stalowa Wola',
  czk: 'Starostwo Powiatowe Stalowa Wola',
  bts: 'Stalowa Wola maszt telekomunikacyjny',
  pkp: 'Stacja Stalowa Wola Rozwadów',
  paliwo: 'PERN Stalowa Wola',
  policja: 'Komenda Powiatowa Policji Stalowa Wola',
  psp: 'Państwowa Straż Pożarna Stalowa Wola',
  osp: 'OSP Stalowa Wola',
  um: 'Urząd Miasta Stalowa Wola',
}

export function googleStreetViewUrl(
  lat: number,
  lng: number,
  heading: number,
  pitch = 0,
  size = '640x360',
): string | null {
  const key = envConfig.googleMapsApiKey
  if (!key) return null

  const params = new URLSearchParams({
    size,
    location: `${lat},${lng}`,
    fov: '80',
    heading: String(heading),
    pitch: String(pitch),
    key,
  })
  return `https://maps.googleapis.com/maps/api/streetview?${params}`
}

export function googleSatelliteUrl(lat: number, lng: number, zoom = 17): string | null {
  const key = envConfig.googleMapsApiKey
  if (!key) return null

  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: String(zoom),
    size: '640x360',
    maptype: 'satellite',
    key,
  })
  return `https://maps.googleapis.com/maps/api/staticmap?${params}`
}

export async function hasStreetViewImagery(lat: number, lng: number): Promise<boolean> {
  const key = envConfig.googleMapsApiKey
  if (!key) return false

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&key=${key}`,
    )
    if (!response.ok) return false
    const data = (await response.json()) as StreetViewMetadataResponse
    return data.status === 'OK'
  } catch {
    return false
  }
}

export async function fetchGooglePlacePhoto(
  query: string,
  lat: number,
  lng: number,
): Promise<GoogleMediaResult | null> {
  const key = envConfig.googleMapsApiKey
  if (!key) return null

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.displayName,places.photos',
      },
      body: JSON.stringify({
        textQuery: `${query}, Stalowa Wola, Polska`,
        locationBias: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: 900,
          },
        },
        maxResultCount: 1,
      }),
    })

    if (!response.ok) return null

    const data = (await response.json()) as PlacesSearchResponse
    const place = data.places?.[0]
    const photoName = place?.photos?.[0]?.name
    if (!photoName) return null

    const photoParams = new URLSearchParams({
      maxHeightPx: '480',
      maxWidthPx: '960',
      key,
    })

    return {
      url: `https://places.googleapis.com/v1/${photoName}/media?${photoParams}`,
      attribution: `Google Maps · ${place.displayName?.text ?? query}`,
    }
  } catch {
    return null
  }
}

export async function resolveGoogleHeroImage(
  objectId: string,
  objectName: string,
  lat: number,
  lng: number,
): Promise<(GoogleMediaResult & { kind: 'places' | 'streetview' | 'satellite' }) | null> {
  if (!hasGoogleMapsApiKey()) return null

  const query = GOOGLE_PLACE_QUERY[objectId] ?? objectName
  const placePhoto = await fetchGooglePlacePhoto(query, lat, lng)
  if (placePhoto) {
    return { ...placePhoto, kind: 'places' }
  }

  const streetViewAvailable = await hasStreetViewImagery(lat, lng)
  if (streetViewAvailable) {
    const url = googleStreetViewUrl(lat, lng, 0, 5)
    if (url) {
      return {
        url,
        attribution: 'Google Street View',
        kind: 'streetview',
      }
    }
  }

  const satellite = googleSatelliteUrl(lat, lng)
  if (satellite) {
    return {
      url: satellite,
      attribution: 'Google Maps (satelita)',
      kind: 'satellite',
    }
  }

  return null
}
