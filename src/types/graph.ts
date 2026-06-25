export type Id = string

export type Movement = 'left' | 'straight' | 'right' | 'u-turn'
export type YieldRule = 'signal' | 'stop' | 'yield' | 'uncontrolled'

export interface Lane {
  id: Id
  index: number
  width: number               // metres; default 3.5 (IRC standard)
  allowedMovements?: Movement[] // inbound lanes only; u-turn is opt-in
}

export interface Arm {
  id: Id
  label: string
  angle: number               // degrees clockwise from north, [0, 360)
  length: number              // metres from center to far end
  stopLineOffset: number      // metres from center to stop line; default 5.0
  spawnRate: number           // vehicles per hour entering this arm
  inboundLanes: Lane[]        // index 0 = leftmost facing intersection
  outboundLanes: Lane[]       // index 0 = leftmost facing intersection
  yieldRule: YieldRule
}

export interface Intersection {
  id: Id
  arms: Arm[]                 // 2–6 arms; angle determines geometry
}

export interface SignalPhase {
  id: Id
  duration: number            // green duration in seconds
  greenArmIds: Id[]           // inbound lanes on these arms are green
}

export interface SignalPlan {
  phases: SignalPhase[]
  amberDuration: number       // seconds; same for all transitions
}

export interface RoadGraph {
  version: 1
  intersection: Intersection
  signalPlan: SignalPlan | null // null = uncontrolled
}

// Derived at runtime — not stored in graph
export interface Connection {
  fromArmId: Id
  fromLaneId: Id
  movement: Movement
  toArmId: Id
  toLaneIndex: number         // outbound lane index on destination arm
}
