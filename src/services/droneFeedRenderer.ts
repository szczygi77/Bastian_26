import { MAP_LAYERS } from '@/config/mapLayers'
import type { DroneMission, MissionType } from '@/types'
import { interpolateCoords } from '@/services/missionSimulation'

const TILE_SIZE = 256
const TILE_URL = MAP_LAYERS.satellite.url

export type DroneFeedVisualMode = 'rgb' | 'thermal'

export interface DroneFeedCamera {
  centerLat: number
  centerLng: number
  zoom: number
  bearing: number
  pitch: number
  bank: number
  motionBlur: number
  targetMarker: boolean
  lookAtLat: number
  lookAtLng: number
}

const tilePromises = new Map<string, Promise<HTMLImageElement | null>>()
const tileImages = new Map<string, HTMLImageElement>()

function tileKey(z: number, x: number, y: number): string {
  return `${z}:${x}:${y}`
}

export function loadSatelliteTile(z: number, x: number, y: number): Promise<HTMLImageElement | null> {
  const maxIndex = Math.pow(2, z)
  if (x < 0 || y < 0 || x >= maxIndex || y >= maxIndex) {
    return Promise.resolve(null)
  }

  const key = tileKey(z, x, y)
  const cached = tileImages.get(key)
  if (cached) return Promise.resolve(cached)

  const pending = tilePromises.get(key)
  if (pending) return pending

  const promise = new Promise<HTMLImageElement | null>(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      tileImages.set(key, img)
      resolve(img)
    }
    img.onerror = () => resolve(null)
    img.src = TILE_URL.replace('{z}', String(z)).replace('{y}', String(y)).replace('{x}', String(x))
  })

  tilePromises.set(key, promise)
  return promise
}

export function latLngToWorldPixel(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const scale = TILE_SIZE * Math.pow(2, zoom)
  const x = ((lng + 180) / 360) * scale
  const sinLat = Math.sin((lat * Math.PI) / 180)
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale
  return { x, y }
}

export function worldPixelToLatLng(x: number, y: number, zoom: number): { lat: number; lng: number } {
  const scale = TILE_SIZE * Math.pow(2, zoom)
  const lng = (x / scale) * 360 - 180
  const n = Math.PI - (2 * Math.PI * y) / scale
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
  return { lat, lng }
}

function bearingRad(origin: [number, number], target: [number, number]): number {
  const [lat1, lng1] = origin
  const [lat2, lng2] = target
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return Math.atan2(y, x)
}

function offsetLatLng(lat: number, lng: number, dNorth: number, dEast: number): { lat: number; lng: number } {
  const latRad = (lat * Math.PI) / 180
  return {
    lat: lat + dNorth,
    lng: lng + dEast / Math.max(Math.cos(latRad), 0.2),
  }
}

