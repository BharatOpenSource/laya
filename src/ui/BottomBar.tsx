import { useState } from 'react'
import { useSimStore, PARAM_LABELS, type ChaosParams } from '../store/sim'

export function BottomBar() {
  const { chaos, params, running, setChaos, setParam, setRunning } = useSimStore()
  const [expanded, setExpanded] = useState(false)

  // Check if any param diverges from the chaos preset
  const isCustom = Object.values(params).some(v => v !== chaos)

  return (
    <div style={{ ...styles.wrapper, height: expanded ? 'auto' : 48 }}>
      {/* Fine-tune panel — above the main bar when expanded */}
      {expanded && (
        <div style={styles.fineTune}>
          {(Object.keys(PARAM_LABELS) as (keyof ChaosParams)[]).map(key => (
            <div key={key} style={styles.paramRow}>
              <span style={styles.paramLabel}>{PARAM_LABELS[key]}</span>
              <input
                type="range"
                min={0}
                max={100}
                value={params[key]}
                onChange={e => setParam(key, Number(e.target.value))}
                style={styles.paramSlider}
              />
              <span style={styles.paramValue}>{params[key]}</span>
            </div>
          ))}
        </div>
      )}

      {/* Main bar */}
      <div style={styles.bar}>
        <div style={styles.chaosGroup}>
          <span style={styles.label}>Chaos</span>
          <input
            type="range"
            min={0}
            max={100}
            value={chaos}
            onChange={e => setChaos(Number(e.target.value))}
            style={styles.slider}
          />
          <span style={styles.value}>{chaos}</span>
          <button
            style={{ ...styles.tuneBtn, color: isCustom ? '#f59e0b' : '#555' }}
            onClick={() => setExpanded(v => !v)}
            title={isCustom ? 'Custom parameters active' : 'Fine-tune parameters'}
          >
            {expanded ? '▲' : '▼'} Fine-tune{isCustom ? ' ●' : ''}
          </button>
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
    padding: '10px 16px 4px',
    borderTop: '1px solid #2a2a35',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
  },
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
    fontSize: 11,
    cursor: 'pointer',
    padding: '2px 6px',
    borderRadius: 3,
  } as React.CSSProperties,
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
