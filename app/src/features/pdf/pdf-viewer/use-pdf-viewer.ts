import { useEffect } from 'react'

export function usePdfViewerNumPages(numPages: number | null, onNumPages?: (num: number) => void) {
  useEffect(() => {
    if (numPages != null) onNumPages?.(numPages)
  }, [numPages, onNumPages])
}
