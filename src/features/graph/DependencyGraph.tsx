import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { useAppStore } from '@/store/useAppStore'
import { buildGraph } from '@/services/graphEngine'
import { statusColor, criticalityLabel } from '@/utils/format'
import { Card } from '@/components/ui/Card'
import { Badge, SeverityBadge } from '@/components/ui/Badge'
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

export function DependencyGraph() {
  const svgRef = useRef<SVGSVGElement>(null)
  const { ikObjects, cascadeResult } = useAppStore()
  const [selectedNode, setSelectedNode] = useState<IKObject | null>(null)
  const [simRunning, setSimRunning] = useState(false)
  const simulationRef = useRef<d3.Simulation<D3Node, D3Link> | null>(null)

  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = svgRef.current.clientWidth || 800
    const height = svgRef.current.clientHeight || 600

    const affectedIds = new Set(cascadeResult?.nodes.map(n => n.objectId) ?? [])
    const affectedMap = new Map(cascadeResult?.nodes.map(n => [n.objectId, n]) ?? [])

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

    const link = g.append('g').selectAll('line')
      .data(links).enter().append('line')
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
        return node ? `${node.affectedAt}min` : ''
      })
      .attr('text-anchor', 'middle').attr('y', 42)
      .attr('fill', '#F59E0B').attr('font-size', '9px').attr('font-family', 'JetBrains Mono, monospace')

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as D3Node).x ?? 0)
        .attr('y1', d => (d.source as D3Node).y ?? 0)
        .attr('x2', d => (d.target as D3Node).x ?? 0)
        .attr('y2', d => (d.target as D3Node).y ?? 0)
      nodeGroup.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })

    simulation.on('end', () => setSimRunning(false))
    setSimRunning(true)

    return () => { simulation.stop() }
  }, [ikObjects, cascadeResult])

  const selectedIKObj = selectedNode ? ikObjects.find(o => o.id === selectedNode.id) : null

  return (
    <div className="h-full flex">
      {/* Graph */}
      <div className="flex-1 relative">
        <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
          <div className="glass rounded-[14px] px-3 py-2 flex items-center gap-3">
            <Badge variant="cyan">BFS/DFS CASCADE ENGINE</Badge>
            {simRunning && <Badge variant="orange">COMPUTING...</Badge>}
            {cascadeResult && (
              <Badge variant="danger">
                CASCADE: {cascadeResult.affectedCount} OBIEKTÓW · {cascadeResult.totalImpactScore.toFixed(0)}/100
              </Badge>
            )}
          </div>
        </div>
        <svg ref={svgRef} className="w-full h-full bg-[#05070A]" />

        {/* Legend */}
        <div className="absolute bottom-4 left-4 glass rounded-[14px] p-3 space-y-1.5">
          <div className="text-[9px] font-mono text-[#66778B] uppercase tracking-wider mb-2">LEGENDA</div>
          {[
            { color: '#22C55E', label: 'Operational' },
            { color: '#F59E0B', label: 'Degraded' },
            { color: '#EF4444', label: 'Offline / Under Attack' },
            { color: 'rgba(0,229,255,0.3)', label: 'Dependency link' },
            { color: 'rgba(239,68,68,0.7)', label: 'Cascade propagation' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-4 h-0.5 rounded" style={{ background: color }} />
              <span className="text-[10px] font-mono text-[#66778B]">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Side panel */}
      {selectedIKObj && (
        <div className="w-72 flex-shrink-0 glass-strong border-l border-white/[0.06] p-4 overflow-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[12px] font-mono font-bold text-[#00E5FF] uppercase">{selectedIKObj.shortName}</div>
            <button onClick={() => setSelectedNode(null)} className="text-[#66778B] hover:text-white">✕</button>
          </div>
          <Card label="OBIEKT IK">
            <div className="space-y-2 text-[11px] font-mono">
              <div className="text-[#94A3B8]">{selectedIKObj.name}</div>
              <div className="flex justify-between"><span className="text-[#66778B]">Status</span><span style={{ color: statusColor(selectedIKObj.status) }}>{selectedIKObj.status.toUpperCase()}</span></div>
              <div className="flex justify-between"><span className="text-[#66778B]">Criticality</span><span className="text-[#E6EDF3]">{criticalityLabel(selectedIKObj.criticality)}</span></div>
              <div className="flex justify-between"><span className="text-[#66778B]">Category</span><span className="text-[#E6EDF3]">{CATEGORY_ICONS[selectedIKObj.category]} {selectedIKObj.category}</span></div>
              <div className="flex justify-between"><span className="text-[#66778B]">UPS</span><span className="text-[#E6EDF3]">{selectedIKObj.backupPowerHours}h</span></div>
              <div className="flex justify-between"><span className="text-[#66778B]">Recovery</span><span className="text-[#E6EDF3]">{selectedIKObj.recoveryTimeHours}h</span></div>
            </div>
          </Card>

          {cascadeResult?.nodes.find(n => n.objectId === selectedIKObj.id) && (
            <Card label="CASCADE DATA" className="mt-3" accent="danger">
              {(() => {
                const n = cascadeResult.nodes.find(x => x.objectId === selectedIKObj.id)!
                return (
                  <div className="space-y-2 text-[11px] font-mono">
                    <div className="flex justify-between"><span className="text-[#66778B]">Severity</span><SeverityBadge severity={n.severity} /></div>
                    <div className="flex justify-between"><span className="text-[#66778B]">Impact Score</span><span className="text-[#EF4444]">{n.impactScore.toFixed(1)}/100</span></div>
                    <div className="flex justify-between"><span className="text-[#66778B]">Affected At</span><span className="text-[#F59E0B]">{n.affectedAt} min</span></div>
                    <div className="flex justify-between"><span className="text-[#66778B]">Cascade Depth</span><span className="text-[#E6EDF3]">{n.depth}</span></div>
                    <div><span className="text-[#66778B]">Via</span><div className="text-[#94A3B8] mt-1">{n.via.join(' → ') || 'bezpośredni'}</div></div>
                  </div>
                )
              })()}
            </Card>
          )}

          <Card label="DEPENDENCIES" className="mt-3">
            <div className="space-y-1">
              {selectedIKObj.dependencies.map(depId => {
                const dep = ikObjects.find(o => o.id === depId)
                if (!dep) return null
                return (
                  <div key={depId} className="flex items-center gap-2 text-[10px] font-mono">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor(dep.status) }} />
                    <span className="text-[#94A3B8]">{dep.shortName}</span>
                    <span className="text-[#66778B]">→ {selectedIKObj.shortName}</span>
                  </div>
                )
              })}
              {selectedIKObj.dependencies.length === 0 && (
                <span className="text-[10px] font-mono text-[#66778B]">Brak zależności (węzeł źródłowy)</span>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
