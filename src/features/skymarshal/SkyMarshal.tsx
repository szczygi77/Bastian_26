import { useState } from 'react'
import { Radio, Send, MapPin, Battery, Zap } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { scoreDrones, assignBestDrone } from '@/services/skymarshalEngine'
import { logAction } from '@/services/auditLogService'
import { agencyLabel, formatTimestamp } from '@/utils/format'
import { Button } from '@/components/ui/Button'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { PageSplit, PageSplitSidebar, PageSplitMain } from '@/components/layout/PageShell'
import type { MissionType, IKObject } from '@/types'

const MISSION_TYPES: { type: MissionType; label: string; desc: string }[] = [
  { type: 'reconnaissance', label: 'ROZPOZNANIE', desc: 'Zwiady obszaru incydentu' },
  { type: 'thermal_inspection', label: 'INSPEKCJA TERMALNA', desc: 'Kamera termowizyjna — pożar/osoby' },
  { type: 'perimeter_monitoring', label: 'MONITORING PERIMETRU', desc: 'Zabezpieczenie obszaru' },
  { type: 'communication_relay', label: 'PRZEKAŹNIK COMM', desc: 'Łączność w terenie' },
  { type: 'fire_assessment', label: 'OCENA POŻARU', desc: 'Termalna + RGB nad ogniem' },
  { type: 'medical_delivery', label: 'DOSTAWA AED', desc: 'Transport defibrylatora' },
]

