import { useState } from 'react'
import { FileText, Download, Filter, Search } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { exportAuditLog, exportSignedAuditJson } from '@/services/auditLogService'
import { formatTimestamp } from '@/utils/format'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { Input } from '@/components/ui/Input'
import { FilterPills } from '@/components/ui/FilterPills'
import { PageShell } from '@/components/layout/PageShell'
import type { AuditAction } from '@/types'

const ACTION_LABELS: Record<AuditAction, string> = {
  login: 'LOGOWANIE',
  logout: 'WYLOGOWANIE',
  scenario_start: 'START SCENARIUSZA',
  scenario_abort: 'PRZERWANIE SCENARIUSZA',
  cascade_generated: 'GENERACJA KASKADY',
  containment_executed: 'WYKONANIE CONTAINMENT',
  alert_acknowledge: 'POTWIERDZENIE ALERTU',
  alert_escalate: 'ESKALACJA ALERTU',
  alert_resolve: 'ZAMKNIĘCIE ALERTU',
  alert_assign: 'PRZYPISANIE ALERTU',
  drone_assign: 'PRZYPISANIE DRONA',
  drone_dispatch: 'ZADYSPONOWANIE DRONA',
  mode_change: 'ZMIANA TRYBU',
  report_export: 'EKSPORT RAPORTU',
  recommendation_approve: 'ZATWIERDZENIE REKOMENDACJI',
  recommendation_reject: 'ODRZUCENIE REKOMENDACJI',
  incident_contain: 'OPANOWANIE INCYDENTU',
  incident_resolve: 'ZAMKNIĘCIE INCYDENTU',
  incident_handover: 'PRZEKAZANIE ZMIANY',
  system_config: 'KONFIGURACJA SYSTEMU',
  data_sync: 'SYNCHRONIZACJA DANYCH',
}

export function AuditLog() {
  const { auditEntries } = useAppStore()
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [filterMode, setFilterMode] = useState<string>('all')
  const [searchText, setSearchText] = useState('')

  const filtered = auditEntries.filter(e => {
    if (filterSeverity !== 'all' && e.severity !== filterSeverity) return false
    if (filterMode !== 'all' && e.mode !== filterMode) return false
    if (searchText && !e.details.toLowerCase().includes(searchText.toLowerCase()) && !e.operator.toLowerCase().includes(searchText.toLowerCase())) return false
    return true
  })

  function handleExport(format: 'json' | 'csv') {
    const data = exportAuditLog(format)
    const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bastion-audit-${Date.now()}.${format}`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleSignedExport() {
    const data = exportSignedAuditJson()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bastion-audit-signed-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const severityColors = { info: 'text-[#94A3B8]', warning: 'text-[#F59E0B]', critical: 'text-[#EF4444]' }

  return (
    <PageShell fixed>
      <PageHeader
        title="Audit Log"
        subtitle={`Immutable-style log · ${auditEntries.length} wpisów · Retencja 5 lat (wymóg KSC)`}
        icon={FileText}
        actions={
          <>
            <Button variant="glass" size="sm" onClick={() => handleExport('csv')}>
              <Download size={11} /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('json')}>
              <Download size={11} /> JSON
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignedExport}>
              <Download size={11} /> Signed JSON
            </Button>
          </>
        }
      />

      <Card>
        <div className="ui-filter-bar">
          <Filter size={12} style={{ color: '#66778B', flexShrink: 0 }} />
          <FilterPills
            options={['all', 'info', 'warning', 'critical'].map(s => ({ value: s, label: s }))}
            value={filterSeverity}
            onChange={setFilterSeverity}
          />
          <FilterPills
            options={['all', 'live', 'simulation'].map(m => ({ value: m, label: m }))}
            value={filterMode}
            onChange={setFilterMode}
          />
          <Input
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="Szukaj operatora lub szczegółów..."
            style={{ flex: 1, minWidth: 180 }}
            icon={<Search size={14} />}
          />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#66778B', flexShrink: 0 }}>{filtered.length} wyników</span>
        </div>
      </Card>

      <div className="ui-table-panel">
        <table className="ui-table">
          <thead>
            <tr>
              {['SEQ', 'TIMESTAMP', 'OPERATOR', 'ACTION', 'SEVERITY', 'MODE', 'CHAIN', 'DETAILS'].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-[11px] font-mono text-[#66778B]">
                  Brak wpisów
                </td>
              </tr>
            ) : (
              filtered.map((entry, i) => (
                <tr
                  key={entry.id}
                  className={i % 2 === 0 ? '' : 'bg-white/[0.01]'}
                >
                  <td className="text-[10px] font-mono text-[#66778B]">{entry.sequenceId}</td>
                  <td className="text-[10px] font-mono text-[#66778B] whitespace-nowrap">
                    {formatTimestamp(entry.timestamp)}
                  </td>
                  <td className="text-[11px] font-mono text-[#94A3B8]">{entry.operator}</td>
                  <td>
                    <Badge variant="muted">{ACTION_LABELS[entry.action] ?? entry.action}</Badge>
                  </td>
                  <td>
                    <span className={`text-[10px] font-mono font-medium uppercase ${severityColors[entry.severity]}`}>
                      {entry.severity}
                    </span>
                  </td>
                  <td>
                    <Badge variant={entry.mode === 'simulation' ? 'orange' : 'green'}>
                      {entry.mode}
                    </Badge>
                  </td>
                  <td className="text-[10px] font-mono text-[#66778B]">
                    {entry.chainHash ?? entry.exportHash ?? '—'}
                  </td>
                  <td className="text-[11px] font-mono text-[#94A3B8] max-w-xs truncate">
                    {entry.details}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </PageShell>
  )
}
