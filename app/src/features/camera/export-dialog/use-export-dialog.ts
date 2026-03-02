import { useState, useCallback } from 'react'

type UseExportDialogOptions = {
  hasPdf: boolean
  onClose: () => void
  onExport: (includePdf: boolean) => void
}

export function useExportDialog({
  hasPdf,
  onClose,
  onExport,
}: UseExportDialogOptions) {
  const [includePdf, setIncludePdf] = useState(false)

  const handleExport = useCallback(() => {
    onExport(hasPdf ? includePdf : false)
    onClose()
  }, [hasPdf, includePdf, onExport, onClose])

  const handleIncludePdfChange = useCallback((checked: boolean) => {
    setIncludePdf(checked)
  }, [])

  return {
    includePdf,
    handleIncludePdfChange,
    handleExport,
  }
}
