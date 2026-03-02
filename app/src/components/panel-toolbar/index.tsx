import {
  IconCamera,
  IconSelect,
  IconClone,
  IconTrash,
  IconUndo,
  IconRedo,
  IconZoom,
  IconPin,
  IconRectangle,
} from '../base-icon'
import { useBottomToolbar } from './use-bottom-toolbar'
import styles from './style.module.scss'
import type { BottomTool, ShapeType } from './types'

export type { BottomTool, ShapeType } from './types'

const ZOOM_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75] as const

type BottomToolbarProps = {
  tool: BottomTool
  shapeType: ShapeType
  zoom?: number
  onZoomChange?: (zoom: number) => void
  onToolChange: (tool: BottomTool) => void
  onShapeTypeChange: (shape: ShapeType) => void
  onComingSoon: (msg: string) => void
  selectedObjectId?: string | null
  onClone?: () => void
  onDelete?: () => void
  canUndo?: boolean
  canRedo?: boolean
  onUndo?: () => void
  onRedo?: () => void
}

export function BottomToolbar({
  tool,
  shapeType,
  zoom = 1,
  onZoomChange,
  onToolChange,
  onShapeTypeChange,
  onComingSoon,
  selectedObjectId,
  onClone,
  onDelete,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: BottomToolbarProps) {
  const {
    zoomDropdownOpen,
    closeZoomDropdown,
    handleZoomButtonClick,
    handleZoomSelect,
    handleToolClick,
    handleShapeClick,
    handleComingSoon,
  } = useBottomToolbar({
    tool,
    shapeType,
    onToolChange,
    onShapeTypeChange,
    onComingSoon,
    onZoomChange,
  })

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <button
          type="button"
          onClick={() => handleToolClick('camera')}
          className={`${styles.iconBtn} ${tool === 'camera' ? styles.active : ''}`}
          title="Crop PDF image"
        >
          {tool === 'camera' ? <IconCamera size={24} color="white" /> : <IconCamera size={24} color="#445566" />}
        </button>
        <button
          type="button"
          onClick={() => handleToolClick('select')}
          className={`${styles.iconBtn} ${tool === 'select' ? styles.active : ''}`}
          title="Select drawn object"
        >
          {tool === 'select' ? <IconSelect size={24} color="white" /> : <IconSelect size={24} color="#445566" />}
        </button>
        <button
          type="button"
          onClick={() => (onClone ? onClone() : handleComingSoon('Clone - Coming soon'))}
          className={`${styles.iconBtn} ${selectedObjectId ? styles.selectedBg : ''}`}
          title="Clone object"
        >
          <IconClone size={24} color="#445566" />
        </button>
        <button
          type="button"
          onClick={() => (onDelete ? onDelete() : handleComingSoon('Delete - Coming soon'))}
          className={`${styles.iconBtn} ${selectedObjectId ? styles.selectedBg : ''}`}
          title="Delete selected object"
        >
          <IconTrash size={24} color="#445566" />
        </button>
        <button
          type="button"
          onClick={() => (onUndo ? onUndo() : handleComingSoon('Undo - Coming soon'))}
          className={`${styles.iconBtn} ${!canUndo ? styles.disabled : ''}`}
          title="Undo"
          disabled={!(canUndo ?? false)}
        >
          <IconUndo size={24} color="#445566" />
        </button>
        <button
          type="button"
          onClick={() => (onRedo ? onRedo() : handleComingSoon('Redo - Coming soon'))}
          className={`${styles.iconBtn} ${!canRedo ? styles.disabled : ''}`}
          title="Redo"
          disabled={!(canRedo ?? false)}
        >
          <IconRedo size={24} color="#445566" />
        </button>

        <div className={styles.zoomDropdownWrapper}>
          <button
            type="button"
            onClick={handleZoomButtonClick}
            className={styles.iconBtn}
            title="Zoom PDF"
          >
            <IconZoom size={24} color="#445566" />
          </button>
          {zoomDropdownOpen && (
            <>
              <div className={styles.dropdownBackdrop} onClick={closeZoomDropdown} />
              <div className={styles.dropdown}>
                {ZOOM_OPTIONS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleZoomSelect(value)}
                    className={`${styles.dropdownItem} ${Math.abs(zoom - value) < 0.01 ? styles.active : ''}`}
                    title={`${value * 100}%`}
                  >
                    {value * 100}%
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className={styles.divider} />

        <button
          type="button"
          onClick={() => handleToolClick('pin')}
          className={`${styles.iconBtn} ${tool === 'pin' ? styles.active : ''}`}
          title="Add pin on PDF page"
        >
          <IconPin size={24} color={tool === 'pin' ? 'white' : '#445566'} />
        </button>
        <button
          type="button"
          onClick={() => handleShapeClick('shape', 'rect')}
          className={`${styles.iconBtn} ${tool === 'shape' && shapeType === 'rect' ? styles.active : ''}`}
          title="Draw rectangle"
        >
          <IconRectangle size={24} color={tool === 'shape' && shapeType === 'rect' ? 'white' : '#445566'} />
        </button>
      </div>
    </div>
  )
}
