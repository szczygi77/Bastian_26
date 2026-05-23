import { useState } from 'react'
import { FileOutput, Download, Eye } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { generateReport, renderReportHTML } from '@/services/reportGenerator'
import { logAction } from '@/services/auditLogService'
import { formatTimestamp } from '@/utils/format'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import type { ReportType, ReportDefinition } from '@/types'

const REPORT_TYPES: { type: ReportType; label: string; desc: string; icon: string }[] = [
  { type: 'incident', label: 'INCIDENT REPORT', desc: 'Raport incydentu zgodny z formatem CERT Polska / NIS2', icon: '🚨' },
  { type: 'cascade', label: 'CASCADE ANALYSIS', desc: 'Pełna analiza kaskady BFS/DFS z drzewem propagacji', icon: '🔗' },
  { type: 'escalation', label: 'ESCALATION REPORT', desc: 'Raport eskalacji z listą alertów i działaniami', icon: '⬆️' },
  { type: 'drone_mission', label: 'DRONE MISSION LOG', desc: 'Raport misji Skymarshal z adapters info', icon: '🚁' },
  { type: 'compliance', label: 'COMPLIANCE REPORT', desc: 'Status zgodności ze wszystkimi regulacjami', icon: '⚖️' },
]

export function ReportGenerator() {
  const { cascadeResult, alerts, missions, ikObjects, operator, mode, addAuditEntry } = useAppStore()
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
    <div className="h-full flex overflow-hidden">
      {/* Left: type selector */}
      <div className="w-72 flex-shrink-0 glass-strong border-r border-white/[0.06] p-4">
        <div className="flex items-center gap-2 mb-4">
          <FileOutput size={14} className="text-[#00E5FF]" />
          <span className="text-[12px] font-mono font-bold uppercase tracking-wider text-[#E6EDF3]">REPORT GENERATOR</span>
        </div>
        <div className="space-y-2">
          {REPORT_TYPES.map(({ type, label, desc, icon }) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`w-full text-left p-3 rounded-[14px] border transition-all ${
                selectedType === type
                  ? 'bg-[#00E5FF]/8 border-[#00E5FF]/30'
                  : 'border-white/[0.06] hover:border-white/10 hover:bg-white/[0.02]'
              }`}
            >
              <div className="text-[13px] mb-0.5">{icon}</div>
              <div className="text-[11px] font-mono font-medium text-[#E6EDF3]">{label}</div>
              <div className="text-[10px] font-mono text-[#66778B]">{desc}</div>
            </button>
          ))}
        </div>

        <Button
          variant="primary"
          className="w-full mt-4"
          loading={generating}
          onClick={handleGenerate}
        >
          GENERATE REPORT
        </Button>
      </div>

      {/* Right: preview */}
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {!generatedReport ? (
          <div className="flex items-center justify-center h-full text-center text-[#66778B] font-mono">
            <div>
              <FileOutput size={32} className="mx-auto mb-3 opacity-20" />
              <div className="text-[13px]">Wybierz typ raportu i kliknij Generate</div>
              {!cascadeResult && <div className="text-[11px] mt-1 text-[#66778B]">Uruchom scenariusz aby mieć dane do raportu</div>}
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[14px] font-mono font-bold text-[#E6EDF3]">{generatedReport.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="muted">ID: {generatedReport.id}</Badge>
                  <Badge variant="cyan">{generatedReport.type.toUpperCase()}</Badge>
                  <span className="text-[10px] font-mono text-[#66778B]">
                    {formatTimestamp(generatedReport.generatedAt)} · {generatedReport.generatedBy}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
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
                className="rounded-[14px] overflow-auto"
                dangerouslySetInnerHTML={{ __html: renderReportHTML(generatedReport) }}
              />
            ) : (
              <Card>
                <pre className="text-[11px] font-mono text-[#94A3B8] overflow-auto max-h-[60vh] whitespace-pre-wrap">
                  {JSON.stringify(generatedReport.content, null, 2)}
                </pre>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
