import { formatTimeAgo, statusColor } from '@/utils/format'
import { Badge, SeverityBadge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import type { Alert, Incident, IKObject } from '@/types'

export function IncidentSummaryPanel({
  incident,
  objects,
  alerts,
}: {
  incident: Incident
  objects: IKObject[]
  alerts: Alert[]
}) {
  const rootId = incident.affectedObjectIds[0]
  const root = objects.find(o => o.id === rootId)
  const activeAlerts = alerts.filter(a => a.status === 'active' || a.status === 'acknowledged')

  return (
    <div className="icm-summary">
      <Card accent="orange" noPad>
        <div className="icm-summary__head">
          <div>
            <div className="icm-summary__label">INCIDENT COMMAND</div>
            <div className="icm-summary__title">{incident.title}</div>
          </div>
          <SeverityBadge severity={incident.severity} />
        </div>
        <div className="icm-summary__meta">
          <span>Status: <strong>{incident.status.toUpperCase()}</strong></span>
          <span>Start: {formatTimeAgo(incident.startedAt)}</span>
        </div>
        <p className="icm-summary__notes">{incident.notes}</p>
      </Card>

      <Card label="ROOT CAUSE" accent="danger" noPad>
        <div className="icm-summary__root">
          <strong>{root?.shortName ?? rootId}</strong>
          <span style={{ color: statusColor(root?.status ?? 'offline') }}>
            {(root?.status ?? 'unknown').replace(/_/g, ' ').toUpperCase()}
          </span>
        </div>
      </Card>

      <Card label={`ALERTY (${activeAlerts.length})`} noPad>
        <div className="icm-summary__list">
          {activeAlerts.slice(0, 6).map(alert => (
            <div key={alert.id} className="icm-summary__alert">
              <SeverityBadge severity={alert.severity} />
              <span>{alert.title}</span>
            </div>
          ))}
          {activeAlerts.length === 0 && (
            <div className="icm-summary__empty">Brak aktywnych alertów</div>
          )}
        </div>
      </Card>

      <Card label="DOTKNIĘTE OBIEKTY" noPad>
        <div className="icm-summary__chips">
          {incident.affectedObjectIds.map(id => {
            const obj = objects.find(o => o.id === id)
            return (
              <Badge key={id} variant={obj?.status === 'offline' || obj?.status === 'under_attack' ? 'danger' : 'muted'}>
                {obj?.shortName ?? id}
              </Badge>
            )
          })}
        </div>
      </Card>

      <Card label="ESKALACJA" noPad>
        <div className="icm-summary__escalation">
          <Badge variant={incident.severity === 'critical' ? 'danger' : 'orange'}>
            {incident.severity === 'critical' ? 'LEVEL 1 — CRITICAL' : 'LEVEL 2 — HIGH'}
          </Badge>
          <span>Wymagana decyzja operatora</span>
        </div>
      </Card>
    </div>
  )
}
