import { create } from 'zustand'

export interface ChaosParams {
  speedVariance: number
  signalIgnore: number
  laneIndiscipline: number
  gapAggression: number
  yieldIgnore: number
}

// Used only for the "Reset to chaos" button — does NOT auto-apply
export function chaosPreset(chaos: number): ChaosParams {
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
  signalsEnabled: boolean
  resetKey: number
  setChaos: (v: number) => void           // only updates chaos reference, never touches params
  resetParamsToChaos: () => void          // explicitly sync params to current chaos level
  setParam: (key: keyof ChaosParams, value: number) => void
  setRunning: (v: boolean) => void
  toggleSignals: () => void
  triggerReset: () => void
}

export const useSimStore = create<SimStore>((set) => ({
  chaos: 50,
  params: chaosPreset(50),
  running: false,
  signalsEnabled: true,
  resetKey: 0,

  setChaos: (chaos) => set({ chaos }),  // ← params untouched

  resetParamsToChaos: () =>
    set((state) => ({ params: chaosPreset(state.chaos) })),

  setParam: (key, value) =>
    set((state) => ({ params: { ...state.params, [key]: value } })),

  setRunning: (running) => set({ running }),

  toggleSignals: () => set((state) => ({ signalsEnabled: !state.signalsEnabled })),

  triggerReset: () => set((state) => ({ resetKey: state.resetKey + 1 })),
}))
