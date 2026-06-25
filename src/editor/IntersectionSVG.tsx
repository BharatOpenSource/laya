import { useState, useRef, useCallback } from 'react'
import { useRoadGraphStore } from '../store/roadGraph'
import { ArmShape } from './ArmShape'
import { CenterBox } from './CenterBox'
import { SelectionPanel, type Selection } from './SelectionPanel'

const DEFAULT_VB = { x: -400, y: -400, w: 800, h: 800 }
const ZOOM_FACTOR = 1.15
const MIN_ZOOM_W = 200
const MAX_ZOOM_W = 2400

export function IntersectionSVG() {
  const graph = useRoadGraphStore(s => s.graph)
  const [selection, setSelection] = useState<Selection>(null)
  const [vb, setVb] = useState(DEFAULT_VB)
  const panStart = useRef<{ mx: number; my: number; vbx: number; vby: number } | null>(null)
  const dragged = useRef(false)
  const svgRef = useRef<SVGSVGElement>(null)

  // Convert mouse event position to SVG coordinates
  function svgCoords(e: React.MouseEvent) {
    const rect = svgRef.current!.getBoundingClientRect()
    const ratioX = (e.clientX - rect.left) / rect.width
    const ratioY = (e.clientY - rect.top) / rect.height
    return { x: vb.x + ratioX * vb.w, y: vb.y + ratioY * vb.h }
  }

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const { x: mx, y: my } = svgCoords(e)
    const factor = e.deltaY > 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR
    const newW = Math.max(MIN_ZOOM_W, Math.min(MAX_ZOOM_W, vb.w * factor))
    const newH = (vb.h / vb.w) * newW
    setVb({
      x: mx - (mx - vb.x) * (newW / vb.w),
      y: my - (my - vb.y) * (newH / vb.h),
      w: newW,
      h: newH,
    })
  }, [vb])

  function handleMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return
    dragged.current = false
    panStart.current = { mx: e.clientX, my: e.clientY, vbx: vb.x, vby: vb.y }
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!panStart.current) return
    const dx = e.clientX - panStart.current.mx
    const dy = e.clientY - panStart.current.my
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragged.current = true
    if (!dragged.current) return
    const rect = svgRef.current!.getBoundingClientRect()
    setVb(v => ({
      ...v,
      x: panStart.current!.vbx - (dx / rect.width) * v.w,
      y: panStart.current!.vby - (dy / rect.height) * v.h,
    }))
  }

  function handleMouseUp(e: React.MouseEvent) {
    if (!dragged.current && e.target === svgRef.current) setSelection(null)
    panStart.current = null
    dragged.current = false
  }

  const viewBox = `${vb.x} ${vb.y} ${vb.w} ${vb.h}`

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={viewBox}
        style={{ display: 'block', background: '#0d0d15', cursor: panStart.current ? 'grabbing' : 'default' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Center box drawn first (behind arms) */}
        <CenterBox arms={graph.intersection.arms} />

        {/* Arms */}
        {graph.intersection.arms.map(arm => (
          <ArmShape
            key={arm.id}
            arm={arm}
            selected={selection?.armId === arm.id && selection.type === 'arm'}
            selectedLaneId={
              selection?.type === 'lane' && selection.armId === arm.id
                ? selection.laneId
                : null
            }
            onSelectArm={() => setSelection({ type: 'arm', armId: arm.id })}
            onSelectLane={laneId => setSelection({ type: 'lane', armId: arm.id, laneId })}
          />
        ))}
      </svg>

      <SelectionPanel selection={selection} onDeselect={() => setSelection(null)} />
    </div>
  )
}
