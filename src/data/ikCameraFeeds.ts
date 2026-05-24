import { PUBLIC_CAMERAS, type PublicCamera } from '@/data/publicCameras'

export type IkCameraFeedKind = 'hls' | 'simulated'

export interface IkCameraFeedMapping {
  ikObjectId: string
  kind: IkCameraFeedKind
  publicCameraId?: string
  sourceLabel: string
}

/** 3 obiekty IK z publicznym HLS (Stalowa Wola · TVK Stella) + 10 symulowanych z jawnym badge */
const IK_CAMERA_MAPPINGS: IkCameraFeedMapping[] = [
  {
    ikObjectId: 'hsw',
    kind: 'hls',
    publicCameraId: 'podkarpackie-stalowa-wola-popieluszki',
    sourceLabel: 'HLS LIVE · TVK Stella · ul. Popiełuszki',
  },
  {
    ikObjectId: 'elc',
    kind: 'hls',
    publicCameraId: 'podkarpackie-stalowa-wola-okulickiego',
    sourceLabel: 'HLS LIVE · TVK Stella · ul. Okulickiego',
  },
  {
    ikObjectId: 'most',
    kind: 'hls',
    publicCameraId: 'podkarpackie-stalowa-wola-1-sierpnia',
    sourceLabel: 'HLS LIVE · TVK Stella · ul. 1-go Sierpnia',
  },
  ...['szpital', 'wod', 'czk', 'bts', 'pkp', 'paliwo', 'policja', 'psp', 'osp', 'um'].map(ikObjectId => ({
    ikObjectId,
    kind: 'simulated' as const,
    sourceLabel: 'Symulacja regułowa · brak produkcyjnego RTSP',
  })),
]

const mappingByIkId = new Map(IK_CAMERA_MAPPINGS.map(mapping => [mapping.ikObjectId, mapping]))

export function getIkCameraFeedMapping(ikObjectId: string): IkCameraFeedMapping {
  return mappingByIkId.get(ikObjectId) ?? {
    ikObjectId,
    kind: 'simulated',
    sourceLabel: 'Symulacja regułowa · brak produkcyjnego RTSP',
  }
}

export function resolveIkPublicCamera(ikObjectId: string): PublicCamera | null {
  const mapping = getIkCameraFeedMapping(ikObjectId)
  if (mapping.kind !== 'hls' || !mapping.publicCameraId) return null
  return PUBLIC_CAMERAS.find(camera => camera.id === mapping.publicCameraId) ?? null
}

export function countLiveIkCameraFeeds(): number {
  return IK_CAMERA_MAPPINGS.filter(mapping => mapping.kind === 'hls').length
}

export function countSimulatedIkCameraFeeds(): number {
  return IK_CAMERA_MAPPINGS.filter(mapping => mapping.kind === 'simulated').length
}
