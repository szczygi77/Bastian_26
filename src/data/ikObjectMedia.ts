import type { IKCategory } from '@/types'
import { IK_VERIFIED_COORDINATES } from '@/data/ikGeocoding'
import { getCameraPresets } from '@/data/ikCameraPresets'

export interface IKCameraFeed {
  id: string
  code: string
  label: string
  description: string
  zone: string
  previewUrl: string
  status: 'online' | 'offline' | 'degraded'
}

export interface IKObjectMedia {
  heroImage: string | null
  heroAvailable: boolean
  cameras: IKCameraFeed[]
}

function osmStaticPreview(lat: number, lng: number, zoom = 17): string {
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=${zoom}&size=640x360&maptype=mapnik&markers=${lat},${lng},red`
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

function defaultCameras(
  objectId: string,
  category: IKCategory,
  criticality: number,
  coordinates: [number, number],
): IKCameraFeed[] {
  const count = criticality >= 5 ? 3 : criticality >= 4 ? 2 : 1
  const presets = getCameraPresets(objectId, category, count)

  return presets.map((preset, i) => ({
    id: `${objectId}-cam-${i + 1}`,
    code: preset.code,
    label: preset.label,
    description: preset.description,
    zone: preset.zone,
    previewUrl: osmCameraPreview(coordinates[0], coordinates[1], i),
    status: (i === 0 ? 'online' : i === 2 ? 'degraded' : 'online') as IKCameraFeed['status'],
  }))
}

/** Synchroniczny fallback (OSM) — docelowe zdjęcia ładuje `objectMediaService`. */
export function getIkObjectMedia(
  objectId: string,
  category: IKCategory,
  criticality: number,
): IKObjectMedia {
  const coordinates = IK_VERIFIED_COORDINATES[objectId] ?? [50.565, 22.065]
  const cameras = defaultCameras(objectId, category, criticality, coordinates)
  return { heroImage: null, heroAvailable: false, cameras }
}
