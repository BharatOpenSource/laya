import { useState } from 'react'
import { VEHICLE_CONFIGS } from './vehicleTypes'
import type { VehicleType } from '../types/graph'

const ACTIVE_TYPES: { type: VehicleType; label: string }[] = [
  { type: 'two-wheeler', label: 'Two-wheeler' },
  { type: 'car',         label: 'Car' },
  { type: 'auto',        label: 'Auto' },
]

export function Legend() {
  const [open, setOpen] = useState(true)

  return (
    <div style={styles.wrapper}>
      <button style={styles.toggle} onClick={() => setOpen(v => !v)}>
        {open ? '▾' : '▸'} Legend
      </button>
      {open && (
        <div style={styles.items}>
          {ACTIVE_TYPES.map(({ type, label }) => (
            <div key={type} style={styles.row}>
              <span style={{ ...styles.swatch, background: VEHICLE_CONFIGS[type].color }} />
              <span style={styles.label}>{label}</span>
            </div>
          ))}
          <div style={styles.row}>
            <span style={{ ...styles.swatch, background: '#60a5fa', opacity: 0.4 }} />
            <span style={{ ...styles.label, color: '#444' }}>Pedestrian (Stage 8)</span>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  wrapper: {
    position: 'absolute' as const,
    bottom: 10,
    right: 10,
    background: 'rgba(15,15,20,0.85)',
    border: '1px solid #2a2a35',
    borderRadius: 6,
    padding: '6px 10px',
    zIndex: 10,
    minWidth: 140,
    backdropFilter: 'blur(4px)',
  },
  toggle: {
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: 11,
    cursor: 'pointer',
    padding: 0,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    width: '100%',
    textAlign: 'left' as const,
  },
  items: {
    marginTop: 6,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 5,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  swatch: {
    width: 24,
    height: 10,
    borderRadius: 2,
    flexShrink: 0,
  },
  label: {
    color: '#aaa',
    fontSize: 11,
  },
}
