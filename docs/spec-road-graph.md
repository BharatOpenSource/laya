# Spec: Road Graph Data Model

> Phase 1 scope: single intersection only.
> This is the canonical data model read by the editor (SVG) and simulation engine (Web Worker).
> 200-line limit — split into `spec-road-graph-2.md` if exceeded.

## Coordinate system

- 2D Cartesian, origin at intersection center `(0, 0)`
- Units: **metres** throughout (screen pixels derived from zoom scale)
- X increases eastward, Y increases northward
- Arm **angle**: degrees clockwise from north — 0° = north, 90° = east, 180° = south, 270° = west
- Screen rendering flips Y (standard canvas convention); the model does not

## Conceptual model

```
         Arm (North, 0°)
          ↑  ↑  ↓  ↓
          outbound | inbound
                   |
  Arm (West) ←----+----→ Arm (East)
                   |
          inbound | outbound
          ↓  ↓  ↑  ↑
         Arm (South, 180°)
```

- An **Intersection** is the central node where arms meet.
- An **Arm** is a road segment radiating outward from the center at a fixed angle.
- Each arm has **inbound lanes** (traffic approaching center) and **outbound lanes** (traffic leaving center).
- Lanes are ordered **left-to-right from the driver's perspective** facing the intersection.
- A **Connection** is a legal path through the center: from an inbound lane on arm A to an outbound lane on arm B. Connections are **derived** from lane movement assignments and arm angles — not stored.
- A **SignalPlan** controls which arms are green at any moment.

## TypeScript interfaces

```typescript
type Id = string; // nanoid, stable across sessions

// --- Root ---

interface RoadGraph {
  version: 1;
  intersection: Intersection;
  signalPlan: SignalPlan | null; // null = uncontrolled (all-way yield or stop)
}

// --- Intersection ---

interface Intersection {
  id: Id;
  arms: Arm[];           // 2–6 arms; order is arbitrary, angle determines geometry
}

// --- Arm ---

interface Arm {
  id: Id;
  label: string;            // display name: "North", "MG Road", "Arm 3"
  angle: number;            // degrees clockwise from north, [0, 360)
  length: number;           // metres from center to far end of arm
  stopLineOffset: number;   // metres from center to stop line; default 5.0
  spawnRate: number;        // vehicles per hour entering on this arm
  inboundLanes: Lane[];     // approaching center; index 0 = leftmost facing intersection
  outboundLanes: Lane[];    // leaving center; index 0 = leftmost facing intersection
  yieldRule: YieldRule;     // applies to all inbound lanes unless overridden per lane
}

type YieldRule = 'signal' | 'stop' | 'yield' | 'uncontrolled';

// --- Lane ---

interface Lane {
  id: Id;
  index: number;            // 0-based, left-to-right from driver perspective
  width: number;            // metres, configurable per lane; default 3.5 (IRC standard)
  // Inbound lanes only — which turn movements are permitted from this lane.
  // U-turn is opt-in: include 'u-turn' here to allow it on this lane.
  allowedMovements?: Movement[];
}

type Movement = 'left' | 'straight' | 'right' | 'u-turn';

// --- Signal ---

interface SignalPlan {
  phases: SignalPhase[];
  amberDuration: number;  // seconds; same for all phase transitions
}

interface SignalPhase {
  id: Id;
  duration: number;       // green duration in seconds
  greenArmIds: Id[];      // inbound lanes on these arms are green this phase
}
```

## Derived data: connections

Connections are **not stored** in the graph. The simulation engine derives them at runtime:

1. For each inbound lane `L` on arm `A` with movement `M`:
2. Find the destination arm `B` whose angle best matches the expected heading after turn `M` from arm `A`.
   - Straight → arm whose angle is ~180° opposite to `A`
   - Left → arm whose angle is ~90° clockwise from `A`'s inbound heading
   - Right → arm whose angle is ~90° counter-clockwise from `A`'s inbound heading
   - U-turn → arm `A` itself (outbound)
3. The destination outbound lane index is assigned by convention:
   - Straight → match index to inbound lane (if available)
   - Left → rightmost available outbound lane on `B`
   - Right → leftmost available outbound lane on `B`

This approach keeps the stored graph minimal and handles odd-angle arms without explicit wiring.

## Presets

Presets are factory functions that return a `RoadGraph`. They are starting points, not locked templates.

| Preset | Arms | Angles |
|--------|------|--------|
| 4-way | 4 | 0°, 90°, 180°, 270° |
| T-junction | 3 | 0°, 90°, 180° |
| Y-junction | 3 | 0°, 120°, 240° |
| Roundabout | — | modelled separately (circular one-way segment) — deferred |

Default lane config per arm: 2 inbound (straight + right, left + straight), 2 outbound.

## Constraints (invariants the editor enforces)

- Minimum 2 arms, maximum 6 (Phase 1)
- Arm angles must be separated by at least 20° (no overlapping arms)
- Each arm: minimum 1 inbound lane, minimum 1 outbound lane
- Lane width: 2.5m minimum, 5.0m maximum
- Arm length: 20m minimum, 200m maximum
- An inbound lane must have at least one `allowedMovement`
- U-turn only present in `allowedMovements` if arm has sufficient total width (inbound + outbound ≥ 7m — one standard lane each way minimum)
- Signal plan: phase durations must sum to ≤ 180s (reasonable cycle cap)

## What this model does NOT cover (Phase 1 exclusions)

- Multi-intersection networks → Phase 1.5
- OSM import → Phase 1.5
- Bus lanes, dedicated cycle tracks → Phase 1.5
- Roundabout inner ring geometry → deferred
- Grade separation (flyovers, underpasses) → out of scope

## Decisions locked 2026-06-25

- **U-turn:** explicit opt-in per lane — include `'u-turn'` in `allowedMovements`. Never implicit.
- **Lane width:** configurable per lane (not uniform per arm). Default 3.5m (IRC standard).
- **Stop line:** explicit `stopLineOffset` per arm in metres from center. Default 5.0m.
- **Spawn rate:** separate `spawnRate` field on `Arm` (vehicles per hour). Independent of arm length.
