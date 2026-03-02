import { memo } from 'react'

type CropSvgOverlayProps = {
  cropRect: { x: number; y: number; width: number; height: number } | null
  width: number
  height: number
}

const PRIMARY = '#CB2631'

export const CropSvgOverlay = memo(function CropSvgOverlay({
  cropRect,
  width,
  height,
}: CropSvgOverlayProps) {
  if (width <= 0 || height <= 0 || !cropRect) return null

  const { x, y, width: w, height: h } = cropRect

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2 }}
    >
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={4}
        ry={4}
        fill={PRIMARY}
        fillOpacity={0.3}
        stroke={PRIMARY}
        strokeWidth={4}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
})
