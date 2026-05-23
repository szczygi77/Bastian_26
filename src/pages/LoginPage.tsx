import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, Shield, Eye, EyeOff, ChevronRight, Fingerprint } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { logAction } from '@/services/auditLogService'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import type { Operator, OperatorRole } from '@/types'

const DEMO_OPERATORS: Operator[] = [
  { id: 'op-1', name: 'mjr. Andrzej Kowalski',       role: 'commander', clearanceLevel: 5, unit: 'CZK Stalowa Wola',  mfaVerified: true },
  { id: 'op-2', name: 'kpt. Maria Nowak',             role: 'analyst',   clearanceLevel: 4, unit: 'RCB Warszawa',      mfaVerified: true },
  { id: 'op-3', name: 'st. sierż. Piotr Wiśniewski',  role: 'operator',  clearanceLevel: 3, unit: 'KPP Stalowa Wola', mfaVerified: true },
  { id: 'op-4', name: 'insp. Barbara Zając',          role: 'admin',     clearanceLevel: 5, unit: 'CERT Polska',       mfaVerified: true },
  { id: 'op-5', name: 'Tomasz Mazur',                 role: 'auditor',   clearanceLevel: 2, unit: 'ABW',               mfaVerified: true },
]

const ROLE_LABELS: Record<OperatorRole, string> = {
  commander: 'DOWÓDCA',
  analyst:   'ANALITYK',
  operator:  'OPERATOR',
  admin:     'ADMIN',
  auditor:   'AUDYTOR',
}

const ROLE_ACCENT: Record<OperatorRole, 'orange' | 'cyan' | 'muted'> = {
  commander: 'orange',
  admin:     'orange',
  analyst:   'cyan',
  operator:  'cyan',
  auditor:   'muted',
}