function onSitePattern(
  mission: DroneMission,
  target: [number, number],
  timeSec: number,
): { lat: number; lng: number; zoom: number; bearing: number; pitch: number; bank: number; motionBlur: number } {
  const stepIndex = mission.currentActivityIndex ?? 0
  const activityTick = mission.activityTick ?? 0
  const [tLat, tLng] = target
  const type = mission.type
  const orbitBase = timeSec * 0.62 + (mission.onSiteTicks ?? 0) * 0.18

  if (type === 'perimeter_monitoring') {
    const angle = orbitBase + stepIndex * 0.45
    const radius = 0.00034
    return {
      lat: tLat + Math.cos(angle) * radius,
      lng: tLng + Math.sin(angle) * radius,
      zoom: 18.35,
      bearing: angle + Math.PI / 2,
      pitch: 0.42,
      bank: Math.sin(timeSec * 1.6) * 0.1,
      motionBlur: 0.1,
    }
  }

  if (type === 'reconnaissance') {
    const angle = orbitBase * 0.85
    const radius = 0.00028
    return {
      lat: tLat + Math.cos(angle) * radius,
      lng: tLng + Math.sin(angle) * radius,
      zoom: 18.1 + Math.sin(timeSec * 0.7) * 0.2,
      bearing: angle + Math.PI / 2,
      pitch: 0.46,
      bank: Math.sin(timeSec * 1.2) * 0.08,
      motionBlur: 0.08,
    }
  }

  if (type === 'thermal_inspection' || type === 'fire_assessment') {
    const sweep = Math.sin(timeSec * 0.55 + stepIndex) * 0.00014
    const drift = Math.cos(timeSec * 0.35) * 0.00008
    return {
      lat: tLat + drift,
      lng: tLng + sweep,
      zoom: 18.55 + Math.sin(timeSec * 0.4) * 0.12,
      bearing: timeSec * 0.18,
      pitch: 0.5,
      bank: Math.sin(timeSec * 1.1) * 0.05,
      motionBlur: 0.05,
    }
  }

  if (type === 'communication_relay') {
    return {
      lat: tLat + Math.sin(timeSec * 0.15) * 0.00004,
      lng: tLng + Math.cos(timeSec * 0.12) * 0.00004,
      zoom: 17.2,
      bearing: timeSec * 0.06,
      pitch: 0.28,
      bank: 0,
      motionBlur: 0.02,
    }
  }

  if (type === 'medical_delivery') {
    const landing = stepIndex >= 1
    const radius = landing ? 0.00003 : 0.00012 + (1 - Math.min(activityTick, 3) / 3) * 0.00008
    const angle = timeSec * (landing ? 0.1 : 0.42)
    return {
      lat: tLat + Math.cos(angle) * radius,
      lng: tLng + Math.sin(angle) * radius,
      zoom: landing ? 19.1 : 17.9 - stepIndex * 0.25,
      bearing: angle,
      pitch: landing ? 0.64 : 0.48,
      bank: landing ? 0 : Math.sin(timeSec * 1.5) * 0.07,
      motionBlur: landing ? 0.03 : 0.12,
    }
  }

  const angle = orbitBase * 0.75
  return {
    lat: tLat + Math.cos(angle) * 0.00022,
    lng: tLng + Math.sin(angle) * 0.00022,
    zoom: 18.05,
    bearing: angle + Math.PI / 2,
    pitch: 0.44,
    bank: Math.sin(timeSec) * 0.06,
    motionBlur: 0.07,
  }
}

