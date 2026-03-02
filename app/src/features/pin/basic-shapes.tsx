import { useCallback } from 'react'
import { Rectangle } from 'pixi.js'

const SELECTION_BORDER_COLOR = 0x2563eb

type RectShapeProps = {
  x: number
  y: number
  width: number
  height: number
  color?: number
  borderWidth?: number
  radius?: number
  fillAlpha?: number
  selected?: boolean
  /** When true, shape is invisible but hit area remains (for SVG overlay) */
  invisible?: boolean
}

export function RectShape({
  x,
  y,
  width,
  height,
  color = 0x3498db,
  borderWidth = 4,
  radius = 4,
  fillAlpha = 0.5,
  selected = false,
  invisible = false,
}: RectShapeProps) {
  const draw = useCallback(
    (g: import('pixi.js').Graphics) => {
      g.clear()
      if (invisible) return
      g.roundRect(0, 0, width, height, radius)
      g.fill({ color, alpha: fillAlpha })
      g.stroke({ color: selected ? SELECTION_BORDER_COLOR : color, width: selected ? 5 : borderWidth })
    },
    [width, height, color, borderWidth, radius, fillAlpha, selected, invisible]
  )
  return (
    <pixiGraphics
      x={x}
      y={y}
      draw={draw}
      eventMode="static"
      cursor="move"
      hitArea={new Rectangle(0, 0, width, height)}
    />
  )
}

type CircleShapeProps = {
  x: number
  y: number
  radius: number
  color?: number
  /** When true, shape is invisible but hit area remains (for SVG overlay) */
  invisible?: boolean
}

export function CircleShape({ x, y, radius, color = 0x2ecc71, invisible = false }: CircleShapeProps) {
  const draw = useCallback(
    (g: import('pixi.js').Graphics) => {
      g.clear()
      if (invisible) return
      g.circle(radius, radius, radius)
      g.fill({ color, alpha: 0.7 })
      g.stroke({ color: color >> 1, width: 2 })
    },
    [radius, color, invisible]
  )
  return (
    <pixiGraphics
      x={x}
      y={y}
      draw={draw}
      eventMode="static"
      cursor="move"
      hitArea={new Rectangle(0, 0, radius * 2, radius * 2)}
    />
  )
}

type StarShapeProps = {
  x: number
  y: number
  radius: number
  color?: number
  /** When true, shape is invisible but hit area remains (for SVG overlay) */
  invisible?: boolean
}

function starPath(g: import('pixi.js').Graphics, cx: number, cy: number, outerR: number) {
  const points = 5
  const innerR = outerR * 0.4
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR
    const angle = (i * Math.PI) / points - Math.PI / 2
    const px = cx + r * Math.cos(angle)
    const py = cy + r * Math.sin(angle)
    if (i === 0) g.moveTo(px, py)
    else g.lineTo(px, py)
  }
  g.closePath()
}

export function StarShape({ x, y, radius, color = 0xf1c40f, invisible = false }: StarShapeProps) {
  const draw = useCallback(
    (g: import('pixi.js').Graphics) => {
      g.clear()
      if (invisible) return
      starPath(g, radius, radius, radius)
      g.fill({ color, alpha: 0.7 })
      g.stroke({ color: color >> 1, width: 2 })
    },
    [radius, color, invisible]
  )
  return (
    <pixiGraphics
      x={x}
      y={y}
      draw={draw}
      eventMode="static"
      cursor="move"
      hitArea={new Rectangle(0, 0, radius * 2, radius * 2)}
    />
  )
}
