import { useState } from 'react'
import { Shield, ChevronDown, ChevronUp } from 'lucide-react'
import { COMPLIANCE_REQUIREMENTS } from '@/data/compliance'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'

const STATUS_CONFIG = {
  compliant: { label: 'ZGODNY', badge: 'green' as const, icon: '✓' },
  partial: { label: 'CZĘŚCIOWY', badge: 'warning' as const, icon: '△' },
  non_compliant: { label: 'NIEZGODNY', badge: 'danger' as const, icon: '✗' },
  pending_review: { label: 'DO PRZEGLĄDU', badge: 'muted' as const, icon: '?' },
}

const REGULATION_GROUPS = ['KSC', 'NIS2', 'CER', 'RODO', 'EU AI Act', 'KRI', 'STANAG', 'ISA/IEC 62443', 'ISO 27001', 'ISO 22301']

export function ComplianceCenter() {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filterReg, setFilterReg] = useState<string>('all')

  const filtered = COMPLIANCE_REQUIREMENTS.filter(r => filterReg === 'all' || r.regulation === filterReg)

  const stats = {
    compliant: COMPLIANCE_REQUIREMENTS.filter(r => r.status === 'compliant').length,
    partial: COMPLIANCE_REQUIREMENTS.filter(r => r.status === 'partial').length,
    pending: COMPLIANCE_REQUIREMENTS.filter(r => r.status === 'pending_review').length,
    nonCompliant: COMPLIANCE_REQUIREMENTS.filter(r => r.status === 'non_compliant').length,
  }

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield size={18} className="text-[#00E5FF]" />
          <div>
            <h1 className="text-[13px] font-mono font-bold uppercase tracking-[0.15em] text-[#E6EDF3]">
              COMPLIANCE CENTER
            </h1>
            <p className="text-[11px] font-mono text-[#66778B]">
              KSC · NIS2 · CER · RODO · EU AI Act · STANAG · ISA/IEC 62443 · ISO 27001
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card accent="green">
          <div className="text-[10px] font-mono text-[#66778B] mb-1">ZGODNY</div>
          <div className="text-2xl font-mono font-bold text-[#22C55E]">{stats.compliant}</div>
        </Card>
        <Card accent="orange">
          <div className="text-[10px] font-mono text-[#66778B] mb-1">CZĘŚCIOWY</div>
          <div className="text-2xl font-mono font-bold text-[#FF8A1F]">{stats.partial}</div>
        </Card>
        <Card>
          <div className="text-[10px] font-mono text-[#66778B] mb-1">DO PRZEGLĄDU</div>
          <div className="text-2xl font-mono font-bold text-[#94A3B8]">{stats.pending}</div>
        </Card>
        <Card accent="danger">
          <div className="text-[10px] font-mono text-[#66778B] mb-1">NIEZGODNY</div>
          <div className="text-2xl font-mono font-bold text-[#EF4444]">{stats.nonCompliant}</div>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['all', ...REGULATION_GROUPS].map(reg => (
          <button
            key={reg}
            onClick={() => setFilterReg(reg)}
            className={`text-[10px] font-mono uppercase px-3 py-1.5 rounded-[14px] border transition-all ${
              filterReg === reg
                ? 'bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/30'
                : 'text-[#66778B] border-white/[0.06] hover:border-white/10'
            }`}
          >
            {reg}
          </button>
        ))}
      </div>

      {/* Requirements list */}
      <div className="space-y-3">
        {filtered.map(req => {
          const config = STATUS_CONFIG[req.status]
          const isExpanded = expanded === req.id

          return (
            <div key={req.id} className="glass rounded-[14px] border border-white/[0.06] overflow-hidden">
              <button
                className="w-full text-left p-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors"
                onClick={() => setExpanded(isExpanded ? null : req.id)}
              >
                <div className="flex-shrink-0 w-24">
                  <Badge variant={config.badge}>{config.icon} {req.regulation}</Badge>
                </div>
                <div className="text-[10px] font-mono text-[#66778B] w-24 flex-shrink-0">{req.article}</div>
                <div className="flex-1 text-[11px] font-mono text-[#94A3B8] text-left">{req.requirement}</div>
                <Badge variant={config.badge}>{config.label}</Badge>
                {isExpanded ? <ChevronUp size={13} className="text-[#66778B] flex-shrink-0" /> : <ChevronDown size={13} className="text-[#66778B] flex-shrink-0" />}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-white/[0.04]">
                  <div className="pt-3">
                    <div className="text-[10px] font-mono text-[#66778B] uppercase tracking-wider mb-1">IMPLEMENTACJA W BASTIONIE</div>
                    <p className="text-[11px] font-mono text-[#94A3B8] leading-relaxed">{req.bastionImplementation}</p>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-[#66778B] uppercase tracking-wider mb-1">RYZYKO</div>
                    <p className="text-[11px] font-mono text-[#94A3B8]">{req.risk}</p>
                  </div>
                  {req.actionNeeded && (
                    <div className="p-3 rounded-[14px] bg-[#F59E0B]/8 border border-[#F59E0B]/25">
                      <div className="text-[10px] font-mono text-[#F59E0B] uppercase tracking-wider mb-1">ACTION NEEDED</div>
                      <p className="text-[11px] font-mono text-[#F59E0B]/80">{req.actionNeeded}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
