import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Radio, Send, MapPin, Battery, Map, Camera,
  ScanSearch, ThermometerSun, ShieldCheck, Flame, HeartPulse,
  Zap, Droplets, TrainFront, Wifi, Shield, Siren, Landmark, Fuel,
  Crosshair, ChevronRight, Clock, Activity, Signal,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { scoreDrones, assignBestDrone } from '@/services/skymarshalEngine'
import { logAction } from '@/services/auditLogService'
import { agencyLabel, formatTimestamp } from '@/utils/format'
import { Button } from '@/components/ui/Button'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { PageShell, PageSplit, PageSplitSidebar, PageSplitMain } from '@/components/layout/PageShell'
import { useToast } from '@/components/ui/Toast'
import { DroneLiveFeed } from '@/features/skymarshal/DroneLiveFeed'
import { DroneMissionMap } from '@/features/skymarshal/DroneMissionMap'
import { MissionActivityPanel } from '@/features/skymarshal/MissionActivityPanel'
import type { DroneMission, DroneUnit, IKCategory, MissionType, IKObject } from '@/types'

const MISSION_TYPES: { type: MissionType; label: string; desc: string; icon: LucideIcon }[] = [
  { type: 'reconnaissance', label: 'Rozpoznanie', desc: 'Zwiad obszaru', icon: ScanSearch },
  { type: 'thermal_inspection', label: 'Inspekcja termalna', desc: 'Termowizja terenu', icon: ThermometerSun },
  { type: 'perimeter_monitoring', label: 'Monitoring perimetru', desc: 'Zabezpieczenie obwodu', icon: ShieldCheck },
  { type: 'communication_relay', label: 'Przekaźnik łączności', desc: 'Wsparcie komunikacji', icon: Radio },
  { type: 'fire_assessment', label: 'Ocena pożaru', desc: 'RGB + termowizja', icon: Flame },
  { type: 'medical_delivery', label: 'Dostawa AED', desc: 'Transport medyczny', icon: HeartPulse },
]

const CATEGORY_META: Record<IKCategory, { label: string; icon: LucideIcon }> = {
  energy: { label: 'Energia', icon: Zap },
  water: { label: 'Woda', icon: Droplets },
  transport: { label: 'Transport', icon: TrainFront },
  telecommunications: { label: 'Telekom.', icon: Wifi },
  military: { label: 'Obronność', icon: Shield },
  emergency: { label: 'Ratownictwo', icon: Siren },
  government: { label: 'Administracja', icon: Landmark },
  fuel: { label: 'Paliwa', icon: Fuel },
}

const MISSION_STATUS_LABEL: Record<string, string> = {
  dispatched: 'Wysłany',
  en_route: 'W drodze',
  on_site: 'Na miejscu',
  returning: 'Powrót na bazę',
  completed: 'Zakończony',
}

function batteryTone(level: number): 'good' | 'mid' | 'low' {
  if (level >= 50) return 'good'
  if (level >= 25) return 'mid'
  return 'low'
}

