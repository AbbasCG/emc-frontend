/**
 * Central EMC dashboard authorization: namespace rules, redirects, helpers.
 * Compare using normalized role strings from the backend (see normalizeRole aliases).
 */

export const EMC_DASHBOARD_ROLES = [
  'student',
  'instructor',
  'admin',
  'super_admin',
  'tech_admin',
  'executive_admin',
  'finance_manager',
  'quality_manager',
  'hr_manager',
  'partner',
  'marketing_manager',
  'support_agent',
  'volunteer',
  'department_manager',
  'programs_manager',
  'operations_manager',
  'partnerships_manager',
  'community_manager',
  'section_lead',
] as const

export type EmcDashboardRole = (typeof EMC_DASHBOARD_ROLES)[number]

/** Legacy/API drift → canonical dashboard role slug */
const ROLE_ALIASES: Record<string, string> = {
  teacher:      'instructor',
  superadmin:   'super_admin',
  'super-admin':'super_admin',
  finance:      'finance_manager',
  hr:           'hr_manager',
  dept_manager: 'department_manager',
  'dept._manager': 'department_manager',
  departmentmanager: 'department_manager',
}

const ROLE_HOME: Record<string, string> = {
  super_admin: '/dashboard/super-admin',
  tech_admin: '/dashboard/tech-admin',
  admin: '/dashboard/admin',
  executive_admin: '/dashboard/executive',
  instructor: '/dashboard/instructor',
  student: '/dashboard/student',
  finance_manager: '/dashboard/finance',
  quality_manager: '/dashboard/quality',
  hr_manager: '/dashboard/hr',
  partner: '/dashboard/partner',
  marketing_manager: '/dashboard/marketing',
  support_agent: '/dashboard/support',
  volunteer: '/dashboard/ops/volunteers',
  department_manager: '/dashboard/department',
  programs_manager: '/dashboard/programs-manager',
  operations_manager: '/dashboard/operations-manager',
  partnerships_manager: '/dashboard/partnerships-manager',
  community_manager: '/dashboard/community-manager',
  section_lead: '/dashboard/section-lead',
}

/**
 * Sorted longest-prefix first — first match wins in getAllowedRolesForPath / canAccessDashboardPath.
 */
