// World-coordinate geometry for the simulation (metres, Y-north, no SVG scale factor).
// Mirrors src/editor/geometry.ts but works in raw metres.
import type { Arm } from '../types/graph'

export interface Point { x: number; y: number }

function rad(angleDeg: number) { return angleDeg * Math.PI / 180 }

// Unit vectors for an arm at angle θ (degrees CW from north), in world Y-up space
export function armDirWorld(arm: Arm): Point {
  return { x: Math.sin(rad(arm.angle)), y: Math.cos(rad(arm.angle)) }
}
// Right perpendicular = inbound lane side (LHT: driver's left when facing center)
export function rightPerpWorld(arm: Arm): Point {
  return { x: Math.cos(rad(arm.angle)), y: -Math.sin(rad(arm.angle)) }
}
// Left perpendicular = outbound lane side
export function leftPerpWorld(arm: Arm): Point {
  return { x: -Math.cos(rad(arm.angle)), y: Math.sin(rad(arm.angle)) }
}

// Arm far end in world coords
export function armEndWorld(arm: Arm): Point {
  const d = armDirWorld(arm)
  return { x: d.x * arm.length, y: d.y * arm.length }
}

// Lane center offset from centerline (metres), for inbound lane at index i (0 = farthest from centerline)
function inboundOffset(arm: Arm, laneIndex: number): number {
  const total = arm.inboundLanes.reduce((s, l) => s + l.width, 0)
  const cumBefore = arm.inboundLanes.slice(0, laneIndex).reduce((s, l) => s + l.width, 0)
  return total - cumBefore - arm.inboundLanes[laneIndex].width / 2
}

function outboundOffset(arm: Arm, laneIndex: number): number {
  const total = arm.outboundLanes.reduce((s, l) => s + l.width, 0)
  const cumBefore = arm.outboundLanes.slice(0, laneIndex).reduce((s, l) => s + l.width, 0)
  return total - cumBefore - arm.outboundLanes[laneIndex].width / 2
}

// Spawn point for inbound lane i (far end of arm)
export function inboundEntryPos(arm: Arm, laneIndex: number): Point {
  const end = armEndWorld(arm)
  const rp = rightPerpWorld(arm)
  const off = inboundOffset(arm, laneIndex)
  return { x: end.x + rp.x * off, y: end.y + rp.y * off }
}

// Stop line position for inbound lane i
export function inboundStopPos(arm: Arm, laneIndex: number): Point {
  const d = armDirWorld(arm)
  const rp = rightPerpWorld(arm)
  const base = { x: d.x * arm.stopLineOffset, y: d.y * arm.stopLineOffset }
  const off = inboundOffset(arm, laneIndex)
  return { x: base.x + rp.x * off, y: base.y + rp.y * off }
}

// Entry point of outbound lane j (at the stop line offset on the outbound side)
export function outboundStopPos(arm: Arm, laneIndex: number): Point {
  const d = armDirWorld(arm)
  const lp = leftPerpWorld(arm)
  const base = { x: d.x * arm.stopLineOffset, y: d.y * arm.stopLineOffset }
  const off = outboundOffset(arm, laneIndex)
  return { x: base.x + lp.x * off, y: base.y + lp.y * off }
}

// Exit point for outbound lane j (far end of arm)
export function outboundExitPos(arm: Arm, laneIndex: number): Point {
  const end = armEndWorld(arm)
  const lp = leftPerpWorld(arm)
  const off = outboundOffset(arm, laneIndex)
  return { x: end.x + lp.x * off, y: end.y + lp.y * off }
}

export function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

export function dist(a: Point, b: Point): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2)
}

// Heading in degrees CW from north, from point a toward point b (world Y-up)
export function headingTo(a: Point, b: Point): number {
  return ((Math.atan2(b.x - a.x, b.y - a.y) * 180 / Math.PI) + 360) % 360
}
