import { useEffect } from 'react'
import { Activity, Lock, Satellite, Database, Cpu, Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { formatTimeAgo, formatDuration } from '@/utils/format'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StatusDot } from '@/components/ui/StatusDot'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'

function ConnectionRow({ label, status, detail }: { label: string; status: string; detail?: string }) {
  const ok = status === 'connected' || status === 'ready' || status === 'healthy'
  const warn = status === 'degraded' || status === 'active'
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
      <span className="text-[11px] font-mono text-[#94A3B8]">{label}</span>
      <div className="flex items-center gap-3">
        {detail && <span className="text-[10px] font-mono text-[#66778B]">{detail}</span>}
        <StatusDot status={ok ? 'ok' : warn ? 'warn' : 'error'} size="sm" />
        <span className={`text-[10px] font-mono ${ok ? 'text-[#22C55E]' : warn ? 'text-[#F59E0B]' : 'text-[#EF4444]'}`}>
          {status.toUpperCase()}
        </span>
      </div>
    </div>
  )
}

export function SystemStatus() {
  const { systemHealth, refreshSystemHealth, online } = useAppStore()

  useEffect(() => {
    refreshSystemHealth()
    const interval = setInterval(refreshSystemHealth, 15000)
    return () => clearInterval(interval)
  }, [refreshSystemHealth])

  const uptimeDays = Math.floor(systemHealth.uptime / 86400)
  const uptimeHours = Math.floor((systemHealth.uptime % 86400) / 3600)
  const uptimeMin = Math.floor((systemHealth.uptime % 3600) / 60)
  const uptimeStr = `${uptimeDays}d ${uptimeHours}h ${uptimeMin}m`

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity size={18} className="text-[#00E5FF]" />
          <div>
            <h1 className="text-[13px] font-mono font-bold uppercase tracking-[0.15em] text-[#E6EDF3]">SYSTEM STATUS</h1>
            <p className="text-[11px] font-mono text-[#66778B]">Uptime: {uptimeStr} · SLA 99.9% · RTO 4h · RPO 1h</p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={refreshSystemHealth}>
          <RefreshCw size={11} /> REFRESH
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Core infrastructure */}
        <Card label="CORE INFRASTRUCTURE">
          <ConnectionRow label="Hot Standby (60s)" status={systemHealth.hotStandbyActive ? 'connected' : 'offline'} detail="Active-Passive" />
          <ConnectionRow label="Watchdog" status={systemHealth.watchdogActive ? 'connected' : 'offline'} detail="Auto-restart" />
          <ConnectionRow label="UPS" status={systemHealth.upsActive ? 'connected' : 'offline'} detail="≥12h" />
          <ConnectionRow label="Local DB (IndexedDB)" status={systemHealth.localDbStatus} />
          <ConnectionRow label="Encryption (AES-256)" status={systemHealth.encryptionActive ? 'connected' : 'offline'} detail="TLS 1.3" />
          <ConnectionRow label="Local AI" status={systemHealth.localAiReady ? 'ready' : 'degraded'} detail="Rule-based fallback" />
        </Card>

        {/* Communication links */}
        <Card label="COMMUNICATION LINKS (MOCK)">
          <ConnectionRow label="RCB / PIONIER" status={systemHealth.rcbLinkStatus} detail="AES-256 E2E" />
          <ConnectionRow label="TETRA (Służby)" status={systemHealth.tetraLinkStatus} detail="CH 1-9" />
          <ConnectionRow label="GSM Fallback" status={systemHealth.gsmFallbackStatus} detail="SMS Queue" />
          <ConnectionRow label="Internet (Public)" status={online ? 'connected' : 'offline'} detail={online ? 'Sync active' : 'Degraded mode'} />

          <div className="pt-3 mt-2">
            <div className="text-[10px] font-mono text-[#66778B] uppercase tracking-wider mb-2">SYNC QUEUE</div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-[#94A3B8]">{systemHealth.syncQueueLength} wiadomości oczekujących</span>
              {systemHealth.syncQueueLength > 0 ? (
                <Badge variant="orange">{systemHealth.syncQueueLength} PENDING</Badge>
              ) : (
                <Badge variant="green">CLEAR</Badge>
              )}
            </div>
          </div>
        </Card>

        {/* Satellite & data */}
        <Card label="SATELLITE & PUBLIC DATA">
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Satellite size={11} className="text-[#94A3B8]" />
                  <span className="text-[10px] font-mono text-[#66778B] uppercase tracking-wider">Satellite Cache</span>
                </div>
                <Badge variant={systemHealth.satelliteCacheStatus === 'fresh' ? 'green' : 'warning'}>
                  {systemHealth.satelliteCacheStatus.toUpperCase()}
                </Badge>
              </div>
              <div className="text-[10px] font-mono text-[#66778B]">Wiek danych: {systemHealth.satelliteCacheAge}h</div>
              <div className="text-[10px] font-mono text-[#66778B]">Sentinel-1 SAR · Revisit: 6 dni</div>
              <ProgressBar value={Math.max(0, 100 - systemHealth.satelliteCacheAge * 2)} className="mt-2" />
            </div>

            <div className="border-t border-white/[0.04] pt-3 space-y-2">
              {Object.entries(systemHealth.publicDataSyncStatus).map(([key, sync]) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-[#66778B] uppercase">{key}</span>
                    <StatusDot
                      status={sync.status === 'synced' ? 'ok' : sync.status === 'syncing' ? 'active' : 'error'}
                      size="sm"
                    />
                  </div>
                  <div className="text-[10px] font-mono text-[#66778B]">
                    {sync.lastSync ? formatTimeAgo(sync.lastSync) : 'Nigdy'} · {sync.dataAge}min stale
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Security */}
      <Card label="SECURITY POSTURE">
        <div className="grid grid-cols-3 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Lock size={13} className="text-[#22C55E]" />
              <span className="text-[11px] font-mono font-medium text-[#E6EDF3]">ENCRYPTION</span>
            </div>
            <div className="space-y-1 text-[10px] font-mono text-[#66778B]">
              <div>Data at rest: AES-256 ✓</div>
              <div>Data in transit: TLS 1.3 ✓</div>
              <div>Key management: HSM-ready</div>
              <div>Key rotation: 90 dni</div>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Cpu size={13} className="text-[#00E5FF]" />
              <span className="text-[11px] font-mono font-medium text-[#E6EDF3]">ACCESS CONTROL</span>
            </div>
            <div className="space-y-1 text-[10px] font-mono text-[#66778B]">
              <div>RBAC: 5 ról ✓</div>
              <div>MFA: wymagane ✓</div>
              <div>Min. uprawnień: active ✓</div>
              <div>Auto-logout: 15min</div>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Database size={13} className="text-[#94A3B8]" />
              <span className="text-[11px] font-mono font-medium text-[#E6EDF3]">DATA POLICY</span>
            </div>
            <div className="space-y-1 text-[10px] font-mono text-[#66778B]">
              <div>Deployment: ON-PREMISE ✓</div>
              <div>No public cloud ✓</div>
              <div>Audit retention: 5 lat ✓</div>
              <div>Air-gap capable: ready</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Mode indicator */}
      <Card label="DEPLOYMENT MODE">
        <div className="flex items-center gap-4">
          {online ? <Wifi size={20} className="text-[#22C55E]" /> : <WifiOff size={20} className="text-[#FF8A1F]" />}
          <div>
            <div className={`text-[14px] font-mono font-bold ${online ? 'text-[#22C55E]' : 'text-[#FF8A1F]'}`}>
              {online ? 'ONLINE — LIVE DATA' : 'OFFLINE — DEGRADED MODE'}
            </div>
            <div className="text-[11px] font-mono text-[#66778B]">
              {online
                ? 'Pełna synchronizacja danych publicznych aktywna. Dane kaskadowe na żywo.'
                : 'Praca na lokalnym cache. Alerty zapisywane w IndexedDB. Sync queue aktywna.'}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
