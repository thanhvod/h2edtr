import { useEffect } from 'react'

export function useToast(onDismiss: () => void, duration: number) {
  useEffect(() => {
    const t = setTimeout(onDismiss, duration)
    return () => clearTimeout(t)
  }, [onDismiss, duration])
}
