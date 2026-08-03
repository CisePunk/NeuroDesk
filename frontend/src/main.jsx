import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './auth/AuthContext'
import { ToastProvider } from './ui/ToastProvider'
import ErrorBoundary from './ui/ErrorBoundary'

// ErrorBoundary sta piu' in alto di tutto (router e provider compresi): cosi'
// nessun errore puo' lasciare l'utente davanti a una pagina bianca.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)

// Registrazione del service worker (guscio offline; /api mai in cache). Qui e non
// inline nell'HTML, così la CSP può vietare gli script inline.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {})
}