export function computeDroneFeedCamera(mission: DroneMission, timeSec: number): DroneFeedCamera {
  const [targetLat, targetLng] = mission.targetCoordinates
  const progress = Math.min(1, Math.max(0, mission.progressPercent / 100))
  const routePos = interpolateCoords(mission.routeOrigin, mission.targetCoordinates, progress * 100)
  const routeBearing = bearingRad(mission.routeOrigin, mission.targetCoordinates)

  if (mission.status === 'on_site') {
    const pattern = onSitePattern(mission, mission.targetCoordinates, timeSec)
    return {
      centerLat: pattern.lat,
      centerLng: pattern.lng,
      zoom: pattern.zoom,
      bearing: pattern.bearing,
      pitch: pattern.pitch,
      bank: pattern.bank,
      motionBlur: pattern.motionBlur,
      targetMarker: true,
      lookAtLat: targetLat,
      lookAtLng: targetLng,
    }
  }

  if (mission.status === 'en_route' || mission.status === 'dispatched') {
    const flyProgress = mission.status === 'dispatched' ? Math.min(0.08, progress + 0.02) : progress
    const [flyLat, flyLng] = interpolateCoords(mission.routeOrigin, mission.targetCoordinates, flyProgress * 100)
    const sway = Math.sin(timeSec * 2.4) * 0.00004
    const strafe = Math.cos(timeSec * 1.9) * 0.00003
    const ahead = offsetLatLng(
      flyLat,
      flyLng,
      Math.cos(routeBearing) * (0.00012 + flyProgress * 0.00008) + sway,
      Math.sin(routeBearing) * (0.00012 + flyProgress * 0.00008) + strafe,
    )

    return {
      centerLat: ahead.lat,
      centerLng: ahead.lng,
      zoom: 14.8 + flyProgress * 3.4 + Math.sin(timeSec * 1.1) * 0.06,
      bearing: routeBearing + Math.sin(timeSec * 0.8) * 0.04,
      pitch: 0.58 - flyProgress * 0.18,
      bank: Math.sin(timeSec * 2.2) * 0.14,
      motionBlur: 0.18 + flyProgress * 0.14,
      targetMarker: flyProgress > 0.55,
      lookAtLat: targetLat,
      lookAtLng: targetLng,
    }
  }

  if (mission.status === 'returning') {
    const backProgress = 1 - progress
    const [flyLat, flyLng] = interpolateCoords(mission.routeOrigin, mission.targetCoordinates, progress)
    const bearing = bearingRad(mission.targetCoordinates, mission.routeOrigin)
    const sway = Math.sin(timeSec * 2) * 0.00003
    const ahead = offsetLatLng(
      flyLat,
      flyLng,
      Math.cos(bearing) * (0.0001 + backProgress * 0.00006) + sway,
      Math.sin(bearing) * (0.0001 + backProgress * 0.00006),
    )

    return {
      centerLat: ahead.lat,
      centerLng: ahead.lng,
      zoom: 15.2 + backProgress * 2.4,
      bearing,
      pitch: 0.5 - backProgress * 0.12,
      bank: Math.sin(timeSec * 2.1) * 0.1,
      motionBlur: 0.16,
      targetMarker: false,
      lookAtLat: mission.routeOrigin[0],
      lookAtLng: mission.routeOrigin[1],
    }
  }

  return {
    centerLat: routePos[0],
    centerLng: routePos[1],
    zoom: 17,
    bearing: routeBearing,
    pitch: 0.5,
    bank: 0,
    motionBlur: 0,
    targetMarker: true,
    lookAtLat: targetLat,
    lookAtLng: targetLng,
  }
}

function applyThermalOverlay(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, 'rgba(255, 40, 0, 0.22)')
  gradient.addColorStop(0.35, 'rgba(255, 200, 0, 0.12)')
  gradient.addColorStop(0.65, 'rgba(0, 180, 255, 0.14)')
  gradient.addColorStop(1, 'rgba(40, 0, 120, 0.24)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  ctx.globalCompositeOperation = 'color'
  ctx.fillStyle = '#7A3DFF'
  ctx.fillRect(0, 0, width, height)
  ctx.globalCompositeOperation = 'source-over'
}

function drawHorizon(ctx: CanvasRenderingContext2D, width: number, height: number, pitch: number): void {
  const horizonY = height * (0.16 + pitch * 0.24)
  const sky = ctx.createLinearGradient(0, 0, 0, horizonY)
  sky.addColorStop(0, '#020408')
  sky.addColorStop(1, 'rgba(2,4,8,0)')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, width, horizonY)

  ctx.strokeStyle = 'rgba(0,229,255,0.18)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, horizonY)
  ctx.lineTo(width, horizonY)
  ctx.stroke()
}

function drawHud(ctx: CanvasRenderingContext2D, width: number, height: number, mode: DroneFeedVisualMode): void {
  const cx = width / 2
  const cy = height / 2
  const color = mode === 'thermal' ? 'rgba(255,220,120,0.55)' : 'rgba(0,229,255,0.45)'

  ctx.strokeStyle = color
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(cx - 22, cy)
  ctx.lineTo(cx - 8, cy)
  ctx.moveTo(cx + 8, cy)
  ctx.lineTo(cx + 22, cy)
  ctx.moveTo(cx, cy - 22)
  ctx.lineTo(cx, cy - 8)
  ctx.moveTo(cx, cy + 8)
  ctx.lineTo(cx, cy + 22)
  ctx.stroke()

  ctx.strokeStyle = mode === 'thermal' ? 'rgba(255,180,80,0.2)' : 'rgba(0,229,255,0.15)'
  ctx.beginPath()
  ctx.arc(cx, cy, 38, 0, Math.PI * 2)
  ctx.stroke()
}

