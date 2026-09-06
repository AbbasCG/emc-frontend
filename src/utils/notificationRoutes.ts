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
  const table: Array<[RegExp, string | ((m: RegExpExecArray) => string)]> = [
    [/^\/dashboard\/student\/certificates$/u, '/dashboard/certificates'],
    [/^\/student\/certificates$/u, '/dashboard/certificates'],
    [/^\/dashboard\/student\/attendance$/u, '/dashboard/student/attendance'],
    [/^\/student\/attendance$/u, '/dashboard/student/attendance'],
    [
      /^\/dashboard\/student\/assignments\/(\d+)$/u,
      (m) => `/dashboard/student/assignments?submission=${m[1]}`,
    ],
    [
      /^\/dashboard\/instructor\/submissions\/(\d+)$/u,
      (m) => `/dashboard/instructor/submissions?submission=${m[1]}`,
    ],
    [/^\/student\/registrations(?:\/\d+)?$/u, '/dashboard/student/registrations'],
    [/^\/student\/courses(?:\/[\w.-]*)?$/u, '/dashboard/student/courses'],
    [/^\/student\/available-courses$/u, '/dashboard/student/available-courses'],
    [/^\/instructor\/courses(?:\/[\w.-]*)?$/u, '/dashboard/instructor/courses'],
    [
      /^\/instructor\/courses\/(\d+)\/placement-students$/u,
      (m) => `/dashboard/instructor/courses/${m[1]}/placement-students`,
    ],
    [/^\/instructor\/oral-assessments$/u, '/dashboard/instructor/oral-assessments'],
    [/^\/instructor\/availability$/u, '/dashboard/instructor/availability'],
    [/^\/dashboard\/instructor\/oral-assessments$/u, '/dashboard/instructor/oral-assessments'],
    [/^\/dashboard\/instructor\/availability$/u, '/dashboard/instructor/availability'],
    [/^\/admin\/registrations(?:\/\d+)?$/u, '/dashboard/super-admin/crud/registrations'],
    [
      /^\/super-admin\/crud\/registrations(?:\/\d+)?$/u,
      '/dashboard/super-admin/crud/registrations',
    ],
    [
      /^\/admin\/volunteer-requests(?:\/(\d+))?$/u,
      (m) => m[1] ? `/dashboard/super-admin/volunteer-requests/${m[1]}` : '/dashboard/super-admin/volunteer-requests',
    ],
    [
      /^\/volunteer-requests(?:\/(\d+))?$/u,
      (m) => m[1] ? `/dashboard/super-admin/volunteer-requests/${m[1]}` : '/dashboard/super-admin/volunteer-requests',
    ],
  ]

  let mapped = false
  for (const [re, dest] of table) {
    const m = re.exec(pathname)
    if (m) {
      pathname = typeof dest === 'function' ? dest(m) : dest
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
