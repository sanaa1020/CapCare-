import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Fade out the static pre-boot loader (index.html) once React has painted its
// first frame, so reopening the app shows the mushroom loader instead of a
// blank screen while the bundle loads, then hands off to it seamlessly.
requestAnimationFrame(() => requestAnimationFrame(() => {
  const pre = document.getElementById('preloader')
  if (!pre) return
  pre.style.opacity = '0'
  setTimeout(() => pre.remove(), 300)
}))
