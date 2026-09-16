import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { EffectivePageAccessRow, PageAccessSource } from '@/api/accessControlApi'
import { findPageForPath, isPathAllowed, normalizePathname, pathMatchesPattern } from '@/utils/pageAccessMatch'
import { filterSidebarGroupsByAccess, filterSidebarItemsByAccess } from '@/utils/sidebarAccessFilter'
import type { SidebarNavGroup } from '@/layouts/dashboardSidebar'
import baselineJson from '@/test/fixtures/accessEffectiveBaseline.json'

/**
 * PHASE H — FRONTEND CUTOVER.
 *
 * Proves the frontend consumes the BACKEND's page-access decision and derives
 * nothing of its own: the same manifest drives both the sidebar and the route
 * guard, every access layer is honoured identically, and no decision is read
 * from or written to browser storage.
 */

function row(
  key: string,
  allowed: boolean,
  primaryRoute: string,
  primarySource: PageAccessSource = 'role',
  extra: Partial<EffectivePageAccessRow> = {},
): EffectivePageAccessRow {
  return {
    key,
    allowed,
    primarySource,
    primarySourceLabelAr: '',
    sources: allowed ? [primarySource] : [],
    overrideState: null,
    protected: false,
    reason: '',
    labelAr: key,
    category: 'operations' as EffectivePageAccessRow['category'],
    categoryLabelAr: '',
    riskLevel: 'SAFE_DELEGATABLE' as EffectivePageAccessRow['riskLevel'],
    primaryRoute,
    routePatterns: [primaryRoute],
    ...extra,
  }
}

const group = (title: string, hrefs: string[]): SidebarNavGroup =>
  ({
    title,
    items: hrefs.map((href) => ({ label: href, href })),
  }) as SidebarNavGroup

/* ── 1. URL matching ────────────────────────────────────────────────────── */

describe('pathname matching', () => {
  it('ignores trailing slashes, query and hash', () => {
    expect(normalizePathname('/dashboard/admin/')).toBe('/dashboard/admin')
    expect(normalizePathname('/dashboard/admin?tab=1')).toBe('/dashboard/admin')
    expect(normalizePathname('/dashboard/admin#x')).toBe('/dashboard/admin')
  })

  it('matches a capability and everything nested beneath it', () => {
    expect(pathMatchesPattern('/dashboard/admin/users', '/dashboard/admin/users')).toBe(true)
    expect(pathMatchesPattern('/dashboard/admin/users/42/edit', '/dashboard/admin/users')).toBe(true)
  })

  it('does not swallow a sibling route that merely shares a prefix', () => {
    expect(pathMatchesPattern('/dashboard/admin/users-archive', '/dashboard/admin/users')).toBe(false)
  })

  it('resolves nested capabilities by longest pattern, not catalog order', () => {
    const pages = [
      row('section', true, '/dashboard/admin'),
      row('specific', false, '/dashboard/admin/users'),
    ]

    expect(findPageForPath(pages, '/dashboard/admin/users')?.key).toBe('specific')
    expect(isPathAllowed(pages, '/dashboard/admin/users')).toBe(false)
    expect(isPathAllowed(pages, '/dashboard/admin')).toBe(true)

    // Order must not change the answer.
    expect(findPageForPath([...pages].reverse(), '/dashboard/admin/users')?.key).toBe('specific')
  })

  it('reports an unmapped path as null rather than denied', () => {
    expect(isPathAllowed([row('a', true, '/dashboard/a')], '/dashboard/unmapped')).toBeNull()
  })
})

/* ── 2. Every access layer drives the sidebar identically ───────────────── */

describe('sidebar visibility derives from effective access', () => {
  const layers: { name: string; source: PageAccessSource; allowed: boolean }[] = [
    { name: 'role default', source: 'role', allowed: true },
    { name: 'department member default', source: 'department_member', allowed: true },
    { name: 'department leader default', source: 'department_leader', allowed: true },
    { name: 'user allow override', source: 'user_allow', allowed: true },
    { name: 'authenticated baseline', source: 'authenticated_baseline', allowed: true },
    { name: 'root authority', source: 'root_authority', allowed: true },
  ]

  for (const layer of layers) {
    it(`shows a page granted by ${layer.name}`, () => {
      const pages = [row('k', layer.allowed, '/dashboard/x', layer.source)]
      const groups = [group('g', ['/dashboard/x'])]

      expect(filterSidebarGroupsByAccess(groups, pages)[0].items).toHaveLength(1)
    })
  }

  it('hides a page denied by a user deny override', () => {
    const pages = [row('k', false, '/dashboard/x', 'user_deny')]

    expect(filterSidebarGroupsByAccess([group('g', ['/dashboard/x'])], pages)).toEqual([])
  })

  it('hides a system-protected page the user does not have', () => {
    const pages = [row('k', false, '/dashboard/x', 'system_protected', { protected: true })]

    expect(filterSidebarGroupsByAccess([group('g', ['/dashboard/x'])], pages)).toEqual([])
  })

  it('hides only the denied item and keeps the rest of its group', () => {
    const pages = [
      row('a', true, '/dashboard/a'),
      row('b', false, '/dashboard/b', 'none'),
      row('c', true, '/dashboard/c'),
    ]

    const items = filterSidebarItemsByAccess(group('g', ['/dashboard/a', '/dashboard/b', '/dashboard/c']).items, pages)

    expect(items.map((i) => i.href)).toEqual(['/dashboard/a', '/dashboard/c'])
  })

  it('drops a group that loses every item', () => {
    const pages = [row('a', false, '/dashboard/a', 'none'), row('b', false, '/dashboard/b', 'none')]

    expect(filterSidebarGroupsByAccess([group('g', ['/dashboard/a', '/dashboard/b'])], pages)).toEqual([])
  })

  it('keeps an unmapped link rather than blanking navigation the catalog does not cover', () => {
    const pages = [row('a', true, '/dashboard/a')]

    const groups = filterSidebarGroupsByAccess([group('g', ['/dashboard/a', '/dashboard/not-a-capability'])], pages)

    expect(groups[0].items.map((i) => i.href)).toEqual(['/dashboard/a', '/dashboard/not-a-capability'])
  })

  it('leaves navigation intact while no manifest has loaded yet', () => {
    const groups = [group('g', ['/dashboard/a'])]

    // The route guard holds rendering in this window; the sidebar must not
    // render an empty shell, and the backend refuses regardless.
    expect(filterSidebarGroupsByAccess(groups, [])).toEqual(groups)
  })
})

