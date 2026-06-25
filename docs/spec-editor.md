# Spec: SVG Editor

> Stage 4. Read alongside `spec-road-graph.md`.
> Covers: coordinate math, lane geometry, arrows, selection, side panel, zoom/pan.
> 200-line limit.

## Coordinate systems

Two systems in play — keep them explicit:

**World space** (road graph model)
- Origin at intersection center `(0, 0)`
- X east, Y north, units: metres

**SVG space** (pixels on screen)
- Origin at SVG top-left
- X right, Y **down** (inverted from world)
- SVG center at `(svgW/2, svgH/2)` in pixels

**Conversion** (scale = pixels per metre, default 5):
```
svgX =  centerX + worldX * scale
svgY =  centerY - worldY * scale   ← Y flips
```

**Arm direction vectors** (SVG space, for arm at angle θ°):
```
armDir  = ( sin(θ),  -cos(θ) )   ← along arm, outward from center
rightPerp = ( cos(θ),   sin(θ) )  ← 90° CW from armDir
leftPerp  = (-cos(θ),  -sin(θ) )  ← 90° CCW from armDir
```
Verify: θ=0 (north) → armDir=(0,-1) points up ✓, rightPerp=(1,0) points east ✓

## Lane layout geometry

India drives on the left. Looking outward from center along an arm:
- **Outbound lanes** (traffic leaving center): on the **left** side → `leftPerp` direction
- **Inbound lanes** (traffic toward center): on the **right** side → `rightPerp` direction

Lane index 0 is closest to the centerline in each group.

**Lane centre offset** from arm centreline (in SVG pixels):
```
inbound  lane i:  rightPerp * (i + 0.5) * lane.width * scale
outbound lane i:  leftPerp  * (i + 0.5) * lane.width * scale
```

**Arm road body**: a rectangle
- Width = (Σ inbound widths + Σ outbound widths) * scale
- Length = arm.length * scale (from center to arm end)
- Centre of width at arm centreline; drawn from SVG center outward

**Stop line**: drawn at `arm.stopLineOffset * scale` from SVG center, perpendicular to arm, on the inbound side.

**Inbound lane extent**: from arm end down to stop line.
**Outbound lane extent**: from center out to arm end.

## What gets drawn (render order, bottom to top)

1. Road bodies — filled dark rectangles for each arm
2. Center box — filled rectangle covering the conflict zone (radius = max stopLineOffset)
3. Lane divider lines — thin dashed lines between lanes, stopping at stop line
4. Stop lines — solid white 2px lines at stopLineOffset per arm
5. Direction arrows — on each inbound lane, near the stop line (see below)
6. Selection highlight — outline on selected arm or lane

## Lane direction arrows

Each inbound lane shows one arrow per `allowedMovement`. Arrows are clickable SVG `<path>` elements that toggle the movement.

**Position**: centred in the lane, 20px back from the stop line (toward arm end).

**Arrow shapes** (all defined in a normalised up-pointing frame, then rotated to match arm):
- `straight`: vertical arrow ↑
- `left`: shaft going up, head turning left (↖ bent)
- `right`: shaft going up, head turning right (↗ bent)
- `u-turn`: loop returning downward

**Rotation**: rotate by `θ + 180°` (inbound travel direction points toward center, which is opposite the arm direction). Applied as SVG `transform="rotate(θ+180, cx, cy)"`.

**Active vs inactive**: active movement = filled white arrow; inactive (movement absent from `allowedMovements`) = outlined only, 30% opacity. Clicking toggles.

**U-turn gate**: u-turn arrow only shown if `arm.inboundWidth + arm.outboundWidth ≥ 7m`.

## Selection model

- One selected item at a time: `null | { type: 'arm', armId } | { type: 'lane', armId, laneId }`
- Click arm body or stop line → select arm
- Click lane strip → select lane (within that arm)
- Click center box or SVG background → deselect
- Keyboard `Escape` → deselect
- Selection state lives in a local React `useState` in `IntersectionSVG`, not in Zustand (it's view state)

## Side panel

Renders to the right of the SVG (fixed 240px). Shows nothing when nothing selected.

**Arm selected:**
| Field | Element | Constraint |
|-------|---------|------------|
| Label | `<input type="text">` | — |
| Angle | `<input type="number">` | 0–359, integer |
| Length | `<input type="number">` | 20–200 m |
| Stop line offset | `<input type="number">` | 1–20 m |
| Spawn rate | `<input type="number">` | 0–1000 veh/hr |
| Yield rule | `<select>` | signal / stop / yield / uncontrolled |
| Add inbound lane | `<button>` | disabled if already 4 lanes |
| Add outbound lane | `<button>` | disabled if already 4 lanes |
| Remove arm | `<button>` | disabled if only 2 arms remain |

All changes call `updateArm(armId, changes)` on the Zustand store immediately (no submit).

**Lane selected** (inbound):
| Field | Element | Constraint |
|-------|---------|------------|
| Width | `<input type="number">` | 2.5–5.0 m |
| Movements | Toggle buttons (L / S / R / U) | at least 1 must remain active |

**Lane selected** (outbound): width only.

## Zoom and pan

- Wrap `<svg>` in a `<div style="overflow: hidden">` with CSS `transform: scale(z) translate(px, py)`
- `wheel` → zoom: `z *= 1.1^(deltaY sign)`, clamped `[0.3, 4]`
- `mousedown + mousemove` on background → pan: accumulate dx, dy
- `mousedown` on an arm → select (no pan)
- Distinguish drag from click: if mouse moved > 4px during mousedown, treat as pan not click
- Default zoom: 1.0, centered

## Component tree

```
IntersectionSVG          ← reads Zustand, owns selection state + zoom/pan state
  PanZoomWrapper         ← handles wheel + drag, applies CSS transform
    <svg>
      ArmShape[]         ← road body + dividers + stop line for one arm
        LaneArrow[]      ← movement arrows per inbound lane
      CenterBox          ← conflict zone rectangle
      SelectionOverlay   ← outline on selected item
  SelectionPanel         ← side panel, fixed position
```

## Open questions

- [ ] Should adding a lane rebalance widths to keep total arm width constant, or just append at default 3.5m?
- [ ] When arm angle is edited via the panel, animate SVG rotation or snap immediately?
