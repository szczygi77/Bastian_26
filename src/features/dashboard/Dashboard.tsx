import { useEffect } from 'react'
import { AlertTriangle, Activity, Shield, Wifi, Database, Radio, GitBranch } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { Card, StatCard } from '@/components/ui/Card'
import { Badge, SeverityBadge, StatusBadge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { StatusDot } from '@/components/ui/StatusDot'
import { formatTimeAgo, statusColor, criticalityLabel } from '@/utils/format'

function ThreatLevelGauge({ level }: { level: number }) {
  const label = level >= 80 ? 'KRYTYCZNY' : level >= 60 ? 'WYSOKI' : level >= 40 ? 'PODWYŻSZONY' : level >= 20 ? 'UMIARKOWANY' : 'NORMALNY'
  const color = level >= 80 ? '#EF4444' : level >= 60 ? '#FF8A1F' : level >= 40 ? '#F59E0B' : '#22C55E'

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <circle
            cx="60" cy="60" r="50" fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={`${(level / 100) * 314} 314`}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-mono font-bold" style={{ color }}>{level}</span>
          <span className="text-[9px] font-mono text-[#66778B]">/100</span>
        </div>
      </div>
      <div className="text-[10px] font-mono font-semibold tracking-wider" style={{ color }}>{label}</div>
    </div>
  )
}

