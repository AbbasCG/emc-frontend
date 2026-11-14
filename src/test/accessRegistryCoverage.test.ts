import { describe, expect, it } from 'vitest'
import appSource from '../App.tsx?raw'
import sidebarSource from '../layouts/dashboardSidebar.tsx?raw'
import baselineJson from '@/test/fixtures/accessEffectiveBaseline.json'

/**
 * ACCESS CONTROL COVERAGE — React Router ↔ the backend Access Control registry.
 *
 * The registry (backend PageAccessCatalog, mirrored here by the committed effective-access fixture) is the only
 * thing "Access Control" can list, grant or revoke. A dashboard page that has no row of its own is either invisible
 * to Access Control or silently owned by a shorter parent URL (e.g. `/dashboard/hr` → hr.dashboard), which is how
 * `/dashboard/hr/volunteer-points-approval` went unnoticed.
 *
 * This test reads the router and the sidebar as source text and fails when:
 *   - a `/dashboard` page route has no catalog entry of its own and is not a DOCUMENTED exception;
 *   - an exception is no longer needed (so the list cannot rot into a blanket allow);
 *   - a catalog entry points at a URL no router path serves (unless documented);
 *   - a `/dashboard` route is declared outside `<DashboardAccessGuard />`.
 *
 * What is NOT a gap (and is therefore never reported on its own):
 *   - `<Navigate>` redirects — they render nothing, the target is checked instead;
 *   - routes outside `/dashboard` — public pages and the few shared authenticated pages are not Access Control's job;
 *   - dynamic pages (`:id`) whose pattern is registered, with any parameter name or optionality.
 */

// ── the registry ──────────────────────────────────────────────────────────────

interface CatalogRow {
  key: string
  primary_route: string
  route_patterns: string[]
}

const CATALOG = baselineJson.catalog as CatalogRow[]

// ── route extraction ──────────────────────────────────────────────────────────

export interface RouteDecl {
  path: string
  kind: 'page' | 'redirect' | 'dev-only'
  component: string | null
  line: number
  underGuard: boolean
}

/** Every `<Route ... path="...">` opening tag, brace- and quote-aware (element props contain JSX and arrow functions). */
export function extractRoutes(source: string): RouteDecl[] {
  const guardIndex = source.search(/<DashboardAccessGuard\s*\/>/)
  const out: RouteDecl[] = []

  for (const match of source.matchAll(/<Route\b/g)) {
    const start = match.index ?? 0
    let depth = 0
    let quote: string | null = null
    let end = -1
    for (let i = start + 6; i < source.length; i++) {
      const c = source[i]
      if (quote) {
        if (c === quote && source[i - 1] !== '\\') quote = null
      } else if (c === '"' || c === "'" || c === '`') quote = c
      else if (c === '{') depth++
      else if (c === '}') depth--
      else if (c === '>' && depth === 0 && source[i - 1] !== '=') {
        end = i
        break
      }
    }
    if (end < 0) continue

    const tag = source.slice(start, end + 1)
    const path = /\bpath="([^"]+)"/.exec(tag)?.[1]
    if (!path) continue

    const element = /element=\{([\s\S]*)\}\s*\/?>\s*$/.exec(tag)?.[1].trim() ?? ''
    const lineStart = source.lastIndexOf('\n', start - 1) + 1
    const devOnly = source.slice(lineStart - 200, lineStart).split('\n').slice(-2).join('\n').includes('import.meta.env.DEV')
    const component = /<([A-Z][A-Za-z0-9_]*)/.exec(element.replace(/<(Suspense|RouteFallback|SectionBoundary)\b[^>]*>/g, ''))?.[1] ?? null

    out.push({
      path,
      kind: devOnly ? 'dev-only' : element.startsWith('<Navigate') || /Redirect/.test(component ?? '') ? 'redirect' : 'page',
      component,
      line: source.slice(0, start).split('\n').length,
      underGuard: guardIndex >= 0 && start > guardIndex,
    })
  }

  return out
}

/** `:courseId`, `:id?` and friends all collapse to `:p`, so parameter naming never decides coverage. */
export function normalizeParams(path: string): string {
  return path.replace(/\/:[A-Za-z0-9_]+\??/g, '/:p')
}

/** An optional trailing parameter (`/x/:id?`) is served at both `/x` and `/x/:id`. */
function routeForms(path: string): string[] {
  const n = normalizeParams(path.replace(/\?$/, ''))
  const bare = n.replace(/\/:p$/, '')
  return path.endsWith('?') ? [n, bare] : [n]
}

