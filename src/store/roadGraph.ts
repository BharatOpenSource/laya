import { create } from 'zustand'
import { nanoid } from 'nanoid'
import { preset4Way } from '../graph/presets'
import type { Arm, Id, Lane, RoadGraph, SignalPlan } from '../types/graph'

interface RoadGraphStore {
  graph: RoadGraph
  setGraph: (graph: RoadGraph) => void
  updateArm: (armId: Id, changes: Partial<Omit<Arm, 'id'>>) => void
  addArm: (arm: Arm) => void
  removeArm: (armId: Id) => void
  updateLane: (armId: Id, laneId: Id, changes: Partial<Omit<Lane, 'id' | 'index'>>) => void
  setSignalPlan: (plan: SignalPlan | null) => void
}

export const useRoadGraphStore = create<RoadGraphStore>((set) => ({
  graph: preset4Way(),

  setGraph: (graph) => set({ graph }),

  updateArm: (armId, changes) =>
    set((state) => ({
      graph: {
        ...state.graph,
        intersection: {
          ...state.graph.intersection,
          arms: state.graph.intersection.arms.map((arm) =>
            arm.id === armId ? { ...arm, ...changes } : arm
          ),
        },
      },
    })),

  addArm: (arm) =>
    set((state) => ({
      graph: {
        ...state.graph,
        intersection: {
          ...state.graph.intersection,
          arms: [...state.graph.intersection.arms, arm],
        },
      },
    })),

  removeArm: (armId) =>
    set((state) => ({
      graph: {
        ...state.graph,
        intersection: {
          ...state.graph.intersection,
          arms: state.graph.intersection.arms.filter((arm) => arm.id !== armId),
        },
        // Remove this arm from all signal phases
        signalPlan: state.graph.signalPlan
          ? {
              ...state.graph.signalPlan,
              phases: state.graph.signalPlan.phases.map((phase) => ({
                ...phase,
                greenArmIds: phase.greenArmIds.filter((id) => id !== armId),
              })),
            }
          : null,
      },
    })),

  updateLane: (armId, laneId, changes) =>
    set((state) => ({
      graph: {
        ...state.graph,
        intersection: {
          ...state.graph.intersection,
          arms: state.graph.intersection.arms.map((arm) => {
            if (arm.id !== armId) return arm
            const updateLanes = (lanes: Lane[]) =>
              lanes.map((lane) =>
                lane.id === laneId ? { ...lane, ...changes } : lane
              )
            return {
              ...arm,
              inboundLanes: updateLanes(arm.inboundLanes),
              outboundLanes: updateLanes(arm.outboundLanes),
            }
          }),
        },
      },
    })),

  setSignalPlan: (plan) =>
    set((state) => ({
      graph: { ...state.graph, signalPlan: plan },
    })),
}))

// Convenience: build a new arm at the given angle with defaults
export function makeDefaultArm(angle: number, label?: string): Arm {
  return {
    id: nanoid(),
    label: label ?? `Arm`,
    angle,
    length: 60,
    stopLineOffset: 5.0,
    spawnRate: 200,
    yieldRule: 'signal',
    inboundLanes: [
      { id: nanoid(), index: 0, width: 3.5, allowedMovements: ['left', 'straight'] },
      { id: nanoid(), index: 1, width: 3.5, allowedMovements: ['straight', 'right'] },
    ],
    outboundLanes: [
      { id: nanoid(), index: 0, width: 3.5 },
      { id: nanoid(), index: 1, width: 3.5 },
    ],
  }
}
