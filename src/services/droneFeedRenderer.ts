import { MAP_LAYERS } from '@/config/mapLayers'
import type { DroneMission, MissionType } from '@/types'

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
}

const tileCache = new Map<string, Promise<HTMLImageElement | null>>()

function tileKey(z: number, x: number, y: number): string {
  return `${z}:${x}:${y}`
}

export function loadSatelliteTile(z: number, x: number, y: number): Promise<HTMLImageElement | null> {
  const maxIndex = Math.pow(2, z)
  if (x < 0 || y < 0 || x >= maxIndex || y >= maxIndex) {
    return Promise.resolve(null)
  }

  const key = tileKey(z, x, y)
  const cached = tileCache.get(key)
  if (cached) return cached

  const promise = new Promise<HTMLImageElement | null>(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = TILE_URL.replace('{z}', String(z)).replace('{y}', String(y)).replace('{x}', String(x))
  })

  tileCache.set(key, promise)
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

  if (type === 'perimeter_monitoring') {
    const angle = timeSec * 0.45 + stepIndex * 0.6
    const radius = 0.00022
    return {
      lat: tLat + Math.cos(angle) * radius,
      lng: tLng + Math.sin(angle) * radius,
      zoom: 18.2,
      bearing: angle + Math.PI / 2,
      pitch: 0.38,
      bank: Math.sin(timeSec * 1.4) * 0.08,
      motionBlur: 0.12,
    }
  }

  if (type === 'reconnaissance') {
    const angle = timeSec * 0.28
    const radius = 0.00016
    return {
      lat: tLat + Math.cos(angle) * radius,
      lng: tLng + Math.sin(angle) * radius,
      zoom: 18 + Math.sin(timeSec * 0.8) * 0.25,
      bearing: angle + Math.PI / 2,
      pitch: 0.42,
      bank: Math.sin(timeSec) * 0.06,
      motionBlur: 0.1,
    }
  }

  if (type === 'thermal_inspection' || type === 'fire_assessment') {
    const sweep = Math.sin(timeSec * 0.55 + stepIndex) * 0.00012
    const drift = Math.cos(timeSec * 0.35) * 0.00006
    return {
      lat: tLat + drift,
      lng: tLng + sweep,
      zoom: 18.6 + Math.sin(timeSec * 0.4) * 0.15,
      bearing: timeSec * 0.12,
      pitch: 0.48,
      bank: Math.sin(timeSec * 1.1) * 0.04,
      motionBlur: 0.06,
    }
  }

  if (type === 'communication_relay') {
    return {
      lat: tLat + Math.sin(timeSec * 0.15) * 0.00003,
      lng: tLng + Math.cos(timeSec * 0.12) * 0.00003,
      zoom: 16.8,
      bearing: timeSec * 0.05,
      pitch: 0.25,
      bank: 0,
      motionBlur: 0.02,
    }
  }

  if (type === 'medical_delivery') {
    const landing = stepIndex >= 1
    const radius = landing ? 0.00002 : 0.00008 + (1 - Math.min(activityTick, 3) / 3) * 0.00006
    const angle = timeSec * (landing ? 0.08 : 0.35)
    return {
      lat: tLat + Math.cos(angle) * radius,
      lng: tLng + Math.sin(angle) * radius,
      zoom: landing ? 19.2 : 17.8 - stepIndex * 0.3,
      bearing: angle,
      pitch: landing ? 0.62 : 0.45,
      bank: landing ? 0 : Math.sin(timeSec * 1.5) * 0.07,
      motionBlur: landing ? 0.03 : 0.14,
    }
  }

  const angle = timeSec * 0.32
  return {
    lat: tLat + Math.cos(angle) * 0.00014,
    lng: tLng + Math.sin(angle) * 0.00014,
    zoom: 18,
    bearing: angle,
    pitch: 0.4,
    bank: Math.sin(timeSec) * 0.05,
    motionBlur: 0.08,
  }
}

