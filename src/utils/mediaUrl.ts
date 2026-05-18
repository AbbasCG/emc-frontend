/** Strip `/api` from configured API base URL to build absolute asset URLs (/storage/...). */
export function resolvePublicAssetUrl(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const s = String(raw).trim()
  if (s === '' || s === '—') return null
  if (/^https?:\/\//i.test(s)) return s
  const apiBaseRaw =
    (import.meta.env.VITE_PUBLIC_URL?.toString()?.trim?.() &&
      String(import.meta.env.VITE_PUBLIC_URL).trim()) ||
    (import.meta.env.VITE_APP_URL?.toString()?.trim?.() && String(import.meta.env.VITE_APP_URL).trim()) ||
    String(import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/?$/u, '')
  try {
    if (!apiBaseRaw) return s.startsWith('/') ? s : `/${s}`
    const normalized = /^https?:\/\//iu.test(apiBaseRaw) ? apiBaseRaw : `https://${apiBaseRaw}`
    const u = new URL(normalized.endsWith('/') ? normalized : `${normalized}/`)
    let root = `${u.origin}${u.pathname}`
    root = root.replace(/\/?api\/?$/iu, '').replace(/\/?$/u, '')
    const path = s.startsWith('/') ? s : `/${s}`
    return `${root}${path}`
  } catch {
    return s.startsWith('/') ? s : `/${s}`
  }
}
