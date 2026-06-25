import { create } from 'zustand'
import type { VehicleType } from '../types/graph'

export interface ChaosParams {
  speedVariance: number
  signalIgnore: number
  laneIndiscipline: number
  gapAggression: number
  yieldIgnore: number
}

export interface SpawnConfig {
  globalMultiplier: number                     // 0.1–3.0 — scales all spawn rates
  typeWeights: Record<VehicleType, number>     // 0–100 relative weight per type
}

export const DEFAULT_SPAWN_CONFIG: SpawnConfig = {
  globalMultiplier: 1.0,
  typeWeights: { car: 30, 'two-wheeler': 50, auto: 15, pedestrian: 0 },
}

export const TYPE_LABELS: Record<VehicleType, string> = {
  car: 'Cars',
  'two-wheeler': 'Two-wheelers',
  auto: 'Autos',
  pedestrian: 'Pedestrians (Stage 8)',
}

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
  spawnConfig: SpawnConfig
  running: boolean
  signalsEnabled: boolean
  resetKey: number
  setChaos: (v: number) => void
  resetParamsToChaos: () => void
  setParam: (key: keyof ChaosParams, value: number) => void
  setGlobalMultiplier: (v: number) => void
  setTypeWeight: (type: VehicleType, v: number) => void
  setRunning: (v: boolean) => void
  toggleSignals: () => void
  triggerReset: () => void
}

export const useSimStore = create<SimStore>((set) => ({
  chaos: 50,
  params: chaosPreset(50),
  spawnConfig: DEFAULT_SPAWN_CONFIG,
  running: false,
  signalsEnabled: true,
  resetKey: 0,

  setChaos: (chaos) => set({ chaos }),

  resetParamsToChaos: () =>
    set((state) => ({ params: chaosPreset(state.chaos) })),

  setParam: (key, value) =>
    set((state) => ({ params: { ...state.params, [key]: value } })),

  setGlobalMultiplier: (v) =>
    set((state) => ({
      spawnConfig: { ...state.spawnConfig, globalMultiplier: Math.max(0.1, Math.min(3, v)) },
    })),

  setTypeWeight: (type, v) =>
    set((state) => ({
      spawnConfig: {
        ...state.spawnConfig,
        typeWeights: { ...state.spawnConfig.typeWeights, [type]: Math.max(0, Math.min(100, v)) },
      },
    })),

  setRunning: (running) => set({ running }),

  toggleSignals: () => set((state) => ({ signalsEnabled: !state.signalsEnabled })),

  triggerReset: () => set((state) => ({ resetKey: state.resetKey + 1 })),
}))
