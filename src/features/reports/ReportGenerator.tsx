import { useState } from 'react'
import {
  FileOutput, Download, Eye,
  AlertTriangle, GitBranch, ArrowUpFromLine, Plane, Scale, Database, Shield,
  type LucideIcon,
} from 'lucide-react'
import { useAuditState, useIncidentState, usePublicDataState } from '@/store/selectors'
import { useAppStore } from '@/store/useAppStore'
import { generateReport, renderReportHTML } from '@/services/reportGenerator'
import { logAction } from '@/services/auditLogService'
import { formatTimestamp } from '@/utils/format'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { PageSplit, PageSplitSidebar, PageSplitMain } from '@/components/layout/PageShell'
import type { ReportType, ReportDefinition } from '@/types'

const REPORT_TYPES: { type: ReportType; label: string; desc: string; icon: LucideIcon }[] = [
  { type: 'incident', label: 'INCIDENT REPORT', desc: 'Raport incydentu z timeline, containment i decyzjami operatora', icon: AlertTriangle },
  { type: 'cascade_evidence', label: 'CASCADE EVIDENCE', desc: 'Dowód deterministycznej kaskady — hash, T+ timeline, propagation path', icon: Shield },
  { type: 'cascade', label: 'CASCADE ANALYSIS', desc: 'Pełna analiza kaskady BFS z drzewem propagacji', icon: GitBranch },
  { type: 'public_data', label: 'PUBLIC API EVIDENCE', desc: 'Status źródeł LIVE/CACHED/MISSING_KEY — bez fałszywego LIVE', icon: Database },
  { type: 'audit_export', label: 'AUDIT EXPORT', desc: 'Łańcuch hash audytu — evidence-grade export', icon: Scale },
  { type: 'escalation', label: 'ESCALATION REPORT', desc: 'Raport eskalacji z listą alertów i działaniami', icon: ArrowUpFromLine },
  { type: 'drone_mission', label: 'DRONE MISSION LOG', desc: 'Raport misji SkyMarshal — koordynacja, nie sterowanie', icon: Plane },
  { type: 'compliance', label: 'COMPLIANCE SNAPSHOT', desc: 'Status zgodności NIS2 / EU AI Act', icon: Scale },
]

export function ReportGenerator() {
  const { cascadeResult, alerts, missions, ikObjects, containmentResult } = useAppStore()
  const { operator, mode, addAuditEntry, auditEntries } = useAuditState()
  const { incidents, activeIncidentId } = useIncidentState()
  const { publicDataSources } = usePublicDataState()
  const activeIncident = incidents.find(i => i.id === activeIncidentId || i.status === 'open')
  const [selectedType, setSelectedType] = useState<ReportType>('incident')
  const [generatedReport, setGeneratedReport] = useState<ReportDefinition | null>(null)
  const [preview, setPreview] = useState(false)
  const [generating, setGenerating] = useState(false)

  async function handleGenerate() {
    setGenerating(true)
    await new Promise(r => setTimeout(r, 500))

    const report = generateReport({
      type: selectedType,
      cascade: cascadeResult ?? undefined,
      alerts,
      missions,
      objects: ikObjects,
      operator: operator?.name ?? 'OPERATOR',
      incident: activeIncident ?? undefined,
      auditEntries,
      publicDataSources,
      containment: containmentResult,
    })
    setGeneratedReport(report)
    setGenerating(false)

    const entry = logAction({
      operator: operator?.name ?? 'OPERATOR',
      action: 'report_export',
      details: `Wygenerowano raport: ${report.type} (ID: ${report.id})`,
      mode,
    })
    addAuditEntry(entry)
  }

  function downloadJSON() {
    if (!generatedReport) return
    const blob = new Blob([JSON.stringify(generatedReport.content, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `bastion-report-${generatedReport.id}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  function downloadHTML() {
    if (!generatedReport) return
    const html = renderReportHTML(generatedReport)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `bastion-report-${generatedReport.id}.html`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <PageSplit>
      <PageSplitSidebar>
        <div className="flex items-center gap-2">
          <FileOutput size={14} className="text-[#00E5FF]" />
          <span className="text-[12px] font-mono font-bold uppercase tracking-wider text-[#E6EDF3]">REPORT GENERATOR</span>
        </div>

        <div className="ui-list">
          {REPORT_TYPES.map(({ type, label, desc, icon: Icon }) => (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedType(type)}
              className={`ui-list-item ${selectedType === type ? 'is-selected' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0 bg-[#00E5FF]/10 border border-[#00E5FF]/20">
                  <Icon size={15} className="text-[#00E5FF]" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-mono font-medium text-[#E6EDF3]">{label}</div>
                  <div className="text-[10px] font-mono text-[#66778B] mt-1 leading-relaxed">{desc}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        <Button
          variant="primary"
          className="w-full mt-auto"
          loading={generating}
          onClick={handleGenerate}
        >
          GENERATE REPORT
        </Button>
      </PageSplitSidebar>

      <PageSplitMain>
        {!generatedReport ? (
          <div className="flex items-center justify-center flex-1 text-center text-[#66778B] font-mono">
            <div>
              <FileOutput size={32} className="mx-auto mb-3 opacity-20" />
              <div className="text-[13px]">Wybierz typ raportu i kliknij Generate</div>
              {!cascadeResult && <div className="text-[11px] mt-1 text-[#66778B]">Uruchom scenariusz aby mieć dane do raportu</div>}
            </div>
          </div>
        ) : (
          <div className="ui-stack" style={{ flex: 1 }}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-[14px] font-mono font-bold text-[#E6EDF3]">{generatedReport.title}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="muted">ID: {generatedReport.id}</Badge>
                  <Badge variant="cyan">{generatedReport.type.toUpperCase()}</Badge>
                  <span className="text-[10px] font-mono text-[#66778B]">
                    {formatTimestamp(generatedReport.generatedAt)} · {generatedReport.generatedBy}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="secondary" size="sm" onClick={() => setPreview(!preview)}>
                  <Eye size={11} /> {preview ? 'RAW JSON' : 'HTML PREVIEW'}
                </Button>
                <Button variant="secondary" size="sm" onClick={downloadJSON}>
                  <Download size={11} /> JSON
                </Button>
                <Button variant="primary" size="sm" onClick={downloadHTML}>
                  <Download size={11} /> HTML
                </Button>
              </div>
            </div>

            {preview ? (
              <div
                className="rounded-[14px] overflow-auto flex-1"
                dangerouslySetInnerHTML={{ __html: renderReportHTML(generatedReport) }}
              />
            ) : (
              <Card>
                <pre className="text-[11px] font-mono text-[#94A3B8] overflow-auto max-h-[60vh] whitespace-pre-wrap">
                  {JSON.stringify(generatedReport.content, null, 2)}
                </pre>
              </Card>
            )}
          </div>
        )}
      </PageSplitMain>
    </PageSplit>
  )
}
