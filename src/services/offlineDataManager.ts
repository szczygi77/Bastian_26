import { getLocalDb } from '@/db/localDb'
import type { PublicDataSourceStatus, PublicSourceStatus } from '@/types'

const META_PREFIX = 'public_cache:'
const HEALTH_PREFIX = 'public_health:'

export interface CachedSourcePayload<T = unknown> {
  data: T
  cachedAt: string
  ttlMinutes: number
}

export async function getCachedSource<T>(sourceName: string): Promise<CachedSourcePayload<T> | null> {
  const db = await getLocalDb()
  const row = await db.get('meta', `${META_PREFIX}${sourceName}`)
  if (!row?.value) return null
  try {
    return JSON.parse(row.value) as CachedSourcePayload<T>
  } catch {
    return null
  }
}

export async function updateCache<T>(
  sourceName: string,
  data: T,
  ttlMinutes = 60,
): Promise<void> {
  const db = await getLocalDb()
  const payload: CachedSourcePayload<T> = {
    data,
    cachedAt: new Date().toISOString(),
    ttlMinutes,
  }
  await db.put('meta', { key: `${META_PREFIX}${sourceName}`, value: JSON.stringify(payload) })
}

export async function markStale(sourceName: string): Promise<void> {
  const db = await getLocalDb()
  const health = await getSourceHealthEntry(sourceName)
  await db.put('meta', {
    key: `${HEALTH_PREFIX}${sourceName}`,
    value: JSON.stringify({ ...health, status: 'stale' as PublicSourceStatus, updatedAt: new Date().toISOString() }),
  })
}

export async function setSourceHealth(sourceName: string, health: Partial<PublicDataSourceStatus>): Promise<void> {
  const db = await getLocalDb()
  const current = await getSourceHealthEntry(sourceName)
  await db.put('meta', {
    key: `${HEALTH_PREFIX}${sourceName}`,
    value: JSON.stringify({ ...current, ...health, updatedAt: new Date().toISOString() }),
  })
}

async function getSourceHealthEntry(sourceName: string): Promise<Partial<PublicDataSourceStatus>> {
  const db = await getLocalDb()
  const row = await db.get('meta', `${HEALTH_PREFIX}${sourceName}`)
  if (!row?.value) return {}
  try {
    return JSON.parse(row.value) as Partial<PublicDataSourceStatus>
  } catch {
    return {}
  }
}

export async function getSourceHealth(): Promise<Partial<PublicDataSourceStatus>[]> {
  const db = await getLocalDb()
  const all = await db.getAll('meta')
  return all
    .filter(row => row.key.startsWith(HEALTH_PREFIX))
    .map(row => {
      try {
        return JSON.parse(row.value) as Partial<PublicDataSourceStatus>
      } catch {
        return {}
      }
    })
}

export async function enqueueAction(action: {
  entity: string
  entityId: string
  payload: Record<string, unknown>
}): Promise<void> {
  const db = await getLocalDb()
  const id = `sync-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  await db.put('sync_queue', {
    id,
    entity: action.entity as 'audit_entries',
    entityId: action.entityId,
    payload: action.payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
  })
}

export async function flushSyncQueue(): Promise<number> {
  const db = await getLocalDb()
  const queue = await db.getAll('sync_queue')
  for (const item of queue) {
    await db.delete('sync_queue', item.id)
  }
  return queue.length
}

export function isCacheStale(cachedAt: string, ttlMinutes: number): boolean {
  const ageMs = Date.now() - new Date(cachedAt).getTime()
  return ageMs > ttlMinutes * 60_000
}
