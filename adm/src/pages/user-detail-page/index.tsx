import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import type { UserDetail } from '@/lib/admin-api'
import { fetchUserDetail } from '@/lib/admin-api'

function formatDate(value: string | Date | null | undefined): string {
  if (value == null) return '-'
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('en-US')
}

function formatSize(bytes: number | null) {
  if (bytes == null) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    const userId = id
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchUserDetail(userId)
        if (!cancelled) setUser(data)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id])

  if (!id) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/users')} sx={{ mb: 2 }}>
          Back
        </Button>
        <Alert severity="error">Invalid user ID</Alert>
      </Box>
    )
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error || !user) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/users')} sx={{ mb: 2 }}>
          Back
        </Button>
        <Alert severity="error">{error ?? 'User not found'}</Alert>
      </Box>
    )
  }

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/users')} sx={{ mb: 3 }}>
        Back
      </Button>

      <Typography variant="h5" fontWeight={600} sx={{ mb: 3 }}>
        User Detail
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle2" color="text.secondary">
          ID
        </Typography>
        <Typography sx={{ fontFamily: 'monospace', mb: 2 }}>{user.id}</Typography>

        <Typography variant="subtitle2" color="text.secondary">
          Device ID
        </Typography>
        <Typography sx={{ fontFamily: 'monospace', mb: 2 }}>{user.deviceId}</Typography>

        <Typography variant="subtitle2" color="text.secondary">
          Created At
        </Typography>
        <Typography sx={{ mb: 2 }}>{formatDate(user.createdAt)}</Typography>
      </Paper>

      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
        PDFs ({user.pdfs.length})
      </Typography>

      <Paper sx={{ overflow: 'hidden' }}>
        {user.pdfs.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
            No PDFs yet
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell sx={{ width: 64 }}>Thumbnail</TableCell>
                  <TableCell>Filename</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>Pages</TableCell>
                  <TableCell>Created At</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {user.pdfs.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell sx={{ width: 64, py: 1 }}>
                      {p.thumbnailUrl ? (
                        <Box
                          component="img"
                          src={p.thumbnailUrl}
                          alt=""
                          sx={{
                            width: 48,
                            height: 48,
                            objectFit: 'cover',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            bgcolor: 'grey.200',
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            —
                          </Typography>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200 }} title={p.filename}>
                      <Typography noWrap>{p.filename}</Typography>
                    </TableCell>
                    <TableCell title={p.fileSize == null ? 'Not saved (new upload)' : undefined}>
                      {formatSize(p.fileSize)}
                    </TableCell>
                    <TableCell>{p.numPages ?? '-'}</TableCell>
                    <TableCell>{formatDate(p.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  )
}
