/// <reference lib="webworker" />
import { nanoid } from 'nanoid'
import { deriveConnections } from '../graph/connections'
import type { Arm, Connection, RoadGraph, VehicleType } from '../types/graph'
import type { ChaosParams, SpawnConfig } from '../store/sim'
import { DEFAULT_SPAWN_CONFIG } from '../store/sim'
import {
  inboundEntryPos, inboundStopPos,
  outboundStopPos, outboundExitPos,
  lerp, buildCrossingPath, buildPedestrianCrossingPath, crossingPos, crossingHeading,
  type CrossingPath,
} from './geometry'
import { sampleSpeed, VEHICLE_CONFIGS } from './vehicleTypes'

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
let spawnConfig: SpawnConfig = DEFAULT_SPAWN_CONFIG
let running = false
let initialized = false
let tickCount = 0
let lastTime = 0

// Signal state machine
// Signal phases: green → amber → all-red clearance → next green
type SignalStage = 'green' | 'amber' | 'allred'
let signal: { phaseIndex: number; timer: number; stage: SignalStage } | null = null
let signalsEnabled = true

// ── Signal machine ─────────────────────────────────────────────────────────

const ALL_RED_DURATION = 1.5  // seconds of all-red clearance between phases

function initSignal() {
  if (!graph?.signalPlan?.phases.length) { signal = null; return }
  signal = { phaseIndex: 0, timer: graph.signalPlan.phases[0].duration, stage: 'green' }
}

function updateSignal(dt: number) {
  if (!signal || !graph?.signalPlan) return
  const plan = graph.signalPlan
  signal.timer -= dt
  if (signal.timer > 0) return
  // Advance through: green → amber → allred → next green
  if (signal.stage === 'green') {
    signal.stage = 'amber'
    signal.timer = plan.amberDuration
  } else if (signal.stage === 'amber') {
    signal.stage = 'allred'
    signal.timer = ALL_RED_DURATION
  } else {
    // allred → next phase green
    signal.phaseIndex = (signal.phaseIndex + 1) % plan.phases.length
    signal.stage = 'green'
    signal.timer = plan.phases[signal.phaseIndex].duration
  }
}

function isArmGreen(armId: string): boolean {
  if (!signalsEnabled) return true
  if (!graph?.signalPlan || !signal) return true
  if (signal.stage !== 'green') return false
  return graph.signalPlan.phases[signal.phaseIndex].greenArmIds.includes(armId)
}

export type SignalStagePublic = 'green' | 'amber' | 'allred'

