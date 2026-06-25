# Spec: Simulation Engine

> Stage 5 (foundation) + Stage 6 (behaviour). Read alongside `spec-road-graph.md`.
> Covers: message protocol, agent model, world positions, spawn, tick loop, Canvas renderer.
> 200-line limit.

## Architecture

```
Main thread                      Web Worker
──────────────────────────────   ──────────────────────────────
SimCanvas.tsx                    worker.ts
  │ postMessage(WorkerMsg)  ──→    routing tables, agent state
  │                               tick loop (setTimeout, ~60fps)
  │ onmessage(FrameMsg)     ←──    agent positions each tick
  │
  └─ renderer.ts: drawFrame(ctx, frame, graph)
```

The worker owns all agent state. The main thread only receives positions to render.

## Message protocol

### Main → Worker (`WorkerMsg`)

```typescript
type WorkerMsg =
  | { type: 'init';        graph: RoadGraph; chaos: number }
  | { type: 'graphUpdate'; graph: RoadGraph }
  | { type: 'setChaos';    chaos: number }
  | { type: 'resume' }
  | { type: 'pause' }
  | { type: 'reset' }
```

- `init`: sent once on first Run. Builds routing tables, starts tick loop.
- `graphUpdate`: sent when user edits the graph. Reroutes in-flight agents if their path is invalidated; kills the agent if no valid route remains.
- `setChaos`: sent on slider change. Takes effect on the next decision point.
- `resume` / `pause`: start/stop the tick loop. Agent state is preserved on pause.
- `reset`: clears all agents and spawn timers, keeps graph.

### Worker → Main (`FrameMsg`)

```typescript
interface FrameMsg {
  type: 'frame'
  tick: number
  agents: AgentState[]
}

interface AgentState {
  id: string
  type: VehicleType
  x: number      // world metres, X east
  y: number      // world metres, Y north
  heading: number // degrees CW from north
}
```

The worker posts one `FrameMsg` per tick. The main thread renders immediately on receipt.

## Coordinate system

Same as the road graph model: X east, Y north, origin at intersection center, units metres.
Canvas rendering mirrors the SVG editor: `canvasX = W/2 + worldX * SCALE`, `canvasY = H/2 - worldY * SCALE`.

## Agent data structure (internal to worker)

```typescript
interface Agent {
  id: string
  type: VehicleType
  phase: 'approaching' | 'waiting' | 'crossing' | 'exiting' | 'done'
  // Source
  fromArmId: Id
  fromLaneIndex: number
  // Destination
  toArmId: Id
  toLaneIndex: number
  // Progress: 0.0 = start of current phase, 1.0 = end
  progress: number
  speed: number      // m/s, current
  targetSpeed: number // m/s, free-flow speed for this vehicle type
}
```

Progress drives position computation — no raw x/y stored inside the worker. Positions derived each tick from arm geometry + progress.

## World position from agent phase + progress

**Approaching** (inbound lane, arm end → stop line):
```
entry = armEnd(arm)                    // arm endpoint in world coords
stop  = stopLinePos(arm, laneIndex)    // stop line position for this lane
pos   = lerp(entry, stop, t)
heading = inboundHeading(arm)          // (arm.angle + 180) % 360
```

**Crossing** (stop line → destination stop line, straight line for Phase 1):
```
entry = stopLinePos(fromArm, fromLaneIndex)
exit  = stopLinePos(toArm, toLaneIndex, 'outbound')
pos   = lerp(entry, exit, t)
heading = angleTo(entry, exit)
```

**Exiting** (outbound lane, stop line → arm end):
```
entry = stopLinePos(toArm, toLaneIndex, 'outbound')
exit  = armEnd(toArm)
pos   = lerp(entry, exit, t)
heading = outboundHeading(toArm)       // toArm.angle
```

**Helper — lane stop line position** (world coords):
```
// inbound lane i on arm at angle θ, stopLineOffset S
stopX = S * sin(θ) + laneOffset * cos(θ)
stopY = S * cos(θ) - laneOffset * sin(θ)  // Y-up

// laneOffset = totalInW - cumInW[i] - lane.width/2  (distance from centreline, rightPerp side)
```

## Spawn logic

Per arm, per inbound lane:
- Each lane gets `arm.spawnRate / arm.inboundLanes.length` vehicles per hour
- Inter-arrival: `3600 / laneRate` seconds
- Worker tracks `spawnTimer` per lane; decrements by `dt` each tick
- When timer ≤ 0: attempt spawn. If entry point is clear (no agent within 1 vehicle length), create agent. Reset timer ± 20% random jitter.
- Spawn position: `t = 0` (arm end), heading = inbound direction

Agent destination arm is chosen at spawn using `deriveConnections` — pick a random allowed movement from this lane, resolve to destination arm. Equal weight across allowed movements.

## Tick loop

```typescript
// In worker
let lastTime = Date.now()

function tick() {
  const now = Date.now()
  const dt = Math.min((now - lastTime) / 1000, 0.05)  // cap at 50ms to avoid spiral
  lastTime = now

  updateSpawnTimers(dt)
  advanceAgents(dt)
  removeCompletedAgents()
  postMessage({ type: 'frame', tick: tickCount++, agents: agentStates() })

  if (running) setTimeout(tick, 0)  // as fast as JS allows; browser caps ~60fps
}
```

`setTimeout(tick, 0)` yields to the main thread between ticks, keeping the UI responsive.

## Agent movement (Stage 5 — foundation)

Stage 5 implements straight-through movement only. No signal compliance, no following distance. Turns work by selecting destination arm at spawn.

```
agent.progress += (agent.speed * dt) / phaseLength(agent)
```

Where `phaseLength` is the arc length of the current phase in metres:
- Approaching: `arm.length - arm.stopLineOffset`
- Crossing: distance from entry stop line to exit stop line
- Exiting: `toArm.length - toArm.stopLineOffset`

When `progress ≥ 1`: advance to next phase (approaching → crossing → exiting → done).

Speed: `agent.speed = agent.targetSpeed` at all times in Stage 5 (no stopping).

## Canvas renderer (`renderer.ts`)

`drawFrame(ctx, frame, graph, canvasW, canvasH)`:

1. **Clear**: `ctx.clearRect(0, 0, canvasW, canvasH)`
2. **Road surface**: for each arm, draw a filled dark rectangle (same geometry as SVG editor, computed in canvas pixel coords)
3. **Center box**: filled dark square
4. **Stop lines**: white lines on inbound sides
5. **Agents**: for each `AgentState`, draw a filled rectangle rotated to `heading`:
   - `ctx.save(); ctx.translate(px, py); ctx.rotate(headingRad); ctx.fillRect(...); ctx.restore()`

Vehicle colours and sizes (in metres):

| Type | Colour | Width | Length |
|------|--------|-------|--------|
| car | `#c0c0c0` | 2.0 | 4.5 |
| two-wheeler | `#f59e0b` | 0.8 | 2.0 |
| auto | `#4ade80` | 1.5 | 3.2 |
| pedestrian | `#60a5fa` | 0.5 | 0.5 |

Default spawn mix: 50% two-wheeler, 30% car, 15% auto, 5% pedestrian.

## Open questions

- [ ] Stage 5 only: all agents move at free-flow speed (no stopping). Signals and following distance in Stage 6.
- [ ] Crossing path in Stage 5: straight line from stop line to stop line. Arc paths deferred.
- [ ] What is the free-flow speed per type? (m/s) — defaults: car 10, two-wheeler 8, auto 7, pedestrian 1.2
