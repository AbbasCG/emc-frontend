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
      // M7.A ratchet (raised from the M4.c values). Thresholds are set per-directory on
      // the "logical scope" the founder fixed for M7 (plan v2.1): the critical core M4
      // named, plus src/api/**, src/utils/** and src/hooks/**. Each sits a few points
      // under the measured value so ordinary churn does not trip them while a real
      // regression does.
      //
      // There is deliberately NO global threshold. App-wide line coverage is 22%: ~27k of
      // the 35.6k executable lines are presentational dashboard pages, which plan v2.1
      // excludes from the unit-coverage scope (they are covered behaviourally by the E2E
      // album). See docs/03-changes/M7-report.md for the honest app-wide figure and why
      // `npm run coverage:truth` is needed to measure it.
      thresholds: {
        'src/api/**': { lines: 78 },
        'src/utils/**': { lines: 48 },
        'src/hooks/**': { lines: 42 },
        'src/lib/**': { lines: 70 },
        'src/contexts/**': { lines: 68 },
        'src/components/enrollment/**': { lines: 44 },
        'src/components/ui/**': { lines: 50 },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
