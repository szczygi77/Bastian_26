import { useMemo, useState } from 'react'
import { Cpu, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { selectRecommendationsForActiveIncidents } from '@/store/operationalSelectors'
import { formatTimestamp } from '@/utils/format'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { PageShell } from '@/components/layout/PageShell'
import type { Recommendation } from '@/types'

const RISK_PL: Record<Recommendation['riskLevel'], string> = {
  critical: 'Krytyczne',
  high: 'Wysokie',
  medium: 'Średnie',
  low: 'Niskie',
}

const EXEC_PL: Record<string, string> = {
  pending: 'Oczekuje',
  queued: 'W kolejce',
  executing: 'Wykonywanie',
  executed: 'Wykonano',
  failed: 'Błąd',
  reverted: 'Cofnięto',
}

export function DecisionSupport() {
  const { recommendations, incidents, approveAction, rejectAction } = useAppStore()
  const [expanded, setExpanded] = useState<string | null>(null)

  const activeRecs = useMemo(
    () => selectRecommendationsForActiveIncidents(recommendations, incidents),
    [recommendations, incidents],
  )

  function handleApproveAction(rec: Recommendation, actionId: string) {
    void approveAction(rec.id, actionId)
  }

  function handleApproveAll(rec: Recommendation) {
    for (const action of rec.actions) {
      if (!action.approved) void approveAction(rec.id, action.id)
    }
  }

  return (
    <PageShell>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Cpu size={18} className="text-[#94A3B8]" />
          <div>
            <h1 className="text-[16px] font-semibold text-[#E6EDF3]">
              Wsparcie decyzyjne
            </h1>
            <p className="text-[13px] text-[#66778B]">
              Silnik reguł operacyjnych — rekomendacja, zatwierdzenie operatora, wpis w dzienniku.
            </p>
          </div>
        </div>
        <Badge variant="muted">Silnik deterministyczny · nie chatbot</Badge>
      </div>

      {activeRecs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#66778B]">
          <Cpu size={32} className="mb-3 opacity-20" />
          <div className="text-[14px]">Brak rekomendacji dla aktywnych incydentów</div>
          <div className="text-[12px] mt-1">Uruchom scenariusz, aby wygenerować procedury</div>
        </div>
      ) : (
        <div className="ui-stack">
          {activeRecs.map(rec => {
            const isExpanded = expanded === rec.id
            const allApproved = rec.actions.every(a => a.approved || a.executionState === 'executed')

            return (
              <Card key={rec.id} accent={rec.riskLevel === 'critical' ? 'danger' : rec.riskLevel === 'high' ? 'orange' : undefined}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <AlertTriangle size={13} className="text-[#F59E0B]" />
                      <span className="text-[12px] font-medium text-[#E6EDF3]">
                        Ryzyko: {RISK_PL[rec.riskLevel]}
                      </span>
                      <Badge variant="muted">Pewność: {rec.confidence}%</Badge>
                      {rec.requiresApproval && <Badge variant="orange">Wymaga zatwierdzenia</Badge>}
                      {allApproved && <Badge variant="green">Zatwierdzono</Badge>}
                    </div>
                    <p className="text-[13px] text-[#E6EDF3]">{rec.summary}</p>
                    <div className="text-[11px] text-[#66778B] mt-1">{formatTimestamp(rec.generatedAt)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpanded(isExpanded ? null : rec.id)}
                    className="ml-4 text-[#66778B] hover:text-[#94A3B8]"
                    aria-label={isExpanded ? 'Zwiń' : 'Rozwiń'}
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                <ProgressBar value={rec.confidence} label="Pewność reguły" showValue accent="cyan" className="mb-3" />

                <div className="ops-panel mb-3" style={{ padding: '12px 14px' }}>
                  <div className="text-[10px] text-[#66778B] mb-1">Uzasadnienie proceduralne</div>
                  <p className="text-[12px] text-[#94A3B8] leading-relaxed">{rec.reasoning}</p>
                </div>

                {rec.whyThisAction && (
                  <div className="ops-panel mb-3" style={{ padding: '12px 14px' }}>
                    <div className="text-[10px] text-[#66778B] mb-1">Dlaczego ta procedura</div>
                    <p className="text-[12px] text-[#94A3B8]">{rec.whyThisAction}</p>
                  </div>
                )}

                {rec.ifIgnored && (
                  <div className="ops-panel mb-3" style={{ padding: '12px 14px', borderColor: 'rgba(239,68,68,0.2)' }}>
                    <div className="text-[10px] text-[#EF4444] mb-1">Skutek braku działania</div>
                    <p className="text-[12px] text-[#94A3B8]">{rec.ifIgnored}</p>
                  </div>
                )}

                {isExpanded && (
                  <div className="ui-stack" style={{ gap: 8, marginBottom: 12 }}>
                    <div className="text-[11px] text-[#66778B]">Procedury ({rec.actions.length})</div>
                    {rec.actions.map(action => (
                      <div key={action.id} className="ops-panel" style={{ padding: '10px 12px' }}>
                        <div className="flex gap-3">
                          <span className="text-[11px] text-[#66778B] w-4">{action.priority}.</span>
                          <div className="flex-1">
                            <div className="text-[12px] text-[#E6EDF3] mb-1">{action.description}</div>
                            <div className="flex gap-3 text-[11px] text-[#66778B] flex-wrap">
                              <span>Odpowiedzialny: {action.responsible}</span>
                              <span>Termin: {action.timeframe}</span>
                              {action.executionState && (
                                <Badge variant={action.executionState === 'executed' ? 'green' : 'muted'}>
                                  {EXEC_PL[action.executionState] ?? action.executionState}
                                </Badge>
                              )}
                            </div>
                            {action.tradeoffs?.[0] && (
                              <div className="mt-2 text-[11px] text-[#F59E0B]">Kompromis: {action.tradeoffs[0]}</div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => !action.approved && handleApproveAction(rec, action.id)}
                            disabled={action.approved}
                            className="flex-shrink-0 w-7 h-7 rounded border border-white/10 flex items-center justify-center text-[#66778B] disabled:text-[#22C55E]"
                          >
                            <CheckCircle size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!allApproved && (
                  <div className="flex gap-2">
                    <Button variant="primary" size="sm" onClick={() => handleApproveAll(rec)}>
                      <CheckCircle size={12} /> Zatwierdź procedury
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => rejectAction(rec.id)}>
                      <XCircle size={12} /> Odrzuć
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
