import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import './styles.css'

// Register service worker for PWA
import { registerSW } from 'virtual:pwa-register'

// autoUpdate: a new version installs and reloads the app by itself.
// Also check for updates whenever the app comes back to the foreground and every hour,
// so an installed app that stays open in the background still picks up new deploys.
registerSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    if (!registration) return
    const checkForUpdate = () => { if (navigator.onLine) registration.update() }
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForUpdate()
    })
    setInterval(checkForUpdate, 60 * 60 * 1000)
  },
  onOfflineReady() {
    console.log('App ready to work offline')
  },
})

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
