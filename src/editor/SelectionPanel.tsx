import { useRoadGraphStore } from '../store/roadGraph'
import type { Arm, Id, Lane } from '../types/graph'

export type Selection =
  | null
  | { type: 'arm'; armId: Id }
  | { type: 'lane'; armId: Id; laneId: Id }

interface Props {
  selection: Selection
  onDeselect: () => void
}

export function SelectionPanel({ selection, onDeselect }: Props) {
  const { graph, updateArm, removeArm, updateLane, addInboundLane, addOutboundLane } = useRoadGraphStore()

  if (!selection) return null

  const arm = graph.intersection.arms.find(a => a.id === selection.armId)
  if (!arm) return null

  let lane: Lane | undefined
  if (selection.type === 'lane') {
    lane =
      arm.inboundLanes.find(l => l.id === selection.laneId) ??
      arm.outboundLanes.find(l => l.id === selection.laneId)
  }

  const isInbound = lane ? arm.inboundLanes.some(l => l.id === lane!.id) : false
  const canRemoveArm = graph.intersection.arms.length > 2

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>{selection.type === 'arm' ? arm.label : `Lane ${lane?.index ?? ''}`}</span>
        <button style={styles.closeBtn} onClick={onDeselect}>✕</button>
      </div>

      {selection.type === 'arm' && (
        <ArmFields
          arm={arm}
          canRemove={canRemoveArm}
          onUpdate={updateArm}
          onRemove={() => { removeArm(arm.id); onDeselect() }}
          onAddInbound={() => addInboundLane(arm.id)}
          onAddOutbound={() => addOutboundLane(arm.id)}
        />
      )}

      {selection.type === 'lane' && lane && (
        <LaneFields
          arm={arm}
          lane={lane}
          isInbound={isInbound}
          onUpdate={(changes) => updateLane(arm.id, lane!.id, changes)}
        />
      )}
    </div>
  )
}

function ArmFields({ arm, canRemove, onUpdate, onRemove, onAddInbound, onAddOutbound }: {
  arm: Arm
  canRemove: boolean
  onUpdate: (id: Id, changes: Partial<Omit<Arm, 'id'>>) => void
  onRemove: () => void
  onAddInbound: () => void
  onAddOutbound: () => void
}) {
  return (
    <div style={styles.fields}>
      <Field label="Label">
        <input style={styles.input} value={arm.label}
          onChange={e => onUpdate(arm.id, { label: e.target.value })} />
      </Field>
      <Field label="Angle (°)">
        <input style={styles.input} type="number" min={0} max={359}
          value={arm.angle}
          onChange={e => onUpdate(arm.id, { angle: Number(e.target.value) % 360 })} />
      </Field>
      <Field label="Length (m)">
        <input style={styles.input} type="number" min={20} max={200}
          value={arm.length}
          onChange={e => onUpdate(arm.id, { length: Math.max(20, Math.min(200, Number(e.target.value))) })} />
      </Field>
      <Field label="Stop line (m)">
        <input style={styles.input} type="number" min={1} max={20}
          value={arm.stopLineOffset}
          onChange={e => onUpdate(arm.id, { stopLineOffset: Math.max(1, Math.min(20, Number(e.target.value))) })} />
      </Field>
      <Field label="Spawn (veh/hr)">
        <input style={styles.input} type="number" min={0} max={1000}
          value={arm.spawnRate}
          onChange={e => onUpdate(arm.id, { spawnRate: Math.max(0, Math.min(1000, Number(e.target.value))) })} />
      </Field>
      <Field label="Yield rule">
        <select style={styles.select} value={arm.yieldRule}
          onChange={e => onUpdate(arm.id, { yieldRule: e.target.value as Arm['yieldRule'] })}>
          <option value="signal">Signal</option>
          <option value="stop">Stop</option>
          <option value="yield">Yield</option>
          <option value="uncontrolled">Uncontrolled</option>
        </select>
      </Field>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          style={{ ...styles.btn, flex: 1, opacity: arm.inboundLanes.length < 4 ? 1 : 0.4 }}
          disabled={arm.inboundLanes.length >= 4}
          onClick={onAddInbound}
        >+ Inbound</button>
        <button
          style={{ ...styles.btn, flex: 1, opacity: arm.outboundLanes.length < 4 ? 1 : 0.4 }}
          disabled={arm.outboundLanes.length >= 4}
          onClick={onAddOutbound}
        >+ Outbound</button>
      </div>
      <button
        style={{ ...styles.dangerBtn, opacity: canRemove ? 1 : 0.4 }}
        disabled={!canRemove}
        onClick={onRemove}
      >
        Remove arm
      </button>
    </div>
  )
}