export function SkyMarshal() {
  const { drones, ikObjects, missions, addMission, updateDrone, operator, mode, addAuditEntry } = useAppStore()
  const [selectedMissionType, setSelectedMissionType] = useState<MissionType>('reconnaissance')
  const [selectedTarget, setSelectedTarget] = useState<IKObject | null>(null)
  const [dispatching, setDispatching] = useState(false)

  const scores = selectedTarget
    ? scoreDrones(drones, selectedMissionType, selectedTarget.coordinates)
    : []

  const sortedScores = [...scores].sort((a, b) => b.totalScore - a.totalScore)

  async function dispatchBestDrone() {
    if (!selectedTarget) return
    setDispatching(true)

    const result = assignBestDrone(
      drones, selectedMissionType, selectedTarget,
      `incident-${Date.now()}`,
      operator?.id ?? 'anonymous'
    )

    await new Promise(r => setTimeout(r, 600))

    if (result) {
      addMission(result.mission)
      updateDrone(result.drone.id, { status: 'on_mission', mission: result.mission, availability: false })

      const entry = logAction({
        operator: operator?.name ?? 'OPERATOR',
        action: 'drone_dispatch',
        details: `Zadysponowano dron ${result.drone.id} (${result.drone.model}) do misji ${selectedMissionType} na obiekt ${selectedTarget.name}. ETA: ${result.mission.estimatedArrivalMin}min`,
        affectedObject: selectedTarget.id,
        mode,
      })
      addAuditEntry(entry)
    }

    setDispatching(false)
  }

  const activeMissions = missions.filter(m => m.status !== 'completed')

  return (
    <PageSplit>
      <PageSplitSidebar>
        <div className="flex items-center gap-2">
          <Radio size={14} className="text-[#00E5FF]" />
          <span className="text-[12px] font-mono font-bold uppercase tracking-wider text-[#E6EDF3]">SKYMARSHAL</span>
        </div>
        <div className="text-[10px] font-mono text-[#66778B]">
          Koordynacja istniejących dronów służb — Policja / PSP / OSP / Jednostka Kryzysowa
        </div>

        {/* Mission type */}
        <div>
          <div className="text-[10px] font-mono text-[#66778B] uppercase tracking-wider mb-2">TYP MISJI</div>
          <div className="ui-list">
            {MISSION_TYPES.map(({ type, label, desc }) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedMissionType(type)}
                className={`ui-list-item ${selectedMissionType === type ? 'is-selected' : ''}`}
              >
                <div className="text-[11px] font-mono font-medium text-[#E6EDF3]">{label}</div>
                <div className="text-[10px] font-mono text-[#66778B]">{desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Target object */}
        <div className="mb-4">
          <div className="text-[10px] font-mono text-[#66778B] uppercase tracking-wider mb-2">OBIEKT DOCELOWY</div>
          <div className="ui-list max-h-48 overflow-auto">
            {ikObjects.map(obj => (
              <button
                key={obj.id}
                type="button"
                onClick={() => setSelectedTarget(obj)}
                className={`ui-list-item ${selectedTarget?.id === obj.id ? 'is-selected' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-[#94A3B8]">{obj.shortName}</span>
                  <MapPin size={10} className="text-[#66778B]" />
                </div>
              </button>
            ))}
          </div>
        </div>

        <Button
          variant="primary"
          className="w-full"
          loading={dispatching}
          disabled={!selectedTarget || sortedScores[0]?.totalScore === 0}
          onClick={dispatchBestDrone}
        >
          <Send size={12} /> DISPATCH BEST DRONE
        </Button>
      </PageSplitSidebar>

      <PageSplitMain>
        {/* Active missions */}
        {activeMissions.length > 0 && (
          <Card label={`ACTIVE MISSIONS (${activeMissions.length})`} accent="cyan">
            <div className="ui-stack" style={{ gap: 10 }}>
              {activeMissions.map(mission => {
                const drone = drones.find(d => d.id === mission.droneId)
                const target = ikObjects.find(o => o.id === mission.targetObjectId)
                return (
                  <div key={mission.id} className="ui-row-item" style={{ justifyContent: 'flex-start', gap: 16, background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(0,229,255,0.10)' }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-pulse-cyan flex-shrink-0" />
                    <div className="flex-1 text-[11px] font-mono">
                      <span className="text-[#00E5FF]">{drone?.model ?? mission.droneId}</span>
                      <span className="text-[#66778B]"> → {target?.shortName ?? mission.targetObjectId}</span>
                      <span className="text-[#94A3B8]"> · {mission.type.replace(/_/g, ' ')}</span>
                    </div>
                    <Badge variant="cyan">ETA {mission.estimatedArrivalMin}min</Badge>
                    <StatusBadge status={mission.status} />
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* Drone scoring */}
        {selectedTarget && (
          <Card label={`DRONE SCORING — ${selectedMissionType.replace(/_/g, ' ').toUpperCase()} → ${selectedTarget.shortName}`}>
            <div className="ui-stack">
              {sortedScores.map(score => {
                const drone = drones.find(d => d.id === score.droneId)
                if (!drone) return null
                return (
                  <div key={score.droneId} className={`ui-panel ${
                    score.recommended ? 'border-[#22C55E]/30' : ''
                  } ${!drone.availability ? 'opacity-40' : ''}`} style={{
                    background: score.recommended ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.02)',
                    padding: '16px 18px',
                  }}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-[12px] font-mono font-medium text-[#E6EDF3]">{drone.model}</div>
                        <div className="text-[10px] font-mono text-[#66778B]">{agencyLabel(drone.agency)} · {drone.base}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {score.recommended && <Badge variant="green">RECOMMENDED</Badge>}
                        <StatusBadge status={drone.status} />
                        <div className={`text-[18px] font-mono font-bold ${score.totalScore >= 70 ? 'text-[#22C55E]' : score.totalScore >= 40 ? 'text-[#F59E0B]' : 'text-[#EF4444]'}`}>
                          {score.totalScore}
                        </div>
                      </div>
                    </div>
                    <div className="ui-grid ui-grid-4">
                      <div>
                        <ProgressBar value={score.distanceScore} label="DISTANCE" thin />
                      </div>
                      <div>
                        <ProgressBar value={score.batteryScore} label="BATTERY" thin />
                      </div>
                      <div>
                        <ProgressBar value={score.payloadScore} label="PAYLOAD" thin />
                      </div>
                      <div>
                        <ProgressBar value={score.availabilityScore} label="AVAIL." thin />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-[#66778B]">
                      <span className="flex items-center gap-1"><Battery size={10} /> {drone.battery}%</span>
                      <span>{drone.range}km range</span>
                      <span>{drone.payload.join(', ')}</span>
                      <Badge variant="muted">{drone.protocol.toUpperCase()}</Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* Fleet overview */}
        <Card label="DRONE FLEET — STALOWA WOLA">
          <div className="ui-stack" style={{ gap: 10 }}>
            {drones.map(drone => (
              <div key={drone.id} className="ui-row-item" style={{ justifyContent: 'flex-start', gap: 16 }}>
                <div className="flex-1">
                  <div className="text-[11px] font-mono font-medium text-[#E6EDF3]">{drone.model}</div>
                  <div className="text-[10px] font-mono text-[#66778B]">{agencyLabel(drone.agency)} · {drone.operator}</div>
                </div>
                <div className="flex items-center gap-2">
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
                  <div className="text-[10px] font-mono text-[#00E5FF]">
                    ↗ {drone.mission.type.replace(/_/g, ' ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Mission history */}
        {missions.length > 0 && (
          <Card label={`MISSION LOG (${missions.length})`}>
            <div className="ui-stack" style={{ gap: 8 }}>
              {missions.map(m => (
                <div key={m.id} className="ui-row-item text-[10px] font-mono" style={{ justifyContent: 'flex-start', gap: 12 }}>
                  <span className="text-[#66778B]">{formatTimestamp(m.assignedAt)}</span>
                  <span className="text-[#94A3B8]">{m.droneId}</span>
                  <Badge variant="cyan">{m.type.replace(/_/g, ' ')}</Badge>
                  <span className="text-[#66778B]">→ {m.targetObjectId}</span>
                  <StatusBadge status={m.status} />
                </div>
              ))}
            </div>
          </Card>
        )}
      </PageSplitMain>
    </PageSplit>
  )
}
