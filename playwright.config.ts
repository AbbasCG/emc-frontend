import { defineConfig } from '@playwright/test'

/**
 * M1.5 — E2E safety harness (serverless).
 *
 * The Laravel API is NEVER required: every /api request is intercepted and
 * fulfilled from fixtures (see e2e/support/mocks.ts). Tests run against the
 * production build served by `vite preview`:
 *
 *   npm run build          # once, so dist/ is fresh
 *   npx playwright test    # starts preview on :4173 automatically
 *
 * NOTE: the app bakes VITE_API_URL (http://127.0.0.1:8000/api) into the build;
 * the mocks intercept that absolute origin as well as any same-origin /api path.
 */
export default defineConfig({
  testDir: './e2e',
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],

  timeout: 60_000,
  expect: { timeout: 15_000 },

  use: {
    baseURL: 'http://localhost:4173',
    locale: 'ar',
    timezoneId: 'Europe/Amsterdam',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'desktop',
      use: {
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'mobile',
      use: {
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],

  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
