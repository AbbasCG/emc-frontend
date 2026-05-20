/**
 * Normalize backend `action_url` / links into SPA routes that exist in `App.tsx`.
 */

function stripTrailingSlashes(p: string): string {
  const x = p.replace(/\/+$/u, '')
  return x === '' ? '/' : x
}

function sameSiteHostname(hostname: string): boolean {
  if (typeof window === 'undefined') return true
  const h = hostname.toLowerCase()
  const cur = window.location.hostname.toLowerCase()
  if (h === cur) return true
  if (cur === 'localhost' && (h === '127.0.0.1' || h === 'localhost')) return true
  return false
}

/**
 * Rewrite legacy paths (`/student/...`) → `/dashboard/...`, strip unsupported registration IDs,
 * reject `/api` and external URLs. Safe fallback: مركز الإشعارات.
 */
export function normalizeNotificationInternalPath(rawPath: string): string {
  const trimmed = rawPath.trim()
  if (!trimmed) return '/dashboard/notifications'

  let path = trimmed

  if (/^https?:\/\//iu.test(path)) {
    try {
      const u = new URL(path)
      if (!sameSiteHostname(u.hostname)) {
        return '/dashboard/notifications'
      }
      path = `${u.pathname}${u.search}`
    } catch {
      return '/dashboard/notifications'
    }
  }

  if (!path.startsWith('/')) {
    return '/dashboard/notifications'
  }

  const qIndex = path.indexOf('?')
  const search = qIndex >= 0 ? path.slice(qIndex) : ''
  let pathname = stripTrailingSlashes(qIndex >= 0 ? path.slice(0, qIndex) : path)

  if (pathname.startsWith('/api')) {
    return '/dashboard/notifications'
  }

  /** Explicit backend routes → dashboard */
  const table: Array<[RegExp, string]> = [
    [/^\/student\/registrations(?:\/\d+)?$/u, '/dashboard/student/registrations'],
    [/^\/student\/courses(?:\/[\w.-]*)?$/u, '/dashboard/student/courses'],
    [/^\/student\/available-courses$/u, '/dashboard/student/available-courses'],
    [/^\/instructor\/courses(?:\/[\w.-]*)?$/u, '/dashboard/instructor/courses'],
    [/^\/admin\/registrations(?:\/\d+)?$/u, '/dashboard/super-admin/crud/registrations'],
    [
      /^\/super-admin\/crud\/registrations(?:\/\d+)?$/u,
      '/dashboard/super-admin/crud/registrations',
    ],
  ]

  let mapped = false
  for (const [re, dest] of table) {
    if (re.test(pathname)) {
      pathname = dest
      mapped = true
      break
    }
  }

  if (!mapped) {
    if (pathname.startsWith('/student/') || pathname === '/student') {
      pathname = '/dashboard/student' + pathname.slice('/student'.length)
    } else if (pathname.startsWith('/instructor/') || pathname === '/instructor') {
      pathname = '/dashboard/instructor' + pathname.slice('/instructor'.length)
    }
  }

  /** No dedicated registration detail pages — keep users on list views */
  pathname = pathname.replace(/\/registrations\/\d+$/u, '/registrations')

  const allowed =
    pathname.startsWith('/dashboard/') ||
    pathname === '/dashboard' ||
    pathname.startsWith('/courses/') ||
    pathname === '/courses'

  if (!allowed) {
    return '/dashboard/notifications'
  }

  return stripTrailingSlashes(pathname) + search
}
