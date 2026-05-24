import { useState } from 'react'
import { Brain, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { formatTimestamp } from '@/utils/format'
import { Button } from '@/components/ui/Button'
import { Badge, SeverityBadge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { PageShell } from '@/components/layout/PageShell'
import type { Recommendation } from '@/types'

export function DecisionSupport() {
  const { recommendations, approveAction, rejectAction, operator, mode } = useAppStore()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [approvedRecs, setApprovedRecs] = useState<Set<string>>(new Set())

  function handleApproveAction(rec: Recommendation, actionId: string) {
    void approveAction(rec.id, actionId)
  }

  function handleApproveAll(rec: Recommendation) {
    for (const action of rec.actions) {
      if (!action.approved) void approveAction(rec.id, action.id)
    }
    setApprovedRecs(prev => new Set([...prev, rec.id]))
  }

  function handleReject(rec: Recommendation) {
    rejectAction(rec.id)
    setApprovedRecs(prev => { const s = new Set(prev); s.delete(rec.id); return s })
  }

  const riskColors = {
    critical: 'text-[#EF4444]',
    high: 'text-[#FF8A1F]',
    medium: 'text-[#F59E0B]',
    low: 'text-[#22C55E]',
  }

  return (
    <PageShell>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain size={18} className="text-[#00E5FF]" />
          <div>
            <h1 className="text-[13px] font-mono font-bold uppercase tracking-[0.15em] text-[#E6EDF3]">
              OPERATIONAL DECISION SUPPORT
            </h1>
            <p className="text-[11px] font-mono text-[#66778B]">
              Rule-based engine — AI rekomenduje, człowiek zatwierdza. Każda decyzja trafia do Audit Log.
            </p>
          </div>
        </div>
        <Badge variant="cyan">NOT A CHATBOT — RULE ENGINE</Badge>
      </div>

      {/* System note */}
      <Card accent="cyan">
        <div className="text-[11px] font-mono text-[#94A3B8] leading-relaxed">
          <span className="text-[#00E5FF] font-semibold">Architektura zgodna z EU AI Act Annex III:</span> System nie podejmuje decyzji autonomicznie.
          Rekomendacje generowane są przez deterministyczny silnik reguł IF-THEN.
          Każda akcja wymaga zatwierdzenia operatora. Pełny audit log każdego działania.
          Override możliwy w dowolnym momencie.
        </div>
      </Card>

      {recommendations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#66778B] font-mono">
          <Brain size={32} className="mb-3 opacity-20" />
          <div className="text-[13px]">Brak aktywnych rekomendacji</div>
          <div className="text-[11px] mt-1">Uruchom scenariusz aby wygenerować rekomendacje</div>
        </div>
      ) : (
        <div className="ui-stack">
          {recommendations.map(rec => {
            const isExpanded = expanded === rec.id
            const allApproved = rec.actions.every(a => a.approved)

            return (
              <Card key={rec.id} accent={rec.riskLevel === 'critical' ? 'danger' : rec.riskLevel === 'high' ? 'orange' : undefined}>
                {/* Rec header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle size={13} className={riskColors[rec.riskLevel]} />
                      <span className={`text-[12px] font-mono font-bold uppercase tracking-wider ${riskColors[rec.riskLevel]}`}>
                        {rec.riskLevel} RISK
                      </span>
                      <Badge variant="muted">CONFIDENCE: {rec.confidence}%</Badge>
                      {rec.requiresApproval && <Badge variant="orange">WYMAGA ZATWIERDZENIA</Badge>}
                      {allApproved && <Badge variant="green">WSZYSTKIE ZATWIERDZONE</Badge>}
                    </div>
                    <p className="text-[12px] font-mono text-[#E6EDF3]">{rec.summary}</p>
                    <div className="text-[10px] font-mono text-[#66778B] mt-1">
                      {formatTimestamp(rec.generatedAt)}
                    </div>
                  </div>
                  <button
                    onClick={() => setExpanded(isExpanded ? null : rec.id)}
                    className="ml-4 text-[#66778B] hover:text-[#94A3B8] transition-colors"
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {/* Confidence bar */}
                <ProgressBar value={rec.confidence} label="Confidence" showValue accent="cyan" className="mb-4" />

                {/* Reasoning */}
                <div className="ui-panel" style={{ background: 'rgba(255,255,255,0.02)', marginBottom: 16 }}>
                  <div className="text-[9px] font-mono text-[#66778B] uppercase tracking-wider mb-1">REASONING SUMMARY</div>
                  <p className="text-[11px] font-mono text-[#94A3B8] leading-relaxed">{rec.reasoning}</p>
                </div>

                {rec.whyThisAction && (
                  <div className="ui-panel" style={{ background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.15)', marginBottom: 12, padding: '12px 14px' }}>
                    <div className="text-[9px] font-mono text-[#00E5FF] uppercase tracking-wider mb-1">WHY THIS ACTION?</div>
                    <p className="text-[11px] font-mono text-[#94A3B8]">{rec.whyThisAction}</p>
                  </div>
                )}

                {rec.ifIgnored && (
                  <div className="ui-panel" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', marginBottom: 12, padding: '12px 14px' }}>
                    <div className="text-[9px] font-mono text-[#EF4444] uppercase tracking-wider mb-1">WHAT HAPPENS IF IGNORED?</div>
                    <p className="text-[11px] font-mono text-[#94A3B8]">{rec.ifIgnored}</p>
                  </div>
                )}

                {rec.affectedNodes && rec.affectedNodes.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {rec.affectedNodes.map(id => (
                      <Badge key={id} variant="orange">{id.toUpperCase()}</Badge>
                    ))}
                  </div>
                )}

                {rec.requiresApproval && (
                  <Badge variant="orange" className="mb-4">HUMAN APPROVAL REQUIRED</Badge>
                )}

                {/* Actions */}
                {isExpanded && (
                  <div className="ui-stack" style={{ gap: 10, marginBottom: 16 }}>
                    <div className="text-[10px] font-mono text-[#66778B] uppercase tracking-wider">
                      RECOMMENDED ACTIONS ({rec.actions.length})
                    </div>
                    {rec.actions.map(action => (
                      <div key={action.id} className={`ui-row-item ${
                        action.approved ? 'border-[#22C55E]/30 bg-[#22C55E]/5' : ''
                      }`} style={{ alignItems: 'flex-start', justifyContent: 'flex-start', gap: 12 }}>
                        <span className="text-[10px] font-mono text-[#66778B] w-4 flex-shrink-0">{action.priority}.</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-mono text-[#E6EDF3] mb-1">{action.description}</div>
                          <div className="flex gap-3 text-[10px] font-mono text-[#66778B]">
                            <span>👤 {action.responsible}</span>
                            <span>⏱ {action.timeframe}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => !action.approved && handleApproveAction(rec, action.id)}
                          className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                            action.approved
                              ? 'bg-[#22C55E]/20 border-[#22C55E]/50 text-[#22C55E]'
                              : 'border-white/20 text-[#66778B] hover:border-[#22C55E]/50 hover:text-[#22C55E]'
                          }`}
                        >
                          <CheckCircle size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Approve / Reject */}
                {!allApproved && (
                  <div className="flex gap-2">
                    <Button variant="primary" size="sm" onClick={() => handleApproveAll(rec)}>
                      <CheckCircle size={12} /> ZATWIERDŹ WSZYSTKIE
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleReject(rec)}>
                      <XCircle size={12} /> ODRZUĆ
                    </Button>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </PageShell>
  )
}
