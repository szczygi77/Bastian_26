import { memo, useState } from 'react'
import {
  Activity, CheckCircle2, Circle, ChevronRight, Play,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { averageTrustScore } from '@/services/sourceTrustService'
import { launchDefaultDemoScenario } from '@/services/scenarioLaunchService'
import { Button } from '@/components/ui/Button'

interface DemoStep {
  id: string
  label: string
  done: boolean
  action?: () => void
  actionLabel?: string
}

export const DemoOperationsStrip = memo(function DemoOperationsStrip() {
  const [launching, setLaunching] = useState(false)
  const [launchStep, setLaunchStep] = useState<string | null>(null)
  const {
    publicDataSources,
    incidents,
    cascadeResult,
    alerts,
    recommendations,
    containmentResult,
    auditEntries,
    operationalPulse,
    cascadeReplayFrames,
    missions,
    threatSignals,
    mode,
    openIncidentCommand,
    setActiveView,
    refreshSystemHealth,
    startCascadeReplay,
  } = useAppStore()

  const openIncident = incidents.find(i => i.status === 'open')
  const hasLiveSource = publicDataSources.some(s => s.status === 'live')
  const hasExecutedAction = recommendations.some(r =>
    r.actions.some(a => a.executionState === 'executed'),
  )
  const hasGroupedAlerts = alerts.some(a => a.incidentId)
  const hasAutoDetect = alerts.some(a => a.autoDetected) || threatSignals.some(s => s.status === 'live')
  const hasFastRecommendation = recommendations.some(r => (r.generationTimeMs ?? 9999) < 4000)
  const hasDroneDispatch = missions.some(m =>
    m.status === 'dispatched' || m.status === 'en_route' || m.status === 'on_site' || m.status === 'completed' || m.status === 'returning',
  )
  const hasPdfExport = auditEntries.some(e => e.action === 'report_export' && e.details.toLowerCase().includes('pdf'))
  const trust = averageTrustScore(publicDataSources)

  const steps: DemoStep[] = [
    { id: 'scenario', label: 'Start scenariusza blackout', done: !!openIncident, action: () => setActiveView('scenarios'), actionLabel: 'Scenarios' },
    { id: 'autodetect', label: 'Auto-detekcja zagrożeń', done: hasAutoDetect, action: () => setActiveView('dashboard'), actionLabel: 'Dashboard' },
    { id: 'icm', label: 'Alert + otwarcie ICM', done: hasGroupedAlerts && !!openIncident, action: () => openIncident && openIncidentCommand(openIncident.id), actionLabel: 'ICM' },
    { id: 'recommend', label: 'Rekomendacja (<4s)', done: hasFastRecommendation, action: () => setActiveView('ai'), actionLabel: 'Decision' },
    { id: 'approve', label: 'Zatwierdzenie operatora', done: hasExecutedAction, action: () => openIncident && openIncidentCommand(openIncident.id), actionLabel: 'Approve' },
    { id: 'contain', label: 'Containment na grafie', done: !!containmentResult, action: () => setActiveView('graph'), actionLabel: 'Graph' },
    { id: 'drone', label: 'Dispatch drona SkyMarshal', done: hasDroneDispatch, action: () => setActiveView('skymarshal'), actionLabel: 'SkyMarshal' },
    { id: 'pdf', label: 'Eksport raportu PDF (RCB)', done: hasPdfExport, action: () => setActiveView('reports'), actionLabel: 'Reports' },
    { id: 'audit', label: 'Weryfikacja łańcucha audytu', done: auditEntries.length > 5, action: () => setActiveView('audit'), actionLabel: 'Audit' },
    { id: 'sync', label: 'Sync źródeł publicznych', done: hasLiveSource, action: () => void refreshSystemHealth(), actionLabel: 'Sync' },
    { id: 'graph', label: 'Replay grafu kaskady', done: cascadeReplayFrames.length > 1, action: () => { setActiveView('graph'); startCascadeReplay() }, actionLabel: 'Replay' },
    { id: 'simulation', label: mode === 'simulation' ? 'Tryb SIMULATION aktywny' : 'Przełącz SIMULATION', done: mode === 'simulation', action: () => setActiveView('system'), actionLabel: 'System' },
  ]

  const completed = steps.filter(s => s.done).length
  const progress = Math.round((completed / steps.length) * 100)

  async function handleRunDemo() {
    if (launching || openIncident) return
    setLaunching(true)
    setLaunchStep('Inicjalizacja scenariusza…')
    try {
      await launchDefaultDemoScenario({
        onStep: label => setLaunchStep(label),
      })
    } finally {
      setLaunchStep(null)
      setLaunching(false)
    }
  }

  return (
    <div className="demo-ops-strip">
      <div className="demo-ops-strip__head">
        <div className="demo-ops-strip__title">
          <Activity size={14} />
          <span>OPERATIONS DEMO FLOW</span>
          <strong>{completed}/{steps.length}</strong>
        </div>
        <div className="demo-ops-strip__meta">
          Trust {trust} · Presja {operationalPulse?.propagationPressure ?? 0}%
          {launchStep && <span className="demo-ops-strip__launch"> · {launchStep}</span>}
        </div>
        {!openIncident && (
          <Button size="sm" variant="primary" onClick={() => void handleRunDemo()} disabled={launching}>
            <Play size={12} /> {launching ? 'Uruchamianie…' : 'Uruchom pełne demo'}
          </Button>
        )}
      </div>
      <div className="demo-ops-strip__track">
        <div className="demo-ops-strip__progress" style={{ width: `${progress}%` }} />
      </div>
      <div className="demo-ops-strip__steps">
        {steps.map(step => (
          <div key={step.id} className={`demo-ops-strip__step ${step.done ? 'is-done' : ''}`}>
            {step.done ? <CheckCircle2 size={12} /> : <Circle size={12} />}
            <span>{step.label}</span>
            {!step.done && step.action && step.actionLabel && (
              <Button size="sm" variant="ghost" onClick={step.action}>
                {step.actionLabel} <ChevronRight size={10} />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
})
