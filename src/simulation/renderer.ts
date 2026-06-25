import type { RoadGraph, VehicleType } from '../types/graph'
import { VEHICLE_CONFIGS } from './vehicleTypes'

const SCALE = 5  // pixels per metre — matches editor

interface AgentState {
  id: string
  type: VehicleType
  x: number
  y: number
  heading: number
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  agents: AgentState[],
  graph: RoadGraph,
  W: number,
  H: number,
): void {
  const cx = W / 2
  const cy = H / 2

  // World to canvas
  const px = (wx: number) => cx + wx * SCALE
  const py = (wy: number) => cy - wy * SCALE

  // Clear
  ctx.fillStyle = '#0a0a0f'
  ctx.fillRect(0, 0, W, H)

  // Road surfaces (same geometry as SVG editor, in canvas coords)
  for (const arm of graph.intersection.arms) {
    const rad = arm.angle * Math.PI / 180
    const totalIn  = arm.inboundLanes.reduce((s, l)  => s + l.width, 0) * SCALE
    const totalOut = arm.outboundLanes.reduce((s, l) => s + l.width, 0) * SCALE
    const len = arm.length * SCALE

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(rad)

    // Road body (local: arm extends in -Y, inbound on +X, outbound on -X)
    ctx.fillStyle = '#151520'
    ctx.fillRect(-totalOut, -len, totalIn + totalOut, len)

    // Centerline
    ctx.strokeStyle = '#2a2a40'
    ctx.lineWidth = 1
    ctx.setLineDash([6, 5])
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(0, -len)
    ctx.stroke()
    ctx.setLineDash([])

    // Road edge lines
    ctx.strokeStyle = '#222235'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(-totalOut, 0); ctx.lineTo(-totalOut, -len)
    ctx.moveTo(totalIn, 0);   ctx.lineTo(totalIn, -len)
    ctx.stroke()

    // Stop line
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'
    ctx.lineWidth = 2
    const stopY = -arm.stopLineOffset * SCALE
    ctx.beginPath()
    ctx.moveTo(0, stopY)
    ctx.lineTo(totalIn, stopY)
    ctx.stroke()

    ctx.restore()
  }

  // Center box
  const maxStop = Math.max(...graph.intersection.arms.map(a => a.stopLineOffset), 5)
  const boxSize = maxStop * SCALE
  ctx.fillStyle = '#1a1a28'
  ctx.fillRect(cx - boxSize, cy - boxSize, boxSize * 2, boxSize * 2)

  // Agents
  for (const agent of agents) {
    const cfg = VEHICLE_CONFIGS[agent.type]
    const w = cfg.width * SCALE
    const l = cfg.length * SCALE
    const headingRad = agent.heading * Math.PI / 180

    ctx.save()
    ctx.translate(px(agent.x), py(agent.y))
    // rotate so that local -Y (rect top half) points in the travel direction
    ctx.rotate(headingRad)
    ctx.fillStyle = cfg.color
    ctx.fillRect(-w / 2, -l / 2, w, l)
    ctx.restore()
  }
}
