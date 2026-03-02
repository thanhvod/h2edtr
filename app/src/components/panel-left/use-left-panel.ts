import { useCallback } from 'react'
import type { PageObjectItem } from '@/lib/page-objects'

type UseLeftPanelOptions = {
  onTogglePage: (page: number) => void
  onPageSelect: (page: number) => void
  pageObjects: Record<number, PageObjectItem[]>
}

export function useLeftPanel({
  onTogglePage,
  onPageSelect,
  pageObjects,
}: UseLeftPanelOptions) {
  const handlePageClick = useCallback(
    (pageNum: number) => {
      onPageSelect(pageNum)
      const objects = pageObjects[pageNum] ?? []
      if (objects.length > 0) {
        onTogglePage(pageNum)
      }
    },
    [onPageSelect, onTogglePage, pageObjects]
  )

  return {
    handlePageClick,
  }
}
