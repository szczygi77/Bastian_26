import { useEffect, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import {
  Activity, AlertTriangle, Map, GitBranch, Radio, Shield,
  ArrowRight, Clock, Database,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import {
  selectOperationalOverview,
  selectActiveAlertsForDisplay,
  formatThreatLabel,
  formatSystemState,
  countLivePublicSources,
  selectRecentAuditEntries,
} from '@/store/operationalSelectors'
import { Button } from '@/components/ui/Button'
import { Badge, SeverityBadge } from '@/components/ui/Badge'
import { formatTimeAgo, statusColor } from '@/utils/format'
import { DemoOperationsStrip } from '@/components/dashboard/DemoOperationsStrip'
import { ThreatDetectionPanel } from '@/components/dashboard/ThreatDetectionPanel'
import type { PublicDataSourceStatus } from '@/types'

function KpiCell({
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  label: string
  value: string | number
  detail?: string
  tone?: 'neutral' | 'ok' | 'warn' | 'danger'
}) {
  const toneColor =
    tone === 'danger' ? '#EF4444' :
    tone === 'warn' ? '#F59E0B' :
    tone === 'ok' ? '#22C55E' : '#E6EDF3'

  return (
    <div className="ops-kpi">
      <span className="ops-kpi__label">{label}</span>
      <strong className="ops-kpi__value" style={{ color: toneColor }}>{value}</strong>
      {detail && <span className="ops-kpi__detail">{detail}</span>}
    </div>
  )
}

function SourceRow({ source }: { source: PublicDataSourceStatus }) {
  const statusPl: Record<string, string> = {
    live: 'Na żywo',
    cached: 'Cache',
    stale: 'Nieaktualne',
    offline: 'Offline',
    error: 'Błąd',
    missing_key: 'Brak klucza',
    mock: 'Symulacja',
    degraded: 'Obniżone',
  }
  return (
    <div className="ops-source-row">
      <span className="ops-source-row__name">{source.sourceName}</span>
      <Badge variant={source.status === 'live' ? 'green' : source.isMock ? 'muted' : 'orange'}>
        {statusPl[source.status] ?? source.status}
      </Badge>
      <span className="ops-source-row__meta">
        {source.lastSync ? formatTimeAgo(source.lastSync) : '—'}
      </span>
    </div>
  )
}

function SpatialPreview({
  objects,
  affectedIds,
  onOpenMap,
  onOpenGraph,
}: {
  objects: ReturnType<typeof useAppStore.getState>['ikObjects']
  affectedIds: Set<string>
  onOpenMap: () => void
  onOpenGraph: () => void
}) {
  const bounds = useMemo(() => {
    const lats = objects.map(o => o.coordinates[0])
    const lons = objects.map(o => o.coordinates[1])
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLon: Math.min(...lons),
      maxLon: Math.max(...lons),
    }
  }, [objects])

  function project(lat: number, lon: number) {
    const x = ((lon - bounds.minLon) / Math.max(0.001, bounds.maxLon - bounds.minLon)) * 100
    const y = (1 - (lat - bounds.minLat) / Math.max(0.001, bounds.maxLat - bounds.minLat)) * 100
    return { x, y }
  }

  return (
    <div className="ops-spatial">
      <svg viewBox="0 0 100 100" className="ops-spatial__svg" aria-hidden>
        <rect x="0" y="0" width="100" height="100" fill="rgba(5,7,10,0.6)" />
        {objects.map(obj => {
          const { x, y } = project(obj.coordinates[0], obj.coordinates[1])
          const affected = affectedIds.has(obj.id)
          return (
            <circle
              key={obj.id}
              cx={x}
              cy={y}
              r={affected ? 2.8 : 1.8}
              fill={affected ? '#EF4444' : statusColor(obj.status)}
              opacity={affected ? 1 : 0.65}
            />
          )
        })}
      </svg>
      <div className="ops-spatial__actions">
        <Button variant="outline" size="sm" onClick={onOpenMap}>
          <Map size={12} /> Mapa taktyczna
        </Button>
        <Button variant="outline" size="sm" onClick={onOpenGraph}>
          <GitBranch size={12} /> Graf zależności
        </Button>
      </div>
    </div>
  )
}

export function Dashboard() {
  const state = useAppStore(useShallow(s => ({
    ikObjects: s.ikObjects,
    alerts: s.alerts,
    incidents: s.incidents,
    cascadeResult: s.cascadeResult,
    recommendations: s.recommendations,
    publicDataSources: s.publicDataSources,
    systemHealth: s.systemHealth,
    auditEntries: s.auditEntries,
    missions: s.missions,
    drones: s.drones,
    mode: s.mode,
    online: s.online,
    refreshSystemHealth: s.refreshSystemHealth,
    refreshPublicDataSources: s.refreshPublicDataSources,
    openIncidentCommand: s.openIncidentCommand,
    setActiveView: s.setActiveView,
    threatSignals: s.threatSignals,
  })))

  useEffect(() => {
    state.refreshSystemHealth()
    state.refreshPublicDataSources()
    const t = setInterval(() => {
      state.refreshSystemHealth()
      state.refreshPublicDataSources()
    }, 30_000)
    return () => clearInterval(t)
  }, [state.refreshSystemHealth, state.refreshPublicDataSources])

  const overview = useMemo(
    () => selectOperationalOverview(state),
    [state],
  )

  const displayAlerts = useMemo(
    () => selectActiveAlertsForDisplay(state.alerts, state.incidents).slice(0, 8),
    [state.alerts, state.incidents],
  )

  const recentAudit = useMemo(
    () => selectRecentAuditEntries(state.auditEntries, 5),
    [state.auditEntries],
  )

  const degradedObjects = useMemo(
    () => state.ikObjects.filter(o => o.status !== 'operational').slice(0, 6),
    [state.ikObjects],
  )

  const activeMissions = useMemo(
    () => state.missions.filter(m => m.status !== 'completed').slice(0, 4),
    [state.missions],
  )

  const topRecommendation = state.recommendations.find(
    r => r.incidentId === overview.openIncident?.id,
  )

  const affectedIds = useMemo(() => {
    if (!overview.openIncident && !state.cascadeResult) return new Set<string>()
    const ids = new Set<string>()
    if (state.cascadeResult) {
      ids.add(state.cascadeResult.incidentObjectId)
      state.cascadeResult.nodes.forEach(n => ids.add(n.objectId))
    } else if (overview.openIncident) {
      overview.openIncident.affectedObjectIds.forEach(id => ids.add(id))
    }
    return ids
  }, [overview.openIncident, state.cascadeResult])

  const rootObject = overview.openIncident
    ? state.ikObjects.find(o => o.id === overview.openIncident!.affectedObjectIds[0])
    : null

  const liveSources = countLivePublicSources(state.publicDataSources)

  return (
    <div className="ops-dashboard page-content">
      <header className="ops-dashboard__header">
        <div>
          <h1 className="ops-dashboard__title">Pulpit dowodzenia</h1>
          <p className="ops-dashboard__subtitle">
            Rejon Stalowa Wola · {state.ikObjects.length} obiektów IK · tryb {state.mode === 'live' ? 'operacyjny' : 'symulacja'}
          </p>
        </div>
        <div className="ops-dashboard__header-meta">
          <Badge variant={state.online ? 'green' : 'muted'}>
            {state.online ? 'Online' : 'Offline'}
          </Badge>
          <span className="ops-dashboard__clock">
            <Clock size={12} />
            {new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </header>

      {/* SEKCJA 1 — STATUS GLOBALNY */}
      <section className="ops-section">
        <h2 className="ops-section__title">Status globalny</h2>
        <div className="ops-kpi-grid">
          <KpiCell
            label="Stan systemu"
            value={formatSystemState(state.systemHealth, state.online)}
            detail={`Kolejka sync: ${overview.syncQueueLength}`}
            tone={state.online ? 'ok' : 'warn'}
          />
          <KpiCell
            label="Zagrożenie regionalne"
            value={`${overview.regionalThreat}`}
            detail={formatThreatLabel(overview.regionalThreat)}
            tone={overview.regionalThreat >= 60 ? 'danger' : overview.regionalThreat >= 30 ? 'warn' : 'ok'}
          />
          <KpiCell
            label="Aktywne alerty"
            value={overview.activeAlertCount}
            detail={`${overview.criticalAlertCount} krytycznych`}
            tone={overview.criticalAlertCount > 0 ? 'danger' : 'neutral'}
          />
          <KpiCell
            label="Zdrowie infrastruktury"
            value={`${overview.infraHealthPct}%`}
            detail={`${overview.degradedObjectCount} obniżonych`}
            tone={overview.infraHealthPct < 80 ? 'warn' : 'ok'}
          />
          <KpiCell
            label="Zaufanie do źródeł"
            value={`${overview.avgSourceTrust}`}
            detail={`${liveSources}/${state.publicDataSources.length} na żywo`}
            tone={overview.avgSourceTrust < 50 ? 'warn' : 'ok'}
          />
        </div>
      </section>

      <ThreatDetectionPanel signals={state.threatSignals} />

      {/* SEKCJA 2 — AKTYWNA OPERACJA */}
      <section className="ops-section">
        <h2 className="ops-section__title">Aktywna operacja</h2>
        {overview.openIncident ? (
          <div className="ops-panel ops-panel--accent">
            <div className="ops-operation">
              <div className="ops-operation__main">
                <div className="ops-operation__head">
                  <SeverityBadge severity={overview.openIncident.severity} />
                  <strong>{overview.openIncident.title}</strong>
                  <Badge variant={overview.openIncident.status === 'open' ? 'danger' : 'orange'}>
                    {overview.openIncident.status === 'open' ? 'Otwarty' : 'Opanowany'}
                  </Badge>
                </div>
                <dl className="ops-operation__facts">
                  <div><dt>Przyczyna źródłowa</dt><dd>{rootObject?.name ?? '—'}</dd></div>
                  <div><dt>Obiekty dotknięte</dt><dd>{overview.openIncident.affectedObjectIds.length}</dd></div>
                  <div><dt>Propagacja kaskady</dt><dd>
                    {overview.cascadeActive
                      ? `${overview.cascadeAffectedCount} węzłów · wpływ ${overview.cascadeImpact?.toFixed(1)}`
                      : 'Brak aktywnej kaskady'}
                  </dd></div>
                  <div><dt>Rekomendacja</dt><dd>{topRecommendation?.summary ?? 'Brak — uruchom wsparcie decyzyjne'}</dd></div>
                </dl>
              </div>
              <div className="ops-operation__actions">
                <Button variant="primary" onClick={() => state.openIncidentCommand(overview.openIncident!.id)}>
                  Dowództwo incydentu <ArrowRight size={14} />
                </Button>
                {topRecommendation && (
                  <Button variant="outline" size="sm" onClick={() => state.setActiveView('ai')}>
                    Wsparcie decyzyjne
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="ops-panel ops-panel--empty">
            <Shield size={18} className="ops-panel--empty-icon" />
            <p>Brak aktywnego incydentu. Region w stanie monitorowania.</p>
            <Button variant="outline" size="sm" onClick={() => state.setActiveView('incidents')}>
              Uruchom scenariusz
            </Button>
          </div>
        )}
      </section>

      <div className="ops-dashboard__grid">
        {/* SEKCJA 3 — FEED OPERACYJNY */}
        <section className="ops-section ops-section--col">
          <h2 className="ops-section__title">Feed operacyjny</h2>
          <div className="ops-panel">
            <h3 className="ops-subtitle"><AlertTriangle size={12} /> Alerty</h3>
            <ul className="ops-feed">
              {displayAlerts.length === 0 ? (
                <li className="ops-feed__empty">Brak aktywnych alertów</li>
              ) : displayAlerts.map(alert => (
                <li key={alert.id} className="ops-feed__item">
                  <SeverityBadge severity={alert.severity} />
                  <span className="ops-feed__text">{alert.title}</span>
                  <span className="ops-feed__time">{formatTimeAgo(alert.timestamp)}</span>
                </li>
              ))}
            </ul>

            <h3 className="ops-subtitle"><Radio size={12} /> Misje dronów</h3>
            <ul className="ops-feed">
              {activeMissions.length === 0 ? (
                <li className="ops-feed__empty">Brak aktywnych misji</li>
              ) : activeMissions.map(m => (
                <li key={m.id} className="ops-feed__item">
                  <Badge variant="cyan">{m.type}</Badge>
                  <span className="ops-feed__text">{m.targetObjectId.toUpperCase()}</span>
                  <span className="ops-feed__time">{m.status}</span>
                </li>
              ))}
            </ul>

            <h3 className="ops-subtitle"><Activity size={12} /> Obiekty obniżone</h3>
            <ul className="ops-feed">
              {degradedObjects.length === 0 ? (
                <li className="ops-feed__empty">Wszystkie obiekty nominalne</li>
              ) : degradedObjects.map(obj => (
                <li key={obj.id} className="ops-feed__item">
                  <span className="ops-feed__dot" style={{ background: statusColor(obj.status) }} />
                  <span className="ops-feed__text">{obj.shortName} — {obj.name}</span>
                  <span className="ops-feed__time">{obj.status}</span>
                </li>
              ))}
            </ul>

            <h3 className="ops-subtitle"><Database size={12} /> Ostatnie działania</h3>
            <ul className="ops-feed">
              {recentAudit.map(entry => (
                <li key={entry.id} className="ops-feed__item ops-feed__item--audit">
                  <span className="ops-feed__text">{entry.details.slice(0, 72)}</span>
                  <span className="ops-feed__time">{formatTimeAgo(entry.timestamp)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* SEKCJA 4 — SYTUACJA PRZESTRZENNA */}
        <section className="ops-section ops-section--col">
          <h2 className="ops-section__title">Sytuacja przestrzenna</h2>
          <div className="ops-panel">
            <SpatialPreview
              objects={state.ikObjects}
              affectedIds={affectedIds}
              onOpenMap={() => state.setActiveView('map')}
              onOpenGraph={() => state.setActiveView('graph')}
            />
            {overview.cascadeActive && state.cascadeResult && (
              <div className="ops-cascade-summary">
                <span>Kaskada BFS · {state.cascadeResult.affectedCount} węzłów</span>
                <span>Maks. T+{state.cascadeResult.timelineMinutes} min</span>
                <span>Wpływ {state.cascadeResult.totalImpactScore.toFixed(1)}/100</span>
              </div>
            )}
          </div>
        </section>

        {/* SEKCJA 5 — ZDROWIE SYSTEMU */}
        <section className="ops-section ops-section--col">
          <h2 className="ops-section__title">Zdrowie systemu</h2>
          <div className="ops-panel">
            <div className="ops-health-grid">
              {state.publicDataSources.filter(s => !s.isMock).slice(0, 5).map(source => (
                <SourceRow key={source.sourceId} source={source} />
              ))}
            </div>
            <div className="ops-health-meta">
              <span>Kolejka synchronizacji: {overview.syncQueueLength}</span>
              <span>Drony gotowe: {overview.availableDroneCount}/{state.drones.length}</span>
              <span>Baza lokalna: {state.systemHealth.localDbStatus === 'healthy' ? 'OK' : 'Uwaga'}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
