import type { Movement } from '../types/graph'

interface Props {
  cx: number
  cy: number
  movement: Movement
  active: boolean
  onClick: () => void
}

// Compact arrow paths (~10px span). Shaft toward +Y (toward center). Left bends +X, right bends -X.
const PATHS: Record<Movement, string> = {
  straight: 'M 0 -5 L 0 5 M -2.5 2.5 L 0 5 L 2.5 2.5',
  left:     'M 0 -5 L 0 0 L 5 0 M 2.5 -2.5 L 5 0 L 2.5 2.5',
  right:    'M 0 -5 L 0 0 L -5 0 M -2.5 -2.5 L -5 0 L -2.5 2.5',
  'u-turn': 'M 0 -5 L 0 0 Q 0 5 4 5 Q 8 5 8 0 L 8 -5 M 5.5 -3 L 8 -5 L 10.5 -3',
}

export function LaneArrow({ cx, cy, movement, active, onClick }: Props) {
  return (
    <path
      d={PATHS[movement]}
      transform={`translate(${cx}, ${cy})`}
      stroke="#ffffff"
      strokeWidth={active ? 1.5 : 1}
      fill="none"
      opacity={active ? 1 : 0.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ cursor: 'pointer' }}
      onClick={(e) => { e.stopPropagation(); onClick() }}
    />
  )
}
