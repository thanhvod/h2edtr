import {
  IconGrid,
  IconUpload,
  IconPageItem,
  IconAngleDown,
  IconAngleRight,
} from '../base-icon'
import type { PageObjectItem } from '@/lib/page-objects'
import { useLeftPanel } from './use-left-panel'
import styles from './style.module.scss'

type LeftPanelProps = {
  numPages: number
  expandedPages: Set<number>
  onTogglePage: (page: number) => void
  activePage: number | null
  onPageSelect: (page: number) => void
  pageObjects: Record<number, PageObjectItem[]>
  selectedObjectId: string | null
  onObjectSelect: (objectId: string) => void
  onUpload: () => void
  onClose: () => void
  /** Only show page list, no toolbar icons */
  pagesOnly?: boolean
}

export function LeftPanel({
  numPages,
  expandedPages,
  onTogglePage,
  activePage,
  onPageSelect,
  pageObjects,
  selectedObjectId,
  onObjectSelect,
  onUpload,
  onClose,
  pagesOnly = false,
}: LeftPanelProps) {
  const { handlePageClick } = useLeftPanel({
    onTogglePage,
    onPageSelect,
    pageObjects,
  })

  return (
    <div className={`${styles.panel} ${styles.expanded}`}>
      {pagesOnly && (
        <div className={styles.pagesOnlyHeader}>
          <button type="button" onClick={onClose} className={styles.backLink}>
            ← Go back
          </button>
        </div>
      )}
      {!pagesOnly && (
      <div className={styles.toolbar}>
        <button type="button" onClick={onClose} className={styles.iconBtn} title="Go back to PDF selection screen">
          <IconGrid size={24} />
        </button>
        <button type="button" onClick={onUpload} className={styles.iconBtn} title="Upload new PDF">
          <IconUpload size={24} />
        </button>
      </div>
      )}

      <div className={styles.pageList}>
        {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => {
          const isExpanded = expandedPages.has(pageNum)
          const objects = pageObjects[pageNum] ?? []
          const hasObjects = objects.length > 0
          const isActive = activePage === pageNum

          return (
            <div key={pageNum} className={styles.pageItem}>
              <div
                onClick={() => handlePageClick(pageNum)}
                title={`Page ${pageNum}${hasObjects ? ` (${objects.length} object)` : ''}`}
                className={`${styles.pageRow} ${isActive ? styles.active : ''}`}
              >
                <IconPageItem size={16} color={isActive ? 'var(--color-primary)' : undefined} />
                <span className={styles.pageLabel}>Page {pageNum}</span>
                {hasObjects &&
                  (isExpanded ? (
                    <IconAngleDown size={16} color={isActive ? 'var(--color-primary)' : undefined} />
                  ) : (
                    <IconAngleRight size={16} color={isActive ? 'var(--color-primary)' : undefined} />
                  ))}
              </div>
              {hasObjects && isExpanded && (
                <div className={styles.objectsList}>
                  {objects.map((obj) => (
                    <div
                      key={obj.id}
                      role="button"
                      tabIndex={0}
                      className={`${styles.objectItem} ${selectedObjectId === obj.id ? styles.objectItemSelected : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        onObjectSelect(obj.id)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onObjectSelect(obj.id)
                        }
                      }}
                    >
                      {obj.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
