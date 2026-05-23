import { useState } from 'react'
import { Bell, Check, ArrowUpRight, UserCheck, X, Download } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { logAction } from '@/services/auditLogService'
import { formatTimestamp, formatTimeAgo } from '@/utils/format'
import { Button } from '@/components/ui/Button'
import { Badge, SeverityBadge, StatusBadge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import type { Alert } from '@/types'

const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }

export function AlertCenter() {
  const { alerts, updateAlert, operator, mode, addAuditEntry } = useAppStore()
  const [selected, setSelected] = useState<Alert | null>(null)
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [escalateModal, setEscalateModal] = useState(false)
  const [assignModal, setAssignModal] = useState(false)

  const filtered = alerts
    .filter(a => filterSeverity === 'all' || a.severity === filterSeverity)
    .filter(a => filterStatus === 'all' || a.status === filterStatus)
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])

  function acknowledge(alert: Alert) {
    updateAlert(alert.id, { status: 'acknowledged', acknowledgedAt: new Date() })
    const entry = logAction({ operator: operator?.name ?? 'OPERATOR', action: 'alert_acknowledge', details: `Potwierdzono alert: ${alert.title}`, alertId: alert.id, mode })
    addAuditEntry(entry)
    if (selected?.id === alert.id) setSelected({ ...alert, status: 'acknowledged' })
  }

  function escalate(alert: Alert) {
    updateAlert(alert.id, { status: 'escalated', escalatedAt: new Date() })
    const entry = logAction({ operator: operator?.name ?? 'OPERATOR', action: 'alert_escalate', details: `Eskalowano alert: ${alert.title}`, alertId: alert.id, mode })
    addAuditEntry(entry)
    setEscalateModal(false)
    if (selected?.id === alert.id) setSelected({ ...alert, status: 'escalated' })
  }

  function resolve(alert: Alert) {
    updateAlert(alert.id, { status: 'resolved', resolvedAt: new Date() })
    const entry = logAction({ operator: operator?.name ?? 'OPERATOR', action: 'alert_resolve', details: `Zamknięto alert: ${alert.title}`, alertId: alert.id, mode })
    addAuditEntry(entry)
    if (selected?.id === alert.id) setSelected({ ...alert, status: 'resolved' })
  }

  function exportAlert(alert: Alert) {
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
    <div className="h-full flex overflow-hidden">
      {/* Alert list */}
      <div className="w-96 flex-shrink-0 glass-strong border-r border-white/[0.06] flex flex-col">
        {/* Header + filters */}
        <div className="p-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-[#00E5FF]" />
              <span className="text-[12px] font-mono font-bold uppercase tracking-wider text-[#E6EDF3]">
                ALERT CENTER
              </span>
              {criticalCount > 0 && (
                <Badge variant="danger" dot pulse>{criticalCount} CRITICAL</Badge>
              )}
            </div>
            <span className="text-[10px] font-mono text-[#66778B]">{alerts.length} total</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {['all', 'critical', 'high', 'medium', 'low'].map(s => (
              <button
                key={s}
                onClick={() => setFilterSeverity(s)}
                className={`text-[10px] font-mono uppercase px-2 py-1 rounded-[8px] transition-all ${
                  filterSeverity === s
                    ? 'bg-[rgba(255,138,31,0.10)] text-[#FF8A1F] border border-[rgba(255,138,31,0.30)]'
                    : 'text-[#66778B] border border-white/[0.06] hover:border-white/10'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-2 flex-wrap">
            {['all', 'active', 'acknowledged', 'escalated', 'resolved'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`text-[10px] font-mono uppercase px-2 py-1 rounded-[8px] transition-all ${
                  filterStatus === s ? 'bg-white/10 text-[#E6EDF3] border border-white/20' : 'text-[#66778B] border border-white/[0.06] hover:border-white/10'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Alert list */}
        <div className="flex-1 overflow-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-[#66778B] font-mono text-[11px]">
              <Check size={20} className="mb-2 opacity-40" />
              Brak alertów
            </div>
          ) : (
            filtered.map(alert => (
              <button
                key={alert.id}
                onClick={() => setSelected(alert)}
                className={`w-full text-left p-3 rounded-[14px] border transition-all duration-150 ${
                  selected?.id === alert.id
                    ? 'bg-[rgba(255,138,31,0.07)] border-[rgba(255,138,31,0.25)]'
                    : 'border-white/[0.04] hover:border-white/10 hover:bg-white/[0.02]'
                } ${alert.severity === 'critical' && alert.status === 'active' ? 'animate-pulse-danger border-[#EF4444]/25' : ''}`}
              >
                <div className="flex items-start gap-2 mb-1.5">
                  <SeverityBadge severity={alert.severity} />
                  <StatusBadge status={alert.status} />
                </div>
                <div className="text-[11px] font-mono text-[#E6EDF3] mb-1 line-clamp-2">{alert.title}</div>
                <div className="text-[10px] font-mono text-[#66778B]">
                  {formatTimeAgo(alert.timestamp)} · {alert.source.replace(/_/g, ' ')}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detail */}
      <div className="flex-1 overflow-auto p-6">
        {!selected ? (
          <div className="flex items-center justify-center h-full text-center text-[#66778B] font-mono">
            <div>
              <Bell size={32} className="mx-auto mb-3 opacity-20" />
              <div className="text-[13px]">Wybierz alert z listy</div>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl space-y-5">
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

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {selected.status === 'active' && (
                <Button variant="primary" size="sm" onClick={() => acknowledge(selected)}>
                  <Check size={12} /> ACKNOWLEDGE
                </Button>
              )}
              {(selected.status === 'active' || selected.status === 'acknowledged') && (
                <Button variant="danger" size="sm" onClick={() => setEscalateModal(true)}>
                  <ArrowUpRight size={12} /> ESCALATE
                </Button>
              )}
              {selected.status !== 'resolved' && (
                <Button variant="secondary" size="sm" onClick={() => resolve(selected)}>
                  <X size={12} /> RESOLVE
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => exportAlert(selected)}>
                <Download size={12} /> EXPORT
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
            <Button variant="secondary" onClick={() => setEscalateModal(false)}>ANULUJ</Button>
            <Button variant="danger" onClick={() => selected && escalate(selected)}>
              <ArrowUpRight size={12} /> POTWIERDŹ ESKALACJĘ
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
