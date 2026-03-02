import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Rectangle } from 'pixi.js'
import { PinShape, PIN_SIZE } from '@/features/pin/pin-shape'
import { RectShape, CircleShape, StarShape } from '@/features/pin/basic-shapes'
const MIN_CROP = 10
const MIN_DRAW = 10
const MIN_RECT = 20
const DRAG_THRESHOLD = 5

type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se'

export type ShapeItem =
  | {
      id: string
      type: 'rect'
      x: number
      y: number
      width: number
      height: number
      borderWidth?: number
      radius?: number
      color?: string
    }
  | { id: string; type: 'circle'; x: number; y: number; radius: number }
  | { id: string; type: 'star'; x: number; y: number; radius: number }

export type DrawShape = 'rect' | 'circle' | 'star'

export type PinItem = { id: string; x: number; y: number; color?: string; attachedToShapeId?: string }

export type GroupShape =
  | {
      type: 'rect'
      localX: number
      localY: number
      width: number
      height: number
      borderWidth?: number
      radius?: number
      color?: string
    }
  | { type: 'circle'; localX: number; localY: number; radius: number }
  | { type: 'star'; localX: number; localY: number; radius: number }

export type GroupItem = {
  id: string
  pinX: number
  pinY: number
  pinId: string
  shapeIds: string[]
  shapes: Record<string, GroupShape>
}

export type CanvasTool = 'select' | 'draw' | 'pin' | 'camera'

type CanvasContentProps = {
  tool: CanvasTool
  drawShape?: DrawShape
  selectedColor?: string
  width?: number
  height?: number
  zoom?: number
  onToast: (msg: string) => void
  onCropComplete: (bounds: { x: number; y: number; width: number; height: number }) => void
  onCropRectChange?: (rect: { x: number; y: number; width: number; height: number } | null) => void
  initialShapes?: ShapeItem[]
  initialPins?: PinItem[]
  initialGroups?: GroupItem[]
  onStateChange?: (state: { shapes: ShapeItem[]; pins: PinItem[]; groups: GroupItem[] }) => void
  selectedShapeId?: string | null
  onShapeSelect?: (shapeId: string, color?: string) => void
  onPinSelect?: (pinId: string, color?: string) => void
  onGroupSelect?: (groupId: string) => void
  onSelectionClear?: () => void
  cloneRef?: React.MutableRefObject<(() => void) | null>
  deleteRef?: React.MutableRefObject<(() => void) | null>
  undoRef?: React.MutableRefObject<(() => void) | null>
  redoRef?: React.MutableRefObject<(() => void) | null>
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void
  updateObjectRef?: React.MutableRefObject<((id: string, updates: Partial<{ x: number; y: number; width: number; height: number }>) => void) | null>
  resizePointerDownRef?: React.MutableRefObject<
    ((shapeId: string, corner: ResizeCorner, x: number, y: number) => void) | null
  >
}

const MAX_UNDO = 30
const MAX_REDO = 10

const CLONE_OFFSET_X = 50
const CLONE_OFFSET_Y = 50

