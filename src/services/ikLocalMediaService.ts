import type { ObjectMediaSource } from '@/services/objectMediaService'
import { probeImageUrl } from '@/services/imageProbe'

export interface LocalIkMediaEntry {
  file: string
  source: ObjectMediaSource
  attribution: string
}

interface LocalIkManifest {
  generatedAt?: string
  items: Record<string, LocalIkMediaEntry>
}

let manifestPromise: Promise<Record<string, LocalIkMediaEntry>> | null = null
const verifiedPaths = new Map<string, boolean>()

export function localIkHeroPath(objectId: string): string {
  return `/media/ik/${objectId}.jpg`
}

async function loadManifest(): Promise<Record<string, LocalIkMediaEntry>> {
  if (!manifestPromise) {
    manifestPromise = (async () => {
      try {
        const response = await fetch('/media/ik/manifest.json', { cache: 'no-cache' })
        if (!response.ok) return {}
        const data = (await response.json()) as LocalIkManifest
        return data.items ?? {}
      } catch {
        return {}
      }
    })()
  }
  return manifestPromise
}

export async function resolveLocalIkHero(
  objectId: string,
): Promise<{ url: string; source: ObjectMediaSource; attribution: string } | null> {
  const url = localIkHeroPath(objectId)
  const cached = verifiedPaths.get(url)
  if (cached === false) return null
  if (cached === true) {
    const manifest = await loadManifest()
    const entry = manifest[objectId]
    return {
      url,
      source: entry?.source ?? 'google_places',
      attribution: entry?.attribution ?? 'Google Maps',
    }
  }

  const manifest = await loadManifest()
  const entry = manifest[objectId]

  if (!entry && !(await probeImageUrl(url))) {
    verifiedPaths.set(url, false)
    return null
  }

  verifiedPaths.set(url, true)
  return {
    url,
    source: entry?.source ?? 'google_places',
    attribution: entry?.attribution ?? 'Google Maps',
  }
}
