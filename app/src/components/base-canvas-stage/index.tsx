import { Application } from '@pixi/react'
import type { Application as PixiApplication } from 'pixi.js'
import { PADDING } from '@/lib/pdf-dimensions'
import styles from './style.module.scss'

type CanvasStageProps = {
  width: number
  height: number
  zoom?: number
  children: React.ReactNode
  onAppReady?: (app: PixiApplication) => void
}

export function CanvasStage({ width, height, zoom = 1, children, onAppReady }: CanvasStageProps) {
  if (width <= 0 || height <= 0) return null

  const displayWidth = Math.ceil(width * zoom)
  const displayHeight = Math.ceil(height * zoom)

  return (
    <div className={styles.wrapper} style={{ '--canvas-padding': `${PADDING}px` } as React.CSSProperties}>
      <Application
        width={displayWidth}
        height={displayHeight}
        resolution={1}
        autoDensity={false}
        backgroundAlpha={0}
        antialias
        onInit={onAppReady}
      >
        {children}
      </Application>
    </div>
  )
}
