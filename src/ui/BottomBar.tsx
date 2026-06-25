import { useSimStore } from '../store/sim'

export function BottomBar() {
  const { chaos, running, setChaos, setRunning } = useSimStore()

  return (
    <div style={styles.bar}>
      <div style={styles.chaosGroup}>
        <span style={styles.label}>Chaos</span>
        <input
          type="range"
          min={0}
          max={100}
          value={chaos}
          onChange={(e) => setChaos(Number(e.target.value))}
          style={styles.slider}
        />
        <span style={styles.value}>{chaos}</span>
      </div>
      <div style={styles.controls}>
        {running ? (
          <button style={{ ...styles.btn, ...styles.pauseBtn }} onClick={() => setRunning(false)}>
            ⏸ Pause
          </button>
        ) : (
          <button style={{ ...styles.btn, ...styles.runBtn }} onClick={() => setRunning(true)}>
            ▶ Run
          </button>
        )}
      </div>
    </div>
  )
}

const styles = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    height: 48,
    background: '#1a1a1f',
    borderTop: '1px solid #2a2a35',
    flexShrink: 0,
  },
  chaosGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  label: {
    color: '#888',
    fontSize: 12,
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
  },
  slider: {
    width: 160,
    accentColor: '#f59e0b',
    cursor: 'pointer',
  } as React.CSSProperties,
  value: {
    color: '#e0e0e0',
    fontSize: 13,
    minWidth: 28,
    textAlign: 'right' as const,
  },
  controls: {
    display: 'flex',
    gap: 8,
  },
  btn: {
    padding: '5px 16px',
    border: 'none',
    borderRadius: 4,
    fontSize: 13,
    cursor: 'pointer',
    fontWeight: 600,
  } as React.CSSProperties,
  runBtn: {
    background: '#22c55e',
    color: '#0f0f11',
  },
  pauseBtn: {
    background: '#f59e0b',
    color: '#0f0f11',
  },
}
