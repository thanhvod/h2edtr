import { usePdfToImages } from '../use-pdf-to-images'
import { PdfScrollView } from '../pdf-scroll-view'
import { PdfGridView } from '../pdf-grid-view'
import { usePdfViewerNumPages } from './use-pdf-viewer'
import { useAnimatedZoom } from '../use-animated-zoom'
import { useEffect } from 'react'
import type { ViewMode } from '@/components/panel-view-mode'
import type { PdfFile } from '../pdf-types'
import type { PageImageState } from '../use-pdf-to-images'
import styles from './style.module.scss'

export type { PdfFile } from '../pdf-types'

type PdfViewerProps = {
  file: PdfFile
  viewMode: ViewMode
  zoom?: number
  overlay?: React.ReactNode
  onNumPages?: (num: number) => void
  scrollToPage?: number | null
  onScrollToPageHandled?: () => void
  onVisiblePageChange?: (page: number) => void
  deviceId?: string | null
  onUploadComplete?: (pdfId: string, numPages: number) => void
  onPageImagesChange?: (images: Record<number, PageImageState>) => void
}

export function PdfViewer({
  file,
  viewMode,
  zoom = 1,
  overlay,
  onNumPages,
  scrollToPage,
  onScrollToPageHandled,
  onVisiblePageChange,
  deviceId = null,
  onUploadComplete,
  onPageImagesChange,
}: PdfViewerProps) {
  const { numPages, error, pageImages } = usePdfToImages(file, deviceId, { onUploadComplete })
  const displayZoom = useAnimatedZoom(zoom)

  usePdfViewerNumPages(numPages ?? null, onNumPages)

  useEffect(() => {
    onPageImagesChange?.(pageImages)
  }, [pageImages, onPageImagesChange])

  if (!file) {
    return null
  }

  if (error) {
    return <div className={styles.error}>{error}</div>
  }

  if (numPages == null || numPages === 0) {
    return <div className={styles.loading}>Loading PDF…</div>
  }

  return (
    <div className={styles.wrapper}>
      {viewMode === 'scroll' ? (
        <PdfScrollView
          numPages={numPages}
          pageImages={pageImages}
          zoom={displayZoom}
          overlay={overlay}
          scrollToPage={scrollToPage}
          onScrollToPageHandled={onScrollToPageHandled}
          onVisiblePageChange={onVisiblePageChange}
        />
      ) : (
        <PdfGridView
          numPages={numPages}
          pageImages={pageImages}
          zoom={displayZoom}
          scrollToPage={scrollToPage}
          onScrollToPageHandled={onScrollToPageHandled}
          onVisiblePageChange={onVisiblePageChange}
        />
      )}
    </div>
  )
}
