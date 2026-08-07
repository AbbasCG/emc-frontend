/**
 * M7.D — Sentry readiness behind a non-blocking gate: initializes ONLY when
 * VITE_SENTRY_DSN is set (founder provides the DSN; nothing breaks without it).
 * The real dynamic import lets Vite split @sentry/react into its own lazy
 * chunk — zero cost to the initial bundle when the DSN is absent.
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
  if (!dsn) return

  import('@sentry/react')
    .then((Sentry) => {
      Sentry.init({
        dsn,
        environment: (import.meta.env.VITE_APP_ENV as string | undefined) ?? import.meta.env.MODE,
        integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
        tracesSampleRate: 0.1,
        replaysSessionSampleRate: 0.05,
        replaysOnErrorSampleRate: 1.0,
      })
    })
    .catch(() => { /* monitoring must never take the app down — silent skip */ })
}
