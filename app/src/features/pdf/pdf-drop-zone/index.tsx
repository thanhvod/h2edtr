import { useEffect, useState } from 'react'
import { Logo } from '@/components'
import { IconPageItem, IconUpload } from '@/components/base-icon'
import { UploadIcon } from '../upload-icon'
import { usePdfDropZone } from './use-pdf-drop-zone'
import { listPdfs, getPdfThumbnail, type PdfListItem } from '@/lib/api'
import styles from './style.module.scss'
import type { PdfFile } from '../pdf-types'

type PdfDropZoneProps = {
  deviceId: string | null
  onFileSelect: (file: PdfFile) => void
  onPdfSelect: (pdf: { id: string; numPages: number }) => void
}

export function PdfDropZone({ deviceId, onFileSelect, onPdfSelect }: PdfDropZoneProps) {
  const { handleFileChange, handleDrop, handleDragOver } = usePdfDropZone({ onFileSelect })
  const [pdfList, setPdfList] = useState<PdfListItem[]>([])
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!deviceId) {
      setLoading(false)
      return
    }
    let cancelled = false
    listPdfs(deviceId)
      .then((list) => {
        if (!cancelled) setPdfList(list)
      })
      .catch(() => {
        if (!cancelled) setPdfList([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [deviceId])

  useEffect(() => {
    if (!deviceId || pdfList.length === 0) return
    const needsUrl = pdfList.filter((p) => !p.thumbnailBase64)
    if (needsUrl.length === 0) return

    let cancelled = false
    const ids = needsUrl.map((p) => p.id)
    ids.forEach((id) => {
      getPdfThumbnail(deviceId, id)
        .then((res) => {
          if (!cancelled) {
            setThumbnailUrls((prev) => ({ ...prev, [id]: res.url }))
          }
        })
        .catch(() => {})
    })
    return () => {
      cancelled = true
    }
  }, [deviceId, pdfList])

  const hasPdfs = pdfList.length > 0

  const renderUploadArea = (compact = false) => (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={compact ? styles.uploadCard : styles.dropZone}
    >
      <label
        htmlFor={compact ? 'pdf-file-input-list' : 'pdf-file-input'}
        title="Click or drag and drop PDF file here"
        className={styles.label}
      >
        {compact ? (
          <IconUpload size={40} color="var(--color-text-secondary)" />
        ) : (
          <UploadIcon size={56} color="var(--color-text-secondary)" />
        )}
        <p className={styles.text}>{compact ? 'Upload PDF' : 'Upload or drag & drop your pdf'}</p>
        <input
          id={compact ? 'pdf-file-input-list' : 'pdf-file-input'}
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className={styles.input}
        />
      </label>
    </div>
  )

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <Logo width={180} />
        <p className={styles.loadingText}>Loading…</p>
      </div>
    )
  }

  if (!hasPdfs) {
    return (
      <div className={styles.wrapper}>
        <Logo width={180} />
        {renderUploadArea(false)}
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>
      <Logo width={180} />
      <div className={styles.pdfGrid}>
        {renderUploadArea(true)}
        {pdfList.map((pdf) => (
          <button
            key={pdf.id}
            type="button"
            className={styles.pdfCard}
            onClick={() => pdf.numPages != null && onPdfSelect({ id: pdf.id, numPages: pdf.numPages })}
          >
            {pdf.thumbnailBase64 ? (
              <img
                src={`data:image/jpeg;base64,${pdf.thumbnailBase64}`}
                alt={pdf.filename}
                className={styles.thumbnail}
              />
            ) : thumbnailUrls[pdf.id] ? (
              <img
                src={thumbnailUrls[pdf.id]}
                alt={pdf.filename}
                className={styles.thumbnail}
              />
            ) : (
              <div className={styles.thumbnailPlaceholder}>
                <IconPageItem size={32} color="var(--color-text-secondary)" />
              </div>
            )}
            <span className={styles.pdfTitle} title={pdf.filename}>
              {pdf.filename}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
