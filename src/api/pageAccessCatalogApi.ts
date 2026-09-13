import apiClient from './axios'
import { unwrapData } from './unwrap'

const silent = { skipErrorToast: true as const }

/**
 * Page Access Catalog — Phase 1 foundation types.
 *
 * PAGE ACCESS != BUSINESS AUTHORIZATION: this describes whether a dashboard
 * page/capability may be exposed to a user. It never replaces backend
 * permission/policy checks made by the endpoints those pages call.
 *
 * This module is a read-only client for GET /admin/access-control/pages.
 * It does not gate any route or sidebar item — that migration is deferred
 * to a later phase.
 */
export type PageAccessRiskLevel = 'SAFE_DELEGATABLE' | 'ADMIN_ONLY' | 'SYSTEM_PROTECTED'

export type PageAccessCategoryKey =
  | 'operations'
  | 'finance'
  | 'hr'
  | 'quality'
  | 'lms'
  | 'organizational_departments'
  | 'administration'
  | 'technical_system'
  | 'personal'

export type PageAccessEntry = {
  /** Stable machine key — the canonical identity of this capability. Never use a route as identity. */
  key: string
  /** The route a future UI should deep-link to by default. Always equal to routePatterns[0]. */
  primaryRoute: string
  /**
   * Every dashboard URL that belongs to this one logical capability — index/show/
   * create/edit variants, or alternate mount points rendering the same page.
   * Always includes `primaryRoute` as its first element.
   */
  routePatterns: string[]
  labelAr: string
  category: PageAccessCategoryKey
  categoryLabelAr: string
  riskLevel: PageAccessRiskLevel
  protected: boolean
  delegatable: boolean
  requiredPermission: string | null
  departmentScoped: boolean
}

export type PageAccessCategory = {
  key: PageAccessCategoryKey
  labelAr: string
}

export type PageAccessCatalog = {
  pages: PageAccessEntry[]
  categories: PageAccessCategory[]
}

function str(v: unknown): string {
  return v == null ? '' : String(v).trim()
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function bool(v: unknown): boolean {
  return v === true
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

function entryFromUnknown(raw: unknown): PageAccessEntry | null {
  const o = asRecord(raw)
  if (!o) return null
  const key = str(o.key)
  const primaryRoute = str(o.primary_route)
  if (!key || !primaryRoute) return null
  const patterns = asStringList(o.route_patterns)
  return {
    key,
    primaryRoute,
    // Always include primaryRoute even if route_patterns came back empty/malformed.
    routePatterns: patterns.includes(primaryRoute) ? patterns : [primaryRoute, ...patterns],
    labelAr: str(o.label_ar),
    category: str(o.category) as PageAccessCategoryKey,
    categoryLabelAr: str(o.category_label_ar),
    riskLevel: asRiskLevel(o.risk_level),
    protected: bool(o.protected),
    delegatable: bool(o.delegatable),
    requiredPermission: o.required_permission == null ? null : str(o.required_permission) || null,
    departmentScoped: bool(o.department_scoped),
  }
}

function categoryFromUnknown(raw: unknown): PageAccessCategory | null {
  const o = asRecord(raw)
  if (!o) return null
  const key = str(o.key)
  if (!key) return null
  return { key: key as PageAccessCategoryKey, labelAr: str(o.label_ar) }
}

function normalizeCatalog(payload: unknown): PageAccessCatalog {
  const root = unwrapData<unknown>(payload)
  const obj = asRecord(root) ?? asRecord(payload)

  const pagesRaw = obj?.pages
  const pages = Array.isArray(pagesRaw)
    ? pagesRaw.map((p) => entryFromUnknown(p)).filter((p): p is PageAccessEntry => p != null)
    : []

  const categoriesRaw = obj?.categories
  const categories = Array.isArray(categoriesRaw)
    ? categoriesRaw.map((c) => categoryFromUnknown(c)).filter((c): c is PageAccessCategory => c != null)
    : []

  return { pages, categories }
}

/** GET /admin/access-control/pages — read-only Page Access Catalog (super_admin/tech_admin only). */
export async function fetchPageAccessCatalog(): Promise<PageAccessCatalog> {
  const res = await apiClient.get<unknown>('/admin/access-control/pages', silent)
  return normalizeCatalog(res.data)
}

/** Look up a single catalog entry by its stable key — never by route. */
export function findPageAccessEntry(catalog: PageAccessCatalog, key: string): PageAccessEntry | undefined {
  return catalog.pages.find((p) => p.key === key)
}

/** Look up the capability that owns a given dashboard URL (exact match against its route patterns). */
export function findPageAccessEntryByRoute(catalog: PageAccessCatalog, route: string): PageAccessEntry | undefined {
  return catalog.pages.find((p) => p.routePatterns.includes(route))
}
