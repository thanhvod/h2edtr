const PIN_TAG = '__isPin'

export function isPin(obj: unknown): boolean {
  return !!(obj as Record<string, unknown>)[PIN_TAG]
}

export function markAsPin(obj: unknown): void {
  ;(obj as Record<string, boolean>)[PIN_TAG] = true
}
