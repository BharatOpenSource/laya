# Latest Task — Laya

> Rolling log. Current session only — 1-2 sessions max. 200-line limit.

## Session: 2026-06-25

**Status:** Stages 1–5 complete. Bezier turns + Home/Reset added. Moving to Stage 6.

**Completed this session:**
- [x] Stages 1–5: scaffold, data layer, app shell, SVG editor, simulation engine
- [x] Chaos fine-tune params: 5 independent behavior axes (speedVariance, signalIgnore, laneIndiscipline, gapAggression, yieldIgnore)
- [x] Bezier curves for turns — quadratic arc from stop line to stop line (control point = arm direction intersection)
- [x] Home button (re-center editor view), Reset button (clear all agents)
- [x] Pedestrians excluded from vehicle lane spawn — lesson recorded

**Pending (Stage 6 — agent behaviour):**
- [ ] Signal compliance (agents stop at red, go at green) — driven by `signalIgnore` param
- [ ] Following distance / collision avoidance (no overlap) — driven by `gapAggression`
- [ ] Yield compliance at uncontrolled/yield arms — driven by `yieldIgnore`

**Noted for future stages:**
- [ ] Agents move on top of each other — following distance deferred to Stage 6
- [ ] Agent count slider (overall spawn rate multiplier) — Stage 7/8 area
- [ ] Per-vehicle-type count sliders (individual type spawn weights) — Stage 8
- [ ] Pedestrian crossing paths (perpendicular to arm, not along lane) — Stage 8
- [ ] U-turn Bezier path (tight arc, currently straight line) — Stage 6+
