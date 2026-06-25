import { SCALE, inboundLaneX, outboundLaneX, stopLineY, arrowCenter, totalWidth } from './geometry'
import { LaneArrow } from './LaneArrow'
import { useRoadGraphStore } from '../store/roadGraph'
import type { Arm, Lane, Movement } from '../types/graph'

// Arrows stacked vertically along the lane (not side-by-side) to avoid overlap.
// Order: left at top (further from center), straight in middle, right at bottom (closer to center).
const STANDARD_MOVEMENTS: Movement[] = ['left', 'straight', 'right']
const ARROW_Y_OFFSETS: Record<Movement, number> = { left: -14, straight: 0, right: 14, 'u-turn': -28 }

interface Props {
  arm: Arm
  selected: boolean
  selectedLaneId: string | null
  onSelectArm: () => void
  onSelectLane: (laneId: string) => void
}

export function ArmShape({ arm, selected, selectedLaneId, onSelectArm, onSelectLane }: Props) {
  const { updateLane } = useRoadGraphStore()

  const inW = arm.inboundLanes.map(l => l.width)
  const outW = arm.outboundLanes.map(l => l.width)
  const totalIn = totalWidth(inW) * SCALE
  const totalOut = totalWidth(outW) * SCALE
  const armLen = arm.length * SCALE
  const stopY = stopLineY(arm.stopLineOffset)

  function toggleMovement(lane: Lane, movement: Movement) {
    const current = lane.allowedMovements ?? []
    const has = current.includes(movement)
    if (has && current.length === 1) return
    const next = has ? current.filter(m => m !== movement) : [...current, movement]
    updateLane(arm.id, lane.id, { allowedMovements: next })
  }

  return (
    <g
      style={{
        transform: `rotate(${arm.angle}deg)`,
        transformBox: 'view-box',
        transformOrigin: '0 0',
        transition: 'transform 250ms ease-out',
      }}
    >
      {/* Road body */}
      <rect
        x={-totalOut}
        y={-armLen}
        width={totalIn + totalOut}
        height={armLen}
        fill={selected ? '#1e2a3a' : '#181824'}
        stroke={selected ? '#4a8cff' : 'none'}
        strokeWidth={2}
        style={{ cursor: 'pointer' }}
        onClick={(e) => { e.stopPropagation(); onSelectArm() }}
      />

      {/* Inbound lane strips, dividers, and direction arrows */}
      {arm.inboundLanes.map((lane, i) => {
        const { x0, x1 } = inboundLaneX(inW, i)
        const isSelected = lane.id === selectedLaneId
        const { cx, cy } = arrowCenter(inW, i, arm.stopLineOffset)
        return (
          <g key={lane.id}>
            <rect
              x={x0} y={-armLen} width={x1 - x0} height={armLen}
              fill={isSelected ? '#1e3a2a' : 'transparent'}
              stroke="none"
              style={{ cursor: 'pointer' }}
              onClick={(e) => { e.stopPropagation(); onSelectLane(lane.id) }}
            />
            {i < arm.inboundLanes.length - 1 && (
              <line x1={x1} y1={stopY} x2={x1} y2={-armLen}
                stroke="#3a3a55" strokeWidth={1} strokeDasharray="8 6" />
            )}
            {STANDARD_MOVEMENTS.map(movement => (
              <LaneArrow
                key={movement}
                cx={cx}
                cy={cy + ARROW_Y_OFFSETS[movement]}
                movement={movement}
                active={(lane.allowedMovements ?? []).includes(movement)}
                onClick={() => toggleMovement(lane, movement)}
              />
            ))}
          </g>
        )
      })}

      {/* Outbound lane strips and dividers */}
      {arm.outboundLanes.map((lane, i) => {
        const { x0, x1 } = outboundLaneX(outW, i)
        const isSelected = lane.id === selectedLaneId
        return (
          <g key={lane.id}>
            <rect
              x={x0} y={-armLen} width={x1 - x0} height={armLen}
              fill={isSelected ? '#1e3a2a' : 'transparent'}
              stroke="none"
              style={{ cursor: 'pointer' }}
              onClick={(e) => { e.stopPropagation(); onSelectLane(lane.id) }}
            />
            {i < arm.outboundLanes.length - 1 && (
              <line x1={x1} y1={0} x2={x1} y2={-armLen}
                stroke="#3a3a55" strokeWidth={1} strokeDasharray="8 6" />
            )}
          </g>
        )
      })}

      {/* Centerline divider */}
      <line x1={0} y1={0} x2={0} y2={-armLen} stroke="#4a4a66" strokeWidth={1} strokeDasharray="4 4" />

      {/* Arm edge borders */}
      <line x1={-totalOut} y1={0} x2={-totalOut} y2={-armLen} stroke="#2a2a40" strokeWidth={1.5} />
      <line x1={totalIn} y1={0} x2={totalIn} y2={-armLen} stroke="#2a2a40" strokeWidth={1.5} />
      <line x1={-totalOut} y1={-armLen} x2={totalIn} y2={-armLen} stroke="#2a2a40" strokeWidth={1.5} />

      {/* Stop line — inbound side only */}
      <line x1={0} y1={stopY} x2={totalIn} y2={stopY} stroke="#ffffff" strokeWidth={2} opacity={0.7} />
    </g>
  )
}
