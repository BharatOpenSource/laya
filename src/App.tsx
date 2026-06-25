import { useEffect } from 'react'
import { Toolbar } from './ui/Toolbar'
import { BottomBar } from './ui/BottomBar'
import { IntersectionSVG } from './editor/IntersectionSVG'
import { SimCanvas } from './simulation/SimCanvas'
import { Legend } from './simulation/Legend'
import { useRoadGraphStore } from './store/roadGraph'
import { readGraphFromHash, writeGraphToHash } from './store/url'

export default function App() {
  const { graph, setGraph } = useRoadGraphStore()

  // On mount: restore graph from URL hash if present
  useEffect(() => {
    const saved = readGraphFromHash()
    if (saved) setGraph(saved)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep URL hash in sync with graph state
  useEffect(() => {
    writeGraphToHash(graph)
  }, [graph])

  return (
    <div style={styles.root}>
      <Toolbar />
      <div style={styles.workspace}>
        <div style={styles.editorPane}>
          <IntersectionSVG />
        </div>
        <div style={styles.divider} />
        <div style={styles.simPane}>
          <SimCanvas />
          <Legend />
        </div>
      </div>
      <BottomBar />
    </div>
  )
}

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100vh',
    width: '100vw',
    background: '#0f0f11',
    color: '#e0e0e0',
    fontFamily: 'system-ui, sans-serif',
    overflow: 'hidden',
  },
  workspace: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  editorPane: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    background: '#12121a',
  },
  divider: {
    width: 1,
    background: '#2a2a35',
    flexShrink: 0,
  },
  simPane: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    background: '#0a0a0f',
  },
  paneLabel: {
    color: '#3a3a48',
    fontSize: 13,
    letterSpacing: '0.05em',
  },
}
