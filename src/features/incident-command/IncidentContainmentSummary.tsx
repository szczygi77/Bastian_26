import { Shield } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { ContainmentSimulationResult } from '@/types'

export function IncidentContainmentSummary({
  result,
}: {
  result: ContainmentSimulationResult
}) {
  return (
    <Card label="CONTAINMENT SIMULATION" accent="green" noPad>
      <div className="icm-containment">
        <div className="icm-containment__row">
          <Shield size={14} className="text-[#22C55E]" />
          <span>Impact reduction</span>
          <strong>-{result.impactReduction.toFixed(1)}</strong>
        </div>
        <div className="icm-containment__row">
          <span>Nodes prevented</span>
          <strong>{result.preventedNodeIds.length}</strong>
        </div>
        <div className="icm-containment__row">
          <span>Time saved</span>
          <strong>{result.timeSavedMinutes} min</strong>
        </div>
        <div className="icm-containment__row">
          <span>Residual risk</span>
          <Badge variant={result.residualRisk >= 60 ? 'danger' : 'orange'}>{result.residualRisk.toFixed(0)}/100</Badge>
        </div>
        {result.containedNodeIds.length > 0 && (
          <div className="icm-containment__nodes">
            Contained: {result.containedNodeIds.map(id => id.toUpperCase()).join(', ')}
          </div>
        )}
      </div>
    </Card>
  )
}
