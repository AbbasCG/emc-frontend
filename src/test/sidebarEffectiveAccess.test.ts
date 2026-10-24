import { describe, expect, it } from 'vitest'
import type { EffectivePageAccessRow, PageAccessSource } from '@/api/accessControlApi'
import { getSidebarByRole, type SidebarNavGroup } from '@/layouts/dashboardSidebar'
import { filterSidebarGroups } from '@/utils/dashboardRouteSearch'
import { findPageForPath, isPathAllowed } from '@/utils/pageAccessMatch'
import { findUnlistedAccessiblePages, resolveSidebarNavigation } from '@/utils/sidebarAccessFilter'
import { HIDDEN_FROM_SIDEBAR, STRUCTURAL_SIDEBAR_PATHS } from '@/utils/sidebarNavigationMeta'
import baseline from '@/test/fixtures/accessEffectiveBaseline.json'

/**
 * The sidebar and the route guard read ONE manifest.
 *
 * Before: the menu was a static per-role list that was only ever trimmed, so a page the
 * backend granted outside the role's usual set opened by URL but never showed in the menu
 * (the production case: programs_manager + /dashboard/hr/my-requests). The menu is now
 * resolved from the manifest — it removes what is denied AND adds what is allowed.
 */

const HR_KEY = 'hr.my_requests'
const HR_HREF = '/dashboard/hr/my-requests'

type Fixture = { key: string; primary_route: string; route_patterns: string[]; label_ar: string; category: string }

const CATEGORY_LABEL: Record<string, string> = {
  operations: 'العمليات', finance: 'المالية', hr: 'الموارد البشرية', quality: 'الجودة', lms: 'نظام إدارة التعلم',
  organizational_departments: 'الإدارات التنظيمية', administration: 'الإدارة والنظام', technical_system: 'المنصة التقنية', personal: 'شخصي',
}

function row(key: string, allowed: boolean, sources: PageAccessSource[] = ['role'], over: Partial<EffectivePageAccessRow> = {}): EffectivePageAccessRow {
  const f = (baseline.catalog as Fixture[]).find((c) => c.key === key)
  if (!f) throw new Error(`unknown fixture key ${key}`)
  return {
    key, allowed, primarySource: (allowed ? sources[0] ?? 'role' : 'none') as PageAccessSource, primarySourceLabelAr: '',
    sources: allowed ? sources : [], overrideState: null, protected: false, reason: '',
    labelAr: f.label_ar, category: f.category as never, categoryLabelAr: CATEGORY_LABEL[f.category] ?? '', riskLevel: 'SAFE_DELEGATABLE' as never,
    primaryRoute: f.primary_route, routePatterns: f.route_patterns, ...over,
  }
}

/** A manifest for the whole catalog; `deny` removes keys, `sources` sets provenance for the rest. */
function manifest(opts: { deny?: string[]; only?: string[]; sources?: PageAccessSource[] } = {}): EffectivePageAccessRow[] {
  return (baseline.catalog as Fixture[]).map((c) => {
    const allowed = opts.only ? opts.only.includes(c.key) : !(opts.deny ?? []).includes(c.key)
    return row(c.key, allowed, opts.sources ?? ['role'])
  })
}

const hrefs = (groups: readonly SidebarNavGroup[]) => groups.flatMap((g) => g.items.map((i) => i.href))
const resolve = (role: string, pages: EffectivePageAccessRow[], status: 'ready' | 'loading' | 'error' | 'idle' = 'ready', permissions: string[] = ['executive.command_center.view']) =>
  resolveSidebarNavigation({ groups: getSidebarByRole(role), pages, status, permissions })

