import { useState } from 'react'
import { Check, X, ArrowUpRight, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import type { Recommendation } from '@/types'
import type { AssetRecommendation } from '@/services/skymarshalAssignmentEngine'

export function IncidentDecisionPanel({
  recommendations,
  asset,
  onApprove,
  onReject,
  onEscalate,
  onDispatch,
}: {
  recommendations: Recommendation[]
  asset: AssetRecommendation | null
  onApprove: (recId: string, actionId: string) => void
  onReject: (recId: string) => void
  onEscalate: () => void
  onDispatch: () => void
}) {
  const rec = recommendations[0]
  const [showAllActions, setShowAllActions] = useState(false)
  const visibleActions = rec && !showAllActions ? rec.actions.slice(0, 2) : rec?.actions ?? []

  return (
    <div className="icm-decision">
      <Card label="DECISION SUPPORT" accent="cyan" noPad>
        {!rec ? (
          <div className="icm-decision__empty">Brak rekomendacji dla aktywnego incydentu.</div>
        ) : (
          <div className="icm-decision__body">
            <div className="icm-decision__title">{rec.summary}</div>
            <p className="icm-decision__summary">{rec.reasoning}</p>
            <div className="icm-decision__meta">
              <Badge variant="cyan">Confidence {rec.confidence}%</Badge>
              {rec.requiresApproval && <Badge variant="orange">Human approval required</Badge>}
            </div>
            {rec.whyThisAction && (
              <p className="icm-decision__why"><strong>Why:</strong> {rec.whyThisAction}</p>
            )}
            {rec.ifIgnored && (
              <p className="icm-decision__ignore"><strong>If ignored:</strong> {rec.ifIgnored}</p>
            )}
            <div className="icm-decision__actions-list">
              {visibleActions.map(action => (
                <div key={action.id} className="icm-decision__action">
                  <div>
                    <strong>{action.description}</strong>
                    <p>{action.responsible} · {action.timeframe}</p>
                  </div>
                  <div className="icm-decision__action-btns">
                    <Button size="sm" variant="primary" onClick={() => onApprove(rec.id, action.id)}>
                      <Check size={12} /> Approve
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => onReject(rec.id)}>
                      <X size={12} /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {rec.actions.length > 2 && (
              <button
                type="button"
                className="icm-decision__toggle"
                onClick={() => setShowAllActions(v => !v)}
              >
                {showAllActions ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {showAllActions ? 'Mniej akcji' : `Pokaż wszystkie (${rec.actions.length})`}
              </button>
            )}
          </div>
        )}
      </Card>

      <Card label="RESPONSE ASSET" accent="orange" noPad>
        {!asset ? (
          <div className="icm-decision__empty">Brak dostępnego zasobu reakcji.</div>
        ) : (
          <div className="icm-decision__asset">
            <div className="icm-decision__asset-head">
              <strong>{asset.drone.model}</strong>
              <Badge variant="cyan">Score {asset.score.totalScore}/100</Badge>
            </div>
            <div className="icm-decision__asset-meta">
              <span>ETA {asset.etaMin} min</span>
              <span>BAT {asset.drone.battery}%</span>
              <span>{asset.drone.payload.join(', ')}</span>
            </div>
            <ul className="icm-decision__reasons">
              {asset.reasons.map(r => <li key={r}>{r}</li>)}
            </ul>
            {asset.risks.length > 0 && (
              <ul className="icm-decision__risks">
                {asset.risks.map(r => <li key={r}>{r}</li>)}
              </ul>
            )}
            <Button variant="primary" className="w-full" onClick={onDispatch}>
              <ShieldAlert size={12} /> Dispatch recommended asset
            </Button>
          </div>
        )}
      </Card>

      <div className="icm-decision__footer">
        <Button variant="secondary" className="w-full" onClick={onEscalate}>
          <ArrowUpRight size={12} /> Escalate incident
        </Button>
      </div>
    </div>
  )
}
