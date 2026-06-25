# Spec: Agent Behaviour (Stage 6)

> Builds on Stage 5 foundations. All decisions here are chaos-param-driven.
> 200-line limit.

## What Stage 5 already handles

- Spawn, routing, Bezier crossing paths, following distance (laneKey model)
- ChaosParams structure wired to UI — but only `speedVariance` was connected to simulation

## What Stage 6 adds

| Behaviour | ChaosParam | Description |
|-----------|-----------|-------------|
| Signal compliance | `signalIgnore` | Agents stop at red, go at green. At high ignore: run reds. |
| Yield/stop compliance | `yieldIgnore` | At yield/stop arms, agents pause. High ignore: blow through. |
| Gap aggression | `gapAggression` | Shrinks the safe following gap. High: bumper drafting, no merge space. |
| Lane indiscipline | `laneIndiscipline` | Blocked agents switch lanes to overtake. High: frequent lane changes. |

## Signal state machine (in worker)

```
phases[0] green → amberDuration → phases[1] green → amberDuration → phases[0] green → ...
```

State: `{ phaseIndex, timer, isAmber }`. Updated every tick by subtracting dt.

`isArmGreen(armId)`:
- No signal plan → always green (uncontrolled)
- Amber phase → all arms red
- Green phase → check `phases[phaseIndex].greenArmIds`

## Signal compliance

Decision made ONCE when agent first reaches the stop line (progress ≥ 0.95 in approaching phase):

```
if arm is RED:
  if random() * 100 < signalIgnore → ignore (run red)
  else → set agent.waiting = true, clamp progress to 0.95
```

While `agent.waiting`:
- speed = 0, progress clamped
- Each tick: re-check arm. If green → clear waiting, proceed normally.

At amber: treat as red for compliance purposes.

## Yield / stop compliance

At approach to a yield or stop arm (arm.yieldRule ∈ ['yield', 'stop', 'uncontrolled']):

Decision made once at stop line:
```
if random() * 100 < yieldIgnore → skip yield (don't stop)
else → set agent.yieldTimer = randomYieldDuration()
```

`randomYieldDuration()`:
- stop arm: 2–4 seconds
- yield arm: 0.5–2 seconds
- uncontrolled: 0.2–1 second

While `yieldTimer > 0`: speed = 0, progress clamped, timer counts down.

## Gap aggression (update to effectiveSpeed)

```
safeGap  = 1.5 - (gapAggression / 100) * 1.2   → [0.3m, 1.5m]
blendZone = 6  - (gapAggression / 100) * 4      → [2m, 6m]
```

High aggression → tight gap, small blend zone → vehicles stay very close = realistic
bumper-drafting, leaves no room for lane merges.

## Lane indiscipline (overtaking)

Condition (checked each tick in approaching phase):
```
if agent.speed < 0.3 * agent.targetSpeed:
  agent.blockedTime += dt
else:
  agent.blockedTime = 0

if agent.blockedTime > 1.5s AND random() * 100 < laneIndiscipline:
  tryLaneSwitch(agent)
```

`tryLaneSwitch(agent)`:
- Find adjacent inbound lane on same arm (index ± 1)
- If adjacent lane has a valid connection to agent's toArmId: switch
- Rebuild the agent's crossing path (new fromLaneIndex → new lane)
- Reset blockedTime

## Agent struct additions

```typescript
waiting: boolean      // true = held at stop line (signal or yield)
yieldTimer: number    // seconds remaining in yield pause
blockedTime: number   // seconds at < 30% targetSpeed (overtake trigger)
```

## Open questions

- [ ] Uncontrolled intersections: right-of-way priority (right-hand rule) — deferred, currently treated as yield with yieldIgnore
- [ ] Crossing-phase 2D proximity (center box collisions) — deferred post Stage 6
