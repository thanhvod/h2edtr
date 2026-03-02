const DB_NAME = 'h2-edtr-cache'
const DB_VERSION = 1
const PDF_STORE = 'pdf'
const PDF_KEY = 'blob'

export type CachedAppState = {
  viewMode: 'scroll' | 'grid'
  zoom: number
  tool: string
  drawShape: 'rect' | 'circle' | 'star'
  shapes: Array<
    | {
        id: string
        type: 'rect'
        x: number
        y: number
        width: number
        height: number
        borderWidth?: number
        radius?: number
        color?: string
      }
    | { id: string; type: 'circle'; x: number; y: number; radius: number }
    | { id: string; type: 'star'; x: number; y: number; radius: number }
  >
  pins: Array<{ id: string; x: number; y: number; color?: string; attachedToShapeId?: string }>
  groups: Array<{
    id: string
    pinX: number
    pinY: number
    pinId: string
    shapeIds: string[]
    shapes: Record<
      string,
      | {
          type: 'rect'
          localX: number
          localY: number
          width: number
          height: number
          borderWidth?: number
          radius?: number
          color?: string
        }
      | { type: 'circle'; localX: number; localY: number; radius: number }
      | { type: 'star'; localX: number; localY: number; radius: number }
    >
  }>
}

export type CachedPdf =
  | { type: 'url'; value: string }
  | { type: 'blob'; filename: string }
  | { type: 'pdfId'; id: string; numPages: number }

const STATE_KEY = 'h2-edtr-state'
const PDF_META_KEY = 'h2-edtr-pdf'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(PDF_STORE)) {
        db.createObjectStore(PDF_STORE)
      }
    }
  })
}

export async function savePdfBlob(arrayBuffer: ArrayBuffer, filename: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PDF_STORE, 'readwrite')
    const store = tx.objectStore(PDF_STORE)
    store.put(arrayBuffer, PDF_KEY)
    tx.oncomplete = () => {
      localStorage.setItem(PDF_META_KEY, JSON.stringify({ type: 'blob', filename }))
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadPdfBlob(): Promise<{ arrayBuffer: ArrayBuffer; filename: string } | null> {
  const meta = localStorage.getItem(PDF_META_KEY)
  if (!meta) return null
  let parsed: CachedPdf
  try {
    parsed = JSON.parse(meta)
  } catch {
    return null
  }
  if (parsed.type !== 'blob') return null

  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PDF_STORE, 'readonly')
    const req = tx.objectStore(PDF_STORE).get(PDF_KEY)
    req.onsuccess = () => {
      const buf = req.result
      db.close()
      resolve(buf ? { arrayBuffer: buf, filename: parsed.filename } : null)
    }
    req.onerror = () => reject(req.error)
  })
}

export function savePdfUrl(url: string): void {
  localStorage.setItem(PDF_META_KEY, JSON.stringify({ type: 'url', value: url }))
}

export function savePdfId(id: string, numPages: number): void {
  localStorage.setItem(PDF_META_KEY, JSON.stringify({ type: 'pdfId', id, numPages }))
}

export async function loadPdf(): Promise<
  | { type: 'url'; value: string }
  | { type: 'blob'; arrayBuffer: ArrayBuffer; filename: string }
  | { type: 'pdfId'; id: string; numPages: number }
  | null
> {
  const meta = localStorage.getItem(PDF_META_KEY)
  if (!meta) return null
  let parsed: CachedPdf
  try {
    parsed = JSON.parse(meta)
  } catch {
    return null
  }
  if (parsed.type === 'url') return { type: 'url', value: parsed.value }
  if (parsed.type === 'pdfId') return { type: 'pdfId', id: parsed.id, numPages: parsed.numPages }
  const blob = await loadPdfBlob()
  return blob ? { type: 'blob', arrayBuffer: blob.arrayBuffer, filename: blob.filename } : null
}

export function clearPdfCache(): void {
  localStorage.removeItem(PDF_META_KEY)
  localStorage.removeItem(STATE_KEY)
  indexedDB.deleteDatabase(DB_NAME)
}

export function saveAppState(state: CachedAppState): void {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state))
  } catch {
    // quota exceeded
  }
}

export function loadAppState(): CachedAppState | null {
  try {
    const raw = localStorage.getItem(STATE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CachedAppState
  } catch {
    return null
  }
}
