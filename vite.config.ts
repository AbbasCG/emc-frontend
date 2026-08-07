import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { rmSync } from 'node:fs'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'

/**
 * Keep the local build byte-identical to the deployed one.
 *
 * `public/fonts/thmanyah/` holds the 3.6MB OTF master set. It is gitignored, so CI and
 * production never have it — but Vite copies `public/` verbatim, so on a developer
 * machine it landed in `dist/` and made every local measurement (Lighthouse, bundle
 * budget) describe a payload no user ever downloads. Nothing references these files
 * since the woff2 became the single provisioning layer, so drop them from the output.
 */
function dropLocalOnlyFonts() {
  return {
    name: 'emc-drop-local-only-fonts',
    apply: 'build' as const,
    closeBundle() {
      rmSync(path.resolve(__dirname, 'dist/fonts/thmanyah'), { recursive: true, force: true })
    },
  }
}

/**
 * Top-level package name for a module id, or `null` for first-party source.
 *
 * Matching on the path boundary rather than with `id.includes(...)` matters: a
 * substring rule like `id.includes('react/')` also catches `react-smooth` and friends,
 * which pulled recharts' dependency tree into the eagerly-preloaded react chunk and made
 * every visitor download the charting library on first paint.
 */
function packageOf(id: string): string | null {
  const m = /node_modules[\\/](?:\.pnpm[\\/])?((?:@[^\\/]+[\\/])?[^\\/]+)/.exec(id)
  return m ? m[1].replace(/\\/g, '/') : null
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    dropLocalOnlyFonts(),
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
          const pkg = packageOf(id)
          if (pkg === null) return undefined

          // Only the always-needed core is hand-chunked. Everything else returns
          // `undefined` so rolldown places it with the lazy route chunks that import
          // it — a manual name would instead pin it into one shared chunk that
          // index.html modulepreloads, making every visitor pay for it on first paint.
          if (pkg === 'react' || pkg === 'react-dom' || pkg === 'scheduler') return 'vendor-react'
          if (pkg === 'react-router') return 'vendor-router'
          if (pkg === 'framer-motion' || pkg === 'motion-dom' || pkg === 'motion-utils') {
            return 'vendor-motion'
          }
          if (pkg === 'axios') return 'vendor-http'

          return undefined
        },
      },
    },
  },
})
