import { memo } from 'react'
import { Cpu } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { Badge } from '@/components/ui/Badge'

export const GraphComputeBar = memo(function GraphComputeBar({ compact = false }: { compact?: boolean }) {
  const { graphComputeState, cascadeReplayIndex, cascadeReplayFrames } = useAppStore()
  const { active, algorithm, visitedNodes, totalNodes, iterationMs, label } = graphComputeState
  const progress = totalNodes > 0 ? Math.round((visitedNodes / totalNodes) * 100) : 0

  return (
    <div className={`graph-compute-bar ${compact ? 'graph-compute-bar--compact' : ''}`}>
      <div className="graph-compute-bar__left">
        <Cpu size={12} className={active ? 'graph-compute-bar__spin' : ''} />
        <span className="graph-compute-bar__label">{label}</span>
        {algorithm && <Badge variant={active ? 'orange' : 'muted'}>{algorithm}</Badge>}
      </div>
      <div className="graph-compute-bar__metrics">
        <span>{visitedNodes}/{totalNodes || '—'} nodes</span>
        <span>{iterationMs > 0 ? `${iterationMs}ms` : '—'}</span>
        {cascadeReplayFrames.length > 1 && (
          <span>frame {cascadeReplayIndex + 1}/{cascadeReplayFrames.length}</span>
        )}
      </div>
      <div className="graph-compute-bar__track">
        <div
          className={`graph-compute-bar__fill ${active ? 'is-active' : ''}`}
          style={{ width: `${active ? Math.max(8, progress) : progress}%` }}
        />
      </div>
    </div>
  )
})