export function LoginPage() {
  const { setOperator, addAuditEntry } = useAppStore()
  const [selectedOp, setSelectedOp] = useState<Operator>(DEMO_OPERATORS[0])
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    if (pin.length < 4) { setError('PIN musi mieć co najmniej 4 znaki'); return }
    setLoading(true); setError('')
    await new Promise(r => setTimeout(r, 900))
    setOperator(selectedOp)
    const entry = logAction({
      operator: selectedOp.name,
      action: 'login',
      details: `Logowanie: ${selectedOp.name} (${selectedOp.role.toUpperCase()}) · Clearance ${selectedOp.clearanceLevel} · MFA verified`,
      mode: 'live',
    })
    addAuditEntry(entry)
    setLoading(false)
  }

  return (
    <div
      className="tactical-grid scan-line"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        position: 'relative',
        overflow: 'hidden',
        background: '#05070A',
      }}
    >
      {/* Ambient glow — behind everything */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          width: 700,
          height: 700,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,138,31,0.055) 0%, transparent 65%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,229,255,0.025) 0%, transparent 70%)',
          top: '20%',
          right: '15%',
          pointerEvents: 'none',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: 'easeOut' }}
        style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 10 }}
      >
        {/* ── Brand header ──────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          {/* Logo mark */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                background: 'rgba(255,138,31,0.08)',
                border: '1px solid rgba(255,138,31,0.28)',
                boxShadow: '0 0 48px rgba(255,138,31,0.12), 0 0 100px rgba(255,138,31,0.05), inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
            >
              <Shield
                size={28}
                style={{
                  color: '#FF8A1F',
                  filter: 'drop-shadow(0 0 10px rgba(255,138,31,0.65))',
                }}
              />
              {/* Corner notches */}
              {[
                { top: -1, left: -1 },
                { top: -1, right: -1 },
                { bottom: -1, left: -1 },
                { bottom: -1, right: -1 },
              ].map((pos, i) => (
                <span
                  key={i}
                  style={{
                    position: 'absolute',
                    width: 7,
                    height: 7,
                    border: '1px solid rgba(255,138,31,0.55)',
                    borderRadius: 2,
                    ...pos,
                  }}
                />
              ))}
            </div>
          </div>

          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 24,
              fontWeight: 700,
              color: '#E6EDF3',
              letterSpacing: '0.28em',
              lineHeight: 1,
              marginBottom: 8,
            }}
          >
            BASTION
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: '#3D5060',
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
            }}
          >
            Enterprise Command Center · Stalowa Wola
          </div>
        </div>

        {/* ── Security notice ────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            padding: '10px 14px',
            borderRadius: 10,
            marginBottom: 16,
            background: 'rgba(34,197,94,0.055)',
            border: '1px solid rgba(34,197,94,0.16)',
          }}
        >
          <Lock size={10} style={{ color: '#22C55E', flexShrink: 0, marginTop: 2 }} />
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: '#66778B',
              lineHeight: 1.65,
            }}
          >
            System klasy{' '}
            <span style={{ color: '#22C55E', fontWeight: 600 }}>ZASTRZEŻONE</span>
            {'. '}Nieautoryzowany dostęp jest przestępstwem (Art.&nbsp;267 KK).
            {' '}TLS&nbsp;1.3 · AES-256 · MFA-ready.
          </p>
        </div>

        {/* ── Main panel ─────────────────────────────────────────────── */}
        <div
          style={{
            background: 'linear-gradient(145deg, rgba(20,28,38,0.92) 0%, rgba(11,17,23,0.96) 100%)',
            backdropFilter: 'blur(28px) saturate(1.4)',
            WebkitBackdropFilter: 'blur(28px) saturate(1.4)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 20,
            boxShadow: '0 48px 96px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.04)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 22,
          }}
        >
          {/* Operator selection */}
          <div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: '#3D5060',
                marginBottom: 10,
              }}
            >
              Wybierz operatora
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {DEMO_OPERATORS.map(op => {
                const isSelected = selectedOp.id === op.id
                return (
                  <button
                    key={op.id}
                    onClick={() => setSelectedOp(op)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: isSelected
                        ? '1px solid rgba(255,138,31,0.28)'
                        : '1px solid rgba(255,255,255,0.06)',
                      background: isSelected
                        ? 'rgba(255,138,31,0.08)'
                        : 'rgba(255,255,255,0.02)',
                      cursor: 'pointer',
                      transition: 'all 0.14s ease',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                      }
                    }}
                  >
                    {/* Selected indicator */}
                    {isSelected && (
                      <span
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: '18%',
                          bottom: '18%',
                          width: 2,
                          borderRadius: '0 1px 1px 0',
                          background: 'linear-gradient(180deg, #FF8A1F 0%, rgba(255,138,31,0.3) 100%)',
                          boxShadow: '0 0 8px rgba(255,138,31,0.55)',
                        }}
                      />
                    )}

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        paddingLeft: isSelected ? 4 : 0,
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 11,
                            fontWeight: 500,
                            color: isSelected ? '#E6EDF3' : '#94A3B8',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            transition: 'color 0.14s ease',
                          }}
                        >
                          {op.name}
                        </div>
                        <div
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 9,
                            color: '#3D5060',
                            marginTop: 3,
                          }}
                        >
                          {op.unit}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                        <Badge variant="muted">CL{op.clearanceLevel}</Badge>
                        <Badge variant={ROLE_ACCENT[op.role]}>
                          {ROLE_LABELS[op.role]}
                        </Badge>
                        {isSelected && (
                          <ChevronRight size={10} style={{ color: '#FF8A1F' }} />
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Divider */}
          <div
            style={{
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07) 30%, rgba(255,255,255,0.07) 70%, transparent)',
            }}
          />

          {/* PIN input */}
          <div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: '#3D5060',
                marginBottom: 8,
              }}
            >
              PIN / Hasło (MFA)
            </div>

            <div style={{ position: 'relative' }}>
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={e => setPin(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '11px 44px 11px 14px',
                  borderRadius: 10,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  color: '#E6EDF3',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  outline: 'none',
                  transition: 'border-color 0.15s ease',
                  letterSpacing: '0.08em',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,138,31,0.42)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)')}
              />
              <button
                onClick={() => setShowPin(!showPin)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#3D5060',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  transition: 'color 0.14s ease',
                  display: 'flex',
                  alignItems: 'center',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#66778B')}
                onMouseLeave={e => (e.currentTarget.style.color = '#3D5060')}
              >
                {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            {error ? (
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  color: '#EF4444',
                  marginTop: 6,
                }}
              >
                {error}
              </p>
            ) : (
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  color: '#3D5060',
                  marginTop: 6,
                }}
              >
                Demo: wpisz dowolny PIN ≥ 4 znaki
              </p>
            )}
          </div>

          {/* Auth button */}
          <Button
            variant="primary"
            size="lg"
            style={{ width: '100%', justifyContent: 'center' }}
            loading={loading}
            onClick={handleLogin}
          >
            <Fingerprint size={14} />
            Autoryzuj dostęp
          </Button>
        </div>

        {/* Footer */}
        <div
          style={{
            textAlign: 'center',
            marginTop: 20,
            fontFamily: 'var(--font-mono)',
            fontSize: 8,
            color: '#1E2D3D',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          SpaceShield 2026 · BASTION Enterprise v1.0 · Wszelkie prawa zastrzeżone
        </div>
      </motion.div>
    </div>
  )
}
