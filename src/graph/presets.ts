import { nanoid } from 'nanoid'
import type { Arm, Lane, RoadGraph, SignalPlan } from '../types/graph'

const DEFAULT_LANE_WIDTH = 3.5
const DEFAULT_LENGTH = 60
const DEFAULT_STOP_OFFSET = 5.0
const DEFAULT_SPAWN_RATE = 200

function makeLane(index: number, movements?: Lane['allowedMovements']): Lane {
  return {
    id: nanoid(),
    index,
    width: DEFAULT_LANE_WIDTH,
    ...(movements ? { allowedMovements: movements } : {}),
  }
}

// Standard 2-inbound / 2-outbound arm
// inbound lane 0: left + straight; lane 1: straight + right
function makeArm(label: string, angle: number): Arm {
  return {
    id: nanoid(),
    label,
    angle,
    length: DEFAULT_LENGTH,
    stopLineOffset: DEFAULT_STOP_OFFSET,
    spawnRate: DEFAULT_SPAWN_RATE,
    yieldRule: 'signal',
    inboundLanes: [
      makeLane(0, ['left', 'straight']),
      makeLane(1, ['straight', 'right']),
    ],
    outboundLanes: [
      makeLane(0),
      makeLane(1),
    ],
  }
}

// 4-phase signal: each arm gets its own green phase in sequence.
// Realistic Indian pattern: one direction at a time with amber transition.
function fourPhaseSignal(arms: Arm[], durationSec = 25): SignalPlan {
  return {
    phases: arms.map(arm => ({
      id: nanoid(),
      duration: durationSec,
      greenArmIds: [arm.id],
    })),
    amberDuration: 3,
  }
}


export function preset4Way(): RoadGraph {
  const arms = [
    makeArm('North', 0),
    makeArm('East', 90),
    makeArm('South', 180),
    makeArm('West', 270),
  ]
  return {
    version: 1,
    intersection: { id: nanoid(), arms },
    signalPlan: fourPhaseSignal(arms), // one arm at a time: N → E → S → W → N
  }
}

export function presetTJunction(): RoadGraph {
  const arms = [
    makeArm('North', 0),
    makeArm('East', 90),
    makeArm('South', 180),
  ]
  return {
    version: 1,
    intersection: { id: nanoid(), arms },
    signalPlan: fourPhaseSignal(arms),
  }
}

export function presetYJunction(): RoadGraph {
  const arms = [
    makeArm('Arm A', 0),
    makeArm('Arm B', 120),
    makeArm('Arm C', 240),
  ]
  return {
    version: 1,
    intersection: { id: nanoid(), arms },
    signalPlan: fourPhaseSignal(arms),
  }
}

export const PRESETS = {
  '4-way':     { label: '4-way',      factory: preset4Way },
  't-junction':{ label: 'T-junction', factory: presetTJunction },
  'y-junction':{ label: 'Y-junction', factory: presetYJunction },
} as const

export type PresetKey = keyof typeof PRESETS
