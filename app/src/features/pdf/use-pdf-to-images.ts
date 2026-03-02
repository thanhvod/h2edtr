import { useState, useEffect } from 'react'
import * as pdfjs from 'pdfjs-dist'
import type { PdfFile } from './pdf-types'
import { getPdfPage, getSharePdfPage, uploadPdf, addPdfPage, addPdfThumbnail } from '@/lib/api'

import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

/** Scale for rendering - higher = better quality for zoom. Target ~500KB/page with jpeg. */
const IMAGE_SCALE = 2.5
const JPEG_QUALITY = 0.9
const THUMBNAIL_SIZE = 400
const THUMBNAIL_JPEG_QUALITY = 0.5

export type PageImageState =
  | { status: 'loading' }
  | { status: 'ready'; url: string; width: number; height: number }

function isPdfFromServer(file: PdfFile): file is { id: string; url?: string; numPages?: number } {
  return !!file && typeof file === 'object' && 'id' in file && typeof (file as { id?: string }).id === 'string'
}

async function getPdfSource(file: PdfFile): Promise<Parameters<typeof pdfjs.getDocument>[0]> {
  if (!file) throw new Error('No file')
  if (typeof file === 'string') return file
  if (file instanceof File) return { data: await file.arrayBuffer() }
  if (file instanceof ArrayBuffer) return { data: file.slice(0) }
  if (file && typeof file === 'object' && 'url' in file && !('id' in file)) return file as { url: string }
  throw new Error('Invalid file')
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => {
      const dataUrl = r.result as string
      resolve(dataUrl.replace(/^data:image\/\w+;base64,/, ''))
    }
    r.onerror = reject
    r.readAsDataURL(blob)
  })
}

export type UsePdfToImagesOptions = {
  onUploadComplete?: (pdfId: string, numPages: number) => void
}

export function usePdfToImages(
  file: PdfFile,
  deviceId: string | null = null,
  options: UsePdfToImagesOptions = {},
) {
  const { onUploadComplete } = options
  const [numPages, setNumPages] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pageImages, setPageImages] = useState<Record<number, PageImageState>>({})

  useEffect(() => {
    if (!file) {
      setNumPages(null)
      setError(null)
      setPageImages({})
      return
    }

    let cancelled = false

    if (isPdfFromServer(file)) {
      const pdfId = file.id
      const n = file.numPages ?? 1
      const isShare = !deviceId

      async function loadFromApi() {
        setError(null)
        setNumPages(n)
        setPageImages({})

        const fetchPage = isShare
          ? (pageNum: number) => getSharePdfPage(pdfId, pageNum)
          : (pageNum: number) => getPdfPage(deviceId!, pdfId, pageNum)

        for (let i = 1; i <= n; i++) {
          if (cancelled) break

          setPageImages((prev) => ({ ...prev, [i - 1]: { status: 'loading' } }))

          try {
            const res = await fetchPage(i)
            if (cancelled) continue

            const url = res.url
            setPageImages((prev) => ({
              ...prev,
              [i - 1]: {
                status: 'ready',
                url,
                width: res.width,
                height: res.height,
              },
            }))
          } catch (err) {
            if (!cancelled) {
              setError(err instanceof Error ? err.message : 'Failed to load page')
            }
          }
        }
      }

      loadFromApi()
      return () => {
        cancelled = true
      }
    }

    async function loadAndConvert() {
      setError(null)
      setPageImages({})

      try {
        const src = await getPdfSource(file)
        const pdf = await pdfjs.getDocument(src).promise
        if (cancelled) return

        const n = pdf.numPages
        setNumPages(n)

        const shouldUpload = file instanceof File && deviceId && onUploadComplete
        let pdfId: string | null = null

        if (shouldUpload) {
          const res = await uploadPdf(deviceId, file.name, n, file.size)
          if (cancelled) return
          pdfId = res.id
          // Notify App immediately so user can capture before page images upload completes
          onUploadComplete(pdfId, n)
        }

        const uploadPromises: Promise<unknown>[] = []

        for (let i = 1; i <= n; i++) {
          if (cancelled) break

          setPageImages((prev) => ({ ...prev, [i - 1]: { status: 'loading' } }))

          const page = await pdf.getPage(i)
          if (cancelled) break

          const viewport = page.getViewport({ scale: IMAGE_SCALE })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            setPageImages((prev) => ({ ...prev, [i - 1]: { status: 'loading' } }))
            continue
          }

          await page.render({
            canvasContext: ctx,
            viewport,
            canvas,
            intent: 'display',
          }).promise
          if (cancelled) break

          const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob(
              (b) => resolve(b),
              'image/jpeg',
              JPEG_QUALITY
            )
          })

          if (cancelled || !blob) continue

          const url = URL.createObjectURL(blob)
          setPageImages((prev) => ({
            ...prev,
            [i - 1]: {
              status: 'ready',
              url,
              width: viewport.width,
              height: viewport.height,
            },
          }))

          if (shouldUpload && pdfId) {
            const base64 = await blobToBase64(blob)
            if (cancelled) continue
            uploadPromises.push(
              addPdfPage(deviceId!, pdfId, {
                pageNumber: i,
                imageBase64: base64,
                width: viewport.width,
                height: viewport.height,
              }),
            )
            if (i === 1) {
              const w = canvas.width
              const h = canvas.height
              const size = Math.min(w, h)
              const sx = (w - size) / 2
              const sy = (h - size) / 2
              const thumbCanvas = document.createElement('canvas')
              thumbCanvas.width = THUMBNAIL_SIZE
              thumbCanvas.height = THUMBNAIL_SIZE
              const thumbCtx = thumbCanvas.getContext('2d')
              if (thumbCtx) {
                thumbCtx.drawImage(
                  canvas,
                  sx, sy, size, size,
                  0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE,
                )
                const thumbBlob = await new Promise<Blob | null>((resolve) => {
                  thumbCanvas.toBlob((b) => resolve(b), 'image/jpeg', THUMBNAIL_JPEG_QUALITY)
                })
                if (thumbBlob) {
                  const thumbBase64 = await blobToBase64(thumbBlob)
                  uploadPromises.push(addPdfThumbnail(deviceId!, pdfId, thumbBase64))
                }
              }
            }
          }
        }

        if (shouldUpload && pdfId && !cancelled) {
          await Promise.all(uploadPromises)
          // onUploadComplete called early after uploadPdf so user can capture immediately
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load PDF')
          setNumPages(null)
        }
      }
    }

    loadAndConvert()

    return () => {
      cancelled = true
      setPageImages((prev) => {
        Object.values(prev).forEach((p) => {
          if (p.status === 'ready' && p.url.startsWith('blob:')) URL.revokeObjectURL(p.url)
        })
        return {}
      })
    }
  }, [file, deviceId, onUploadComplete])

  return { numPages, error, pageImages }
}
