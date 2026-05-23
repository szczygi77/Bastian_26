import { useEffect, useRef } from 'react'
import type { DroneMission } from '@/types'
import {
  computeDroneFeedCamera,
  missionTypeFeedHint,
  renderDroneSatelliteFrame,
  type DroneFeedVisualMode,
} from '@/services/droneFeedRenderer'

export interface DroneSatelliteFeedProps {
  mission: DroneMission
  mode?: DroneFeedVisualMode
  className?: string
  overlay?: React.ReactNode
  telemetry?: React.ReactNode
}

export function DroneSatelliteFeed({
  mission,
  mode = 'rgb',
  className,
  overlay,
  telemetry,
}: DroneSatelliteFeedProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const missionRef = useRef(mission)
  const modeRef = useRef(mode)

  useEffect(() => {
    missionRef.current = mission
  }, [mission])

  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  useEffect(() => {
    let raf = 0
    let rendering = false
    const start = performance.now()

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      if (rendering) return

      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) return

      const rect = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const w = Math.max(1, Math.floor(rect.width * dpr))
      const h = Math.max(1, Math.floor(rect.height * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      rendering = true
      const timeSec = (now - start) / 1000
      const camera = computeDroneFeedCamera(missionRef.current, timeSec)
      void renderDroneSatelliteFrame(ctx, w, h, camera, modeRef.current, timeSec).finally(() => {
        rendering = false
      })
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [mission.id])

  const phaseClass =
    mission.status === 'on_site'
      ? ' drone-sat-feed--on-site'
      : mission.status === 'en_route' || mission.status === 'dispatched'
        ? ' drone-sat-feed--transit'
        : mission.status === 'returning'
          ? ' drone-sat-feed--return'
          : ''

  return (
    <div className={`drone-sat-feed${phaseClass}${className ? ` ${className}` : ''}`}>
      <div ref={containerRef} className="drone-sat-feed__viewport">
        <canvas ref={canvasRef} className="drone-sat-feed__canvas" aria-label="Podgląd satelitarny z drona" />
        <div className="drone-sat-feed__hud-top">
          <span className="drone-sat-feed__source">ESRI WORLD IMAGERY</span>
          <span className="drone-sat-feed__hint">{missionTypeFeedHint(mission.type)}</span>
        </div>
        {overlay}
        {telemetry && <div className="drone-sat-feed__telemetry">{telemetry}</div>}
      </div>
    </div>
  )
}
