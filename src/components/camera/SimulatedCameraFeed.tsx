import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Minus,
  Plus,
  RotateCcw,
  RotateCw,
} from 'lucide-react'
import {
  createCameraScene,
  defaultCameraView,
  renderCameraScene,
  tickCameraScene,
  type CameraSceneVariant,
  type CameraVisualMode,
  type CameraViewState,
} from '@/components/camera/simulatedCameraEngine'

export interface SimulatedCameraFeedProps {
  seed: string
  cameraIndex?: number
  variant?: CameraSceneVariant
  mode?: CameraVisualMode
  degraded?: boolean
  offline?: boolean
  className?: string
  overlay?: React.ReactNode
  telemetry?: React.ReactNode
  onViewChange?: (view: CameraViewState) => void
}

const PAN_STEP = 42
const ZOOM_STEP = 0.12
const ROTATE_STEP = 0.14
const TILT_STEP = 0.05

export function SimulatedCameraFeed({
  seed,
  cameraIndex = 0,
  variant = 'cctv',
  mode = 'rgb',
  degraded = false,
  offline = false,
  className,
  overlay,
  telemetry,
  onViewChange,
}: SimulatedCameraFeedProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef(createCameraScene(seed, variant))
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const viewRef = useRef<CameraViewState>(defaultCameraView(seed, variant, cameraIndex))

  const [view, setView] = useState<CameraViewState>(() => defaultCameraView(seed, variant, cameraIndex))

  const sceneKey = useMemo(() => `${seed}:${variant}:${cameraIndex}`, [seed, variant, cameraIndex])

  useEffect(() => {
    sceneRef.current = createCameraScene(seed, variant)
    const nextView = defaultCameraView(seed, variant, cameraIndex)
    viewRef.current = nextView
    setView(nextView)
  }, [sceneKey, seed, variant, cameraIndex])

  useEffect(() => {
    viewRef.current = view
    onViewChange?.(view)
  }, [view, onViewChange])

  const mutateView = useCallback((patch: Partial<CameraViewState>) => {
    setView(prev => {
      const next = {
        ...prev,
        ...patch,
        zoom: patch.zoom !== undefined ? Math.min(2.4, Math.max(0.45, patch.zoom)) : prev.zoom,
        tilt: patch.tilt !== undefined ? Math.min(1.1, Math.max(0.35, patch.tilt)) : prev.tilt,
      }
      viewRef.current = next
      return next
    })
  }, [])

  const pan = useCallback((dx: number, dy: number) => {
    mutateView({
      panX: viewRef.current.panX + dx,
      panY: viewRef.current.panY + dy,
    })
  }, [mutateView])

  const resetView = useCallback(() => {
    const next = defaultCameraView(seed, variant, cameraIndex)
    setView(next)
    viewRef.current = next
  }, [seed, variant, cameraIndex])

  useEffect(() => {
    if (offline) return

    let raf = 0
    let last = performance.now()

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000) * (degraded ? 0.65 : 1)
      last = now
      tickCameraScene(sceneRef.current, dt)

      const canvas = canvasRef.current
      const container = containerRef.current
      if (canvas && container) {
        const rect = container.getBoundingClientRect()
        const dpr = window.devicePixelRatio || 1
        const w = Math.max(1, Math.floor(rect.width * dpr))
        const h = Math.max(1, Math.floor(rect.height * dpr))
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w
          canvas.height = h
        }
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.setTransform(1, 0, 0, 1, 0, 0)
          renderCameraScene(ctx, w, h, sceneRef.current, viewRef.current, mode, variant, now / 1000)
        }
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [offline, degraded, mode, variant, sceneKey])

  useEffect(() => {
    const container = containerRef.current
    if (!container || offline) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      mutateView({ zoom: viewRef.current.zoom + (e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP) })
    }

    container.addEventListener('wheel', onWheel, { passive: false })
    return () => container.removeEventListener('wheel', onWheel)
  }, [mutateView, offline])

  const onPointerDown = (e: React.PointerEvent) => {
    if (offline) return
    dragRef.current = { x: e.clientX, y: e.clientY, panX: viewRef.current.panX, panY: viewRef.current.panY }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    const dx = (e.clientX - dragRef.current.x) / viewRef.current.zoom
    const dy = (e.clientY - dragRef.current.y) / viewRef.current.zoom
    mutateView({
      panX: dragRef.current.panX - dx,
      panY: dragRef.current.panY - dy,
    })
  }

  const onPointerUp = () => {
    dragRef.current = null
  }

  return (
    <div className={`sim-camera${className ? ` ${className}` : ''}`}>
      <div
        ref={containerRef}
        className={`sim-camera__viewport${mode === 'thermal' ? ' sim-camera__viewport--thermal' : ''}${offline ? ' sim-camera__viewport--offline' : ''}${degraded ? ' sim-camera__viewport--degraded' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {!offline ? (
          <canvas ref={canvasRef} className="sim-camera__canvas" aria-label="Symulowany podgląd kamery" />
        ) : (
          <div className="sim-camera__offline">
            <span>Sygnał utracony</span>
          </div>
        )}

        {overlay}

        {telemetry && <div className="sim-camera__telemetry">{telemetry}</div>}

        {!offline && (
          <div className="sim-camera__hud">
            <span>PAN {Math.round(view.panX)}</span>
            <span>TILT {(view.tilt * 90).toFixed(0)}°</span>
            <span>HDG {((view.heading * 180) / Math.PI).toFixed(0)}°</span>
            <span>ZOOM {(view.zoom * 100).toFixed(0)}%</span>
          </div>
        )}
      </div>

      {!offline && (
        <div className="sim-camera__controls">
          <div className="sim-camera__controls-label">PTZ — przeciągnij obraz lub użyj przycisków</div>
          <div className="sim-camera__controls-grid">
            <button type="button" className="sim-camera__btn" onClick={() => mutateView({ heading: viewRef.current.heading - ROTATE_STEP })} aria-label="Obroc w lewo">
              <RotateCcw size={14} />
            </button>
            <button type="button" className="sim-camera__btn" onClick={() => pan(0, -PAN_STEP)} aria-label="Pitch gora">
              <ChevronUp size={14} />
            </button>
            <button type="button" className="sim-camera__btn" onClick={() => mutateView({ heading: viewRef.current.heading + ROTATE_STEP })} aria-label="Obroc w prawo">
              <RotateCw size={14} />
            </button>

            <button type="button" className="sim-camera__btn" onClick={() => pan(-PAN_STEP, 0)} aria-label="Pan lewo">
              <ChevronLeft size={14} />
            </button>
            <button type="button" className="sim-camera__btn sim-camera__btn--center" onClick={resetView} aria-label="Reset kamery">
              PTZ
            </button>
            <button type="button" className="sim-camera__btn" onClick={() => pan(PAN_STEP, 0)} aria-label="Pan prawo">
              <ChevronRight size={14} />
            </button>

            <button type="button" className="sim-camera__btn" onClick={() => mutateView({ zoom: viewRef.current.zoom - ZOOM_STEP })} aria-label="Zoom out">
              <Minus size={14} />
            </button>
            <button type="button" className="sim-camera__btn" onClick={() => pan(0, PAN_STEP)} aria-label="Pitch dol">
              <ChevronDown size={14} />
            </button>
            <button type="button" className="sim-camera__btn" onClick={() => mutateView({ zoom: viewRef.current.zoom + ZOOM_STEP })} aria-label="Zoom in">
              <Plus size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
