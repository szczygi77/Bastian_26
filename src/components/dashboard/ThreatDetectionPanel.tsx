import { ShieldAlert } from 'lucide-react'
import { THREAT_CATEGORY_LABELS } from '@/services/threatDetectionService'
import type { ThreatSignal, ThreatSignalStatus } from '@/types'
import { Badge } from '@/components/ui/Badge'

const STATUS_LABEL: Record<ThreatSignalStatus, string> = {
  clear: 'CLEAR',
  monitoring: 'MONITORING',
  live: 'LIVE',
}

const STATUS_VARIANT: Record<ThreatSignalStatus, 'green' | 'orange' | 'danger' | 'muted'> = {
  clear: 'green',
  monitoring: 'orange',
  live: 'danger',
}

export function ThreatDetectionPanel({ signals, compact }: { signals: ThreatSignal[]; compact?: boolean }) {
  const ordered = ['fire_smoke', 'unauthorized_movement', 'thermal_anomaly', 'infrastructure_change'] as const
  const byCategory = new Map(signals.map(s => [s.category, s]))

  return (
    <section className={`threat-panel${compact ? ' threat-panel--compact' : ''}`}>
      <div className="threat-panel__head">
        <ShieldAlert size={compact ? 14 : 16} aria-hidden />
        <div>
          <h2 className="threat-panel__title">Wykryte zagrożenia</h2>
          {!compact && (
            <p className="threat-panel__sub">Automatyczna analiza · 4 kategorie · reguły operacyjne</p>
          )}
        </div>
      </div>
      <div className="threat-panel__grid">
        {ordered.map(cat => {
          const sig = byCategory.get(cat)
          const status = sig?.status ?? 'clear'
          return (
            <div key={cat} className={`threat-panel__item threat-panel__item--${status}`}>
              <div className="threat-panel__item-head">
                <strong>{THREAT_CATEGORY_LABELS[cat]}</strong>
                <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
              </div>
              {sig && status !== 'clear' && (
                <p className="threat-panel__evidence">{sig.evidence[0]}</p>
              )}
              {sig && status !== 'clear' && sig.ikObjectId && (
                <span className="threat-panel__ik">Obiekt: {sig.ikObjectId.toUpperCase()}</span>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
