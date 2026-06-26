# Laya — Decisions & Open Questions

> Project-level decisions. Working conventions in `CLAUDE.md`.
> 200-line limit — split into `ConvoQA-2.md` if exceeded.

## Decisions (locked)

### Vision
A web-based graphical tool for building, simulating, diagnosing, and solving Indian road intersections. Equal parts serious planning tool and intuitive game-like experience. Inspired by Cities Skylines: Traffic Manager (TMPE).

**Core loop:** Build → Simulate → Diagnose → Adjust → Repeat

The tool is a diagnostic tool first, optimizer second. Identifying *where* and *why* an intersection breaks is the primary mechanic. Solutions follow from understanding the problem.

### What "solve" means — progression (easiest to hardest)
1. Visualize — simulate and show how traffic flows
2. Lane mathematics + rule enforcement — assign lane directions, set yield/stop/priority rules
3. Signal optimization — tune timing automatically given a fixed layout
4. Layout optimization — suggest geometry changes (widen, add turn lane, convert to roundabout)

### Intersection editor
- Drag-and-drop road segments (click to place node, drag to draw segment, click segment to configure)
- Presets as starting points (4-way, T-junction, roundabout, Y-junction) — building from scratch is core
- Lane direction UI: visual arrow toggles per lane, not dropdowns (TMPE model)
- Intersections form automatically where segments meet

### Agent-based simulation
Individual vehicles with position, speed, destination, and behavioral rules. Emergent behavior (jams, filtering, chaos) from individual decisions, not aggregate formulas. Chosen for visual intuitiveness and game-like feel.

### Chaos slider (0–100)
First-class feature, not an edge case. Maps to probability that an agent ignores a rule at any decision point.
- 0 = perfect compliance
- 50 = realistic India: signal jumping, two-wheeler gap filtering, wrong-side entry
- 100 = pure entropy
Indian roads don't behave like the model — the slider makes that honest.

### Two-wheeler gap filtering
The single most important Indian-specific behavior. If a gap exists larger than a two-wheeler's footprint, the agent moves into it regardless of lane assignment. Must be modeled correctly.

### Vehicle types
Cars, two-wheelers, autos, pedestrians — all in scope from the start. Not deferred.

### Diagnosis mechanic
Tool highlights where the intersection is breaking down (bottleneck lanes, short signal phases, blocking crossings). Both automated and manual observation — which comes first is deferred.

### Phasing
- **Phase 1 — Core tool:** single intersection, full mechanics, shareable URL (no backend)
- **Phase 1.5 — Depth:** multi-intersection networks, OSM import, export/report. Confirmed in scope, after working model is stable.
- **Phase 2 — Community:** user-submitted real Indian intersections, shared scenarios, leaderboards. Backend added here (Cloudflare Workers + D1).

### Tech stack
- TypeScript, React
- Editor: SVG | Simulation: Raw Canvas 2D (Konva rejected — performance ceiling)
- Simulation engine: Web Worker (non-negotiable, keeps UI smooth)
- State: Zustand (road network) + worker-owned (agent state)
- Build: Vite | Hosting: Cloudflare Pages

### Relationship to pravaaha
Separate project. pravaaha = civic process versioning. This = simulation and optimization. The output (a solved intersection plan) could one day be filed through pravaaha — tools are independent.

### Adoption path
1. Ship one intersection done well, 3–5 notorious Indian presets, shareable link from day one
2. Community use builds up (submissions, leaderboards)
3. One validated real-world case (simulation vs observed throughput)
4. Approach NIUA / Smart Cities / academic partners with that validation in hand
- No existing institutional connections — credibility path is through the tool itself
- Open source is non-negotiable for government adoption

### Costs
Near zero until Phase 2 community backend. Static hosting on Cloudflare Pages is free. No server compute — simulation runs in user's browser.

## Road graph data model — decisions locked 2026-06-25

- **U-turn:** explicit opt-in per lane (`'u-turn'` in `allowedMovements`). Never implicit, never chaos-only.
- **Lane width:** configurable per lane (not uniform per arm). Default 3.5m (IRC standard).
- **Stop line:** explicit `stopLineOffset` per arm (metres from center). Default 5.0m.
- **Spawn rate:** separate `spawnRate` field on `Arm` (vehicles per hour). Independent of arm length.

## Chaos fine-tune parameters — locked 2026-06-25

The chaos slider is a master preset that sets all behavior axes simultaneously. Under it, five independent sliders allow fine-tuning:

| Param | What it controls |
|-------|-----------------|
| `speedVariance` | How much agent speeds spread from the type base |
| `signalIgnore` | How often signals are jumped |
| `laneIndiscipline` | How loosely lane assignments are followed |
| `gapAggression` | How forcefully gaps are used (filtering, merging) |
| `yieldIgnore` | How rarely vehicles yield at yield/uncontrolled arms |

When chaos = N, all five params = N. Individual params can be changed independently after. A "●" indicator appears on the Fine-tune button when params diverge from the chaos preset.

Use case: set chaos=50 (realistic India), then pull signalIgnore to 80 (no cop at this intersection) or gapAggression to 90 (peak hour filtering) without changing overall chaos.