function LaneFields({ arm, lane, isInbound, onUpdate }: {
  arm: Arm
  lane: Lane
  isInbound: boolean
  onUpdate: (changes: Partial<Omit<Lane, 'id' | 'index'>>) => void
}) {
  const allMovements = ['left', 'straight', 'right', 'u-turn'] as const
  const allowed = lane.allowedMovements ?? []

  function toggle(m: typeof allMovements[number]) {
    const has = allowed.includes(m)
    if (has && allowed.length === 1) return
    onUpdate({ allowedMovements: has ? allowed.filter(x => x !== m) : [...allowed, m] })
  }

  const totalArmWidth = [...arm.inboundLanes, ...arm.outboundLanes].reduce((s, l) => s + l.width, 0)
  const canUTurn = totalArmWidth >= 7

  return (
    <div style={styles.fields}>
      <Field label="Width (m)">
        <input style={styles.input} type="number" min={2.5} max={5.0} step={0.1}
          value={lane.width.toFixed(1)}
          onChange={e => onUpdate({ width: Math.max(2.5, Math.min(5.0, Number(e.target.value))) })} />
      </Field>
      {isInbound && (
        <Field label="Movements">
          <div style={{ display: 'flex', gap: 6 }}>
            {allMovements.filter(m => m !== 'u-turn' || canUTurn).map(m => (
              <button
                key={m}
                style={{
                  ...styles.toggleBtn,
                  background: allowed.includes(m) ? '#f59e0b' : '#2a2a35',
                  color: allowed.includes(m) ? '#0f0f11' : '#e0e0e0',
                }}
                onClick={() => toggle(m)}
              >
                {m === 'left' ? 'L' : m === 'straight' ? 'S' : m === 'right' ? 'R' : 'U'}
              </button>
            ))}
          </div>
        </Field>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  )
}

const styles = {
  panel: {
    position: 'absolute' as const,
    top: 0, right: 0, bottom: 0,
    width: 220,
    background: '#16161f',
    borderLeft: '1px solid #2a2a35',
    display: 'flex',
    flexDirection: 'column' as const,
    fontSize: 12,
    zIndex: 10,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    borderBottom: '1px solid #2a2a35',
  },
  title: { color: '#e0e0e0', fontWeight: 600, fontSize: 13 },
  closeBtn: {
    background: 'none', border: 'none', color: '#888',
    cursor: 'pointer', fontSize: 14, padding: '0 2px',
  },
  fields: {
    padding: '12px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 10,
    overflowY: 'auto' as const,
  },
  field: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
  },
  label: { color: '#888', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.04em' },
  input: {
    background: '#2a2a35',
    border: '1px solid #3a3a48',
    borderRadius: 4,
    color: '#e0e0e0',
    padding: '4px 8px',
    fontSize: 12,
    width: '100%',
  } as React.CSSProperties,
  select: {
    background: '#2a2a35',
    border: '1px solid #3a3a48',
    borderRadius: 4,
    color: '#e0e0e0',
    padding: '4px 8px',
    fontSize: 12,
    width: '100%',
    cursor: 'pointer',
  } as React.CSSProperties,
  toggleBtn: {
    padding: '4px 8px',
    border: '1px solid #3a3a48',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 600,
    minWidth: 28,
  } as React.CSSProperties,
  btn: {
    padding: '5px 8px',
    background: '#2a2a35',
    border: '1px solid #3a3a48',
    borderRadius: 4,
    color: '#e0e0e0',
    cursor: 'pointer',
    fontSize: 11,
  } as React.CSSProperties,
  dangerBtn: {
    marginTop: 8,
    padding: '6px 10px',
    background: '#3a1a1a',
    border: '1px solid #5a2a2a',
    borderRadius: 4,
    color: '#ff6b6b',
    cursor: 'pointer',
    fontSize: 12,
    width: '100%',
  } as React.CSSProperties,
}
