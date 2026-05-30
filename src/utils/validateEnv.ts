/**
 * Validates required environment variables at startup.
 * Throws in production if critical vars are missing so the build fails loudly
 * rather than silently serving a broken app.
 */
export function validateEnv(): void {
  if (import.meta.env.DEV) return

  const missing: string[] = []

  if (!import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_BASE_URL) {
    missing.push('VITE_API_URL')
  }

  if (missing.length > 0) {
    const msg = `[EMC] Missing required env vars: ${missing.join(', ')}. Add them to your .env file.`
    // Render a visible error in the page root before throwing
    const root = document.getElementById('root')
    if (root) {
      root.innerHTML = `<div style="font-family:sans-serif;padding:2rem;direction:rtl;text-align:right">
        <h2 style="color:#c00">خطأ في الإعداد</h2>
        <p>متغيرات البيئة المطلوبة غير موجودة. يرجى مراجعة ملف <code>.env</code>.</p>
        <pre style="background:#111;color:#f99;padding:1rem;border-radius:8px">${msg}</pre>
      </div>`
    }
    throw new Error(msg)
  }
}
