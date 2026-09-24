import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { MotionConfig } from 'framer-motion'
import './index.css'
// M3: initialize i18next (side effect) BEFORE the React tree renders.
import './i18n'
import { LanguageProvider } from './i18n/LanguageProvider'
import App from './App.tsx'
import { validateEnv } from './utils/validateEnv'
import { initSentry } from './utils/sentry'

validateEnv()
initSentry()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      {/* UX-0: respect the OS "reduce motion" setting globally for all framer-motion animations. */}
      <MotionConfig reducedMotion="user">
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </MotionConfig>
    </HelmetProvider>
  </StrictMode>,
)
