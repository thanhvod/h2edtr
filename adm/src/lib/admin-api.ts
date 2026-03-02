const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/admin`
  : '/api/admin'

export type User = {
  id: string
  deviceId: string
  createdAt: string | null
  pdfCount: number
}

export type Pdf = {
  id: string
  filename: string
  fileSize: number | null
  numPages: number | null
  thumbnailUrl: string | null
  createdAt: string
  userId: string
  userDeviceId: string
}

export type UserDetail = {
  id: string
  deviceId: string
  createdAt: string | null
  pdfs: Array<{
    id: string
    filename: string
    fileSize: number | null
    numPages: number | null
    thumbnailUrl: string | null
    createdAt: string
  }>
}

export async function fetchUserDetail(id: string): Promise<UserDetail> {
  const res = await fetch(`${API_BASE}/user/${id}`)
  if (!res.ok) throw new Error('Failed to fetch user detail')
  return res.json()
}

export async function fetchUsers(): Promise<User[]> {
  const res = await fetch(`${API_BASE}/users`)
  if (!res.ok) throw new Error('Failed to fetch users')
  const data = await res.json()
  const list = Array.isArray(data) ? data : (data?.users ?? [])
  return list.map((u: Record<string, unknown>) => ({
    id: u.id,
    deviceId: u.deviceId,
    createdAt: u.createdAt ?? u.created_at ?? null,
    pdfCount: u.pdfCount ?? 0,
  }))
}

export async function fetchPdfs(): Promise<Pdf[]> {
  const res = await fetch(`${API_BASE}/pdfs`)
  if (!res.ok) throw new Error('Failed to fetch PDFs')
  const data = await res.json()
  return Array.isArray(data) ? data : (data?.pdfs ?? [])
}

export async function deletePdf(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/pdfs/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete PDF')
}
