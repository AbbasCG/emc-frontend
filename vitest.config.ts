import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html', 'json-summary'],
      // Count the whole app, not just the modules a test happened to import — otherwise
      // the percentage rises simply by deleting tests, which is the wrong incentive.
      all: true,
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/test/**',
        'src/**/*.d.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
        // Type-only and pure constant modules: no executable statements to cover.
        'src/types/**',
        'src/i18n/locales/**',
      ],
      // M4.c ratchet. Thresholds are set per-directory on the critical layers the
      // master plan names, a few points under the measured value so ordinary churn
      // does not trip them while a real regression does. There is deliberately NO
      // global threshold: app-wide coverage is 8% because ~30k of the 33.7k lines are
      // presentational dashboards, and those are M7's scope (plan §3, M7 "expanding
      // M4.c to the dashboards and API mappers"). Raise these as coverage grows.
      thresholds: {
        'src/utils/**': { lines: 40 },
        'src/lib/**': { lines: 65 },
        'src/contexts/**': { lines: 65 },
        'src/components/enrollment/**': { lines: 42 },
        'src/components/ui/**': { lines: 24 },
        'src/hooks/**': { lines: 18 },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
