/// <reference lib="webworker" />
import { nanoid } from 'nanoid'
import { deriveConnections } from '../graph/connections'
import type { Arm, Connection, RoadGraph, VehicleType } from '../types/graph'
import type { ChaosParams } from '../store/sim'
import {
  inboundEntryPos, inboundStopPos,
  outboundStopPos, outboundExitPos,
  lerp,
  buildCrossingPath, crossingPos, crossingHeading,
  type CrossingPath,
} from './geometry'
import { sampleVehicleType, sampleSpeed } from './vehicleTypes'

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
  progress: number    // 0–1 within current phase
  speed: number       // m/s
}

// ── State ──────────────────────────────────────────────────────────────────

let graph: RoadGraph | null = null
let params: ChaosParams = { speedVariance: 50, signalIgnore: 50, laneIndiscipline: 50, gapAggression: 50, yieldIgnore: 50 }
let connections: Connection[] = []
let agents = new Map<string, Agent>()
let spawnTimers = new Map<string, number>()  // key = `${armId}-${laneIndex}`
let running = false
let initialized = false
let tickCount = 0
let lastTime = 0

// ── Geometry helpers ───────────────────────────────────────────────────────

function findArm(id: string): Arm {
  return graph!.intersection.arms.find(a => a.id === id)!
}

// Cached crossing paths — rebuilt when graph changes, keyed by agent id
const crossingPaths = new Map<string, CrossingPath>()

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

function agentState(agent: Agent): { id: string; type: VehicleType; x: number; y: number; heading: number } {
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

// ── Spawn ──────────────────────────────────────────────────────────────────

function initSpawnTimers() {
  spawnTimers.clear()
  if (!graph) return
  for (const arm of graph.intersection.arms) {
    for (let i = 0; i < arm.inboundLanes.length; i++) {
      // Stagger initial spawn to avoid simultaneous arrivals
      const interval = spawnInterval(arm)
      spawnTimers.set(`${arm.id}-${i}`, interval * Math.random())
    }
  }
}

function spawnInterval(arm: Arm): number {
  const laneRate = arm.spawnRate / arm.inboundLanes.length  // veh/hr per lane
  if (laneRate <= 0) return Infinity
  return 3600 / laneRate  // seconds
}

function trySpawn(arm: Arm, laneIndex: number) {
  if (!graph) return
  const lane = arm.inboundLanes[laneIndex]
  if (!lane) return

  // Find a valid connection from this lane
  const laneConns = connections.filter(c => c.fromArmId === arm.id && c.fromLaneId === lane.id)
  if (laneConns.length === 0) return

  const conn = laneConns[Math.floor(Math.random() * laneConns.length)]
  const toArm = graph.intersection.arms.find(a => a.id === conn.toArmId)
  if (!toArm || toArm.outboundLanes.length === 0) return

  const type = sampleVehicleType()
  agents.set(nanoid(), {
    id: nanoid(),
    type,
    phase: 'approaching',
    fromArmId: arm.id,
    fromLaneIndex: laneIndex,
    toArmId: conn.toArmId,
    toLaneIndex: conn.toLaneIndex,
    progress: 0,
    speed: sampleSpeed(type, params.speedVariance),
  })
}

function updateSpawnTimers(dt: number) {
  if (!graph) return
  for (const arm of graph.intersection.arms) {
    for (let i = 0; i < arm.inboundLanes.length; i++) {
      const key = `${arm.id}-${i}`
      const timer = (spawnTimers.get(key) ?? 0) - dt
      if (timer <= 0) {
        trySpawn(arm, i)
        const interval = spawnInterval(arm)
        // ±20% jitter
        spawnTimers.set(key, interval * (0.8 + Math.random() * 0.4))
      } else {
        spawnTimers.set(key, timer)
      }
    }
  }
}

// ── Tick ───────────────────────────────────────────────────────────────────

function advanceAgents(dt: number) {
  for (const agent of agents.values()) {
    const len = phaseLength(agent)
    agent.progress += (agent.speed * dt) / len

    while (agent.progress >= 1 && agent.phase !== 'done') {
      agent.progress -= 1
      if (agent.phase === 'approaching') agent.phase = 'crossing'
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

  updateSpawnTimers(dt)
  advanceAgents(dt)

  for (const [id, agent] of agents) {
    if (agent.phase === 'done') {
      agents.delete(id)
      crossingPaths.delete(id)
    }
  }

  const states = [...agents.values()].map(agentState)
  self.postMessage({ type: 'frame', tick: tickCount++, agents: states })

  if (running) setTimeout(tick, 0)
}

// ── Message handler ────────────────────────────────────────────────────────

self.onmessage = (e: MessageEvent) => {
  const msg = e.data

  switch (msg.type) {
    case 'init':
      graph = msg.graph
      params = msg.params
      connections = deriveConnections(graph!)
      agents.clear()
      initSpawnTimers()
      tickCount = 0
      initialized = true
      if (!running) {
        running = true
        lastTime = Date.now()
        tick()
      }
      break

    case 'graphUpdate':
      graph = msg.graph
      connections = deriveConnections(graph!)
      agents.clear()
      crossingPaths.clear()
      initSpawnTimers()
      break

    case 'setParams':
      params = msg.params
      break

    case 'resume':
      if (initialized && !running) {
        running = true
        lastTime = Date.now()
        tick()
      }
      break

    case 'pause':
      running = false
      break

    case 'reset':
      agents.clear()
      crossingPaths.clear()
      initSpawnTimers()
      tickCount = 0
      break
  }
}
