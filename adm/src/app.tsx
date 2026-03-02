import { Routes, Route, Navigate } from 'react-router-dom'
import { AdminLayout } from '@/components'
import { UsersPage, UserDetailPage, PdfsPage } from '@/pages'

function App() {
  return (
    <Routes>
      <Route path="/" element={<AdminLayout />}>
        <Route index element={<Navigate to="/users" replace />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="users/:id" element={<UserDetailPage />} />
        <Route path="pdfs" element={<PdfsPage />} />
      </Route>
    </Routes>
  )
}

export default App
