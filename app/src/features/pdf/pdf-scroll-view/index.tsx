import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef, useLayoutEffect, useEffect, useCallback } from 'react'
import type { PageImageState } from '../use-pdf-to-images'
import { usePdfScrollViewDimensions } from './use-pdf-scroll-view'
import styles from './style.module.scss'

const VIRTUAL_THRESHOLD = 25

type PdfScrollViewProps = {
  numPages: number
  pageImages: Record<number, PageImageState>
  zoom?: number
  overlay?: React.ReactNode
  scrollToPage?: number | null
  onScrollToPageHandled?: () => void
  onVisiblePageChange?: (page: number) => void
}

function PagePlaceholder({ width, height }: { width: number; height: number }) {
  return (
    <div
      className={styles.pagePlaceholder}
      style={{ '--page-w': `${width}px`, '--page-h': `${height}px` } as React.CSSProperties}
    >
      Loading…
    </div>
  )
}

export function PdfScrollView({
  numPages,
  pageImages,
  zoom = 1,
  overlay,
  scrollToPage,
  onScrollToPageHandled,
  onVisiblePageChange,
}: PdfScrollViewProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const useVirtual = numPages > VIRTUAL_THRESHOLD

  const {
    scaledWidth,
    scaledHeight,
    pageW,
    pageH,
    gapScaled,
    marginLeftScaled,
    canvasWidth,
    canvasHeight,
  } = usePdfScrollViewDimensions(numPages, zoom)

  const virtualizer = useVirtualizer({
    count: numPages,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => (index === numPages - 1 ? pageH : pageH + gapScaled),
    overscan: 2,
  })

  useLayoutEffect(() => {
    virtualizer.measure()
  }, [virtualizer, zoom, pageH, gapScaled])

  // Scroll to page when scrollToPage changes (1-based page number)
  useEffect(() => {
    if (scrollToPage == null || scrollToPage < 1 || scrollToPage > numPages) return
    const pageIndex = scrollToPage - 1
    if (useVirtual) {
      virtualizer.scrollToIndex(pageIndex, { align: 'start', behavior: 'smooth' })
    } else if (parentRef.current) {
      const offset = pageIndex * (pageH + gapScaled)
      parentRef.current.scrollTo({ top: offset, behavior: 'smooth' })
    }
    const t = setTimeout(() => onScrollToPageHandled?.(), 500)
    return () => clearTimeout(t)
  }, [scrollToPage, numPages, useVirtual, virtualizer, pageH, gapScaled, onScrollToPageHandled])

  const lastReportedPageRef = useRef<number>(1)
  const updateVisiblePage = useCallback(() => {
    const el = parentRef.current
    if (!el || !onVisiblePageChange || numPages <= 0) return
    const viewportCenter = el.scrollTop + el.clientHeight / 2
    const pageIndex = Math.floor(viewportCenter / (pageH + gapScaled))
    const clamped = Math.max(0, Math.min(pageIndex, numPages - 1))
    const page = clamped + 1
    if (lastReportedPageRef.current !== page) {
      lastReportedPageRef.current = page
      onVisiblePageChange(page)
    }
  }, [numPages, pageH, gapScaled, onVisiblePageChange])

  useEffect(() => {
    const el = parentRef.current
    if (!el || !onVisiblePageChange) return
    updateVisiblePage()
    let rafId: number | undefined
    const handleScroll = () => {
      if (rafId == null) {
        rafId = requestAnimationFrame(() => {
          rafId = undefined
          updateVisiblePage()
        })
      }
    }
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', handleScroll)
      if (rafId != null) cancelAnimationFrame(rafId)
    }
  }, [onVisiblePageChange, updateVisiblePage])

  const renderPage = (index: number) => {
    const state = pageImages[index]
    if (!state || state.status === 'loading') {
      return <PagePlaceholder width={pageW} height={pageH} />
    }
    return (
      <img
        src={state.url}
        alt={`Page ${index + 1}`}
        className={styles.pageImage}
        style={{ '--page-w': `${pageW}px`, '--page-h': `${pageH}px` } as React.CSSProperties}
      />
    )
  }

  if (useVirtual) {
    const virtualItems = virtualizer.getVirtualItems()
    const totalSize = virtualizer.getTotalSize()
    const contentHeight = totalSize
    const cssVars = {
      '--scaled-width': `${scaledWidth}px`,
      '--content-height': `${contentHeight}px`,
      '--margin-left-scaled': `${marginLeftScaled}px`,
      '--page-w': `${pageW}px`,
      '--overlay-width': `${canvasWidth * zoom}px`,
      '--overlay-height': `${canvasHeight * zoom}px`,
      '--zoom': String(zoom),
      '--canvas-width': `${canvasWidth}px`,
      '--canvas-height': `${canvasHeight}px`,
    } as React.CSSProperties

    return (
      <div ref={parentRef} className={styles.scrollContainerCentered}>
        <div className={styles.contentFrame} style={cssVars}>
          <div className={styles.contentInner} style={cssVars}>
            {virtualItems.map((virtualRow) => (
              <div
                key={virtualRow.key}
                className={styles.virtualRow}
                style={{
                  ...cssVars,
                  top: virtualRow.start,
                } as React.CSSProperties}
              >
                {renderPage(virtualRow.index)}
              </div>
            ))}
            {overlay && (
              <div className={styles.overlayWrapper} style={cssVars}>
                <div className={styles.overlayInner} style={cssVars}>
                  {overlay}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const cssVars = {
    '--scaled-width': `${scaledWidth}px`,
    '--scaled-height': `${scaledHeight}px`,
    '--margin-left-scaled': `${marginLeftScaled}px`,
    '--page-w': `${pageW}px`,
    '--overlay-width': `${canvasWidth * zoom}px`,
    '--overlay-height': `${canvasHeight * zoom}px`,
    '--zoom': String(zoom),
    '--canvas-width': `${canvasWidth}px`,
    '--canvas-height': `${canvasHeight}px`,
    '--gap-scaled': `${gapScaled}px`,
  } as React.CSSProperties

  return (
    <div ref={parentRef} className={styles.scrollContainer}>
      <div className={styles.contentFrameNonVirtual} style={cssVars}>
        <div className={styles.contentInnerNonVirtual} style={cssVars}>
          <div className={styles.pagesColumn} style={cssVars}>
            {Array.from({ length: numPages }, (_, i) => (
              <div key={i}>{renderPage(i)}</div>
            ))}
          </div>
          {overlay && (
            <div className={styles.overlayWrapper} style={cssVars}>
              <div className={styles.overlayInner} style={cssVars}>
                {overlay}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
