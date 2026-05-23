import type { IKObject } from '@/types'
import type { IKCameraFeed, IKObjectMedia } from '@/data/ikObjectMedia'
import { getIkObjectMedia } from '@/data/ikObjectMedia'
import { hasGoogleMapsApiKey } from '@/config/env'
import {
  googleStreetViewUrl,
  resolveGoogleHeroImage,
} from '@/services/googleMediaService'
import { getCameraPresets } from '@/data/ikCameraPresets'
import { isLikelyLogoUrl, probeImageUrl } from '@/services/imageProbe'

export type ObjectMediaSource =
  | 'google_places'
  | 'google_satellite'
  | 'streetview'
  | 'wikimedia'
  | 'wikipedia'
  | 'osm'

export interface ResolvedIKObjectMedia extends IKObjectMedia {
  source: ObjectMediaSource
  attribution?: string
}

const WIKI_USER_AGENT = 'BastionIK/1.0 (demo; +https://gitlab.com/michas7/bastion)'

/** Zweryfikowane bezpośrednie URL-e Wikimedia Commons. */
const COMMONS_HERO: Partial<Record<string, string>> = {
  hsw: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Dyrekcja_Naczelna.jpg/960px-Dyrekcja_Naczelna.jpg',
  elc: 'https://upload.wikimedia.org/wikipedia/commons/8/85/Elektrownia_Stalowa_Wola.jpg',
  pkp: 'https://upload.wikimedia.org/wikipedia/commons/2/25/Stalowa_Wola_Rozwad%C3%B3w_05.jpg',
}

const WIKIDATA_QID: Partial<Record<string, string>> = {
  hsw: 'Q4899048',
  elc: 'Q9252510',
}

/** Tylko strony z sensownym zdjęciem budynku — bez logo/herbu miasta. */
const WIKIPEDIA_TITLE: Partial<Record<string, string>> = {
  elc: 'Elektrownia_Stalowa_Wola',
  pkp: 'Stalowa_Wola_Rozwadów',
  czk: 'Starostwo_Powiatowe_w_Stalowej_Woli',
}

const STREET_VIEW_HEADINGS = [0, 120, 240]

const cache = new Map<string, ResolvedIKObjectMedia>()
const inflight = new Map<string, Promise<ResolvedIKObjectMedia>>()
const listeners = new Set<() => void>()

function notifyListeners(): void {
  listeners.forEach(listener => listener())
}

export function subscribeIkObjectMedia(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getCachedIkObjectMedia(objectId: string): ResolvedIKObjectMedia | undefined {
  return cache.get(objectId)
}

export function prefetchIkObjectMedia(obj: IKObject): void {
  void resolveIkObjectMedia(obj)
}

export function resolveIkObjectMedia(obj: IKObject): Promise<ResolvedIKObjectMedia> {
  const cached = cache.get(obj.id)
  if (cached) return Promise.resolve(cached)

  const pending = inflight.get(obj.id)
  if (pending) return pending

  const promise = buildObjectMedia(obj)
    .then(result => {
      cache.set(obj.id, result)
      inflight.delete(obj.id)
      notifyListeners()
      return result
    })
    .catch(() => {
      const fallback = toResolved(getIkObjectMedia(obj.id, obj.category, obj.criticality), 'osm')
      cache.set(obj.id, fallback)
      inflight.delete(obj.id)
      notifyListeners()
      return fallback
    })

  inflight.set(obj.id, promise)
  return promise
}

function toResolved(media: IKObjectMedia, source: ObjectMediaSource, attribution?: string): ResolvedIKObjectMedia {
  return { ...media, source, attribution }
}

function commonsFileUrl(filename: string, width = 800): string {
  const normalized = filename.trim().replace(/ /g, '_')
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(normalized)}?width=${width}`
}

function osmCameraPreview(lat: number, lng: number, index: number): string {
  const offsets: Array<[number, number, number]> = [
    [0, 0, 17],
    [0.00035, 0.00015, 16],
    [-0.00025, -0.0002, 16],
  ]
  const [dLat, dLng, zoom] = offsets[index] ?? offsets[0]
  const camLat = lat + dLat
  const camLng = lng + dLng
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${camLat},${camLng}&zoom=${zoom}&size=640x360&maptype=mapnik&markers=${lat},${lng},red`
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Api-User-Agent': WIKI_USER_AGENT,
      },
    })
    if (!response.ok) return null
    return (await response.json()) as T
  } catch {
    return null
  }
}

interface WikipediaSummary {
  thumbnail?: { source: string }
  originalimage?: { source: string }
  title?: string
}

