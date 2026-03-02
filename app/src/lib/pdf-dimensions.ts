export const SCROLL_SCALE = 1.5
export const GAP = 16
export const PAGE_WIDTH = 595 * SCROLL_SCALE
export const PAGE_HEIGHT = 842 * SCROLL_SCALE

/** Margin left/right for placing objects outside PDF page bounds */
export const MARGIN_LEFT = 80
export const MARGIN_RIGHT = 80
export const PADDING = 8

export function getScrollContentSize(numPages: number) {
  return {
    width: MARGIN_LEFT + PAGE_WIDTH + MARGIN_RIGHT,
    height: numPages * PAGE_HEIGHT + (numPages - 1) * GAP,
  }
}

/** Canvas/Stage dimensions (content area without outer padding) */
export function getCanvasSize(numPages: number) {
  return {
    width: MARGIN_LEFT + PAGE_WIDTH + MARGIN_RIGHT,
    height: numPages * PAGE_HEIGHT + (numPages - 1) * GAP,
  }
}
