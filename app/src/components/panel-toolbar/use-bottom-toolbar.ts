import { useState, useCallback } from 'react'
import type { BottomTool, ShapeType } from './types'

type UseBottomToolbarOptions = {
  tool: BottomTool
  shapeType: ShapeType
  onToolChange: (tool: BottomTool) => void
  onShapeTypeChange: (shape: ShapeType) => void
  onComingSoon: (msg: string) => void
  onZoomChange?: (zoom: number) => void
}

export function useBottomToolbar({
  tool: _tool,
  shapeType: _shapeType,
  onToolChange,
  onShapeTypeChange,
  onComingSoon,
  onZoomChange,
}: UseBottomToolbarOptions) {
  const [shapeDropdownOpen, setShapeDropdownOpen] = useState(false)
  const [zoomDropdownOpen, setZoomDropdownOpen] = useState(false)

  const toggleShapeDropdown = useCallback(() => {
    setShapeDropdownOpen((o) => !o)
  }, [])

  const closeShapeDropdown = useCallback(() => {
    setShapeDropdownOpen(false)
  }, [])

  const closeZoomDropdown = useCallback(() => {
    setZoomDropdownOpen(false)
  }, [])

  const handleZoomButtonClick = useCallback(() => {
    setZoomDropdownOpen((o) => !o)
  }, [])

  const handleZoomSelect = useCallback(
    (value: number) => {
      onZoomChange?.(value)
      setZoomDropdownOpen(false)
    },
    [onZoomChange]
  )

  const handleToolClick = useCallback(
    (t: BottomTool) => {
      onToolChange(t)
    },
    [onToolChange]
  )

  const handleShapeClick = useCallback(
    (t: BottomTool, shape: ShapeType) => {
      onShapeTypeChange(shape)
      onToolChange(t)
      setShapeDropdownOpen(false)
    },
    [onToolChange, onShapeTypeChange]
  )

  const handleShapeButtonClick = useCallback(() => {
    onToolChange('shape')
    setShapeDropdownOpen((o) => !o)
  }, [onToolChange])

  const handleComingSoon = useCallback(
    (msg: string) => {
      onComingSoon(msg)
    },
    [onComingSoon]
  )

  return {
    shapeDropdownOpen,
    zoomDropdownOpen,
    toggleShapeDropdown,
    closeShapeDropdown,
    closeZoomDropdown,
    handleZoomButtonClick,
    handleZoomSelect,
    handleToolClick,
    handleShapeClick,
    handleShapeButtonClick,
    handleComingSoon,
  }
}
