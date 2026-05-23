import { useState, useRef, useEffect } from 'react'
import { User, ChevronDown, LogOut } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { logAction } from '@/services/auditLogService'
import { Switch } from '@/components/ui/Switch'
import { useElectronShell } from '@/hooks/useElectronShell'
import type { Operator, OperatorRole } from '@/types'

const ROLE_LABEL: Record<OperatorRole, string> = {
  commander: 'Dowódca',
  analyst: 'Analityk',
  operator: 'Operator',
  admin: 'Administrator',
  auditor: 'Audytor',
}

export function Topbar() {
  const { mode, setMode, operator } = useAppStore()
  const { chromeHeaderHeight } = useElectronShell()
  const isSimulation = mode === 'simulation'

  return (
    <header className="glass-strong window-drag" style={{
      flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      height: chromeHeaderHeight, padding: '0 20px', zIndex: 10, gap: 16,
      borderBottom: isSimulation ? '1px solid rgba(255,138,31,0.16)' : '1px solid rgba(255,255,255,0.06)',
      background: isSimulation
        ? 'linear-gradient(90deg, rgba(255,138,31,0.07) 0%, rgba(29,20,13,0.95) 100%)'
        : undefined,
    }}>
      <div className="window-no-drag" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {isSimulation && (
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
            color: '#FF8A1F', letterSpacing: '0.16em', textTransform: 'uppercase',
          }}>
            Tryb symulacji
          </span>
        )}
        <Switch
          checked={isSimulation}
          onChange={(val) => setMode(val ? 'simulation' : 'live')}
          accent={isSimulation ? 'orange' : 'green'}
          label={isSimulation ? 'SYMULACJA' : 'LIVE'}
        />
      </div>

      <OperatorMenu operator={operator} />
    </header>
  )
}

function OperatorMenu({ operator }: { operator: Operator | null }) {
  const { setOperator, addAuditEntry, mode } = useAppStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onOutside)
      document.removeEventListener('keydown', onEscape)
    }
  }, [open])

  function handleLogout() {
    if (!operator) return
    addAuditEntry(logAction({
      operator: operator.name,
      action: 'logout',
      details: 'Wylogowanie z systemu',
      mode,
    }))
    setOperator(null)
    setOpen(false)
  }

  return (
    <div ref={ref} className="window-no-drag" style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '6px 12px', borderRadius: 10, cursor: 'pointer',
          background: open ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
          border: open ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(255,255,255,0.08)',
          transition: 'all 0.15s ease',
        }}
      >
        <div style={{
          width: 24, height: 24, borderRadius: 6, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,138,31,0.12)', border: '1px solid rgba(255,138,31,0.28)',
        }}>
          <User size={12} style={{ color: '#FF8A1F' }} />
        </div>

        <div style={{ textAlign: 'left' }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
            color: '#E6EDF3', letterSpacing: '0.06em', lineHeight: 1, whiteSpace: 'nowrap',
          }}>
            {operator?.name ?? 'OPERATOR'}
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 8, color: '#3D5060',
            letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 3, lineHeight: 1,
          }}>
            {operator?.role ?? 'commander'} · CL{operator?.clearanceLevel ?? '?'}
          </div>
        </div>

        <ChevronDown
          size={10}
          style={{
            color: '#66778B', marginLeft: 2, flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s ease',
          }}
        />
      </button>

      {open && operator && (
        <div
          role="menu"
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0,
            minWidth: 240, padding: '6px 0',
            background: 'rgba(18, 24, 32, 0.96)',
            backdropFilter: 'blur(20px) saturate(1.4)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 10, boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
            zIndex: 100,
          }}
        >
          <div style={{ padding: '10px 14px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: '#E6EDF3',
            }}>
              {operator.name}
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 9, color: '#66778B', marginTop: 6, lineHeight: 1.5,
            }}>
              {ROLE_LABEL[operator.role]}<br />
              {operator.unit}<br />
              Poziom dostępu: {operator.clearanceLevel}
            </div>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 14px', border: 'none', background: 'transparent',
              cursor: 'pointer', textAlign: 'left',
              fontFamily: 'var(--font-mono)', fontSize: 10, color: '#EF4444',
              letterSpacing: '0.06em',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <LogOut size={12} />
            Wyloguj
          </button>
        </div>
      )}
    </div>
  )
}
