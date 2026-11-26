import { EMC_DASHBOARD_ROLES, normalizeRole } from '@/utils/dashboardAccess'

const ROLE_LABEL_AR: Record<(typeof EMC_DASHBOARD_ROLES)[number], string> = {
  student: 'طالب',
  instructor: 'مدرب',
  admin: 'مشرف',
  super_admin: 'سوبر مشرف',
  tech_admin: 'مدير التقنية',
  executive_admin: 'مشرف تنفيذي',
  finance_manager: 'مدير مالي',
  quality_manager: 'مدير الجودة',
  hr_manager: 'مدير الموارد البشرية',
  partner: 'شريك',
  marketing_manager: 'مدير التسويق',
  support_agent: 'وكيل دعم',
  volunteer: 'متطوع',
  department_manager: 'مدير إدارة',
  department_member: 'عضو إدارة / فريق',
  programs_manager: 'مدير البرامج والمسارات',
  operations_manager: 'مدير العمليات والتشغيل',
  partnerships_manager: 'مدير الشراكات والعلاقات',
  community_manager: 'مدير الصحة النفسية والوعي',
  section_lead: 'قائد قسم',
  ai_manager: 'مدير الذكاء الاصطناعي',
  strategy_planning_manager: 'مدير الاستراتيجية والتخطيط المؤسسي',
  digital_ambassadors_manager: 'مدير سفراء التحول الرقمي',
  advisors_manager: 'مدير الاستشارات والمستشارين',
}

export const ASSIGNABLE_CANONICAL_ROLES = [
  'super_admin',
  'executive_admin',
  'admin',
  'tech_admin',
  'department_manager',
  'department_member',
  'instructor',
  'student',
  'volunteer',
  'partner',
  'support_agent',
] as const

/**
 * Roles that a department can NEVER confer. Choosing a department for a manager must not silently store a technical or
 * executive administrator role (the backend refuses the same mapping): those are assigned deliberately, as roles.
 */
export const DEPARTMENT_NEVER_GRANTS = ['super_admin', 'admin', 'tech_admin', 'executive_admin'] as const

export const ALL_SPECIALIZED_MANAGER_ROLES = [
  'hr_manager',
  'finance_manager',
  'programs_manager',
  'operations_manager',
  'marketing_manager',
  'partnerships_manager',
  'quality_manager',
  'community_manager',
  'ai_manager',
  'strategy_planning_manager',
  'digital_ambassadors_manager',
  'advisors_manager',
] as const

export function isSpecializedManagerRole(role?: string | null): boolean {
  if (!role) return false
  return (
    role === 'department_manager' ||
    (ALL_SPECIALIZED_MANAGER_ROLES as readonly string[]).includes(role)
  )
}

export const DEPARTMENT_SPECIALIZED_ROLES_MAP: Record<string, string> = {
  'human-resources': 'hr_manager',
  'finance': 'finance_manager',
  'programs-tracks': 'programs_manager',
  'operations': 'operations_manager',
  'marketing-media': 'marketing_manager',
  'partnerships': 'partnerships_manager',
  'quality-governance': 'quality_manager',
  'community-health': 'community_manager',
  'ai-digital-transformation': 'ai_manager',
  'ai-transformation': 'ai_manager',
  'strategy-planning': 'strategy_planning_manager',
  'digital-ambassadors': 'digital_ambassadors_manager',
  'advisors': 'advisors_manager',
}

