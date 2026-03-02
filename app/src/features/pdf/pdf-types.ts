export type PdfFile =
  | string
  | File
  | ArrayBuffer
  | { url: string }
  | { id: string; url?: string; numPages?: number }
  | null
