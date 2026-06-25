import type { Arm, Connection, Movement, RoadGraph } from '../types/graph'

// Angular distance between two angles in degrees, always [0, 180]
function angleDiff(a: number, b: number): number {
  const d = Math.abs(((a - b) + 360) % 360)
  return d > 180 ? 360 - d : d
}

// Find the arm whose angle is closest to target, excluding the source arm
function closestArm(arms: Arm[], target: number, excludeId: string): Arm | null {
  let best: Arm | null = null
  let bestDiff = Infinity
  for (const arm of arms) {
    if (arm.id === excludeId) continue
    const d = angleDiff(arm.angle, target)
    if (d < bestDiff) {
      bestDiff = d
      best = arm
    }
  }
  return best
}

// Given arm angle, compute the expected destination arm angle for each movement.
// inboundHeading: direction vehicles travel when entering (opposite of arm angle).
// Straight → continue in same direction → arm at inboundHeading
// Left      → turn 90° CCW               → arm at (inboundHeading - 90 + 360) % 360
// Right     → turn 90° CW                → arm at (inboundHeading + 90) % 360
// U-turn    → reverse                    → same arm (outbound)
function destinationAngle(armAngle: number, movement: Exclude<Movement, 'u-turn'>): number {
  const inbound = (armAngle + 180) % 360
  if (movement === 'straight') return inbound
  if (movement === 'left')     return (inbound - 90 + 360) % 360
  return (inbound + 90) % 360 // right
}

// Outbound lane index convention:
// straight → match inbound lane index (clamped to available)
// left     → rightmost outbound lane (highest index)
// right    → leftmost outbound lane (index 0)
function outboundLaneIndex(
  movement: Movement,
  inboundIndex: number,
  outboundCount: number,
): number {
  if (movement === 'left' || movement === 'u-turn') return outboundCount - 1
  if (movement === 'right') return 0
  return Math.min(inboundIndex, outboundCount - 1) // straight
}

export function deriveConnections(graph: RoadGraph): Connection[] {
  const { arms } = graph.intersection
  const connections: Connection[] = []

  for (const arm of arms) {
    for (const lane of arm.inboundLanes) {
      for (const movement of lane.allowedMovements ?? []) {
        let toArm: Arm | null

        if (movement === 'u-turn') {
          toArm = arm
        } else {
          const targetAngle = destinationAngle(arm.angle, movement)
          toArm = closestArm(arms, targetAngle, arm.id)
        }

        if (!toArm || toArm.outboundLanes.length === 0) continue

        connections.push({
          fromArmId: arm.id,
          fromLaneId: lane.id,
          movement,
          toArmId: toArm.id,
          toLaneIndex: outboundLaneIndex(movement, lane.index, toArm.outboundLanes.length),
        })
      }
    }
  }

  return connections
}