export const DEPARTMENT_NAME_TO_SPECIALIZED_ROLE: Record<string, string> = {
  'إدارة الموارد البشرية': 'hr_manager',
  'إدارة الموارد البشرية والشؤون القانونية': 'hr_manager',
  'الإدارة المالية': 'finance_manager',
  'إدارة البرامج والمسارات': 'programs_manager',
  'إدارة التشغيل والعمليات': 'operations_manager',
  'إدارة العمليات والتشغيل': 'operations_manager',
  'إدارة الإعلام والتسويق': 'marketing_manager',
  'إدارة التسويق والإعلام': 'marketing_manager',
  'إدارة التسويق': 'marketing_manager',
  'إدارة الشراكات والعلاقات العامة': 'partnerships_manager',
  'إدارة الشراكات والعلاقات': 'partnerships_manager',
  'إدارة الشراكات': 'partnerships_manager',
  'إدارة الجودة والحوكمة': 'quality_manager',
  'إدارة الجودة': 'quality_manager',
  'إدارة المجتمع والصحة النفسية والوعي': 'community_manager',
  'إدارة المجتمع والصحة': 'community_manager',
  'إدارة الصحة النفسية والوعي': 'community_manager',
  'إدارة الذكاء الاصطناعي والتحول الرقمي': 'ai_manager',
  'إدارة الذكاء الاصطناعي': 'ai_manager',
  'إدارة الاستراتيجية والتخطيط المؤسسي': 'strategy_planning_manager',
  'إدارة سفراء التحول الرقمي': 'digital_ambassadors_manager',
  'إدارة الاستشارات والمستشارين': 'advisors_manager',
}

export function getSpecializedRoleForDepartment(
  dept?: { id?: number | string; slug?: string; name_ar?: string; name?: string } | string | null,
): { role: string; labelAr: string } | null {
  if (!dept) return null
  let roleSlug: string | null
  if (typeof dept === 'string') {
    const trimmed = dept.trim()
    roleSlug = DEPARTMENT_NAME_TO_SPECIALIZED_ROLE[trimmed] || DEPARTMENT_SPECIALIZED_ROLES_MAP[trimmed] || null
  } else {
    if (dept.slug && DEPARTMENT_SPECIALIZED_ROLES_MAP[dept.slug]) {
      roleSlug = DEPARTMENT_SPECIALIZED_ROLES_MAP[dept.slug]
    } else {
      const name = (dept.name_ar || dept.name || '').trim()
      roleSlug = DEPARTMENT_NAME_TO_SPECIALIZED_ROLE[name] || null
    }
  }
  if (!roleSlug || (DEPARTMENT_NEVER_GRANTS as readonly string[]).includes(roleSlug)) return null
  return {
    role: roleSlug,
    labelAr: ROLE_LABEL_AR[roleSlug as (typeof EMC_DASHBOARD_ROLES)[number]] ?? roleSlug,
  }
}

export type AssignableRoleOption = {
  value: string
  labelAr: string
  /** True when the server's role list lacks this role: shown, but it cannot be picked. */
  disabled?: boolean
  /** Short Arabic reason shown next to the label (e.g. the role is not activated in this environment). */
  hint?: string
}

/** Hint for a role the front end knows but the server's `roles` table does not have. */
export const ROLE_NOT_ACTIVATED_HINT = 'غير مفعّل في هذه البيئة'

/** Shown (non-blocking) when the activated-roles list could not be loaded, so the static catalogue is used. */
export const ROLES_LIST_UNAVAILABLE_NOTICE = 'تعذّر جلب قائمة الأدوار المفعّلة من الخادم؛ قد يرفض الخادم بعض الأدوار'

/** Role slugs the server accepts, or `null` while unknown / when the request failed (static catalogue applies). */
export type ServerRoleSlugs = ReadonlySet<string> | null | undefined

function isOfferedByServer(slug: string, serverRoles: ServerRoleSlugs): boolean {
  return !serverRoles || serverRoles.has(slug)
}

/**
 * Role options for the admin user forms.
 * - Starts from the front end's allowed set (ASSIGNABLE_CANONICAL_ROLES; super_admin only when `includeSuperAdmin`).
 * - With a server role list, a role the server does not know stays visible but disabled with a hint.
 * - `extraCurrentRole` (the role the edited user already has) is always present and never disabled, so an unrelated
 *   edit still shows it.
 */
export function getAssignableRoleOptions(
  includeSuperAdmin: boolean,
  extraCurrentRole?: string | null,
  serverRoles?: ServerRoleSlugs,
): AssignableRoleOption[] {
  const allowed = ASSIGNABLE_CANONICAL_ROLES.filter((r) => includeSuperAdmin || r !== 'super_admin') as string[]
  if (extraCurrentRole && !allowed.includes(extraCurrentRole)) {
    allowed.push(extraCurrentRole)
  }
  return allowed.map((value) => {
    const labelAr = ROLE_LABEL_AR[value as (typeof EMC_DASHBOARD_ROLES)[number]] ?? value
    if (isOfferedByServer(value, serverRoles)) return { value, labelAr }
    const isCurrent = value === extraCurrentRole
    return { value, labelAr, hint: ROLE_NOT_ACTIVATED_HINT, ...(isCurrent ? {} : { disabled: true }) }
  })
}

