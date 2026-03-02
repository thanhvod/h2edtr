import { useState, useEffect, useRef } from 'react'

const CELL_MIN = 200

export function usePdfGridViewColumnCount() {
  const parentRef = useRef<HTMLDivElement>(null)
  const [columnCount, setColumnCount] = useState(4)

  useEffect(() => {
    const el = parentRef.current
    if (!el) return
    const update = () =>
      setColumnCount(Math.max(1, Math.floor(el.clientWidth / CELL_MIN)))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return { parentRef, columnCount }
}
