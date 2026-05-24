import { getCachedSource, isCacheStale, updateCache, type CachedSourcePayload } from '@/services/offlineDataManager'

export async function readApiCache<T>(sourceId: string): Promise<CachedSourcePayload<T> | null> {
  const cached = await getCachedSource<T>(sourceId)
  if (!cached) return null
  if (isCacheStale(cached.cachedAt, cached.ttlMinutes)) {
    return { ...cached, data: cached.data }
  }
  return cached
}

export async function writeApiCache<T>(sourceId: string, data: T, ttlMinutes = 120): Promise<void> {
  await updateCache(sourceId, data, ttlMinutes)
}

/** Jednorazowa migracja legacy localStorage → IndexedDB. */
export async function migrateLegacyCache<T>(
  sourceId: string,
  localStorageKey: string,
  ttlMinutes = 120,
): Promise<T | null> {
  const existing = await getCachedSource<T>(sourceId)
  if (existing) return existing.data

  try {
    const raw = localStorage.getItem(localStorageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { data?: T; alerts?: T; timestamp?: number }
    const data = (parsed.data ?? parsed.alerts ?? parsed) as T
    await writeApiCache(sourceId, data, ttlMinutes)
    localStorage.removeItem(localStorageKey)
    return data
  } catch {
    return null
  }
}
