import { useState } from 'react'
import { useSimStore, TYPE_LABELS } from '../store/sim'
import { VEHICLE_CONFIGS } from '../simulation/vehicleTypes'
import type { VehicleType } from '../types/graph'

const ACTIVE_TYPES: VehicleType[] = ['two-wheeler', 'car', 'auto']

export function TrafficPanel() {
  const { spawnConfig, setGlobalMultiplier, setTypeWeight } = useSimStore()
  const [open, setOpen] = useState(false)

  return (
    <div style={styles.wrapper}>
      <button
        style={{ ...styles.toggle, color: open ? '#c8c0ff' : '#666' }}
        onClick={() => setOpen(v => !v)}
        title="Traffic density controls"
      >
        {open ? '▲' : '▼'} Traffic
      </button>

      {open && (
        <div style={styles.panel}>
          {/* Global density */}
          <div style={styles.section}>
            <span style={styles.sectionLabel}>Overall density</span>
            <div style={styles.row}>
              <input
                type="range" min={0.1} max={3} step={0.1}
                value={spawnConfig.globalMultiplier}
                onChange={e => setGlobalMultiplier(Number(e.target.value))}
                style={{ ...styles.slider, accentColor: '#7c6fcd' }}
              />
              <span style={styles.val}>{spawnConfig.globalMultiplier.toFixed(1)}×</span>
            </div>
          </div>

          {/* Per-type weights */}
          <div style={styles.section}>
            <span style={styles.sectionLabel}>Vehicle mix</span>
            {ACTIVE_TYPES.map(type => (
              <div key={type} style={styles.typeRow}>
                <span style={{ ...styles.dot, background: VEHICLE_CONFIGS[type].color }} />
                <span style={styles.typeLabel}>{TYPE_LABELS[type]}</span>
                <input
                  type="range" min={0} max={100}
                  value={spawnConfig.typeWeights[type]}
                  onChange={e => setTypeWeight(type, Number(e.target.value))}
                  style={{ ...styles.slider, accentColor: VEHICLE_CONFIGS[type].color }}
                />
                <span style={styles.val}>{spawnConfig.typeWeights[type]}</span>
              </div>
            ))}
            <p style={styles.note}>Weights are relative — all zeros = no traffic.</p>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  wrapper: {
    position: 'relative' as const,
  },
  toggle: {
    background: 'none',
    border: 'none',
    fontSize: 11,
    cursor: 'pointer',
    padding: '2px 6px',
  } as React.CSSProperties,
  panel: {
    position: 'absolute' as const,
    bottom: '100%',
    left: 0,
    marginBottom: 4,
    background: '#16161f',
    border: '1px solid #2a2a35',
    borderRadius: 6,
    padding: '10px 14px',
    zIndex: 100,
    minWidth: 260,
    boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 10,
  },
  section: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
  },
  sectionLabel: {
    color: '#555',
    fontSize: 10,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  typeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 2,
    flexShrink: 0,
  },
  typeLabel: {
    color: '#888',
    fontSize: 11,
    width: 90,
    flexShrink: 0,
  },
  slider: {
    flex: 1,
    cursor: 'pointer',
  } as React.CSSProperties,
  val: {
    color: '#666',
    fontSize: 11,
    minWidth: 32,
    textAlign: 'right' as const,
  },
  note: {
    color: '#444',
    fontSize: 10,
    margin: 0,
    marginTop: 2,
  },
}
