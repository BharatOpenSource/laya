# Latest Task — Laya

> Rolling log. Current session only — 1-2 sessions max. 200-line limit.

## Session: 2026-06-25 (continued)

**Status:** Stages 1–6 complete. Signal UX, traffic lights, density/collision noted for next session.

**Completed this session:**
- [x] Stages 1–6: scaffold → data layer → app shell → SVG editor → simulation engine → agent behaviour
- [x] Bezier curves for intersection turns (quadratic arc, control point = arm direction intersection)
- [x] Chaos slider decoupled from fine-tune params — params are independent, "Reset to chaos" button syncs
- [x] 4-phase signal model (one arm green at a time: N→E→S→W→N)
- [x] Signal state machine: green → amber (3s) → all-red clearance (1.5s) → next green
- [x] Traffic lights on arm centreline (rotated to align with arm, unambiguous in any junction shape)
- [x] Signal countdown timer displayed on canvas
- [x] Signal Timers panel (editable green duration per phase, amber duration)
- [x] Signals ON/OFF toggle — releases waiting agents immediately when turned off
- [x] Legend (collapsible, bottom-right of simulation pane)
- [x] Home button (re-center SVG editor), Reset button (clear agents without pausing)
- [x] Following distance: vehicles queue behind slower ones, no passing through on same lane
- [x] Lane indiscipline / overtaking: blocked agents switch to adjacent lane

**Known bugs — fix next session:**
- [ ] **Vehicle jump at red light** — one vehicle jumps right-to-left while waiting at stop line.
  Likely cause: `tryLaneSwitch()` firing during a brief moment when `waiting` transitions,
  causing `fromLaneIndex` to change and the agent to teleport laterally one lane width.
  Fix: gate lane switch on `agent.blockedTime > 0` only when the agent has been moving
  slowly (not when at zero speed at stop line).
- [ ] Vehicles overlap at intersection center (crossing-phase 2D collision not implemented)

**Pending for Stage 7/8:**
- [ ] Traffic density slider (overall spawn rate multiplier)
- [ ] Per-vehicle-type density sliders (individual spawn weight controls)
- [ ] Pedestrian crossing paths (perpendicular crossing, not along lane)
- [ ] U-turn Bezier path (tight arc — currently straight line)
- [ ] Diagnosis layer (Stage 10): throughput, queue length, bottleneck highlighting