export function SkyMarshal() {
  const {
    drones, ikObjects, missions, addMission, updateDrone,
    operator, mode, addAuditEntry, tickActiveMissions,
    setFocusedDroneMissionId, openDroneMissionOnMap,
  } = useAppStore()
  const { toast } = useToast()
  const [selectedMissionType, setSelectedMissionType] = useState<MissionType>('reconnaissance')
  const [selectedTarget, setSelectedTarget] = useState<IKObject | null>(null)
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null)
  const [dispatching, setDispatching] = useState(false)

  const activeMissions = missions.filter(m => m.status !== 'completed')
  const selectedMission = missions.find(m => m.id === selectedMissionId) ?? activeMissions[0] ?? null
  const selectedMissionDrone = selectedMission ? drones.find(d => d.id === selectedMission.droneId) : null
  const selectedMissionTarget = selectedMission
    ? ikObjects.find(o => o.id === selectedMission.targetObjectId) ?? null
    : null

  const scores = selectedTarget
    ? scoreDrones(drones, selectedMissionType, selectedTarget.coordinates)
    : []
  const sortedScores = [...scores].sort((a, b) => b.totalScore - a.totalScore)
  const canDispatch = !!selectedTarget && sortedScores.some(s => s.totalScore > 0)

  useEffect(() => {
    const timer = setInterval(() => tickActiveMissions(), 3000)
    return () => clearInterval(timer)
  }, [tickActiveMissions])

  useEffect(() => {
    if (activeMissions.length === 0) {
      if (!selectedMissionId || !missions.some(m => m.id === selectedMissionId)) {
        setSelectedMissionId(null)
      }
      return
    }
    if (!selectedMissionId || !missions.some(m => m.id === selectedMissionId)) {
      setSelectedMissionId(activeMissions[0].id)
    }
  }, [activeMissions, selectedMissionId, missions])

  const completedMissionIdsRef = useRef(new Set<string>())
  useEffect(() => {
    for (const mission of missions) {
      if (mission.status !== 'completed' || !mission.result) continue
      if (completedMissionIdsRef.current.has(mission.id)) continue
      completedMissionIdsRef.current.add(mission.id)

      const entry = logAction({
        operator: operator?.name ?? 'OPERATOR',
        action: 'drone_dispatch',
        details: `Misja ${mission.type} zakończona (${mission.targetShortName}): ${mission.result.summary}`,
        affectedObject: mission.targetObjectId,
        mode,
      })
      addAuditEntry(entry)
      toast({
        title: 'Misja zakończona',
        description: mission.result.summary,
        variant: mission.result.verdict === 'success' ? 'success' : 'warning',
      })
    }
  }, [missions, operator?.name, mode, addAuditEntry, toast])

  const bestScore = useMemo(
    () => sortedScores.find(s => s.totalScore > 0)?.totalScore ?? 0,
    [sortedScores],
  )

  async function dispatchBestDrone() {
    if (!selectedTarget) return
    setDispatching(true)

    const result = assignBestDrone(
      drones, selectedMissionType, selectedTarget,
      `incident-${Date.now()}`,
      operator?.id ?? 'anonymous',
    )

    await new Promise(r => setTimeout(r, 600))

    if (result) {
      addMission(result.mission)
      updateDrone(result.drone.id, {
        status: 'on_mission',
        mission: result.mission,
        availability: false,
        coordinates: result.mission.currentPosition,
      })
      setSelectedMissionId(result.mission.id)
      setFocusedDroneMissionId(result.mission.id)

      const entry = logAction({
        operator: operator?.name ?? 'OPERATOR',
        action: 'drone_dispatch',
        details: `Zadysponowano dron ${result.drone.id} (${result.drone.model}) do misji ${selectedMissionType} na obiekt ${selectedTarget.name}. ETA: ${result.mission.estimatedArrivalMin}min`,
        affectedObject: selectedTarget.id,
        mode,
      })
      addAuditEntry(entry)
      toast({
        title: 'Dron zadysponowany',
        description: `${result.drone.model} → ${selectedTarget.shortName} · ETA ${result.mission.estimatedArrivalMin} min`,
        variant: 'success',
      })
    } else {
      toast({
        title: 'Brak dostępnego drona',
        description: 'Żaden dron nie spełnia wymagań misji (zasięg, bateria, payload).',
        variant: 'warning',
      })
    }

    setDispatching(false)
  }

  return (
    <PageShell fixed className="skymarshal-page">
    <PageSplit className="h-full min-h-0">
      <PageSplitSidebar className="skymarshal-sidebar">
        <div className="skymarshal-sidebar__header">
          <div className="skymarshal-sidebar__brand">
            <span className="skymarshal-sidebar__brand-icon" aria-hidden>
              <Radio size={18} />
            </span>
            <div>
              <div className="skymarshal-sidebar__brand-title">SkyMarshal</div>
              <div className="skymarshal-sidebar__brand-sub">
                Koordynacja dronów · Policja / PSP / OSP / CZK
              </div>
            </div>
          </div>
        </div>

        <div className="skymarshal-sidebar__body">
          <section className="skymarshal-dispatch__section">
            <div className="skymarshal-dispatch__section-head">
              <span className="skymarshal-dispatch__section-icon" aria-hidden>
                <Crosshair size={16} />
              </span>
              <div>
                <h3 className="skymarshal-dispatch__section-title">Typ misji</h3>
                <p className="skymarshal-dispatch__section-desc">Co ma wykonać dron?</p>
              </div>
            </div>
            <div className="skymarshal-dispatch__mission-grid">
              {MISSION_TYPES.map(({ type, label, desc, icon: Icon }) => {
                const selected = selectedMissionType === type
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedMissionType(type)}
                    className={`skymarshal-dispatch__pick${selected ? ' is-selected' : ''}`}
                    aria-pressed={selected}
                  >
                    <span className="skymarshal-dispatch__pick-icon" aria-hidden>
                      <Icon size={16} />
                    </span>
                    <span className="skymarshal-dispatch__pick-label">{label}</span>
                    <span className="skymarshal-dispatch__pick-meta">{desc}</span>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="skymarshal-dispatch__section">
            <div className="skymarshal-dispatch__section-head">
              <span className="skymarshal-dispatch__section-icon skymarshal-dispatch__section-icon--target" aria-hidden>
                <MapPin size={16} />
              </span>
              <div>
                <h3 className="skymarshal-dispatch__section-title">Obiekt docelowy</h3>
                <p className="skymarshal-dispatch__section-desc">Gdzie skierować zasób?</p>
              </div>
            </div>
            <div className="skymarshal-dispatch__target-list">
              {ikObjects.map(obj => {
                const selected = selectedTarget?.id === obj.id
                const category = CATEGORY_META[obj.category]
                const CategoryIcon = category.icon
                return (
                  <button
                    key={obj.id}
                    type="button"
                    onClick={() => setSelectedTarget(obj)}
                    className={`skymarshal-dispatch__target${selected ? ' is-selected' : ''}`}
                    aria-pressed={selected}
                  >
                    <span className="skymarshal-dispatch__target-icon" aria-hidden>
                      <CategoryIcon size={15} />
                    </span>
                    <span className="skymarshal-dispatch__target-body">
                      <span className="skymarshal-dispatch__target-row">
                        <strong>{obj.shortName}</strong>
                        <Badge variant="muted">{category.label}</Badge>
                      </span>
                      <span className="skymarshal-dispatch__target-name">{obj.name}</span>
                    </span>
                    <ChevronRight size={14} className="skymarshal-dispatch__target-chevron" aria-hidden />
                  </button>
                )
              })}
            </div>
          </section>
        </div>

        <div className="skymarshal-sidebar__footer">
          {(selectedTarget || selectedMissionType) && (
            <div className="skymarshal-dispatch__summary">
              <div className="skymarshal-dispatch__summary-label">Planowana akcja</div>
              <div className="skymarshal-dispatch__summary-value">
                {MISSION_TYPES.find(m => m.type === selectedMissionType)?.label ?? '—'}
                {selectedTarget ? ` → ${selectedTarget.shortName}` : ''}
              </div>
              {selectedTarget && (
                <div className="skymarshal-dispatch__summary-score">
                  Najlepszy wynik dopasowania: <strong>{bestScore}</strong>/100
                </div>
              )}
            </div>
          )}
          <Button
            variant="primary"
            className="w-full"
            loading={dispatching}
            disabled={!canDispatch}
            onClick={dispatchBestDrone}
          >
            <Send size={14} /> Zadysponuj najlepszy dron
          </Button>
        </div>
      </PageSplitSidebar>

      <PageSplitMain className="skymarshal-main">
        {selectedMission && selectedMissionDrone && selectedMission.status !== 'completed' ? (
          <section className="skymarshal-panel">
            <div className="skymarshal-ops">
              <div className="skymarshal-ops__header">
                <div>
                  <div className="skymarshal-panel__title">Misja aktywna</div>
                  <div className="skymarshal-panel__subtitle">
                    {selectedMissionDrone.model} → {selectedMissionTarget?.shortName ?? selectedMission.targetObjectId}
                  </div>
                </div>
                <Button variant="secondary" size="sm" onClick={() => openDroneMissionOnMap(selectedMission.id)}>
                  <Map size={12} /> Pokaż na mapie taktycznej
                </Button>
              </div>
              <div className="skymarshal-ops__grid">
                <DroneLiveFeed mission={selectedMission} drone={selectedMissionDrone} />
                <DroneMissionMap
                  mission={selectedMission}
                  drone={selectedMissionDrone}
                  target={selectedMissionTarget}
                />
              </div>
              <Card accent="cyan" noPad>
                <MissionStatsPanel mission={selectedMission} drone={selectedMissionDrone} />
              </Card>
              <Card accent="cyan" noPad>
                <MissionActivityPanel mission={selectedMission} />
              </Card>
            </div>
          </section>
        ) : selectedMission && selectedMission.status === 'completed' ? (
          <section className="skymarshal-panel">
            <Card label="Misja zakończona" accent="cyan">
              <MissionActivityPanel mission={selectedMission} />
            </Card>
          </section>
        ) : (
          <section className="skymarshal-panel skymarshal-panel--empty">
            <Card>
              <div className="text-center py-10 text-[#66778B] font-mono">
                <Camera size={28} className="mx-auto mb-3 opacity-30" />
                <div className="text-[13px] text-[#94A3B8]">Brak aktywnej misji</div>
                <div className="text-[11px] mt-2">Wybierz typ misji i obiekt docelowy, potem zadysponuj dron</div>
              </div>
            </Card>
          </section>
        )}

        {activeMissions.length > 0 && (
          <section className="skymarshal-panel">
            <Card label={`ACTIVE MISSIONS (${activeMissions.length})`} accent="cyan">
              <div className="skymarshal-mission-list">
                {activeMissions.map(mission => {
                  const drone = drones.find(d => d.id === mission.droneId)
                  const target = ikObjects.find(o => o.id === mission.targetObjectId)
                  const isSelected = selectedMission?.id === mission.id
                  return (
                    <button
                      key={mission.id}
                      type="button"
                      className={`skymarshal-mission-pick${isSelected ? ' is-selected' : ''}`}
                      onClick={() => setSelectedMissionId(mission.id)}
                    >
                      <span className="skymarshal-mission-pick__dot" aria-hidden />
                      <div className="skymarshal-mission-pick__body">
                        <div className="skymarshal-mission-pick__title">{drone?.model ?? mission.droneId}</div>
                        <div className="skymarshal-mission-pick__meta">
                          → {target?.shortName ?? mission.targetObjectId} · {mission.type.replace(/_/g, ' ')}
                        </div>
                      </div>
                      <Badge variant="cyan">{mission.progressPercent.toFixed(0)}%</Badge>
                      <StatusBadge status={mission.status} />
                    </button>
                  )
                })}
              </div>
            </Card>
          </section>
        )}

        {selectedTarget && (
          <section className="skymarshal-panel">
            <Card label={`DRONE SCORING — ${selectedMissionType.replace(/_/g, ' ').toUpperCase()} → ${selectedTarget.shortName}`}>
              <div className="skymarshal-score-list">
                {sortedScores.map(score => {
                  const drone = drones.find(d => d.id === score.droneId)
                  if (!drone) return null
                  return (
                    <div
                      key={score.droneId}
                      className={`skymarshal-score${score.recommended ? ' is-recommended' : ''}${!drone.availability ? ' is-unavailable' : ''}`}
                    >
                      <div className="skymarshal-score__head">
                        <div className="skymarshal-score__identity">
                          <div className="skymarshal-score__model">{drone.model}</div>
                          <div className="skymarshal-score__agency">{agencyLabel(drone.agency)} · {drone.base}</div>
                        </div>
                        <div className="skymarshal-score__tags">
                          {score.recommended && <Badge variant="green">RECOMMENDED</Badge>}
                          <StatusBadge status={drone.status} />
                        </div>
                        <div className={`skymarshal-score__value${score.totalScore >= 70 ? ' is-good' : score.totalScore >= 40 ? ' is-mid' : ' is-bad'}`}>
                          {score.totalScore}
                        </div>
                      </div>
                      <div className="skymarshal-score__bars">
                        <ProgressBar value={score.distanceScore} label="DISTANCE" thin accent="cyan" />
                        <ProgressBar value={score.batteryScore} label="BATTERY" thin accent="cyan" />
                        <ProgressBar value={score.payloadScore} label="PAYLOAD" thin accent="cyan" />
                        <ProgressBar value={score.availabilityScore} label="AVAIL." thin accent="cyan" />
                      </div>
                      <div className="skymarshal-score__footer">
                        <span className="flex items-center gap-1"><Battery size={10} /> {drone.battery}%</span>
                        <span>{drone.range} km range</span>
                        <span>{drone.payload.join(', ')}</span>
                        <Badge variant="muted">{drone.protocol.toUpperCase()}</Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          </section>
        )}

        <section className="skymarshal-panel">
          <Card label="DRONE FLEET — STALOWA WOLA">
            <div className="skymarshal-fleet-list">
              {drones.map(drone => (
                <div key={drone.id} className="skymarshal-fleet-row">
                  <div className="skymarshal-fleet-row__info">
                    <div className="skymarshal-fleet-row__model">{drone.model}</div>
                    <div className="skymarshal-fleet-row__meta">{agencyLabel(drone.agency)} · {drone.operator}</div>
                  </div>
                  <div className="skymarshal-fleet-row__stats">
                    <div className="flex items-center gap-1 text-[10px] font-mono">
                      <Battery size={10} className="text-[#66778B]" />
                      <span className={drone.battery >= 50 ? 'text-[#22C55E]' : drone.battery >= 25 ? 'text-[#F59E0B]' : 'text-[#EF4444]'}>
                        {drone.battery}%
                      </span>
                    </div>
                    <Badge variant="muted">{drone.range}km</Badge>
                    <Badge variant="muted">{drone.protocol.toUpperCase()}</Badge>
                    <StatusBadge status={drone.status} />
                  </div>
                  {drone.mission && (
                    <div className="skymarshal-fleet-row__mission">
                      ↗ {drone.mission.type.replace(/_/g, ' ')} · {drone.mission.progressPercent.toFixed(0)}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </section>

        {missions.length > 0 && (
          <section className="skymarshal-panel">
            <Card label={`MISSION LOG (${missions.length})`}>
              <div className="skymarshal-log-list">
                {missions.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    className={`skymarshal-log-row skymarshal-log-row--clickable${selectedMissionId === m.id ? ' is-selected' : ''}`}
                    onClick={() => setSelectedMissionId(m.id)}
                  >
                    <span className="skymarshal-log-row__time">{formatTimestamp(m.assignedAt)}</span>
                    <span className="skymarshal-log-row__drone">{m.droneId}</span>
                    <Badge variant="cyan">{m.type.replace(/_/g, ' ')}</Badge>
                    <span className="skymarshal-log-row__target">→ {m.targetShortName ?? m.targetObjectId}</span>
                    <StatusBadge status={m.status} />
                  </button>
                ))}
              </div>
            </Card>
          </section>
        )}
      </PageSplitMain>
    </PageSplit>
    </PageShell>
  )
}

function MissionStatsPanel({ mission, drone }: { mission: DroneMission; drone: DroneUnit }) {
  const progressValue = mission.status === 'on_site' && mission.activityProgress != null
    ? mission.activityProgress
    : mission.progressPercent
  const progressLabel = mission.status === 'on_site' ? 'Postęp pracy na miejscu' : 'Postęp misji'
  const batteryLevel = drone.battery
  const batteryState = batteryTone(batteryLevel)
  const protocolLabel = drone.protocol === 'dji_sdk'
    ? 'DJI SDK'
    : drone.protocol === 'mavlink'
      ? 'MAVLink'
      : drone.protocol.toUpperCase()

  return (
    <div className="skymarshal-mission-stats">
      <div className="skymarshal-mission-stats__hero">
        <div className="skymarshal-mission-stats__hero-head">
          <span className="skymarshal-mission-stats__hero-label">{progressLabel}</span>
          <span className="skymarshal-mission-stats__hero-value">{progressValue.toFixed(0)}%</span>
        </div>
        <ProgressBar
          value={progressValue}
          accent={mission.status === 'on_site' ? 'green' : 'cyan'}
          fixedAccent
          thick
        />
      </div>

      <div className="skymarshal-kpi-grid">
        <div className="skymarshal-kpi">
          <span className="skymarshal-kpi__icon skymarshal-kpi__icon--cyan" aria-hidden>
            <Clock size={18} />
          </span>
          <div className="skymarshal-kpi__body">
            <span className="skymarshal-kpi__label">Szac. ETA</span>
            <strong className="skymarshal-kpi__value">{mission.estimatedArrivalMin} min</strong>
          </div>
        </div>

        <div className="skymarshal-kpi">
          <span className="skymarshal-kpi__icon skymarshal-kpi__icon--orange" aria-hidden>
            <Activity size={18} />
          </span>
          <div className="skymarshal-kpi__body">
            <span className="skymarshal-kpi__label">Status misji</span>
            <strong className={`skymarshal-kpi__value skymarshal-kpi__value--status is-${mission.status}`}>
              {MISSION_STATUS_LABEL[mission.status] ?? mission.status}
            </strong>
          </div>
        </div>

        <div className="skymarshal-kpi">
          <span className={`skymarshal-kpi__icon skymarshal-kpi__icon--battery is-${batteryState}`} aria-hidden>
            <Battery size={18} />
          </span>
          <div className="skymarshal-kpi__body">
            <span className="skymarshal-kpi__label">Bateria drona</span>
            <strong className={`skymarshal-kpi__value is-${batteryState}`}>{batteryLevel}%</strong>
          </div>
        </div>

        <div className="skymarshal-kpi">
          <span className="skymarshal-kpi__icon skymarshal-kpi__icon--cyan" aria-hidden>
            <Signal size={18} />
          </span>
          <div className="skymarshal-kpi__body">
            <span className="skymarshal-kpi__label">Kanał łączności</span>
            <strong className="skymarshal-kpi__value">{protocolLabel}</strong>
          </div>
        </div>
      </div>
    </div>
  )
}
