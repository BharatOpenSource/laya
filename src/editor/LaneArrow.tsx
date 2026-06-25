import type { Movement } from '../types/graph'

interface Props {
  cx: number
  cy: number
  movement: Movement
  active: boolean
  onClick: () => void
}

// Arrow paths defined in local coords: shaft points toward +Y (toward center in arm local coords).
// Left = bends to +X (driver's left when going in +Y toward center).
// Right = bends to -X.
const PATHS: Record<Movement, string> = {
  straight: 'M 0 -10 L 0 10 M -4 6 L 0 10 L 4 6',
  left:     'M 0 -10 L 0 0 L 10 0 M 6 -4 L 10 0 L 6 4',
  right:    'M 0 -10 L 0 0 L -10 0 M -6 -4 L -10 0 L -6 4',
  'u-turn': 'M 0 -10 L 0 0 Q 0 10 8 10 Q 16 10 16 0 L 16 -10 M 12 -6 L 16 -10 L 20 -6',
}

export function LaneArrow({ cx, cy, movement, active, onClick }: Props) {
  return (
    <path
      d={PATHS[movement]}
      transform={`translate(${cx}, ${cy})`}
      stroke={active ? '#ffffff' : '#ffffff'}
      strokeWidth={active ? 1.8 : 1.2}
      fill="none"
      opacity={active ? 1 : 0.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ cursor: 'pointer' }}
      onClick={(e) => { e.stopPropagation(); onClick() }}
    />
  )
}