export type Ownership = { how: 'exact' | 'prefix' | 'none'; key: string | null; pattern: string | null }

/** Same longest-prefix rule as src/utils/pageAccessMatch.ts, plus an `exact` flag (the route IS a registered pattern). */
export function ownerOf(path: string, catalog: readonly CatalogRow[]): Ownership {
  const forms = routeForms(path)
  let best: Ownership = { how: 'none', key: null, pattern: null }
  let bestLength = -1

  for (const row of catalog) {
    for (const pattern of row.route_patterns) {
      const p = normalizeParams(pattern)
      if (forms.includes(p)) return { how: 'exact', key: row.key, pattern }
      const sample = forms[0].replace(/:p/g, '1')
      const target = p.replace(/:p/g, '1')
      if ((sample === target || sample.startsWith(`${target}/`)) && target.length > bestLength) {
        best = { how: 'prefix', key: row.key, pattern }
        bestLength = target.length
      }
    }
  }

  return best
}

export interface CoverageReport {
  /** Page routes with no catalog entry of their own (neither exact nor documented). */
  unregistered: string[]
  /** Documented exceptions that no longer apply — remove them. */
  staleExceptions: string[]
  /** Catalog patterns no router path serves, minus the documented ones. */
  deadPatterns: string[]
  /** Dashboard routes declared outside the access guard. */
  outsideGuard: string[]
}

export function auditCoverage(
  routes: readonly RouteDecl[],
  catalog: readonly CatalogRow[],
  documented: { unregistered: Record<string, string>; prefixOwned: Record<string, string>; deadPatterns: Record<string, string> },
): CoverageReport {
  const dashboard = routes.filter((r) => r.path.startsWith('/dashboard') && r.kind !== 'dev-only')
  const pages = dashboard.filter((r) => r.kind === 'page')
  const unregistered: string[] = []
  const used = new Set<string>()

  for (const route of pages) {
    const owner = ownerOf(route.path, catalog)
    if (owner.how === 'exact') continue
    const table = owner.how === 'prefix' ? documented.prefixOwned : documented.unregistered
    if (route.path in table) {
      used.add(route.path)
      continue
    }
    unregistered.push(
      owner.how === 'prefix'
        ? `${route.path}  (${route.component}) is only covered by the parent entry ${owner.key} via "${owner.pattern}" — give it a catalog entry or document why not`
        : `${route.path}  (${route.component}) has no catalog entry`,
    )
  }

  const served = new Set(dashboard.flatMap((r) => routeForms(r.path)))
  const deadPatterns: string[] = []
  for (const row of catalog) {
    for (const pattern of row.route_patterns) {
      if (served.has(normalizeParams(pattern))) continue
      if (pattern in documented.deadPatterns) {
        used.add(pattern)
        continue
      }
      deadPatterns.push(`${row.key}: ${pattern}`)
    }
  }

  const staleExceptions = [
    ...Object.keys(documented.unregistered),
    ...Object.keys(documented.prefixOwned),
    ...Object.keys(documented.deadPatterns),
  ].filter((p) => !used.has(p))

  return {
    unregistered,
    staleExceptions,
    deadPatterns,
    outsideGuard: dashboard.filter((r) => !r.underGuard).map((r) => r.path),
  }
}

// ── documented exceptions (each one says WHY it is not a gap) ─────────────────

/** Page routes that deliberately have no catalog entry. */
const UNREGISTERED: Record<string, string> = {
  '/dashboard/teacher/*': 'legacy alias that renders nothing (sr-only span); not a page',
  '/dashboard/courses/:courseId/modules': 'shared learning content: the API enforces enrolment/ownership (EnsureLearnerAccess)',
  '/dashboard/courses/:courseId/content': 'shared content manager mount; the API enforces course ownership',
  '/dashboard/lessons/:lessonId': 'shared learning content: the API enforces enrolment/ownership',
  '/dashboard/quizzes/:quizId': 'shared learning content: the API enforces enrolment/ownership',
  '/dashboard/registrations': 'AdminComingSoonPage placeholder with no backend capability',
  '/dashboard/schedule': 'AdminComingSoonPage placeholder with no backend capability',
  '/dashboard/users': 'AdminComingSoonPage placeholder with no backend capability',
}

