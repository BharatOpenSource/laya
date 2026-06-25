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
  stage: 'green' | 'amber' | 'allred'
  timeRemaining: number
}

// Signal lights sit ON the arm centreline, 20m from center — clearly inside the arm's
// road space with zero perpendicular offset. In a + junction, North light is on the
// North road, East on the East road, etc. No corner ambiguity possible.
const SIGNAL_ALONG_M = 20   // metres from center along the arm centreline

type ArmType = RoadGraph['intersection']['arms'][0]

function signalIndicatorPos(arm: ArmType, cx: number, cy: number): { sx: number; sy: number } {
  const rad   = arm.angle * Math.PI / 180
  const along = SIGNAL_ALONG_M * SCALE
  return {
    sx: cx + along * Math.sin(rad),
    sy: cy - along * Math.cos(rad),
  }
}

function drawTrafficLight(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  arm: ArmType,
  signalData: SignalData,
) {
  const isGreen = signalData.stage === 'green' && signalData.greenArmIds.includes(arm.id)
  const isAmber = signalData.stage === 'amber' && signalData.greenArmIds.includes(arm.id)
  const isRed   = !isGreen && !isAmber

  // Rotate the light box to lie along the arm direction so it sits neatly on the road.
  // For N/S arms the box is portrait (taller); for E/W it rotates to landscape.
  const rad = arm.angle * Math.PI / 180

  ctx.save()
  ctx.translate(sx, sy)
  ctx.rotate(rad)   // arm angle: 0=N, 90=E, 180=S, 270=W

  const boxW = 14
  const boxH = 42
  const r    = 5
  const gap  = 13

  // Housing
  ctx.fillStyle = '#0e0e18'
  ctx.strokeStyle = '#2a2a40'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, 4)
  ctx.fill()
  ctx.stroke()

  // Red (top = toward arm end = away from center)
  ctx.fillStyle = isRed ? '#ff3030' : '#250505'
  if (isRed) { ctx.shadowColor = '#ff3030'; ctx.shadowBlur = 12 }
  ctx.beginPath(); ctx.arc(0, -gap, r, 0, Math.PI * 2); ctx.fill()
  ctx.shadowBlur = 0

  // Amber (middle)
  ctx.fillStyle = isAmber ? '#ffaa00' : '#1a1000'
  if (isAmber) { ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 12 }
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill()
  ctx.shadowBlur = 0

  // Green (bottom = toward center / stop line)
  ctx.fillStyle = isGreen ? '#00e050' : '#001505'
  if (isGreen) { ctx.shadowColor = '#00e050'; ctx.shadowBlur = 14 }
  ctx.beginPath(); ctx.arc(0, gap, r, 0, Math.PI * 2); ctx.fill()
  ctx.shadowBlur = 0

  // Countdown — always drawn upright regardless of arm rotation
  ctx.restore()  // ← back to screen coords before writing text

  const timerColor = isGreen ? '#00e050' : isAmber ? '#ffaa00' : '#ff3030'
  const secs = Math.ceil(signalData.timeRemaining)
  ctx.fillStyle = timerColor
  ctx.font = 'bold 9px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(String(secs), sx, sy + boxH / 2 + 4)
  ctx.textBaseline = 'alphabetic'
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
    const len   = arm.length * SCALE
    const stopY = -arm.stopLineOffset * SCALE

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
    ctx.moveTo(-totalOut, 0); ctx.lineTo(-totalOut, -len)
    ctx.moveTo(totalIn, 0);   ctx.lineTo(totalIn, -len)
    ctx.stroke()

    // Stop line
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(0, stopY); ctx.lineTo(totalIn, stopY); ctx.stroke()

    ctx.restore()
  }

  // Center box (drawn after roads, on top of arm bodies near center)
  const maxStop = Math.max(...graph.intersection.arms.map(a => a.stopLineOffset), 5)
  const boxSize = maxStop * SCALE
  ctx.fillStyle = '#1a1a28'
  ctx.fillRect(cx - boxSize, cy - boxSize, boxSize * 2, boxSize * 2)

  // Traffic lights — drawn in screen coords AFTER center box so they're always on top
  if (signalData) {
    for (const arm of graph.intersection.arms) {
      if (arm.yieldRule !== 'signal') continue
      const { sx, sy } = signalIndicatorPos(arm, cx, cy)
      drawTrafficLight(ctx, sx, sy, arm, signalData)
    }
  }

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