async function fetchWikipediaHero(title: string): Promise<{ url: string; attribution: string } | null> {
  const data = await fetchJson<WikipediaSummary>(
    `https://pl.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
  )
  const url = data?.originalimage?.source ?? data?.thumbnail?.source
  if (!url || isLikelyLogoUrl(url)) return null
  return {
    url,
    attribution: `Wikipedia: ${data?.title ?? title.replace(/_/g, ' ')}`,
  }
}

async function fetchWikidataImage(qid: string): Promise<{ url: string; attribution: string } | null> {
  const data = await fetchJson<{
    entities?: Record<string, { claims?: { P18?: Array<{ mainsnak?: { datavalue?: { value?: string } } }> } }>
  }>(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`)

  const filename = data?.entities?.[qid]?.claims?.P18?.[0]?.mainsnak?.datavalue?.value
  if (!filename || isLikelyLogoUrl(filename)) return null

  return {
    url: commonsFileUrl(filename, 960),
    attribution: `Wikimedia Commons (${filename})`,
  }
}

function googleSourceKind(kind: 'places' | 'streetview' | 'satellite'): ObjectMediaSource {
  if (kind === 'places') return 'google_places'
  if (kind === 'satellite') return 'google_satellite'
  return 'streetview'
}

interface ResolvedHero {
  url: string | null
  source: ObjectMediaSource
  attribution?: string
  available: boolean
}

async function resolveHeroImage(obj: IKObject): Promise<ResolvedHero> {
  const [lat, lng] = obj.coordinates

  if (hasGoogleMapsApiKey()) {
    const google = await resolveGoogleHeroImage(obj.id, obj.name, lat, lng)
    if (google && await probeImageUrl(google.url)) {
      return {
        url: google.url,
        source: googleSourceKind(google.kind),
        attribution: google.attribution,
        available: true,
      }
    }
  }

  const commonsDirect = COMMONS_HERO[obj.id]
  if (commonsDirect && await probeImageUrl(commonsDirect)) {
    return {
      url: commonsDirect,
      source: 'wikimedia',
      attribution: 'Wikimedia Commons',
      available: true,
    }
  }

  const qid = WIKIDATA_QID[obj.id]
  if (qid) {
    const wikidata = await fetchWikidataImage(qid)
    if (wikidata && await probeImageUrl(wikidata.url)) {
      return {
        url: wikidata.url,
        source: 'wikimedia',
        attribution: wikidata.attribution,
        available: true,
      }
    }
  }

  const wikiTitle = WIKIPEDIA_TITLE[obj.id]
  if (wikiTitle) {
    const wiki = await fetchWikipediaHero(wikiTitle)
    if (wiki && await probeImageUrl(wiki.url)) {
      return {
        url: wiki.url,
        source: 'wikipedia',
        attribution: wiki.attribution,
        available: true,
      }
    }
  }

  return { url: null, source: 'osm', available: false }
}

function buildCameraFeeds(
  obj: IKObject,
  previewForIndex: (index: number) => string,
): IKCameraFeed[] {
  const count = obj.criticality >= 5 ? 3 : obj.criticality >= 4 ? 2 : 1
  const presets = getCameraPresets(obj.id, obj.category, count)

  return presets.map((preset, index) => ({
    id: `${obj.id}-cam-${index + 1}`,
    code: preset.code,
    label: preset.label,
    description: preset.description,
    zone: preset.zone,
    previewUrl: previewForIndex(index),
    status: (index === 0 ? 'online' : index === 2 ? 'degraded' : 'online') as IKCameraFeed['status'],
  }))
}

function buildStreetViewCameras(obj: IKObject): IKCameraFeed[] {
  const [lat, lng] = obj.coordinates
  return buildCameraFeeds(obj, index => {
    const heading = STREET_VIEW_HEADINGS[index] ?? index * 120
    return googleStreetViewUrl(lat, lng, heading) ?? osmCameraPreview(lat, lng, index)
  })
}

function buildOsmCameras(obj: IKObject): IKCameraFeed[] {
  const [lat, lng] = obj.coordinates
  return buildCameraFeeds(obj, index => osmCameraPreview(lat, lng, index))
}

async function buildObjectMedia(obj: IKObject): Promise<ResolvedIKObjectMedia> {
  const hero = await resolveHeroImage(obj)

  const useGoogleCameras = hasGoogleMapsApiKey() && (
    hero.source === 'google_places' ||
    hero.source === 'streetview' ||
    hero.source === 'google_satellite'
  )

  const cameras = useGoogleCameras
    ? buildStreetViewCameras(obj)
    : buildOsmCameras(obj)

  return {
    heroImage: hero.url,
    heroAvailable: hero.available,
    cameras,
    source: hero.source,
    attribution: hero.available ? hero.attribution : undefined,
  }
}
