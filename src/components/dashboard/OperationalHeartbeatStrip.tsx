import { Activity, Radio, Shield, Zap } from 'lucide-react'
import { formatTimeAgo } from '@/utils/format'
import type { OperationalEvent, OperationalPulse } from '@/types'

export function OperationalHeartbeatStrip({
  pulse,
  events,
}: {
  pulse: OperationalPulse | null
  events: OperationalEvent[]
}) {
  if (!pulse) return null

  const pressureColor =
    pulse.propagationPressure >= 70 ? '#EF4444' :
    pulse.propagationPressure >= 40 ? '#FF8A1F' : '#22C55E'

  return (
    <div className="ops-heartbeat">
      <div className="ops-heartbeat__metrics">
        <div className="ops-heartbeat__metric">
          <Activity size={12} />
          <span>TRUST</span>
          <strong>{pulse.sourceFreshnessAvg}</strong>
        </div>
        <div className="ops-heartbeat__metric">
          <Zap size={12} />
          <span>KASKADA</span>
          <strong style={{ color: pressureColor }}>{pulse.propagationPressure}%</strong>
        </div>
        <div className="ops-heartbeat__metric">
          <Radio size={12} />
          <span>SYNC Q</span>
          <strong>{pulse.syncQueuePressure}%</strong>
        </div>
        <div className="ops-heartbeat__metric">
          <Shield size={12} />
          <span>INTEGRITY</span>
          <strong style={{ color: pulse.integrityOk ? '#22C55E' : '#F59E0B' }}>
            {pulse.integrityOk ? 'OK' : 'WARN'}
          </strong>
        </div>
        <span className="ops-heartbeat__probe">
          probe {formatTimeAgo(pulse.lastProbeAt)}
        </span>
      </div>
      <div className="ops-heartbeat__rail">
        {events.slice(0, 6).map(ev => (
          <div
            key={ev.id}
            className={`ops-heartbeat__event ops-heartbeat__event--${ev.severity}`}
            title={ev.message}
          >
            <span className="ops-heartbeat__event-type">{ev.type.replace(/_/g, ' ')}</span>
            <span className="ops-heartbeat__event-msg">{ev.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
