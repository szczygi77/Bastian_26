import { useState, useRef, useEffect } from 'react'
import { User, ChevronDown, LogOut, Radio, FlaskConical } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { logAction } from '@/services/auditLogService'
import { useElectronShell } from '@/hooks/useElectronShell'
import type { Operator, OperatorRole, SystemMode } from '@/types'

const ROLE_LABEL: Record<OperatorRole, string> = {
  commander: 'Dowódca',
  analyst: 'Analityk',
  operator: 'Operator',
  admin: 'Administrator',
  auditor: 'Audytor',
}

export function Topbar() {
  const { operator, mode, setMode, addAuditEntry } = useAppStore()
  const { sidebarBrandHeight } = useElectronShell()

  function toggleMode(next: SystemMode) {
    if (mode === next) return
    setMode(next)
  }

  return (
    <header
      className="glass-strong window-drag"
      style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: sidebarBrandHeight,
        padding: '0 24px',
        zIndex: 10,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <ModeToggle mode={mode} onChange={toggleMode} />
      <OperatorMenu operator={operator} />
    </header>
  )
}

function ModeToggle({ mode, onChange }: { mode: SystemMode; onChange: (m: SystemMode) => void }) {
  return (
    <div className="window-no-drag mode-toggle" role="group" aria-label="Tryb operacyjny">
      <button
        type="button"
        className={`mode-toggle__btn${mode === 'live' ? ' is-active' : ''}`}
        onClick={() => onChange('live')}
      >
        <Radio size={12} aria-hidden />
        LIVE
      </button>
      <button
        type="button"
        className={`mode-toggle__btn${mode === 'simulation' ? ' is-active is-simulation' : ''}`}
        onClick={() => onChange('simulation')}
      >
        <FlaskConical size={12} aria-hidden />
        SIMULATION
      </button>
    </div>
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
    void logAction({
      operator: operator.name,
      action: 'logout',
      details: 'Wylogowanie z systemu',
      mode,
    }).then(entry => addAuditEntry(entry))
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
          padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
          background: open ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
          border: open ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(255,255,255,0.08)',
          transition: 'all 0.15s ease',
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,138,31,0.12)', border: '1px solid rgba(255,138,31,0.28)',
        }}>
          <User size={16} style={{ color: '#FF8A1F' }} />
        </div>

        <div style={{ textAlign: 'left' }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
            color: '#E6EDF3', letterSpacing: '0.04em', lineHeight: 1, whiteSpace: 'nowrap',
          }}>
            {operator?.name ?? 'OPERATOR'}
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 9, color: '#3D5060',
            letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 4, lineHeight: 1,
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
