import { create } from 'zustand'

export interface ChaosParams {
  speedVariance: number    // 0-100: how much speeds spread from the base
  signalIgnore: number     // 0-100: how often signals are jumped
  laneIndiscipline: number // 0-100: how loosely lane assignments are followed
  gapAggression: number    // 0-100: how forcefully gaps are used when filtering/merging
  yieldIgnore: number      // 0-100: how rarely vehicles yield at yield/uncontrolled arms
}

// All five params set to the same chaos value — the master preset
function chaosPreset(chaos: number): ChaosParams {
  return {
    speedVariance: chaos,
    signalIgnore: chaos,
    laneIndiscipline: chaos,
    gapAggression: chaos,
    yieldIgnore: chaos,
  }
}

export const PARAM_LABELS: Record<keyof ChaosParams, string> = {
  speedVariance:    'Speed variance',
  signalIgnore:     'Signal jumping',
  laneIndiscipline: 'Lane indiscipline',
  gapAggression:    'Gap aggression',
  yieldIgnore:      'Yield ignoring',
}

interface SimStore {
  chaos: number
  params: ChaosParams
  running: boolean
  resetKey: number  // increment to signal SimCanvas to reset agents
  setChaos: (v: number) => void
  setParam: (key: keyof ChaosParams, value: number) => void
  setRunning: (v: boolean) => void
  triggerReset: () => void
}

export const useSimStore = create<SimStore>((set) => ({
  chaos: 50,
  params: chaosPreset(50),
  running: false,
  resetKey: 0,

  setChaos: (chaos) =>
    set({ chaos, params: chaosPreset(chaos) }),

  setParam: (key, value) =>
    set((state) => ({
      params: { ...state.params, [key]: value },
    })),

  setRunning: (running) => set({ running }),

  triggerReset: () =>
    set((state) => ({ resetKey: state.resetKey + 1 })),
}))
