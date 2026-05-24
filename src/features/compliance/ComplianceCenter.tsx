import { useState } from 'react'
import { Shield, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, XCircle, HelpCircle, Download, Rocket } from 'lucide-react'
import { COMPLIANCE_REQUIREMENTS } from '@/data/compliance'
import { useAppStore } from '@/store/useAppStore'
import { logAction } from '@/services/auditLogService'
import { generateReport, downloadReportFile } from '@/services/reportGenerator'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageShell } from '@/components/layout/PageShell'
import { useToast } from '@/components/ui/Toast'
import type { LucideIcon } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; badge: 'green' | 'warning' | 'danger' | 'muted'; icon: LucideIcon }> = {
  compliant: { label: 'ZGODNY', badge: 'green', icon: CheckCircle2 },
  partial: { label: 'CZĘŚCIOWY', badge: 'warning', icon: AlertTriangle },
  non_compliant: { label: 'NIEZGODNY', badge: 'danger', icon: XCircle },
  pending_review: { label: 'DO PRZEGLĄDU', badge: 'muted', icon: HelpCircle },
}

const REGULATION_GROUPS = ['KSC', 'NIS2', 'CER', 'RODO', 'EU AI Act', 'KRI', 'STANAG', 'ISA/IEC 62443', 'ISO 27001', 'ISO 22301']

export function ComplianceCenter() {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filterReg, setFilterReg] = useState<string>('all')
  const { operator, mode, addAuditEntry } = useAppStore()
  const { toast } = useToast()

  const filtered = COMPLIANCE_REQUIREMENTS.filter(r => filterReg === 'all' || r.regulation === filterReg)

  const productionGaps = COMPLIANCE_REQUIREMENTS.filter(
    r => r.actionNeeded || r.status === 'partial' || r.status === 'non_compliant' || r.status === 'pending_review',
  )

  const stats = {
    compliant: COMPLIANCE_REQUIREMENTS.filter(r => r.status === 'compliant').length,
    partial: COMPLIANCE_REQUIREMENTS.filter(r => r.status === 'partial').length,
    pending: COMPLIANCE_REQUIREMENTS.filter(r => r.status === 'pending_review').length,
    nonCompliant: COMPLIANCE_REQUIREMENTS.filter(r => r.status === 'non_compliant').length,
  }

  function exportComplianceReport(format: 'json' | 'html') {
    const report = generateReport({
      type: 'compliance',
      objects: [],
      operator: operator?.name ?? 'OPERATOR',
      complianceRequirements: COMPLIANCE_REQUIREMENTS,
    })
    downloadReportFile(report, format)
    const entry = logAction({
      operator: operator?.name ?? 'OPERATOR',
      action: 'report_export',
      details: `Wyeksportowano raport zgodności (${format})`,
      mode,
    })
    addAuditEntry(entry)
    toast({ title: 'Raport zgodności wyeksportowany', variant: 'success' })
  }

  return (
    <PageShell>
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
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportComplianceReport('json')}>
            <Download size={12} /> Export JSON
          </Button>
          <Button variant="ghost" size="sm" onClick={() => exportComplianceReport('html')}>
            <Download size={12} /> Export HTML
          </Button>
        </div>
      </div>

      <Card label="PRODUCTION READINESS · CO BRAKUJE PRZED PRODUKCJĄ" accent="orange">
        <div className="flex items-start gap-3 mb-4">
          <Rocket size={16} className="text-[#FF8A1F] flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-[11px] font-mono text-[#E6EDF3]">
              {productionGaps.length === 0
                ? 'Brak zidentyfikowanych blokad produkcyjnych'
                : `${productionGaps.length} wymagań wymaga działania przed wdrożeniem produkcyjnym`}
            </div>
            <div className="text-[10px] font-mono text-[#66778B] mt-1">
              Lista obejmuje statusy partial, pending_review, non_compliant oraz wpisy z actionNeeded.
            </div>
          </div>
        </div>
        <div className="ui-stack" style={{ gap: 10 }}>
          {productionGaps.map(gap => {
            const config = STATUS_CONFIG[gap.status]
            return (
              <div
                key={gap.id}
                className="ui-panel"
                style={{ padding: '12px 14px', background: 'rgba(255,138,31,0.06)', border: '1px solid rgba(255,138,31,0.18)' }}
              >
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge variant={config.badge}>{gap.regulation}</Badge>
                  <Badge variant="muted">{gap.article}</Badge>
                  <Badge variant={config.badge}>{config.label}</Badge>
                </div>
                <div className="text-[11px] font-mono text-[#94A3B8] mb-2">{gap.requirement}</div>
                <div className="text-[10px] font-mono text-[#F59E0B]">
                  {gap.actionNeeded ?? 'Wymaga formalnego przeglądu przed produkcją'}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Stats */}
      <div className="ui-grid ui-grid-4">
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
      <div className="ui-list">
        {filtered.map(req => {
          const config = STATUS_CONFIG[req.status]
          const isExpanded = expanded === req.id

          return (
            <Card key={req.id} noPad>
              <button
                type="button"
                className="ui-expand-trigger"
                onClick={() => setExpanded(isExpanded ? null : req.id)}
              >
                <div className="flex-shrink-0 w-24">
                  <Badge variant={config.badge} icon={config.icon}>{req.regulation}</Badge>
                </div>
                <div className="text-[10px] font-mono text-[#66778B] w-24 flex-shrink-0">{req.article}</div>
                <div className="flex-1 text-[11px] font-mono text-[#94A3B8] text-left">{req.requirement}</div>
                <Badge variant={config.badge}>{config.label}</Badge>
                {isExpanded ? <ChevronUp size={13} className="text-[#66778B] flex-shrink-0" /> : <ChevronDown size={13} className="text-[#66778B] flex-shrink-0" />}
              </button>

              {isExpanded && (
                <div className="ui-expand-body">
                  <div>
                    <div className="text-[10px] font-mono text-[#66778B] uppercase tracking-wider mb-1">IMPLEMENTACJA W BASTIONIE</div>
                    <p className="text-[11px] font-mono text-[#94A3B8] leading-relaxed">{req.bastionImplementation}</p>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-[#66778B] uppercase tracking-wider mb-1">RYZYKO</div>
                    <p className="text-[11px] font-mono text-[#94A3B8]">{req.risk}</p>
                  </div>
                  {req.actionNeeded && (
                    <div className="ui-panel" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', padding: '14px 16px' }}>
                      <div className="text-[10px] font-mono text-[#F59E0B] uppercase tracking-wider mb-1">ACTION NEEDED</div>
                      <p className="text-[11px] font-mono text-[#F59E0B]/80">{req.actionNeeded}</p>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </PageShell>
  )
}
