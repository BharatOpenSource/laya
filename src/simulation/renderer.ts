import type { RoadGraph, VehicleType } from '../types/graph'
import { VEHICLE_CONFIGS } from './vehicleTypes'

const SCALE = 5

interface AgentState {
  id: string
  type: VehicleType
  x: number
  y: number
  heading: number
}

interface SignalData {
  greenArmIds: string[]
  isAmber: boolean
  timeRemaining: number
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  agents: AgentState[],
  graph: RoadGraph,
  W: number,
  H: number,
  signalData: SignalData | null,
): void {
  const cx = W / 2
  const cy = H / 2
  const px = (wx: number) => cx + wx * SCALE
  const py = (wy: number) => cy - wy * SCALE

  ctx.fillStyle = '#0a0a0f'
  ctx.fillRect(0, 0, W, H)

  // Road surfaces
  for (const arm of graph.intersection.arms) {
    const rad = arm.angle * Math.PI / 180
    const totalIn  = arm.inboundLanes.reduce((s, l) => s + l.width, 0) * SCALE
    const totalOut = arm.outboundLanes.reduce((s, l) => s + l.width, 0) * SCALE
    const len    = arm.length * SCALE
    const stopY  = -arm.stopLineOffset * SCALE

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(rad)

    ctx.fillStyle = '#151520'
    ctx.fillRect(-totalOut, -len, totalIn + totalOut, len)

    ctx.strokeStyle = '#2a2a40'
    ctx.lineWidth = 1
    ctx.setLineDash([6, 5])
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -len); ctx.stroke()
    ctx.setLineDash([])

    ctx.strokeStyle = '#222235'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(-totalOut, 0);  ctx.lineTo(-totalOut, -len)
    ctx.moveTo(totalIn, 0);    ctx.lineTo(totalIn, -len)
    ctx.stroke()

    // Stop line
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(0, stopY); ctx.lineTo(totalIn, stopY); ctx.stroke()

    // Signal indicator — dot + countdown timer outside the stop line
    if (arm.yieldRule === 'signal' && signalData) {
      const isGreen = !signalData.isAmber && signalData.greenArmIds.includes(arm.id)
      const color = signalData.isAmber ? '#f59e0b' : isGreen ? '#22c55e' : '#ef4444'
      const dotX = totalIn + 9
      const dotY = stopY

      // Glow dot
      ctx.fillStyle = color
      ctx.shadowColor = color
      ctx.shadowBlur = 8
      ctx.beginPath()
      ctx.arc(dotX, dotY, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0

      // Countdown number below the dot
      const secs = Math.ceil(signalData.timeRemaining)
      ctx.fillStyle = color
      ctx.font = 'bold 8px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(String(secs), dotX, dotY + 7)
      ctx.textBaseline = 'alphabetic'
    }

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

    ctx.save()
    ctx.translate(px(agent.x), py(agent.y))
    ctx.rotate(agent.heading * Math.PI / 180)
    ctx.fillStyle = cfg.color
    ctx.fillRect(-w / 2, -l / 2, w, l)
    ctx.restore()
  }
}
