import { memo } from 'react'
import { useAppStore } from '@/store/useAppStore'

export const OperationalTelemetryRail = memo(function OperationalTelemetryRail() {
  const {
    operationalTelemetry,
    operationalPulse,
    online,
    eventHeartbeatAt,
  } = useAppStore()

  return (
    <div className="ops-telemetry-rail" aria-hidden>
      <div className="ops-telemetry-rail__segment">
        <span className="ops-telemetry-rail__dot" data-live={online ? '1' : '0'} />
        {online ? 'LINK' : 'OFFLINE'}
      </div>
      <div className="ops-telemetry-rail__segment">
        EPS <strong>{operationalTelemetry.throughputEps}</strong>
      </div>
      <div className="ops-telemetry-rail__segment">
        PKTS <strong>{operationalTelemetry.packetsProcessed.toLocaleString()}</strong>
      </div>
      <div className="ops-telemetry-rail__segment">
        STRESS <strong>{operationalTelemetry.stressLevel}%</strong>
      </div>
      {operationalPulse && (
        <div className="ops-telemetry-rail__segment">
          TRUST <strong>{operationalPulse.sourceFreshnessAvg}</strong>
        </div>
      )}
      <div className="ops-telemetry-rail__segment ops-telemetry-rail__segment--pulse">
        <span
          className="ops-telemetry-rail__scan"
          style={{ transform: `translateX(${operationalTelemetry.mapScanPhase * 100}%)` }}
        />
        SYNC {eventHeartbeatAt.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
    </div>
  )
})
