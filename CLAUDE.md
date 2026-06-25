# Laya (लय) — Claude Instructions

*Name: Laya (लय) — Sanskrit for rhythm, tempo, cadence. Locked 2026-06-25.*

> Read this before doing any work in this directory.
> Org context: see `../CLAUDE.md`.

## What this project is

A web-based graphical tool for building, simulating, diagnosing, and solving Indian road intersections. Equal parts serious urban planning tool and intuitive game-like experience.

**The problem:** Indian road intersections are complex, chaotic, and under-planned. Western traffic simulators assume lane discipline, homogeneous vehicle types, and rule compliance — none of which reflect Indian reality. Urban planners and bureaucrats have no accessible tool to model, diagnose, or communicate intersection problems before roads are built or rebuilt.

**The insight:** If you can see where and why an intersection is breaking down, the solution becomes obvious. This tool is a diagnostic tool first, optimizer second.

**The wedge:** Indian mixed traffic — two-wheelers, autos, pedestrians, cars — is not modeled by any existing tool. This is the differentiator. Own it explicitly.

## Core loop (locked)

**Build → Simulate → Diagnose → Adjust → Repeat**

## Key mechanics (locked)

- **Intersection editor:** drag-and-drop road segments, lane count and direction assignment. Presets available (4-way, T-junction, roundabout, Y-junction) as starting points — building from scratch is core.
- **Agent-based simulation:** individual vehicles with position, speed, destination, and behavioral rules. Emergent behavior (jams, filtering, chaos) from individual decisions, not aggregate formulas.
- **Chaos slider (0–100):** first-class mechanic, not an edge case.
  - 0 = perfect rule compliance (idealized)
  - 50 = realistic India: signal jumping, two-wheeler gap filtering, wrong-side entry
  - 100 = pure entropy
- **Mixed vehicle types:** cars, two-wheelers, autos, pedestrians — all in scope from the start.
- **Lane mathematics:** per-lane direction assignment (left/straight/right), visual toggle UI. Inspired by Cities Skylines: Traffic Manager (TMPE).
- **Traffic rule enforcement:** yield, stop, priority, signal-controlled — per junction.
- **Signal timing controls:** manual phase durations; automated optimization in Phase 3.
- **Diagnosis layer:** highlights where the intersection is breaking down. Automated vs manual observation — decision deferred.

## Solve progression (locked — easiest to hardest)

1. Visualize — build and watch traffic flow
2. Lane mathematics + rule enforcement — assign lanes, set rules, observe changes
3. Signal optimization — tune timing automatically
4. Layout optimization — suggest geometry changes

## Phasing (locked)

- **Phase 1 — Core tool:** single intersection, full mechanics, shareable link
- **Phase 1.5 — Depth:** multi-intersection networks (corridor), OSM import (real road geometry from OpenStreetMap), export/report (PDF for planners)
- **Phase 2 — Community:** user-submitted real Indian intersections, shared scenarios, leaderboards. Backend added here, not before.

## Design philosophy

1. **Indian-first** — model Indian traffic behavior honestly, not as a deviation from a Western norm
2. **Diagnostic before prescriptive** — show the problem clearly; solutions follow from understanding
3. **Accessible** — a bureaucrat with no traffic engineering background should be able to use it
4. **Open source** — government adoption requires auditability; a black box will never pass procurement
5. **No unnecessary dependencies** — every dependency is a maintenance liability

## Tech stack (locked)

- **Language:** TypeScript
- **Framework:** React
- **Editor rendering:** SVG
- **Simulation rendering:** Raw Canvas 2D (Konva explicitly rejected — ceiling concern)
- **Simulation engine:** Web Worker (off main thread, non-negotiable)
- **State:** Zustand for road network; agent simulation state lives entirely in the worker
- **Build:** Vite
- **Hosting:** Cloudflare Pages

## Current status

**Vision defined. Not yet spec.**

All core mechanics, phasing, and tech stack are decided. Open questions remain (see `docs/ConvoQA.md`). Do not invent specifics — if something isn't decided yet, say so.

## About the builder

Srikar Buddhiraju. Cloud platform engineer, deep Azure background. AI-first working style — explicit, readable code, minimal dependencies. No existing connections to urban planning institutions — credibility path is through the tool itself.

## Session start checklist

Before doing anything else each session:
1. Read `docs/ConvoQA.md` — past decisions and open questions
2. Read `docs/lessons.md` — mistakes and rules to avoid repeating
3. Read `docs/LatestTask.md` — what was being worked on last session

Summarise: what was in progress, any open `[ ]` items, relevant lessons — then ask what to work on.

## Working conventions

- **200-line limit** on all markdown files in `docs/` — split if exceeded
- **LatestTask.md** — rolling session log, current 1-2 sessions only
- **ConvoQA.md** — any decision made in conversation that isn't in `CLAUDE.md`
- **lessons.md** — updated after any correction, reviewed at session start
- **todo.md** — local planning (gitignored), reviewed before every session
- **Feature branches:** `feature/<short-description>` — never commit directly to `main`
- **Verify before done** — never mark complete without proving it works

## Self-improvement loop

After ANY correction from Srikar: update `docs/lessons.md` immediately. Review at session start.

## Git

Repo: https://github.com/BharatOpenSource/laya
Branch convention: `feature/<short-description>`
Never commit directly to `main`.
