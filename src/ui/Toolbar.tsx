import { PRESETS, type PresetKey } from '../graph/presets'
import { useRoadGraphStore } from '../store/roadGraph'
import { writeGraphToHash } from '../store/url'

export function Toolbar() {
  const { graph, setGraph } = useRoadGraphStore()

  function handlePreset(e: React.ChangeEvent<HTMLSelectElement>) {
    const key = e.target.value as PresetKey
    if (key in PRESETS) setGraph(PRESETS[key].factory())
    e.target.value = ''
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
        <button style={styles.btn} disabled title="Coming in Stage 4">+ Arm</button>
        <button style={styles.btn} disabled title="Coming in Stage 9">Signal</button>
      </div>
      <div style={styles.right}>
        <button style={{ ...styles.btn, ...styles.shareBtn }} onClick={handleShare}>
          Share
        </button>
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
  },
  left: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  right: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  btn: {
    padding: '5px 12px',
    background: '#2a2a35',
    color: '#e0e0e0',
    border: '1px solid #3a3a48',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 13,
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
