import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    ViteImageOptimizer({
      png: { quality: 82 },
      jpeg: { quality: 82 },
      jpg: { quality: 82 },
      webp: { lossless: false, quality: 82 },
      includePublic: true,
      logStats: true,
    }),
  ],
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

          if (id.includes('react-dom') || id.includes('react/')) return 'vendor-react'
          if (id.includes('react-router')) return 'vendor-router'
          if (id.includes('framer-motion')) return 'vendor-motion'
          if (id.includes('lucide-react')) return 'vendor-icons'
          if (id.includes('axios')) return 'vendor-http'
          if (id.includes('sonner')) return 'vendor-toast'
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory')) return 'vendor-charts'
          if (id.includes('pdfjs') || id.includes('pdf-lib') || id.includes('docx')) return 'vendor-docs'
          if (id.includes('dompurify')) return 'vendor-sanitize'
          if (id.includes('@sentry')) return 'vendor-sentry'

          return 'vendor'
        },
      },
    },
  },
})