export const DASHBOARD_NAMESPACE_RULES: { prefix: string; roles: readonly string[] }[] = [
  { prefix: '/dashboard/super-admin', roles: ['super_admin'] },

  // ── Granular sub-path rules for new manager roles (longer = higher priority) ──
  // These must be defined before the generic /dashboard/admin rule so they win.
  { prefix: '/dashboard/admin/partnership-requests', roles: ['admin', 'super_admin', 'partnerships_manager'] },
  { prefix: '/dashboard/admin/volunteers',    roles: ['admin', 'super_admin', 'community_manager'] },
  { prefix: '/dashboard/admin/operations',    roles: ['admin', 'super_admin', 'operations_manager'] },
  { prefix: '/dashboard/admin/knowledge',     roles: ['admin', 'super_admin', 'programs_manager'] },
  { prefix: '/dashboard/admin/programs',      roles: ['admin', 'super_admin', 'programs_manager'] },
  { prefix: '/dashboard/admin/partners',      roles: ['admin', 'super_admin', 'partnerships_manager'] },
  { prefix: '/dashboard/admin/meetings',      roles: ['admin', 'super_admin', 'operations_manager', 'community_manager'] },
  { prefix: '/dashboard/admin/reports',       roles: ['admin', 'super_admin', 'programs_manager', 'operations_manager', 'partnerships_manager', 'community_manager'] },
  { prefix: '/dashboard/admin/tasks',         roles: ['admin', 'super_admin', 'operations_manager', 'community_manager'] },
  { prefix: '/dashboard/admin/forms',         roles: ['admin', 'super_admin', 'operations_manager', 'community_manager'] },
  { prefix: '/dashboard/admin/departments',   roles: ['admin', 'super_admin', 'operations_manager'] },
  { prefix: '/dashboard/admin/kpi',              roles: ['admin', 'super_admin', 'programs_manager', 'operations_manager'] },
  { prefix: '/dashboard/admin/lms',              roles: ['admin', 'super_admin', 'programs_manager'] },
  { prefix: '/dashboard/admin/registrations',    roles: ['admin', 'super_admin', 'tech_admin', 'programs_manager'] },

  // ── Generic namespace: admin/super_admin/tech_admin ──
  { prefix: '/dashboard/admin', roles: ['admin', 'super_admin', 'tech_admin'] },

  { prefix: '/dashboard/executive', roles: ['executive_admin'] },
  { prefix: '/dashboard/instructor', roles: ['instructor'] },
  { prefix: '/dashboard/student', roles: ['student'] },
  { prefix: '/dashboard/finance/program-approvals', roles: ['finance_manager', 'admin', 'super_admin', 'tech_admin'] },
  { prefix: '/dashboard/finance/chart-of-accounts', roles: ['finance_manager', 'admin', 'super_admin', 'tech_admin'] },
  { prefix: '/dashboard/finance', roles: ['finance_manager'] },
  { prefix: '/dashboard/quality', roles: ['quality_manager'] },
  { prefix: '/dashboard/hr', roles: ['hr_manager'] },
  { prefix: '/dashboard/partner', roles: ['partner'] },
  { prefix: '/dashboard/marketing', roles: ['marketing_manager'] },
  { prefix: '/dashboard/support', roles: ['support_agent'] },
  { prefix: '/dashboard/volunteer', roles: ['super_admin', 'tech_admin', 'admin', 'hr_manager'] },
  { prefix: '/dashboard/ops/volunteers', roles: ['volunteer'] },
  { prefix: '/dashboard/department', roles: ['department_manager'] },
  { prefix: '/dashboard/programs-manager', roles: ['programs_manager'] },
  { prefix: '/dashboard/operations-manager', roles: ['operations_manager'] },
  { prefix: '/dashboard/partnerships-manager', roles: ['partnerships_manager'] },
  { prefix: '/dashboard/community-manager', roles: ['community_manager'] },
  { prefix: '/dashboard/section-lead', roles: ['section_lead'] },
].sort((a, b) => b.prefix.length - a.prefix.length)

const STUDENT_EXTRA_PREFIXES = [
  '/dashboard/certificates',
  '/dashboard/learning',
  '/dashboard/courses/',
  '/dashboard/lessons/',
  '/dashboard/quizzes/',
]

const INSTRUCTOR_EXTRA_PREFIXES = ['/dashboard/resources']

/** Admin/super_admin “wide” shortcuts (sidebar) — not under /dashboard/admin/. */
const ADMIN_WIDE_EXACT = new Set([
  '/dashboard/courses',
  '/dashboard/programs',
  '/dashboard/students',
  '/dashboard/registrations',
  '/dashboard/schedule',
  '/dashboard/assessments',
  '/dashboard/users',
  '/dashboard/reports',
])

function matchesAdminWidePath(pathname: string): boolean {
  return ADMIN_WIDE_EXACT.has(pathname)
}

/** Calendar / files / AI — any logged-in dashboard user */
const GLOBAL_APP_PREFIXES = ['/documents', '/calendar', '/ai']

function matchesAnyPrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(p.endsWith('/') ? p : `${p}/`),
  )
}

export function normalizeRole(role?: string | null): string | null {
  if (role == null) return null
  const t = String(role).trim().toLowerCase().replace(/\s+/g, '_')
  if (t === '') return null
  return ROLE_ALIASES[t] ?? t
}

export function getDashboardPathByRole(role?: string | null): string {
  const n = normalizeRole(role)
  if (!n) return '/dashboard/profile'
  return ROLE_HOME[n] ?? '/dashboard/profile'
}

/**
 * Returns which roles may access a pathname, or a sentinel for non-role-specific access.
 */