describe('the production case: programs_manager + hr.my_requests', () => {
  it('the role\'s static menu does not list the page (the root cause)', () => {
    expect(hrefs(getSidebarByRole('programs_manager'))).not.toContain(HR_HREF)
  })

  it('direct route is allowed and the sidebar shows the page, with no role condition', () => {
    const pages = manifest({ sources: ['authenticated_baseline'] })

    expect(isPathAllowed(pages, HR_HREF)).toBe(true)
    const nav = resolve('programs_manager', pages)

    expect(nav.state).toBe('ready')
    expect(hrefs(nav.groups)).toContain(HR_HREF)
    const group = nav.groups.find((g) => g.items.some((i) => i.href === HR_HREF))
    expect(group?.title).toBe('الموارد البشرية')
    expect(group?.items.find((i) => i.href === HR_HREF)?.label).toBe('طلباتي')
  })

  it('works identically for another role, proving nothing keys off the role', () => {
    const pages = manifest({ sources: ['authenticated_baseline'] })

    for (const role of ['programs_manager', 'operations_manager', 'quality_manager', 'support_agent', 'student', 'instructor']) {
      const present = hrefs(resolve(role, pages).groups)
      const viaOther = present.includes(HR_HREF) || present.includes('/dashboard/department/hr-requests')
      expect(viaOther, role).toBe(true)
    }
  })

  it('an explicit deny hides it and the direct route is denied by the same manifest', () => {
    const pages = manifest({ deny: [HR_KEY] })

    expect(isPathAllowed(pages, HR_HREF)).toBe(false)
    expect(hrefs(resolve('programs_manager', pages).groups)).not.toContain(HR_HREF)
  })

  it('an explicit deny also removes it from a role whose static menu DOES list it', () => {
    const pages = manifest({ deny: [HR_KEY] })

    expect(hrefs(getSidebarByRole('hr_manager'))).toContain(HR_HREF)
    expect(hrefs(resolve('hr_manager', pages).groups)).not.toContain(HR_HREF)
  })

  it('does not add a second copy when the static menu already lists the page', () => {
    const nav = resolve('hr_manager', manifest())

    expect(hrefs(nav.groups).filter((h) => h === HR_HREF)).toHaveLength(1)
  })
})

describe('grants of every kind reach the menu', () => {
  it.each<[string, PageAccessSource]>([
    ['a role default', 'role'],
    ['a department member default', 'department_member'],
    ['a department leader default', 'department_leader'],
    ['an explicit user allow', 'user_allow'],
    ['the authenticated baseline', 'authenticated_baseline'],
  ])('%s of a page the static menu lacks adds it', (_label, source) => {
    const pages = manifest({ only: ['hr.volunteers'], sources: [source] })

    expect(hrefs(getSidebarByRole('programs_manager'))).not.toContain('/dashboard/hr/volunteers')
    expect(hrefs(resolve('programs_manager', pages).groups)).toContain('/dashboard/hr/volunteers')
  })

  it('root authority alone does not list every catalog page', () => {
    const pages = manifest({ sources: ['root_authority'] })

    expect(findUnlistedAccessiblePages(getSidebarByRole('super_admin'), pages)).toEqual([])
  })

  it('hidden-from-sidebar pages are never injected, and each carries a reason', () => {
    const pages = manifest({ sources: ['authenticated_baseline'] })
    const injected = hrefs(resolve('programs_manager', pages).groups)

    for (const key of Object.keys(HIDDEN_FROM_SIDEBAR)) {
      const r = pages.find((p) => p.key === key)
      expect(HIDDEN_FROM_SIDEBAR[key].length).toBeGreaterThan(10)
      if (r && !hrefs(getSidebarByRole('programs_manager')).includes(r.primaryRoute)) expect(injected).not.toContain(r.primaryRoute)
    }
  })

  it('a page that is allowed but has no usable route is not injected', () => {
    const pages = [row(HR_KEY, true, ['role'], { primaryRoute: '' }), row('hr.volunteers', true, ['role'], { primaryRoute: '/dashboard/hr/volunteers/:id' })]

    expect(findUnlistedAccessiblePages([], pages)).toEqual([])
  })
})

describe('groups', () => {
  it('a group appears only when it has a visible child, and empty groups are dropped', () => {
    const allDenied = manifest({ only: [] })
    const nav = resolve('hr_manager', allDenied)

    expect(nav.groups.every((g) => g.items.length > 0)).toBe(true)
    expect(hrefs(nav.groups).filter((h) => !STRUCTURAL_SIDEBAR_PATHS.has(h))).toEqual([])
  })

  it('a heading shows when at least one of its children is allowed', () => {
    const one = manifest({ only: ['hr.incoming_requests'] })
    const nav = resolve('hr_manager', one)

    const g = nav.groups.find((x) => x.items.some((i) => i.href === '/dashboard/hr/incoming-requests'))
    expect(g).toBeTruthy()
    expect(g!.items.every((i) => i.href === '/dashboard/hr/incoming-requests' || STRUCTURAL_SIDEBAR_PATHS.has(i.href))).toBe(true)
  })

  it('injected pages join an existing heading of the same name instead of duplicating it', () => {
    const groups: SidebarNavGroup[] = [{ title: 'الموارد البشرية', items: [{ label: 'x', href: '/dashboard/hr', icon: (() => null) as never }] }]
    const nav = resolveSidebarNavigation({ groups, pages: manifest({ only: ['hr.dashboard', HR_KEY] }), status: 'ready' })

    expect(nav.groups.filter((g) => g.title === 'الموارد البشرية')).toHaveLength(1)
    expect(hrefs(nav.groups)).toEqual(expect.arrayContaining(['/dashboard/hr', HR_HREF]))
  })

  it('new headings stay above the trailing account group', () => {
    const nav = resolve('admin', manifest({ sources: ['role'] }))

    expect(nav.groups[nav.groups.length - 1].title).toBe('الحساب')
  })
})

