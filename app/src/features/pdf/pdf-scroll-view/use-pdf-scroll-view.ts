import { useMemo } from 'react'
import {
  GAP,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  MARGIN_LEFT,
  MARGIN_RIGHT,
  getScrollContentSize,
  getCanvasSize,
} from '@/lib/pdf-dimensions'

export function usePdfScrollViewDimensions(numPages: number, zoom: number) {
  return useMemo(() => {
    const { width, height } = getScrollContentSize(numPages)
    const { width: canvasWidth, height: canvasHeight } = getCanvasSize(numPages)

    return {
      scaledWidth: width * zoom,
      scaledHeight: height * zoom,
      pageW: PAGE_WIDTH * zoom,
      pageH: PAGE_HEIGHT * zoom,
      gapScaled: GAP * zoom,
      marginLeftScaled: MARGIN_LEFT * zoom,
      marginRightScaled: MARGIN_RIGHT * zoom,
      canvasWidth,
      canvasHeight,
    }
  }, [numPages, zoom])
}
