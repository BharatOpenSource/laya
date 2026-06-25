/// <reference lib="webworker" />
import { nanoid } from 'nanoid'
import { deriveConnections } from '../graph/connections'
import type { Arm, Connection, RoadGraph, VehicleType } from '../types/graph'
import type { ChaosParams } from '../store/sim'
import {
  inboundEntryPos, inboundStopPos,
  outboundStopPos, outboundExitPos,
  lerp, buildCrossingPath, crossingPos, crossingHeading,
  type CrossingPath,
} from './geometry'
import { sampleVehicleType, sampleSpeed, VEHICLE_CONFIGS } from './vehicleTypes'

// ── Agent ──────────────────────────────────────────────────────────────────

type Phase = 'approaching' | 'crossing' | 'exiting' | 'done'

interface Agent {
  id: string
  type: VehicleType
  phase: Phase
  fromArmId: string
  fromLaneIndex: number
  toArmId: string
  toLaneIndex: number
  progress: number
  speed: number
  targetSpeed: number
  // Stage 6 fields
  waiting: boolean      // held at stop line (red signal or yield pause)
  yieldTimer: number    // seconds remaining in yield pause
  blockedTime: number   // seconds spent below 30% targetSpeed (overtake trigger)
}

// ── State ──────────────────────────────────────────────────────────────────

let graph: RoadGraph | null = null
let params: ChaosParams = {
  speedVariance: 50, signalIgnore: 50,
  laneIndiscipline: 50, gapAggression: 50, yieldIgnore: 50,
}
let connections: Connection[] = []
let agents = new Map<string, Agent>()
let spawnTimers = new Map<string, number>()
const crossingPaths = new Map<string, CrossingPath>()
let running = false
let initialized = false
let tickCount = 0
let lastTime = 0

// Signal state machine
let signal: { phaseIndex: number; timer: number; isAmber: boolean } | null = null
let signalsEnabled = true

// ── Signal machine ─────────────────────────────────────────────────────────

function initSignal() {
  if (!graph?.signalPlan?.phases.length) { signal = null; return }
  signal = { phaseIndex: 0, timer: graph.signalPlan.phases[0].duration, isAmber: false }
}

function updateSignal(dt: number) {
  if (!signal || !graph?.signalPlan) return
  const plan = graph.signalPlan
  signal.timer -= dt
  if (signal.timer > 0) return
  if (!signal.isAmber) {
    signal.isAmber = true
    signal.timer = plan.amberDuration
  } else {
    signal.isAmber = false
    signal.phaseIndex = (signal.phaseIndex + 1) % plan.phases.length
    signal.timer = plan.phases[signal.phaseIndex].duration
  }
}

function isArmGreen(armId: string): boolean {
  if (!signalsEnabled) return true               // signals disabled globally
  if (!graph?.signalPlan || !signal) return true // uncontrolled intersection
  if (signal.isAmber) return false
  return graph.signalPlan.phases[signal.phaseIndex].greenArmIds.includes(armId)
}

function currentSignalData(): { greenArmIds: string[]; isAmber: boolean } | null {
  if (!signalsEnabled || !graph?.signalPlan || !signal) return null
  if (signal.isAmber) return { greenArmIds: [], isAmber: true }
  return {
    greenArmIds: graph.signalPlan.phases[signal.phaseIndex].greenArmIds,
    isAmber: false,
  }
}

// ── Geometry helpers ───────────────────────────────────────────────────────

function findArm(id: string): Arm {
  return graph!.intersection.arms.find(a => a.id === id)!
}

function getCrossingPath(agent: Agent): CrossingPath {
  let path = crossingPaths.get(agent.id)
  if (!path) {
    path = buildCrossingPath(
      findArm(agent.fromArmId), agent.fromLaneIndex,
      findArm(agent.toArmId),   agent.toLaneIndex,
    )
    crossingPaths.set(agent.id, path)
  }
  return path
}

function phaseLength(agent: Agent): number {
  const from = findArm(agent.fromArmId)
  const to   = findArm(agent.toArmId)
  switch (agent.phase) {
    case 'approaching': return Math.max(0.1, from.length - from.stopLineOffset)
    case 'crossing':    return Math.max(0.1, getCrossingPath(agent).arcLength)
    case 'exiting':     return Math.max(0.1, to.length - to.stopLineOffset)
    default: return 0.1
  }
}

function agentState(agent: Agent) {
  const from = findArm(agent.fromArmId)
  const to   = findArm(agent.toArmId)
  const t    = agent.progress
  switch (agent.phase) {
    case 'approaching': {
      const a = inboundEntryPos(from, agent.fromLaneIndex)
      const b = inboundStopPos(from, agent.fromLaneIndex)
      return { id: agent.id, type: agent.type, ...lerp(a, b, t), heading: (from.angle + 180) % 360 }
    }
    case 'crossing': {
      const path = getCrossingPath(agent)
      return { id: agent.id, type: agent.type, ...crossingPos(path, t), heading: crossingHeading(path, t) }
    }
    case 'exiting': {
      const a = outboundStopPos(to, agent.toLaneIndex)
      const b = outboundExitPos(to, agent.toLaneIndex)
      return { id: agent.id, type: agent.type, ...lerp(a, b, t), heading: to.angle }
    }
    default:
      return { id: agent.id, type: agent.type, x: 0, y: 0, heading: 0 }
  }
}