function hexToNumber(hex: string): number {
  return parseInt(hex.replace(/^#/, ''), 16)
}

function isPointInRect(
  px: number,
  py: number,
  rect: { x: number; y: number; width: number; height: number }
): boolean {
  return px >= rect.x && px <= rect.x + rect.width && py >= rect.y && py <= rect.y + rect.height
}

function getShapeRectBounds(
  shapeId: string,
  shapes: ShapeItem[],
  groups: GroupItem[],
  groupPinOverride?: { groupId: string; pinX: number; pinY: number }
): { x: number; y: number; width: number; height: number } | null {
  const free = shapes.find((s) => s.id === shapeId && !groups.some((g) => g.shapeIds.includes(s.id)))
  if (free) {
    if (free.type === 'rect') {
      return { x: free.x, y: free.y, width: free.width, height: free.height }
    }
    const r = free.radius
    return { x: free.x, y: free.y, width: r * 2, height: r * 2 }
  }
  for (const g of groups) {
    if (g.shapeIds.includes(shapeId) && shapeId in g.shapes) {
      const s = g.shapes[shapeId]
      const pinX = groupPinOverride?.groupId === g.id ? groupPinOverride.pinX : g.pinX
      const pinY = groupPinOverride?.groupId === g.id ? groupPinOverride.pinY : g.pinY
      if (s.type === 'rect') {
        return {
          x: pinX + s.localX,
          y: pinY + s.localY,
          width: s.width,
          height: s.height,
        }
      }
      const r = s.radius
      return { x: pinX + s.localX, y: pinY + s.localY, width: r * 2, height: r * 2 }
    }
  }
  return null
}

function getRectOverlapBounds(
  shapeIds: string[],
  shapes: ShapeItem[],
  groups: GroupItem[],
  groupPinOverride?: { groupId: string; pinX: number; pinY: number }
): { x: number; y: number; width: number; height: number } | null {
  const rects = shapeIds
    .map((id) => getShapeRectBounds(id, shapes, groups, groupPinOverride))
    .filter((r): r is { x: number; y: number; width: number; height: number } => r != null)
  if (rects.length === 0) return null
  let x = rects[0].x
  let y = rects[0].y
  let right = rects[0].x + rects[0].width
  let bottom = rects[0].y + rects[0].height
  for (let i = 1; i < rects.length; i++) {
    const r = rects[i]
    x = Math.max(x, r.x)
    y = Math.max(y, r.y)
    right = Math.min(right, r.x + r.width)
    bottom = Math.min(bottom, r.y + r.height)
  }
  const width = right - x
  const height = bottom - y
  if (width <= 0 || height <= 0) return null
  return { x, y, width, height }
}

function isPointInOverlap(
  px: number,
  py: number,
  shapeIds: string[],
  shapes: ShapeItem[],
  groups: GroupItem[],
  groupPinOverride?: { groupId: string; pinX: number; pinY: number }
): boolean {
  const bounds = getRectOverlapBounds(shapeIds, shapes, groups, groupPinOverride)
  if (!bounds) return false
  return isPointInRect(px, py, bounds)
}

export function CanvasContent({
  tool,
  drawShape = 'rect',
  selectedColor = '#0984e3',
  width = 0,
  height = 0,
  zoom: _zoom = 1,
  onToast,
  onCropComplete,
  onCropRectChange,
  initialShapes,
  initialPins,
  initialGroups,
  onStateChange,
  selectedShapeId: selectedShapeIdProp,
  onShapeSelect,
  onPinSelect,
  onGroupSelect,
  onSelectionClear,
  cloneRef,
  deleteRef,
  undoRef,
  redoRef,
  onHistoryChange,
  updateObjectRef,
  resizePointerDownRef,
}: CanvasContentProps) {
  const [shapes, setShapes] = useState<ShapeItem[]>(initialShapes ?? [])
  const [pins, setPins] = useState<PinItem[]>(initialPins ?? [])
  const [groups, setGroups] = useState<GroupItem[]>(initialGroups ?? [])
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null)
  const [cropCurrent, setCropCurrent] = useState<{ x: number; y: number } | null>(null)
  const [draggingPin, setDraggingPin] = useState<{ id: string; startX: number; startY: number } | null>(null)
  const [draggingGroupPin, setDraggingGroupPin] = useState<{
    groupId: string
    startX: number
    startY: number
    startPinX: number
    startPinY: number
  } | null>(null)

  useEffect(() => {
    onStateChange?.({ shapes, pins, groups })
  }, [shapes, pins, groups, onStateChange])

  useEffect(() => {
    onHistoryChange?.(undoStackRef.current.length > 0, redoStackRef.current.length > 0)
  }, [onHistoryChange])

  useEffect(() => {
    if (!cropStart || !cropCurrent) {
      onCropRectChange?.(null)
      return
    }
    const minX = Math.min(cropStart.x, cropCurrent.x)
    const minY = Math.min(cropStart.y, cropCurrent.y)
    const w = Math.abs(cropCurrent.x - cropStart.x)
    const h = Math.abs(cropCurrent.y - cropStart.y)
    onCropRectChange?.({ x: minX, y: minY, width: w, height: h })
  }, [cropStart, cropCurrent, onCropRectChange])

  useEffect(() => {
    if (tool !== 'draw') {
      setDrawStart(null)
      setDrawCurrent(null)
    }
  }, [tool])

  useEffect(() => {
    if (tool !== 'camera') {
      setCropStart(null)
      setCropCurrent(null)
    }
  }, [tool])

  const [draggingGroup, setDraggingGroup] = useState<{ id: string; startX: number; startY: number } | null>(null)
  const [draggingShape, setDraggingShape] = useState<{
    id: string
    startX: number
    startY: number
    shapeStartX: number
    shapeStartY: number
    attachedPinStarts: Array<{ pinId: string; startX: number; startY: number }>
  } | null>(null)
  const [pointerDownOnShape, setPointerDownOnShape] = useState<{ id: string; startX: number; startY: number } | null>(null)
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null)
  const [resizingShape, setResizingShape] = useState<{
    id: string
    corner: ResizeCorner
    startX: number
    startY: number
    startRect: { x: number; y: number; width: number; height: number }
  } | null>(null)
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null)
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null)
  const idCounter = useRef(1)

  type CanvasSnapshot = { shapes: ShapeItem[]; pins: PinItem[]; groups: GroupItem[] }
  const undoStackRef = useRef<CanvasSnapshot[]>([])
  const redoStackRef = useRef<CanvasSnapshot[]>([])
  const draggingGroupPinPosRef = useRef<{ pinX: number; pinY: number } | null>(null)
  const draggingPinPosRef = useRef<{ x: number; y: number } | null>(null)
  const draggingGroupPosRef = useRef<{ pinX: number; pinY: number } | null>(null)
  const lastPinAddRef = useRef<{ x: number; y: number; t: number } | null>(null)
  const groupRestoreInProgressRef = useRef<string | null>(null)

  const pushSnapshot = useCallback(() => {
    const s: CanvasSnapshot = {
      shapes: shapes.map((x) => ({ ...x })),
      pins: pins.map((x) => ({ ...x })),
      groups: groups.map((g) => ({ ...g, shapes: { ...g.shapes } })),
    }
    undoStackRef.current = [...undoStackRef.current.slice(-(MAX_UNDO - 1)), s]
    redoStackRef.current = []
    onHistoryChange?.(undoStackRef.current.length > 0, false)
  }, [shapes, pins, groups, onHistoryChange])

  const performUndo = useCallback(() => {
    const prev = undoStackRef.current.pop()
    if (!prev) return
    redoStackRef.current = [
      ...redoStackRef.current.slice(-(MAX_REDO - 1)),
      { shapes: [...shapes], pins: [...pins], groups: groups.map((g) => ({ ...g, shapes: { ...g.shapes } })) },
    ]
    setShapes(prev.shapes)
    setPins(prev.pins)
    setGroups(prev.groups)
    onHistoryChange?.(undoStackRef.current.length > 0, redoStackRef.current.length > 0)
  }, [shapes, pins, groups, onHistoryChange])

  const performRedo = useCallback(() => {
    const next = redoStackRef.current.pop()
    if (!next) return
    undoStackRef.current = [
      ...undoStackRef.current.slice(-(MAX_UNDO - 1)),
      { shapes: [...shapes], pins: [...pins], groups: groups.map((g) => ({ ...g, shapes: { ...g.shapes } })) },
    ]
    setShapes(next.shapes)
    setPins(next.pins)
    setGroups(next.groups)
    onHistoryChange?.(undoStackRef.current.length > 0, redoStackRef.current.length > 0)
  }, [shapes, pins, groups, onHistoryChange])

  const getShapeWorldPos = useCallback((shape: ShapeItem, group?: GroupItem) => {
    if (group && shape.id in group.shapes) {
      const s = group.shapes[shape.id]
      return { x: group.pinX + s.localX, y: group.pinY + s.localY }
    }
    return { x: shape.x, y: shape.y }
  }, [])

  const shapesAtPoint = useCallback((px: number, py: number): string[] => {
    const hit: string[] = []
    const free = shapes.filter((s) => !groups.some((g) => g.shapeIds.includes(s.id)))
    for (const s of free) {
      const pos = getShapeWorldPos(s)
      if (s.type === 'rect') {
        if (px >= pos.x && px <= pos.x + s.width && py >= pos.y && py <= pos.y + s.height) hit.push(s.id)
      } else {
        const cx = pos.x + s.radius
        const cy = pos.y + s.radius
        const dx = px - cx
        const dy = py - cy
        if (dx * dx + dy * dy <= s.radius * s.radius) hit.push(s.id)
      }
    }
    return hit
  }, [shapes, groups, getShapeWorldPos])

  const isPointOnPin = useCallback(
    (px: number, py: number) => {
      const half = PIN_SIZE / 2
      for (const p of pins) {
        if (px >= p.x - half && px <= p.x + half && py >= p.y - half && py <= p.y + half) return true
      }
      for (const g of groups) {
        if (px >= g.pinX - half && px <= g.pinX + half && py >= g.pinY - half && py <= g.pinY + half)
          return true
      }
      return false
    },
    [pins, groups]
  )

  const handleStagePointerDown = useCallback(
    (e: { global: { x: number; y: number } }) => {
      const scale = 1 / (_zoom || 1)
      const x = e.global.x * scale
      const y = e.global.y * scale
      if (tool === 'select') {
        if (!isPointOnPin(x, y)) {
          if (onSelectionClear) onSelectionClear()
          else setSelectedShapeId(null)
        }
      }
      if (tool === 'pin') {
        if (isPointOnPin(x, y)) return
        const now = Date.now()
        const last = lastPinAddRef.current
        if (last && now - last.t < 300 && Math.abs(last.x - x) < 8 && Math.abs(last.y - y) < 8) return
        lastPinAddRef.current = { x, y, t: now }
        pushSnapshot()
        const id = `pin-${idCounter.current++}`
        const defaultPinColor = '#e74c3c'
        const hit = shapesAtPoint(x, y)
        const unique = [...new Set(hit)]
        if (unique.length >= 2) {
          const limited = unique.slice(0, 10)
          const pin = { id, x, y, color: defaultPinColor }
          const groupShapes: GroupItem['shapes'] = {}
          for (const s of shapes) {
            if (limited.includes(s.id) && !groups.some((g) => g.shapeIds.includes(s.id))) {
              const pos = getShapeWorldPos(s)
              if (s.type === 'rect') {
                groupShapes[s.id] = {
                  type: 'rect',
                  width: s.width,
                  height: s.height,
                  localX: pos.x - pin.x,
                  localY: pos.y - pin.y,
                  borderWidth: s.borderWidth,
                  radius: s.radius,
                  color: s.color,
                }
              } else {
                groupShapes[s.id] = {
                  type: s.type,
                  radius: s.radius,
                  localX: pos.x - pin.x,
                  localY: pos.y - pin.y,
                }
              }
            }
          }
          const groupId = `group-${idCounter.current++}`
          setGroups((g) => [...g, { id: groupId, pinX: pin.x, pinY: pin.y, pinId: id, shapeIds: limited, shapes: groupShapes }])
          setShapes((s) => s.filter((sh) => !limited.includes(sh.id)))
          onGroupSelect?.(groupId)
        } else if (unique.length === 1) {
          setPins((p) => [...p, { id, x, y, color: defaultPinColor, attachedToShapeId: unique[0] }])
          onPinSelect?.(id, defaultPinColor)
        } else {
          setPins((p) => [...p, { id, x, y, color: defaultPinColor }])
          onPinSelect?.(id, defaultPinColor)
        }
      } else if (tool === 'draw') {
        setDrawStart({ x, y })
        setDrawCurrent({ x, y })
      } else if (tool === 'camera') {
        setCropStart({ x, y })
        setCropCurrent({ x, y })
      }
    },
    [tool, onSelectionClear, pushSnapshot, isPointOnPin, onPinSelect, onGroupSelect, shapesAtPoint, getShapeWorldPos, shapes, groups, _zoom]
  )

  const handleStagePointerMove = useCallback(
    (e: { global: { x: number; y: number } }) => {
      const scale = 1 / (_zoom || 1)
      const x = e.global.x * scale
      const y = e.global.y * scale
      if (cropStart) setCropCurrent({ x, y })
      if (drawStart) setDrawCurrent({ x, y })
      if (pointerDownOnShape && !draggingShape && !resizingShape) {
        const dx = x - pointerDownOnShape.startX
        const dy = y - pointerDownOnShape.startY
        if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
          const s = shapes.find((sh) => sh.id === pointerDownOnShape.id)
          if (s) {
            pushSnapshot()
            const pos = getShapeWorldPos(s)
            const attachedPinStarts = pins
              .filter((p) => p.attachedToShapeId === pointerDownOnShape.id)
              .map((p) => ({ pinId: p.id, startX: p.x, startY: p.y }))
            setDraggingShape({
              id: pointerDownOnShape.id,
              startX: pointerDownOnShape.startX,
              startY: pointerDownOnShape.startY,
              shapeStartX: pos.x,
              shapeStartY: pos.y,
              attachedPinStarts,
            })
          }
          setPointerDownOnShape(null)
        }
      }
      if (draggingShape) {
        const totalDx = x - draggingShape.startX
        const totalDy = y - draggingShape.startY
        const newX = draggingShape.shapeStartX + totalDx
        const newY = draggingShape.shapeStartY + totalDy
        setShapes((prev) =>
          prev.map((sh) =>
            sh.id === draggingShape.id ? { ...sh, x: newX, y: newY } : sh
          )
        )
        if (draggingShape.attachedPinStarts.length > 0) {
          setPins((prev) =>
            prev.map((p) => {
              const start = draggingShape.attachedPinStarts.find((a) => a.pinId === p.id)
              if (!start) return p
              return { ...p, x: start.startX + totalDx, y: start.startY + totalDy }
            })
          )
        }
      }
      if (draggingPin) {
        const dx = x - draggingPin.startX
        const dy = y - draggingPin.startY
        setPins((p) => {
          const pin = p.find((x) => x.id === draggingPin.id)
          if (pin) draggingPinPosRef.current = { x: pin.x + dx, y: pin.y + dy }
          return p.map((pin) =>
            pin.id === draggingPin.id ? { ...pin, x: pin.x + dx, y: pin.y + dy } : pin
          )
        })
        setDraggingPin((d) => (d ? { ...d, startX: x, startY: y } : null))
      }
      if (draggingGroupPin) {
        const dx = x - draggingGroupPin.startX
        const dy = y - draggingGroupPin.startY
        const newPinX = draggingGroupPin.startPinX + dx
        const newPinY = draggingGroupPin.startPinY + dy
        draggingGroupPinPosRef.current = { pinX: newPinX, pinY: newPinY }
        setGroups((g) =>
          g.map((gr) => {
            if (gr.id !== draggingGroupPin.groupId) return gr
            const newShapes: Record<string, GroupShape> = {}
            for (const [sid, s] of Object.entries(gr.shapes)) {
              newShapes[sid] = {
                ...s,
                localX: s.localX - dx,
                localY: s.localY - dy,
              }
            }
            return { ...gr, pinX: newPinX, pinY: newPinY, shapes: newShapes }
          })
        )
        setDraggingGroupPin((d) =>
          d ? { ...d, startX: x, startY: y, startPinX: newPinX, startPinY: newPinY } : null
        )
      }
      if (draggingGroup) {
        const dx = x - draggingGroup.startX
        const dy = y - draggingGroup.startY
        setGroups((g) => {
          const gr = g.find((x) => x.id === draggingGroup.id)
          if (gr) {
            const newPinX = gr.pinX + dx
            const newPinY = gr.pinY + dy
            draggingGroupPosRef.current = { pinX: newPinX, pinY: newPinY }
          }
          return g.map((gr) =>
            gr.id === draggingGroup.id
              ? { ...gr, pinX: gr.pinX + dx, pinY: gr.pinY + dy }
              : gr
          )
        })
        setDraggingGroup((d) => (d ? { ...d, startX: x, startY: y } : null))
      }
      if (resizingShape) {
        const { id, corner, startX, startY, startRect } = resizingShape
        const dx = x - startX
        const dy = y - startY
        let newX = startRect.x
        let newY = startRect.y
        let newW = startRect.width
        let newH = startRect.height
        if (corner === 'se') {
          newW = Math.max(MIN_RECT, startRect.width + dx)
          newH = Math.max(MIN_RECT, startRect.height + dy)
        } else if (corner === 'sw') {
          newX = startRect.x + dx
          newW = Math.max(MIN_RECT, startRect.width - dx)
          newH = Math.max(MIN_RECT, startRect.height + dy)
          if (newW === MIN_RECT) newX = startRect.x + startRect.width - MIN_RECT
        } else if (corner === 'ne') {
          newY = startRect.y + dy
          newW = Math.max(MIN_RECT, startRect.width + dx)
          newH = Math.max(MIN_RECT, startRect.height - dy)
          if (newH === MIN_RECT) newY = startRect.y + startRect.height - MIN_RECT
        } else {
          newX = startRect.x + dx
          newY = startRect.y + dy
          newW = Math.max(MIN_RECT, startRect.width - dx)
          newH = Math.max(MIN_RECT, startRect.height - dy)
          if (newW === MIN_RECT) newX = startRect.x + startRect.width - MIN_RECT
          if (newH === MIN_RECT) newY = startRect.y + startRect.height - MIN_RECT
        }
        setShapes((prev) =>
          prev.map((sh) =>
            sh.id === id && sh.type === 'rect'
              ? { ...sh, x: newX, y: newY, width: newW, height: newH }
              : sh
          )
        )
        setResizingShape((r) => (r ? { ...r, startX: x, startY: y, startRect: { x: newX, y: newY, width: newW, height: newH } } : null))
      }
    },
    [
      cropStart,
      drawStart,
      pointerDownOnShape,
      draggingShape,
      draggingPin,
      draggingGroupPin,
      draggingGroup,
      shapes,
      pins,
      resizingShape,
      getShapeWorldPos,
      pushSnapshot,
      _zoom,
    ]
  )

  const handleStagePointerUp = useCallback(
    (e: { global: { x: number; y: number } }) => {
      const scale = 1 / (_zoom || 1)
      const x = e.global.x * scale
      const y = e.global.y * scale
      const endX = drawCurrent?.x ?? x
      const endY = drawCurrent?.y ?? y
      if (tool === 'draw' && drawStart) {
        const w = Math.abs(endX - drawStart.x)
        const h = Math.abs(endY - drawStart.y)
        if (drawShape === 'rect' && w >= MIN_DRAW && h >= MIN_DRAW) {
          pushSnapshot()
          const id = `shape-${idCounter.current++}`
          setShapes((s) => [
            ...s,
            {
              id,
              type: 'rect',
              x: Math.min(drawStart.x, endX),
              y: Math.min(drawStart.y, endY),
              width: w,
              height: h,
              borderWidth: 4,
              radius: 4,
              color: selectedColor,
            },
          ])
          onShapeSelect?.(id, selectedColor)
        } else if ((drawShape === 'circle' || drawShape === 'star') && (w >= MIN_DRAW || h >= MIN_DRAW)) {
          const radius = Math.sqrt(w * w + h * h) / 2
          if (radius >= MIN_DRAW / 2) {
            pushSnapshot()
            const id = `shape-${idCounter.current++}`
            const cx = (drawStart.x + endX) / 2
            const cy = (drawStart.y + endY) / 2
            setShapes((s) => [...s, { id, type: drawShape, x: cx - radius, y: cy - radius, radius }])
            onShapeSelect?.(id)
          }
        }
        setDrawStart(null)
        setDrawCurrent(null)
      } else if (tool === 'camera' && cropStart && cropCurrent) {
        const minX = Math.min(cropStart.x, cropCurrent.x)
        const minY = Math.min(cropStart.y, cropCurrent.y)
        const w = Math.abs(cropCurrent.x - cropStart.x)
        const h = Math.abs(cropCurrent.y - cropStart.y)
        if (w >= MIN_CROP && h >= MIN_CROP) {
          onCropComplete({ x: minX, y: minY, width: w, height: h })
        }
        setCropStart(null)
        setCropCurrent(null)
      }
      if (pointerDownOnShape) setPointerDownOnShape(null)
      if (draggingShape) setDraggingShape(null)
      if (draggingPin) setDraggingPin(null)
      if (draggingGroupPin) {
        setDraggingGroupPin(null)
      }
      if (draggingGroup) setDraggingGroup(null)
      if (resizingShape) {
        const rect = resizingShape.startRect
        const pinsToDetach = pins.filter(
          (p) =>
            p.attachedToShapeId === resizingShape.id &&
            !isPointInRect(p.x, p.y, { x: rect.x, y: rect.y, width: rect.width, height: rect.height })
        )
        if (pinsToDetach.length > 0) {
          pushSnapshot()
          setPins((prev) =>
            prev.map((p) =>
              pinsToDetach.some((d) => d.id === p.id) ? { ...p, attachedToShapeId: undefined } : p
            )
          )
        }
        setResizingShape(null)
      }
      if (drawStart) {
        setDrawStart(null)
        setDrawCurrent(null)
      }
    },
    [tool, drawStart, drawCurrent, cropStart, cropCurrent, drawShape, selectedColor, onCropComplete, onShapeSelect, pointerDownOnShape, draggingShape, draggingGroupPin, resizingShape, pushSnapshot, pins, groups, shapes, _zoom]
  )

  const handleShapePointerDown = useCallback(
    (shapeId: string, globalX: number, globalY: number) => {
      if (tool === 'select') {
        const shape = shapes.find((s) => s.id === shapeId)
        const color = shape?.type === 'rect' ? shape.color : undefined
        if (onShapeSelect) onShapeSelect(shapeId, color)
        else setSelectedShapeId(shapeId)
        setPointerDownOnShape({ id: shapeId, startX: globalX, startY: globalY })
      }
    },
    [tool, onShapeSelect, shapes]
  )

  const handleShapeClickInDrawMode = useCallback(
    (shapeId: string, e: { stopPropagation?: () => void }) => {
      if (typeof e.stopPropagation === 'function') e.stopPropagation()
      const shape = shapes.find((s) => s.id === shapeId)
      const color = shape?.type === 'rect' ? shape.color : undefined
      onShapeSelect?.(shapeId, color)
    },
    [onShapeSelect, shapes]
  )

  const handleResizePointerDown = useCallback(
    (shapeId: string, corner: ResizeCorner, globalX: number, globalY: number) => {
      const s = shapes.find((sh) => sh.id === shapeId)
      if (s && s.type === 'rect') {
        pushSnapshot()
        setResizingShape({
          id: shapeId,
          corner,
          startX: globalX,
          startY: globalY,
          startRect: { x: s.x, y: s.y, width: s.width, height: s.height },
        })
      }
    },
    [shapes, pushSnapshot]
  )

  const handlePinPointerDown = useCallback(
    (id: string, globalX: number, globalY: number, e?: { stopPropagation?: () => void }) => {
      const group = groups.find((g) => g.pinId === id)
      const pin = pins.find((p) => p.id === id)
      const pinColor = pin?.color ?? group ? '#e74c3c' : '#e74c3c'
      if (tool === 'pin' && onPinSelect) {
        e?.stopPropagation?.()
        onPinSelect(id, pinColor)
        return
      }
      if (tool === 'select' && onPinSelect) {
        onPinSelect(id, pinColor)
      }
      pushSnapshot()
      if (group) {
        e?.stopPropagation?.()
        groupRestoreInProgressRef.current = null
        setDraggingGroupPin({
          groupId: group.id,
          startX: globalX,
          startY: globalY,
          startPinX: group.pinX,
          startPinY: group.pinY,
        })
      } else {
        setDraggingPin({ id, startX: globalX, startY: globalY })
      }
    },
    [tool, onPinSelect, pushSnapshot, pins, groups]
  )

  const handlePinPointerMove = useCallback((_id: string, _globalX: number, _globalY: number) => {
    // Pin drag is handled by stage's onGlobalPointerMove so it works when pointer leaves pin
  }, [])

  const handlePinPointerUp = useCallback(
    (id: string, globalX: number, globalY: number) => {
      const group = groups.find((g) => g.pinId === id)
      if (group && draggingGroupPin?.groupId === group.id) {
        setDraggingGroupPin(null)
        const pos = draggingGroupPinPosRef.current ?? {
          pinX: draggingGroupPin.startPinX,
          pinY: draggingGroupPin.startPinY,
        }
        draggingGroupPinPosRef.current = null
        if (!isPointInOverlap(pos.pinX, pos.pinY, group.shapeIds, shapes, groups)) {
          if (groupRestoreInProgressRef.current === group.id) return
          groupRestoreInProgressRef.current = group.id
          pushSnapshot()
          const restoredShapes: ShapeItem[] = []
          for (const [sid, s] of Object.entries(group.shapes)) {
            const worldX = pos.pinX + s.localX
            const worldY = pos.pinY + s.localY
            if (s.type === 'rect') {
              restoredShapes.push({
                id: sid,
                type: 'rect',
                x: worldX,
                y: worldY,
                width: s.width,
                height: s.height,
                borderWidth: s.borderWidth,
                radius: s.radius,
                color: s.color,
              })
            } else if (s.type === 'circle') {
              restoredShapes.push({ id: sid, type: 'circle', x: worldX, y: worldY, radius: s.radius })
            } else {
              restoredShapes.push({ id: sid, type: 'star', x: worldX, y: worldY, radius: s.radius })
            }
          }
          setShapes((prev) => [...prev, ...restoredShapes])
          setPins((prev) => [...prev, { id: group.pinId, x: pos.pinX, y: pos.pinY, color: '#e74c3c' }])
          setGroups((prev) => prev.filter((gr) => gr.id !== group.id))
        }
        return
      }
      if (draggingPin?.id !== id) return
      const pin = pins.find((p) => p.id === id)
      if (!pin) return
      setDraggingPin(null)

      if (pin.attachedToShapeId) {
        const pos = draggingPinPosRef.current ?? { x: pin.x, y: pin.y }
        draggingPinPosRef.current = null
        const bounds = getShapeRectBounds(pin.attachedToShapeId, shapes, groups)
        if (!bounds || !isPointInRect(pos.x, pos.y, bounds)) {
          pushSnapshot()
          setPins((p) =>
            p.map((x) => (x.id === id ? { ...x, attachedToShapeId: undefined } : x))
          )
        }
        return
      }

      const hit = shapesAtPoint(globalX, globalY)
      const unique = [...new Set(hit)]
      if (unique.length >= 2) {
        pushSnapshot()
        const limited = unique.slice(0, 10)
        const groupShapes: GroupItem['shapes'] = {}
        for (const s of shapes) {
          if (limited.includes(s.id) && !groups.some((g) => g.shapeIds.includes(s.id))) {
            const pos = getShapeWorldPos(s)
            if (s.type === 'rect') {
              groupShapes[s.id] = {
                type: 'rect',
                width: s.width,
                height: s.height,
                localX: pos.x - pin.x,
                localY: pos.y - pin.y,
                borderWidth: s.borderWidth,
                radius: s.radius,
                color: s.color,
              }
            } else {
              groupShapes[s.id] = {
                type: s.type,
                radius: s.radius,
                localX: pos.x - pin.x,
                localY: pos.y - pin.y,
              }
            }
          }
        }
        const groupId = `group-${idCounter.current++}`
        setGroups((g) => [...g, { id: groupId, pinX: pin.x, pinY: pin.y, pinId: id, shapeIds: limited, shapes: groupShapes }])
        setShapes((s) => s.filter((sh) => !limited.includes(sh.id)))
        setPins((p) => p.filter((p) => p.id !== id))
      } else if (unique.length === 1) {
        pushSnapshot()
        setPins((p) =>
          p.map((x) => (x.id === id ? { ...x, attachedToShapeId: unique[0] } : x))
        )
      }
    },
    [draggingPin, draggingGroupPin, pins, shapes, groups, shapesAtPoint, getShapeWorldPos, pushSnapshot]
  )

  const handleGroupPointerDown = useCallback(
    (groupId: string, globalX: number, globalY: number, e?: { stopPropagation?: () => void }) => {
      if (tool === 'pin' && onGroupSelect) {
        e?.stopPropagation?.()
        onGroupSelect(groupId)
        return
      }
      if (tool === 'select' && onGroupSelect) {
        onGroupSelect(groupId)
      }
      const g = groups.find((x) => x.id === groupId)
      if (g) {
        pushSnapshot()
        groupRestoreInProgressRef.current = null
        draggingGroupPosRef.current = { pinX: g.pinX, pinY: g.pinY }
        setDraggingGroup({ id: groupId, startX: globalX, startY: globalY })
      }
    },
    [tool, onGroupSelect, groups, pushSnapshot]
  )

  const handleGroupPointerMove = useCallback((_groupId: string, _globalX: number, _globalY: number) => {
    // Group drag is handled by stage's onGlobalPointerMove so it works when pointer leaves group
  }, [])

  const handleGroupPointerUp = useCallback(
    (groupId: string) => {
      const g = groups.find((x) => x.id === groupId)
      if (g && draggingGroup?.id === groupId) {
        const pos = draggingGroupPosRef.current ?? { pinX: g.pinX, pinY: g.pinY }
        draggingGroupPosRef.current = null
        if (!isPointInOverlap(pos.pinX, pos.pinY, g.shapeIds, shapes, groups, { groupId, pinX: pos.pinX, pinY: pos.pinY })) {
          if (groupRestoreInProgressRef.current === groupId) return
          groupRestoreInProgressRef.current = groupId
          pushSnapshot()
          const restoredShapes: ShapeItem[] = []
          for (const [sid, s] of Object.entries(g.shapes)) {
            const worldX = pos.pinX + s.localX
            const worldY = pos.pinY + s.localY
            if (s.type === 'rect') {
              restoredShapes.push({
                id: sid,
                type: 'rect',
                x: worldX,
                y: worldY,
                width: s.width,
                height: s.height,
                borderWidth: s.borderWidth,
                radius: s.radius,
                color: s.color,
              })
            } else if (s.type === 'circle') {
              restoredShapes.push({ id: sid, type: 'circle', x: worldX, y: worldY, radius: s.radius })
            } else {
              restoredShapes.push({ id: sid, type: 'star', x: worldX, y: worldY, radius: s.radius })
            }
          }
          setShapes((prev) => [...prev, ...restoredShapes])
          setPins((prev) => [...prev, { id: g.pinId, x: pos.pinX, y: pos.pinY, color: '#e74c3c' }])
          setGroups((prev) => prev.filter((gr) => gr.id !== groupId))
        }
      }
      setDraggingGroup(null)
    },
    [groups, draggingGroup, shapes, pushSnapshot]
  )

  const freeShapes = shapes.filter((s) => !groups.some((g) => g.shapeIds.includes(s.id)))

  const effectiveSelectedShapeId = selectedShapeIdProp !== undefined ? selectedShapeIdProp : selectedShapeId

  const cloneSelectedShape = useCallback(() => {
    if (!effectiveSelectedShapeId) {
      onToast?.('Select object before cloning')
      return
    }
    const pin = pins.find((p) => p.id === effectiveSelectedShapeId)
    if (pin) {
      pushSnapshot()
      const newId = `pin-${idCounter.current++}`
      const { attachedToShapeId: _, ...pinRest } = pin
      setPins((prev) => [...prev, { ...pinRest, id: newId, x: pin.x + CLONE_OFFSET_X, y: pin.y + CLONE_OFFSET_Y }])
      onPinSelect?.(newId, pin.color)
      return
    }
    const shape = shapes.find((s) => s.id === effectiveSelectedShapeId)
    if (!shape || groups.some((g) => g.shapeIds.includes(shape.id))) return
    pushSnapshot()
    const newId = `shape-${idCounter.current++}`
    const clone: ShapeItem =
      shape.type === 'rect'
        ? {
            ...shape,
            id: newId,
            x: shape.x + CLONE_OFFSET_X,
            y: shape.y + CLONE_OFFSET_Y,
          }
        : shape.type === 'circle'
          ? { ...shape, id: newId, x: shape.x + CLONE_OFFSET_X, y: shape.y + CLONE_OFFSET_Y }
          : { ...shape, id: newId, x: shape.x + CLONE_OFFSET_X, y: shape.y + CLONE_OFFSET_Y }
    setShapes((prev) => [...prev, clone])
    onShapeSelect?.(newId, shape.type === 'rect' ? shape.color : undefined)
  }, [effectiveSelectedShapeId, shapes, pins, groups, onShapeSelect, onPinSelect, onToast, pushSnapshot])

  const deleteSelectedShape = useCallback(() => {
    if (!effectiveSelectedShapeId) {
      onToast?.('Select object before deleting')
      return
    }
    const pin = pins.find((p) => p.id === effectiveSelectedShapeId)
    if (pin) {
      pushSnapshot()
      setPins((prev) => prev.filter((p) => p.id !== effectiveSelectedShapeId))
      onSelectionClear?.()
      return
    }
    const shape = shapes.find((s) => s.id === effectiveSelectedShapeId)
    if (!shape || groups.some((g) => g.shapeIds.includes(shape.id))) return
    pushSnapshot()
    setShapes((prev) => prev.filter((s) => s.id !== effectiveSelectedShapeId))
    onSelectionClear?.()
  }, [effectiveSelectedShapeId, shapes, pins, groups, onSelectionClear, onToast, pushSnapshot])

  useEffect(() => {
    if (cloneRef) cloneRef.current = cloneSelectedShape
    return () => {
      if (cloneRef) cloneRef.current = null
    }
  }, [cloneRef, cloneSelectedShape])

  useEffect(() => {
    if (deleteRef) deleteRef.current = deleteSelectedShape
    return () => {
      if (deleteRef) deleteRef.current = null
    }
  }, [deleteRef, deleteSelectedShape])

  useEffect(() => {
    if (undoRef) undoRef.current = performUndo
    return () => {
      if (undoRef) undoRef.current = null
    }
  }, [undoRef, performUndo])

  useEffect(() => {
    if (redoRef) redoRef.current = performRedo
    return () => {
      if (redoRef) redoRef.current = null
    }
  }, [redoRef, performRedo])

  const updateObject = useCallback(
    (id: string, updates: Partial<{ x: number; y: number; width: number; height: number }>) => {
      const pin = pins.find((p) => p.id === id)
      if (pin) {
        if ('x' in updates || 'y' in updates) {
          pushSnapshot()
          setPins((prev) =>
            prev.map((p) =>
              p.id === id
                ? { ...p, x: updates.x ?? p.x, y: updates.y ?? p.y }
                : p
            )
          )
        }
        return
      }
      const group = groups.find((g) => g.id === id)
      if (group) {
        if ('x' in updates || 'y' in updates) {
          pushSnapshot()
          setGroups((prev) =>
            prev.map((g) =>
              g.id === id
                ? { ...g, pinX: updates.x ?? g.pinX, pinY: updates.y ?? g.pinY }
                : g
            )
          )
        }
        return
      }
      const shape = shapes.find((s) => s.id === id && s.type === 'rect')
      if (shape && shape.type === 'rect') {
        if (groups.some((g) => g.shapeIds.includes(id))) return
        pushSnapshot()
        setShapes((prev) =>
          prev.map((s) => {
            if (s.id !== id || s.type !== 'rect') return s
            const next = { ...s }
            if ('x' in updates) next.x = updates.x!
            if ('y' in updates) next.y = updates.y!
            if ('width' in updates) next.width = Math.max(MIN_RECT, updates.width!)
            if ('height' in updates) next.height = Math.max(MIN_RECT, updates.height!)
            return next
          })
        )
      }
    },
    [pins, groups, shapes, pushSnapshot]
  )

  useEffect(() => {
    if (updateObjectRef) updateObjectRef.current = updateObject
    return () => {
      if (updateObjectRef) updateObjectRef.current = null
    }
  }, [updateObjectRef, updateObject])

  useEffect(() => {
    if (resizePointerDownRef) resizePointerDownRef.current = handleResizePointerDown
    return () => {
      if (resizePointerDownRef) resizePointerDownRef.current = null
    }
  }, [resizePointerDownRef, handleResizePointerDown])

  const pushSnapshotRef = useRef(pushSnapshot)
  pushSnapshotRef.current = pushSnapshot

  useEffect(() => {
    if (!effectiveSelectedShapeId || !selectedColor) return
    const norm = (c: string | undefined) => (c ?? '').toLowerCase().replace(/^#/, '')
    const shape = shapes.find((s) => s.id === effectiveSelectedShapeId && s.type === 'rect')
    if (shape && shape.type === 'rect') {
      if (norm(shape.color) === norm(selectedColor)) return
      pushSnapshotRef.current()
      setShapes((prev) =>
        prev.map((s) =>
          s.id === effectiveSelectedShapeId && s.type === 'rect'
            ? { ...s, color: selectedColor }
            : s
        )
      )
      return
    }
    const pin = pins.find((p) => p.id === effectiveSelectedShapeId)
    if (pin) {
      if (norm(pin.color) === norm(selectedColor)) return
      pushSnapshotRef.current()
      setPins((prev) =>
        prev.map((p) => (p.id === effectiveSelectedShapeId ? { ...p, color: selectedColor } : p))
      )
    }
  }, [selectedColor, effectiveSelectedShapeId, shapes, pins])

  const hitArea = useMemo(
    () => (width > 0 && height > 0 ? new Rectangle(0, 0, width, height) : undefined),
    [width, height]
  )

  const stageCursor =
    tool === 'pin' || (tool === 'draw' && drawShape === 'rect') ? 'crosshair' : undefined

  const scale = _zoom || 1

  return (
    <pixiContainer scale={{ x: scale, y: scale }} eventMode="static" hitArea={hitArea} sortableChildren>
      <pixiContainer
        eventMode="static"
        hitArea={hitArea}
        sortableChildren
        cursor={stageCursor}
        onPointerDown={handleStagePointerDown}
        onGlobalPointerMove={handleStagePointerMove}
        onPointerUp={handleStagePointerUp}
        onPointerUpOutside={handleStagePointerUp}
      >
      {groups.map((g) => (
        <pixiContainer
          key={g.id}
          x={g.pinX}
          y={g.pinY}
          eventMode="static"
          cursor="move"
          sortableChildren
          onPointerDown={(e: { global: { x: number; y: number }; stopPropagation?: () => void }) => {
            const scale = 1 / (_zoom || 1)
            handleGroupPointerDown(g.id, e.global.x * scale, e.global.y * scale, e)
          }}
          onPointerMove={(e: { global: { x: number; y: number } }) =>
            handleGroupPointerMove(g.id, e.global.x, e.global.y)
          }
          onPointerUp={() => handleGroupPointerUp(g.id)}
          onPointerUpOutside={() => handleGroupPointerUp(g.id)}
        >
          {Object.entries(g.shapes).map(([sid, s]) =>
            s.type === 'rect' ? (
              <RectShape
                key={sid}
                x={s.localX}
                y={s.localY}
                width={s.width}
                height={s.height}
                color={s.color ? hexToNumber(s.color) : hexToNumber(selectedColor)}
                borderWidth={s.borderWidth ?? 4}
                radius={s.radius ?? 4}
                fillAlpha={0.5}
                invisible
              />
            ) : s.type === 'star' ? (
              <StarShape key={sid} x={s.localX} y={s.localY} radius={s.radius} invisible />
            ) : (
              <CircleShape key={sid} x={s.localX} y={s.localY} radius={s.radius} invisible />
            )
          )}
          <PinShape
            x={0}
            y={0}
            zIndex={1}
            onPointerDown={(e) => {
              const s = 1 / (_zoom || 1)
              handlePinPointerDown(g.pinId, e.globalX * s, e.globalY * s, e.event)
            }}
            onPointerMove={(e) => handlePinPointerMove(g.pinId, e.globalX, e.globalY)}
            onPointerUp={(e) => {
              const s = 1 / (_zoom || 1)
              handlePinPointerUp(g.pinId, e.globalX * s, e.globalY * s)
            }}
            onPointerUpOutside={(e) => {
              const s = 1 / (_zoom || 1)
              handlePinPointerUp(g.pinId, e.globalX * s, e.globalY * s)
            }}
          />
        </pixiContainer>
      ))}
      {freeShapes.map((s) => {
        const shapeEl =
          s.type === 'rect' ? (
            <RectShape
              x={s.x}
              y={s.y}
              width={s.width}
              height={s.height}
              color={s.color ? hexToNumber(s.color) : hexToNumber(selectedColor)}
              borderWidth={s.borderWidth ?? 4}
              radius={s.radius ?? 4}
              fillAlpha={0.5}
              selected={s.id === effectiveSelectedShapeId}
              invisible
            />
          ) : s.type === 'star' ? (
            <StarShape x={s.x} y={s.y} radius={s.radius} invisible />
          ) : (
            <CircleShape x={s.x} y={s.y} radius={s.radius} invisible />
          )
        if (tool === 'select') {
          return (
            <pixiContainer
              key={s.id}
              eventMode="static"
              cursor="move"
              onPointerDown={(e: { global: { x: number; y: number }; stopPropagation?: () => void }) => {
                if (typeof e.stopPropagation === 'function') e.stopPropagation()
                const scale = 1 / (_zoom || 1)
                handleShapePointerDown(s.id, e.global.x * scale, e.global.y * scale)
              }}
            >
              {shapeEl}
            </pixiContainer>
          )
        }
        if (tool === 'draw' && onShapeSelect) {
          return (
            <pixiContainer
              key={s.id}
              eventMode="static"
              cursor="move"
              onPointerDown={(e: { global: { x: number; y: number }; stopPropagation?: () => void }) =>
                handleShapeClickInDrawMode(s.id, e)
              }
            >
              {shapeEl}
            </pixiContainer>
          )
        }
        return <pixiContainer key={s.id}>{shapeEl}</pixiContainer>
      })}
      {pins.map((p) => (
        <PinShape
          key={p.id}
          x={p.x}
          y={p.y}
          onPointerDown={(e) => {
            const s = 1 / (_zoom || 1)
            handlePinPointerDown(p.id, e.globalX * s, e.globalY * s, e.event)
          }}
          onPointerMove={(e) => handlePinPointerMove(p.id, e.globalX, e.globalY)}
          onPointerUp={(e) => {
            const s = 1 / (_zoom || 1)
            handlePinPointerUp(p.id, e.globalX * s, e.globalY * s)
          }}
          onPointerUpOutside={(e) => {
            const s = 1 / (_zoom || 1)
            handlePinPointerUp(p.id, e.globalX * s, e.globalY * s)
          }}
        />
      ))}
      {drawStart && drawCurrent && tool === 'draw' && drawShape === 'rect' && (
        <pixiGraphics
          draw={(g: import('pixi.js').Graphics) => {
            g.clear()
            const minX = Math.min(drawStart.x, drawCurrent.x)
            const minY = Math.min(drawStart.y, drawCurrent.y)
            const w = Math.abs(drawCurrent.x - drawStart.x)
            const h = Math.abs(drawCurrent.y - drawStart.y)
            if (w >= MIN_DRAW && h >= MIN_DRAW) {
              const c = hexToNumber(selectedColor)
              g.roundRect(minX, minY, w, h, 4)
              g.fill({ color: c, alpha: 0.5 })
              g.stroke({ color: c, width: 4 })
            }
          }}
        />
      )}
      </pixiContainer>
    </pixiContainer>
  )
}
