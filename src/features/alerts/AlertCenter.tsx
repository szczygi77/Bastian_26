import { useState, useEffect } from 'react'
import { Bell, Check, ArrowUpRight, X, Download, Filter, AlertTriangle } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { logAction } from '@/services/auditLogService'
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

export function AlertCenter() {
  const { alerts, updateAlert, operator, mode, addAuditEntry, focusedIkObjectId, setFocusedIkObjectId, openIncidentCommand } = useAppStore()
  const { toast } = useToast()
  const [selected, setSelected] = useState<AlertType | null>(null)
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
          ) : (
            filtered.map(alert => (
              <IncidentRow
                key={alert.id}
                id={alert.id.slice(-8).toUpperCase()}
                title={alert.title}
                severity={alert.severity === 'info' ? 'info' : alert.severity as 'critical' | 'high' | 'medium'}
                time={formatTimeAgo(alert.timestamp)}
                selected={selected?.id === alert.id}
                onClick={() => setSelected(alert)}
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
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={selected.severity} />
                  <StatusBadge status={selected.status} />
                  <Badge variant="muted">{selected.source.replace(/_/g, ' ')}</Badge>
                  <Badge variant="muted">CONFIDENCE: {selected.confidence}%</Badge>
                </div>
              </div>
            </div>

            <Card>
              <p className="text-[12px] font-mono text-[#94A3B8] leading-relaxed">{selected.description}</p>
              <div className="mt-3 text-[10px] font-mono text-[#66778B]">
                {formatTimestamp(selected.timestamp)}
              </div>
            </Card>

            {selected.affectedNodes.length > 0 && (
              <Card label="AFFECTED OBJECTS">
                <div className="flex flex-wrap gap-2">
                  {selected.affectedNodes.map(id => (
                    <Badge key={id} variant="orange">{id.toUpperCase()}</Badge>
                  ))}
                </div>
              </Card>
            )}

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
