import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, Shield, Eye, EyeOff } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { logAction } from '@/services/auditLogService'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import type { Operator, OperatorRole } from '@/types'

const DEMO_OPERATORS: Operator[] = [
  { id: 'op-1', name: 'mjr. Andrzej Kowalski', role: 'commander', clearanceLevel: 5, unit: 'CZK Stalowa Wola', mfaVerified: true },
  { id: 'op-2', name: 'kpt. Maria Nowak', role: 'analyst', clearanceLevel: 4, unit: 'RCB Warszawa', mfaVerified: true },
  { id: 'op-3', name: 'st. sierż. Piotr Wiśniewski', role: 'operator', clearanceLevel: 3, unit: 'KPP Stalowa Wola', mfaVerified: true },
  { id: 'op-4', name: 'insp. Barbara Zając', role: 'admin', clearanceLevel: 5, unit: 'CERT Polska', mfaVerified: true },
  { id: 'op-5', name: 'Tomasz Mazur', role: 'auditor', clearanceLevel: 2, unit: 'ABW', mfaVerified: true },
]

const ROLE_LABELS: Record<OperatorRole, string> = {
  commander: 'DOWÓDCA',
  analyst: 'ANALITYK',
  operator: 'OPERATOR',
  admin: 'ADMINISTRATOR',
  auditor: 'AUDYTOR',
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
    setLoading(true)
    setError('')
    await new Promise(r => setTimeout(r, 900))

    setOperator(selectedOp)
    const entry = logAction({
      operator: selectedOp.name,
      action: 'login',
      details: `Logowanie: ${selectedOp.name} (${selectedOp.role.toUpperCase()}) · Clearance: ${selectedOp.clearanceLevel} · MFA: verified`,
      mode: 'live',
    })
    addAuditEntry(entry)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#05070A] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(0,229,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,1) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-[20px] bg-[#00E5FF]/10 border border-[#00E5FF]/30 mb-4 glow-cyan">
            <Shield size={28} className="text-[#00E5FF]" />
          </div>
          <h1 className="text-[22px] font-mono font-bold text-[#E6EDF3] tracking-[0.2em]">BASTION</h1>
          <p className="text-[11px] font-mono text-[#66778B] mt-1 tracking-[0.15em]">ENTERPRISE COMMAND CENTER</p>
          <p className="text-[10px] font-mono text-[#66778B] mt-0.5">Stalowa Wola · IK Awareness Platform</p>
        </div>

        {/* Security note */}
        <div className="glass rounded-[14px] px-4 py-3 mb-4 flex items-center gap-3">
          <Lock size={11} className="text-[#22C55E] flex-shrink-0" />
          <p className="text-[10px] font-mono text-[#66778B]">
            System klasy ZASTRZEŻONE. Nieautoryzowany dostęp jest przestępstwem (Art. 267 KK).
            TLS 1.3 · AES-256 · MFA-ready.
          </p>
        </div>

        {/* Operator select */}
        <div className="glass-strong rounded-[20px] p-6 space-y-5">
          <div>
            <div className="text-[10px] font-mono text-[#66778B] uppercase tracking-wider mb-2">WYBIERZ OPERATORA</div>
            <div className="space-y-1.5">
              {DEMO_OPERATORS.map(op => (
                <button
                  key={op.id}
                  onClick={() => setSelectedOp(op)}
                  className={`w-full text-left p-3 rounded-[14px] border transition-all ${
                    selectedOp.id === op.id
                      ? 'bg-[#00E5FF]/8 border-[#00E5FF]/30'
                      : 'border-white/[0.06] hover:border-white/10 hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[12px] font-mono text-[#E6EDF3]">{op.name}</div>
                      <div className="text-[10px] font-mono text-[#66778B]">{op.unit}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="muted">CL{op.clearanceLevel}</Badge>
                      <Badge variant={op.role === 'commander' || op.role === 'admin' ? 'orange' : 'cyan'}>
                        {ROLE_LABELS[op.role]}
                      </Badge>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* PIN */}
          <div>
            <div className="text-[10px] font-mono text-[#66778B] uppercase tracking-wider mb-2">PIN / HASŁO (MFA)</div>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={e => setPin(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••"
                className="w-full bg-white/[0.04] border border-white/10 rounded-[14px] px-4 py-3 text-[13px] font-mono text-[#E6EDF3] placeholder-[#66778B] focus:outline-none focus:border-[#00E5FF]/40 pr-10"
              />
              <button
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#66778B] hover:text-[#94A3B8]"
              >
                {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {error && <p className="text-[10px] font-mono text-[#EF4444] mt-1">{error}</p>}
            <p className="text-[10px] font-mono text-[#66778B] mt-1">Demo: wpisz dowolny PIN ≥ 4 znaki</p>
          </div>

          <Button variant="primary" className="w-full" loading={loading} onClick={handleLogin}>
            <Lock size={13} /> ZALOGUJ — WEJDŹ DO SYSTEMU
          </Button>
        </div>

        <div className="text-center mt-4 text-[10px] font-mono text-[#66778B]">
          SpaceShield 2026 · Zespół m&m · BASTION Enterprise v1.0
        </div>
      </motion.div>
    </div>
  )
}
