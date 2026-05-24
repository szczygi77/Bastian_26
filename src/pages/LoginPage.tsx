import { useState } from 'react'
import { Lock } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { logAction } from '@/services/auditLogService'
import { Button } from '@/components/ui/Button'
import { BrandLogo } from '@/components/BrandLogo'
import { Input } from '@/components/ui/Input'
import { FormField } from '@/components/ui/Label'
import { useElectronShell } from '@/hooks/useElectronShell'
import type { Operator, OperatorRole } from '@/types'

const OPERATORS: (Operator & { nrSluzbowy: string })[] = [
  { id: 'op-1', nrSluzbowy: '784521003', name: 'mjr. Andrzej Kowalski',      role: 'commander', clearanceLevel: 5, unit: 'CZK Stalowa Wola',  mfaVerified: true },
  { id: 'op-2', nrSluzbowy: '784521017', name: 'kpt. Maria Nowak',            role: 'analyst',   clearanceLevel: 4, unit: 'RCB Warszawa',      mfaVerified: true },
  { id: 'op-3', nrSluzbowy: '784521031', name: 'st. sierż. Piotr Wiśniewski', role: 'operator',  clearanceLevel: 3, unit: 'KPP Stalowa Wola', mfaVerified: true },
  { id: 'op-4', nrSluzbowy: '784521048', name: 'insp. Barbara Zając',         role: 'admin',     clearanceLevel: 5, unit: 'CERT Polska',       mfaVerified: true },
  { id: 'op-5', nrSluzbowy: '784521052', name: 'Tomasz Mazur',                role: 'auditor',   clearanceLevel: 2, unit: 'ABW',               mfaVerified: true },
]

const ROLE_LABEL: Record<OperatorRole, string> = {
  commander: 'Dowódca',
  analyst: 'Analityk',
  operator: 'Operator',
  admin: 'Administrator',
  auditor: 'Audytor',
}

export function LoginPage() {
  const { setOperator, addAuditEntry } = useAppStore()
  const { isMacOS, titlebarHeight } = useElectronShell()
  const [selectedId, setSelectedId] = useState(OPERATORS[0].id)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selected = OPERATORS.find(o => o.id === selectedId) ?? OPERATORS[0]

  async function handleLogin() {
    if (password.length < 4) {
      setError('Podaj hasło (min. 4 znaki).')
      return
    }
    setLoading(true)
    setError('')
    await new Promise(r => setTimeout(r, 700))
    setOperator(selected)
    void logAction({
      operator: selected.name,
      action: 'login',
      details: `Nr ${selected.nrSluzbowy}, poziom ${selected.clearanceLevel}, stanowisko SW-WS-01`,
      mode: 'live',
    }).then(entry => addAuditEntry(entry))
    setLoading(false)
  }

  return (
    <div className="grid-bg" style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      background: '#05070A', position: 'relative', overflow: 'hidden',
    }}>
      {isMacOS && (
        <div className="window-drag" aria-hidden style={{ height: titlebarHeight, flexShrink: 0 }} />
      )}

      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '32px 20px', position: 'relative',
      }}>
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(255,138,31,0.06) 0%, transparent 70%)',
      }} />

      <div className="glass-panel" style={{
        width: '100%', maxWidth: 420, borderRadius: 16,
        padding: '36px 32px 28px', boxShadow: 'var(--shadow-glass)',
        position: 'relative', zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <BrandLogo
            variant="full"
            emphasis="hero"
            height={128}
            style={{ margin: '0 auto' }}
          />
          <p style={{
            fontFamily: 'var(--font-sans)', fontSize: 13, color: '#66778B',
            marginTop: 16, lineHeight: 1.5,
          }}>
            Centrum monitorowania infrastruktury krytycznej
          </p>
        </div>

        <form onSubmit={e => { e.preventDefault(); handleLogin() }}>
          <FormField label="Operator">
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 6,
              maxHeight: 200, overflowY: 'auto', marginBottom: 20,
            }}>
              {OPERATORS.map(op => {
                const sel = op.id === selectedId
                return (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => setSelectedId(op.id)}
                    style={{
                      width: '100%', textAlign: 'left', cursor: 'pointer',
                      padding: '11px 14px', borderRadius: 10,
                      background: sel ? 'rgba(255,138,31,0.06)' : 'rgba(255,255,255,0.02)',
                      border: sel
                        ? '1px solid rgba(255,138,31,0.30)'
                        : '1px solid rgba(255,255,255,0.06)',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                  >
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500,
                      color: sel ? '#E6EDF3' : '#94A3B8', marginBottom: 3,
                    }}>{op.name}</div>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 9, color: '#66778B',
                    }}>
                      {op.nrSluzbowy} · {ROLE_LABEL[op.role]} · {op.unit}
                    </div>
                  </button>
                )
              })}
            </div>
          </FormField>

          <FormField label="Hasło" error={error} required>
            <Input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              icon={<Lock size={14} />}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </FormField>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: 20 }}
          >
            {loading ? 'Weryfikacja…' : 'Zaloguj'}
          </Button>
        </form>

        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: 9, color: '#3D5060',
          lineHeight: 1.55, marginTop: 24, textAlign: 'center',
        }}>
          Dostęp wyłącznie dla osób upoważnionych.
        </p>
      </div>
      </div>
    </div>
  )
}