function drawLookAtMarker(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  camera: DroneFeedCamera,
  tileZoom: number,
  scale: number,
  mode: DroneFeedVisualMode,
): void {
  if (!camera.targetMarker) return

  const center = latLngToWorldPixel(camera.centerLat, camera.centerLng, tileZoom)
  const target = latLngToWorldPixel(camera.lookAtLat, camera.lookAtLng, tileZoom)
  const dx = (target.x - center.x) * scale
  const dy = (target.y - center.y) * scale
  const pitchScale = 0.55 + camera.pitch * 0.65

  ctx.save()
  ctx.translate(width / 2, height / 2)
  ctx.rotate(camera.bank)
  ctx.scale(1, pitchScale)
  ctx.rotate(camera.bearing)
  ctx.translate(dx, dy)

  const color = mode === 'thermal' ? 'rgba(255,120,40,0.9)' : 'rgba(255,138,31,0.92)'
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(0, 0, 14, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(-20, 0)
  ctx.lineTo(-8, 0)
  ctx.moveTo(8, 0)
  ctx.lineTo(20, 0)
  ctx.moveTo(0, -20)
  ctx.lineTo(0, -8)
  ctx.moveTo(0, 8)
  ctx.lineTo(0, 20)
  ctx.stroke()

  ctx.fillStyle = color
  ctx.font = `${Math.max(9, width * 0.012)}px monospace`
  ctx.textAlign = 'center'
  ctx.fillText('CEL IK', 0, -24)
  ctx.restore()
}

function drawFlightTrail(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  mission: DroneMission,
  camera: DroneFeedCamera,
  tileZoom: number,
  scale: number,
): void {
  if (mission.status !== 'en_route' && mission.status !== 'dispatched' && mission.status !== 'returning') return

  const center = latLngToWorldPixel(camera.centerLat, camera.centerLng, tileZoom)
  const origin = latLngToWorldPixel(mission.routeOrigin[0], mission.routeOrigin[1], tileZoom)
  const target = latLngToWorldPixel(mission.targetCoordinates[0], mission.targetCoordinates[1], tileZoom)
  const pitchScale = 0.55 + camera.pitch * 0.65

  ctx.save()
  ctx.translate(width / 2, height / 2)
  ctx.rotate(camera.bank)
  ctx.scale(1, pitchScale)
  ctx.rotate(camera.bearing)
  ctx.scale(scale, scale)
  ctx.translate(-center.x, -center.y)

  ctx.strokeStyle = 'rgba(0,229,255,0.35)'
  ctx.lineWidth = 2 / scale
  ctx.setLineDash([8 / scale, 6 / scale])
  ctx.beginPath()
  ctx.moveTo(origin.x, origin.y)
  ctx.lineTo(target.x, target.y)
  ctx.stroke()
  ctx.setLineDash([])

  ctx.fillStyle = 'rgba(0,229,255,0.85)'
  ctx.beginPath()
  ctx.arc(origin.x, origin.y, 4 / scale, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

function visibleTileRange(
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  scale: number,
  pitchScale: number,
): { minTileX: number; maxTileX: number; minTileY: number; maxTileY: number } {
  const halfW = width / (2 * scale)
  const halfH = height / (2 * scale * pitchScale)
  return {
    minTileX: Math.floor((centerX - halfW) / TILE_SIZE) - 1,
    maxTileX: Math.floor((centerX + halfW) / TILE_SIZE) + 1,
    minTileY: Math.floor((centerY - halfH) / TILE_SIZE) - 1,
    maxTileY: Math.floor((centerY + halfH) / TILE_SIZE) + 1,
  }
}

export function preloadVisibleDroneTiles(
  camera: DroneFeedCamera,
  width: number,
  height: number,
): void {
  const zoom = Math.max(14, Math.min(19, camera.zoom))
  const tileZoom = Math.floor(zoom)
  const scale = Math.pow(2, zoom - tileZoom)
  const center = latLngToWorldPixel(camera.centerLat, camera.centerLng, tileZoom)
  const pitchScale = 0.55 + camera.pitch * 0.65
  const { minTileX, maxTileX, minTileY, maxTileY } = visibleTileRange(center.x, center.y, width, height, scale, pitchScale)

  for (let ty = minTileY; ty <= maxTileY; ty++) {
    for (let tx = minTileX; tx <= maxTileX; tx++) {
      void loadSatelliteTile(tileZoom, tx, ty)
    }
  }
}

export function renderDroneSatelliteFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  camera: DroneFeedCamera,
  mode: DroneFeedVisualMode,
  timeSec: number,
  mission?: DroneMission,
): void {
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#05070A'
  ctx.fillRect(0, 0, width, height)

  const zoom = Math.max(14, Math.min(19, camera.zoom))
  const tileZoom = Math.floor(zoom)
  const scale = Math.pow(2, zoom - tileZoom)
  const center = latLngToWorldPixel(camera.centerLat, camera.centerLng, tileZoom)
  const pitchScale = 0.55 + camera.pitch * 0.65
  const forwardPx = camera.motionBlur * 42 * (1 + Math.sin(timeSec * 8) * 0.1)

  ctx.save()
  ctx.translate(width / 2, height / 2)
  ctx.rotate(camera.bank)
  ctx.scale(1, pitchScale)
  ctx.rotate(camera.bearing)
  ctx.translate(-forwardPx * Math.cos(camera.bearing), -forwardPx * Math.sin(camera.bearing))
  ctx.scale(scale, scale)
  ctx.translate(-center.x, -center.y)

  const { minTileX, maxTileX, minTileY, maxTileY } = visibleTileRange(center.x, center.y, width, height, scale, pitchScale)

  for (let ty = minTileY; ty <= maxTileY; ty++) {
    for (let tx = minTileX; tx <= maxTileX; tx++) {
      const img = tileImages.get(tileKey(tileZoom, tx, ty))
      if (img) {
        ctx.drawImage(img, tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE)
      } else {
        ctx.fillStyle = '#0B1218'
        ctx.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE)
        void loadSatelliteTile(tileZoom, tx, ty)
      }
    }
  }
  ctx.restore()

  if (mission) {
    drawFlightTrail(ctx, width, height, mission, camera, tileZoom, scale)
  }

  if (camera.motionBlur > 0.05) {
    ctx.save()
    ctx.globalAlpha = 0.12
    ctx.translate(width / 2, height / 2)
    ctx.rotate(camera.bearing)
    ctx.fillStyle = '#000'
    ctx.fillRect(-width, -height * 0.05, width * 2, height * 0.12)
    ctx.restore()
  }

  drawHorizon(ctx, width, height, camera.pitch)

  if (mode === 'thermal') {
    applyThermalOverlay(ctx, width, height)
  } else {
    ctx.fillStyle = 'rgba(57,255,20,0.04)'
    ctx.fillRect(0, 0, width, height)
  }

  const vignette = ctx.createRadialGradient(width / 2, height / 2, width * 0.2, width / 2, height / 2, width * 0.72)
  vignette.addColorStop(0, 'transparent')
  vignette.addColorStop(1, 'rgba(0,0,0,0.55)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = mode === 'thermal' ? 'rgba(255,255,255,0.025)' : 'rgba(57,255,20,0.035)'
  for (let y = 0; y < height; y += 3) {
    ctx.fillRect(0, y, width, 1)
  }

  drawLookAtMarker(ctx, width, height, camera, tileZoom, scale, mode)
  drawHud(ctx, width, height, mode)
}

export function missionTypeFeedHint(type: MissionType): string {
  const hints: Record<MissionType, string> = {
    reconnaissance: 'ORBITA ROZPOZNAWCZA',
    thermal_inspection: 'SKAN TERMICZNY',
    perimeter_monitoring: 'PATROL PERIMETRU',
    communication_relay: 'STacja RELAY',
    fire_assessment: 'OCENA TERMO-RGB',
    medical_delivery: 'PODEJŚCIE LZ',
  }
  return hints[type]
}
