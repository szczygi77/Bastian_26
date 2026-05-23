import { useEffect, useState } from 'react'
import { Camera, Radio } from 'lucide-react'
import type { DroneMission, DroneUnit } from '@/types'
import { feedModeForMission } from '@/data/droneMedia'
import { agencyLabel } from '@/utils/format'
import { missionStatusLabel } from '@/services/missionActivities'
import { Badge } from '@/components/ui/Badge'
import { DroneSatelliteFeed } from '@/components/camera/DroneSatelliteFeed'

function activeFeedMode(mission: DroneMission): 'rgb' | 'thermal' {
  if (mission.status === 'on_site') {
    const step = mission.activitySteps?.[mission.currentActivityIndex ?? 0]
    if (step?.feedMode) return step.feedMode
  }
  return feedModeForMission(mission.type)
}

function altitudeForMission(mission: DroneMission): number {
  if (mission.status === 'on_site') {
    if (mission.type === 'communication_relay') return 85
    if (mission.type === 'medical_delivery' && (mission.currentActivityIndex ?? 0) <= 1) return 8
    if (mission.type === 'perimeter_monitoring') return 55
    return 42
  }
  if (mission.status === 'returning') return 30 + mission.progressPercent * 0.3
  return 40 + mission.progressPercent * 0.8
}

function speedForMission(mission: DroneMission): number {
  if (mission.status === 'on_site') {
    if (mission.type === 'perimeter_monitoring') return 8
    if (mission.type === 'medical_delivery' && (mission.currentActivityIndex ?? 0) >= 1) return 0
    if (mission.type === 'communication_relay') return 0
    return 3
  }
  if (mission.status === 'en_route' || mission.status === 'dispatched') return 14
  if (mission.status === 'returning') return 12
  return 0
}

export function DroneLiveFeed({
  mission,
  drone,
}: {
  mission: DroneMission
  drone: DroneUnit
}) {
  const defaultMode = activeFeedMode(mission)
  const [feedMode, setFeedMode] = useState<'rgb' | 'thermal'>(defaultMode)
  const [clock, setClock] = useState(() => new Date())

  useEffect(() => {
    setFeedMode(activeFeedMode(mission))
  }, [mission.status, mission.currentActivityIndex, mission.type, mission.id])

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const isLive = mission.status !== 'completed'
  const statusLabel = missionStatusLabel(mission.status, mission.activityLabel)

  return (
    <div className="skymarshal-feed">
      <div className="skymarshal-feed__header">
        <div className="skymarshal-feed__title">
          <Camera size={14} />
          PODGLĄD NA ŻYWO — {drone.model}
        </div>
        <div className="skymarshal-feed__modes">
          <button
            type="button"
            className={`skymarshal-feed__mode${feedMode === 'rgb' ? ' is-active' : ''}`}
            onClick={() => setFeedMode('rgb')}
          >
            RGB
          </button>
          <button
            type="button"
            className={`skymarshal-feed__mode${feedMode === 'thermal' ? ' is-active' : ''}`}
            onClick={() => setFeedMode('thermal')}
          >
            THERMAL
          </button>
        </div>
      </div>

      <DroneSatelliteFeed
        mission={mission}
        mode={feedMode}
        className="skymarshal-feed__sim"
        overlay={(
          <div className="skymarshal-feed__overlay">
            {isLive && <span className="skymarshal-feed__live">LIVE</span>}
            <span className="skymarshal-feed__clock">
              {clock.toLocaleTimeString('pl-PL', { hour12: false })}
            </span>
            <span className="skymarshal-feed__activity">{statusLabel}</span>
          </div>
        )}
        telemetry={(
          <>
            <span><Radio size={10} /> {drone.protocol.toUpperCase()}</span>
            <span>ALT {Math.round(altitudeForMission(mission))}m</span>
            <span>SPD {speedForMission(mission)} m/s</span>
            <span>BAT {drone.battery}%</span>
          </>
        )}
      />

      <div className="skymarshal-feed__meta">
        <div>
          <span className="skymarshal-feed__label">Operator</span>
          <strong>{drone.operator}</strong>
        </div>
        <div>
          <span className="skymarshal-feed__label">Agencja</span>
          <strong>{agencyLabel(drone.agency)}</strong>
        </div>
        <div>
          <span className="skymarshal-feed__label">Misja</span>
          <Badge variant="cyan">{mission.type.replace(/_/g, ' ')}</Badge>
        </div>
        <div>
          <span className="skymarshal-feed__label">Status</span>
          <Badge variant={mission.status === 'on_site' ? 'green' : mission.status === 'completed' ? 'muted' : 'orange'}>
            {statusLabel.toUpperCase()}
          </Badge>
        </div>
      </div>
    </div>
  )
}
