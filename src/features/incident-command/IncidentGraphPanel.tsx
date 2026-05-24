import { DependencyGraph } from '@/features/graph/DependencyGraph'

export function IncidentGraphPanel() {
  return (
    <div className="icm-graph">
      <div className="icm-graph__toolbar">
        <span className="icm-graph__title">DEPENDENCY GRAPH — CASCADE PROPAGATION</span>
        <span className="icm-graph__hint">Animacja z silnika BFS/DFS · T+N min</span>
      </div>
      <div className="icm-graph__canvas">
        <DependencyGraph variant="incident" animateCascade />
      </div>
    </div>
  )
}
