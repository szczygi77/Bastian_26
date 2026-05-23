import { CheckCircle2, Circle, Loader2 } from 'lucide-react'
import type { DroneMission } from '@/types'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Badge } from '@/components/ui/Badge'

const VERDICT_LABEL = {
  success: { label: 'SUKCES', variant: 'green' as const },
  partial: { label: 'CZĘŚCIOWY', variant: 'orange' as const },
  failed: { label: 'NIEPOWODZENIE', variant: 'danger' as const },
}

function findingColor(severity: string): string {
  if (severity === 'critical') return '#EF4444'
  if (severity === 'warning') return '#F59E0B'
  return '#94A3B8'
}

export function MissionActivityPanel({ mission }: { mission: DroneMission }) {
  const steps = mission.activitySteps ?? []
  const activeIndex = mission.currentActivityIndex ?? 0
  const isWorking = mission.status === 'on_site' || mission.status === 'en_route' || mission.status === 'dispatched'
  const isCompleted = mission.status === 'completed' || !!mission.result

  return (
    <div className="skymarshal-activity">
      <div className="skymarshal-activity__head">
        <div>
          <div className="skymarshal-activity__title">Operacje na miejscu</div>
          <div className="skymarshal-activity__subtitle">
            {mission.activityLabel ?? 'Oczekiwanie na rozpoczęcie pracy'}
          </div>
        </div>
        {isWorking && mission.activityProgress != null && (
          <strong className="skymarshal-activity__percent">{mission.activityProgress}%</strong>
        )}
      </div>

      {isWorking && mission.activityProgress != null && (
        <ProgressBar value={mission.activityProgress} accent="cyan" thin />
      )}

      {steps.length > 0 && (
        <div className="skymarshal-activity__steps">
          {steps.map((step, index) => {
            const done = isCompleted || index < activeIndex
            const active = !isCompleted && index === activeIndex && mission.status === 'on_site'
            return (
              <div
                key={step.id}
                className={`skymarshal-activity__step${done ? ' is-done' : ''}${active ? ' is-active' : ''}`}
              >
                <div className="skymarshal-activity__step-icon" aria-hidden>
                  {done ? <CheckCircle2 size={14} /> : active ? <Loader2 size={14} className="animate-spin" /> : <Circle size={14} />}
                </div>
                <div className="skymarshal-activity__step-body">
                  <strong>{step.label}</strong>
                  <span>{step.description}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {(mission.findings?.length ?? 0) > 0 && (
        <div className="skymarshal-activity__findings">
          <div className="skymarshal-activity__findings-title">Odkrycia w trakcie misji</div>
          {mission.findings!.map(finding => (
            <div key={finding.id} className="skymarshal-activity__finding">
              <span style={{ color: findingColor(finding.severity) }}>●</span>
              <span>{finding.message}</span>
            </div>
          ))}
        </div>
      )}

      {mission.result && (
        <div className="skymarshal-activity__result">
          <div className="skymarshal-activity__result-head">
            <span>Wynik misji</span>
            <Badge variant={VERDICT_LABEL[mission.result.verdict].variant}>
              {VERDICT_LABEL[mission.result.verdict].label}
            </Badge>
          </div>
          <p className="skymarshal-activity__result-summary">{mission.result.summary}</p>
          {mission.result.recommendations.length > 0 && (
            <ul className="skymarshal-activity__recommendations">
              {mission.result.recommendations.map(rec => (
                <li key={rec}>{rec}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