// ── Following distance ─────────────────────────────────────────────────────

function vehicleHalfLen(type: VehicleType) { return VEHICLE_CONFIGS[type].length / 2 }

function laneKey(agent: Agent): string | null {
  if (agent.phase === 'approaching') return `in:${agent.fromArmId}:${agent.fromLaneIndex}`
  if (agent.phase === 'exiting')     return `out:${agent.toArmId}:${agent.toLaneIndex}`
  return null
}

function effectiveSpeed(agent: Agent): number {
  if (agent.waiting || agent.yieldTimer > 0) return 0

  const key = laneKey(agent)
  if (!key) return agent.targetSpeed

  // gapAggression shrinks the safe gap and blend zone
  const safeGap   = 1.5 - (params.gapAggression / 100) * 1.2   // 1.5m → 0.3m
  const blendZone = 6   - (params.gapAggression / 100) * 4      // 6m → 2m
  const minGap    = vehicleHalfLen(agent.type) + safeGap

  const len = phaseLength(agent)
  let closestGap = Infinity
  let aheadSpeed = Infinity

  for (const other of agents.values()) {
    if (other.id === agent.id || laneKey(other) !== key) continue
    if (other.progress <= agent.progress) continue
    const gap = (other.progress - agent.progress) * len - vehicleHalfLen(other.type) - minGap
    if (gap < closestGap) { closestGap = gap; aheadSpeed = other.speed }
  }

  if (closestGap <= 0) return 0
  if (closestGap < blendZone) {
    const blend = Math.max(0, closestGap / blendZone)
    return Math.min(agent.targetSpeed, aheadSpeed * (1 - blend) + agent.targetSpeed * blend)
  }
  return agent.targetSpeed
}

// ── Lane indiscipline (overtaking) ─────────────────────────────────────────

function tryLaneSwitch(agent: Agent): boolean {
  if (!graph) return false
  const arm = findArm(agent.fromArmId)
  const candidates = [agent.fromLaneIndex - 1, agent.fromLaneIndex + 1].filter(
    i => i >= 0 && i < arm.inboundLanes.length && i !== agent.fromLaneIndex
  )
  for (const newLane of candidates) {
    const lane = arm.inboundLanes[newLane]
    const hasConn = connections.some(
      c => c.fromArmId === arm.id && c.fromLaneId === lane.id && c.toArmId === agent.toArmId
    )
    if (hasConn) {
      agent.fromLaneIndex = newLane
      crossingPaths.delete(agent.id) // rebuild crossing path for new lane
      return true
    }
  }
  return false
}

// ── Compliance checks (signal + yield) ────────────────────────────────────

const STOP_CLAMP = 0.97  // hold position: 97% of approaching phase = just before stop line

function applyCompliance(agent: Agent, dt: number) {
  if (agent.phase !== 'approaching') return

  // ── yield timer countdown ──
  if (agent.yieldTimer > 0) {
    agent.yieldTimer = Math.max(0, agent.yieldTimer - dt)
    agent.waiting = agent.yieldTimer > 0
    return
  }

  // Only act when close to the stop line
  if (agent.progress < 0.9) return

  const arm = findArm(agent.fromArmId)

  // ── Signal compliance ──
  if (arm.yieldRule === 'signal') {
    if (!isArmGreen(arm.id)) {
      // Red or amber: decide once whether to wait
      if (!agent.waiting) {
        if (Math.random() * 100 >= params.signalIgnore) {
          // Respects signal — wait
          agent.waiting = true
        }
        // else: ignores signal, carries on
      }
      if (agent.waiting) {
        agent.progress = Math.min(agent.progress, STOP_CLAMP)
      }
    } else {
      // Signal is green — release
      agent.waiting = false
    }
    return
  }

  // ── Yield / stop / uncontrolled compliance ──
  const isYieldArm = arm.yieldRule !== 'uncontrolled' || true // all non-signal arms get yield check
  if (isYieldArm && !agent.waiting) {
    if (Math.random() * 100 >= params.yieldIgnore) {
      const base = arm.yieldRule === 'stop' ? 3.0
                 : arm.yieldRule === 'yield' ? 1.0
                 : 0.5  // uncontrolled
      agent.yieldTimer = base * (0.5 + Math.random())
      agent.waiting = true
      agent.progress = Math.min(agent.progress, STOP_CLAMP)
    }
  }
}

// ── Tick ───────────────────────────────────────────────────────────────────

