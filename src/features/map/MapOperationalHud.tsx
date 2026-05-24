import { memo } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { formatTimeAgo } from '@/utils/format'

export const MapOperationalHud = memo(function MapOperationalHud() {
  const {
    publicDataSources,
    operationalTelemetry,
    containmentRecovery,
    cascadeResult,
    online,
  } = useAppStore()

  const staleSources = publicDataSources.filter(s => s.status === 'stale' || s.status === 'error')
  const liveCount = publicDataSources.filter(s => s.status === 'live').length

  return (
    <div className="map-ops-hud">
      <div className="map-ops-hud__row">
        <span className={`map-ops-hud__badge ${online ? 'is-live' : 'is-degraded'}`}>
          {online ? 'MONITORING ACTIVE' : 'DEGRADED MODE'}
        </span>
        <span className="map-ops-hud__meta">
          {liveCount}/{publicDataSources.length} LIVE · stress {operationalTelemetry.stressLevel}%
        </span>
      </div>
      {cascadeResult && (
        <div className="map-ops-hud__row">
          <span className="map-ops-hud__warn">
            CASCADE {cascadeResult.affectedCount} nodes · impact {cascadeResult.totalImpactScore.toFixed(0)}
          </span>
        </div>
      )}
      {containmentRecovery?.active && (
        <div className="map-ops-hud__row">
          <div className="map-ops-hud__recovery">
            <span>RECOVERY {containmentRecovery.progress}%</span>
            <div className="map-ops-hud__recovery-track">
              <div style={{ width: `${containmentRecovery.progress}%` }} />
            </div>
          </div>
        </div>
      )}
      {staleSources.length > 0 && (
        <div className="map-ops-hud__row map-ops-hud__stale">
          STALE: {staleSources.map(s => s.sourceId).join(', ')}
        </div>
      )}
      <div className="map-ops-hud__sources">
        {publicDataSources.slice(0, 4).map(source => (
          <div key={source.sourceId} className="map-ops-hud__source">
            <span>{source.sourceId}</span>
            <span>{source.lastSync ? formatTimeAgo(source.lastSync) : '—'}</span>
          </div>
        ))}
      </div>
      <div
        className="map-ops-hud__sweep"
        style={{ left: `${operationalTelemetry.mapScanPhase * 100}%` }}
      />
    </div>
  )
})