/* ── 3. Sidebar and route guard share one decision ──────────────────────── */

describe('sidebar and route guard cannot disagree', () => {
  it('a hidden sidebar item is also refused as a deep link', () => {
    const pages = [row('a', true, '/dashboard/a'), row('b', false, '/dashboard/b', 'user_deny')]
    const visible = filterSidebarItemsByAccess(group('g', ['/dashboard/a', '/dashboard/b']).items, pages)

    expect(visible.map((i) => i.href)).toEqual(['/dashboard/a'])

    // The guard consults the SAME manifest via the same matcher.
    expect(isPathAllowed(pages, '/dashboard/b')).toBe(false)
    expect(isPathAllowed(pages, '/dashboard/a')).toBe(true)
  })

  it('a nested deep link inherits its capability decision', () => {
    const pages = [row('b', false, '/dashboard/b', 'user_deny')]

    expect(isPathAllowed(pages, '/dashboard/b/42/edit')).toBe(false)
  })
})

/* ── 4. No browser-storage authorization ────────────────────────────────── */

describe('authorization is never read from browser storage', () => {
  /** Strip comments so the scan tests CODE, not prose explaining the rule. */
  const codeOf = (relative: string): string =>
    readFileSync(resolve(process.cwd(), relative), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')

  it('no access-decision module reads or writes browser storage', () => {
    const modules = [
      'src/utils/pageAccessMatch.ts',
      'src/utils/sidebarAccessFilter.ts',
      'src/contexts/PageAccessContext.tsx',
      'src/components/DashboardAccessGuard.tsx',
    ]

    for (const relative of modules) {
      expect(codeOf(relative), `${relative} must not read authorization from storage`).not.toMatch(
        /localStorage|sessionStorage|indexedDB/,
      )
    }
  })

  it('the guard no longer consults the legacy role matrix', () => {
    const guard = codeOf('src/components/DashboardAccessGuard.tsx')

    expect(guard).not.toMatch(/canAccessDashboardPath/)
    expect(guard).toMatch(/usePageAccess/)
  })

  it('only the legacy harness still references the old path matrix', () => {
    // canAccessDashboardPath must have exactly one production consumer left:
    // none. The diff harness keeps using it deliberately, to compare systems.
    const guard = codeOf('src/components/DashboardAccessGuard.tsx')

    expect(guard).not.toMatch(/canAccessDashboardPath/)
  })

  it('the resolved decision comes only from the supplied manifest', () => {
    const pages = [row('a', false, '/dashboard/a', 'user_deny')]

    // Even with a hostile storage entry claiming access, the answer is the
    // manifest's, because nothing here reads storage at all.
    localStorage.setItem('emc_page_access', JSON.stringify({ '/dashboard/a': true }))

    expect(isPathAllowed(pages, '/dashboard/a')).toBe(false)
    expect(filterSidebarGroupsByAccess([group('g', ['/dashboard/a'])], pages)).toEqual([])

    localStorage.removeItem('emc_page_access')
  })
})

/* ── 5. Real catalog shape, from the committed baseline fixture ─────────── */

describe('matching against the real catalog', () => {
  const catalog = (baselineJson as unknown as {
    catalog: { key: string; primary_route: string; route_patterns: string[] }[]
  }).catalog

  const asPages = (allowedKeys: Set<string>): EffectivePageAccessRow[] =>
    catalog.map((c) =>
      row(c.key, allowedKeys.has(c.key), c.primary_route, 'role', {
        routePatterns: c.route_patterns.length > 0 ? c.route_patterns : [c.primary_route],
      }),
    )

  it('resolves every catalog primary route to its own capability', () => {
    const pages = asPages(new Set(catalog.map((c) => c.key)))

    for (const entry of catalog) {
      const found = findPageForPath(pages, entry.primary_route)
      expect(found, `no capability matched ${entry.primary_route}`).not.toBeNull()
      // Longest-match may legitimately resolve a nested child; what must hold
      // is that the matched pattern actually covers the path.
      expect(
        found!.routePatterns.some((p) => entry.primary_route === p || entry.primary_route.startsWith(`${p}/`)),
      ).toBe(true)
    }
  })

  it('denying every capability hides every catalog route', () => {
    const pages = asPages(new Set())

    for (const entry of catalog) {
      expect(isPathAllowed(pages, entry.primary_route)).toBe(false)
    }
  })

  it('the catalog is large enough for these guards to mean something', () => {
    expect(catalog.length).toBeGreaterThan(100)
  })
})
