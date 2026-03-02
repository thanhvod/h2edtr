import styles from './style.module.scss'

export type ViewMode = 'scroll' | 'grid'

type ViewModeToggleProps = {
  value: ViewMode
  onChange: (mode: ViewMode) => void
}

export function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        onClick={() => onChange('scroll')}
        className={`${styles.btn} ${styles.left} ${value === 'scroll' ? styles.active : ''}`}
      >
        Scroll
      </button>
      <button
        type="button"
        onClick={() => onChange('grid')}
        className={`${styles.btn} ${styles.right} ${value === 'grid' ? styles.active : ''}`}
      >
        Grid
      </button>
    </div>
  )
}
