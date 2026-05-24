import { Play, RotateCcw, Shield, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

export function GraphSimulationBar({ compact = false }: { compact?: boolean }) {
  const {
    cascadeResult,
    cascadeReplayFrames,
    cascadeReplayIndex,
    setCascadeReplayIndex,
    startCascadeReplay,
    containmentResult,
    clearContainment,
    selectedNodeForContainment,
    setSelectedNodeForContainment,
    simulateContainmentAt,
    ikObjects,
  } = useAppStore()

  if (!cascadeResult) {
    return (
      <div className="graph-sim-bar graph-sim-bar--empty">
        Uruchom scenariusz aby aktywować replay kaskady i symulację containment.
      </div>
    )
  }

  const frame = cascadeReplayFrames[cascadeReplayIndex]
  const canPrev = cascadeReplayIndex > 0
  const canNext = cascadeReplayIndex < cascadeReplayFrames.length - 1

  return (
    <div className={`graph-sim-bar ${compact ? 'graph-sim-bar--compact' : ''}`}>
      <div className="graph-sim-bar__group">
        <Button size="sm" variant="outline" onClick={startCascadeReplay}>
          <Play size={12} /> Replay
        </Button>
        <Button size="sm" variant="ghost" disabled={!canPrev} onClick={() => setCascadeReplayIndex(cascadeReplayIndex - 1)}>
          <ChevronLeft size={12} />
        </Button>
        <Button size="sm" variant="ghost" disabled={!canNext} onClick={() => setCascadeReplayIndex(cascadeReplayIndex + 1)}>
          <ChevronRight size={12} />
        </Button>
        {frame && (
          <Badge variant="orange">{frame.label}</Badge>
        )}
      </div>

      {selectedNodeForContainment && (
        <div className="graph-sim-bar__group">
          <Badge variant="cyan">{selectedNodeForContainment.toUpperCase()}</Badge>
          <Button
            size="sm"
            variant="primary"
            onClick={() => simulateContainmentAt([selectedNodeForContainment])}
          >
            <Shield size={12} /> Contain
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedNodeForContainment(null)}>
            Anuluj
          </Button>
        </div>
      )}

      {containmentResult && (
        <div className="graph-sim-bar__group">
          <Badge variant="green">
            -{containmentResult.impactReduction.toFixed(1)} impact · {containmentResult.preventedNodeIds.length} prevented
          </Badge>
          <Button size="sm" variant="ghost" onClick={clearContainment}>
            <RotateCcw size={12} /> Reset baseline
          </Button>
        </div>
      )}

      {!compact && (
        <span className="graph-sim-bar__hint">
          Kliknij węzeł → Contain · {ikObjects.length} obiektów IK
        </span>
      )}
    </div>
  )
}
