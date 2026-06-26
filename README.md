# Laya (लय)

*Sanskrit: लय — rhythm, tempo, cadence.*

> Part of [Bharat Open Source](https://github.com/BharatOpenSource)

A web-based tool for building, simulating, and diagnosing Indian road intersections.

## The problem

Indian road intersections are complex, chaotic, and under-planned. Western traffic simulators assume lane discipline, homogeneous vehicles, and rule compliance — none of which reflect Indian reality. Urban planners and bureaucrats have no accessible tool to model or communicate intersection problems before roads are built or rebuilt.

If you can see where and why an intersection breaks down, the solution becomes obvious.

## What it does

**Build → Simulate → Diagnose → Adjust**

- **Intersection editor** — drag-and-drop road segments, lane count and direction assignment, presets for common layouts
- **Agent-based simulation** — individual vehicles with position, speed, and behavioral rules; emergent jams and chaos from individual decisions, not aggregate formulas
- **Mixed traffic** — cars, two-wheelers, autos, pedestrians — modeled honestly, not as deviations from a Western norm
- **Chaos slider (0–100)** — 0 is perfect compliance, 50 is realistic India (signal jumping, gap filtering, wrong-side entry), 100 is entropy
- **Signal timing controls** — manual phase durations per arm
- **Lane mathematics** — per-lane direction assignment (left / straight / right), visual toggle UI

## Current status

**Active development. Stages 1–9 complete.**

| Stage | What | Status |
|-------|------|--------|
| 1 | Scaffold, editor, SVG rendering | Done |
| 2 | Data layer — road network model | Done |
| 3 | SVG intersection editor | Done |
| 4 | Simulation engine (Web Worker) | Done |
| 5 | Agent behaviour and spawning | Done |
| 6 | Chaos slider | Done |
| 7 | 4-phase signal model | Done |
| 8 | Density controls + pedestrian crossings | Done |
| 9 | Intersection gridlock fix | Done |
| 10 | Diagnosis layer — throughput, queue, bottleneck | Next |

## Tech stack

TypeScript + React + Vite. SVG for the editor. Canvas 2D for simulation rendering. Web Worker for the simulation engine (off main thread). Zustand for state. Cloudflare Pages for hosting.

## Part of

[Bharat Open Source](https://github.com/BharatOpenSource) — infrastructure built by India, for India.