/** Page routes that rely on a parent entry on purpose (to be reviewed in the registry-cleanup phase). */
const PREFIX_OWNED: Record<string, string> = {
  '/dashboard/admin/users': 'AdminComingSoonPage placeholder under administration.admin_overview',
  '/dashboard/admin/lms/courses/:courseId/content': 'CourseContentManagerPage mount under administration.admin_overview (registry cleanup)',
  '/dashboard/super-admin/crud/programs/:courseId/content': 'CourseContentManagerPage mount under lms.programs (registry cleanup)',
}

/** Catalog URLs no router path serves (historic aliases). */
const DEAD_PATTERNS: Record<string, string> = {
  '/dashboard/admin/finance/expenses': 'historic alias; the page lives at /dashboard/finance/expenses (registry cleanup)',
  '/dashboard/admin/finance/revenues': 'historic alias; the page lives at /dashboard/finance/revenues (registry cleanup)',
  '/dashboard/ops/volunteers/:id': 'detail URL registered by the backend catalog; the volunteer detail opens in a drawer on /dashboard/ops/volunteers (registry cleanup)',
}

/** Sidebar targets outside the registry: shared authenticated pages and placeholders. */
const SIDEBAR_EXCEPTIONS: Record<string, string> = {
  '/ai': 'shared authenticated workspace outside /dashboard; its API authorizes the caller',
  '/calendar': 'shared authenticated page outside /dashboard; its API authorizes the caller',
  '/documents': 'shared authenticated page outside /dashboard; its API authorizes the caller',
  '/volunteer-opportunities': 'public opportunities page outside /dashboard (volunteer sidebar link)',
  '/dashboard/registrations': 'AdminComingSoonPage placeholder',
  '/dashboard/users': 'AdminComingSoonPage placeholder',
}

// ── the gate ──────────────────────────────────────────────────────────────────

const ROUTES = extractRoutes(appSource)
const DOCUMENTED = { unregistered: UNREGISTERED, prefixOwned: PREFIX_OWNED, deadPatterns: DEAD_PATTERNS }

