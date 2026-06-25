import type { RoadGraph } from '../types/graph'

export function encodeGraph(graph: RoadGraph): string {
  return btoa(JSON.stringify(graph))
}

export function decodeGraph(encoded: string): RoadGraph | null {
  try {
    const parsed = JSON.parse(atob(encoded))
    if (parsed?.version !== 1 || !parsed?.intersection?.arms) return null
    return parsed as RoadGraph
  } catch {
    return null
  }
}

export function readGraphFromHash(): RoadGraph | null {
  const hash = window.location.hash.slice(1) // strip '#'
  if (!hash) return null
  return decodeGraph(hash)
}

export function writeGraphToHash(graph: RoadGraph): void {
  const encoded = encodeGraph(graph)
  history.replaceState(null, '', `#${encoded}`)
}
