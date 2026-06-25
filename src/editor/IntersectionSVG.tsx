import { useState, useRef, useCallback } from 'react'
import { useRoadGraphStore } from '../store/roadGraph'
import { ArmShape } from './ArmShape'
import { CenterBox } from './CenterBox'
import { SelectionPanel, type Selection } from './SelectionPanel'
import { SCALE } from './geometry'

// Default viewBox: arm is 60m at scale 5 = 300 SVG units; need ±340 to clear labels with margin
const DEFAULT_VB = { x: -380, y: -380, w: 760, h: 760 }
const ZOOM_FACTOR = 1.15
const MIN_ZOOM_W = 100
const MAX_ZOOM_W = 2400

// Arm label position in absolute SVG coords (not inside any rotating group)
function labelPos(angleDeg: number, lengthM: number) {
  const rad = (angleDeg * Math.PI) / 180
  const dist = lengthM * SCALE + 16
  return {
    x: dist * Math.sin(rad),
    y: -dist * Math.cos(rad),
  }
}

export function IntersectionSVG() {
  const graph = useRoadGraphStore(s => s.graph)
  const [selection, setSelection] = useState<Selection>(null)
  const [vb, setVb] = useState(DEFAULT_VB)
  const panStart = useRef<{ mx: number; my: number; vbx: number; vby: number } | null>(null)
  const dragged = useRef(false)
  const svgRef = useRef<SVGSVGElement>(null)

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
      <div style={navStyle}>
        <button style={navBtn} title="Re-center view (Home)" onClick={() => setVb(DEFAULT_VB)}>⌂</button>
      </div>
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
        <CenterBox arms={graph.intersection.arms} />

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

        {/* Labels rendered outside rotating groups so they always read upright */}
        {graph.intersection.arms.map(arm => {
          const { x, y } = labelPos(arm.angle, arm.length)
          return (
            <text
              key={`label-${arm.id}`}
              x={x} y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#666"
              fontSize={11}
              style={{ userSelect: 'none', pointerEvents: 'none' }}
            >
              {arm.label}
            </text>
          )
        })}
      </svg>

      <SelectionPanel selection={selection} onDeselect={() => setSelection(null)} />
    </div>
  )
}

const navStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 10,
  left: 10,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  zIndex: 5,
}

const navBtn: React.CSSProperties = {
  width: 30,
  height: 30,
  background: '#1e1e2a',
  border: '1px solid #2a2a40',
  borderRadius: 4,
  color: '#888',
  fontSize: 16,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: 1,
}
