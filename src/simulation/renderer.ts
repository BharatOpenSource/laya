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

// Screen position of the signal indicator for an arm (outside road right edge at stop line)
function signalIndicatorPos(arm: RoadGraph['intersection']['arms'][0], cx: number, cy: number): { sx: number; sy: number } {
  const rad = arm.angle * Math.PI / 180
  const totalIn = arm.inboundLanes.reduce((s, l) => s + l.width, 0) * SCALE
  const stopOffset = arm.stopLineOffset * SCALE

  // Stop line base in screen coords
  const baseSX = cx + stopOffset * Math.sin(rad)
  const baseSY = cy - stopOffset * Math.cos(rad)

  // Right-perp direction in screen (inbound side)
  const rpSX = Math.cos(rad)
  const rpSY = Math.sin(rad)

  // Position just outside the right edge of inbound lanes
  return {
    sx: baseSX + rpSX * (totalIn + 12),
    sy: baseSY + rpSY * (totalIn + 12),
  }
}

// Draw a traffic light (3 circles: red top, amber mid, green bottom) at (sx, sy) in screen space
function drawTrafficLight(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  arm: RoadGraph['intersection']['arms'][0],
  signalData: SignalData,
) {
  const isGreen  = signalData.stage === 'green'  && signalData.greenArmIds.includes(arm.id)
  const isAmber  = signalData.stage === 'amber'  && signalData.greenArmIds.includes(arm.id)
  // allred or another arm's green → this arm is red
  const isRed    = !isGreen && !isAmber

  const boxW = 12
  const boxH = 34
  const r    = 4    // circle radius
  const gap  = 11   // between circle centres

  // Background box
  ctx.fillStyle = '#111118'
  ctx.strokeStyle = '#333345'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(sx - boxW / 2, sy - boxH / 2, boxW, boxH, 3)
  ctx.fill()
  ctx.stroke()

  // Red circle (top)
  const ry = sy - gap
  ctx.fillStyle = isRed ? '#ef4444' : '#2a0a0a'
  if (isRed) { ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 8 }
  ctx.beginPath(); ctx.arc(sx, ry, r, 0, Math.PI * 2); ctx.fill()
  ctx.shadowBlur = 0

  // Amber circle (middle)
  const ay = sy
  ctx.fillStyle = isAmber ? '#f59e0b' : '#1a1200'
  if (isAmber) { ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 8 }
  ctx.beginPath(); ctx.arc(sx, ay, r, 0, Math.PI * 2); ctx.fill()
  ctx.shadowBlur = 0

  // Green circle (bottom)
  const gy = sy + gap
  ctx.fillStyle = isGreen ? '#22c55e' : '#001a08'
  if (isGreen) { ctx.shadowColor = '#22c55e'; ctx.shadowBlur = 10 }
  ctx.beginPath(); ctx.arc(sx, gy, r, 0, Math.PI * 2); ctx.fill()
  ctx.shadowBlur = 0

  // Countdown — show seconds remaining, colored to current state
  const timerColor = isGreen ? '#22c55e' : isAmber ? '#f59e0b' : '#ef4444'
  ctx.fillStyle = timerColor
  ctx.font = 'bold 8px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(Math.ceil(signalData.timeRemaining).toString(), sx, sy + boxH / 2 + 2)
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
