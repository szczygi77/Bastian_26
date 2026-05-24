import { useEffect, useRef, useState, memo, useMemo } from 'react'
import * as d3 from 'd3'
import { useGraphState } from '@/store/selectors'
import { useAppStore } from '@/store/useAppStore'
import { buildGraph } from '@/services/graphEngine'
import { explainNodeImpact, getRootCausePath } from '@/services/cascadeSimulationService'
import { statusColor, criticalityLabel } from '@/utils/format'
import { Card } from '@/components/ui/Card'
import { Badge, SeverityBadge } from '@/components/ui/Badge'
import { GraphSimulationBar } from '@/features/graph/GraphSimulationBar'
import { GraphComputeBar } from '@/features/graph/GraphComputeBar'
import type { IKObject } from '@/types'

interface D3Node extends d3.SimulationNodeDatum {
  id: string
  name: string
  shortName: string
  category: string
  criticality: number
  status: string
  x?: number
  y?: number
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  source: D3Node | string
  target: D3Node | string
  type: 'dependency' | 'backup'
}

const CATEGORY_ICONS: Record<string, string> = {
  energy: '⚡', water: '💧', transport: '🚗', telecommunications: '📡',
  military: '🛡', emergency: '🚨', government: '🏛', fuel: '⛽',
}

