/**
 * Sentry is optional — only initializes when VITE_SENTRY_DSN is set.
 * Install: npm install @sentry/react
 * Then set VITE_SENTRY_DSN in .env
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
  if (!dsn) return

  // Use a variable so tsc doesn't try to resolve '@sentry/react' as a static import.
  // The chunk is only downloaded at runtime when DSN is present.
  const pkg = '@sentry/react'
  import(/* @vite-ignore */ pkg)
    .then((Sentry: Record<string, unknown>) => {
      const integrations: unknown[] = []
      if (typeof Sentry['browserTracingIntegration'] === 'function') {
        integrations.push((Sentry['browserTracingIntegration'] as () => unknown)())
      }
      if (typeof Sentry['replayIntegration'] === 'function') {
        integrations.push((Sentry['replayIntegration'] as () => unknown)())
      }
      ;(Sentry['init'] as (opts: Record<string, unknown>) => void)({
        dsn,
        environment: (import.meta.env.VITE_APP_ENV as string | undefined) ?? import.meta.env.MODE,
        integrations,
        tracesSampleRate: 0.1,
        replaysSessionSampleRate: 0.05,
        replaysOnErrorSampleRate: 1.0,
      })
    })
    .catch(() => { /* @sentry/react not installed — silent skip */ })
}
