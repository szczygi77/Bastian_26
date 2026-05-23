import { Wifi, WifiOff, Lock, Satellite, Brain, User, ShieldAlert } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { Switch } from '@/components/ui/Switch'
import { StatusDot } from '@/components/ui/StatusDot'

export function Topbar() {
  const { mode, setMode, online, systemHealth, operator } = useAppStore()
  const isSimulation = mode === 'simulation'

  return (
    <header
      style={{
        background: isSimulation
          ? 'linear-gradient(90deg, rgba(255,138,31,0.08) 0%, rgba(11,17,23,0.96) 100%)'
          : 'rgba(11,17,23,0.96)',
        backdropFilter: 'blur(20px) saturate(1.3)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
        borderBottom: isSimulation
          ? '1px solid rgba(255,138,31,0.18)'
          : '1px solid rgba(255,255,255,0.06)',
      }}
      className="flex-shrink-0 flex items-center justify-between px-4 h-11 z-10"
    >
      {/* Left: mode indicator + switch */}
      <div className="flex items-center gap-3">
        {isSimulation ? (
          <div
            className="flex items-center gap-2 px-2.5 py-1 rounded-[6px]"
            style={{
              background: 'rgba(255,138,31,0.12)',
              border: '1px solid rgba(255,138,31,0.28)',
            }}
          >
            <span
              className="w-1.5 h-1.5 bg-[#FF8A1F] rounded-full animate-pulse-dot"
              style={{ boxShadow: '0 0 6px rgba(255,138,31,0.7)' }}
            />
            <span className="font-mono text-[9px] font-bold text-[#FF8A1F] tracking-[0.16em]">SIMULATION MODE</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse-dot"
              style={{ boxShadow: '0 0 6px rgba(34,197,94,0.7)' }}
            />
            <span className="font-mono text-[9px] text-[#22C55E] tracking-[0.14em]">LIVE FEED</span>
          </div>
        )}

        <div className="w-px h-4 bg-[rgba(255,255,255,0.08)]" />

        <Switch
          checked={isSimulation}
          onChange={(val) => setMode(val ? 'simulation' : 'live')}
          accent={isSimulation ? 'orange' : 'green'}
          label={isSimulation ? 'SIM' : 'LIVE'}
        />
      </div>

      {/* Center: tactical status readouts */}
      <div className="flex items-center gap-5">
        <TelemetryItem
          icon={online ? <Wifi size={10} /> : <WifiOff size={10} />}
          label={online ? 'ONLINE' : 'OFFLINE'}
          ok={online}
        />
        <TelemetryItem
          icon={<Satellite size={10} />}
          label={`SAT ${systemHealth.satelliteCacheStatus === 'fresh' ? 'SYNC' : `STALE/${systemHealth.satelliteCacheAge}H`}`}
          ok={systemHealth.satelliteCacheStatus === 'fresh'}
          warn={systemHealth.satelliteCacheStatus !== 'fresh'}
        />
        <TelemetryItem
          icon={<Lock size={10} />}
          label="AES-256"
          ok
        />
        <TelemetryItem
          icon={<Brain size={10} />}
          label={systemHealth.localAiReady ? 'AI READY' : 'RULE-BASED'}
          ok={systemHealth.localAiReady}
          neutral={!systemHealth.localAiReady}
        />
        <StatusDot color="green" label="RCB" pulse={systemHealth.rcbLinkStatus !== 'connected'} />
        <StatusDot
          color={systemHealth.tetraLinkStatus === 'connected' ? 'green' : 'warning'}
          label="TETRA"
        />
        {!online && (
          <div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-[5px]"
            style={{ background: 'rgba(255,138,31,0.12)', border: '1px solid rgba(255,138,31,0.30)' }}
          >
            <ShieldAlert size={10} className="text-[#FF8A1F]" />
            <span className="font-mono text-[8px] text-[#FF8A1F] tracking-[0.12em]">DEGRADED</span>
          </div>
        )}
      </div>

      {/* Right: operator chip */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-[10px]"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div
          className="w-5 h-5 rounded-[5px] flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(255,138,31,0.12)', border: '1px solid rgba(255,138,31,0.25)' }}
        >
          <User size={10} className="text-[#FF8A1F]" />
        </div>
        <div>
          <div className="font-mono text-[10px] text-[#E6EDF3] tracking-wider leading-none">
            {operator?.name ?? 'OPERATOR'}
          </div>
          <div className="font-mono text-[8px] text-[#3D5060] tracking-[0.14em] uppercase mt-0.5">
            {operator?.role ?? 'commander'}
          </div>
        </div>
      </div>
    </header>
  )
}

function TelemetryItem({
  icon,
  label,
  ok,
  warn,
  neutral,
}: {
  icon: React.ReactNode
  label: string
  ok?: boolean
  warn?: boolean
  neutral?: boolean
}) {
  const color = ok ? 'text-[#22C55E]' : warn ? 'text-[#F59E0B]' : neutral ? 'text-[#66778B]' : 'text-[#EF4444]'
  return (
    <div className={`flex items-center gap-1.5 font-mono text-[9px] tracking-[0.10em] ${color}`}>
      {icon}
      <span>{label}</span>
    </div>
  )
}
