import apiClient from './axios'
import { unwrapData } from './unwrap'
import type { PageAccessCategoryKey, PageAccessRiskLevel } from './pageAccessCatalogApi'

/**
 * EMC Access Control — typed clients for the Phase 2A–2D backend.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * PAGE ACCESS != BUSINESS AUTHORIZATION
 * ─────────────────────────────────────────────────────────────────────────
 * Everything here configures or reports which dashboard PAGES a role,
 * department or user may open. None of it grants a business capability:
 * creating, editing, approving or deleting anything on those pages still runs
 * through Laravel permissions / policies / Gates / DepartmentAccessService,
 * which this module never touches.
 *
 * This module is MANAGEMENT ONLY. It does not gate any route, sidebar item or
 * guard — production navigation still runs on dashboardAccess.ts, untouched.
 * The eligibility/authority rules all live in the backend; the frontend only
 * renders what the backend says is eligible and lets the backend reject the
 * rest. No rule is re-derived here.
 *
 * Grouped in one module (rather than four) because these four endpoints are a
 * single domain that the Access Control UI always consumes together — matching
 * how adminUsersApi.ts / rolesPermissionsApi.ts group a domain per file.
 * The Phase 1 catalog client stays in its own committed module.
 */

const silent = { skipErrorToast: true as const }

/* ── Shared shapes ─────────────────────────────────────────────────────── */

/** Light catalog metadata the Phase 2A/2B/2C endpoints inline so the UI needs no second catalog call. */
export type EligiblePageEntry = {
  key: string
  labelAr: string
  category: PageAccessCategoryKey
  categoryLabelAr: string
  riskLevel: PageAccessRiskLevel
  /** Present on role/department payloads. */
  departmentScoped: boolean
  /** Present on the user-override payload only; false elsewhere. */
  delegatable: boolean
}

function str(v: unknown): string {
  return v == null ? '' : String(v).trim()
}