export const DependencyGraph = memo(function DependencyGraph({
  variant = 'page',
  animateCascade = false,
}: {
  variant?: 'page' | 'incident'
  animateCascade?: boolean
} = {}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const {
    ikObjects, cascadeResult, focusedIkObjectId, setFocusedIkObjectId,
    cascadeReplayFrames, cascadeReplayIndex, setSelectedNodeForContainment,
    containmentResult, containmentRecovery, updateGraphComputeState,
    selectedNodeForContainment,
  } = useGraphState()
  const ikObjectSignature = useMemo(
    () => ikObjects.map(o => `${o.id}:${o.status}:${o.criticality}`).join(','),
    [ikObjects],
  )
  const [selectedNode, setSelectedNode] = useState<IKObject | null>(null)
  const [simRunning, setSimRunning] = useState(false)
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set())
  const simulationRef = useRef<d3.Simulation<D3Node, D3Link> | null>(null)

  useEffect(() => {
    if (!animateCascade || !cascadeResult) {
      if (cascadeReplayFrames.length > 0) {
        const frame = cascadeReplayFrames[cascadeReplayIndex]
        if (frame) {
          setRevealedIds(new Set(frame.revealedNodeIds))
          return
        }
      }
      setRevealedIds(new Set(cascadeResult?.nodes.map(n => n.objectId) ?? []))
      return
    }

    const frame = cascadeReplayFrames[cascadeReplayIndex]
    if (frame) {
      setRevealedIds(new Set(frame.revealedNodeIds))
      return
    }

    const root = cascadeResult.incidentObjectId
    setRevealedIds(new Set([root]))

    const ordered = [...cascadeResult.nodes].sort((a, b) => a.affectedAt - b.affectedAt)
    let index = 0
    const timer = window.setInterval(() => {
      if (index >= ordered.length) {
        window.clearInterval(timer)
        return
      }
      const node = ordered[index]
      index += 1
      setRevealedIds(prev => new Set([...prev, node.objectId]))
    }, 650)

    return () => window.clearInterval(timer)
  }, [animateCascade, cascadeResult, cascadeReplayFrames, cascadeReplayIndex])

  useEffect(() => {
    if (!focusedIkObjectId) return
    const obj = ikObjects.find(o => o.id === focusedIkObjectId)
    if (obj) setSelectedNode(obj)
    setFocusedIkObjectId(null)
  }, [focusedIkObjectId, ikObjects, setFocusedIkObjectId])

  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = svgRef.current.clientWidth || 800
    const height = svgRef.current.clientHeight || 600

    const affectedIds = new Set(
      cascadeResult?.nodes.filter(n => revealedIds.has(n.objectId)).map(n => n.objectId) ?? [],
    )
    const affectedMap = new Map(
      cascadeResult?.nodes.filter(n => revealedIds.has(n.objectId)).map(n => [n.objectId, n]) ?? [],
    )

    const nodes: D3Node[] = ikObjects.map(obj => ({
      id: obj.id,
      name: obj.name,
      shortName: obj.shortName,
      category: obj.category,
      criticality: obj.criticality,
      status: obj.status,
    }))

    const graph = buildGraph(ikObjects)
    const links: D3Link[] = []
    for (const edge of graph.edges) {
      const src = nodes.find(n => n.id === edge.source)
      const tgt = nodes.find(n => n.id === edge.target)
      if (src && tgt) links.push({ source: src, target: tgt, type: edge.type })
    }

    // Defs
    const defs = svg.append('defs')
    defs.append('marker').attr('id', 'arrow-normal')
      .attr('markerWidth', 8).attr('markerHeight', 8).attr('refX', 18).attr('refY', 3)
      .attr('orient', 'auto')
      .append('path').attr('d', 'M0,0 L0,6 L8,3 z').attr('fill', 'rgba(0,229,255,0.4)')
    defs.append('marker').attr('id', 'arrow-affected')
      .attr('markerWidth', 8).attr('markerHeight', 8).attr('refX', 18).attr('refY', 3)
      .attr('orient', 'auto')
      .append('path').attr('d', 'M0,0 L0,6 L8,3 z').attr('fill', 'rgba(239,68,68,0.8)')

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (e) => g.attr('transform', e.transform.toString()))
    svg.call(zoom)

    const g = svg.append('g')

    const simulation = d3.forceSimulation<D3Node>(nodes)
      .force('link', d3.forceLink<D3Node, D3Link>(links).id(d => d.id).distance(120).strength(0.4))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(40))

    simulationRef.current = simulation

    const containedIds = new Set(containmentResult?.containedNodeIds ?? [])
    const preventedIds = new Set(containmentResult?.preventedNodeIds ?? [])
    const recoveringIds = new Set(containmentRecovery?.recoveringNodeIds ?? [])

    const link = g.append('g').selectAll('line')
      .data(links).enter().append('line')
      .attr('class', d => {
        const src = typeof d.source === 'object' ? (d.source as D3Node).id : d.source
        const tgt = typeof d.target === 'object' ? (d.target as D3Node).id : d.target
        const active = affectedIds.has(src) || affectedIds.has(tgt)
        const classes = ['graph-edge']
        if (active) classes.push('graph-edge--active')
        if (active && (containedIds.has(src) || containedIds.has(tgt))) classes.push('graph-edge--contained')
        if (d.type === 'backup') classes.push('graph-edge--backup')
        return classes.join(' ')
      })
      .attr('stroke', d => {
        const src = typeof d.source === 'object' ? (d.source as D3Node).id : d.source
        const tgt = typeof d.target === 'object' ? (d.target as D3Node).id : d.target
        return affectedIds.has(src) || affectedIds.has(tgt) ? 'rgba(239,68,68,0.7)' : 'rgba(0,229,255,0.2)'
      })
      .attr('stroke-width', d => {
        const src = typeof d.source === 'object' ? (d.source as D3Node).id : d.source
        const tgt = typeof d.target === 'object' ? (d.target as D3Node).id : d.target
        return affectedIds.has(src) || affectedIds.has(tgt) ? 2 : 1
      })
      .attr('stroke-dasharray', d => d.type === 'backup' ? '4 4' : undefined as unknown as string)
      .attr('marker-end', d => {
        const tgt = typeof d.target === 'object' ? (d.target as D3Node).id : d.target
        return affectedIds.has(tgt) ? 'url(#arrow-affected)' : 'url(#arrow-normal)'
      })

    const nodeGroup = g.append('g').selectAll('g')
      .data(nodes).enter().append('g')
      .attr('cursor', 'pointer')
      .on('click', (_, d) => {
        const obj = ikObjects.find(o => o.id === d.id)
        setSelectedNode(obj ?? null)
        if (cascadeResult) setSelectedNodeForContainment(d.id)
      })
      .call(
        d3.drag<SVGGElement, D3Node>()
          .on('start', (event, d) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
          .on('end', (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null })
      )

    const isAffected = (id: string) => affectedIds.has(id)
    const hexPath = (r: number) => {
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 3) * i
        return `${r * Math.cos(a)},${r * Math.sin(a)}`
      })
      return `M${pts.join('L')}Z`
    }

    nodeGroup.append('path')
      .attr('class', d => {
        const classes = ['graph-node']
        if (isAffected(d.id)) classes.push('graph-node--affected')
        if (containedIds.has(d.id)) classes.push('graph-node--contained')
        if (preventedIds.has(d.id)) classes.push('graph-node--prevented')
        if (recoveringIds.has(d.id)) classes.push('graph-node--recovering')
        if (selectedNodeForContainment === d.id) classes.push('graph-node--selected')
        return classes.join(' ')
      })
      .attr('d', d => hexPath(14 + d.criticality * 2.5))
      .attr('fill', d => isAffected(d.id) ? 'rgba(239,68,68,0.15)' : 'rgba(16,22,30,0.85)')
      .attr('stroke', d => isAffected(d.id) ? '#EF4444' : statusColor(d.status))
      .attr('stroke-width', d => d.criticality >= 4 ? 2 : 1.5)
      .style('filter', d => isAffected(d.id) ? 'drop-shadow(0 0 8px rgba(239,68,68,0.6))' : d.criticality >= 4 ? `drop-shadow(0 0 6px ${statusColor(d.status)}60)` : 'none')

    nodeGroup.append('text')
      .text(d => CATEGORY_ICONS[d.category] ?? '●')
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .attr('font-size', '14px').attr('y', -6)

    nodeGroup.append('text')
      .text(d => d.shortName)
      .attr('text-anchor', 'middle').attr('y', 28)
      .attr('fill', d => isAffected(d.id) ? '#EF4444' : '#94A3B8')
      .attr('font-size', '10px').attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-weight', '500')

    // Cascade depth badges
    nodeGroup.filter(d => affectedMap.has(d.id))
      .append('text')
      .text(d => {
        const node = affectedMap.get(d.id)
        return node ? `T+${node.affectedAt}` : ''
      })
      .attr('text-anchor', 'middle').attr('y', 42)
      .attr('fill', '#F59E0B').attr('font-size', '9px').attr('font-family', 'JetBrains Mono, monospace')

    nodeGroup.filter(d => affectedMap.has(d.id))
      .append('text')
      .text(d => {
        const node = affectedMap.get(d.id)
        return node ? `${node.impactScore.toFixed(0)}` : ''
      })
      .attr('text-anchor', 'middle').attr('y', 54)
      .attr('fill', '#EF4444').attr('font-size', '8px').attr('font-family', 'JetBrains Mono, monospace')

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as D3Node).x ?? 0)
        .attr('y1', d => (d.source as D3Node).y ?? 0)
        .attr('x2', d => (d.target as D3Node).x ?? 0)
        .attr('y2', d => (d.target as D3Node).y ?? 0)
      nodeGroup.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })

    simulation.on('end', () => {
      setSimRunning(false)
      updateGraphComputeState(false)
    })
    setSimRunning(true)
    updateGraphComputeState(true)

    return () => {
      simulation.stop()
      simulationRef.current = null
    }
  }, [ikObjectSignature, cascadeResult?.incidentObjectId, cascadeResult?.affectedCount, revealedIds, containmentResult, containmentRecovery, selectedNodeForContainment, updateGraphComputeState])

  const selectedIKObj = selectedNode ? ikObjects.find(o => o.id === selectedNode.id) : null
  const isIncident = variant === 'incident'

  if (ikObjects.length === 0) {
    return (
      <div className="graph-page graph-page--empty">
        <div className="graph-page__empty">
          <div className="graph-page__empty-title">DEPENDENCY GRAPH</div>
          <p>Brak obiektów IK w systemie. Załaduj dane operacyjne lub uruchom scenariusz.</p>
        </div>
      </div>
    )
  }

  if (isIncident) {
    return (
      <div className="graph-page graph-page--incident">
        <GraphSimulationBar compact />
        <GraphComputeBar compact />
        <svg ref={svgRef} className="graph-page__svg graph-page__svg--incident" />
      </div>
    )
  }

  const nodeExplanation = selectedIKObj
    ? explainNodeImpact(ikObjects, cascadeResult, selectedIKObj.id)
    : null

  return (
    <div className="graph-page">
      <GraphSimulationBar />
      <GraphComputeBar />
      <div className="graph-page__body">
      <div className="graph-page__canvas">
        <div className="graph-page__toolbar glass-panel ui-panel">
          <div className="ui-filter-bar" style={{ gap: 12 }}>
            <Badge variant="cyan">BFS/DFS CASCADE ENGINE</Badge>
            {simRunning && <Badge variant="orange">COMPUTING...</Badge>}
            {cascadeResult && (
              <Badge variant="danger">
                CASCADE: {cascadeResult.affectedCount} OBIEKTÓW · {cascadeResult.totalImpactScore.toFixed(0)}/100
              </Badge>
            )}
          </div>
        </div>

        <svg ref={svgRef} className="graph-page__svg" />

        <div className="graph-page__legend glass-panel ui-panel">
          <div className="graph-page__legend-title">LEGENDA</div>
          <div className="ui-stack" style={{ gap: 10 }}>
            {[
              { color: '#22C55E', label: 'Operational' },
              { color: '#F59E0B', label: 'Degraded' },
              { color: '#EF4444', label: 'Offline / Under Attack' },
              { color: 'rgba(0,229,255,0.3)', label: 'Dependency link' },
              { color: 'rgba(239,68,68,0.7)', label: 'Cascade propagation' },
            ].map(({ color, label }) => (
              <div key={label} className="graph-page__legend-row">
                <div className="graph-page__legend-line" style={{ background: color }} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedIKObj ? (
        <aside className="graph-page__sidebar">
          <div className="ui-stack">
            <div className="graph-page__sidebar-header">
              <div>
                <div className="graph-page__sidebar-code">{selectedIKObj.shortName}</div>
                <div className="graph-page__sidebar-name">{selectedIKObj.name}</div>
              </div>
              <button type="button" className="graph-page__sidebar-close" onClick={() => setSelectedNode(null)} aria-label="Zamknij panel">
                ✕
              </button>
            </div>

            <Card label="OBIEKT IK">
              <div className="ui-stack" style={{ gap: 10 }}>
                <div className="ui-row-item">
                  <span className="graph-page__meta-label">Status</span>
                  <span style={{ color: statusColor(selectedIKObj.status), fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                    {selectedIKObj.status.toUpperCase()}
                  </span>
                </div>
                <div className="ui-row-item">
                  <span className="graph-page__meta-label">Criticality</span>
                  <span className="graph-page__meta-value">{criticalityLabel(selectedIKObj.criticality)}</span>
                </div>
                <div className="ui-row-item">
                  <span className="graph-page__meta-label">Category</span>
                  <span className="graph-page__meta-value">{CATEGORY_ICONS[selectedIKObj.category]} {selectedIKObj.category}</span>
                </div>
                <div className="ui-row-item">
                  <span className="graph-page__meta-label">UPS</span>
                  <span className="graph-page__meta-value">{selectedIKObj.backupPowerHours}h</span>
                </div>
                <div className="ui-row-item">
                  <span className="graph-page__meta-label">Recovery</span>
                  <span className="graph-page__meta-value">{selectedIKObj.recoveryTimeHours}h</span>
                </div>
              </div>
            </Card>

            {cascadeResult?.nodes.find(n => n.objectId === selectedIKObj.id) && (
              <Card label="CASCADE DATA" accent="danger">
                {(() => {
                  const n = cascadeResult.nodes.find(x => x.objectId === selectedIKObj.id)!
                  return (
                    <div className="ui-stack" style={{ gap: 10 }}>
                      <div className="ui-row-item">
                        <span className="graph-page__meta-label">Severity</span>
                        <SeverityBadge severity={n.severity} />
                      </div>
                      <div className="ui-row-item">
                        <span className="graph-page__meta-label">Impact Score</span>
                        <span className="graph-page__meta-value" style={{ color: '#EF4444' }}>{n.impactScore.toFixed(1)}/100</span>
                      </div>
                      <div className="ui-row-item">
                        <span className="graph-page__meta-label">Affected At</span>
                        <span className="graph-page__meta-value" style={{ color: '#F59E0B' }}>{n.affectedAt} min</span>
                      </div>
                      <div className="ui-row-item">
                        <span className="graph-page__meta-label">Cascade Depth</span>
                        <span className="graph-page__meta-value">{n.depth}</span>
                      </div>
                      <div className="ui-panel" style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.02)' }}>
                        <div className="graph-page__meta-label" style={{ marginBottom: 6 }}>Via</div>
                        <div className="graph-page__meta-value">{n.via.join(' → ') || 'bezpośredni'}</div>
                      </div>
                    </div>
                  )
                })()}
              </Card>
            )}

            {nodeExplanation && (
              <Card label="IMPACT EXPLANATION" accent="cyan">
                <p className="graph-page__meta-value" style={{ lineHeight: 1.5, marginBottom: 10 }}>{nodeExplanation.whyImpacted}</p>
                {cascadeResult && (
                  <div className="ui-panel" style={{ padding: '10px 12px', marginBottom: 8 }}>
                    <div className="graph-page__meta-label">Root cause path</div>
                    <div className="graph-page__meta-value">{getRootCausePath(cascadeResult, selectedIKObj.id).join(' → ')}</div>
                  </div>
                )}
                {nodeExplanation.downstream.length > 0 && (
                  <div className="text-[10px] font-mono text-[#94A3B8]">
                    Downstream: {nodeExplanation.downstream.join(', ')}
                  </div>
                )}
              </Card>
            )}

            <Card label="DEPENDENCIES">
              <div className="ui-stack" style={{ gap: 8 }}>
                {selectedIKObj.dependencies.map(depId => {
                  const dep = ikObjects.find(o => o.id === depId)
                  if (!dep) return null
                  return (
                    <div key={depId} className="ui-row-item" style={{ justifyContent: 'flex-start', gap: 12 }}>
                      <div className="graph-page__dep-dot" style={{ background: statusColor(dep.status) }} />
                      <span className="graph-page__meta-value">{dep.shortName}</span>
                      <span className="graph-page__meta-label">→ {selectedIKObj.shortName}</span>
                    </div>
                  )
                })}
                {selectedIKObj.dependencies.length === 0 && (
                  <div className="ui-panel" style={{ padding: '14px 16px', color: '#66778B', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                    Brak zależności (węzeł źródłowy)
                  </div>
                )}
              </div>
            </Card>
          </div>
        </aside>
      ) : (
        <aside className="graph-page__sidebar graph-page__sidebar--empty">
          <div className="graph-page__empty">
            <div className="graph-page__empty-title">DEPENDENCY GRAPH</div>
            <p>Kliknij węzeł na grafie, aby zobaczyć szczegóły obiektu IK, dane kaskady i zależności.</p>
          </div>
        </aside>
      )}
      </div>
    </div>
  )
})
