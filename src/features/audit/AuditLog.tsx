import { useState } from 'react'
import { FileText, Download, Filter } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { exportAuditLog } from '@/services/auditLogService'
import { formatTimestamp } from '@/utils/format'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import type { AuditAction } from '@/types'

const ACTION_LABELS: Record<AuditAction, string> = {
  login: 'LOGOWANIE',
  logout: 'WYLOGOWANIE',
  scenario_start: 'START SCENARIUSZA',
  scenario_abort: 'PRZERWANIE SCENARIUSZA',
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

  const severityColors = { info: 'text-[#94A3B8]', warning: 'text-[#F59E0B]', critical: 'text-[#EF4444]' }

  return (
    <div className="h-full flex flex-col overflow-hidden p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <FileText size={16} className="text-[#00E5FF]" />
          <div>
            <h1 className="text-[13px] font-mono font-bold uppercase tracking-[0.15em] text-[#E6EDF3]">AUDIT LOG</h1>
            <p className="text-[11px] font-mono text-[#66778B]">Immutable-style log · {auditEntries.length} wpisów · Retencja 5 lat (wymóg KSC)</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => handleExport('csv')}>
            <Download size={11} /> CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleExport('json')}>
            <Download size={11} /> JSON
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="flex-shrink-0">
        <div className="flex items-center gap-4 flex-wrap">
          <Filter size={12} className="text-[#66778B]" />
          <div className="flex gap-1">
            {['all', 'info', 'warning', 'critical'].map(s => (
              <button key={s} onClick={() => setFilterSeverity(s)}
                className={`text-[10px] font-mono uppercase px-2 py-1 rounded-[8px] transition-all ${filterSeverity === s ? 'bg-white/10 text-[#E6EDF3]' : 'text-[#66778B] hover:text-[#94A3B8]'}`}>
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {['all', 'live', 'simulation'].map(m => (
              <button key={m} onClick={() => setFilterMode(m)}
                className={`text-[10px] font-mono uppercase px-2 py-1 rounded-[8px] transition-all ${filterMode === m ? 'bg-white/10 text-[#E6EDF3]' : 'text-[#66778B] hover:text-[#94A3B8]'}`}>
                {m}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="Szukaj operatora lub szczegółów..."
            className="flex-1 min-w-40 bg-white/[0.04] border border-white/10 rounded-[14px] px-3 py-1.5 text-[11px] font-mono text-[#E6EDF3] placeholder-[#66778B] focus:outline-none focus:border-[#00E5FF]/30"
          />
          <span className="text-[10px] font-mono text-[#66778B]">{filtered.length} wyników</span>
        </div>
      </Card>

      {/* Table */}
      <div className="flex-1 overflow-auto glass rounded-[14px]">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-[#0B1117] border-b border-white/[0.06]">
            <tr>
              {['TIMESTAMP', 'OPERATOR', 'ACTION', 'SEVERITY', 'MODE', 'HASH', 'DETAILS'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[10px] font-mono font-medium uppercase tracking-wider text-[#66778B]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-[11px] font-mono text-[#66778B]">
                  Brak wpisów
                </td>
              </tr>
            ) : (
              filtered.map((entry, i) => (
                <tr
                  key={entry.id}
                  className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}
                >
                  <td className="px-4 py-2.5 text-[10px] font-mono text-[#66778B] whitespace-nowrap">
                    {formatTimestamp(entry.timestamp)}
                  </td>
                  <td className="px-4 py-2.5 text-[11px] font-mono text-[#94A3B8]">{entry.operator}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant="muted">{ACTION_LABELS[entry.action] ?? entry.action}</Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[10px] font-mono font-medium uppercase ${severityColors[entry.severity]}`}>
                      {entry.severity}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant={entry.mode === 'simulation' ? 'orange' : 'green'}>
                      {entry.mode}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-[10px] font-mono text-[#66778B]">
                    {entry.exportHash ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 text-[11px] font-mono text-[#94A3B8] max-w-xs truncate">
                    {entry.details}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
