const getBaseUrl = () => import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

function getHeaders(deviceId: string): Record<string, string> {
  return {
    'X-Device-ID': deviceId,
  }
}

export type EnsureUserResponse = {
  id: string
  deviceId: string
}

/**
 * Call ensure user API. Create new user if not exists, return user info.
 * Requires X-Device-ID header (deviceId from useDeviceId).
 */
export async function usersEnsure(deviceId: string): Promise<EnsureUserResponse> {
  const res = await fetch(`${getBaseUrl()}/api/users/ensure`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getHeaders(deviceId),
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`usersEnsure failed: ${res.status} ${text}`)
  }

  return res.json() as Promise<EnsureUserResponse>
}

export type PdfListItem = {
  id: string
  filename: string
  fileSize: number | null
  numPages: number | null
  thumbnailBase64: string | null
  createdAt: string
}

/**
 * Get list of user's uploaded PDFs.
 */
export async function listPdfs(deviceId: string): Promise<PdfListItem[]> {
  const res = await fetch(`${getBaseUrl()}/api/pdfs`, {
    headers: getHeaders(deviceId),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`listPdfs failed: ${res.status} ${text}`)
  }

  return res.json() as Promise<PdfListItem[]>
}

export type UploadPdfResponse = {
  id: string
  numPages: number
  filename: string
  createdAt: string
}

/**
 * Create PdfFile record on server (metadata only, no binary upload).
 */
export async function uploadPdf(
  deviceId: string,
  filename: string,
  numPages: number,
  fileSize?: number,
): Promise<UploadPdfResponse> {
  const res = await fetch(`${getBaseUrl()}/api/pdfs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getHeaders(deviceId),
    },
    body: JSON.stringify({ filename, numPages, fileSize: fileSize ?? undefined }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`uploadPdf failed: ${res.status} ${text}`)
  }

  return res.json() as Promise<UploadPdfResponse>
}

export type AddPageResponse = {
  pageNumber: number
}

/**
 * Add/update page image (base64) for PDF.
 */
export async function addPdfPage(
  deviceId: string,
  pdfId: string,
  data: { pageNumber: number; imageBase64: string; width: number; height: number },
): Promise<AddPageResponse> {
  const res = await fetch(`${getBaseUrl()}/api/pdfs/${pdfId}/pages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getHeaders(deviceId),
    },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`addPdfPage failed: ${res.status} ${text}`)
  }

  return res.json() as Promise<AddPageResponse>
}

/**
 * Upload 400x400 thumbnail to S3.
 */
export async function addPdfThumbnail(
  deviceId: string,
  pdfId: string,
  thumbnailBase64: string,
): Promise<{ ok: boolean }> {
  const res = await fetch(`${getBaseUrl()}/api/pdfs/${pdfId}/thumbnail`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getHeaders(deviceId),
    },
    body: JSON.stringify({ thumbnailBase64 }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`addPdfThumbnail failed: ${res.status} ${text}`)
  }

  return res.json() as Promise<{ ok: boolean }>
}

export type GetPdfThumbnailResponse = {
  url: string
}

/**
 * Get thumbnail URL (presigned S3 or data URL).
 */
export async function getPdfThumbnail(
  deviceId: string,
  pdfId: string,
): Promise<GetPdfThumbnailResponse> {
  const res = await fetch(`${getBaseUrl()}/api/pdfs/${pdfId}/thumbnail`, {
    headers: getHeaders(deviceId),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`getPdfThumbnail failed: ${res.status} ${text}`)
  }

  return res.json() as Promise<GetPdfThumbnailResponse>
}

export type GetPdfPageResponse = {
  url: string
  width: number
  height: number
}

/**
 * Get page image from API (lazy load).
 */
export async function getPdfPage(
  deviceId: string,
  pdfId: string,
  pageNumber: number,
): Promise<GetPdfPageResponse> {
  const res = await fetch(`${getBaseUrl()}/api/pdfs/${pdfId}/pages/${pageNumber}`, {
    headers: getHeaders(deviceId),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`getPdfPage failed: ${res.status} ${text}`)
  }

  return res.json() as Promise<GetPdfPageResponse>
}

export type PdfObjects = {
  shapes: Array<{
    id: string
    type: string
    x: number
    y: number
    width?: number
    height?: number
    radius?: number
    color?: string
    borderWidth?: number
  }>
  pins: Array<{ id: string; x: number; y: number; color?: string; attachedToShapeId?: string }>
  groups: Array<{
    id: string
    pinId: string
    pinX: number
    pinY: number
    shapeIds: string[]
    shapes: Record<string, unknown>
  }>
}

