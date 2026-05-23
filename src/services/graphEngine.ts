import type { IKObject } from '@/types'

export interface GraphNode {
  id: string
  name: string
  category: string
  criticality: number
  status: string
  coordinates: [number, number]
}

export interface GraphEdge {
  source: string
  target: string
  weight: number
  type: 'dependency' | 'backup'
}

export interface Graph {
  nodes: Map<string, GraphNode>
  adjacency: Map<string, Set<string>>
  reverseAdjacency: Map<string, Set<string>>
  edges: GraphEdge[]
}

export function buildGraph(objects: IKObject[]): Graph {
  const nodes = new Map<string, GraphNode>()
  const adjacency = new Map<string, Set<string>>()
  const reverseAdjacency = new Map<string, Set<string>>()
  const edges: GraphEdge[] = []

  for (const obj of objects) {
    nodes.set(obj.id, {
      id: obj.id,
      name: obj.name,
      category: obj.category,
      criticality: obj.criticality,
      status: obj.status,
      coordinates: obj.coordinates,
    })
    adjacency.set(obj.id, new Set())
    reverseAdjacency.set(obj.id, new Set())
  }

  for (const obj of objects) {
    for (const depId of obj.dependencies) {
      if (nodes.has(depId)) {
        adjacency.get(depId)!.add(obj.id)
        reverseAdjacency.get(obj.id)!.add(depId)
        edges.push({
          source: depId,
          target: obj.id,
          weight: obj.criticality,
          type: 'dependency',
        })
      }
    }
  }

  return { nodes, adjacency, reverseAdjacency, edges }
}

export function getCriticalityScore(graph: Graph, objectId: string): number {
  const node = graph.nodes.get(objectId)
  if (!node) return 0

  const directDependents = graph.adjacency.get(objectId)?.size ?? 0
  const baseCriticality = node.criticality * 20

  return Math.min(100, baseCriticality + directDependents * 5)
}

export function getShortestPath(graph: Graph, from: string, to: string): string[] {
  const visited = new Set<string>()
  const queue: { id: string; path: string[] }[] = [{ id: from, path: [from] }]

  while (queue.length > 0) {
    const { id, path } = queue.shift()!
    if (id === to) return path
    if (visited.has(id)) continue
    visited.add(id)

    const neighbors = graph.adjacency.get(id) ?? new Set()
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        queue.push({ id: neighbor, path: [...path, neighbor] })
      }
    }
  }
  return []
}
