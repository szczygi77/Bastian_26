export type CameraVisualMode = 'rgb' | 'thermal'
export type CameraSceneVariant = 'drone' | 'cctv'

export interface CameraViewState {
  panX: number
  panY: number
  zoom: number
  heading: number
  tilt: number
}

interface Person {
  x: number
  y: number
  pathAx: number
  pathAy: number
  pathBx: number
  pathBy: number
  t: number
  speed: number
  scale: number
  walkPhase: number
}

interface Vehicle {
  x: number
  y: number
  angle: number
  speed: number
  length: number
}

interface Building {
  x: number
  y: number
  w: number
  h: number
}

interface Tree {
  x: number
  y: number
  r: number
}

export interface CameraScene {
  people: Person[]
  vehicles: Vehicle[]
  buildings: Building[]
  trees: Tree[]
  fences: Array<{ x1: number; y1: number; x2: number; y2: number }>
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t += 0x6D2B79F5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

export function hashSeed(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function createCameraScene(seed: string, variant: CameraSceneVariant): CameraScene {
  const rand = mulberry32(hashSeed(`${seed}:${variant}`))
  const peopleCount = variant === 'drone' ? 6 + Math.floor(rand() * 5) : 3 + Math.floor(rand() * 4)

  const people: Person[] = Array.from({ length: peopleCount }, () => {
    const pathAx = 120 + rand() * 760
    const pathAy = 120 + rand() * 760
    const pathBx = 120 + rand() * 760
    const pathBy = 120 + rand() * 760
    return {
      x: pathAx,
      y: pathAy,
      pathAx,
      pathAy,
      pathBx,
      pathBy,
      t: rand(),
      speed: 0.04 + rand() * 0.07,
      scale: 0.85 + rand() * 0.35,
      walkPhase: rand() * Math.PI * 2,
    }
  })

  const buildings: Building[] = Array.from({ length: variant === 'drone' ? 8 : 4 }, () => ({
    x: 80 + rand() * 720,
    y: 80 + rand() * 720,
    w: 60 + rand() * 120,
    h: 50 + rand() * 100,
  }))

  const trees: Tree[] = Array.from({ length: variant === 'drone' ? 14 : 8 }, () => ({
    x: 40 + rand() * 920,
    y: 40 + rand() * 920,
    r: 10 + rand() * 18,
  }))

  const vehicles: Vehicle[] = Array.from({ length: variant === 'drone' ? 3 : 1 }, () => ({
    x: 150 + rand() * 700,
    y: 150 + rand() * 700,
    angle: rand() * Math.PI * 2,
    speed: 0.3 + rand() * 0.5,
    length: 36 + rand() * 20,
  }))

  const fences: CameraScene['fences'] = [
    { x1: 60, y1: 60, x2: 940, y2: 60 },
    { x1: 940, y1: 60, x2: 940, y2: 940 },
    { x1: 940, y1: 940, x2: 60, y2: 940 },
    { x1: 60, y1: 940, x2: 60, y2: 60 },
  ]

  return { people, vehicles, buildings, trees, fences }
}

export function defaultCameraView(
  seed: string,
  variant: CameraSceneVariant,
  cameraIndex = 0,
): CameraViewState {
  const rand = mulberry32(hashSeed(`${seed}:view:${cameraIndex}`))
  return {
    panX: 360 + rand() * 280,
    panY: 360 + rand() * 280,
    zoom: variant === 'drone' ? 0.85 : 1.15,
    heading: (rand() - 0.5) * 0.8,
    tilt: variant === 'drone' ? 0.55 : 0.72,
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function tickCameraScene(scene: CameraScene, dt: number): void {
  for (const person of scene.people) {
    person.t += person.speed * dt
    if (person.t >= 1) {
      person.t = 0
      const { pathAx, pathAy, pathBx, pathBy } = person
      person.pathAx = pathBx
      person.pathAy = pathBy
      person.pathBx = pathAx
      person.pathBy = pathAy
    }
    person.x = lerp(person.pathAx, person.pathBx, person.t)
    person.y = lerp(person.pathAy, person.pathBy, person.t)
    person.walkPhase += dt * 6
  }

  for (const vehicle of scene.vehicles) {
    vehicle.x += Math.cos(vehicle.angle) * vehicle.speed * dt * 40
    vehicle.y += Math.sin(vehicle.angle) * vehicle.speed * dt * 40
    if (vehicle.x < 80 || vehicle.x > 920 || vehicle.y < 80 || vehicle.y > 920) {
      vehicle.angle += Math.PI * 0.5 + (Math.random() - 0.5) * 0.6
    }
  }
}

function personColor(mode: CameraVisualMode): string {
  return mode === 'thermal' ? '#FFE8A3' : '#39FF14'
}

function personGlow(mode: CameraVisualMode): string {
  return mode === 'thermal' ? 'rgba(255,180,60,0.55)' : 'rgba(57,255,20,0.45)'
}

function drawPerson(
  ctx: CanvasRenderingContext2D,
  person: Person,
  mode: CameraVisualMode,
): void {
  const dx = person.pathBx - person.pathAx
  const dy = person.pathBy - person.pathAy
  const angle = Math.atan2(dy, dx) + Math.PI / 2
  const legSwing = Math.sin(person.walkPhase) * 5

  ctx.save()
  ctx.translate(person.x, person.y)
  ctx.rotate(angle)
  ctx.scale(person.scale, person.scale)

  ctx.shadowColor = personGlow(mode)
  ctx.shadowBlur = mode === 'thermal' ? 8 : 14
  ctx.fillStyle = personColor(mode)

  ctx.beginPath()
  ctx.arc(0, -22, 7, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillRect(-5, -14, 10, 18)

  ctx.fillRect(-7, 4 + legSwing, 5, 12)
  ctx.fillRect(2, 4 - legSwing, 5, 12)

  ctx.fillRect(-10, -10, 5, 12)
  ctx.fillRect(5, -10, 5, 12)

  ctx.restore()
}

function drawVehicle(ctx: CanvasRenderingContext2D, vehicle: Vehicle, mode: CameraVisualMode): void {
  ctx.save()
  ctx.translate(vehicle.x, vehicle.y)
  ctx.rotate(vehicle.angle)
  ctx.fillStyle = mode === 'thermal' ? '#88BBFF' : '#2A3544'
  ctx.strokeStyle = mode === 'thermal' ? '#DDF0FF' : '#4A5D72'
  ctx.lineWidth = 2
  ctx.fillRect(-vehicle.length / 2, -10, vehicle.length, 20)
  ctx.strokeRect(-vehicle.length / 2, -10, vehicle.length, 20)
  ctx.restore()
}

function drawBuilding(ctx: CanvasRenderingContext2D, b: Building, mode: CameraVisualMode): void {
  ctx.fillStyle = mode === 'thermal' ? '#223044' : '#121820'
  ctx.strokeStyle = mode === 'thermal' ? '#44566A' : '#243040'
  ctx.lineWidth = 1.5
  ctx.fillRect(b.x, b.y, b.w, b.h)
  ctx.strokeRect(b.x, b.y, b.w, b.h)
}

function drawTree(ctx: CanvasRenderingContext2D, tree: Tree, mode: CameraVisualMode): void {
  ctx.fillStyle = mode === 'thermal' ? '#1A3020' : '#0D1810'
  ctx.beginPath()
  ctx.arc(tree.x, tree.y, tree.r, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = mode === 'thermal' ? '#3FA060' : '#1E4028'
  ctx.lineWidth = 1
  ctx.stroke()
}

export function renderCameraScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scene: CameraScene,
  view: CameraViewState,
  mode: CameraVisualMode,
  variant: CameraSceneVariant,
  time: number,
): void {
  ctx.clearRect(0, 0, width, height)

  const bg = ctx.createLinearGradient(0, 0, 0, height)
  if (mode === 'thermal') {
    bg.addColorStop(0, '#120818')
    bg.addColorStop(1, '#06040A')
  } else {
    bg.addColorStop(0, '#071208')
    bg.addColorStop(1, '#020504')
  }
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)

  ctx.save()
  ctx.translate(width / 2, height / 2)
  ctx.scale(view.zoom, view.zoom * view.tilt)
  ctx.rotate(view.heading)
  ctx.translate(-view.panX, -view.panY)

  ctx.strokeStyle = mode === 'thermal' ? 'rgba(255,255,255,0.06)' : 'rgba(57,255,20,0.05)'
  ctx.lineWidth = 1
  for (let gx = 0; gx <= 1000; gx += 50) {
    ctx.beginPath()
    ctx.moveTo(gx, 0)
    ctx.lineTo(gx, 1000)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, gx)
    ctx.lineTo(1000, gx)
    ctx.stroke()
  }

  ctx.strokeStyle = mode === 'thermal' ? 'rgba(255,200,80,0.35)' : 'rgba(57,255,20,0.25)'
  ctx.lineWidth = 2
  for (const fence of scene.fences) {
    ctx.beginPath()
    ctx.moveTo(fence.x1, fence.y1)
    ctx.lineTo(fence.x2, fence.y2)
    ctx.stroke()
  }

  for (const building of scene.buildings) drawBuilding(ctx, building, mode)
  for (const tree of scene.trees) drawTree(ctx, tree, mode)
  for (const vehicle of scene.vehicles) drawVehicle(ctx, vehicle, mode)
  for (const person of scene.people) drawPerson(ctx, person, mode)

  ctx.restore()

  if (variant === 'drone') {
    ctx.strokeStyle = mode === 'thermal' ? 'rgba(255,255,255,0.35)' : 'rgba(0,229,255,0.35)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(width / 2 - 16, height / 2)
    ctx.lineTo(width / 2 + 16, height / 2)
    ctx.moveTo(width / 2, height / 2 - 16)
    ctx.lineTo(width / 2, height / 2 + 16)
    ctx.stroke()
  }

  ctx.fillStyle = mode === 'thermal' ? 'rgba(255,255,255,0.03)' : 'rgba(57,255,20,0.04)'
  for (let y = 0; y < height; y += 3) {
    ctx.fillRect(0, y, width, 1)
  }

  if (mode === 'rgb') {
    ctx.fillStyle = 'rgba(57,255,20,0.06)'
    ctx.fillRect(0, 0, width, height)
  }

  const vignette = ctx.createRadialGradient(width / 2, height / 2, height * 0.2, width / 2, height / 2, height * 0.75)
  vignette.addColorStop(0, 'rgba(0,0,0,0)')
  vignette.addColorStop(1, 'rgba(0,0,0,0.55)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, width, height)

  void time
}
