import { useState, useEffect, useMemo } from 'react'
import { Bell, Check, ArrowUpRight, X, Download, Filter, AlertTriangle, Layers, List, ExternalLink } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { logAction } from '@/services/auditLogService'
import { groupAlertsByIncident, alertKindLabel, type AlertGroup } from '@/services/alertGrouping'
import { formatTimestamp, formatTimeAgo } from '@/utils/format'
import { Button } from '@/components/ui/Button'
import { Badge, SeverityBadge, StatusBadge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { FilterPills } from '@/components/ui/FilterPills'
import { IncidentRow } from '@/components/ui/IncidentRow'
import { Alert } from '@/components/ui/Alert'
import { useToast } from '@/components/ui/Toast'
import type { Alert as AlertType } from '@/types'

const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }

const SOURCE_STATUS_VARIANT: Record<string, 'green' | 'warning' | 'danger' | 'muted' | 'orange' | 'cyan'> = {
  live: 'green',
  cached: 'cyan',
  stale: 'orange',
  offline: 'muted',
  error: 'danger',
  missing_key: 'warning',
  mock: 'muted',
}

export function AlertCenter() {
  const {
    alerts, updateAlert, operator, mode, addAuditEntry, focusedIkObjectId, setFocusedIkObjectId,
    openIncidentCommand, incidents, publicDataSources,
  } = useAppStore()
  const { toast } = useToast()
  const [selected, setSelected] = useState<AlertType | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<AlertGroup | null>(null)
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped')
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [objectFilter, setObjectFilter] = useState<string | null>(null)
  const [escalateModal, setEscalateModal] = useState(false)

  useEffect(() => {
    if (!focusedIkObjectId) return
    setObjectFilter(focusedIkObjectId)
    setFocusedIkObjectId(null)
  }, [focusedIkObjectId, setFocusedIkObjectId])

  const filtered = alerts
    .filter(a => filterSeverity === 'all' || a.severity === filterSeverity)
    .filter(a => filterStatus === 'all' || a.status === filterStatus)
    .filter(a => !objectFilter || a.affectedNodes.includes(objectFilter))
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])

  const groups = useMemo(
    () => groupAlertsByIncident(filtered, incidents),
    [filtered, incidents],
  )

  function selectAlert(alert: AlertType, group?: AlertGroup | null) {
    setSelected(alert)
    setSelectedGroup(group ?? groups.find(g => g.alerts.some(a => a.id === alert.id)) ?? null)
  }

  function selectGroup(group: AlertGroup) {
    setSelectedGroup(group)
    setSelected(group.rootAlert)
  }

  const activeGroup = selectedGroup ?? (selected ? groups.find(g => g.alerts.some(a => a.id === selected.id)) ?? null : null)
  const affectedPath = activeGroup
    ? [...new Set(activeGroup.alerts.flatMap(a => a.affectedNodes))]
    : selected?.affectedNodes ?? []

  const escalationTrail = activeGroup
    ? [...activeGroup.alerts]
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        .map(a => ({
          id: a.id,
          title: a.title,
          status: a.status,
          severity: a.severity,
          timestamp: a.timestamp,
          escalatedAt: a.escalatedAt,
          acknowledgedAt: a.acknowledgedAt,
        }))
    : selected
      ? [{
          id: selected.id,
          title: selected.title,
          status: selected.status,
          severity: selected.severity,
          timestamp: selected.timestamp,
          escalatedAt: selected.escalatedAt,
          acknowledgedAt: selected.acknowledgedAt,
        }]
      : []

  function acknowledge(alert: AlertType) {
    updateAlert(alert.id, { status: 'acknowledged', acknowledgedAt: new Date() })
    const entry = logAction({ operator: operator?.name ?? 'OPERATOR', action: 'alert_acknowledge', details: `Potwierdzono alert: ${alert.title}`, alertId: alert.id, mode })
    addAuditEntry(entry)
    toast({ title: 'Alert potwierdzony', description: alert.title, variant: 'success' })
    if (selected?.id === alert.id) setSelected({ ...alert, status: 'acknowledged' })
  }

  function escalate(alert: AlertType) {
    updateAlert(alert.id, { status: 'escalated', escalatedAt: new Date() })
    const entry = logAction({ operator: operator?.name ?? 'OPERATOR', action: 'alert_escalate', details: `Eskalowano alert: ${alert.title}`, alertId: alert.id, mode })
    addAuditEntry(entry)
    toast({ title: 'Alert eskalowany', description: alert.title, variant: 'warning' })
    setEscalateModal(false)
    if (selected?.id === alert.id) setSelected({ ...alert, status: 'escalated' })
  }

  function resolve(alert: AlertType) {
    updateAlert(alert.id, { status: 'resolved', resolvedAt: new Date() })
    const entry = logAction({ operator: operator?.name ?? 'OPERATOR', action: 'alert_resolve', details: `Zamknięto alert: ${alert.title}`, alertId: alert.id, mode })
    addAuditEntry(entry)
    toast({ title: 'Alert zamknięty', description: alert.title, variant: 'default' })
    if (selected?.id === alert.id) setSelected({ ...alert, status: 'resolved' })
  }

  function exportAlert(alert: AlertType) {
    const data = JSON.stringify(alert, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bastion-alert-${alert.id}.json`
    a.click()
    URL.revokeObjectURL(url)
    const entry = logAction({ operator: operator?.name ?? 'OPERATOR', action: 'report_export', details: `Wyeksportowano alert: ${alert.id}`, alertId: alert.id, mode })
    addAuditEntry(entry)
  }

  const criticalCount = alerts.filter(a => a.status === 'active' && a.severity === 'critical').length

  return (
    <div style={{ height: '100%', display: 'flex', overflow: 'hidden' }}>
      <div className="glass-strong" style={{
        width: 384, flexShrink: 0, display: 'flex', flexDirection: 'column',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell size={14} style={{ color: '#00E5FF' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#E6EDF3' }}>
                ALERT CENTER
              </span>
              {criticalCount > 0 && <Badge variant="critical" dot pulse>{criticalCount} CRITICAL</Badge>}
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#66778B' }}>{alerts.length} total</span>
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <button
              type="button"
              onClick={() => setViewMode('grouped')}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '6px 10px', borderRadius: 10, cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10,
                border: viewMode === 'grouped' ? '1px solid rgba(0,229,255,0.35)' : '1px solid rgba(255,255,255,0.06)',
                background: viewMode === 'grouped' ? 'rgba(0,229,255,0.08)' : 'transparent',
                color: viewMode === 'grouped' ? '#00E5FF' : '#66778B',
              }}
            >
              <Layers size={11} /> GRUPOWANE
            </button>
            <button
              type="button"
              onClick={() => setViewMode('flat')}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '6px 10px', borderRadius: 10, cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10,
                border: viewMode === 'flat' ? '1px solid rgba(0,229,255,0.35)' : '1px solid rgba(255,255,255,0.06)',
                background: viewMode === 'flat' ? 'rgba(0,229,255,0.08)' : 'transparent',
                color: viewMode === 'flat' ? '#00E5FF' : '#66778B',
              }}
            >
              <List size={11} /> LISTA
            </button>
          </div>
          <FilterPills
            options={['all', 'critical', 'high', 'medium', 'low'].map(s => ({ value: s, label: s }))}
            value={filterSeverity}
            onChange={setFilterSeverity}
          />
          <div style={{ marginTop: 10 }}>
            <FilterPills
              options={['all', 'active', 'acknowledged', 'escalated', 'resolved'].map(s => ({ value: s, label: s }))}
              value={filterStatus}
              onChange={setFilterStatus}
            />
          </div>
          {objectFilter && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Badge variant="cyan">OBIEKT: {objectFilter}</Badge>
              <button
                type="button"
                onClick={() => setObjectFilter(null)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#66778B',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  cursor: 'pointer',
                }}
              >
                Wyczyść filtr
              </button>
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
          {filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 128, color: '#66778B', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
              <Check size={20} style={{ marginBottom: 8, opacity: 0.4 }} />
              Brak alertów
            </div>
          ) : viewMode === 'grouped' ? (
            groups.map(group => (
              <div key={group.key}>
                <IncidentRow
                  id={group.incidentId?.slice(-8).toUpperCase() ?? group.key.slice(-8).toUpperCase()}
                  title={group.title}
                  severity={group.severity === 'info' ? 'info' : group.severity as 'critical' | 'high' | 'medium'}
                  time={`${group.alerts.length} alertów · ${formatTimeAgo(group.rootAlert.timestamp)}`}
                  selected={selectedGroup?.key === group.key}
                  onClick={() => selectGroup(group)}
                />
              </div>
            ))
          ) : (
            filtered.map(alert => (
              <IncidentRow
                key={alert.id}
                id={alert.id.slice(-8).toUpperCase()}
                title={alert.title}
                severity={alert.severity === 'info' ? 'info' : alert.severity as 'critical' | 'high' | 'medium'}
                time={formatTimeAgo(alert.timestamp)}
                selected={selected?.id === alert.id}
                onClick={() => selectAlert(alert)}
              />
            ))
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
        {!selected ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', color: '#66778B', fontFamily: 'var(--font-mono)' }}>
            <div>
              <Bell size={32} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
              <div style={{ fontSize: 13 }}>Wybierz alert z listy</div>
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {selected.severity === 'critical' && selected.status === 'active' && (
              <Alert
                variant="critical"
                icon={AlertTriangle}
                title={`CRITICAL · ${selected.title}`}
                description={selected.description}
              />
            )}

            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[14px] font-mono font-bold text-[#E6EDF3] mb-2">{selected.title}</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <SeverityBadge severity={selected.severity} />
                  <StatusBadge status={selected.status} />
                  <Badge variant="muted">{alertKindLabel(selected, selected.id === activeGroup?.rootAlert.id)}</Badge>
                  <Badge variant="muted">{selected.source.replace(/_/g, ' ')}</Badge>
                  <Badge variant="muted">CONFIDENCE: {selected.confidence}%</Badge>
                </div>
              </div>
            </div>

            {activeGroup && activeGroup.incidentId && (
              <Card label="ROOT CAUSE · INCIDENT">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-mono text-[#E6EDF3]">{activeGroup.title}</div>
                    <div className="text-[10px] font-mono text-[#66778B] mt-1">ID: {activeGroup.incidentId}</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => openIncidentCommand(activeGroup.incidentId)}>
                    <ExternalLink size={12} /> Incident Command
                  </Button>
                </div>
              </Card>
            )}

            {activeGroup && activeGroup.alerts.length > 1 && (
              <Card label="ALERTY W GRUPIE">
                <div className="space-y-1">
                  {activeGroup.alerts.map(alert => (
                    <button
                      key={alert.id}
                      type="button"
                      onClick={() => selectAlert(alert, activeGroup)}
                      className={`w-full text-left flex items-center justify-between py-2 px-2 rounded-[10px] border transition-colors ${
                        selected.id === alert.id
                          ? 'border-[#00E5FF]/30 bg-[#00E5FF]/5'
                          : 'border-transparent hover:border-white/[0.06]'
                      }`}
                    >
                      <span className="text-[10px] font-mono text-[#94A3B8]">{alert.title}</span>
                      <SeverityBadge severity={alert.severity} />
                    </button>
                  ))}
                </div>
              </Card>
            )}

            <Card>
              <p className="text-[12px] font-mono text-[#94A3B8] leading-relaxed">{selected.description}</p>
              <div className="mt-3 text-[10px] font-mono text-[#66778B]">
                {formatTimestamp(selected.timestamp)}
              </div>
            </Card>

            {affectedPath.length > 0 && (
              <Card label="AFFECTED PATH">
                <div className="flex flex-wrap gap-2">
                  {affectedPath.map(id => (
                    <Badge key={id} variant="orange">{id.toUpperCase()}</Badge>
                  ))}
                </div>
              </Card>
            )}

            <Card label="ESCALATION TRAIL">
              <div className="space-y-2">
                {escalationTrail.map((step, i) => (
                  <div key={step.id} className="flex items-start gap-3 py-1.5 border-b border-white/[0.04] last:border-0">
                    <span className="text-[10px] font-mono text-[#66778B] w-4 flex-shrink-0">{i + 1}.</span>
                    <div className="flex-1">
                      <div className="text-[11px] font-mono text-[#94A3B8]">{step.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusBadge status={step.status} />
                        <span className="text-[10px] font-mono text-[#66778B]">{formatTimestamp(step.timestamp)}</span>
                        {step.escalatedAt && (
                          <Badge variant="danger">ESKALOWANO {formatTimeAgo(step.escalatedAt)}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card label="SOURCE DATA STATUS">
              <div className="flex flex-wrap gap-2">
                {publicDataSources.map(source => (
                  <Badge key={source.sourceId} variant={SOURCE_STATUS_VARIANT[source.status] ?? 'muted'}>
                    {source.sourceName}: {source.status.toUpperCase()}
                  </Badge>
                ))}
              </div>
            </Card>

            <Card label="RECOMMENDED ACTIONS">
              <div className="space-y-2">
                {selected.recommendedActions.map((action, i) => (
                  <div key={i} className="flex items-start gap-3 py-1.5 border-b border-white/[0.04] last:border-0">
                    <span className="text-[10px] font-mono text-[#66778B] w-4 flex-shrink-0">{i + 1}.</span>
                    <span className="text-[11px] font-mono text-[#94A3B8]">{action}</span>
                  </div>
                ))}
              </div>
            </Card>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 4 }}>
              {selected.severity === 'critical' && (
                <Button variant="primary" size="sm" onClick={() => openIncidentCommand(selected.incidentId ?? null)}>
                  <AlertTriangle size={12} /> Incident Command
                </Button>
              )}
              {selected.status === 'active' && (
                <Button variant="success" size="sm" onClick={() => acknowledge(selected)}>
                  <Check size={12} /> Zatwierdź alert
                </Button>
              )}
              {(selected.status === 'active' || selected.status === 'acknowledged') && (
                <Button variant="danger" size="sm" onClick={() => setEscalateModal(true)}>
                  <ArrowUpRight size={12} /> Eskaluj incydent
                </Button>
              )}
              {selected.status !== 'resolved' && (
                <Button variant="outline" size="sm" onClick={() => resolve(selected)}>
                  <X size={12} /> Zamknij
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => exportAlert(selected)}>
                <Download size={12} /> Export
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Escalate modal */}
      <Modal open={escalateModal} onClose={() => setEscalateModal(false)} title="ESCALATE ALERT">
        <div className="space-y-4">
          <p className="text-[12px] font-mono text-[#94A3B8]">
            Eskalacja alertu do wyższego szczebla dowodzenia. Akcja zostanie zalogowana w audit log i raport zostanie wygenerowany.
          </p>
          {selected && <div className="glass rounded-[14px] p-3"><div className="text-[11px] font-mono text-[#E6EDF3]">{selected.title}</div></div>}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setEscalateModal(false)}>Anuluj</Button>
            <Button variant="destructive" onClick={() => selected && escalate(selected)}>
              <ArrowUpRight size={12} /> Potwierdź eskalację
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
