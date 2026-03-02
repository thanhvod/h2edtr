import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './app/reset.css'
import App from './app/app'
import { SharePage } from './pages/share-page'

// Block right-click (context menu)
document.addEventListener('contextmenu', (e) => e.preventDefault())

// Block two-finger zoom (trackpad pinch)
const preventPinchZoom = (e: WheelEvent) => {
  if (e.ctrlKey) e.preventDefault()
}
window.addEventListener('wheel', preventPinchZoom, { passive: false })

// Safari on macOS uses GestureEvent
const preventGesture = (e: Event) => e.preventDefault()
window.addEventListener('gesturestart', preventGesture)
window.addEventListener('gesturechange', preventGesture)
window.addEventListener('gestureend', preventGesture)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/share/:id" element={<SharePage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
)
