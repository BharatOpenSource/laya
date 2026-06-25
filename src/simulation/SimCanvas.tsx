import { useEffect, useRef } from 'react'
import { useRoadGraphStore } from '../store/roadGraph'
import { useSimStore } from '../store/sim'
import { drawFrame } from './renderer'

export function SimCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const workerRef = useRef<Worker | null>(null)
  const initializedRef = useRef(false)

  const graphRef = useRef(useRoadGraphStore.getState().graph)
  const graph = useRoadGraphStore(s => s.graph)
  const { params, running, signalsEnabled, resetKey } = useSimStore()

  useEffect(() => { graphRef.current = graph }, [graph])

  // Create worker once on mount
  useEffect(() => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    workerRef.current = worker
    initializedRef.current = false

    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type !== 'frame') return
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      drawFrame(ctx, e.data.agents, graphRef.current, canvas.width, canvas.height, e.data.signalData ?? null)
    }

    return () => { worker.terminate(); workerRef.current = null; initializedRef.current = false }
  }, [])

  useEffect(() => {
    const worker = workerRef.current
    if (!worker) return
    if (running) {
      if (!initializedRef.current) {
        worker.postMessage({ type: 'init', graph, params })
        initializedRef.current = true
      } else {
        worker.postMessage({ type: 'resume' })
      }
    } else {
      worker.postMessage({ type: 'pause' })
    }
  }, [running]) // eslint-disable-line react-hooks/exhaustive-deps

  // Structural changes (arms, lanes) — reset agents
  useEffect(() => {
    if (workerRef.current && initializedRef.current)
      workerRef.current.postMessage({ type: 'graphUpdate', graph })
  }, [graph.intersection]) // eslint-disable-line

  // Signal plan changes only — keep agents moving
  useEffect(() => {
    if (workerRef.current && initializedRef.current)
      workerRef.current.postMessage({ type: 'setSignalPlan', plan: graph.signalPlan })
  }, [graph.signalPlan]) // eslint-disable-line

  useEffect(() => {
    if (workerRef.current && initializedRef.current)
      workerRef.current.postMessage({ type: 'setParams', params })
  }, [params])

  useEffect(() => {
    if (workerRef.current && initializedRef.current)
      workerRef.current.postMessage({ type: 'setSignals', enabled: signalsEnabled })
  }, [signalsEnabled])

  useEffect(() => {
    if (resetKey === 0) return
    if (workerRef.current && initializedRef.current)
      workerRef.current.postMessage({ type: 'reset' })
  }, [resetKey])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    })
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  return <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
}
