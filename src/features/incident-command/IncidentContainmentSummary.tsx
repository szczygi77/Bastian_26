import { Shield, ArrowDownRight, ArrowUpRight, AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useAppStore } from '@/store/useAppStore'
import type { ContainmentSimulationResult } from '@/types'

export function IncidentContainmentSummary({
  result,
}: {
  result: ContainmentSimulationResult
}) {
  const ikObjects = useAppStore(s => s.ikObjects)
  const preventedNames = result.preventedNodeIds.map(
    id => ikObjects.find(o => o.id === id)?.shortName ?? id.toUpperCase(),
  )

  return (
    <Card label="CONTAINMENT RESULT" accent="green" noPad>
      <div className="icm-containment">
        <div className="icm-containment__compare">
          <div className="icm-containment__compare-col">
            <span className="icm-containment__compare-label">BEFORE</span>
            <strong>{result.beforeAffectedCount} nodes</strong>
            <span className="icm-containment__compare-metric">impact {result.beforeImpact.toFixed(1)}</span>
          </div>
          <ArrowDownRight size={16} className="text-[#22C55E] shrink-0" />
          <div className="icm-containment__compare-col icm-containment__compare-col--after">
            <span className="icm-containment__compare-label">AFTER</span>
            <strong>{result.afterAffectedCount} nodes</strong>
            <span className="icm-containment__compare-metric">impact {result.afterImpact.toFixed(1)}</span>
          </div>
        </div>

        <div className="icm-containment__row">
          <Shield size={14} className="text-[#22C55E]" />
          <span>Impact reduced</span>
          <strong className="text-[#22C55E]">-{result.impactReduction.toFixed(1)}</strong>
        </div>
        <div className="icm-containment__row">
          <span>Time gained</span>
          <strong>{result.timeSavedMinutes} min</strong>
        </div>
        <div className="icm-containment__row">
          <span>Nodes prevented</span>
          <strong>{result.preventedNodeIds.length}</strong>
        </div>
        <div className="icm-containment__row">
          <span>Residual risk</span>
          <Badge variant={result.residualRisk >= 60 ? 'danger' : 'orange'}>{result.residualRisk.toFixed(0)}/100</Badge>
        </div>
        {(result.tradeoffBackupLoadIncrease ?? 0) > 0 && (
          <div className="icm-containment__row icm-containment__row--tradeoff">
            <AlertTriangle size={12} className="text-[#F59E0B]" />
            <span>Tradeoff: backup load</span>
            <strong className="text-[#F59E0B]">+{result.tradeoffBackupLoadIncrease}%</strong>
          </div>
        )}
        {preventedNames.length > 0 && (
          <div className="icm-containment__nodes">
            <span>Prevented: </span>
            {preventedNames.join(', ')}
          </div>
        )}
        {result.containedNodeIds.length > 0 && (
          <div className="icm-containment__nodes icm-containment__nodes--muted">
            <ArrowUpRight size={10} />
            Contained at: {result.containedNodeIds.map(id => id.toUpperCase()).join(', ')}
          </div>
        )}
      </div>
    </Card>
  )
}
