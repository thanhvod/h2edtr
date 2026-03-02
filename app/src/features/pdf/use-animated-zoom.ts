import { useState, useEffect, useRef } from 'react'

const DURATION = 250

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export function useAnimatedZoom(zoom: number): number {
  const [displayZoom, setDisplayZoom] = useState(zoom)
  const rafRef = useRef<number | undefined>(undefined)
  const currentRef = useRef(zoom)

  useEffect(() => {
    const startValue = currentRef.current
    const endValue = zoom
    if (Math.abs(startValue - endValue) < 0.001) {
      setDisplayZoom(endValue)
      currentRef.current = endValue
      return
    }

    const startTime = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTime
      const t = Math.min(elapsed / DURATION, 1)
      const eased = easeOutCubic(t)
      const value = startValue + (endValue - startValue) * eased
      currentRef.current = value
      setDisplayZoom(value)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [zoom])

  return displayZoom
}
