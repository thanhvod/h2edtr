import { useCallback, useEffect, useState } from 'react'
import { IconCheck } from '../base-icon'
import styles from './style.module.scss'

export type SelectedObject =
  | { type: 'rect'; id: string; x: number; y: number; width: number; height: number }
  | { type: 'pin'; id: string; x: number; y: number }
  | { type: 'group'; id: string; x: number; y: number }

const MIN_RECT = 20

function AttributesForm({
  selectedObject,
  onUpdateObject,
}: {
  selectedObject: SelectedObject
  onUpdateObject?: (id: string, updates: Partial<{ x: number; y: number; width: number; height: number }>) => void
}) {
  const toInt = (v: number) => String(Math.round(v))

  const [local, setLocal] = useState({
    x: toInt(selectedObject.x),
    y: toInt(selectedObject.y),
    width: selectedObject.type === 'rect' ? toInt(selectedObject.width) : '',
    height: selectedObject.type === 'rect' ? toInt(selectedObject.height) : '',
  })

  useEffect(() => {
    setLocal({
      x: toInt(selectedObject.x),
      y: toInt(selectedObject.y),
      width: selectedObject.type === 'rect' ? toInt(selectedObject.width) : '',
      height: selectedObject.type === 'rect' ? toInt(selectedObject.height) : '',
    })
  }, [selectedObject])

  const handleBlur = useCallback(
    (field: 'x' | 'y' | 'width' | 'height') => {
      const str = local[field]
      const num = Math.round(parseFloat(str) || 0)
      const clamped = (field === 'width' || field === 'height') ? Math.max(MIN_RECT, num) : num
      onUpdateObject?.(selectedObject.id, { [field]: clamped })
    },
    [local, selectedObject.id, onUpdateObject]
  )

  return (
    <div className={styles.attributesGrid}>
      <div className={styles.attributeField}>
        <label className={styles.attributeLabel}>Position X</label>
        <input
          type="number"
          step={1}
          className={styles.attributeInput}
          value={local.x}
          onChange={(e) => setLocal((p) => ({ ...p, x: e.target.value }))}
          onBlur={() => handleBlur('x')}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
      </div>
      <div className={styles.attributeField}>
        <label className={styles.attributeLabel}>Position Y</label>
        <input
          type="number"
          step={1}
          className={styles.attributeInput}
          value={local.y}
          onChange={(e) => setLocal((p) => ({ ...p, y: e.target.value }))}
          onBlur={() => handleBlur('y')}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
      </div>
      {selectedObject.type === 'rect' && (
        <>
          <div className={styles.attributeField}>
            <label className={styles.attributeLabel}>Width</label>
            <input
              type="number"
              step={1}
              className={styles.attributeInput}
              value={local.width}
              onChange={(e) => setLocal((p) => ({ ...p, width: e.target.value }))}
              onBlur={() => handleBlur('width')}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            />
          </div>
          <div className={styles.attributeField}>
            <label className={styles.attributeLabel}>Height</label>
            <input
              type="number"
              step={1}
              className={styles.attributeInput}
              value={local.height}
              onChange={(e) => setLocal((p) => ({ ...p, height: e.target.value }))}
              onBlur={() => handleBlur('height')}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            />
          </div>
        </>
      )}
    </div>
  )
}

const LIGHT_COLORS = new Set([
  '#ffffff', '#d7d8d9', '#e0e0e0', '#9e9e9e',
  '#74b9ff', '#a29bfe', '#fd79a8', '#81ecec', '#55efc4', '#fab1a0', '#ff7675',
])

export const PALETTE_COLORS = [
  '#000000',
  '#4a4a4a',
  '#737373',
  '#a1a3a4',
  '#d7d8d9',
  '#e74c3c',
  '#e17055',
  '#fdcb6e',
  '#2ecc71',
  '#00b894',
  '#00cec9',
  '#0984e3',
  '#74b9ff',
  '#6c5ce7',
  '#a29bfe',
  '#e056fd',
  '#fd79a8',
  '#81ecec',
  '#55efc4',
  '#fab1a0',
]

type RightPanelProps = {
  selectedColor: string | null
  onColorSelect: (color: string) => void
  selectedObjectId: string | null
  selectedObject?: SelectedObject | null
  onUpdateObject?: (id: string, updates: Partial<{ x: number; y: number; width: number; height: number }>) => void
}

export function RightPanel({
  selectedColor,
  onColorSelect,
  selectedObjectId: _selectedObjectId,
  selectedObject,
  onUpdateObject,
}: RightPanelProps) {
  return (
    <div className={`${styles.panel} ${styles.expanded}`}>
      <div className={styles.content}>
        <div className={styles.palette}>
          {PALETTE_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onColorSelect(color)}
              title={color}
              className={`${styles.colorBtn} ${selectedColor === color ? styles.selected : ''} ${color === '#ffffff' ? styles.white : ''}`}
              style={{ background: color }}
            >
              {selectedColor === color && (
                <span className={styles.colorCheck}>
                  <IconCheck size={24} color={LIGHT_COLORS.has(color.toLowerCase()) ? '#212529' : '#ffffff'} />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {selectedObject && (
        <div className={styles.attributesSection}>
          <div className={styles.attributesBox}>
            <AttributesForm
              selectedObject={selectedObject}
              onUpdateObject={onUpdateObject}
            />
          </div>
        </div>
      )}
    </div>
  )
}
