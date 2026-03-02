import { useCallback } from 'react'
import type { PdfFile } from '../pdf-types'

type UsePdfDropZoneOptions = {
  onFileSelect: (file: PdfFile) => void
}

export function usePdfDropZone({ onFileSelect }: UsePdfDropZoneOptions) {
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file?.type === 'application/pdf') {
        onFileSelect(file as PdfFile)
      }
      e.target.value = ''
    },
    [onFileSelect]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files?.[0]
      if (file?.type === 'application/pdf') {
        onFileSelect(file as PdfFile)
      }
    },
    [onFileSelect]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  return {
    handleFileChange,
    handleDrop,
    handleDragOver,
  }
}
