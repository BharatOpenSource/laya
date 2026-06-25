import { centerBoxSize } from './geometry'
import type { Arm } from '../types/graph'

interface Props {
  arms: Arm[]
}

export function CenterBox({ arms }: Props) {
  const size = centerBoxSize(arms.map(a => a.stopLineOffset))
  return (
    <rect
      x={-size}
      y={-size}
      width={size * 2}
      height={size * 2}
      fill="#1a1a28"
      stroke="#2a2a40"
      strokeWidth={1}
    />
  )
}
