import { memo, useCallback } from 'react'
import type { ShapeItem, GroupItem } from '@/features/canvas/canvas-content'

const RESIZE_HANDLE_SIZE = 16

type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se'

type ResizeHandlesSvgOverlayProps = {
  shapes: ShapeItem[]
  groups: GroupItem[]
  width: number
  height: number
  selectedObjectId?: string | null
  tool?: string
  onResizePointerDown?: (shapeId: string, corner: ResizeCorner, x: number, y: number) => void
}

export const ResizeHandlesSvgOverlay = memo(function ResizeHandlesSvgOverlay({
  shapes,
  groups,
  width,
  height,
  selectedObjectId,
  tool = 'select',
  onResizePointerDown,
}: ResizeHandlesSvgOverlayProps) {
  const freeShapes = shapes.filter((s) => !groups.some((g) => g.shapeIds.includes(s.id)))
  const selectedRect = freeShapes.find(
    (s): s is ShapeItem & { type: 'rect' } => s.type === 'rect' && s.id === selectedObjectId
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGRectElement>, shapeId: string, corner: ResizeCorner) => {
      e.stopPropagation()
      if (!onResizePointerDown) return
      const svg = e.currentTarget.ownerSVGElement
      if (!svg) return
      const pt = svg.createSVGPoint()
      pt.x = e.clientX
      pt.y = e.clientY
      const svgPt = pt.matrixTransform(svg.getScreenCTM()?.inverse())
      onResizePointerDown(shapeId, corner, svgPt.x, svgPt.y)
    },
    [onResizePointerDown]
  )

  if (width <= 0 || height <= 0 || tool !== 'select' || !selectedRect || !onResizePointerDown) {
    return null
  }

  const corners: ResizeCorner[] = ['nw', 'ne', 'sw', 'se']
  const handlePositions: Record<ResizeCorner, [number, number]> = {
    nw: [selectedRect.x, selectedRect.y],
    ne: [selectedRect.x + selectedRect.width, selectedRect.y],
    sw: [selectedRect.x, selectedRect.y + selectedRect.height],
    se: [selectedRect.x + selectedRect.width, selectedRect.y + selectedRect.height],
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3 }}
    >
      <g style={{ pointerEvents: 'auto' }}>
        {corners.map((corner) => {
          const [hx, hy] = handlePositions[corner]
          const handleX = corner === 'ne' || corner === 'se' ? hx - RESIZE_HANDLE_SIZE : hx
          const handleY = corner === 'sw' || corner === 'se' ? hy - RESIZE_HANDLE_SIZE : hy
          return (
            <rect
              key={corner}
              x={handleX}
              y={handleY}
              width={RESIZE_HANDLE_SIZE}
              height={RESIZE_HANDLE_SIZE}
              fill="#ffffff"
              stroke="#2563eb"
              strokeWidth={3}
              vectorEffect="non-scaling-stroke"
              style={{ cursor: corner === 'nw' || corner === 'se' ? 'nwse-resize' : 'nesw-resize' }}
              onPointerDown={(e) => handlePointerDown(e, selectedRect.id, corner)}
            />
          )
        })}
      </g>
    </svg>
  )
})
