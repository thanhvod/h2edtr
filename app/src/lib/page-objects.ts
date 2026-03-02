import { PAGE_HEIGHT, GAP } from './pdf-dimensions'
import type { ShapeItem, GroupItem, PinItem } from '@/features/canvas/canvas-content'

export type PageObjectItem = { id: string; label: string }

function getShapeCenterY(shape: ShapeItem, group?: GroupItem): number {
  if (group && shape.id in group.shapes) {
    const s = group.shapes[shape.id]
    return group.pinY + s.localY + (s.type === 'rect' ? s.height / 2 : s.radius)
  }
  return shape.type === 'rect' ? shape.y + shape.height / 2 : shape.y + shape.radius
}

export function getPageObjects(
  numPages: number,
  shapes: ShapeItem[],
  groups: GroupItem[],
  pins: PinItem[] = []
): Record<number, PageObjectItem[]> {
  const result: Record<number, PageObjectItem[]> = {}
  for (let p = 1; p <= numPages; p++) result[p] = []

  const freeShapes = shapes.filter((s) => !groups.some((g) => g.shapeIds.includes(s.id)))
  const freePins = pins.filter((p) => !groups.some((g) => g.pinId === p.id))

  const pageHeightWithGap = PAGE_HEIGHT + GAP
  let rectIndex = 0
  let pinIndex = 0

  for (const s of freeShapes) {
    const cy = getShapeCenterY(s)
    const page = Math.max(1, Math.min(numPages, Math.floor(cy / pageHeightWithGap) + 1))
    const label =
      s.type === 'rect'
        ? `Rectangle ${++rectIndex}`
        : s.type === 'star'
          ? 'Star'
          : 'Circle'
    result[page].push({ id: s.id, label })
  }

  for (const g of groups) {
    const cy = g.pinY
    const page = Math.max(1, Math.min(numPages, Math.floor(cy / pageHeightWithGap) + 1))
    result[page].push({ id: g.id, label: 'Pin group' })
  }

  for (const pin of freePins) {
    const page = Math.max(1, Math.min(numPages, Math.floor(pin.y / pageHeightWithGap) + 1))
    result[page].push({ id: pin.id, label: `Pin ${++pinIndex}` })
  }

  return result
}
