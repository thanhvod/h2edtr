import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PdfViewer } from '@/features/pdf'
import { LeftPanel } from '@/components/panel-left'
import { PinsSvgOverlay } from '@/features/pin/pins-svg-overlay'
import { ShapesSvgOverlay } from '@/features/pin/shapes-svg-overlay'
import { getSharePdfObjects } from '@/lib/api'
import { getCanvasSize } from '@/lib/pdf-dimensions'
import { getPageObjects } from '@/lib/page-objects'
import type { ShapeItem, PinItem, GroupItem } from '@/features/canvas/canvas-content'
import type { ViewMode } from '@/components/panel-view-mode'
import styles from './share-page.module.scss'

const PALETTE_COLORS = [
  '#e74c3c', '#e67e22', '#f39c12', '#2ecc71', '#1abc9c',
  '#3498db', '#9b59b6', '#34495e', '#95a5a6', '#e91e63',
  '#00bcd4', '#4caf50', '#ff9800', '#795548', '#607d8b',
]

export function SharePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [numPages, setNumPages] = useState<number | null>(null)
  const [canvasState, setCanvasState] = useState<{
    shapes: ShapeItem[]
    pins: PinItem[]
    groups: GroupItem[]
  }>({ shapes: [], pins: [], groups: [] })
  const [error, setError] = useState<string | null>(null)
  const [expandedPages, setExpandedPages] = useState<Set<number>>(new Set([1]))
  const [activePage, setActivePage] = useState<number | null>(1)
  const [scrollToPageRequest, setScrollToPageRequest] = useState<number | null>(null)
  const [zoom] = useState(1)
  const viewMode: ViewMode = 'scroll'

  useEffect(() => {
    if (!id) return
    let cancelled = false
    getSharePdfObjects(id)
      .then((data) => {
        if (cancelled) return
        setNumPages(data.numPages)
        setCanvasState({
          shapes: data.shapes as ShapeItem[],
          pins: data.pins,
          groups: data.groups as GroupItem[],
        })
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load')
        }
      })
    return () => { cancelled = true }
  }, [id])

  const handleTogglePage = useCallback((page: number) => {
    setExpandedPages((prev) => {
      const next = new Set(prev)
      if (next.has(page)) next.delete(page)
      else next.add(page)
      return next
    })
  }, [])

  const handleClose = useCallback(() => {
    navigate('/')
  }, [navigate])

  const pageObjects = numPages
    ? getPageObjects(numPages, canvasState.shapes, canvasState.groups, canvasState.pins)
    : {}

  const { width: canvasWidth, height: canvasHeight } = numPages
    ? getCanvasSize(numPages)
    : { width: 0, height: 0 }

  const file = id && numPages ? { id, numPages } : null

  const shareOverlay = useMemo(
    () => (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <PinsSvgOverlay
          pins={canvasState.pins}
          groups={canvasState.groups}
          width={canvasWidth}
          height={canvasHeight}
        />
        <ShapesSvgOverlay
          shapes={canvasState.shapes}
          groups={canvasState.groups}
          width={canvasWidth}
          height={canvasHeight}
          selectedColor={PALETTE_COLORS[12] ?? '#0984e3'}
        />
      </div>
    ),
    [
      canvasState.pins,
      canvasState.groups,
      canvasState.shapes,
      canvasWidth,
      canvasHeight,
    ]
  )

  if (error) {
    return (
      <div className={styles.root}>
        <div className={styles.error}>
          <p>{error}</p>
          <button type="button" onClick={handleClose}>
            Go back
          </button>
        </div>
      </div>
    )
  }

  if (!file || !numPages) {
    return (
      <div className={styles.root}>
        <div className={styles.loading}>Loading…</div>
      </div>
    )
  }

  return (
    <div className={styles.root}>
      <div className={styles.mainLayout}>
        <div className={styles.mainRow}>
          <LeftPanel
            numPages={numPages}
            expandedPages={expandedPages}
            onTogglePage={handleTogglePage}
            activePage={activePage}
            onPageSelect={(page) => {
              setActivePage(page)
              setScrollToPageRequest(page)
            }}
            pageObjects={pageObjects}
            selectedObjectId={null}
            onObjectSelect={() => {}}
            onUpload={() => {}}
            onClose={handleClose}
            pagesOnly
          />
          <div className={styles.centerArea}>
            <PdfViewer
              file={file}
              deviceId={null}
              viewMode={viewMode}
              zoom={zoom}
              onNumPages={() => {}}
              scrollToPage={scrollToPageRequest}
              onScrollToPageHandled={() => setScrollToPageRequest(null)}
              onVisiblePageChange={(page) =>
                setActivePage((prev) => (prev === page ? prev : page))
              }
              overlay={shareOverlay}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