describe('loading, failure and unknown links', () => {
  it('shows nothing while the manifest is loading, so nothing unauthorized can flash', () => {
    for (const status of ['idle', 'loading'] as const) {
      const nav = resolve('programs_manager', [], status)
      expect(nav.state).toBe('loading')
      expect(nav.groups).toEqual([])
    }
  })

  it('fails closed when the manifest cannot be loaded: structural links only', () => {
    const nav = resolve('admin', [], 'error')

    expect(nav.state).toBe('error')
    expect(hrefs(nav.groups).every((h) => STRUCTURAL_SIDEBAR_PATHS.has(h))).toBe(true)
    expect(hrefs(nav.groups)).not.toContain('/dashboard/admin')
  })

  it('an unmapped link is dropped unless it is declared structural', () => {
    const icon = (() => null) as never
    const groups: SidebarNavGroup[] = [{ items: [
      { label: 'unknown', href: '/dashboard/not-in-catalog', icon },
      { label: 'docs', href: '/documents', icon },
    ] }]

    const nav = resolveSidebarNavigation({ groups, pages: manifest({ only: [] }), status: 'ready' })

    expect(hrefs(nav.groups)).toEqual(['/documents'])
  })

  it('a ready but empty manifest grants nothing', () => {
    expect(hrefs(resolve('admin', []).groups).every((h) => STRUCTURAL_SIDEBAR_PATHS.has(h))).toBe(true)
  })
})

describe('search', () => {
  it('searches only what is visible', () => {
    const pages = manifest({ sources: ['authenticated_baseline'] })
    const visible = resolve('programs_manager', pages).groups

    expect(hrefs(filterSidebarGroups(visible, 'طلباتي'))).toContain(HR_HREF)

    const denied = resolve('programs_manager', manifest({ deny: [HR_KEY] })).groups
    expect(hrefs(filterSidebarGroups(denied, 'طلباتي'))).not.toContain(HR_HREF)
  })
})

describe('menu and route guard agree for every sidebar item, for every role', () => {
  const roles = [
    'super_admin', 'tech_admin', 'admin', 'executive_admin', 'finance_manager', 'hr_manager', 'quality_manager', 'operations_manager',
    'programs_manager', 'department_manager', 'support_agent', 'instructor', 'student', 'volunteer', 'partner', 'marketing_manager',
  ]

  it('allowed → the item shows; denied → it is hidden', () => {
    const base = manifest()
    const denying = (key: string) => base.map((r) => (r.key === key ? { ...r, allowed: false, sources: [] as PageAccessSource[] } : r))

    for (const role of roles) {
      const shown = hrefs(resolve(role, base).groups)
      const seen = new Set<string>()

      for (const item of getSidebarByRole(role).flatMap((g) => g.items)) {
        const owner = findPageForPath(base, item.href)
        if (!owner) continue

        expect(shown, `${role} ${item.href} allowed`).toContain(item.href)
        if (seen.has(owner.key)) continue
        seen.add(owner.key)

        const denied = denying(owner.key)
        expect(isPathAllowed(denied, item.href)).toBe(false)
        expect(hrefs(resolve(role, denied).groups), `${role} ${item.href} denied`).not.toContain(item.href)
      }
    }
  }, 60_000)

  it('every allowed page appears in the menu unless it is explicitly hidden or root-only', () => {
    for (const role of roles) {
      const pages = manifest({ sources: ['role'] })
      const nav = resolve(role, pages)
      const listed = new Set(hrefs(nav.groups).map((h) => findPageForPath(pages, h)?.key).filter(Boolean))

      const missing = pages.filter((p) => p.allowed && !listed.has(p.key) && !(p.key in HIDDEN_FROM_SIDEBAR) && !p.primaryRoute.includes(':'))
      expect(missing.map((p) => p.key), role).toEqual([])
    }
  })

  it('every static sidebar link is either in the catalog or declared structural', () => {
    const pages = manifest()

    for (const role of roles) {
      for (const item of getSidebarByRole(role).flatMap((g) => g.items)) {
        const mapped = findPageForPath(pages, item.href) !== null
        expect(mapped || STRUCTURAL_SIDEBAR_PATHS.has(item.href), `${role} ${item.href}`).toBe(true)
      }
    }
  })
})
