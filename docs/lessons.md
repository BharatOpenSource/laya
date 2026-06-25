# Lessons — Laya

> Updated after any correction. Reviewed at every session start. 200-line limit.

## SVG labels inside rotating groups will be rotated

**Rule:** Never put text labels inside a `<g style="transform: rotate(θ)">` arm group. Compute the label position in absolute SVG coordinates and render it as a sibling of the arm groups.

**Why:** Labels inside a rotating group rotate with the arm — "South" becomes upside-down at 180°, "East"/"West" become sideways. Caught in first browser test.

**How to apply:** Use `labelPos(angle, length)` helper that returns `(x, y)` in world SVG coords. Render labels in `IntersectionSVG` after all arm groups.

---

## Pedestrians don't travel along vehicle lanes

**Rule:** Pedestrians must not share the lane-based spawn system with vehicles. They cross perpendicular to the road, not along the arm. Exclude pedestrians from `sampleVehicleType()` (spawnWeight: 0) until a dedicated crossing path system is implemented.

**Why:** The lane spawn system places all vehicle types at the arm entry point and moves them inbound along the lane. A pedestrian following this path would walk in traffic — wrong behaviorally and visually (small blue rectangle in the right vehicle lane, spotted immediately in first browser run).

**How to apply:** In Stage 8, implement pedestrian crossing: spawn pedestrians at the road edge perpendicular to the arm, crossing across lanes to the other side. Separate from the vehicle lane state machine.

---

## When a project is renamed, rename the folder too

**Rule:** Renaming a project (name, docs, CLAUDE.md) is not complete until the local folder name matches. Check `ls` at workspace root as part of any rename task.

**Why:** The folder `TraffiProject/` persisted after the project was named Laya — all docs were updated but the directory itself wasn't renamed. Caught by Srikar in the same session.
