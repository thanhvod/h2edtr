import { memo } from 'react'
import type { PinItem, GroupItem } from '@/features/canvas/canvas-content'
import { PIN_SIZE } from './pin-shape'

const PIN_PATH =
  'M14.6523 3.57693C13.4199 2.34449 11.3126 3.21735 11.3126 4.96028C11.3126 5.47914 11.1065 5.97674 10.7396 6.34363L9.11887 7.96433C8.75198 8.33122 8.25438 8.53733 7.73552 8.53733C5.99259 8.53733 5.11972 10.6446 6.35216 11.877L8.72844 14.2533L3.21088 19.7709C2.92971 20.0521 2.92971 20.5079 3.21088 20.7891C3.49206 21.0703 3.94794 21.0703 4.22912 20.7891L9.74668 15.2716L12.1229 17.6478C13.3554 18.8802 15.4626 18.0074 15.4626 16.2645C15.4626 15.7456 15.6688 15.248 16.0357 14.8811L17.6564 13.2604C18.0232 12.8935 18.5209 12.6874 19.0397 12.6874C20.7826 12.6874 21.6555 10.5801 20.4231 9.34768L14.6523 3.57693Z'

type PinsSvgOverlayProps = {
  pins: PinItem[]
  groups: GroupItem[]
  width: number
  height: number
  selectedObjectId?: string | null
  className?: string
}

const RING_OFFSET = 4
const RING_STROKE = 2

export const PinsSvgOverlay = memo(function PinsSvgOverlay({
  pins,
  groups,
  width,
  height,
  selectedObjectId,
  className,
}: PinsSvgOverlayProps) {
  if (width <= 0 || height <= 0) return null

  const offset = PIN_SIZE / 2
  const ringRadius = offset + RING_OFFSET

  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2 }}
    >
      {pins.map((p) => (
        <g key={p.id} transform={`translate(${p.x - offset}, ${p.y - offset})`}>
          {selectedObjectId === p.id && (
            <circle
              cx={offset}
              cy={offset}
              r={ringRadius}
              fill="none"
              stroke="#CB2631"
              strokeWidth={RING_STROKE}
            />
          )}
          <path
            fill={p.color ?? '#e74c3c'}
            fillRule="evenodd"
            clipRule="evenodd"
            d={PIN_PATH}
            transform={`scale(${PIN_SIZE / 24})`}
          />
        </g>
      ))}
      {groups.map((g) => (
        <g key={g.id} transform={`translate(${g.pinX - offset}, ${g.pinY - offset})`}>
          {selectedObjectId === g.id && (
            <circle
              cx={offset}
              cy={offset}
              r={ringRadius}
              fill="none"
              stroke="#CB2631"
              strokeWidth={RING_STROKE}
            />
          )}
          <path
            fill="#CB2631"
            fillRule="evenodd"
            clipRule="evenodd"
            d={PIN_PATH}
            transform={`scale(${PIN_SIZE / 24})`}
          />
        </g>
      ))}
    </svg>
  )
})
