import { useMemo } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { SCENARIOS } from '@/data/scenarios'
import { recommendResponseAsset, dispatchRecommendedAsset } from '@/services/skymarshalAssignmentEngine'
import { logAction } from '@/services/auditLogService'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { IncidentSummaryPanel } from '@/features/incident-command/IncidentSummaryPanel'
import { IncidentGraphPanel } from '@/features/incident-command/IncidentGraphPanel'
import { IncidentMapPanel } from '@/features/incident-command/IncidentMapPanel'
import { IncidentTimeline } from '@/features/incident-command/IncidentTimeline'
import { IncidentDecisionPanel } from '@/features/incident-command/IncidentDecisionPanel'
import { IncidentDataSourcesStrip } from '@/features/incident-command/IncidentDataSourcesStrip'
import { IncidentReportActions, logReportExport } from '@/features/incident-command/IncidentReportActions'

export function IncidentCommandPage() {
  const {
    incidents,
    activeIncidentId,
    ikObjects,
    alerts,
    cascadeResult,
    recommendations,
    drones,
    auditEntries,
    publicDataSources,
    operator,
    mode,
    addMission,
    updateDrone,
    approveAction,
    rejectAction,
    addAuditEntry,
    addIncident,
    updateIncident,
    setActiveIncidentId,
    pulseEventHeartbeat,
  } = useAppStore()
  const { toast } = useToast()

  const incident = useMemo(
    () => incidents.find(i => i.id === activeIncidentId) ?? incidents.find(i => i.status === 'open') ?? null,
    [incidents, activeIncidentId],
  )

  const incidentAlerts = useMemo(
    () => (incident ? alerts.filter(a => incident.alertIds.includes(a.id) || a.incidentId === incident.id) : alerts),
    [alerts, incident],
  )

  const incidentRecs = recommendations.slice(0, 3)

  const rootObject = useMemo(() => {
    if (!incident) return ikObjects[0]
    return ikObjects.find(o => o.id === incident.affectedObjectIds[0]) ?? ikObjects[0]
  }, [incident, ikObjects])

  const assetRecommendation = useMemo(
    () => recommendResponseAsset(drones, rootObject),
    [drones, rootObject],
  )

  function handleApprove(recId: string, actionId: string) {
    void approveAction(recId, actionId)
    pulseEventHeartbeat()
    toast({ title: 'Akcja zatwierdzona i wykonana', variant: 'success' })
  }

  function handleReject(recId: string) {
    rejectAction(recId)
    pulseEventHeartbeat()
    toast({ title: 'Rekomendacja odrzucona', variant: 'warning' })
  }

  function handleEscalate() {
    if (!incident) return
    updateIncident(incident.id, { severity: 'critical' })
    const entry = logAction({
      operator: operator?.name ?? 'OPERATOR',
      action: 'alert_escalate',
      details: `Eskalowano incydent ${incident.title}`,
      incidentId: incident.id,
      mode,
    })
    addAuditEntry(entry)
    pulseEventHeartbeat()
    toast({ title: 'Incydent eskalowany', variant: 'warning' })
  }

  function handleDispatch() {
    if (!incident || !rootObject) return
    const result = dispatchRecommendedAsset(
      drones,
      rootObject,
      incident.id,
      operator?.id ?? 'anonymous',
    )
    if (!result) {
      toast({ title: 'Brak dostępnego zasobu', variant: 'warning' })
      return
    }
    addMission(result.mission)
    updateDrone(result.drone.id, {
      status: 'on_mission',
      mission: result.mission,
      availability: false,
      coordinates: result.mission.currentPosition,
    })
    const entry = logAction({
      operator: operator?.name ?? 'OPERATOR',
      action: 'drone_dispatch',
      details: `Dispatch z ICM: ${result.drone.model} → ${rootObject.shortName}`,
      affectedObject: rootObject.id,
      incidentId: incident.id,
      mode,
    })
    addAuditEntry(entry)
    pulseEventHeartbeat()
    toast({ title: 'Zasób wysłany', description: `${result.drone.model} w drodze`, variant: 'success' })
  }

  if (!incident) {
    const scenario = SCENARIOS[0]
    return (
      <div className="icm-page icm-page--empty">
        <div className="icm-page__empty-card">
          <h2>INCIDENT COMMAND MODE</h2>
          <p>Brak aktywnego incydentu. Uruchom scenariusz w module Incidents lub potwierdź alert krytyczny.</p>
          <Button variant="primary" onClick={() => useAppStore.getState().setActiveView('incidents')}>
            Przejdź do Incidents
          </Button>
          {scenario && (
            <p className="icm-page__hint">Przykład: {scenario.name}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="icm-page">
      <header className="icm-page__header">
        <div>
          <div className="icm-page__kicker">INCIDENT COMMAND MODE</div>
          <h1 className="icm-page__title">{incident.title}</h1>
        </div>
        <div className="icm-page__header-actions">
          <IncidentReportActions
            incident={incident}
            cascadeResult={cascadeResult}
            alerts={incidentAlerts}
            recommendations={incidentRecs}
            auditEntries={auditEntries}
            publicDataSources={publicDataSources}
            ikObjects={ikObjects}
            operator={operator?.name ?? 'OPERATOR'}
            mode={mode}
            onExported={details => {
              const entry = logReportExport(details, incident.id, operator?.name ?? 'OPERATOR', mode)
              addAuditEntry(entry)
              pulseEventHeartbeat()
              toast({ title: 'Raport wygenerowany', description: details, variant: 'success' })
            }}
          />
          <BadgeLike status={incident.status} />
        </div>
      </header>

      <div className="icm-page__grid">
        <aside className="icm-page__left">
          <IncidentSummaryPanel incident={incident} objects={ikObjects} alerts={incidentAlerts} />
        </aside>

        <main className="icm-page__center">
          <div className="icm-page__center-top">
            <IncidentMapPanel />
          </div>
          <div className="icm-page__center-bottom">
            <IncidentGraphPanel />
          </div>
        </main>

        <aside className="icm-page__right">
          <IncidentDecisionPanel
            recommendations={incidentRecs}
            asset={assetRecommendation}
            onApprove={handleApprove}
            onReject={handleReject}
            onEscalate={handleEscalate}
            onDispatch={handleDispatch}
          />
        </aside>
      </div>

      <footer className="icm-page__bottom">
        <IncidentTimeline cascadeResult={cascadeResult} objects={ikObjects} />
        <IncidentDataSourcesStrip sources={publicDataSources} auditEntries={auditEntries} />
      </footer>
    </div>
  )
}

function BadgeLike({ status }: { status: string }) {
  return (
    <span className={`icm-page__status icm-page__status--${status}`}>
      {status.toUpperCase()}
    </span>
  )
}
