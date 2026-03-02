import { useCallback } from 'react'
import { Rectangle } from 'pixi.js'
import { markAsPin } from '@/lib/pixi/hit-test'

/** Hit area size - must match PinsSvgOverlay PIN_SIZE */
export const PIN_SIZE = 32

type PinShapeProps = {
  x: number
  y: number
  zIndex?: number
  onPointerDown?: (e: { globalX: number; globalY: number; event?: { stopPropagation?: () => void } }) => void
  onPointerMove?: (e: { globalX: number; globalY: number }) => void
  onPointerUp?: (e: { globalX: number; globalY: number }) => void
  onPointerUpOutside?: (e: { globalX: number; globalY: number }) => void
}

/**
 * Invisible hit area for pin interaction (drag).
 * Actual pin display is rendered as vector SVG in PinsSvgOverlay.
 */
export function PinShape({
  x,
  y,
  zIndex,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerUpOutside,
}: PinShapeProps) {
  const draw = useCallback((g: import('pixi.js').Graphics) => {
    g.clear()
    markAsPin(g as unknown)
    g.rect(0, 0, PIN_SIZE, PIN_SIZE)
    g.fill({ color: 0x000000, alpha: 0 })
  }, [])

  const handlePointerDown = useCallback(
    (e: { global: { x: number; y: number }; stopPropagation?: () => void }) => {
      onPointerDown?.({ globalX: e.global.x, globalY: e.global.y, event: e })
    },
    [onPointerDown]
  )
  const handlePointerMove = useCallback(
    (e: { global: { x: number; y: number } }) => {
      onPointerMove?.({ globalX: e.global.x, globalY: e.global.y })
    },
    [onPointerMove]
  )
  const handlePointerUp = useCallback(
    (e: { global: { x: number; y: number } }) => {
      onPointerUp?.({ globalX: e.global.x, globalY: e.global.y })
    },
    [onPointerUp]
  )
  const handlePointerUpOutside = useCallback(
    (e: { global: { x: number; y: number } }) => {
      onPointerUpOutside?.({ globalX: e.global.x, globalY: e.global.y })
    },
    [onPointerUpOutside]
  )

  const offset = PIN_SIZE / 2
  return (
    <pixiGraphics
      x={x - offset}
      y={y - offset}
      zIndex={zIndex}
      draw={draw}
      eventMode="static"
      cursor="move"
      hitArea={new Rectangle(0, 0, PIN_SIZE, PIN_SIZE)}
      onPointerDown={onPointerDown ? handlePointerDown : undefined}
      onPointerMove={onPointerMove ? handlePointerMove : undefined}
      onPointerUp={onPointerUp ? handlePointerUp : undefined}
      onPointerUpOutside={onPointerUpOutside ? handlePointerUpOutside : undefined}
    />
  )
}
