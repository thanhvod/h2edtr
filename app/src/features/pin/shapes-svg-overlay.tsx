import { memo } from 'react'
import type { ShapeItem, GroupItem } from '@/features/canvas/canvas-content'

type ShapesSvgOverlayProps = {
  shapes: ShapeItem[]
  groups: GroupItem[]
  width: number
  height: number
  selectedObjectId?: string | null
  selectedColor?: string
}

function numberToHex(n: number): string {
  const h = n.toString(16).padStart(6, '0')
  return `#${h}`
}

function hexToCss(hex: number | string | undefined, fallback: string): string {
  if (hex == null) return fallback
  if (typeof hex === 'string') return hex.startsWith('#') ? hex : `#${hex}`
  return numberToHex(hex)
}

export const ShapesSvgOverlay = memo(function ShapesSvgOverlay({
  shapes,
  groups,
  width,
  height,
  selectedObjectId,
  selectedColor = '#0984e3',
}: ShapesSvgOverlayProps) {
  if (width <= 0 || height <= 0) return null

  const freeShapes = shapes.filter((s) => !groups.some((g) => g.shapeIds.includes(s.id)))
  const SELECTION_STROKE = '#2563eb'
  const SELECTION_STROKE_WIDTH = 5

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}
    >
      {freeShapes.map((s) => {
        if (s.type === 'rect') {
          const fill = hexToCss(s.color, selectedColor)
          const stroke = s.id === selectedObjectId ? SELECTION_STROKE : fill
          const strokeWidth = s.id === selectedObjectId ? SELECTION_STROKE_WIDTH : s.borderWidth ?? 4
          return (
            <rect
              key={s.id}
              x={s.x}
              y={s.y}
              width={s.width}
              height={s.height}
              rx={s.radius ?? 4}
              ry={s.radius ?? 4}
              fill={fill}
              fillOpacity={0.5}
              stroke={stroke}
              strokeWidth={strokeWidth}
              vectorEffect="non-scaling-stroke"
            />
          )
        }
        if (s.type === 'circle') {
          const fill = numberToHex(0x2ecc71)
          return (
            <circle
              key={s.id}
              cx={s.x + s.radius}
              cy={s.y + s.radius}
              r={s.radius}
              fill={fill}
              fillOpacity={0.7}
              stroke={numberToHex(0x2ecc71 >> 1)}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          )
        }
        if (s.type === 'star') {
          const cx = s.x + s.radius
          const cy = s.y + s.radius
          const points = 5
          const innerR = s.radius * 0.4
          const path: string[] = []
          for (let i = 0; i < points * 2; i++) {
            const r = i % 2 === 0 ? s.radius : innerR
            const angle = (i * Math.PI) / points - Math.PI / 2
            const px = cx + r * Math.cos(angle)
            const py = cy + r * Math.sin(angle)
            path.push(`${i === 0 ? 'M' : 'L'} ${px} ${py}`)
          }
          path.push('Z')
          return (
            <path
              key={s.id}
              d={path.join(' ')}
              fill={numberToHex(0xf1c40f)}
              fillOpacity={0.7}
              stroke={numberToHex(0xf1c40f >> 1)}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          )
        }
        return null
      })}
      {groups.flatMap((g) =>
        Object.entries(g.shapes).map(([sid, s]) => {
          const worldX = g.pinX + s.localX
          const worldY = g.pinY + s.localY
          const key = `${g.id}-${sid}`
          if (s.type === 'rect') {
            const fill = hexToCss(s.color, selectedColor)
            return (
              <rect
                key={key}
                x={worldX}
                y={worldY}
                width={s.width}
                height={s.height}
                rx={s.radius ?? 4}
                ry={s.radius ?? 4}
                fill={fill}
                fillOpacity={0.5}
                stroke={fill}
                strokeWidth={s.borderWidth ?? 4}
                vectorEffect="non-scaling-stroke"
              />
            )
          }
          if (s.type === 'circle') {
            const fill = numberToHex(0x2ecc71)
            return (
              <circle
                key={key}
                cx={worldX + s.radius}
                cy={worldY + s.radius}
                r={s.radius}
                fill={fill}
                fillOpacity={0.7}
                stroke={numberToHex(0x2ecc71 >> 1)}
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
            )
          }
          if (s.type === 'star') {
            const cx = worldX + s.radius
            const cy = worldY + s.radius
            const points = 5
            const innerR = s.radius * 0.4
            const path: string[] = []
            for (let i = 0; i < points * 2; i++) {
              const r = i % 2 === 0 ? s.radius : innerR
              const angle = (i * Math.PI) / points - Math.PI / 2
              const px = cx + r * Math.cos(angle)
              const py = cy + r * Math.sin(angle)
              path.push(`${i === 0 ? 'M' : 'L'} ${px} ${py}`)
            }
            path.push('Z')
            return (
              <path
                key={key}
                d={path.join(' ')}
                fill={numberToHex(0xf1c40f)}
                fillOpacity={0.7}
                stroke={numberToHex(0xf1c40f >> 1)}
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
            )
          }
          return null
        })
      )}
    </svg>
  )
})