/**
 * Get PDF objects (shapes, pins, groups).
 */
export async function getPdfObjects(
  deviceId: string,
  pdfId: string,
): Promise<PdfObjects> {
  const res = await fetch(`${getBaseUrl()}/api/pdfs/${pdfId}/objects`, {
    headers: getHeaders(deviceId),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`getPdfObjects failed: ${res.status} ${text}`)
  }

  return res.json() as Promise<PdfObjects>
}

/**
 * Update PDF objects (shapes, pins, groups).
 */
export type SharePdfData = PdfObjects & { numPages: number }

/**
 * Public share: get PDF metadata + objects (no deviceId required).
 */
export async function getSharePdfObjects(pdfId: string): Promise<SharePdfData> {
  const res = await fetch(`${getBaseUrl()}/api/share/${pdfId}`)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`getSharePdfObjects failed: ${res.status} ${text}`)
  }
  return res.json() as Promise<SharePdfData>
}

/**
 * Public share: get page image from API (no deviceId required).
 */
export async function getSharePdfPage(
  pdfId: string,
  pageNumber: number,
): Promise<GetPdfPageResponse> {
  const res = await fetch(`${getBaseUrl()}/api/share/${pdfId}/pages/${pageNumber}`)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`getSharePdfPage failed: ${res.status} ${text}`)
  }
  return res.json() as Promise<GetPdfPageResponse>
}

export async function syncPdfObjects(
  deviceId: string,
  pdfId: string,
  data: {
    shapes?: PdfObjects['shapes']
    pins?: PdfObjects['pins']
    groups?: PdfObjects['groups']
  },
): Promise<PdfObjects> {
  const res = await fetch(`${getBaseUrl()}/api/pdfs/${pdfId}/objects`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getHeaders(deviceId),
    },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`syncPdfObjects failed: ${res.status} ${text}`)
  }

  return res.json() as Promise<PdfObjects>
}

export type CapturedImageItem = {
  id: string
  url: string
  width: number
  height: number
  createdAt: string
}

/**
 * Get list of captured images for PDF.
 */
export async function listCapturedImages(
  deviceId: string,
  pdfId: string,
): Promise<CapturedImageItem[]> {
  const res = await fetch(`${getBaseUrl()}/api/pdfs/${pdfId}/captured`, {
    headers: getHeaders(deviceId),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`listCapturedImages failed: ${res.status} ${text}`)
  }
  return res.json() as Promise<CapturedImageItem[]>
}

export type UploadCapturedResponse = CapturedImageItem & { s3Key: string }

/**
 * Upload captured image to S3.
 */
export async function uploadCapturedImage(
  deviceId: string,
  pdfId: string,
  imageBase64: string,
): Promise<UploadCapturedResponse> {
  const res = await fetch(`${getBaseUrl()}/api/pdfs/${pdfId}/captured`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getHeaders(deviceId),
    },
    body: JSON.stringify({ imageBase64 }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`uploadCapturedImage failed: ${res.status} ${text}`)
  }
  return res.json() as Promise<UploadCapturedResponse>
}

/**
 * Get PDF as ArrayBuffer for rendering (for capture).
 */
export async function fetchPdfBlob(
  deviceId: string,
  pdfId: string,
): Promise<ArrayBuffer> {
  const res = await fetch(`${getBaseUrl()}/api/files/${pdfId}/download`, {
    headers: getHeaders(deviceId),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`fetchPdfBlob failed: ${res.status} ${text}`)
  }
  return res.arrayBuffer()
}

/**
 * Fetch captured image as Blob (via API proxy, avoids CORS with S3).
 */
export async function fetchCapturedImageBlob(
  deviceId: string,
  pdfId: string,
  capturedId: string,
): Promise<Blob> {
  const res = await fetch(
    `${getBaseUrl()}/api/pdfs/${pdfId}/captured/${capturedId}/download`,
    { headers: getHeaders(deviceId) },
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`fetchCapturedImageBlob failed: ${res.status} ${text}`)
  }
  return res.blob()
}

/**
 * Delete captured image.
 */
export async function deleteCapturedImage(
  deviceId: string,
  pdfId: string,
  capturedId: string,
): Promise<{ deleted: boolean }> {
  const res = await fetch(`${getBaseUrl()}/api/pdfs/${pdfId}/captured/${capturedId}`, {
    method: 'DELETE',
    headers: getHeaders(deviceId),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`deleteCapturedImage failed: ${res.status} ${text}`)
  }
  return res.json() as Promise<{ deleted: boolean }>
}