## Agent behavior model — locked 2026-06-25

**Speed and behavior are chaos-distributed, not fixed per vehicle type.**

Indian traffic has every kind of behavior simultaneously — slow where it shouldn't be, fast where it shouldn't be, rash, signal-jumping, tailgating so tight no one can merge, and also calm disciplined driving. None of these are the exception. The chaos slider shapes the *distribution* of behaviors, not just a binary rule-compliance switch.

**Model:**
- Each agent samples its own `targetSpeed` at spawn from a distribution centered on a per-type base speed, with spread that scales with chaos
- At chaos 0: agents cluster tightly around the base speed (calm, predictable)
- At chaos 50: speed distribution widens — some agents slow, some fast, some rash
- At chaos 100: distribution is nearly flat across the full range (anything goes)
- Formula: `targetSpeed = base * clamp(Normal(1.0, σ(chaos)), 0.2, 2.5)` where `σ` scales from ~0.05 at chaos 0 to ~0.6 at chaos 100
- Following distance, gap acceptance, and signal compliance also chaos-distributed (Stage 6)
- The *type* of vehicle constrains the base (a pedestrian's base is ~1.2 m/s, a car's is ~8 m/s) but chaos can make any agent slow or fast relative to their own type

**Base speeds (calm reference, m/s):**
- car: 8 (≈29 km/h — realistic for chaotic urban intersection approach)
- two-wheeler: 7 (≈25 km/h)
- auto: 6 (≈22 km/h)
- pedestrian: 1.2 (≈4 km/h)

These are not limits — they are the center of the distribution. At chaos 100, a car might do 20 m/s (72 km/h) through an intersection.

## Intersection Gridlock — Root Cause Analysis (2026-06-25)

Observed in Y-junction: vehicles jam and overlap at center box, deadlock permanently.

### Root causes (in order of impact)

**1. No intersection entry gate** (`worker.ts:355`)
Approaching→crossing transition is unconditional — no check if crossing zone has space.
Vehicles keep entering regardless of how congested the box already is.
Fix: count conflicting crossing agents before entry; hold at stop line if ≥2.

**2. Crossing phase has no following-distance model** (`worker.ts:178`)
`laneKey()` returns null for crossing phase → `effectiveSpeed()` returns full targetSpeed.
Crossing agents rely entirely on `applyCrossingProximity()` — no anticipatory braking.

**3. `applyCrossingProximity` is reactive, not preventive** (`worker.ts:281`)
Fires only after vehicles are already in the box. Sets speed=0 but has no repulsion.
`blendFactor=1.5` too tight — vehicles already overlapping before slowdown begins.
Symmetric braking (both agents stop) creates circular deadlock with no recovery.

**4. No stall recovery**
Once speed=0 in crossing, vehicles stay at 0 forever if blocker never moves.
No stall timer, no minimum speed floor, no escape hatch.

**5. Outbound lane not visible to crossing agents**
A crossing vehicle targeting outbound lane X doesn't occupy it until it physically enters
`exiting` phase. Multiple crossing vehicles target the same outbound lane simultaneously.

**6. Y-junction geometry amplifies all issues**
120° arms → short crossing paths, tiny center zone, all paths converge at one point.
3 arms × 2 lanes = 6 simultaneous crossing agents → proximity model collapses.

**7. `|| true` compliance bug** (`worker.ts:261`)
`const isYieldArm = arm.yieldRule !== 'uncontrolled' || true` — forces ALL arms including
uncontrolled to apply yield pause. Incorrect behavior; minor contributor.

### Planned fixes (Stage 9)

| Fix | Location | Impact |
|-----|----------|--------|
| Entry gate: hold if ≥2 conflicting crossing agents | `advanceAgents`, approaching→crossing | High |
| Stall recovery: min speed floor after 3s at speed=0 | agent struct + `advanceAgents` | High |
| Outbound preview: hold if dest lane blocked | approaching→crossing transition | Medium |
| Restore blendFactor 1.5 → 2.5 | `applyCrossingProximity` | Medium |
| Crossing occupancy cap (max arms.length) | `advanceAgents` | Medium |
| Fix `|| true` compliance bug | `applyCompliance` | Low |

## Open Questions

- [x] **Project name** — **Laya (लय)** locked 2026-06-25
- [ ] **Automated diagnosis first or manual-observation first?**
- [ ] **Licensing** — open source confirmed; specific license TBD
- [ ] **Competitive landscape** — document VISSIM/Aimsun/Synchro and why this tool is different (Indian mixed traffic, accessible, open source). Not yet written.
- [ ] **Validation approach** — how to prove simulation accuracy against real intersections. Ground truth sources: traffic count surveys, video analysis of real intersections, CRRI (Central Road Research Institute) / municipal published data. Approach not yet decided.
- [ ] **Indian vehicle data** — realistic defaults for vehicle mix, speeds, gap acceptance, reaction times for each vehicle type. Source: IIT traffic engineering papers, CRRI research. Data not yet sourced.
- [ ] **Scoring mechanic** — what is a "score" in challenge mode? Throughput (vehicles/hour), average wait time, queue length, or composite? Not yet decided.
