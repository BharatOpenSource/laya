import type { VehicleType } from '../types/graph'

export interface VehicleConfig {
  width: number      // metres
  length: number     // metres
  baseSpeed: number  // m/s, calm reference — chaos distribution spreads from this
  color: string      // canvas fill
  spawnWeight: number
}

export const VEHICLE_CONFIGS: Record<VehicleType, VehicleConfig> = {
  'car':         { width: 2.0, length: 4.5, baseSpeed: 8,   color: '#c0c0c0', spawnWeight: 30 },
  'two-wheeler': { width: 0.8, length: 2.0, baseSpeed: 7,   color: '#f59e0b', spawnWeight: 50 },
  'auto':        { width: 1.5, length: 3.2, baseSpeed: 6,   color: '#4ade80', spawnWeight: 15 },
  'pedestrian':  { width: 0.5, length: 0.5, baseSpeed: 1.2, color: '#60a5fa', spawnWeight: 0  },
}

const TOTAL_WEIGHT = Object.values(VEHICLE_CONFIGS).reduce((s, c) => s + c.spawnWeight, 0)

export function sampleVehicleType(): VehicleType {
  let r = Math.random() * TOTAL_WEIGHT
  for (const [type, cfg] of Object.entries(VEHICLE_CONFIGS) as [VehicleType, VehicleConfig][]) {
    r -= cfg.spawnWeight
    if (r <= 0) return type
  }
  return 'car'
}

// Box-Muller gaussian sample
function gaussian(): number {
  const u1 = Math.random() || 1e-10
  const u2 = Math.random()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

export function sampleSpeed(type: VehicleType, speedVariance: number): number {
  const base = VEHICLE_CONFIGS[type].baseSpeed
  const sigma = 0.05 + (speedVariance / 100) * 0.55
  const factor = Math.max(0.2, Math.min(2.5, 1.0 + gaussian() * sigma))
  return base * factor
}
