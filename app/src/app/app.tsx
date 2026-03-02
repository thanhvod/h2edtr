import { useState, useCallback, useEffect, useRef } from 'react'
import { useExtend } from '@pixi/react'
import { Container, Graphics } from 'pixi.js'
import { PdfViewer, PdfDropZone, type PdfFile } from '@/features/pdf'
import type { ViewMode } from '@/components/panel-view-mode'
import { LeftPanel } from '@/components/panel-left'
import { IconFullscreen, IconFullscreenExit } from '@/components/base-icon'
import { RightPanel, PALETTE_COLORS, type SelectedObject } from '@/components/panel-right'
import { BottomToolbar, type BottomTool, type ShapeType } from '@/components/panel-toolbar'
import { Toast } from '@/components/base-toast'
import { CanvasStage } from '@/components/base-canvas-stage'
import { PinsSvgOverlay } from '@/features/pin/pins-svg-overlay'
import { ShapesSvgOverlay } from '@/features/pin/shapes-svg-overlay'
import { ResizeHandlesSvgOverlay } from '@/features/pin/resize-handles-svg-overlay'
import { CapturedImagesCard } from '@/components/panel-captured-image'
import { CropSvgOverlay } from '@/features/canvas/crop-svg-overlay'
import { CanvasContent, type ShapeItem, type PinItem, type GroupItem } from '@/features/canvas/canvas-content'
import { getCanvasSize } from '@/lib/pdf-dimensions'
import { drawShapesAndPinsToContext } from '@/lib/draw-overlays-to-canvas'
import { getPageObjects } from '@/lib/page-objects'
import {
  loadPdf,
  savePdfBlob,
  savePdfUrl,
  savePdfId,
  clearPdfCache,
  loadAppState,
  saveAppState,
  type CachedAppState,
} from '@/lib/app-cache'
import {
  getPdfObjects,
  syncPdfObjects,
  listCapturedImages,
  uploadCapturedImage,
  deleteCapturedImage,
  fetchPdfBlob,
  type CapturedImageItem,
} from '@/lib/api'
import { useUser } from '@/lib/use-user'
import type { PageImageState } from '@/features/pdf/use-pdf-to-images'
import styles from './App.module.scss'

function mapBottomToolToCanvas(bottomTool: BottomTool): 'select' | 'draw' | 'pin' | 'camera' {
  if (bottomTool === 'camera') return 'camera'
  if (bottomTool === 'pin') return 'pin'
  if (bottomTool === 'shape') return 'draw'
  return 'select'
}

