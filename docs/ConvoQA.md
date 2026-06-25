# TraffiProject — Decisions & Open Questions

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

## Open Questions

- [ ] **Project name** — candidates: Gati (गति, recommended — motion/speed, works across all Indian languages, names the motion not the container), Sandhi, Taal
- [ ] **Automated diagnosis first or manual-observation first?**
- [ ] **Licensing** — open source confirmed; specific license TBD
- [ ] **Competitive landscape** — document VISSIM/Aimsun/Synchro and why this tool is different (Indian mixed traffic, accessible, open source). Not yet written.
- [ ] **Validation approach** — how to prove simulation accuracy against real intersections. Ground truth sources: traffic count surveys, video analysis of real intersections, CRRI (Central Road Research Institute) / municipal published data. Approach not yet decided.
- [ ] **Indian vehicle data** — realistic defaults for vehicle mix, speeds, gap acceptance, reaction times for each vehicle type. Source: IIT traffic engineering papers, CRRI research. Data not yet sourced.
- [ ] **Scoring mechanic** — what is a "score" in challenge mode? Throughput (vehicles/hour), average wait time, queue length, or composite? Not yet decided.
