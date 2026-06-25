import { useState } from 'react'
import { useSimStore, PARAM_LABELS, type ChaosParams } from '../store/sim'

export function BottomBar() {
  const {
    chaos, params, running, signalsEnabled,
    setChaos, resetParamsToChaos, setParam,
    setRunning, toggleSignals, triggerReset,
  } = useSimStore()
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={{ ...styles.wrapper, height: expanded ? 'auto' : 48 }}>
      {expanded && (
        <div style={styles.fineTune}>
          <div style={styles.fineTuneHeader}>
            <span style={styles.fineTuneTitle}>Fine-tune</span>
            <button style={styles.resetBtn} onClick={resetParamsToChaos}>
              Reset to chaos ({chaos})
            </button>
          </div>
          {(Object.keys(PARAM_LABELS) as (keyof ChaosParams)[]).map(key => (
            <div key={key} style={styles.paramRow}>
              <span style={styles.paramLabel}>{PARAM_LABELS[key]}</span>
              <input
                type="range" min={0} max={100} value={params[key]}
                onChange={e => setParam(key, Number(e.target.value))}
                style={styles.paramSlider}
              />
              <span style={styles.paramValue}>{params[key]}</span>
            </div>
          ))}
        </div>
      )}

      <div style={styles.bar}>
        <div style={styles.chaosGroup}>
          <span style={styles.label}>Chaos</span>
          <input
            type="range" min={0} max={100} value={chaos}
            onChange={e => setChaos(Number(e.target.value))}
            style={styles.slider}
          />
          <span style={styles.value}>{chaos}</span>
          <button
            style={styles.tuneBtn}
            onClick={() => setExpanded(v => !v)}
            title="Fine-tune individual parameters"
          >
            {expanded ? '▲' : '▼'} Fine-tune
          </button>
        </div>
        <div style={styles.controls}>
          <button
            style={{ ...styles.btn, ...styles.signalBtn, opacity: signalsEnabled ? 1 : 0.5 }}
            onClick={toggleSignals}
            title={signalsEnabled ? 'Signals ON — click to disable' : 'Signals OFF — click to enable'}
          >
            🚦 {signalsEnabled ? 'ON' : 'OFF'}
          </button>
          <button style={{ ...styles.btn, ...styles.clearBtn }} onClick={triggerReset} title="Clear all agents">
            ↺
          </button>
          {running ? (
            <button style={{ ...styles.btn, ...styles.pauseBtn }} onClick={() => setRunning(false)}>⏸ Pause</button>
          ) : (
            <button style={{ ...styles.btn, ...styles.runBtn }} onClick={() => setRunning(true)}>▶ Run</button>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column-reverse' as const,
    background: '#1a1a1f',
    borderTop: '1px solid #2a2a35',
    flexShrink: 0,
  },
  bar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    height: 48,
    flexShrink: 0,
  },
  fineTune: {
    padding: '10px 16px 6px',
    borderTop: '1px solid #2a2a35',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
  },
  fineTuneHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  fineTuneTitle: {
    color: '#555',
    fontSize: 10,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
  },
  resetBtn: {
    background: 'none',
    border: '1px solid #2a2a35',
    borderRadius: 3,
    color: '#666',
    fontSize: 10,
    cursor: 'pointer',
    padding: '2px 8px',
  } as React.CSSProperties,
  paramRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  paramLabel: {
    color: '#666',
    fontSize: 11,
    width: 130,
    flexShrink: 0,
    textAlign: 'right' as const,
  },
  paramSlider: {
    width: 140,
    accentColor: '#7c6fcd',
    cursor: 'pointer',
  } as React.CSSProperties,
  paramValue: {
    color: '#888',
    fontSize: 11,
    minWidth: 24,
    textAlign: 'right' as const,
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
  tuneBtn: {
    background: 'none',
    border: 'none',
    color: '#555',
    fontSize: 11,
    cursor: 'pointer',
    padding: '2px 6px',
  } as React.CSSProperties,
  controls: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  btn: {
    padding: '5px 12px',
    border: 'none',
    borderRadius: 4,
    fontSize: 13,
    cursor: 'pointer',
    fontWeight: 600,
  } as React.CSSProperties,
  signalBtn: {
    background: '#2a2a35',
    color: '#e0e0e0',
    fontSize: 12,
    fontWeight: 400,
  },
  clearBtn: {
    background: '#2a2a35',
    color: '#888',
    fontSize: 16,
    padding: '4px 10px',
    fontWeight: 400,
  },
  runBtn:   { background: '#22c55e', color: '#0f0f11' },
  pauseBtn: { background: '#f59e0b', color: '#0f0f11' },
}