export function Dashboard() {
  const { alerts, ikObjects, cascadeResult, systemHealth, refreshSystemHealth, drones, missions } = useAppStore()

  useEffect(() => {
    refreshSystemHealth()
    const interval = setInterval(refreshSystemHealth, 30000)
    return () => clearInterval(interval)
  }, [refreshSystemHealth])

  const activeAlerts = alerts.filter(a => a.status === 'active')
  const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical')
  const degradedObjects = ikObjects.filter(o => o.status !== 'operational')
  const activeMissions = missions.filter(m => m.status !== 'completed')
  const availableDrones = drones.filter(d => d.availability)

  const threatLevel = Math.min(100, criticalAlerts.length * 25 + degradedObjects.length * 10)
  const infraHealth = Math.round(((ikObjects.length - degradedObjects.length) / ikObjects.length) * 100)

  const criticalObjects = ikObjects
    .filter(o => o.criticality >= 4)
    .sort((a, b) => b.criticality - a.criticality)

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[13px] font-mono font-bold uppercase tracking-[0.15em] text-[#E6EDF3]">
            COMMAND DASHBOARD
          </h1>
          <p className="text-[11px] font-mono text-[#66778B] mt-0.5">
            Stalowa Wola — Infrastruktura Krytyczna · {ikObjects.length} obiektów IK
          </p>
        </div>
        <Badge variant={systemHealth.online ? 'green' : 'orange'}>
          {systemHealth.online ? 'ONLINE' : 'OFFLINE — TRYB DEGRADED'}
        </Badge>
      </div>

      {/* Top row: threat + stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card label="THREAT LEVEL" className="col-span-1 flex flex-col items-center py-4">
          <ThreatLevelGauge level={threatLevel} />
        </Card>

        <StatCard
          label="ACTIVE ALERTS"
          value={activeAlerts.length}
          sub={`${criticalAlerts.length} krytycznych`}
          accent={criticalAlerts.length > 0 ? 'danger' : undefined}
        />
        <StatCard
          label="INFRA HEALTH"
          value={infraHealth}
          unit="%"
          sub={`${degradedObjects.length} obiektów degraded/offline`}
          accent={infraHealth < 80 ? 'orange' : 'green'}
        />
        <StatCard
          label="DRONE READINESS"
          value={`${availableDrones.length}/${drones.length}`}
          sub={`${activeMissions.length} aktywnych misji`}
          accent="cyan"
        />
        <StatCard
          label="SYNC QUEUE"
          value={systemHealth.syncQueueLength}
          sub={systemHealth.lastSync ? `Ostatnia sync: ${formatTimeAgo(systemHealth.lastSync)}` : 'Brak synchronizacji'}
          accent={systemHealth.syncQueueLength > 0 ? 'orange' : undefined}
        />
      </div>

      {/* Public data sync status */}
      <Card label="PUBLIC DATA SYNC STATUS">
        <div className="grid grid-cols-4 gap-4">
          {Object.entries(systemHealth.publicDataSyncStatus).map(([key, sync]) => (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#66778B]">{key.toUpperCase()}</span>
                <StatusDot
                  status={sync.status === 'synced' ? 'ok' : sync.status === 'syncing' ? 'active' : sync.status === 'error' ? 'error' : 'offline'}
                  size="sm"
                />
              </div>
              <div className="text-[11px] font-mono text-[#94A3B8]">
                {sync.lastSync ? formatTimeAgo(sync.lastSync) : 'Brak danych'}
              </div>
              <ProgressBar value={Math.max(0, 100 - sync.dataAge)} variant="cyan" />
            </div>
          ))}
        </div>
      </Card>

      {/* Bottom row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Active alerts feed */}
        <Card label={`ACTIVE ALERTS (${activeAlerts.length})`} className="col-span-1">
          <div className="space-y-2 max-h-64 overflow-auto">
            {activeAlerts.length === 0 ? (
              <div className="text-[11px] font-mono text-[#66778B] py-4 text-center">Brak aktywnych alertów</div>
            ) : (
              activeAlerts.slice(0, 8).map(alert => (
                <div key={alert.id} className="flex items-start gap-2 py-2 border-b border-white/[0.04] last:border-0">
                  <SeverityBadge severity={alert.severity} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-mono text-[#E6EDF3] truncate">{alert.title}</div>
                    <div className="text-[10px] font-mono text-[#66778B]">{formatTimeAgo(alert.timestamp)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Critical objects */}
        <Card label="CRITICAL DEPENDENCIES AT RISK" className="col-span-1">
          <div className="space-y-2 max-h-64 overflow-auto">
            {criticalObjects.map(obj => (
              <div key={obj.id} className="flex items-center gap-3 py-1.5 border-b border-white/[0.04] last:border-0">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: statusColor(obj.status), boxShadow: `0 0 4px ${statusColor(obj.status)}60` }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-mono text-[#E6EDF3] truncate">{obj.shortName}</div>
                  <div className="text-[10px] font-mono text-[#66778B]">{criticalityLabel(obj.criticality)}</div>
                </div>
                <StatusBadge status={obj.status} />
              </div>
            ))}
          </div>
        </Card>

        {/* System status grid */}
        <Card label="SYSTEM STATUS" className="col-span-1">
          <div className="space-y-2.5">
            {[
              { label: 'Hot Standby', ok: systemHealth.hotStandbyActive },
              { label: 'Watchdog', ok: systemHealth.watchdogActive },
              { label: 'UPS', ok: systemHealth.upsActive },
              { label: 'Encryption', ok: systemHealth.encryptionActive },
              { label: 'Local DB', ok: systemHealth.localDbStatus === 'healthy' },
              { label: 'RCB Link', ok: systemHealth.rcbLinkStatus === 'connected' },
              { label: 'TETRA', ok: systemHealth.tetraLinkStatus === 'connected' },
              { label: 'GSM Fallback', ok: systemHealth.gsmFallbackStatus !== 'offline' },
            ].map(({ label, ok }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-[#94A3B8]">{label}</span>
                <StatusDot status={ok ? 'ok' : 'error'} size="sm" />
              </div>
            ))}
          </div>

          {cascadeResult && (
            <div className="mt-4 pt-3 border-t border-white/[0.06]">
              <div className="flex items-center gap-2 mb-2">
                <GitBranch size={11} className="text-[#FF8A1F]" />
                <span className="text-[10px] font-mono text-[#FF8A1F] uppercase tracking-wider">CASCADE ACTIVE</span>
              </div>
              <div className="text-[11px] font-mono text-[#94A3B8]">
                {cascadeResult.affectedCount} obiektów · Impact {cascadeResult.totalImpactScore.toFixed(0)}/100
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
