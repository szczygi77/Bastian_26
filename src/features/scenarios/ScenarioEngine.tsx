import { useState } from 'react'
import { Play, Square, AlertTriangle, Clock, Zap, ShieldAlert, Flame, Waves, Crosshair, Target, WifiOff, Droplets } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { SCENARIOS } from '@/data/scenarios'
import { runCascadeBFS, getImpactTimeline } from '@/services/cascadeEngine'
import { createAlertFromCascade } from '@/services/alertEngine'
import { generateRecommendation } from '@/services/recommendationEngine'
import { logAction } from '@/services/auditLogService'
import { generateId, formatDuration, severityColor } from '@/utils/format'
import { Button } from '@/components/ui/Button'
import { Badge, SeverityBadge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import type { ScenarioDefinition, ScenarioRun } from '@/types'

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Zap, Shield: ShieldAlert, Droplets, AlertTriangle, WifiOff, Flame, Waves, Crosshair, Target,
}

export function ScenarioEngine() {
  const {
    ikObjects, mode, operator,
    setActiveScenarioRun, setCascadeResult, activeScenarioRun,
    addAlerts, addRecommendation, updateObjectStatus, resetObjectStatuses,
    addAuditEntry,
  } = useAppStore()

  const [running, setRunning] = useState(false)
  const [selectedScenario, setSelectedScenario] = useState<ScenarioDefinition | null>(null)
  const [completedRun, setCompletedRun] = useState<ScenarioRun | null>(null)

  async function launchScenario(scenario: ScenarioDefinition) {
    setRunning(true)

    const run: ScenarioRun = {
      id: `run-${generateId()}`,
      scenarioId: scenario.id,
      startedAt: new Date(),
      status: 'running',
      generatedAlertIds: [],
      operatorId: operator?.id ?? 'anonymous',
      mode,
    }
    setActiveScenarioRun(run)

    // Audit: scenario start
    const auditEntry = logAction({
      operator: operator?.name ?? 'OPERATOR',
      action: 'scenario_start',
      details: `Uruchomiono scenariusz: ${scenario.name} (ID: ${scenario.id})`,
      affectedObject: scenario.triggerObjectId,
      mode,
    })
    addAuditEntry(auditEntry)

    // Set trigger object status
    updateObjectStatus(scenario.triggerObjectId, scenario.initialStatus)
    if (scenario.additionalAffected) {
      for (const id of scenario.additionalAffected) updateObjectStatus(id, 'degraded')
    }

    // Compute cascade (simulated delay for UX)
    await new Promise(r => setTimeout(r, 800))
    const cascadeResult = runCascadeBFS(ikObjects, scenario.triggerObjectId)
    setCascadeResult(cascadeResult)

    // Generate alerts
    const alerts = createAlertFromCascade(cascadeResult, scenario, ikObjects)
    addAlerts(alerts)

    // Generate recommendation
    const rec = generateRecommendation({ cascade: cascadeResult, scenario, objects: ikObjects })
    addRecommendation(rec)

    const completedRunData: ScenarioRun = {
      ...run,
      endedAt: new Date(),
      status: 'completed',
      cascadeResult,
      generatedAlertIds: alerts.map(a => a.id),
    }
    setActiveScenarioRun(completedRunData)
    setCompletedRun(completedRunData)
    setRunning(false)
  }

  function abortScenario() {
    if (!activeScenarioRun) return
    const auditEntry = logAction({
      operator: operator?.name ?? 'OPERATOR',
      action: 'scenario_abort',
      details: `Przerwano scenariusz: ${activeScenarioRun.scenarioId}`,
      mode,
    })
    addAuditEntry(auditEntry)
    resetObjectStatuses()
    setCascadeResult(null)
    setActiveScenarioRun(null)
    setCompletedRun(null)
  }

  const { cascadeResult } = useAppStore()

  return (
    <div className="h-full flex overflow-hidden">
      {/* Scenario list */}
      <div className="w-80 flex-shrink-0 glass-strong border-r border-white/[0.06] overflow-auto p-4">
        <div className="text-[11px] font-mono font-bold uppercase tracking-[0.15em] text-[#66778B] mb-4">
          SCENARIO LIBRARY
        </div>
        <div className="space-y-2">
          {SCENARIOS.map(scenario => {
            const Icon = ICON_MAP[scenario.icon] ?? AlertTriangle
            const isSelected = selectedScenario?.id === scenario.id
            const isActive = activeScenarioRun?.scenarioId === scenario.id
            return (
              <button
                key={scenario.id}
                onClick={() => setSelectedScenario(scenario)}
                className={`w-full text-left p-3 rounded-[14px] border transition-all duration-150 ${
                  isSelected
                    ? 'bg-[#00E5FF]/8 border-[#00E5FF]/30'
                    : 'border-white/[0.06] hover:border-white/10 hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0 ${
                    scenario.severity === 'critical' ? 'bg-[#EF4444]/10' : scenario.severity === 'high' ? 'bg-[#FF8A1F]/10' : 'bg-[#F59E0B]/10'
                  }`}>
                    <Icon size={14} className={scenario.severity === 'critical' ? 'text-[#EF4444]' : scenario.severity === 'high' ? 'text-[#FF8A1F]' : 'text-[#F59E0B]'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-mono font-medium text-[#E6EDF3] truncate">{scenario.name}</div>
                    <SeverityBadge severity={scenario.severity} />
                    {isActive && <Badge variant="cyan" className="ml-1">ACTIVE</Badge>}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Detail panel */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {!selectedScenario ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-[#66778B] font-mono">
              <AlertTriangle size={32} className="mx-auto mb-3 opacity-30" />
              <div className="text-[13px]">Wybierz scenariusz z listy</div>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[15px] font-mono font-bold text-[#E6EDF3] uppercase tracking-wider">
                  {selectedScenario.name}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  <SeverityBadge severity={selectedScenario.severity} />
                  <Badge variant="muted">{selectedScenario.type.replace(/_/g, ' ')}</Badge>
                  <Badge variant="cyan">TRIGGER: {selectedScenario.triggerObjectId.toUpperCase()}</Badge>
                </div>
              </div>
              <div className="flex gap-2">
                {activeScenarioRun?.scenarioId === selectedScenario.id ? (
                  <Button variant="danger" onClick={abortScenario}>
                    <Square size={12} /> ABORT
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    loading={running}
                    onClick={() => launchScenario(selectedScenario)}
                    disabled={running}
                  >
                    <Play size={12} /> LAUNCH SCENARIO
                  </Button>
                )}
              </div>
            </div>

            <Card>
              <p className="text-[12px] font-mono text-[#94A3B8] leading-relaxed">{selectedScenario.description}</p>
            </Card>

            {/* Cascade result */}
            {cascadeResult && completedRun?.scenarioId === selectedScenario.id && (
              <>
                {/* Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <Card accent="danger">
                    <div className="text-[10px] font-mono text-[#66778B] mb-1">AFFECTED OBJECTS</div>
                    <div className="text-2xl font-mono font-bold text-[#EF4444]">{cascadeResult.affectedCount}</div>
                  </Card>
                  <Card accent="danger">
                    <div className="text-[10px] font-mono text-[#66778B] mb-1">CRITICAL</div>
                    <div className="text-2xl font-mono font-bold text-[#EF4444]">{cascadeResult.criticalCount}</div>
                  </Card>
                  <Card accent="orange">
                    <div className="text-[10px] font-mono text-[#66778B] mb-1">IMPACT SCORE</div>
                    <div className="text-2xl font-mono font-bold text-[#FF8A1F]">{cascadeResult.totalImpactScore.toFixed(1)}/100</div>
                  </Card>
                  <Card accent="orange">
                    <div className="text-[10px] font-mono text-[#66778B] mb-1">CASCADE TIME</div>
                    <div className="text-2xl font-mono font-bold text-[#FF8A1F]">{formatDuration(cascadeResult.timelineMinutes)}</div>
                  </Card>
                </div>

                {/* Impact timeline */}
                <Card label="IMPACT TIMELINE (KOLEJNOŚĆ KASKADY)">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 py-2 border-b border-white/[0.06]">
                      <div className="w-16 text-[10px] font-mono text-[#66778B]">T+0min</div>
                      <div className="w-2 h-2 rounded-full bg-[#EF4444] glow-danger" />
                      <div className="text-[11px] font-mono font-bold text-[#EF4444]">{selectedScenario.triggerObjectId.toUpperCase()} — INCYDENT INICJALNY</div>
                    </div>
                    {getImpactTimeline(cascadeResult, ikObjects).map((item, i) => (
                      <div key={i} className="flex items-center gap-3 py-1.5 border-b border-white/[0.04] last:border-0">
                        <div className="w-16 text-[10px] font-mono text-[#F59E0B]">T+{item.time}min</div>
                        <div className={`w-2 h-2 rounded-full flex-shrink-0`} style={{ background: item.severity === 'critical' ? '#EF4444' : item.severity === 'high' ? '#FF8A1F' : '#F59E0B' }} />
                        <div className={`text-[11px] font-mono ${severityColor(item.severity)}`}>{item.name}</div>
                        <SeverityBadge severity={item.severity} />
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Affected object impact bars */}
                <Card label="IMPACT SCORES">
                  <div className="space-y-3">
                    {cascadeResult.nodes.sort((a, b) => b.impactScore - a.impactScore).map(node => {
                      const obj = ikObjects.find(o => o.id === node.objectId)
                      return (
                        <div key={node.objectId}>
                          <div className="flex justify-between mb-1">
                            <span className="text-[11px] font-mono text-[#94A3B8]">{obj?.shortName ?? node.objectId}</span>
                            <span className="text-[11px] font-mono text-[#E6EDF3]">{node.impactScore.toFixed(1)}</span>
                          </div>
                          <ProgressBar
                            value={node.impactScore}
                            variant={node.severity === 'critical' ? 'danger' : node.severity === 'high' ? 'orange' : 'cyan'}
                          />
                        </div>
                      )
                    })}
                  </div>
                </Card>
              </>
            )}

            {/* Running state */}
            {running && (
              <Card accent="orange">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 border-2 border-[#FF8A1F] border-t-transparent rounded-full animate-spin" />
                  <div className="text-[12px] font-mono text-[#FF8A1F]">
                    Obliczanie kaskady BFS/DFS... Proszę czekać.
                  </div>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
