import { useExportDialog } from './use-export-dialog'
import styles from './style.module.scss'

type ExportDialogProps = {
  open: boolean
  onClose: () => void
  onExport: (includePdf: boolean) => void
  hasPdf: boolean
}

export function ExportDialog({ open, onClose, onExport, hasPdf }: ExportDialogProps) {
  const { includePdf, handleIncludePdfChange, handleExport } = useExportDialog({
    hasPdf,
    onClose,
    onExport,
  })

  if (!open) return null

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>Export Region</h3>
        {hasPdf && (
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={includePdf}
              onChange={(e) => handleIncludePdfChange(e.target.checked)}
            />
            <span>Include PDF background</span>
          </label>
        )}
        <div className={styles.actions}>
          <button type="button" onClick={onClose} className={styles.cancelBtn}>
            Cancel
          </button>
          <button type="button" onClick={handleExport} className={styles.exportBtn}>
            Export
          </button>
        </div>
      </div>
    </div>
  )
}