function advanceAgents(dt: number) {
  for (const agent of agents.values()) {
    // Signal + yield compliance (may set waiting / yieldTimer)
    applyCompliance(agent, dt)

    // Speed from following distance model (returns 0 if waiting)
    agent.speed = effectiveSpeed(agent)

    // Lane indiscipline — blocked agents may switch lanes to overtake
    if (agent.phase === 'approaching' && !agent.waiting) {
      if (agent.speed < agent.targetSpeed * 0.3) {
        agent.blockedTime += dt
        if (agent.blockedTime > 1.5 && Math.random() * 100 < params.laneIndiscipline) {
          if (tryLaneSwitch(agent)) agent.blockedTime = 0
        }
      } else {
        agent.blockedTime = 0
      }
    }

    if (agent.waiting) continue

    const len = phaseLength(agent)
    agent.progress += (agent.speed * dt) / len

    while (agent.progress >= 1 && agent.phase !== 'done') {
      agent.progress -= 1
      if (agent.phase === 'approaching') { agent.phase = 'crossing'; agent.waiting = false }
      else if (agent.phase === 'crossing')  agent.phase = 'exiting'
      else if (agent.phase === 'exiting')   agent.phase = 'done'
    }
  }
}

function tick() {
  if (!running || !graph) return
  const now = Date.now()
  const dt = Math.min((now - lastTime) / 1000, 0.05)
  lastTime = now

  updateSignal(dt)
  updateSpawnTimers(dt)
  advanceAgents(dt)

  for (const [id, agent] of agents) {
    if (agent.phase === 'done') { agents.delete(id); crossingPaths.delete(id) }
  }

  self.postMessage({
    type: 'frame',
    tick: tickCount++,
    agents: [...agents.values()].map(agentState),
    signalData: currentSignalData(),
  })
  if (running) setTimeout(tick, 0)
}

// ── Spawn ──────────────────────────────────────────────────────────────────

function initSpawnTimers() {
  spawnTimers.clear()
  if (!graph) return
  for (const arm of graph.intersection.arms)
    for (let i = 0; i < arm.inboundLanes.length; i++)
      spawnTimers.set(`${arm.id}-${i}`, spawnInterval(arm) * Math.random())
}

function spawnInterval(arm: Arm): number {
  const rate = arm.spawnRate / arm.inboundLanes.length
  return rate > 0 ? 3600 / rate : Infinity
}

function trySpawn(arm: Arm, laneIndex: number) {
  if (!graph) return
  const lane = arm.inboundLanes[laneIndex]
  if (!lane) return
  const laneConns = connections.filter(c => c.fromArmId === arm.id && c.fromLaneId === lane.id)
  if (!laneConns.length) return
  const conn = laneConns[Math.floor(Math.random() * laneConns.length)]
  const toArm = graph.intersection.arms.find(a => a.id === conn.toArmId)
  if (!toArm?.outboundLanes.length) return
  const type = sampleVehicleType()
  const spd = sampleSpeed(type, params.speedVariance)
  const id = nanoid()
  agents.set(id, {
    id, type, phase: 'approaching',
    fromArmId: arm.id, fromLaneIndex: laneIndex,
    toArmId: conn.toArmId, toLaneIndex: conn.toLaneIndex,
    progress: 0, speed: spd, targetSpeed: spd,
    waiting: false, yieldTimer: 0, blockedTime: 0,
  })
}

function updateSpawnTimers(dt: number) {
  if (!graph) return
  for (const arm of graph.intersection.arms) {
    for (let i = 0; i < arm.inboundLanes.length; i++) {
      const key = `${arm.id}-${i}`
      const t = (spawnTimers.get(key) ?? 0) - dt
      if (t <= 0) {
        trySpawn(arm, i)
        spawnTimers.set(key, spawnInterval(arm) * (0.8 + Math.random() * 0.4))
      } else {
        spawnTimers.set(key, t)
      }
    }
  }
}

// ── Message handler ────────────────────────────────────────────────────────

self.onmessage = (e: MessageEvent) => {
  const msg = e.data
  switch (msg.type) {
    case 'init':
      graph = msg.graph; params = msg.params
      connections = deriveConnections(graph!)
      agents.clear(); crossingPaths.clear()
      initSpawnTimers(); initSignal()
      tickCount = 0; initialized = true
      if (!running) { running = true; lastTime = Date.now(); tick() }
      break
    case 'graphUpdate':
      graph = msg.graph
      connections = deriveConnections(graph!)
      agents.clear(); crossingPaths.clear()
      initSpawnTimers(); initSignal()
      break
    case 'setParams':
      params = msg.params
      break
    case 'setSignals':
      signalsEnabled = msg.enabled
      // Release any waiting agents if signals just turned off
      if (!signalsEnabled) {
        for (const agent of agents.values()) {
          if (agent.waiting) agent.waiting = false
        }
      }
      break
    case 'resume':
      if (initialized && !running) { running = true; lastTime = Date.now(); tick() }
      break
    case 'pause':
      running = false
      break
    case 'reset':
      agents.clear(); crossingPaths.clear()
      initSpawnTimers(); initSignal(); tickCount = 0
      break
  }
}
