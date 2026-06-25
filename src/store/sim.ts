import { create } from 'zustand'

interface SimStore {
  chaos: number
  running: boolean
  setChaos: (v: number) => void
  setRunning: (v: boolean) => void
}

export const useSimStore = create<SimStore>((set) => ({
  chaos: 50,
  running: false,
  setChaos: (chaos) => set({ chaos }),
  setRunning: (running) => set({ running }),
}))
