# Latest Task — TraffiProject

> Rolling log. Current session only — 1-2 sessions max. 200-line limit.

## Session: 2026-06-25

**Status:** Named + repo created + road graph spec started.

**Completed:**
- [x] Name locked: Laya (लय) — rhythm, tempo, cadence
- [x] GitHub repo created: https://github.com/BharatOpenSource/laya
- [x] Local git initialised, CLAUDE.md + docs pushed to main
- [x] Road graph spec written: `docs/spec-road-graph.md`

**Pending:**
- [ ] Road graph spec — resolve open questions (u-turn rule, lane width uniformity, stop line position, spawn rate)
- [ ] Editor mechanics spec
- [ ] Research Indian vehicle data (IIT papers, CRRI)
- [ ] Define scoring mechanic for challenge mode
- [ ] Decide validation approach for simulation accuracy
- [ ] Write competitive landscape notes (vs VISSIM, Aimsun, Synchro)

**Open questions this session:**
- U-turn: explicit lane flag or always permitted at chaos > 0?
- Lane width: uniform per arm (IRC standard) or configurable per lane?
- Stop line position: fixed at distance 0 from center, or explicit per arm?
- Arm length: does it control agent spawn rate, or is that separate?
