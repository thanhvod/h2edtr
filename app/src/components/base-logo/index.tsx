import styles from './style.module.scss'

type LogoProps = {
  width?: number
  height?: number
  className?: string
  style?: React.CSSProperties
}

export function Logo({ width = 120, height, className, style }: LogoProps) {
  const aspectRatio = 1788 / 336
  const h = height ?? width / aspectRatio

  return (
    <img
      src="/logo-h2.svg"
      alt="H2 Logo"
      width={width}
      height={h}
      className={className ? `${styles.logo} ${className}` : styles.logo}
      style={style}
    />
  )
}