function currentSignalData(): {
  greenArmIds: string[]
  stage: SignalStagePublic
  timeRemaining: number
} | null {
  if (!signalsEnabled || !graph?.signalPlan || !signal) return null
  return {
    greenArmIds: signal.stage === 'green'
      ? graph.signalPlan.phases[signal.phaseIndex].greenArmIds
      : [],
    stage: signal.stage,
    timeRemaining: signal.timer,
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
    const green = isArmGreen(arm.id)
    if (!green) {
      if (!agent.waiting && Math.random() * 100 >= params.signalIgnore) {
        agent.waiting = true
      }
      if (agent.waiting) agent.progress = Math.min(agent.progress, STOP_CLAMP)
    } else {
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

// ── Crossing-phase 2D collision avoidance ─────────────────────────────────

// Pairwise proximity check for crossing agents from DIFFERENT source arms only.
// Same-arm pairs travel nearly-parallel paths (adjacent lanes) — they are not
// conflicting trajectories and must not slow each other, or a jam cascades.
// blendFactor kept tight (1.5×) so slowdown only happens when vehicles are
// genuinely close, not across the whole intersection.
function applyCrossingProximity() {
  type CrossingEntry = { agent: Agent; x: number; y: number }
  const crossing: CrossingEntry[] = []

  for (const agent of agents.values()) {
    if (agent.phase !== 'crossing') continue
    const path = getCrossingPath(agent)
    const pos = crossingPos(path, agent.progress)
    crossing.push({ agent, x: pos.x, y: pos.y })
  }

  if (crossing.length < 2) return

  const buffer = 0.4 - (params.gapAggression / 100) * 0.3  // 0.4m → 0.1m at max aggression
  const blendFactor = 1.5  // was 3 — only slow when actually close (not half the intersection away)

  for (let i = 0; i < crossing.length; i++) {
    for (let j = i + 1; j < crossing.length; j++) {
      const a = crossing[i]
      const b = crossing[j]

      // Skip vehicles from the same arm — they travel parallel, not conflicting
      if (a.agent.fromArmId === b.agent.fromArmId) continue

      const dx = b.x - a.x
      const dy = b.y - a.y
      const d = Math.sqrt(dx * dx + dy * dy)
      const minDist = vehicleHalfLen(a.agent.type) + vehicleHalfLen(b.agent.type) + buffer

      if (d >= minDist * blendFactor) continue

      if (d <= minDist) {
        a.agent.speed = 0
        b.agent.speed = 0
      } else {
        const factor = (d - minDist) / (minDist * (blendFactor - 1))
        a.agent.speed = Math.min(a.agent.speed, a.agent.targetSpeed * factor)
        b.agent.speed = Math.min(b.agent.speed, b.agent.targetSpeed * factor)
      }
    }
  }
}

// ── Tick ───────────────────────────────────────────────────────────────────

function advanceAgents(dt: number) {
  // Pass 1 — compliance + lane-following speeds for all agents
  for (const agent of agents.values()) {
    applyCompliance(agent, dt)
    agent.speed = effectiveSpeed(agent)

    if (agent.phase === 'approaching' && !agent.waiting && agent.speed > 0 && agent.progress < 0.80) {
      if (agent.speed < agent.targetSpeed * 0.3) {
        agent.blockedTime += dt
        if (agent.blockedTime > 1.5 && Math.random() * 100 < params.laneIndiscipline) {
          if (tryLaneSwitch(agent)) agent.blockedTime = 0
        }
      } else {
        agent.blockedTime = 0
      }
    }
  }

  // Pass 2 — 2D crossing proximity: may further reduce crossing agents' speeds
  applyCrossingProximity()

  // Pass 3 — advance positions
  for (const agent of agents.values()) {
    if (agent.waiting) continue
    const len = phaseLength(agent)
    agent.progress += (agent.speed * dt) / len

    while (agent.progress >= 1 && agent.phase !== 'done') {
      agent.progress -= 1
      if (agent.phase === 'approaching') { agent.phase = 'crossing'; agent.waiting = false }
      else if (agent.phase === 'crossing') {
        // Pedestrians have no exiting phase — they finish when they cross the road.
        agent.phase = agent.type === 'pedestrian' ? 'done' : 'exiting'
      }
      else if (agent.phase === 'exiting') agent.phase = 'done'
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
  const rate = (arm.spawnRate / arm.inboundLanes.length) * spawnConfig.globalMultiplier
  return rate > 0 ? 3600 / rate : Infinity
}

function sampleType(): VehicleType {
  const weights = spawnConfig.typeWeights
  const total = Object.values(weights).reduce((s, w) => s + w, 0)
  if (total <= 0) return 'car'
  let r = Math.random() * total
  for (const [type, w] of Object.entries(weights) as [VehicleType, number][]) {
    r -= w
    if (r <= 0) return type
  }
  return 'car'
}

// Pedestrians cross the arm perpendicularly at the stop line — no lane routing.
function trySpawnPedestrian(arm: Arm) {
  // Don't spawn if another pedestrian from this arm is just starting — avoids pile-up at t=0.
  for (const agent of agents.values()) {
    if (agent.type === 'pedestrian' && agent.fromArmId === arm.id && agent.progress < 0.1) return
  }
  const spd = sampleSpeed('pedestrian', params.speedVariance)
  const id = nanoid()
  agents.set(id, {
    id, type: 'pedestrian', phase: 'crossing',
    fromArmId: arm.id, fromLaneIndex: 0,
    toArmId: arm.id, toLaneIndex: 0,
    progress: 0, speed: spd, targetSpeed: spd,
    waiting: false, yieldTimer: 0, blockedTime: 0,
  })
  crossingPaths.set(id, buildPedestrianCrossingPath(arm))
}

function trySpawn(arm: Arm, laneIndex: number) {
  if (!graph) return
  const type = sampleType()

  if (type === 'pedestrian') {
    trySpawnPedestrian(arm)
    return
  }

  const lane = arm.inboundLanes[laneIndex]
  if (!lane) return
  const laneConns = connections.filter(c => c.fromArmId === arm.id && c.fromLaneId === lane.id)
  if (!laneConns.length) return
  const conn = laneConns[Math.floor(Math.random() * laneConns.length)]
  const toArm = graph.intersection.arms.find(a => a.id === conn.toArmId)
  if (!toArm?.outboundLanes.length) return
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
      if (msg.spawnConfig) spawnConfig = msg.spawnConfig
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
    case 'setSpawnConfig':
      spawnConfig = msg.config
      break
    case 'setSignalPlan':
      if (graph) {
        graph = { ...graph, signalPlan: msg.plan }
        initSignal()  // restart signal cycle with new timings — agents keep moving
      }
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
