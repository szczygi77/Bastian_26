import { fetchIkCoordinates } from '@/adapters/osmAdapter'
import { DRONE_IK_BASE_MAP } from '@/data/ikGeocoding'
import { IK_OBJECTS, STALOWA_WOLA_CENTER } from '@/data/stalowa-wola'
import type { DroneUnit, IKObject } from '@/types'

export function computeMapCenter(objects: IKObject[]): [number, number] {
  if (objects.length === 0) return STALOWA_WOLA_CENTER

  const lat = objects.reduce((sum, o) => sum + o.coordinates[0], 0) / objects.length
  const lon = objects.reduce((sum, o) => sum + o.coordinates[1], 0) / objects.length
  return [lat, lon]
}

export function mergeIkCoordinates(
  objects: IKObject[],
  coords: Map<string, [number, number]>
): IKObject[] {
  return objects.map(obj => {
    const resolved = coords.get(obj.id)
    return resolved ? { ...obj, coordinates: resolved } : obj
  })
}

export function syncDroneCoordinates(
  drones: DroneUnit[],
  objects: IKObject[]
): DroneUnit[] {
  const byId = new Map(objects.map(o => [o.id, o]))

  return drones.map(drone => {
    const ikId = DRONE_IK_BASE_MAP[drone.id]
    const base = ikId ? byId.get(ikId) : undefined
    return base ? { ...drone, coordinates: base.coordinates } : drone
  })
}

export async function resolveIkLocations(options?: {
  force?: boolean
  onProgress?: (id: string) => void
}): Promise<{
  objects: IKObject[]
  resolvedCount: number
  totalCount: number
  mapCenter: [number, number]
}> {
  const baseObjects = IK_OBJECTS
  const coords = await fetchIkCoordinates(options)
  const objects = mergeIkCoordinates(baseObjects, coords)

  return {
    objects,
    resolvedCount: coords.size,
    totalCount: baseObjects.length,
    mapCenter: computeMapCenter(objects),
  }
}
