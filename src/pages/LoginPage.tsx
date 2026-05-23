import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, Shield, Eye, EyeOff, ChevronRight } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { logAction } from '@/services/auditLogService'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import type { Operator, OperatorRole } from '@/types'

const DEMO_OPERATORS: Operator[] = [
  { id: 'op-1', name: 'mjr. Andrzej Kowalski',      role: 'commander', clearanceLevel: 5, unit: 'CZK Stalowa Wola',  mfaVerified: true },
  { id: 'op-2', name: 'kpt. Maria Nowak',            role: 'analyst',   clearanceLevel: 4, unit: 'RCB Warszawa',      mfaVerified: true },
  { id: 'op-3', name: 'st. sierż. Piotr Wiśniewski', role: 'operator',  clearanceLevel: 3, unit: 'KPP Stalowa Wola', mfaVerified: true },
  { id: 'op-4', name: 'insp. Barbara Zając',         role: 'admin',     clearanceLevel: 5, unit: 'CERT Polska',       mfaVerified: true },
  { id: 'op-5', name: 'Tomasz Mazur',                role: 'auditor',   clearanceLevel: 2, unit: 'ABW',               mfaVerified: true },
]

const ROLE_LABELS: Record<OperatorRole, string> = {
  commander: 'DOWÓDCA',
  analyst:   'ANALITYK',
  operator:  'OPERATOR',
  admin:     'ADMINISTRATOR',
  auditor:   'AUDYTOR',
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
    await new Promise(r => setTimeout(r, 800))
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
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden tactical-grid"
      style={{ background: '#05070A' }}
    >
      {/* Radial glow backdrop */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 600, height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,138,31,0.05) 0%, transparent 70%)',
          left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
        }}
      />
      {/* Scan line overlay */}
      <div className="absolute inset-0 scan-line pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-[420px] relative z-10"
      >
        {/* Header mark */}
        <div className="text-center mb-7">
          {/* Logo icon */}
          <div className="flex justify-center mb-5">
            <div
              className="w-16 h-16 flex items-center justify-center relative"
              style={{
                background: 'rgba(255,138,31,0.08)',
                border: '1px solid rgba(255,138,31,0.28)',
                borderRadius: 18,
                boxShadow: '0 0 40px rgba(255,138,31,0.12), 0 0 80px rgba(255,138,31,0.05), inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
            >
              <Shield size={26} className="text-[#FF8A1F]" style={{ filter: 'drop-shadow(0 0 8px rgba(255,138,31,0.6))' }} />
              {/* Corner notches */}
              {['-top-px -left-px', '-top-px -right-px', '-bottom-px -left-px', '-bottom-px -right-px'].map((pos, i) => (
                <span
                  key={i}
                  className={`absolute ${pos} w-2 h-2`}
                  style={{ border: '1px solid rgba(255,138,31,0.50)', borderRadius: 2 }}
                />
              ))}
            </div>
          </div>
          <div className="font-mono text-[22px] font-bold text-[#E6EDF3] tracking-[0.25em]">BASTION</div>
          <div className="font-mono text-[9px] text-[#3D5060] tracking-[0.30em] mt-1 uppercase">
            Enterprise Command Center · Stalowa Wola
          </div>
        </div>

        {/* Security notice */}
        <div
          className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-[10px] mb-4"
          style={{
            background: 'rgba(34,197,94,0.06)',
            border: '1px solid rgba(34,197,94,0.18)',
          }}
        >
          <Lock size={10} className="text-[#22C55E] flex-shrink-0 mt-px" />
          <p className="font-mono text-[9px] text-[#66778B] leading-relaxed">
            System klasy <span className="text-[#22C55E]">ZASTRZEŻONE</span>. Nieautoryzowany dostęp
            jest przestępstwem (Art. 267 KK). TLS 1.3 · AES-256 · MFA-ready.
          </p>
        </div>

        {/* Main panel */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(20,28,38,0.90) 0%, rgba(11,17,23,0.95) 100%)',
            backdropFilter: 'blur(24px) saturate(1.4)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 20,
            boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03) inset',
          }}
          className="p-5 space-y-5"
        >
          {/* Operator selection */}
          <div>
            <div className="label-xs mb-2.5">Wybierz operatora</div>
            <div className="space-y-1">
              {DEMO_OPERATORS.map(op => {
                const isSelected = selectedOp.id === op.id
                return (
                  <button
                    key={op.id}
                    onClick={() => setSelectedOp(op)}
                    className="w-full text-left p-2.5 rounded-[10px] transition-all duration-150 group relative"
                    style={{
                      background: isSelected ? 'rgba(255,138,31,0.08)' : 'rgba(255,255,255,0.02)',
                      border: isSelected
                        ? '1px solid rgba(255,138,31,0.28)'
                        : '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    {isSelected && (
                      <span
                        className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r-full"
                        style={{
                          background: 'linear-gradient(180deg, #FF8A1F 0%, rgba(255,138,31,0.3) 100%)',
                          boxShadow: '0 0 6px rgba(255,138,31,0.5)',
                        }}
                      />
                    )}
                    <div className="flex items-center justify-between gap-2 pl-1">
                      <div className="min-w-0">
                        <div className="font-mono text-[11px] text-[#E6EDF3] truncate">{op.name}</div>
                        <div className="font-mono text-[9px] text-[#3D5060] mt-0.5">{op.unit}</div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Badge variant="muted">CL{op.clearanceLevel}</Badge>
                        <Badge variant={op.role === 'commander' || op.role === 'admin' ? 'orange' : 'cyan'}>
                          {ROLE_LABELS[op.role]}
                        </Badge>
                        {isSelected && (
                          <ChevronRight size={10} className="text-[#FF8A1F]" />
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[rgba(255,255,255,0.05)]" />

          {/* PIN input */}
          <div>
            <div className="label-xs mb-2">PIN / Hasło (MFA)</div>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={e => setPin(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 pr-10 rounded-[10px] font-mono text-[12px] text-[#E6EDF3] placeholder-[#3D5060] transition-all duration-150 focus:outline-none"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.09)',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,138,31,0.40)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)')}
              />
              <button
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3D5060] hover:text-[#66778B] transition-colors"
              >
                {showPin ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
            {error
              ? <p className="font-mono text-[9px] text-[#EF4444] mt-1.5">{error}</p>
              : <p className="font-mono text-[9px] text-[#3D5060] mt-1.5">Demo: wpisz dowolny PIN ≥ 4 znaków</p>
            }
          </div>

          <Button variant="primary" size="lg" className="w-full" loading={loading} onClick={handleLogin}>
            <Lock size={12} />
            Autoryzuj dostęp
          </Button>
        </div>

        <div className="text-center mt-5 font-mono text-[8px] text-[#1E2D3D] tracking-[0.14em]">
          SpaceShield 2026 · BASTION Enterprise v1.0 · Wszelkie prawa zastrzeżone
        </div>
      </motion.div>
    </div>
  )
}
