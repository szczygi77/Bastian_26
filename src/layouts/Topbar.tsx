import { Wifi, WifiOff, Lock, Satellite, Brain, User, ShieldAlert, ChevronDown } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { Switch } from '@/components/ui/Switch'

export function Topbar() {
  const { mode, setMode, online, systemHealth, operator } = useAppStore()
  const isSimulation = mode === 'simulation'

  return (
    <header
      style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 48,
        padding: '0 20px',
        zIndex: 10,
        background: isSimulation
          ? 'linear-gradient(90deg, rgba(255,138,31,0.07) 0%, rgba(11,17,23,0.97) 100%)'
          : 'rgba(11,17,23,0.97)',
        backdropFilter: 'blur(20px) saturate(1.3)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
        borderBottom: isSimulation
          ? '1px solid rgba(255,138,31,0.16)'
          : '1px solid rgba(255,255,255,0.06)',
        gap: 16,
      }}
    >
      {/* ── Left: mode indicator ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        {isSimulation ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '4px 10px',
              borderRadius: 6,
              background: 'rgba(255,138,31,0.11)',
              border: '1px solid rgba(255,138,31,0.28)',
            }}
          >
            <span
              className="animate-pulse-dot"
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#FF8A1F',
                boxShadow: '0 0 7px rgba(255,138,31,0.75)',
                display: 'block',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                fontWeight: 700,
                color: '#FF8A1F',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              SIMULATION MODE
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              className="animate-pulse-dot"
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#22C55E',
                boxShadow: '0 0 7px rgba(34,197,94,0.75)',
                display: 'block',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: '#22C55E',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
              }}
            >
              LIVE FEED
            </span>
          </div>
        )}

        {/* Divider */}
        <div
          style={{
            width: 1,
            height: 18,
            background: 'rgba(255,255,255,0.08)',
            flexShrink: 0,
          }}
        />

        <Switch
          checked={isSimulation}
          onChange={(val) => setMode(val ? 'simulation' : 'live')}
          accent={isSimulation ? 'orange' : 'green'}
          label={isSimulation ? 'SIM' : 'LIVE'}
        />
      </div>

      {/* ── Center: telemetry status ──────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          flex: 1,
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <TelemetryChip
          icon={online ? <Wifi size={10} /> : <WifiOff size={10} />}
          label={online ? 'ONLINE' : 'OFFLINE'}
          status={online ? 'ok' : 'err'}
        />
        <TelemetryChip
          icon={<Satellite size={10} />}
          label={
            systemHealth.satelliteCacheStatus === 'fresh'
              ? 'SAT SYNC'
              : `SAT STALE/${systemHealth.satelliteCacheAge}H`
          }
          status={systemHealth.satelliteCacheStatus === 'fresh' ? 'ok' : 'warn'}
        />
        <TelemetryChip
          icon={<Lock size={10} />}
          label="AES-256"
          status="ok"
        />
        <TelemetryChip
          icon={<Brain size={10} />}
          label={systemHealth.localAiReady ? 'AI READY' : 'RULE-BASED'}
          status={systemHealth.localAiReady ? 'ok' : 'muted'}
        />

        {/* RCB / TETRA pills */}
        <LinkPill
          label="RCB"
          connected={systemHealth.rcbLinkStatus === 'connected'}
        />
        <LinkPill
          label="TETRA"
          connected={systemHealth.tetraLinkStatus === 'connected'}
        />

        {/* Degraded badge */}
        {!online && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 8px',
              borderRadius: 5,
              background: 'rgba(255,138,31,0.11)',
              border: '1px solid rgba(255,138,31,0.30)',
              marginLeft: 4,
            }}
          >
            <ShieldAlert size={10} style={{ color: '#FF8A1F', flexShrink: 0 }} />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 8,
                color: '#FF8A1F',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              DEGRADED
            </span>
          </div>
        )}
      </div>

      {/* ── Right: operator chip ─────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '6px 12px',
          borderRadius: 10,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
          cursor: 'default',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            background: 'rgba(255,138,31,0.12)',
            border: '1px solid rgba(255,138,31,0.28)',
          }}
        >
          <User size={12} style={{ color: '#FF8A1F' }} />
        </div>

        {/* Info */}
        <div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 600,
              color: '#E6EDF3',
              letterSpacing: '0.06em',
              lineHeight: 1,
              whiteSpace: 'nowrap',
            }}
          >
            {operator?.name ?? 'OPERATOR'}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 8,
              color: '#3D5060',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              marginTop: 3,
              lineHeight: 1,
            }}
          >
            {operator?.role ?? 'commander'} · CL{operator?.clearanceLevel ?? '?'}
          </div>
        </div>

        <ChevronDown size={10} style={{ color: '#3D5060', marginLeft: 2, flexShrink: 0 }} />
      </div>
    </header>
  )
}

/* ── Telemetry chip ────────────────────────────────────────────────────────── */
function TelemetryChip({
  icon,
  label,
  status,
}: {
  icon: React.ReactNode
  label: string
  status: 'ok' | 'err' | 'warn' | 'muted'
}) {
  const colors: Record<string, string> = {
    ok:   '#22C55E',
    err:  '#EF4444',
    warn: '#F59E0B',
    muted:'#66778B',
  }
  const color = colors[status]

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 8px',
        borderRadius: 5,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        color,
        flexShrink: 0,
        transition: 'background 0.12s ease',
      }}
    >
      {icon}
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </div>
  )
}

/* ── Link status pill ──────────────────────────────────────────────────────── */
function LinkPill({ label, connected }: { label: string; connected: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 8px',
        borderRadius: 5,
        background: connected ? 'rgba(34,197,94,0.06)' : 'rgba(255,138,31,0.06)',
        border: connected
          ? '1px solid rgba(34,197,94,0.18)'
          : '1px solid rgba(255,138,31,0.18)',
        flexShrink: 0,
      }}
    >
      <span
        className={connected ? 'animate-pulse-dot' : undefined}
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: connected ? '#22C55E' : '#FF8A1F',
          boxShadow: connected
            ? '0 0 5px rgba(34,197,94,0.7)'
            : '0 0 5px rgba(255,138,31,0.6)',
          display: 'block',
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: connected ? '#22C55E' : '#FF8A1F',
        }}
      >
        {label}
      </span>
    </div>
  )
}
