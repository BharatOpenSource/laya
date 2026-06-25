import { useRoadGraphStore } from '../store/roadGraph'

interface Props {
  onClose: () => void
}

export function SignalPanel({ onClose }: Props) {
  const { graph, setSignalPlan } = useRoadGraphStore()
  const plan = graph.signalPlan
  const arms = graph.intersection.arms

  function armLabel(id: string) {
    return arms.find(a => a.id === id)?.label ?? id
  }

  function setPhaseDuration(phaseIndex: number, seconds: number) {
    if (!plan) return
    const phases = plan.phases.map((p, i) =>
      i === phaseIndex ? { ...p, duration: Math.max(1, Math.min(300, seconds)) } : p
    )
    setSignalPlan({ ...plan, phases })
  }

  function setAmber(seconds: number) {
    if (!plan) return
    setSignalPlan({ ...plan, amberDuration: Math.max(1, Math.min(30, seconds)) })
  }

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>Signal Timers</span>
        <button style={styles.close} onClick={onClose}>✕</button>
      </div>

      {!plan ? (
        <p style={styles.empty}>No signal plan on this intersection.<br />Set arm yield rule to "signal" to enable.</p>
      ) : (
        <div style={styles.body}>
          {plan.phases.map((phase, i) => (
            <div key={phase.id} style={styles.row}>
              <div style={styles.phaseLabel}>
                <span style={styles.phaseName}>Phase {i + 1}</span>
                <span style={styles.arms}>
                  🟢 {phase.greenArmIds.map(id => armLabel(id)).join(', ')}
                </span>
              </div>
              <div style={styles.inputGroup}>
                <input
                  type="number"
                  min={1}
                  max={300}
                  value={phase.duration}
                  onChange={e => setPhaseDuration(i, Number(e.target.value))}
                  style={styles.input}
                />
                <span style={styles.unit}>s</span>
              </div>
            </div>
          ))}

          <div style={{ ...styles.row, marginTop: 4, borderTop: '1px solid #2a2a35', paddingTop: 8 }}>
            <span style={styles.phaseLabel}>Amber</span>
            <div style={styles.inputGroup}>
              <input
                type="number"
                min={1}
                max={30}
                value={plan.amberDuration}
                onChange={e => setAmber(Number(e.target.value))}
                style={styles.input}
              />
              <span style={styles.unit}>s</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  panel: {
    position: 'absolute' as const,
    top: 48,
    left: 0,
    zIndex: 100,
    background: '#16161f',
    border: '1px solid #2a2a35',
    borderRadius: 6,
    minWidth: 260,
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderBottom: '1px solid #2a2a35',
  },
  title: { color: '#e0e0e0', fontSize: 12, fontWeight: 600 },
  close: {
    background: 'none',
    border: 'none',
    color: '#666',
    cursor: 'pointer',
    fontSize: 14,
  } as React.CSSProperties,
  body: {
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  phaseLabel: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 2,
  },
  phaseName: {
    color: '#888',
    fontSize: 11,
  },
  arms: {
    color: '#555',
    fontSize: 10,
  },
  inputGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  input: {
    width: 56,
    background: '#2a2a35',
    border: '1px solid #3a3a48',
    borderRadius: 4,
    color: '#e0e0e0',
    fontSize: 13,
    padding: '3px 6px',
    textAlign: 'right' as const,
  } as React.CSSProperties,
  unit: { color: '#555', fontSize: 11 },
  empty: {
    color: '#555',
    fontSize: 11,
    padding: '12px',
    lineHeight: 1.6,
    textAlign: 'center' as const,
  },
}