function bool(v: unknown): boolean {
  return v === true
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function asStringList(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.map((x) => str(x)).filter(Boolean)
}

const RISK_LEVELS: readonly PageAccessRiskLevel[] = ['SAFE_DELEGATABLE', 'ADMIN_ONLY', 'SYSTEM_PROTECTED']

function asRiskLevel(v: unknown): PageAccessRiskLevel {
  const s = str(v)
  return (RISK_LEVELS as readonly string[]).includes(s) ? (s as PageAccessRiskLevel) : 'ADMIN_ONLY'
}

function eligibleFromUnknown(raw: unknown): EligiblePageEntry | null {
  const o = asRecord(raw)
  if (!o) return null
  const key = str(o.key)
  if (!key) return null
  return {
    key,
    labelAr: str(o.label_ar),
    category: str(o.category) as PageAccessCategoryKey,
    categoryLabelAr: str(o.category_label_ar),
    riskLevel: asRiskLevel(o.risk_level),
    departmentScoped: bool(o.department_scoped),
    delegatable: bool(o.delegatable),
  }
}

function eligibleList(raw: unknown): EligiblePageEntry[] {
  if (!Array.isArray(raw)) return []
  return raw.map(eligibleFromUnknown).filter((e): e is EligiblePageEntry => e != null)
}

/* ── Phase 2B — Role default page access ───────────────────────────────── */

export type RolePageAccess = {
  role: { id: number; name: string; displayName: string; isSystem: boolean }
  /** Catalog keys currently stored as this role's defaults. */
  pageDefaults: string[]
  /** Pages that MAY be a role default (backend rule: everything not SYSTEM_PROTECTED). */
  eligible: EligiblePageEntry[]
}

function normalizeRolePageAccess(payload: unknown): RolePageAccess {
  const d = asRecord(unwrapData<unknown>(payload)) ?? {}
  const role = asRecord(d.role) ?? {}
  return {
    role: {
      id: Number(role.id ?? 0),
      name: str(role.name),
      displayName: str(role.display_name),
      isSystem: bool(role.is_system),
    },
    pageDefaults: asStringList(d.page_defaults),
    eligible: eligibleList(d.eligible),
  }
}

/** GET /admin/roles/{role}/page-access */
export async function fetchRolePageAccess(roleId: number | string): Promise<RolePageAccess> {
  const res = await apiClient.get<unknown>(`/admin/roles/${roleId}/page-access`, silent)
  return normalizeRolePageAccess(res.data)
}

/**
 * PUT /admin/roles/{role}/page-access — atomic full replace.
 *
 * Role defaults are POSITIVE ONLY: there is no role-level DENY, so "disable"
 * means omitting the key from this array, never sending a negative state.
 */
export async function saveRolePageAccess(roleId: number | string, pageDefaults: string[]): Promise<string[]> {
  const res = await apiClient.put<unknown>(
    `/admin/roles/${roleId}/page-access`,
    { page_defaults: pageDefaults },
    silent,
  )
  const d = asRecord(unwrapData<unknown>(res.data)) ?? {}
  return asStringList(d.page_defaults)
}

/* ── Phase 2A — Department default page access ─────────────────────────── */

export type DepartmentPageAccess = {
  department: { id: number; name: string; status: string }
  /** Defaults every member of the department receives. */
  memberDefaults: string[]
  /** ADDITIONAL defaults the canonical leader receives ON TOP of memberDefaults — never a replacement. */
  leaderDefaults: string[]
  eligible: { member: EligiblePageEntry[]; leader: EligiblePageEntry[] }
}

function normalizeDepartmentPageAccess(payload: unknown): DepartmentPageAccess {
  const d = asRecord(unwrapData<unknown>(payload)) ?? {}
  const dept = asRecord(d.department) ?? {}
  const eligible = asRecord(d.eligible) ?? {}
  return {
    department: {
      id: Number(dept.id ?? 0),
      name: str(dept.name),
      status: str(dept.status),
    },
    memberDefaults: asStringList(d.member_defaults),
    leaderDefaults: asStringList(d.leader_defaults),
    eligible: {
      member: eligibleList(eligible.member),
      leader: eligibleList(eligible.leader),
    },
  }
}

/** GET /admin/departments/{department}/page-access */
export async function fetchDepartmentPageAccess(departmentId: number | string): Promise<DepartmentPageAccess> {
  const res = await apiClient.get<unknown>(`/admin/departments/${departmentId}/page-access`, silent)
  return normalizeDepartmentPageAccess(res.data)
}

/**
 * PUT /admin/departments/{department}/page-access — atomic full replace of BOTH
 * audiences in one request, so a category bulk action is never a burst of
 * per-page calls and can never leave a half-applied set behind.
 */
export async function saveDepartmentPageAccess(
  departmentId: number | string,
  memberDefaults: string[],
  leaderDefaults: string[],
): Promise<{ memberDefaults: string[]; leaderDefaults: string[] }> {
  const res = await apiClient.put<unknown>(
    `/admin/departments/${departmentId}/page-access`,
    { member_defaults: memberDefaults, leader_defaults: leaderDefaults },
    silent,
  )
  const d = asRecord(unwrapData<unknown>(res.data)) ?? {}
  return {
    memberDefaults: asStringList(d.member_defaults),
    leaderDefaults: asStringList(d.leader_defaults),
  }
}

/* ── Phase 2C — User page access overrides ─────────────────────────────── */

/**
 * The stored states. There is deliberately NO 'default' member: DEFAULT is the
 * ABSENCE of a row, so resetting a page means omitting it from both arrays on
 * save — never sending a 'default' string the backend would reject.
 */
export type UserPageAccessState = 'allow' | 'deny'

export type UserPageAccessOverrides = {
  user: { id: number; name: string; email: string; role: string }
  /** page key -> 'allow' | 'deny'. A key ABSENT from this map is DEFAULT (inherits role/department). */
  overrides: Record<string, UserPageAccessState>
  /** The subset of pages THIS actor may set for THIS user — actor-scoped by the backend. */
  grantable: EligiblePageEntry[]
}

function normalizeOverrideMap(raw: unknown): Record<string, UserPageAccessState> {
  const o = asRecord(raw)
  if (!o) return {}
  const out: Record<string, UserPageAccessState> = {}
  for (const [key, value] of Object.entries(o)) {
    const v = str(value)
    if (v === 'allow' || v === 'deny') out[key] = v
  }
  return out
}

function normalizeUserOverrides(payload: unknown): UserPageAccessOverrides {
  const d = asRecord(unwrapData<unknown>(payload)) ?? {}
  const user = asRecord(d.user) ?? {}
  return {
    user: {
      id: Number(user.id ?? 0),
      name: str(user.name),
      email: str(user.email),
      role: str(user.role),
    },
    overrides: normalizeOverrideMap(d.overrides),
    grantable: eligibleList(d.grantable),
  }
}

/** GET /admin/users/{user}/page-access-overrides */
export async function fetchUserPageAccessOverrides(userId: number | string): Promise<UserPageAccessOverrides> {
  const res = await apiClient.get<unknown>(`/admin/users/${userId}/page-access-overrides`, silent)
  return normalizeUserOverrides(res.data)
}

/**
 * PUT /admin/users/{user}/page-access-overrides — atomic full replace.
 *
 * Any page omitted from BOTH arrays is reset to DEFAULT (its row is deleted by
 * the backend). That is what makes "reset all" expressible in one request.
 */
export async function saveUserPageAccessOverrides(
  userId: number | string,
  allow: string[],
  deny: string[],
): Promise<Record<string, UserPageAccessState>> {
  const res = await apiClient.put<unknown>(
    `/admin/users/${userId}/page-access-overrides`,
    { allow, deny },
    silent,
  )
  const d = asRecord(unwrapData<unknown>(res.data)) ?? {}
  return normalizeOverrideMap(d.overrides)
}

/** Split an editor's state map into the two arrays the backend expects. DEFAULT entries are simply dropped. */
export function splitOverrideStates(
  states: Record<string, UserPageAccessState | 'default'>,
): { allow: string[]; deny: string[] } {
  const allow: string[] = []
  const deny: string[] = []
  for (const [key, state] of Object.entries(states)) {
    if (state === 'allow') allow.push(key)
    else if (state === 'deny') deny.push(key)
    // 'default' is intentionally NOT sent — absence of a row IS the default.
  }
  return { allow, deny }
}

/* ── Phase 2D — Effective page access (read-only) ──────────────────────── */

/** Which layer decided a page — mirrors the backend PageAccessSource enum exactly. */
export type PageAccessSource =
  | 'root_authority'
  | 'system_protected'
  | 'user_deny'
  | 'user_allow'
  | 'department_leader'
  | 'department_member'
  | 'role'
  | 'none'

export type EffectivePageAccessRow = {
  key: string
  allowed: boolean
  /** The single deciding layer. Deterministic — never computed in the frontend. */
  primarySource: PageAccessSource
  /** Backend-supplied Arabic label for primarySource. The UI never invents provenance wording. */
  primarySourceLabelAr: string
  /** Every POSITIVE contributor. A DENY is reported via overrideState, not here. */
  sources: PageAccessSource[]
  overrideState: UserPageAccessState | null
  protected: boolean
  reason: string
  /** Catalog presentation fields — present on the admin inspection payload. */
  labelAr: string
  category: PageAccessCategoryKey
  categoryLabelAr: string
  riskLevel: PageAccessRiskLevel
}

export type EffectivePageAccess = {
  user: { id: number; name: string; email: string; role: string }
  allowedKeys: string[]
  pages: EffectivePageAccessRow[]
}

const SOURCES: readonly PageAccessSource[] = [
  'root_authority',
  'system_protected',
  'user_deny',
  'user_allow',
  'department_leader',
  'department_member',
  'role',
  'none',
]

function asSource(v: unknown): PageAccessSource {
  const s = str(v)
  return (SOURCES as readonly string[]).includes(s) ? (s as PageAccessSource) : 'none'
}

function effectiveRowFromUnknown(raw: unknown): EffectivePageAccessRow | null {
  const o = asRecord(raw)
  if (!o) return null
  const key = str(o.key)
  if (!key) return null
  const override = str(o.override_state)
  return {
    key,
    allowed: bool(o.allowed),
    primarySource: asSource(o.primary_source),
    primarySourceLabelAr: str(o.primary_source_label_ar),
    sources: Array.isArray(o.sources) ? o.sources.map(asSource) : [],
    overrideState: override === 'allow' || override === 'deny' ? override : null,
    protected: bool(o.protected),
    reason: str(o.reason),
    labelAr: str(o.label_ar),
    category: str(o.category) as PageAccessCategoryKey,
    categoryLabelAr: str(o.category_label_ar),
    riskLevel: asRiskLevel(o.risk_level),
  }
}

/**
 * `pages` arrives as a LIST from the admin inspection endpoint and as a MAP
 * keyed by page key from the self endpoint (a map is what a route guard wants
 * to look up). Accept both so one row type serves both callers.
 */
function normalizeEffective(payload: unknown): EffectivePageAccess {
  const d = asRecord(unwrapData<unknown>(payload)) ?? {}
  const user = asRecord(d.user) ?? {}

  const rawPages = d.pages
  const list =
    Array.isArray(rawPages) ? rawPages
    : asRecord(rawPages) ? Object.values(asRecord(rawPages) as Record<string, unknown>)
    : []

  return {
    user: {
      id: Number(user.id ?? 0),
      name: str(user.name),
      email: str(user.email),
      role: str(user.role),
    },
    allowedKeys: asStringList(d.allowed_keys),
    pages: list.map(effectiveRowFromUnknown).filter((r): r is EffectivePageAccessRow => r != null),
  }
}

/**
 * GET /admin/users/{user}/effective-page-access — READ-ONLY inspection of the
 * resolved result with provenance. There is no write counterpart on purpose:
 * effective access is derived, and is changed by editing the role, department
 * or user layers that feed it.
 */
export async function fetchUserEffectivePageAccess(userId: number | string): Promise<EffectivePageAccess> {
  const res = await apiClient.get<unknown>(`/admin/users/${userId}/effective-page-access`, silent)
  return normalizeEffective(res.data)
}

/**
 * GET /auth/me/page-access — the CALLER's own effective page access.
 *
 * Provided for completeness of the Phase 2D contract. Phase 2E does NOT wire
 * this into routing or the sidebar: DashboardAccessGuard and dashboardAccess.ts
 * remain the production authority until a later, deliberate cutover.
 */
export async function fetchMyPageAccess(): Promise<EffectivePageAccess> {
  const res = await apiClient.get<unknown>('/auth/me/page-access', silent)
  return normalizeEffective(res.data)
}