export function computeDroneFeedCamera(mission: DroneMission, timeSec: number): DroneFeedCamera {
  const [targetLat, targetLng] = mission.targetCoordinates
  const [curLat, curLng] = mission.currentPosition
  const progress = mission.progressPercent / 100

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
    }
  }

  if (mission.status === 'en_route' || mission.status === 'dispatched') {
    const bearing = bearingRad(mission.routeOrigin, mission.targetCoordinates)
    const forward = 0.00008 + progress * 0.00004
    const sway = Math.sin(timeSec * 2.2) * 0.000025
    const strafe = Math.cos(timeSec * 1.7) * 0.000018
    const ahead = offsetLatLng(curLat, curLng, Math.cos(bearing) * forward, Math.sin(bearing) * forward)
    const jitter = offsetLatLng(ahead.lat, ahead.lng, sway, strafe)

    return {
      centerLat: jitter.lat,
      centerLng: jitter.lng,
      zoom: 15.2 + progress * 2.8 + Math.sin(timeSec * 1.3) * 0.08,
      bearing,
      pitch: 0.52 - progress * 0.12,
      bank: Math.sin(timeSec * 2.5) * 0.12,
      motionBlur: 0.22 + progress * 0.12,
      targetMarker: progress > 0.72,
    }
  }

  if (mission.status === 'returning') {
    const bearing = bearingRad(mission.targetCoordinates, mission.routeOrigin)
    const backProgress = 1 - progress
    const forward = 0.00006 + backProgress * 0.00004
    const sway = Math.sin(timeSec * 2) * 0.00002
    const ahead = offsetLatLng(curLat, curLng, Math.cos(bearing) * forward, Math.sin(bearing) * forward)

    return {
      centerLat: ahead.lat + sway,
      centerLng: ahead.lng + Math.cos(timeSec * 1.5) * 0.000015,
      zoom: 15.5 + backProgress * 2.2,
      bearing,
      pitch: 0.48 - backProgress * 0.1,
      bank: Math.sin(timeSec * 2.2) * 0.1,
      motionBlur: 0.18,
      targetMarker: false,
    }
  }

  return {
    centerLat: targetLat,
    centerLng: targetLng,
    zoom: 17,
    bearing: 0,
    pitch: 0.5,
    bank: 0,
    motionBlur: 0,
    targetMarker: true,
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
  const horizonY = height * (0.18 + pitch * 0.22)
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

function drawHud(ctx: CanvasRenderingContext2D, width: number, height: number, mode: DroneFeedVisualMode, camera: DroneFeedCamera): void {
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

  if (camera.targetMarker) {
    ctx.strokeStyle = mode === 'thermal' ? 'rgba(255,120,40,0.75)' : 'rgba(255,138,31,0.75)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(cx, cy + 12, 10, 0, Math.PI * 2)
    ctx.stroke()
  }
}

export async function renderDroneSatelliteFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  camera: DroneFeedCamera,
  mode: DroneFeedVisualMode,
  timeSec: number,
): Promise<void> {
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#05070A'
  ctx.fillRect(0, 0, width, height)

  const zoom = Math.max(14, Math.min(19, camera.zoom))
  const centerPx = latLngToWorldPixel(camera.centerLat, camera.centerLng, zoom)

  const pitchScale = 0.55 + camera.pitch * 0.65
  const forwardPx = camera.motionBlur * 48 * (1 + Math.sin(timeSec * 8) * 0.08)

  ctx.save()
  ctx.translate(width / 2, height / 2)
  ctx.rotate(camera.bank)
  ctx.scale(1, pitchScale)
  ctx.rotate(camera.bearing)
  ctx.translate(-centerPx.x - Math.cos(camera.bearing) * forwardPx, -centerPx.y - Math.sin(camera.bearing) * forwardPx)

  const tileZoom = Math.floor(zoom)
  const scale = Math.pow(2, zoom - tileZoom)
  ctx.scale(scale, scale)

  const halfW = width / (2 * scale)
  const halfH = height / (2 * scale * pitchScale)
  const minTileX = Math.floor((centerPx.x - halfW) / TILE_SIZE) - 1
  const maxTileX = Math.floor((centerPx.x + halfW) / TILE_SIZE) + 1
  const minTileY = Math.floor((centerPx.y - halfH) / TILE_SIZE) - 1
  const maxTileY = Math.floor((centerPx.y + halfH) / TILE_SIZE) + 1

  const loads: Promise<void>[] = []
  for (let ty = minTileY; ty <= maxTileY; ty++) {
    for (let tx = minTileX; tx <= maxTileX; tx++) {
      loads.push(
        loadSatelliteTile(tileZoom, tx, ty).then(img => {
          if (!img) {
            ctx.fillStyle = '#0B1218'
            ctx.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE)
            return
          }
          ctx.drawImage(img, tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE)
        }),
      )
    }
  }
  await Promise.all(loads)
  ctx.restore()

  if (camera.motionBlur > 0.05) {
    ctx.save()
    ctx.globalAlpha = 0.14
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
    ctx.fillStyle = 'rgba(57,255,20,0.05)'
    ctx.fillRect(0, 0, width, height)
  }

  ctx.fillStyle = 'rgba(0,0,0,0.28)'
  const vignette = ctx.createRadialGradient(width / 2, height / 2, width * 0.2, width / 2, height / 2, width * 0.72)
  vignette.addColorStop(0, 'transparent')
  vignette.addColorStop(1, 'rgba(0,0,0,0.55)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = mode === 'thermal' ? 'rgba(255,255,255,0.025)' : 'rgba(57,255,20,0.035)'
  for (let y = 0; y < height; y += 3) {
    ctx.fillRect(0, y, width, 1)
  }

  drawHud(ctx, width, height, mode, camera)
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
