import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useCallback } from 'react'
import { PAGE_WIDTH } from '@/lib/pdf-dimensions'
import type { PageImageState } from '../use-pdf-to-images'
import { usePdfGridViewColumnCount } from './use-pdf-grid-view'
import styles from './style.module.scss'

const GRID_SCALE = 0.5
const VIRTUAL_THRESHOLD = 25
const CELL_MIN = 200
const PAGE_HEIGHT = 842 * GRID_SCALE

type PdfGridViewProps = {
  numPages: number
  pageImages: Record<number, PageImageState>
  zoom?: number
  scrollToPage?: number | null
  onScrollToPageHandled?: () => void
  onVisiblePageChange?: (page: number) => void
}

function PagePlaceholder({ width, height }: { width: number; height: number }) {
  return (
    <div
      className={styles.pagePlaceholder}
      style={{ '--placeholder-w': `${width}px`, '--placeholder-h': `${height}px` } as React.CSSProperties}
    >
      Loading…
    </div>
  )
}

export function PdfGridView({
  numPages,
  pageImages,
  zoom = 1,
  scrollToPage,
  onScrollToPageHandled,
  onVisiblePageChange,
}: PdfGridViewProps) {
  const { parentRef, columnCount } = usePdfGridViewColumnCount()

  const useVirtual = numPages > VIRTUAL_THRESHOLD
  const rowCount = Math.ceil(numPages / Math.max(1, columnCount))
  const virtualizer = useVirtualizer({
    count: useVirtual ? rowCount : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => PAGE_HEIGHT + 16,
    overscan: 1,
  })

  // Scroll to page when scrollToPage changes (1-based page number)
  useEffect(() => {
    if (scrollToPage == null || scrollToPage < 1 || scrollToPage > numPages) return
    const pageIndex = scrollToPage - 1
    const rowIndex = Math.floor(pageIndex / Math.max(1, columnCount))
    if (useVirtual) {
      virtualizer.scrollToIndex(rowIndex, { align: 'start', behavior: 'smooth' })
    } else if (parentRef.current) {
      const gap = 16
      const rowHeight = (PAGE_HEIGHT + gap) * zoom
      const offset = rowIndex * rowHeight
      parentRef.current.scrollTo({ top: offset, behavior: 'smooth' })
    }
    const t = setTimeout(() => onScrollToPageHandled?.(), 500)
    return () => clearTimeout(t)
  }, [scrollToPage, numPages, columnCount, useVirtual, virtualizer, zoom, onScrollToPageHandled])

  const gap = 16
  const rowHeight = (PAGE_HEIGHT + gap) * zoom

  const updateVisiblePage = useCallback(() => {
    const el = parentRef.current
    if (!el || !onVisiblePageChange || numPages <= 0) return
    const viewportCenter = el.scrollTop + el.clientHeight / 2
    const rowIndex = Math.floor(viewportCenter / rowHeight)
    const pageIndex = Math.min(rowIndex * columnCount, numPages - 1)
    const clamped = Math.max(0, pageIndex)
    onVisiblePageChange(clamped + 1)
  }, [numPages, columnCount, rowHeight, onVisiblePageChange])

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

  const displayWidth = PAGE_WIDTH * GRID_SCALE
  const displayHeight = 842 * GRID_SCALE

  const renderPage = (index: number) => {
    const state = pageImages[index]
    if (!state || state.status === 'loading') {
      return <PagePlaceholder width={displayWidth} height={displayHeight} />
    }
    return (
      <img
        src={state.url}
        alt={`Page ${index + 1}`}
        className={styles.pageImage}
        style={{ '--display-width': `${displayWidth}px`, '--display-height': `${displayHeight}px` } as React.CSSProperties}
      />
    )
  }

  const gridCols = `repeat(${columnCount}, minmax(${CELL_MIN}px, 1fr))`
  const gridColsAuto = `repeat(auto-fill, minmax(${CELL_MIN}px, 1fr))`

  const baseCssVars = {
    '--gap': `${gap}px`,
    '--zoom': String(zoom),
    '--page-height': `${PAGE_HEIGHT}px`,
    '--grid-cols': gridCols,
    '--display-width': `${displayWidth}px`,
    '--display-height': `${displayHeight}px`,
  } as React.CSSProperties

  if (useVirtual) {
    const virtualItems = virtualizer.getVirtualItems()
    const totalHeight = virtualizer.getTotalSize() + gap * 2
    const baseHeight = totalHeight
    const scaledHeight = baseHeight * zoom

    const virtualCssVars = {
      ...baseCssVars,
      '--scaled-height': `${scaledHeight}px`,
      '--base-height': `${baseHeight}px`,
      '--virtual-total-height': `${virtualizer.getTotalSize()}px`,
    } as React.CSSProperties

    return (
      <div ref={parentRef} className={styles.scrollContainer}>
        <div className={styles.scaledWrapper} style={virtualCssVars}>
          <div className={styles.zoomTransform} style={virtualCssVars}>
            <div className={styles.virtualContent} style={virtualCssVars}>
              {virtualItems.map((virtualRow) => {
                const startIdx = virtualRow.index * columnCount
                return (
                  <div
                    key={virtualRow.key}
                    className={styles.virtualRow}
                    style={{
                      ...virtualCssVars,
                      '--row-top': `${virtualRow.start + gap}px`,
                    } as React.CSSProperties}
                  >
                    {Array.from({ length: columnCount }, (_, col) => {
                      const pageIndex = startIdx + col
                      if (pageIndex >= numPages) return null
                      return (
                        <div key={pageIndex} className={styles.cell} style={virtualCssVars}>
                          {renderPage(pageIndex)}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const baseHeight = rowCount * (PAGE_HEIGHT + gap) + gap * 2
  const scaledHeight = baseHeight * zoom

  const nonVirtualCssVars = {
    ...baseCssVars,
    '--scaled-height': `${scaledHeight}px`,
    '--base-height': `${baseHeight}px`,
    '--grid-cols': gridColsAuto,
  } as React.CSSProperties

  return (
    <div ref={parentRef} className={styles.scrollContainer}>
      <div className={styles.scaledWrapper} style={nonVirtualCssVars}>
        <div className={styles.zoomTransform} style={nonVirtualCssVars}>
          <div className={styles.grid} style={nonVirtualCssVars}>
            {Array.from({ length: numPages }, (_, i) => (
              <div key={i} className={styles.cell} style={nonVirtualCssVars}>
                {renderPage(i)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
