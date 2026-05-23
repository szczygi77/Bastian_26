import { useEffect, useState } from 'react'
import type { IKObject } from '@/types'
import type { IKObjectMedia } from '@/data/ikObjectMedia'
import { getIkObjectMedia } from '@/data/ikObjectMedia'
import {
  getCachedIkObjectMedia,
  prefetchIkObjectMedia,
  resolveIkObjectMedia,
  subscribeIkObjectMedia,
  type ObjectMediaSource,
  type ResolvedIKObjectMedia,
} from '@/services/objectMediaService'

interface UseIkObjectMediaResult {
  media: IKObjectMedia
  source: ObjectMediaSource
  loading: boolean
  attribution?: string
}

export function useIkObjectMedia(object: IKObject): UseIkObjectMediaResult {
  const fallback = getIkObjectMedia(object.id, object.category, object.criticality)
  const [media, setMedia] = useState<ResolvedIKObjectMedia>(() =>
    getCachedIkObjectMedia(object.id) ?? { ...fallback, source: 'osm' },
  )
  const [loading, setLoading] = useState(() => !getCachedIkObjectMedia(object.id))

  useEffect(() => {
    const cached = getCachedIkObjectMedia(object.id)
    if (cached) {
      setMedia(cached)
      setLoading(false)
      return
    }

    setLoading(true)
    setMedia({ ...getIkObjectMedia(object.id, object.category, object.criticality), source: 'osm' })

    let cancelled = false
    void resolveIkObjectMedia(object).then(resolved => {
      if (!cancelled) {
        setMedia(resolved)
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [object.id, object.category, object.criticality, object.coordinates])

  useEffect(() => {
    return subscribeIkObjectMedia(() => {
      const cached = getCachedIkObjectMedia(object.id)
      if (cached) setMedia(cached)
    })
  }, [object.id])

  return {
    media,
    source: media.source,
    loading,
    attribution: media.attribution,
  }
}

export function prefetchAllIkObjectMedia(objects: IKObject[]): void {
  for (const obj of objects) {
    prefetchIkObjectMedia(obj)
  }
}
