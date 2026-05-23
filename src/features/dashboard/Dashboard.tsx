import { useEffect } from 'react'
import { GitBranch, Activity, AlertTriangle, Cpu, Radio } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { Card, StatCard } from '@/components/ui/Card'
import { Badge, SeverityBadge, StatusBadge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { StatusDot, OperationalStatus } from '@/components/ui/StatusDot'
import { formatTimeAgo, statusColor, criticalityLabel } from '@/utils/format'

function ThreatGauge({ level }: { level: number }) {
  const label = level >= 80 ? 'KRYTYCZNY' : level >= 60 ? 'WYSOKI' : level >= 40 ? 'PODWYŻSZONY' : level >= 20 ? 'UMIARKOWANY' : 'NORMALNY'
  const color = level >= 80 ? '#EF4444' : level >= 60 ? '#FF8A1F' : level >= 40 ? '#F59E0B' : '#22C55E'
  const circumference = 2 * Math.PI * 46

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="label-xs">THREAT LEVEL</div>
      <div className="relative w-32 h-32">
        {/* Outer ring */}
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90 absolute inset-0">
          <circle cx="60" cy="60" r="46" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
          <circle cx="60" cy="60" r="46" fill="none" strokeWidth="1.5" stroke="rgba(255,255,255,0.06)"
            strokeDasharray="4 8" />
          <circle
            cx="60" cy="60" r="46" fill="none"
            stroke={color} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${(level / 100) * circumference} ${circumference}`}
            style={{ filter: `drop-shadow(0 0 8px ${color}90)`, transition: 'stroke-dasharray 0.6s ease' }}
          />
        </svg>
        {/* Inner glass */}
        <div
          className="absolute inset-[14px] rounded-full flex flex-col items-center justify-center"
          style={{
            background: 'rgba(5,7,10,0.8)',
            border: `1px solid ${color}25`,
            boxShadow: `inset 0 0 20px ${color}08`,
          }}
        >
          <span className="font-mono text-[24px] font-bold leading-none" style={{ color, textShadow: `0 0 12px ${color}70` }}>
            {level}
          </span>
          <span className="font-mono text-[8px] text-[#3D5060] mt-0.5">/100</span>
        </div>
      </div>
      <div className="font-mono text-[10px] font-semibold tracking-[0.16em]" style={{ color }}>
        {label}
      </div>
    </div>
  )
}

export function Dashboard() {
  const { alerts, ikObjects, cascadeResult, systemHealth, refreshSystemHealth, drones, missions } = useAppStore()

  useEffect(() => {
    refreshSystemHealth()
    const t = setInterval(refreshSystemHealth, 30000)
    return () => clearInterval(t)
  }, [refreshSystemHealth])

  const activeAlerts = alerts.filter(a => a.status === 'active')
  const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical')
  const degradedObjects = ikObjects.filter(o => o.status !== 'operational')
  const activeMissions = missions.filter(m => m.status !== 'completed')
  const availableDrones = drones.filter(d => d.availability)

  const threatLevel = Math.min(100, criticalAlerts.length * 25 + degradedObjects.length * 10)
  const infraHealth = Math.round(((ikObjects.length - degradedObjects.length) / Math.max(1, ikObjects.length)) * 100)

  const criticalObjects = ikObjects.filter(o => o.criticality >= 4).sort((a, b) => b.criticality - a.criticality)

  const sysChecks = [
    { label: 'Hot Standby',    ok: systemHealth.hotStandbyActive },
    { label: 'Watchdog',       ok: systemHealth.watchdogActive },
    { label: 'UPS',            ok: systemHealth.upsActive },
    { label: 'Encryption',     ok: systemHealth.encryptionActive },
    { label: 'Local DB',       ok: systemHealth.localDbStatus === 'healthy' },
    { label: 'RCB Link',       ok: systemHealth.rcbLinkStatus === 'connected' },
    { label: 'TETRA',          ok: systemHealth.tetraLinkStatus === 'connected' },
    { label: 'GSM Fallback',   ok: systemHealth.gsmFallbackStatus !== 'offline' },
  ]

  return (
    <div className="h-full overflow-auto p-5 space-y-4 tactical-grid">
      {/* Page header */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-3">
          <div
            className="w-1 h-6 rounded-full"
            style={{
              background: 'linear-gradient(180deg, #FF8A1F 0%, rgba(255,138,31,0.2) 100%)',
              boxShadow: '0 0 8px rgba(255,138,31,0.5)',
            }}
          />
          <div>
            <h1 className="heading-tactical text-[13px]">COMMAND DASHBOARD</h1>
            <p className="font-mono text-[9px] text-[#3D5060] mt-0.5 tracking-wider">
              STALOWA WOLA · IK AWARENESS · {ikObjects.length} OBIEKTÓW · {new Date().toLocaleString('pl-PL', { hour12: false })}
            </p>
          </div>
        </div>
        <Badge variant={systemHealth.online ? 'green' : 'orange'} dot pulse={!systemHealth.online}>
          {systemHealth.online ? 'SYSTEM ONLINE' : 'TRYB DEGRADED'}
        </Badge>
      </div>

      {/* Top stats row */}
      <div className="grid grid-cols-5 gap-3">
        {/* Threat gauge */}
        <div
          className="glass-panel rounded-[14px] p-4 flex flex-col items-center justify-center col-span-1"
          style={threatLevel >= 60 ? { borderColor: 'rgba(239,68,68,0.20)', boxShadow: '0 0 20px rgba(239,68,68,0.08)' } : undefined}
        >
          <ThreatGauge level={threatLevel} />
        </div>

        <StatCard label="ACTIVE ALERTS" value={activeAlerts.length}
          sub={`${criticalAlerts.length} krytycznych`}
          accent={criticalAlerts.length > 0 ? 'danger' : undefined}
        />
        <StatCard label="INFRA HEALTH" value={infraHealth} unit="%"
          sub={`${degradedObjects.length} degraded/offline`}
          accent={infraHealth < 80 ? 'orange' : 'green'}
        />
        <StatCard label="DRONE READINESS" value={`${availableDrones.length}/${drones.length}`}
          sub={`${activeMissions.length} aktywnych misji`}
          accent="cyan"
        />
        <StatCard label="SYNC QUEUE" value={systemHealth.syncQueueLength}
          sub={systemHealth.lastSync ? `Sync: ${formatTimeAgo(systemHealth.lastSync)}` : 'Oczekuje'}
          accent={systemHealth.syncQueueLength > 0 ? 'orange' : undefined}
        />
      </div>

      {/* Data sync status */}
      <div className="glass-panel rounded-[14px] p-4">
        <div className="label-xs mb-3 flex items-center gap-2">
          <Activity size={10} className="text-[#FF8A1F]" />
          PUBLIC DATA SYNC
        </div>
        <div className="grid grid-cols-4 gap-5">
          {Object.entries(systemHealth.publicDataSyncStatus).map(([key, sync]) => (
            <div key={key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] uppercase tracking-wider text-[#66778B]">{key}</span>
                <StatusDot
                  color={sync.status === 'synced' ? 'green' : sync.status === 'syncing' ? 'cyan' : sync.status === 'error' ? 'danger' : 'muted'}
                  pulse={sync.status === 'syncing'}
                  size="xs"
                />
              </div>
              <div className="font-mono text-[10px] text-[#94A3B8]">
                {sync.lastSync ? formatTimeAgo(sync.lastSync) : '—'}
              </div>
              <ProgressBar value={Math.max(0, 100 - sync.dataAge)} accent="cyan" thin />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom 3-col grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Active alerts */}
        <div className="glass-panel rounded-[14px] p-4">
          <div className="label-xs mb-3 flex items-center gap-2">
            <AlertTriangle size={10} className="text-[#EF4444]" />
            ACTIVE ALERTS ({activeAlerts.length})
          </div>
          <div className="space-y-1 max-h-60 overflow-auto">
            {activeAlerts.length === 0 ? (
              <div className="font-mono text-[11px] text-[#3D5060] py-6 text-center">
                Brak aktywnych alertów
              </div>
            ) : activeAlerts.slice(0, 10).map(alert => (
              <div
                key={alert.id}
                className="flex items-start gap-2 px-2.5 py-2 rounded-[8px] transition-colors hover:bg-[rgba(255,255,255,0.03)]"
                style={{ borderLeft: `2px solid ${alert.severity === 'critical' ? 'rgba(239,68,68,0.5)' : alert.severity === 'high' ? 'rgba(255,138,31,0.5)' : 'rgba(245,158,11,0.4)'}` }}
              >
                <SeverityBadge severity={alert.severity} />
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[11px] text-[#E6EDF3] truncate">{alert.title}</div>
                  <div className="font-mono text-[9px] text-[#3D5060] mt-0.5">{formatTimeAgo(alert.timestamp)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Critical objects */}
        <div className="glass-panel rounded-[14px] p-4">
          <div className="label-xs mb-3 flex items-center gap-2">
            <GitBranch size={10} className="text-[#FF8A1F]" />
            OBIEKTY KRYTYCZNE
          </div>
          <div className="space-y-0.5 max-h-60 overflow-auto">
            {criticalObjects.map(obj => (
              <div
                key={obj.id}
                className="flex items-center gap-2.5 px-2 py-2 rounded-[7px] transition-colors hover:bg-[rgba(255,255,255,0.025)]"
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    background: statusColor(obj.status),
                    boxShadow: `0 0 5px ${statusColor(obj.status)}70`,
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[11px] text-[#E6EDF3] truncate">{obj.shortName}</div>
                  <div className="font-mono text-[9px] text-[#3D5060]">{criticalityLabel(obj.criticality)}</div>
                </div>
                <StatusBadge status={obj.status} />
              </div>
            ))}
          </div>
        </div>

        {/* System status */}
        <div className="glass-panel rounded-[14px] p-4">
          <div className="label-xs mb-3 flex items-center gap-2">
            <Cpu size={10} className="text-[#00E5FF]" />
            SYSTEM STATUS
          </div>
          <div className="space-y-2">
            {sysChecks.map(({ label, ok }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-[#66778B]">{label}</span>
                <StatusDot color={ok ? 'green' : 'danger'} pulse={!ok} size="xs" />
              </div>
            ))}
          </div>

          {cascadeResult && (
            <div
              className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.06)] space-y-1"
            >
              <div className="flex items-center gap-1.5">
                <Radio size={10} className="text-[#FF8A1F]" />
                <span className="font-mono text-[9px] text-[#FF8A1F] uppercase tracking-wider">
                  CASCADE PROPAGATION
                </span>
              </div>
              <div className="font-mono text-[10px] text-[#94A3B8]">
                {cascadeResult.affectedCount} obiektów · Impact score: {cascadeResult.totalImpactScore.toFixed(0)}/100
              </div>
              <ProgressBar value={cascadeResult.totalImpactScore} accent="danger" thin />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
