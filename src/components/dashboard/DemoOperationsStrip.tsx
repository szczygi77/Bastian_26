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
  const trust = averageTrustScore(publicDataSources)

  const steps: DemoStep[] = [
    { id: 'nominal', label: 'System nominal', done: operationalPulse?.integrityOk ?? false },
    { id: 'sync', label: 'Sync źródeł publicznych', done: hasLiveSource, action: () => void refreshSystemHealth(), actionLabel: 'Sync' },
    { id: 'incident', label: 'Trigger incydentu', done: !!openIncident, action: () => setActiveView('incidents'), actionLabel: 'Scenarios' },
    { id: 'alerts', label: 'Grupowanie alertów', done: hasGroupedAlerts, action: () => setActiveView('alerts'), actionLabel: 'Alerts' },
    { id: 'cascade', label: 'Propagacja kaskady', done: !!cascadeResult, action: () => openIncident && openIncidentCommand(openIncident.id), actionLabel: 'ICM' },
    { id: 'graph', label: 'Replay grafu', done: cascadeReplayFrames.length > 1, action: () => { setActiveView('graph'); startCascadeReplay() }, actionLabel: 'Graph' },
    { id: 'decision', label: 'Rekomendacja operacyjna', done: recommendations.length > 0, action: () => setActiveView('ai'), actionLabel: 'Decision' },
    { id: 'approve', label: 'Zatwierdzenie operatora', done: hasExecutedAction, action: () => openIncident && openIncidentCommand(openIncident.id), actionLabel: 'Approve' },
    { id: 'contain', label: 'Containment / redukcja ryzyka', done: !!containmentResult, action: () => setActiveView('graph'), actionLabel: 'Contain' },
    { id: 'audit', label: 'Audit trail', done: auditEntries.length > 3, action: () => setActiveView('audit'), actionLabel: 'Audit' },
    { id: 'compliance', label: 'Eksport compliance', done: auditEntries.some(e => e.action === 'report_export'), action: () => setActiveView('compliance'), actionLabel: 'Export' },
    { id: 'national', label: 'National overview', done: !!openIncident, action: () => setActiveView('national'), actionLabel: 'National' },
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
