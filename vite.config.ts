import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          // ── Core React runtime ──────────────────────────────────────────
          if (id.includes('react-dom') || id.includes('react/')) return 'vendor-react'
          if (id.includes('react-router')) return 'vendor-router'

          // ── UI / animation ──────────────────────────────────────────────
          if (id.includes('framer-motion')) return 'vendor-motion'
          if (id.includes('lucide-react')) return 'vendor-icons'

          // ── Network / state ─────────────────────────────────────────────
          if (id.includes('axios')) return 'vendor-http'
          if (id.includes('sonner')) return 'vendor-toast'

          // ── Heavy chart library — loaded only on dashboard/report pages ─
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory')) {
            return 'vendor-charts'
          }

          // ── PDF / office rendering ──────────────────────────────────────
          if (id.includes('pdfjs') || id.includes('pdf-lib') || id.includes('docx')) {
            return 'vendor-docs'
          }

          // ── DOMPurify (security, small — keep separate for caching) ────
          if (id.includes('dompurify')) return 'vendor-sanitize'

          // ── Sentry (optional, large — isolated chunk) ───────────────────
          if (id.includes('@sentry')) return 'vendor-sentry'

          // ── All other node_modules ──────────────────────────────────────
          return 'vendor'
        },
      },
    },
  },
})
