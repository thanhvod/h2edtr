import type { ShapeItem, PinItem, GroupItem } from '@/features/canvas/canvas-content'
import { PIN_SIZE } from '@/features/pin/pin-shape'

const PIN_PATH =
  'M14.6523 3.57693C13.4199 2.34449 11.3126 3.21735 11.3126 4.96028C11.3126 5.47914 11.1065 5.97674 10.7396 6.34363L9.11887 7.96433C8.75198 8.33122 8.25438 8.53733 7.73552 8.53733C5.99259 8.53733 5.11972 10.6446 6.35216 11.877L8.72844 14.2533L3.21088 19.7709C2.92971 20.0521 2.92971 20.5079 3.21088 20.7891C3.49206 21.0703 3.94794 21.0703 4.22912 20.7891L9.74668 15.2716L12.1229 17.6478C13.3554 18.8802 15.4626 18.0074 15.4626 16.2645C15.4626 15.7456 15.6688 15.248 16.0357 14.8811L17.6564 13.2604C18.0232 12.8935 18.5209 12.6874 19.0397 12.6874C20.7826 12.6874 21.6555 10.5801 20.4231 9.34768L14.6523 3.57693Z'

function hexToCss(hex: number | string | undefined, fallback: string): string {
  if (hex == null) return fallback
  if (typeof hex === 'string') return hex.startsWith('#') ? hex : `#${hex}`
  const h = hex.toString(16).padStart(6, '0')
  return `#${h}`
}

function intersectsBounds(
  x: number,
  y: number,
  w: number,
  h: number,
  bounds: { x: number; y: number; width: number; height: number }
): boolean {
  return x + w >= bounds.x && x <= bounds.x + bounds.width && y + h >= bounds.y && y <= bounds.y + bounds.height
}

export function drawShapesAndPinsToContext(
  ctx: CanvasRenderingContext2D,
  shapes: ShapeItem[],
  pins: PinItem[],
  groups: GroupItem[],
  bounds: { x: number; y: number; width: number; height: number },
  defaultColor = '#0984e3'
) {
  const freeShapes = shapes.filter((s) => !groups.some((g) => g.shapeIds.includes(s.id)))
  const pinOffset = PIN_SIZE / 2

  // Draw free shapes
  for (const s of freeShapes) {
    if (s.type === 'rect') {
      if (!intersectsBounds(s.x, s.y, s.width, s.height, bounds)) continue
      const fill = hexToCss(s.color, defaultColor)
      ctx.fillStyle = fill
      ctx.globalAlpha = 0.5
      ctx.strokeStyle = fill
      ctx.lineWidth = s.borderWidth ?? 4
      ctx.beginPath()
      const r = s.radius ?? 4
      ctx.roundRect(s.x, s.y, s.width, s.height, r)
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.stroke()
    } else if (s.type === 'circle') {
      if (!intersectsBounds(s.x, s.y, s.radius * 2, s.radius * 2, bounds)) continue
      const fill = '#2ecc71'
      ctx.fillStyle = fill
      ctx.globalAlpha = 0.7
      ctx.strokeStyle = '#179b34'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(s.x + s.radius, s.y + s.radius, s.radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.stroke()
    } else if (s.type === 'star') {
      const cx = s.x + s.radius
      const cy = s.y + s.radius
      if (!intersectsBounds(s.x, s.y, s.radius * 2, s.radius * 2, bounds)) continue
      const points = 5
      const innerR = s.radius * 0.4
      ctx.fillStyle = '#f1c40f'
      ctx.globalAlpha = 0.7
      ctx.strokeStyle = '#b7950b'
      ctx.lineWidth = 2
      ctx.beginPath()
      for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? s.radius : innerR
        const angle = (i * Math.PI) / points - Math.PI / 2
        const px = cx + r * Math.cos(angle)
        const py = cy + r * Math.sin(angle)
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.stroke()
    }
  }

  // Draw group shapes
  for (const g of groups) {
    for (const [, s] of Object.entries(g.shapes)) {
      const worldX = g.pinX + s.localX
      const worldY = g.pinY + s.localY
      if (s.type === 'rect') {
        if (!intersectsBounds(worldX, worldY, s.width, s.height, bounds)) continue
        const fill = hexToCss(s.color, defaultColor)
        ctx.fillStyle = fill
        ctx.globalAlpha = 0.5
        ctx.strokeStyle = fill
        ctx.lineWidth = s.borderWidth ?? 4
        ctx.beginPath()
        const r = s.radius ?? 4
        ctx.roundRect(worldX, worldY, s.width, s.height, r)
        ctx.fill()
        ctx.globalAlpha = 1
        ctx.stroke()
      } else if (s.type === 'circle') {
        if (!intersectsBounds(worldX, worldY, s.radius * 2, s.radius * 2, bounds)) continue
        ctx.fillStyle = '#2ecc71'
        ctx.globalAlpha = 0.7
        ctx.strokeStyle = '#179b34'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(worldX + s.radius, worldY + s.radius, s.radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
        ctx.stroke()
      } else if (s.type === 'star') {
        const cx = worldX + s.radius
        const cy = worldY + s.radius
        if (!intersectsBounds(worldX, worldY, s.radius * 2, s.radius * 2, bounds)) continue
        const points = 5
        const innerR = s.radius * 0.4
        ctx.fillStyle = '#f1c40f'
        ctx.globalAlpha = 0.7
        ctx.strokeStyle = '#b7950b'
        ctx.lineWidth = 2
        ctx.beginPath()
        for (let i = 0; i < points * 2; i++) {
          const r = i % 2 === 0 ? s.radius : innerR
          const angle = (i * Math.PI) / points - Math.PI / 2
          const px = cx + r * Math.cos(angle)
          const py = cy + r * Math.sin(angle)
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.fill()
        ctx.globalAlpha = 1
        ctx.stroke()
      }
    }
  }

  // Draw pins (free pins)
  const pinPath = new Path2D(PIN_PATH)
  const pinScale = PIN_SIZE / 24
  for (const p of pins) {
    const px = p.x - pinOffset
    const py = p.y - pinOffset
    if (!intersectsBounds(px, py, PIN_SIZE, PIN_SIZE, bounds)) continue
    ctx.save()
    ctx.translate(px, py)
    ctx.scale(pinScale, pinScale)
    ctx.fillStyle = p.color ?? '#e74c3c'
    ctx.fill(pinPath)
    ctx.restore()
  }

  // Draw pins (groups)
  for (const g of groups) {
    const px = g.pinX - pinOffset
    const py = g.pinY - pinOffset
    if (!intersectsBounds(px, py, PIN_SIZE, PIN_SIZE, bounds)) continue
    ctx.save()
    ctx.translate(px, py)
    ctx.scale(pinScale, pinScale)
    ctx.fillStyle = '#CB2631'
    ctx.fill(pinPath)
    ctx.restore()
  }
}
