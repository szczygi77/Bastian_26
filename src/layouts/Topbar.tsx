import { Wifi, WifiOff, Lock, Satellite, Brain, User } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { Switch } from '@/components/ui/Switch'
import { StatusDot } from '@/components/ui/StatusDot'
import { cn } from '@/utils/cn'

export function Topbar() {
  const { mode, setMode, online, systemHealth, operator } = useAppStore()
  const isSimulation = mode === 'simulation'

  return (
    <header
      className={cn(
        'flex-shrink-0 flex items-center justify-between px-4 h-12 border-b border-white/[0.06] z-10',
        isSimulation
          ? 'bg-[#FF8A1F]/8 border-b-[#FF8A1F]/20'
          : 'glass-strong'
      )}
    >
      {/* Left: mode + simulation indicator */}
      <div className="flex items-center gap-4">
        {isSimulation && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-[8px] bg-[#FF8A1F]/15 border border-[#FF8A1F]/30">
            <span className="w-1.5 h-1.5 bg-[#FF8A1F] rounded-full animate-pulse" />
            <span className="text-[10px] font-mono font-bold text-[#FF8A1F] tracking-[0.15em]">SIMULATION MODE</span>
          </div>
        )}
        {!isSimulation && (
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#22C55E] rounded-full animate-pulse-cyan" />
            <span className="text-[10px] font-mono text-[#22C55E] tracking-[0.12em]">LIVE</span>
          </div>
        )}

        <Switch
          checked={isSimulation}
          onChange={(val) => setMode(val ? 'simulation' : 'live')}
          variant={isSimulation ? 'orange' : 'green'}
          label={isSimulation ? 'SIM' : 'LIVE'}
        />
      </div>

      {/* Center: status grid */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#66778B]">
          {online ? <Wifi size={11} className="text-[#22C55E]" /> : <WifiOff size={11} className="text-[#EF4444]" />}
          <span className={online ? 'text-[#22C55E]' : 'text-[#EF4444]'}>{online ? 'ONLINE' : 'OFFLINE'}</span>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          <Satellite size={11} className="text-[#94A3B8]" />
          <span className={cn(
            systemHealth.satelliteCacheStatus === 'fresh' ? 'text-[#22C55E]' : 'text-[#F59E0B]'
          )}>
            SAT {systemHealth.satelliteCacheStatus === 'fresh' ? 'FRESH' : `STALE ${systemHealth.satelliteCacheAge}H`}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          <Lock size={11} className="text-[#22C55E]" />
          <span className="text-[#22C55E]">AES-256</span>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          <Brain size={11} className="text-[#66778B]" />
          <span className="text-[#66778B]">AI {systemHealth.localAiReady ? 'READY' : 'RULE-BASED'}</span>
        </div>

        <StatusDot
          status={systemHealth.rcbLinkStatus === 'connected' ? 'ok' : 'offline'}
          label="RCB"
          size="sm"
        />
        <StatusDot
          status={systemHealth.tetraLinkStatus === 'connected' ? 'ok' : 'warn'}
          label="TETRA"
          size="sm"
        />
      </div>

      {/* Right: operator */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-[14px] bg-white/[0.04] border border-white/[0.08]">
        <User size={12} className="text-[#66778B]" />
        <div className="text-right">
          <div className="text-[11px] font-mono text-[#E6EDF3]">{operator?.name ?? 'OPERATOR'}</div>
          <div className="text-[9px] font-mono text-[#66778B] uppercase tracking-wider">{operator?.role ?? 'commander'}</div>
        </div>
      </div>
    </header>
  )
}
