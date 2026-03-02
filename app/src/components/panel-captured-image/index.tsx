import { useState, useCallback, useEffect } from 'react'
import JSZip from 'jszip'
import { IconEye, IconClose } from '../base-icon'
import { fetchCapturedImageBlob, type CapturedImageItem } from '@/lib/api'
import styles from './style.module.scss'

type CapturedImagesCardProps = {
  images: CapturedImageItem[]
  pdfId: string
  deviceId: string
  onDelete: (id: string) => void
}

export function CapturedImagesCard({ images, pdfId, deviceId, onDelete }: CapturedImagesCardProps) {
  const [viewingImage, setViewingImage] = useState<CapturedImageItem | null>(null)
  const [downloading, setDownloading] = useState(false)

  const handleView = useCallback((e: React.MouseEvent, img: CapturedImageItem) => {
    e.stopPropagation()
    setViewingImage(img)
  }, [])

  const handleDelete = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation()
      onDelete(id)
    },
    [onDelete],
  )

  const viewingIndex = viewingImage ? images.findIndex((i) => i.id === viewingImage.id) : -1

  useEffect(() => {
    if (!viewingImage) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setViewingImage(null)
      } else if (e.key === 'ArrowLeft' && viewingIndex > 0) {
        setViewingImage(images[viewingIndex - 1])
      } else if (e.key === 'ArrowRight' && viewingIndex >= 0 && viewingIndex < images.length - 1) {
        setViewingImage(images[viewingIndex + 1])
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [viewingImage, viewingIndex, images])

  const handleDownloadAll = useCallback(async () => {
    if (images.length === 0 || !pdfId || !deviceId) return
    setDownloading(true)
    try {
      const zip = new JSZip()
      for (let i = 0; i < images.length; i++) {
        const img = images[i]
        const blob = await fetchCapturedImageBlob(deviceId, pdfId, img.id)
        zip.file(`captured-${i + 1}.png`, blob)
      }
      const content = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(content)
      const link = document.createElement('a')
      link.href = url
      link.download = `captured-${Date.now()}.zip`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      // ignore
    } finally {
      setDownloading(false)
    }
  }, [images, pdfId, deviceId])

  if (images.length === 0) return null

  return (
    <>
      <div className={styles.card}>
        <>
          <div className={styles.grid}>
            {images.map((img) => (
              <div key={img.id} className={styles.thumbnail}>
                <img src={img.url} alt="" />
                <div className={styles.thumbnailOverlay}>
                  <button
                    type="button"
                    className={styles.viewBtn}
                    onClick={(e) => handleView(e, img)}
                    title="View image"
                  >
                    <IconEye size={24} color="#212529" />
                  </button>
                  <button
                    type="button"
                    className={styles.deleteBtn}
                    onClick={(e) => handleDelete(e, img.id)}
                    title="Delete"
                  >
                    <IconClose size={18} color="white" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            className={styles.downloadAllBtn}
            onClick={handleDownloadAll}
            disabled={images.length === 0 || downloading || !pdfId || !deviceId}
          >
            {downloading ? 'Downloading...' : 'Download All'}
          </button>
        </>
      </div>

      {viewingImage && (
        <div
          className={styles.fullscreenBackdrop}
          onClick={() => setViewingImage(null)}
          role="button"
          tabIndex={0}
          aria-label="Close"
        >
          <div
            className={styles.fullscreenContent}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={styles.fullscreenClose}
              onClick={() => setViewingImage(null)}
              aria-label="Close"
            >
              <IconClose size={24} color="white" />
            </button>
            <img src={viewingImage.url} alt="" className={styles.fullscreenImage} />
            <div className={styles.fullscreenThumbnails}>
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  className={`${styles.fullscreenThumb} ${img.id === viewingImage.id ? styles.fullscreenThumbActive : ''}`}
                  onClick={() => setViewingImage(img)}
                  aria-label={`View image ${idx + 1}`}
                >
                  <img src={img.url} alt="" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