function App() {
  useExtend({ Container, Graphics })
  const { deviceId, loading: userLoading } = useUser()

  const [file, setFile] = useState<PdfFile>(null)
  const [pdfId, setPdfId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('scroll')
  const [bottomTool, setBottomTool] = useState<BottomTool>('select')
  const [shapeType, setShapeType] = useState<ShapeType>('rect')
  const [zoom, setZoom] = useState(1)
  const [numPages, setNumPages] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [restored, setRestored] = useState(false)
  const [expandedPages, setExpandedPages] = useState<Set<number>>(new Set([1]))
  const [activePage, setActivePage] = useState<number | null>(1)
  const [scrollToPageRequest, setScrollToPageRequest] = useState<number | null>(null)
  const [selectedColor, setSelectedColor] = useState<string>(PALETTE_COLORS[12] ?? '#0984e3')
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null)
  const [canvasKey, setCanvasKey] = useState(0)
  const canvasCloneRef = useRef<(() => void) | null>(null)
  const canvasDeleteRef = useRef<(() => void) | null>(null)
  const canvasUndoRef = useRef<(() => void) | null>(null)
  const canvasRedoRef = useRef<(() => void) | null>(null)
  const canvasUpdateObjectRef = useRef<
    ((id: string, updates: Partial<{ x: number; y: number; width: number; height: number }>) => void) | null
  >(null)
  const resizePointerDownRef = useRef<
    ((shapeId: string, corner: 'nw' | 'ne' | 'sw' | 'se', x: number, y: number) => void) | null
  >(null)
  const syncObjectsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [canvasState, setCanvasState] = useState<{ shapes: ShapeItem[]; pins: PinItem[]; groups: GroupItem[] }>({
    shapes: [],
    pins: [],
    groups: [],
  })
  const [capturedImages, setCapturedImages] = useState<CapturedImageItem[]>([])
  const [cropRect, setCropRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const pageImagesRef = useRef<Record<number, PageImageState>>({})

  const canvasTool = mapBottomToolToCanvas(bottomTool)
  const drawShape = shapeType === 'star' ? 'star' : 'rect'

  const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75] as const

  // Arrow Up/Down: scroll PDF page list
  useEffect(() => {
    if (!file || numPages == null || numPages <= 0) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
      const target = document.activeElement
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return

      e.preventDefault()
      const current = activePage ?? 1
      const next = e.key === 'ArrowDown' ? Math.min(current + 1, numPages) : Math.max(current - 1, 1)
      setActivePage(next)
      setScrollToPageRequest(next)
    }
    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [file, numPages, activePage])

  // Cmd/Ctrl + Plus/Minus/0: change app zoom instead of browser zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return
      const isZoomIn = e.key === '=' || e.key === '+'
      const isZoomOut = e.key === '-'
      const isZoomReset = e.key === '0'
      if (!isZoomIn && !isZoomOut && !isZoomReset) return

      e.preventDefault()

      if (isZoomReset) {
        setZoom(1)
        return
      }

      setZoom((prev) => {
        const idx = ZOOM_LEVELS.findIndex((l) => Math.abs(l - prev) < 0.01)
        const currentIdx = idx >= 0 ? idx : 3
        if (isZoomIn) return ZOOM_LEVELS[Math.min(currentIdx + 1, ZOOM_LEVELS.length - 1)]
        return ZOOM_LEVELS[Math.max(currentIdx - 1, 0)]
      })
    }
    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [])

  useEffect(() => {
    return () => {
      if (syncObjectsTimeoutRef.current) clearTimeout(syncObjectsTimeoutRef.current)
    }
  }, [])

  // Restore from cache on mount (runs in parallel with ensure)
  useEffect(() => {
    let cancelled = false
    async function restore() {
      const [cachedPdf, cachedState] = await Promise.all([loadPdf(), Promise.resolve(loadAppState())])
      if (cancelled) return
      if (cachedPdf) {
        if (cachedPdf.type === 'url') {
          setFile(cachedPdf.value)
        } else if (cachedPdf.type === 'pdfId') {
          setNumPages(cachedPdf.numPages)
          setFile({ id: cachedPdf.id, numPages: cachedPdf.numPages })
        } else {
          setFile(cachedPdf.arrayBuffer)
        }
      }
      if (cachedState) {
        setViewMode(cachedState.viewMode)
        setBottomTool((cachedState.tool as BottomTool) || 'select')
        setShapeType((cachedState.drawShape === 'star' ? 'star' : 'rect') as ShapeType)
        setZoom(cachedState.zoom)
        if (cachedPdf?.type !== 'pdfId' && (cachedState.shapes?.length || cachedState.pins?.length || cachedState.groups?.length)) {
          const LEGACY_SAMPLE_IDS = new Set(['s1', 's2', 's3', 's4'])
          const shapes = (cachedState.shapes ?? []).filter((s) => !LEGACY_SAMPLE_IDS.has(s.id))
          const groups = (cachedState.groups ?? []).filter(
            (g) => !g.shapeIds.some((id) => LEGACY_SAMPLE_IDS.has(id))
          )
          if (shapes.length > 0 || (cachedState.pins ?? []).length > 0 || groups.length > 0) {
            setCanvasState({
              shapes,
              pins: cachedState.pins ?? [],
              groups,
            })
          }
        }
      }
      setRestored(true)
    }
    restore()
    return () => {
      cancelled = true
    }
  }, [])

  // Load captured images when pdfId is available
  useEffect(() => {
    const effectivePdfId = pdfId ?? (file && typeof file === 'object' && 'id' in file ? file.id : null)
    if (!effectivePdfId || !deviceId) {
      setCapturedImages([])
      return
    }
    let cancelled = false
    listCapturedImages(deviceId, effectivePdfId)
      .then((images) => {
        if (!cancelled) setCapturedImages(images)
      })
      .catch(() => {
        if (!cancelled) setCapturedImages([])
      })
    return () => {
      cancelled = true
    }
  }, [file, pdfId, deviceId])

  // Load objects when file is pdfId from server
  useEffect(() => {
    if (!file || typeof file !== 'object' || !('id' in file) || !deviceId) return
    const pdfId = file.id
    const numPages = file.numPages
    if (!pdfId || !numPages) return

    let cancelled = false
    getPdfObjects(deviceId, pdfId)
      .then((objects) => {
        if (cancelled) return
        setCanvasState({
          shapes: objects.shapes as ShapeItem[],
          pins: objects.pins,
          groups: objects.groups as GroupItem[],
        })
        setCanvasKey((k) => k + 1)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [file, deviceId])

  // Persist PDF when file changes
  useEffect(() => {
    if (!file || !restored) return
    if (typeof file === 'string') {
      savePdfUrl(file)
      return
    }
    if (file instanceof File) {
      file.arrayBuffer().then((buf) => savePdfBlob(buf, file.name))
      return
    }
    if (typeof file === 'object' && 'id' in file && 'numPages' in file && file.numPages) {
      savePdfId(file.id, file.numPages)
    }
  }, [file, restored])

  // Persist app state
  useEffect(() => {
    if (!restored) return
    const state: CachedAppState = {
      viewMode,
      zoom,
      tool: bottomTool,
      drawShape,
      shapes: canvasState.shapes,
      pins: canvasState.pins,
      groups: canvasState.groups,
    }
    saveAppState(state)
  }, [restored, viewMode, zoom, bottomTool, drawShape, canvasState])

  const handleFileSelect = useCallback((f: PdfFile) => {
    if (!f) return

    setFile(f)
    setPdfId(null)
    setCanvasKey((k) => k + 1)
    setCanvasState({ shapes: [], pins: [], groups: [] })
    setSelectedShapeId(null)
    setCanUndo(false)
    setCanRedo(false)
  }, [])

  const handleUploadComplete = useCallback(
    async (uploadedPdfId: string, numPages: number) => {
      setPdfId(uploadedPdfId)
      savePdfId(uploadedPdfId, numPages)

      if (deviceId) {
        try {
          const objects = await getPdfObjects(deviceId, uploadedPdfId)
          setCanvasState({
            shapes: objects.shapes as ShapeItem[],
            pins: objects.pins,
            groups: objects.groups as GroupItem[],
          })
        } catch {
          setToast('Failed to load canvas objects')
        }
      }
    },
    [deviceId],
  )

  const handleClear = useCallback(() => {
    setFile(null)
    setPdfId(null)
    setFullscreen(false)
    clearPdfCache()
    setCanvasState({ shapes: [], pins: [], groups: [] })
    setSelectedShapeId(null)
    setCapturedImages([])
    setCanUndo(false)
    setCanRedo(false)
  }, [])

  const handlePdfSelect = useCallback(
    async (pdf: { id: string; numPages: number }) => {
      if (!deviceId) return
      try {
        setPdfId(null)
        setFile({ id: pdf.id, numPages: pdf.numPages })
        setNumPages(pdf.numPages)
        savePdfId(pdf.id, pdf.numPages)

        const objects = await getPdfObjects(deviceId, pdf.id)
        setCanvasState({
          shapes: objects.shapes as ShapeItem[],
          pins: objects.pins,
          groups: objects.groups as GroupItem[],
        })
        setCanvasKey((k) => k + 1)
      } catch (err) {
        setToast(err instanceof Error ? err.message : 'Failed to load PDF')
      }
    },
    [deviceId],
  )

  const handleCropComplete = useCallback(
    async (bounds: { x: number; y: number; width: number; height: number }) => {
      const effectivePdfId = pdfId ?? (file && typeof file === 'object' && 'id' in file ? file.id : null)
      if (!effectivePdfId || !deviceId) {
        setToast('Please upload PDF to server to save images')
        return
      }
      if (bounds.width < 10 || bounds.height < 10) {
        setToast('Selection too small')
        return
      }
      const app = (window as unknown as { __pixiApp?: import('pixi.js').Application }).__pixiApp
      if (!app?.renderer) {
        setToast('Export failed: Canvas not ready')
        return
      }
      const extract = (app.renderer as { extract?: { canvas: (opts: unknown) => unknown } }).extract
      if (!extract) {
        setToast('Export failed: Extract not available')
        return
      }
      try {
        const { Rectangle } = await import('pixi.js')
        const { GAP, MARGIN_LEFT, PAGE_WIDTH, PAGE_HEIGHT } = await import('@/lib/pdf-dimensions')
        const frame = new Rectangle(bounds.x, bounds.y, bounds.width, bounds.height)
        const pixiCanvas = extract.canvas({
          target: app.stage,
          frame,
          resolution: 2,
        })
        const pdfFile = file
        let canvas: HTMLCanvasElement
        const res = 2
        canvas = document.createElement('canvas')
        canvas.width = bounds.width * res
        canvas.height = bounds.height * res
        const ctx = canvas.getContext('2d')!
        ctx.scale(res, res)
        ctx.translate(-bounds.x, -bounds.y)

        const pageImages = pageImagesRef.current
        const numP = numPages ?? 0
        const usePageImages =
          pdfFile &&
          numP > 0 &&
          Array.from({ length: numP }, (_, i) => pageImages[i])
            .filter(Boolean)
            .every((s) => s?.status === 'ready')

        let usePdfFallback = !usePageImages
        if (usePageImages) {
          try {
            for (let i = 0; i < numP; i++) {
              const state = pageImages[i]
              if (state?.status !== 'ready') continue
              const y = i * (PAGE_HEIGHT + GAP)
              const pageBottom = y + PAGE_HEIGHT
              if (pageBottom >= bounds.y && y <= bounds.y + bounds.height) {
                const img = await new Promise<HTMLImageElement>((resolve, reject) => {
                  const el = new Image()
                  el.crossOrigin = 'anonymous'
                  el.onload = () => resolve(el)
                  el.onerror = reject
                  el.src = state.url
                })
                ctx.drawImage(img, 0, 0, img.width, img.height, MARGIN_LEFT, y, PAGE_WIDTH, PAGE_HEIGHT)
              }
            }
          } catch {
            usePdfFallback = true
            ctx.setTransform(1, 0, 0, 1, 0, 0)
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.scale(res, res)
            ctx.translate(-bounds.x, -bounds.y)
          }
        }
        if (usePdfFallback && pdfFile) {
          const { getDocument } = await import('pdfjs-dist')
          const { SCROLL_SCALE } = await import('@/lib/pdf-dimensions')
          let src: { data: ArrayBuffer } | string
          if (typeof pdfFile === 'string') {
            src = pdfFile
          } else if (pdfFile instanceof File) {
            src = { data: await pdfFile.arrayBuffer() }
          } else if (pdfFile instanceof ArrayBuffer) {
            src = { data: pdfFile }
          } else if (typeof pdfFile === 'object' && 'id' in pdfFile && effectivePdfId && deviceId) {
            src = { data: await fetchPdfBlob(deviceId, effectivePdfId) }
          } else {
            throw new Error('Cannot load PDF for capture')
          }
          const pdf = await getDocument(src).promise
          ctx.translate(MARGIN_LEFT, 0)
          let y = 0
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i)
            const viewport = page.getViewport({ scale: SCROLL_SCALE })
            const pageBottom = y + viewport.height
            if (pageBottom >= bounds.y && y <= bounds.y + bounds.height) {
              ctx.save()
              ctx.translate(0, y)
              const task = page.render({
                canvasContext: ctx,
                viewport,
                canvas,
              })
              await task.promise
              ctx.restore()
            }
            y = pageBottom + GAP
          }
          ctx.translate(-MARGIN_LEFT, 0)
        }

        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.drawImage(pixiCanvas as unknown as CanvasImageSource, 0, 0, bounds.width * res, bounds.height * res)

        // Draw shapes and pins on top (SVG overlays are not in PixiJS, so we draw them here)
        ctx.scale(res, res)
        ctx.translate(-bounds.x, -bounds.y)
        drawShapesAndPinsToContext(ctx, canvasState.shapes, canvasState.pins, canvasState.groups, bounds, selectedColor)
        canvas.toBlob(
          async (blob) => {
            if (!blob) return
            const reader = new FileReader()
            reader.readAsDataURL(blob)
            reader.onloadend = async () => {
              const base64 = (reader.result as string).split(',')[1]
              if (!base64) return
              try {
                const uploaded = await uploadCapturedImage(deviceId, effectivePdfId, base64)
                setCapturedImages((prev) => [
                  { id: uploaded.id, url: uploaded.url, width: uploaded.width, height: uploaded.height, createdAt: uploaded.createdAt },
                  ...prev,
                ])
              } catch {
                setToast('Image upload failed')
              }
            }
          },
          'image/png',
        )
      } catch (err) {
        console.error('Export failed:', err)
        setToast('Export failed')
      }
    },
    [file, pdfId, deviceId, numPages, canvasState, selectedColor],
  )

  const handleDeleteCaptured = useCallback(
    async (id: string) => {
      const effectivePdfId = pdfId ?? (file && typeof file === 'object' && 'id' in file ? file.id : null)
      if (!effectivePdfId || !deviceId) return
      try {
        await deleteCapturedImage(deviceId, effectivePdfId, id)
        setCapturedImages((prev) => prev.filter((img) => img.id !== id))
      } catch {
        setToast('Failed to delete image')
      }
    },
    [file, pdfId, deviceId],
  )

  const handleShapeSelect = useCallback((shapeId: string, color?: string) => {
    setBottomTool('select')
    setSelectedShapeId(shapeId)
    if (color) setSelectedColor(color)
  }, [])

  const handlePinSelect = useCallback((pinId: string, color?: string) => {
    setBottomTool('select')
    setSelectedShapeId(pinId)
    if (color) setSelectedColor(color)
  }, [])

  const handleGroupSelect = useCallback((groupId: string) => {
    setBottomTool('select')
    setSelectedShapeId(groupId)
  }, [])

  const handleSelectionClear = useCallback(() => {
    setSelectedShapeId(null)
  }, [])

  const handleCanvasStateChange = useCallback(
    (state: { shapes: ShapeItem[]; pins: PinItem[]; groups: GroupItem[] }) => {
      setCanvasState(state)
      setExpandedPages((prev) => {
        const next = new Set(prev)
        const objects = numPages ? getPageObjects(numPages, state.shapes, state.groups, state.pins) : {}
        for (let p = 1; p <= (numPages ?? 0); p++) {
          if ((objects[p]?.length ?? 0) > 0) next.add(p)
        }
        return next
      })

      const effectivePdfId = pdfId ?? (file && typeof file === 'object' && 'id' in file ? file.id : null)
      if (effectivePdfId && deviceId) {
        if (syncObjectsTimeoutRef.current) clearTimeout(syncObjectsTimeoutRef.current)
        syncObjectsTimeoutRef.current = setTimeout(() => {
          syncObjectsTimeoutRef.current = null
          syncPdfObjects(deviceId, effectivePdfId, {
            shapes: state.shapes,
            pins: state.pins,
            groups: state.groups,
          }).catch(() => {})
        }, 500)
      }
    },
    [numPages, file, pdfId, deviceId],
  )

  const pageObjects = numPages
    ? getPageObjects(numPages, canvasState.shapes, canvasState.groups, canvasState.pins)
    : {}

  const handleTogglePage = useCallback((page: number) => {
    setExpandedPages((prev) => {
      const next = new Set(prev)
      if (next.has(page)) next.delete(page)
      else next.add(page)
      return next
    })
  }, [])

  const { width: canvasWidth, height: canvasHeight } = numPages ? getCanvasSize(numPages) : { width: 0, height: 0 }

  const hasInitialCanvasState =
    canvasState.shapes.length > 0 || canvasState.pins.length > 0 || canvasState.groups.length > 0

  const selectedObject: SelectedObject | null = (() => {
    if (!selectedShapeId) return null
    const pin = canvasState.pins.find((p) => p.id === selectedShapeId)
    if (pin) return { type: 'pin', id: pin.id, x: pin.x, y: pin.y }
    const group = canvasState.groups.find((g) => g.id === selectedShapeId)
    if (group) return { type: 'group', id: group.id, x: group.pinX, y: group.pinY }
    const shape = canvasState.shapes.find(
      (s) => s.id === selectedShapeId && s.type === 'rect' && !canvasState.groups.some((g) => g.shapeIds.includes(s.id))
    )
    if (shape && shape.type === 'rect')
      return { type: 'rect', id: shape.id, x: shape.x, y: shape.y, width: shape.width, height: shape.height }
    return null
  })()

  const handleUpdateObject = useCallback(
    (id: string, updates: Partial<{ x: number; y: number; width: number; height: number }>) => {
      canvasUpdateObjectRef.current?.(id, updates)
    },
    []
  )

  return (
    <div className={styles.root}>
      <input
        id="pdf-input"
        type="file"
        accept="application/pdf"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f?.type === 'application/pdf') handleFileSelect(f)
          e.target.value = ''
        }}
        className={styles.pdfInput}
      />
      {file ? (
        <div className={styles.mainLayout}>
          <div className={styles.mainRow}>
            {!fullscreen && (
            <LeftPanel
              numPages={numPages ?? 0}
              expandedPages={expandedPages}
              onTogglePage={handleTogglePage}
              activePage={activePage}
              onPageSelect={(page) => {
                setActivePage(page)
                setScrollToPageRequest(page)
              }}
              pageObjects={pageObjects}
              selectedObjectId={selectedShapeId}
              onObjectSelect={(id) => {
                setSelectedShapeId(id)
                setBottomTool('select')
                for (let p = 1; p <= (numPages ?? 0); p++) {
                  const objs = pageObjects[p] ?? []
                  if (objs.some((o) => o.id === id)) {
                    setActivePage(p)
                    setScrollToPageRequest(p)
                    break
                  }
                }
              }}
              onUpload={() => document.getElementById('pdf-input')?.click()}
              onClose={handleClear}
            />
            )}
            <div className={styles.centerArea}>
              <PdfViewer
                file={file}
                deviceId={deviceId}
                viewMode={viewMode}
                zoom={zoom}
                onNumPages={(n) => setNumPages(n)}
                scrollToPage={scrollToPageRequest}
                onScrollToPageHandled={() => setScrollToPageRequest(null)}
                onVisiblePageChange={setActivePage}
                onUploadComplete={file instanceof File && deviceId ? handleUploadComplete : undefined}
                onPageImagesChange={(imgs) => {
                  pageImagesRef.current = imgs
                }}
                overlay={
                  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    <CanvasStage
                      width={canvasWidth}
                      height={canvasHeight}
                      zoom={zoom}
                      onAppReady={(app) => {
                        ;(window as unknown as { __pixiApp?: import('pixi.js').Application }).__pixiApp = app
                      }}
                    >
                      <CanvasContent
                      key={canvasKey}
                      width={canvasWidth}
                      height={canvasHeight}
                      zoom={zoom}
                      tool={canvasTool}
                      drawShape={drawShape}
                      selectedColor={selectedColor}
                      onToast={setToast}
                      onCropComplete={handleCropComplete}
                      onCropRectChange={setCropRect}
                      initialShapes={hasInitialCanvasState ? canvasState.shapes : undefined}
                      initialPins={hasInitialCanvasState ? canvasState.pins : undefined}
                      initialGroups={hasInitialCanvasState ? canvasState.groups : undefined}
                      onStateChange={handleCanvasStateChange}
                      selectedShapeId={selectedShapeId}
                      onShapeSelect={handleShapeSelect}
                      onPinSelect={handlePinSelect}
                      onGroupSelect={handleGroupSelect}
                      onSelectionClear={handleSelectionClear}
                      cloneRef={canvasCloneRef}
                      deleteRef={canvasDeleteRef}
                      undoRef={canvasUndoRef}
                      redoRef={canvasRedoRef}
                      updateObjectRef={canvasUpdateObjectRef}
                      resizePointerDownRef={resizePointerDownRef}
                      onHistoryChange={(undo, redo) => {
                        setCanUndo(undo)
                        setCanRedo(redo)
                      }}
                    />
                    </CanvasStage>
                    <PinsSvgOverlay
                      pins={canvasState.pins}
                      groups={canvasState.groups}
                      width={canvasWidth}
                      height={canvasHeight}
                      selectedObjectId={selectedShapeId}
                    />
                    <ShapesSvgOverlay
                      shapes={canvasState.shapes}
                      groups={canvasState.groups}
                      width={canvasWidth}
                      height={canvasHeight}
                      selectedObjectId={selectedShapeId}
                      selectedColor={selectedColor}
                    />
                    <ResizeHandlesSvgOverlay
                      shapes={canvasState.shapes}
                      groups={canvasState.groups}
                      width={canvasWidth}
                      height={canvasHeight}
                      selectedObjectId={selectedShapeId}
                      tool={canvasTool}
                      onResizePointerDown={(shapeId, corner, x, y) =>
                        resizePointerDownRef.current?.(shapeId, corner, x, y)
                      }
                    />
                    <CropSvgOverlay
                      cropRect={canvasTool === 'camera' ? cropRect : null}
                      width={canvasWidth}
                      height={canvasHeight}
                    />
                  </div>
                }
              />
            </div>
            {!fullscreen && (
            <div className={styles.rightColumn}>
              <RightPanel
                selectedColor={selectedColor}
                onColorSelect={setSelectedColor}
                selectedObjectId={selectedShapeId}
                selectedObject={selectedObject}
                onUpdateObject={handleUpdateObject}
              />
              <CapturedImagesCard
                images={capturedImages}
                pdfId={pdfId ?? (file && typeof file === 'object' && 'id' in file ? file.id : null) ?? ''}
                deviceId={deviceId ?? ''}
                onDelete={handleDeleteCaptured}
              />
            </div>
            )}
          </div>
          {!fullscreen && (
          <BottomToolbar
            tool={bottomTool}
            shapeType={shapeType}
            zoom={zoom}
            onZoomChange={setZoom}
            onToolChange={setBottomTool}
            onShapeTypeChange={setShapeType}
            onComingSoon={setToast}
            selectedObjectId={selectedShapeId}
            onClone={() => canvasCloneRef.current?.()}
            onDelete={() => canvasDeleteRef.current?.()}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={() => canvasUndoRef.current?.()}
            onRedo={() => canvasRedoRef.current?.()}
          />
          )}
          <button
            type="button"
            onClick={() => setFullscreen((f) => !f)}
            className={styles.fullscreenBtn}
            title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {fullscreen ? (
              <IconFullscreenExit size={24} color="#212529" />
            ) : (
              <IconFullscreen size={24} color="#212529" />
            )}
          </button>
        </div>
      ) : (
        <div className={styles.emptyState}>
          {restored && !userLoading ? (
            <PdfDropZone
              deviceId={deviceId}
              onFileSelect={handleFileSelect}
              onPdfSelect={handlePdfSelect}
            />
          ) : (
            <div className={styles.loadingText}>Loading…</div>
          )}
        </div>
      )}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}

export default App