/** Text of one `<option>`: the Arabic label plus the hint when there is one. */
export function roleOptionText(o: AssignableRoleOption): string {
  return o.hint ? `${o.labelAr} — ${o.hint}` : o.labelAr
}

/**
 * The specialised manager role a department maps to, but only when the server's role list contains it; otherwise
 * `null`, so the caller keeps `department_manager` and can explain why via `unavailableSpecializedRole`.
 */
export function getOfferedSpecializedRole(
  dept: Parameters<typeof getSpecializedRoleForDepartment>[0],
  serverRoles?: ServerRoleSlugs,
): { role: string; labelAr: string } | null {
  const spec = getSpecializedRoleForDepartment(dept)
  return spec && isOfferedByServer(spec.role, serverRoles) ? spec : null
}

/** The mapped role of this department when the server does NOT have it (drives the «غير مفعّل» note). */
export function unavailableSpecializedRole(
  dept: Parameters<typeof getSpecializedRoleForDepartment>[0],
  serverRoles?: ServerRoleSlugs,
): { role: string; labelAr: string } | null {
  const spec = getSpecializedRoleForDepartment(dept)
  return spec && !isOfferedByServer(spec.role, serverRoles) ? spec : null
}

/** Entire EMC role catalogue for governance screens (readonly). */
export const SUPER_ADMIN_ROLE_CATALOG_ROWS = EMC_DASHBOARD_ROLES.map((slug) => ({
  slug,
  labelAr: ROLE_LABEL_AR[slug] ?? slug,
}))

export function adminRoleLabelAr(role: string | null | undefined): string {
  const n = normalizeRole(role ?? null)
  if (!n) return role && String(role).trim() ? String(role) : '—'
  return ROLE_LABEL_AR[n as (typeof EMC_DASHBOARD_ROLES)[number]] ?? n
}

/** A department as returned by `GET /departments/options`. */
export type DepartmentOption = { id: number; name_ar?: string; name?: string }

export const DEFAULT_EMC_DEPARTMENTS: { id: number; name_ar: string; name: string }[] = [
  { id: 1, name_ar: 'الإدارة العليا', name: 'الإدارة العليا' },
  { id: 2, name_ar: 'إدارة البرامج والمسارات', name: 'إدارة البرامج والمسارات' },
  { id: 3, name_ar: 'إدارة العمليات والتشغيل', name: 'إدارة العمليات والتشغيل' },
  { id: 4, name_ar: 'إدارة الإعلام والتسويق', name: 'إدارة الإعلام والتسويق' },
  { id: 5, name_ar: 'إدارة الشراكات والعلاقات العامة', name: 'إدارة الشراكات والعلاقات العامة' },
  { id: 6, name_ar: 'الإدارة المالية', name: 'الإدارة المالية' },
  { id: 7, name_ar: 'إدارة التقنية والدعم الفني', name: 'إدارة التقنية والدعم الفني' },
  { id: 8, name_ar: 'إدارة الموارد البشرية والشؤون القانونية', name: 'إدارة الموارد البشرية والشؤون القانونية' },
  { id: 9, name_ar: 'إدارة الصحة النفسية والوعي', name: 'إدارة الصحة النفسية والوعي' },
  { id: 10, name_ar: 'إدارة الجودة والحوكمة', name: 'إدارة الجودة والحوكمة' },
  { id: 11, name_ar: 'إدارة الاستراتيجية والتخطيط المؤسسي', name: 'إدارة الاستراتيجية والتخطيط المؤسسي' },
  { id: 12, name_ar: 'إدارة الذكاء الاصطناعي والتحول الرقمي', name: 'إدارة الذكاء الاصطناعي والتحول الرقمي' },
  { id: 13, name_ar: 'إدارة سفراء التحول الرقمي', name: 'إدارة سفراء التحول الرقمي' },
  { id: 14, name_ar: 'إدارة الاستشارات والمستشارين', name: 'إدارة الاستشارات والمستشارين' },
]
