import { useState } from 'react'
import { PRESETS, type PresetKey } from '../graph/presets'
import { useRoadGraphStore, makeDefaultArm } from '../store/roadGraph'
import { writeGraphToHash } from '../store/url'
import { SignalPanel } from './SignalPanel'

function findFreeAngle(existingAngles: number[]): number {
  if (existingAngles.length === 0) return 0
  const sorted = [...existingAngles].sort((a, b) => a - b)
  let maxGap = 0
  let bestAngle = 0
  for (let i = 0; i < sorted.length; i++) {
    const curr = sorted[i]
    const next = sorted[(i + 1) % sorted.length]
    const gap = next > curr ? next - curr : 360 - curr + next
    if (gap > maxGap) { maxGap = gap; bestAngle = Math.round((curr + gap / 2) % 360) }
  }
  return bestAngle
}

export function Toolbar() {
  const { graph, setGraph, addArm } = useRoadGraphStore()
  const [showSignal, setShowSignal] = useState(false)
  const armCount = graph.intersection.arms.length
  const canAddArm = armCount < 6

  function handlePreset(e: React.ChangeEvent<HTMLSelectElement>) {
    const key = e.target.value as PresetKey
    if (key in PRESETS) setGraph(PRESETS[key].factory())
    e.target.value = ''
    setShowSignal(false)
  }

  function handleAddArm() {
    const existingAngles = graph.intersection.arms.map(a => a.angle)
    addArm(makeDefaultArm(findFreeAngle(existingAngles), `Arm ${armCount + 1}`))
  }

  function handleShare() {
    writeGraphToHash(graph)
    navigator.clipboard.writeText(window.location.href).catch(() => {
      prompt('Copy this link:', window.location.href)
    })
  }

  return (
    <div style={styles.toolbar}>
      <div style={styles.left}>
        <select onChange={handlePreset} defaultValue="" style={styles.select}>
          <option value="" disabled>Presets</option>
          {Object.entries(PRESETS).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <button style={styles.btn} disabled={!canAddArm} onClick={handleAddArm}>+ Arm</button>

        {/* Signal button — opens timer panel */}
        <div style={{ position: 'relative' }}>
          <button
            style={{ ...styles.btn, ...(showSignal ? styles.btnActive : {}) }}
            onClick={() => setShowSignal(v => !v)}
          >
            🚦 Signal
          </button>
          {showSignal && <SignalPanel onClose={() => setShowSignal(false)} />}
        </div>
      </div>
      <div style={styles.right}>
        <button style={{ ...styles.btn, ...styles.shareBtn }} onClick={handleShare}>Share</button>
      </div>
    </div>
  )
}

const styles = {
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 12px',
    height: 48,
    background: '#1a1a1f',
    borderBottom: '1px solid #2a2a35',
    flexShrink: 0,
    position: 'relative' as const,
    zIndex: 50,
  },
  left: { display: 'flex', gap: 8, alignItems: 'center' },
  right: { display: 'flex', gap: 8, alignItems: 'center' },
  btn: {
    padding: '5px 12px',
    background: '#2a2a35',
    color: '#e0e0e0',
    border: '1px solid #3a3a48',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 13,
  } as React.CSSProperties,
  btnActive: {
    background: '#3a3a50',
    borderColor: '#7c6fcd',
    color: '#c8c0ff',
  } as React.CSSProperties,
  shareBtn: {
    background: '#f59e0b',
    color: '#0f0f11',
    borderColor: '#f59e0b',
    fontWeight: 600,
  } as React.CSSProperties,
  select: {
    padding: '5px 8px',
    background: '#2a2a35',
    color: '#e0e0e0',
    border: '1px solid #3a3a48',
    borderRadius: 4,
    fontSize: 13,
    cursor: 'pointer',
  } as React.CSSProperties,
}