export function getAllowedRolesForPath(pathname: string): string[] | 'authenticated' {
  const path = pathname

  if (
    GLOBAL_APP_PREFIXES.some(
      (p) => path === p || path.startsWith(p.endsWith('/') ? p : `${p}/`),
    )
  )
    return 'authenticated'

  if (!(path.startsWith('/dashboard') || path === '/dashboard'))
    return 'authenticated'

  if (
    path === '/dashboard/profile' ||
    path.startsWith('/dashboard/profile/')
  )
    return 'authenticated'

  if (path === '/dashboard/notifications' || path.startsWith('/dashboard/notifications/'))
    return 'authenticated'

  if (path === '/dashboard/settings' || path.startsWith('/dashboard/settings/'))
    return 'authenticated'

  if (path === '/dashboard') return 'authenticated'

  if (path === '/dashboard/teacher' || path.startsWith('/dashboard/teacher/')) {
    return ['instructor']
  }

  /* Financial requests — any authenticated user who is a department leader may access this page.
     Backend enforces is_leader=true; frontend just needs to not block it. */
  if (
    path === '/dashboard/department/financial-requests' ||
    path.startsWith('/dashboard/department/financial-requests/')
  ) {
    return 'authenticated'
  }

  /* HR requests — any authenticated user who is a department leader may access this page. */
  if (
    path === '/dashboard/department/hr-requests' ||
    path.startsWith('/dashboard/department/hr-requests/')
  ) {
    return 'authenticated'
  }

  /* Workshop requests — must be checked BEFORE generic namespace rules to override /dashboard/admin prefix */
  if (
    path === '/dashboard/admin/workshop-requests' ||
    path.startsWith('/dashboard/admin/workshop-requests/')
  ) {
    return ['admin', 'super_admin', 'tech_admin', 'executive_admin', 'department_manager',
            'quality_manager', 'finance_manager', 'marketing_manager', 'hr_manager', 'support_agent',
            'programs_manager', 'operations_manager', 'partnerships_manager', 'community_manager']
  }

  for (const rule of DASHBOARD_NAMESPACE_RULES) {
    if (path === rule.prefix || path.startsWith(`${rule.prefix}/`)) return [...rule.roles]
  }

  if (matchesAdminWidePath(path)) return ['admin', 'super_admin']

  /* /dashboard/members — all authenticated users can view the team directory */
  if (path === '/dashboard/members' || path.startsWith('/dashboard/members/'))
    return 'authenticated'

  /* Course content management is admin/instructor, NOT student — check before student prefix */
  if (/^\/dashboard\/courses\/[^/]+\/content(\/|$)/.test(path))
    return ['admin', 'super_admin', 'tech_admin', 'instructor', 'programs_manager']

  /* Student LMS paths (/dashboard/courses/:id/modules, lessons, quizzes, …) */
  if (matchesAnyPrefix(path, STUDENT_EXTRA_PREFIXES)) return ['student']

  if (matchesAnyPrefix(path, INSTRUCTOR_EXTRA_PREFIXES)) return ['instructor']

  return []
}

export function canAccessDashboardPath(roleRaw: string | null | undefined, pathname: string): boolean {
  const role = normalizeRole(roleRaw ?? null)
  /** Highest privilege: unrestricted access to the entire dashboard namespace */
  if ((role === 'super_admin' || role === 'tech_admin') && (pathname === '/dashboard' || pathname.startsWith('/dashboard/'))) return true

  const allowed = getAllowedRolesForPath(pathname)

  if (allowed === 'authenticated') return Boolean(role)

  if (allowed.length === 0) return false

  if (!role) return false

  return allowed.includes(role)
}

export function getPostLoginRedirect(
  rolePayload: unknown,
  preferredPath: string | null | undefined,
): string {
  let roleStr: string | null = null
  if (typeof rolePayload === 'string') roleStr = rolePayload
  else if (rolePayload && typeof rolePayload === 'object' && 'role' in rolePayload) {
    const r = (rolePayload as { role?: unknown }).role
    roleStr = r != null ? String(r) : null
  }
  const normalized = normalizeRole(roleStr)

  const home = getDashboardPathByRole(normalized)
  const safePreferred = preferredPath?.trim()

  if (safePreferred && canAccessDashboardPath(normalized, safePreferred)) return safePreferred

  return home
}
