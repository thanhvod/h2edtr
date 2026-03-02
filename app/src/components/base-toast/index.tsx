import { useToast } from './use-toast'
import styles from './style.module.scss'

type ToastProps = {
  message: string
  onDismiss: () => void
  duration?: number
}

export function Toast({ message, onDismiss, duration = 2500 }: ToastProps) {
  useToast(onDismiss, duration)

  return <div className={styles.toast}>{message}</div>
}
