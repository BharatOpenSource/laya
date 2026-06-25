// Pure SVG coordinate helpers for the intersection editor.
// Convention:
//   - Each arm is drawn inside a <g style="transform: rotate(θdeg)"> around SVG origin (0,0)
//   - In local arm coords: arm extends in -Y direction (y=0 = center, y=-length*S = arm end)
//   - Inbound lanes on +X side (driver's left when facing center = +Y direction)
//   - Outbound lanes on -X side
//   - Lane index 0 = leftmost from driver facing intersection = farthest from centerline

export const SCALE = 5 // SVG units per metre

// Cumulative width offsets for a lane array, measured from the far edge inward.
// Returns array of cumulative sums: [0, w0, w0+w1, ...]
export function cumWidths(widths: number[]): number[] {
  const result: number[] = [0]
  for (const w of widths) result.push(result[result.length - 1] + w)
  return result
}

// Total width of a lane array in metres
export function totalWidth(widths: number[]): number {
  return widths.reduce((s, w) => s + w, 0)
}

// X range of inbound lane i in local arm coords (SVG units)
// Index 0 = farthest from centerline (+X side)
export function inboundLaneX(widths: number[], i: number): { x0: number; x1: number } {
  const total = totalWidth(widths)
  const cum = cumWidths(widths)
  return {
    x0: (total - cum[i + 1]) * SCALE,
    x1: (total - cum[i]) * SCALE,
  }
}

// X range of outbound lane i in local arm coords (SVG units)
// Index 0 = farthest from centerline (-X side)
export function outboundLaneX(widths: number[], i: number): { x0: number; x1: number } {
  const total = totalWidth(widths)
  const cum = cumWidths(widths)
  return {
    x0: -(total - cum[i]) * SCALE,
    x1: -(total - cum[i + 1]) * SCALE,
  }
}

// Y position of stop line in local arm coords (SVG units, negative = toward arm end)
export function stopLineY(stopLineOffset: number): number {
  return -stopLineOffset * SCALE
}

// Arrow center position for inbound lane i in local arm coords
// Placed 20px outward from stop line (toward arm end = more negative Y)
export function arrowCenter(
  inboundWidths: number[],
  laneIndex: number,
  stopLineOffset: number,
): { cx: number; cy: number } {
  const { x0, x1 } = inboundLaneX(inboundWidths, laneIndex)
  return {
    cx: (x0 + x1) / 2,
    cy: stopLineY(stopLineOffset) - 20,
  }
}

// Center box half-size: covers the conflict zone up to the max stop line offset
export function centerBoxSize(stopLineOffsets: number[]): number {
  return Math.max(...stopLineOffsets, 5) * SCALE
}
