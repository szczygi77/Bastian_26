import { useState } from 'react'
import {
  ShieldCheck, ArrowRightLeft, CheckCircle2, RotateCcw, StopCircle, RefreshCw,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { canCloseIncident } from '@/services/incidentLifecycleService'
import { Button } from '@/components/ui/Button'
import { canPerformAction, getRbacDeniedMessage } from '@/services/rbacService'
import { useToast } from '@/components/ui/Toast'

import type { Incident } from '@/types'

export function IncidentLifecycleBar({ incident }: { incident: Incident }) {
  const {
    cascadeResult,
    containmentResult,
    containmentRecovery,
    restoreIncidentContext,
    containIncident,
    handoverIncident,
    resolveIncident,
    abortScenarioOperation,
    operator,
  } = useAppStore()
  const { toast } = useToast()
  const canAbort = canPerformAction(operator?.clearanceLevel, 'abort_scenario')
  const [panel, setPanel] = useState<'handover' | 'resolve' | null>(null)
  const [notes, setNotes] = useState('')
  const [shift, setShift] = useState('Zmiana B — Dowódca rejonowy')

  const closeGate = canCloseIncident({
    incident,
    containmentResult,
    containmentRecovery,
  })

  function handleRestore() {
    const ok = restoreIncidentContext(incident.id, true)
    toast({
      title: ok ? 'Kontekst operacyjny przywrócony' : 'Nie udało się przywrócić kaskady',
      variant: ok ? 'success' : 'warning',
    })
  }

  function handleContain() {
    containIncident(incident.id, notes || 'Sytuacja opanowana — monitoring utrzymany.')
    setNotes('')
    toast({ title: 'Incydent oznaczony jako CONTAINED', variant: 'success' })
  }

  function handleHandover() {
    if (!notes.trim()) {
      toast({ title: 'Wpisz podsumowanie przekazania', variant: 'warning' })
      return
    }
    handoverIncident(incident.id, shift, notes.trim())
    setPanel(null)
    setNotes('')
    toast({ title: 'Przekazano zmianę operacyjną', description: shift, variant: 'success' })
  }

  function handleResolve() {
    if (!closeGate.ok) {
      toast({ title: 'Nie można zamknąć', description: closeGate.reason, variant: 'warning' })
      return
    }
    if (!notes.trim()) {
      toast({ title: 'Wpisz podsumowanie zamknięcia', variant: 'warning' })
      return
    }
    resolveIncident(incident.id, notes.trim())
    setPanel(null)
    setNotes('')
    toast({ title: 'Incydent zamknięty', description: 'Powrót do dashboardu', variant: 'success' })
  }

  function handleAbort() {
    if (!canAbort) {
      toast({ title: getRbacDeniedMessage('abort_scenario', operator?.clearanceLevel), variant: 'destructive' })
      return
    }
    abortScenarioOperation('Przerwanie scenariusza z ICM')
    toast({ title: 'Scenariusz przerwany', variant: 'warning' })
  }

  if (incident.status === 'resolved') return null

  return (
    <div className="icm-lifecycle">
      <div className="icm-lifecycle__head">
        <span>OPERACJE INCYDENTU</span>
        {incident.status === 'contained' && (
          <span className="icm-lifecycle__tag icm-lifecycle__tag--contained">CONTAINED</span>
        )}
        {!cascadeResult && (
          <span className="icm-lifecycle__tag icm-lifecycle__tag--warn">BRAK KASKADY</span>
        )}
      </div>

      <div className="icm-lifecycle__actions">
        {!cascadeResult && (
          <Button size="sm" variant="primary" onClick={handleRestore}>
            <RefreshCw size={12} /> Przywróć kaskadę
          </Button>
        )}
        {incident.status === 'open' && (
          <Button size="sm" variant="secondary" onClick={handleContain}>
            <ShieldCheck size={12} /> Oznacz opanowany
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={() => { setPanel('handover'); setNotes('') }}>
          <ArrowRightLeft size={12} /> Przekaż zmianę
        </Button>
        <Button
          size="sm"
          variant="primary"
          onClick={() => { setPanel('resolve'); setNotes('') }}
          disabled={!closeGate.ok && !!containmentRecovery?.active}
        >
          <CheckCircle2 size={12} /> Zakończ incydent
        </Button>
        <Button size="sm" variant="ghost" onClick={handleAbort} disabled={!canAbort} title={!canAbort ? getRbacDeniedMessage('abort_scenario', operator?.clearanceLevel) : undefined}>
          <StopCircle size={12} /> Przerwij scenariusz
        </Button>
      </div>

      {!closeGate.ok && closeGate.reason && (
        <div className="icm-lifecycle__hint">{closeGate.reason}</div>
      )}

      {panel === 'handover' && (
        <div className="icm-lifecycle__panel">
          <div className="icm-lifecycle__panel-title">PRZEKAZANIE ZMIANY</div>
          <input
            className="icm-lifecycle__input"
            value={shift}
            onChange={e => setShift(e.target.value)}
            placeholder="Zmiana / dowódca przyjmujący"
          />
          <textarea
            className="icm-lifecycle__textarea"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Stan operacyjny, wykonane akcje, otwarte zagrożenia, rekomendacje dla następnej zmiany…"
            rows={4}
          />
          <div className="icm-lifecycle__panel-actions">
            <Button size="sm" variant="primary" onClick={handleHandover}>
              <ArrowRightLeft size={12} /> Przekaż
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPanel(null)}>Anuluj</Button>
          </div>
        </div>
      )}

      {panel === 'resolve' && (
        <div className="icm-lifecycle__panel">
          <div className="icm-lifecycle__panel-title">ZAMKNIĘCIE INCYDENTU</div>
          <p className="icm-lifecycle__panel-desc">
            Zamknięcie kończy operację: alerty zostaną rozwiązane, kaskada wyczyszczona, obiekty IK wrócą do stanu nominalnego.
          </p>
          <textarea
            className="icm-lifecycle__textarea"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Podsumowanie operacji, skutki, wnioski, status usług…"
            rows={4}
          />
          <div className="icm-lifecycle__panel-actions">
            <Button size="sm" variant="primary" onClick={handleResolve}>
              <CheckCircle2 size={12} /> Zamknij i wróć do dashboardu
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPanel(null)}>Anuluj</Button>
          </div>
        </div>
      )}

      {cascadeResult && (
        <div className="icm-lifecycle__meta">
          <RotateCcw size={10} />
          Kaskada aktywna · {cascadeResult.affectedCount} węzłów · impact {cascadeResult.totalImpactScore.toFixed(0)}
        </div>
      )}
    </div>
  )
}