describe('router ↔ Access Control registry coverage', () => {
  it('reads a believable router (guards against the scanner silently finding nothing)', () => {
    const dashboardPages = ROUTES.filter((r) => r.path.startsWith('/dashboard') && r.kind === 'page')
    expect(dashboardPages.length).toBeGreaterThan(200)
    expect(ROUTES.some((r) => r.path === '/dashboard/hr/volunteer-points-approval')).toBe(true)
  })

  it('every /dashboard page route has a catalog entry of its own, or a documented reason', () => {
    expect(auditCoverage(ROUTES, CATALOG, DOCUMENTED).unregistered).toEqual([])
  })

  it('no documented exception is stale', () => {
    expect(auditCoverage(ROUTES, CATALOG, DOCUMENTED).staleExceptions).toEqual([])
  })

  it('every catalog URL is served by a router path, or documented as a historic alias', () => {
    expect(auditCoverage(ROUTES, CATALOG, DOCUMENTED).deadPatterns).toEqual([])
  })

  it('every /dashboard route sits behind DashboardAccessGuard', () => {
    expect(auditCoverage(ROUTES, CATALOG, DOCUMENTED).outsideGuard).toEqual([])
  })

  it('catalog keys and URLs are unique', () => {
    const keys = CATALOG.map((c) => c.key)
    expect(new Set(keys).size).toBe(keys.length)

    const owners = new Map<string, string>()
    const clashes: string[] = []
    for (const row of CATALOG) {
      for (const pattern of row.route_patterns) {
        const seen = owners.get(pattern)
        if (seen && seen !== row.key) clashes.push(`${pattern}: ${seen} vs ${row.key}`)
        owners.set(pattern, row.key)
      }
    }
    expect(clashes).toEqual([])
  })

  it('every sidebar link is registered or documented', () => {
    const hrefs = [...new Set([...sidebarSource.matchAll(/label:\s*'[^']+'\s*,\s*href:\s*'([^']+)'/g)].map((m) => m[1]))]
    expect(hrefs.length).toBeGreaterThan(100)

    const redirects = new Map(
      ROUTES.filter((r) => r.kind === 'redirect').map((r) => [r.path, r.path]),
    )
    const unowned = hrefs.filter((href) => {
      if (href in SIDEBAR_EXCEPTIONS) return false
      if (redirects.has(href)) return false // a redirect lands on a registered page; the target is audited above
      return ownerOf(href, CATALOG).how === 'none'
    })
    expect(unowned).toEqual([])

    const stale = Object.keys(SIDEBAR_EXCEPTIONS).filter((href) => !hrefs.includes(href))
    expect(stale).toEqual([])
  })

  it('dynamic pages are covered by their registered pattern regardless of parameter name', () => {
    expect(ownerOf('/dashboard/hr/volunteers/:volunteerId', CATALOG).how).toBe('exact')
    expect(ownerOf('/dashboard/instructor/submissions/:submissionId?', CATALOG).how).not.toBe('none')
  })
})

describe('the volunteer-points approval page', () => {
  it('has its own registry entry, under HR, and no longer rides on the HR home entry', () => {
    const owner = ownerOf('/dashboard/hr/volunteer-points-approval', CATALOG)
    expect(owner).toMatchObject({ how: 'exact', key: 'hr.volunteer_points_approval' })

    const row = (baselineJson.catalog as Array<Record<string, unknown>>).find((c) => c.key === 'hr.volunteer_points_approval')
    expect(row).toMatchObject({
      category: 'hr',
      label_ar: 'اعتماد نقاط المتطوعين',
      risk_level: 'ADMIN_ONLY',
      delegatable: false,
      authenticated_baseline: false,
    })
  })

  it('is reachable by root only in the committed baselines (role defaults are not part of them)', () => {
    // hr_manager gets it from RoleDefaultMap through access:sync-role-defaults; that grant is pinned on the backend
    // (tests/Feature/VolunteerPointsApprovalPageAccessTest.php). The baselines here only carry department/override state.
    for (const scenario of ['seeded', 'unseeded'] as const) {
      const personas = baselineJson.scenarios[scenario] as Record<string, { role: string; allowed: string[] }>
      const holders = Object.values(personas)
        .filter((p) => p.allowed.includes('hr.volunteer_points_approval'))
        .map((p) => p.role)
      expect([...new Set(holders)].sort()).toEqual(['super_admin', 'tech_admin'])
    }
  })
})

describe('the coverage detector itself', () => {
  const documented = { unregistered: {}, prefixOwned: {}, deadPatterns: {} }
  const guarded = (path: string, kind: RouteDecl['kind'] = 'page'): RouteDecl => ({ path, kind, component: 'X', line: 1, underGuard: true })

  it('reports a brand-new unregistered admin page', () => {
    const report = auditCoverage([guarded('/dashboard/hr/brand-new-page')], [], documented)
    expect(report.unregistered).toHaveLength(1)
    expect(report.unregistered[0]).toContain('/dashboard/hr/brand-new-page')
  })

  it('reports a page that only rides on a parent entry', () => {
    const catalog: CatalogRow[] = [{ key: 'hr.dashboard', primary_route: '/dashboard/hr', route_patterns: ['/dashboard/hr'] }]
    const report = auditCoverage([guarded('/dashboard/hr/brand-new-page')], catalog, documented)
    expect(report.unregistered[0]).toContain('hr.dashboard')
  })

  it('accepts a registered dynamic page, a redirect, a dev-only route and a public route', () => {
    const catalog: CatalogRow[] = [{ key: 'x.items', primary_route: '/dashboard/x/items', route_patterns: ['/dashboard/x/items', '/dashboard/x/items/:id'] }]
    const report = auditCoverage(
      [guarded('/dashboard/x/items'), guarded('/dashboard/x/items/:itemId'), guarded('/dashboard/old', 'redirect'), guarded('/dashboard/dev', 'dev-only'), guarded('/login')],
      catalog,
      documented,
    )
    expect(report).toEqual({ unregistered: [], staleExceptions: [], deadPatterns: [], outsideGuard: [] })
  })

  it('flags a stale exception and a dead catalog pattern and a route outside the guard', () => {
    const catalog: CatalogRow[] = [{ key: 'x.items', primary_route: '/dashboard/x/items', route_patterns: ['/dashboard/x/items', '/dashboard/x/gone'] }]
    const report = auditCoverage(
      [{ ...guarded('/dashboard/x/items'), underGuard: false }],
      catalog,
      { unregistered: { '/dashboard/was-needed': 'old' }, prefixOwned: {}, deadPatterns: {} },
    )
    expect(report.staleExceptions).toEqual(['/dashboard/was-needed'])
    expect(report.deadPatterns).toEqual(['x.items: /dashboard/x/gone'])
    expect(report.outsideGuard).toEqual(['/dashboard/x/items'])
  })
})
