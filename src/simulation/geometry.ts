// World-coordinate geometry for the simulation (metres, Y-north, no SVG scale factor).
import type { Arm } from '../types/graph'

export interface Point { x: number; y: number }

// Quadratic Bezier crossing path.
// p1 = null means straight line (parallel arm directions = straight-through movement).
export interface CrossingPath {
  p0: Point
  p1: Point | null
  p2: Point
  arcLength: number  // precomputed approximate arc length in metres
}

function rad(angleDeg: number) { return angleDeg * Math.PI / 180 }

export function armDirWorld(arm: Arm): Point {
  return { x: Math.sin(rad(arm.angle)), y: Math.cos(rad(arm.angle)) }
}
export function rightPerpWorld(arm: Arm): Point {
  return { x: Math.cos(rad(arm.angle)), y: -Math.sin(rad(arm.angle)) }
}
export function leftPerpWorld(arm: Arm): Point {
  return { x: -Math.cos(rad(arm.angle)), y: Math.sin(rad(arm.angle)) }
}
export function armEndWorld(arm: Arm): Point {
  const d = armDirWorld(arm)
  return { x: d.x * arm.length, y: d.y * arm.length }
}

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

export function inboundEntryPos(arm: Arm, laneIndex: number): Point {
  const end = armEndWorld(arm)
  const rp = rightPerpWorld(arm)
  const off = inboundOffset(arm, laneIndex)
  return { x: end.x + rp.x * off, y: end.y + rp.y * off }
}

export function inboundStopPos(arm: Arm, laneIndex: number): Point {
  const d = armDirWorld(arm)
  const rp = rightPerpWorld(arm)
  const base = { x: d.x * arm.stopLineOffset, y: d.y * arm.stopLineOffset }
  const off = inboundOffset(arm, laneIndex)
  return { x: base.x + rp.x * off, y: base.y + rp.y * off }
}

export function outboundStopPos(arm: Arm, laneIndex: number): Point {
  const d = armDirWorld(arm)
  const lp = leftPerpWorld(arm)
  const base = { x: d.x * arm.stopLineOffset, y: d.y * arm.stopLineOffset }
  const off = outboundOffset(arm, laneIndex)
  return { x: base.x + lp.x * off, y: base.y + lp.y * off }
}

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

export function headingTo(a: Point, b: Point): number {
  return ((Math.atan2(b.x - a.x, b.y - a.y) * 180 / Math.PI) + 360) % 360
}

// ── Bezier crossing path ────────────────────────────────────────────────────

// Compute the quadratic Bezier control point for a turn.
//
// Tangent conditions for a quadratic Bezier P0→P1→P2:
//   At t=0: tangent direction = P1 - P0 = s * d0     (inbound travel direction)
//   At t=1: tangent direction = P2 - P1 = t * outDir  (outbound travel direction)
//
// Solving: d0.x*s + outDir.x*t = dx,  d0.y*s + outDir.y*t = dy
// → det = d0.x*outDir.y - d0.y*outDir.x
// → s = (dx*outDir.y - dy*outDir.x) / det
// → P1 = P0 + s*d0
//
// If det ≈ 0 (parallel directions = straight movement) → return null.
function controlPoint(p0: Point, d0: Point, p2: Point, outDir: Point): Point | null {
  const dx = p2.x - p0.x
  const dy = p2.y - p0.y
  const det = d0.x * outDir.y - d0.y * outDir.x
  if (Math.abs(det) < 1e-6) return null
  const s = (dx * outDir.y - dy * outDir.x) / det
  if (s <= 0) return null
  return { x: p0.x + s * d0.x, y: p0.y + s * d0.y }
}

function bezierPoint(p0: Point, p1: Point, p2: Point, t: number): Point {
  const q0 = lerp(p0, p1, t)
  const q1 = lerp(p1, p2, t)
  return lerp(q0, q1, t)
}

// Approximate arc length using 16-segment subdivision
function approxArcLength(p0: Point, p1: Point | null, p2: Point): number {
  if (!p1) return dist(p0, p2)
  let len = 0
  let prev = p0
  const steps = 16
  for (let i = 1; i <= steps; i++) {
    const curr = bezierPoint(p0, p1, p2, i / steps)
    len += dist(prev, curr)
    prev = curr
  }
  return len
}

// Build the full crossing path for an agent crossing the center box.
export function buildCrossingPath(
  fromArm: Arm,
  fromLaneIndex: number,
  toArm: Arm,
  toLaneIndex: number,
): CrossingPath {
  const p0 = inboundStopPos(fromArm, fromLaneIndex)
  const p2 = outboundStopPos(toArm, toLaneIndex)

  // d0 = inbound travel direction (toward center)
  const d0: Point = { x: -Math.sin(rad(fromArm.angle)), y: -Math.cos(rad(fromArm.angle)) }
  // outDir = outbound travel direction (away from center)
  const outDir: Point = { x: Math.sin(rad(toArm.angle)), y: Math.cos(rad(toArm.angle)) }

  const p1 = controlPoint(p0, d0, p2, outDir)
  return { p0, p1, p2, arcLength: approxArcLength(p0, p1, p2) }
}

// Position on crossing path at progress t ∈ [0,1]
export function crossingPos(path: CrossingPath, t: number): Point {
  if (!path.p1) return lerp(path.p0, path.p2, t)
  return bezierPoint(path.p0, path.p1, path.p2, t)
}

// Heading (degrees CW from north) on crossing path at progress t
export function crossingHeading(path: CrossingPath, t: number): number {
  if (!path.p1) return headingTo(path.p0, path.p2)
  // Derivative of quadratic Bezier: 2(1-t)(P1-P0) + 2t(P2-P1)
  const dt = 1e-3
  const t2 = Math.min(t + dt, 1)
  const t1 = Math.max(t - dt, 0)
  const a = crossingPos(path, t1)
  const b = crossingPos(path, t2)
  return headingTo(a, b)
}
