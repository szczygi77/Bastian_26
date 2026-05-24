import { useEffect, useRef } from 'react'
import type { DroneMission } from '@/types'
import {
  computeDroneFeedCamera,
  missionTypeFeedHint,
  preloadVisibleDroneTiles,
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
  const phaseStartRef = useRef(performance.now())
  const smoothProgressRef = useRef(mission.progressPercent)

  useEffect(() => {
    missionRef.current = mission
  }, [mission])

  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  useEffect(() => {
    phaseStartRef.current = performance.now()
    smoothProgressRef.current = mission.progressPercent
  }, [mission.id, mission.status])

  useEffect(() => {
    let raf = 0

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)

      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) return

      const rect = container.getBoundingClientRect()
      if (rect.width < 2 || rect.height < 2) return

      const dpr = window.devicePixelRatio || 1
      const w = Math.max(1, Math.floor(rect.width * dpr))
      const h = Math.max(1, Math.floor(rect.height * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const timeSec = (now - phaseStartRef.current) / 1000
      const currentMission = missionRef.current
      smoothProgressRef.current += (currentMission.progressPercent - smoothProgressRef.current) * 0.12
      const cameraMission =
        Math.abs(currentMission.progressPercent - smoothProgressRef.current) < 0.05
          ? currentMission
          : { ...currentMission, progressPercent: smoothProgressRef.current }
      const camera = computeDroneFeedCamera(cameraMission, timeSec)
      renderDroneSatelliteFrame(ctx, w, h, camera, modeRef.current, timeSec, cameraMission)
      preloadVisibleDroneTiles(camera, w, h)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [mission.id, mission.status])

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
