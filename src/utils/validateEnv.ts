/**
 * Validates required environment variables at startup.
 * In production: renders an Arabic error page and throws if critical vars are missing.
 * In development: logs a warning and continues (so you can start without a full .env).
 */

const VALID_APP_ENVS = ['production', 'staging', 'development'] as const

export function validateEnv(): void {
  const missing: string[] = []
  const invalid: string[] = []

  // ── Required ────────────────────────────────────────────────────────────────
  if (!import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_BASE_URL) {
    missing.push('VITE_API_URL')
  }

  // ── Optional but validated when present ─────────────────────────────────────
  const appEnv = import.meta.env.VITE_APP_ENV as string | undefined
  if (appEnv && !VALID_APP_ENVS.includes(appEnv as (typeof VALID_APP_ENVS)[number])) {
    invalid.push(`VITE_APP_ENV="${appEnv}" (expected: ${VALID_APP_ENVS.join(' | ')})`)
  }

  if (missing.length === 0 && invalid.length === 0) return

  const lines: string[] = []
  if (missing.length) lines.push(`Missing: ${missing.join(', ')}`)
  if (invalid.length) lines.push(`Invalid: ${invalid.join('; ')}`)
 const msg = `[EMC] Environment configuration error ${lines.join(' · ')}. Check.env.`

  if (import.meta.env.DEV) {
    // In development only warn — don't block the dev server
    console.warn(msg)
    return
  }

  // In production: show a visible Arabic error page before throwing
  const root = document.getElementById('root')
  if (root) {
    root.innerHTML = `<div style="font-family:system-ui,sans-serif;padding:2rem;direction:rtl;text-align:right;background:#fef2f2;min-height:100vh">
      <div style="max-width:560px;margin:4rem auto;background:#fff;border-radius:12px;padding:2rem;box-shadow:0 4px 24px rgba(0,0,0,.08)">
        <h2 style="color:#c00;margin:0 0 1rem">خطأ في إعداد التطبيق</h2>
        <p style="color:#444;line-height:1.7">متغيرات البيئة المطلوبة غير صحيحة. يرجى مراجعة ملف <code style="background:#f5f5f5;padding:.1em .4em;border-radius:4px">.env</code> وإعادة البناء.</p>
        <pre style="background:#1e1e1e;color:#f87171;padding:1rem;border-radius:8px;font-size:.8rem;overflow:auto;margin-top:1.5rem;white-space:pre-wrap">${msg}</pre>
      </div>
    </div>`
  }
  throw new Error(msg)
}
