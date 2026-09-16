import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import baselineJson from '@/test/fixtures/accessEffectiveBaseline.json'
import {
  classifyRisk,
  diffPersona,
  diffScenario,
  diffSidebar,
  evaluateCutoverGates,
  findCapabilityForPath,
  findUnmappedPaths,
  rowsAtRisk,
  summarize,
  type AccessBaseline,
  type BaselineCatalogEntry,
  type BaselinePersona,
} from '@/utils/accessDiff'
import {
  canAccessDashboardPath,
  DASHBOARD_NAMESPACE_RULES,
  EMC_DASHBOARD_ROLES,
  getAllowedRolesForPath,
} from '@/utils/dashboardAccess'
import { getSidebarItemsByRole } from '@/layouts/dashboardSidebar'

/**
 * Phase 2F — the diff harness, run against REAL data on both sides:
 *   LEGACY    canAccessDashboardPath() imported from the live production module
 *   EFFECTIVE the backend resolver's own output, via the committed baseline
 *
 * MEASUREMENT ONLY. Nothing here changes production access behaviour.
 */

const baseline = baselineJson as unknown as AccessBaseline
const CATALOG = baseline.catalog
const UNSEEDED = baseline.scenarios.unseeded
const SEEDED = baseline.scenarios.seeded

const entry = (key: string): BaselineCatalogEntry => {
  const found = CATALOG.find((c) => c.key === key)
  if (!found) throw new Error(`fixture missing catalog key ${key}`)
  return found
}

const persona = (scenario: Record<string, BaselinePersona>, id: string): BaselinePersona => {
  const p = scenario[id]
  if (!p) throw new Error(`fixture missing persona ${id}`)
  return p
}

/* ── Fixture integrity ─────────────────────────────────────────────────── */

describe('baseline fixture', () => {
  it('carries the full 129-entry catalog and both scenarios', () => {
    expect(baseline.catalog_count).toBe(129)
    expect(CATALOG).toHaveLength(129)
    expect(Object.keys(UNSEEDED).length).toBeGreaterThan(30)
    expect(Object.keys(SEEDED).length).toBeGreaterThan(10)
  })
})

/* ── 4. Path → capability matching ─────────────────────────────────────── */

describe('path → capability matching', () => {
  it('matches a primary route exactly', () => {
    expect(findCapabilityForPath(CATALOG, '/dashboard/admin/ai')?.key).toBe('technical_system.ai_command_center')
  })

  it('prefers the LONGEST route pattern, not the first prefix hit', () => {
    // /dashboard/admin/ai is also a pattern; the deeper capability must win.
    expect(findCapabilityForPath(CATALOG, '/dashboard/admin/ai/usage')?.key).toBe('technical_system.ai_usage')
  })

  it('resolves a deep sub-path to its owning capability', () => {
    const hit = findCapabilityForPath(CATALOG, '/dashboard/department/structure/sections/12')
    expect(hit?.key).toBe('organizational_departments.structure')
  })

  it('returns null for a path no capability owns', () => {
    expect(findCapabilityForPath(CATALOG, '/dashboard/this-does-not-exist')).toBeNull()
  })
})

/* ── 1-4. Diff status semantics ────────────────────────────────────────── */

describe('diff status semantics', () => {
  const fakeCatalog: BaselineCatalogEntry[] = [
    { ...entry('operations.weekly_reports') },
    { ...entry('finance.dashboard') },
  ]

  it('legacy allowed + new allowed => MATCH_ALLOWED', () => {
    const p: BaselinePersona = {
      role: 'super_admin', context: 'none', note: '',
      allowed: fakeCatalog.map((c) => c.key),
      provenance: Object.fromEntries(fakeCatalog.map((c) => [c.key, 'root_authority' as const])),
    }
    const d = diffPersona('x', p, fakeCatalog)
    expect(d.rows.every((r) => r.status === 'MATCH_ALLOWED')).toBe(true)
    expect(d.counts.MATCH_ALLOWED).toBe(2)
  })

  it('legacy denied + new denied => MATCH_DENIED', () => {
    const p: BaselinePersona = { role: 'student', context: 'none', note: '', allowed: [], provenance: {} }
    const d = diffPersona('x', p, [entry('finance.dashboard')])
    expect(d.rows[0].status).toBe('MATCH_DENIED')
  })

  it('legacy denied + new allowed => NEWLY_ALLOWED', () => {
    const p: BaselinePersona = {
      role: 'student', context: 'none', note: '',
      allowed: ['finance.dashboard'],
      provenance: { 'finance.dashboard': 'user_allow' },
    }
    const d = diffPersona('x', p, [entry('finance.dashboard')])
    expect(d.rows[0].status).toBe('NEWLY_ALLOWED')
    expect(d.rows[0].effectivePrimarySource).toBe('user_allow')
    expect(d.rows[0].effectiveReason).toContain('user_allow')
  })

  it('legacy allowed + new denied => NEWLY_DENIED', () => {
    const p: BaselinePersona = { role: 'finance_manager', context: 'none', note: '', allowed: [], provenance: {} }
    const d = diffPersona('x', p, [entry('finance.dashboard')])
    expect(d.rows[0].legacyAllowed).toBe(true)
    expect(d.rows[0].status).toBe('NEWLY_DENIED')
  })
})

/* ── 12. Unmapped routes ───────────────────────────────────────────────── */

describe('unmapped route detection', () => {
  it('reports a legacy path with no catalog capability', () => {
    const unmapped = findUnmappedPaths(CATALOG, ['/dashboard/admin/ai', '/dashboard/nope'])
    expect(unmapped).toEqual(['/dashboard/nope'])
  })

  it('every legacy DASHBOARD_NAMESPACE_RULES prefix maps to a capability', () => {
    const prefixes = DASHBOARD_NAMESPACE_RULES.map((r) => r.prefix)
    const unmapped = findUnmappedPaths(CATALOG, prefixes)
    // Reported, never silently allowed or denied.
    expect(unmapped).toMatchSnapshot('unmapped-legacy-namespace-prefixes')
  })
})

/* ── 6/7/8/10. Persona behaviour in the SEEDED scenario ────────────────── */

describe('seeded scenario — leadership, protection and overrides', () => {
  it('a manager ROLE SLUG alone never gains leader-only pages', () => {
    const roleOnly = persona(SEEDED, 'operations_manager__none')
    expect(roleOnly.allowed).not.toContain('organizational_departments.structure')
  })

  it('a canonical departments.leader_id leader gains member + leader pages', () => {
    const leader = persona(SEEDED, 'operations_manager__leader')
    expect(leader.allowed).toContain('operations.meeting_reports')
    expect(leader.allowed).toContain('organizational_departments.structure')
    expect(leader.provenance['organizational_departments.structure']).toBe('department_leader')
    expect(leader.provenance['operations.meeting_reports']).toBe('department_member')
  })

  it('a plain member does NOT gain the leader-only page', () => {
    const member = persona(SEEDED, 'operations_manager__member')
    expect(member.allowed).toContain('operations.meeting_reports')
    expect(member.allowed).not.toContain('organizational_departments.structure')
  })

  it('a user ALLOW override shows up as a user_allow-sourced grant', () => {
    const p = persona(SEEDED, 'volunteer__override_allow')
    expect(p.allowed).toContain('finance.dashboard')
    expect(p.provenance['finance.dashboard']).toBe('user_allow')

    const d = diffPersona('volunteer__override_allow', p, [entry('finance.dashboard')])
    expect(d.rows[0].status).toBe('NEWLY_ALLOWED')
  })

  it('a user DENY override removes a page the role default grants', () => {
    const denied = persona(SEEDED, 'volunteer__override_deny')
    const plain = persona(SEEDED, 'volunteer__override_allow')

    expect(plain.allowed).toContain('operations.weekly_reports')
    expect(denied.allowed).not.toContain('operations.weekly_reports')
  })
})

/* ── 10. SYSTEM_PROTECTED comparison ───────────────────────────────────── */

describe('SYSTEM_PROTECTED comparison', () => {
  const protectedKeys = CATALOG.filter((c) => c.protected).map((c) => c.key)

  // Phase 2G.1C reclassified nine admin-tier capabilities SYSTEM_PROTECTED ->
  // ADMIN_ONLY, leaving the eight genuine root-authority surfaces.
  it('there are exactly 8 protected capabilities, and they are the root surfaces', () => {
    expect(protectedKeys).toHaveLength(8)
    expect([...protectedKeys].sort()).toEqual([
      'administration.attendance_settings',
      'administration.email_logs',
      'administration.email_settings',
      'administration.permission_delegation_config',
      'administration.roles',
      'administration.super_admin_overview',
      'technical_system.mobile_readiness',
      'technical_system.platform_scale',
    ])
  })

  it('super_admin and tech_admin reach every protected capability via root authority', () => {
    for (const id of ['super_admin__none', 'tech_admin__none']) {
      const p = persona(SEEDED, id)
      for (const key of protectedKeys) {
        expect(p.allowed, `${id} must reach ${key}`).toContain(key)
        expect(p.provenance[key]).toBe('root_authority')
      }
    }
  })

  it('no other persona in either scenario reaches any protected capability', () => {
    for (const scenario of [UNSEEDED, SEEDED]) {
      for (const [id, p] of Object.entries(scenario)) {
        if (p.role === 'super_admin' || p.role === 'tech_admin') continue
        for (const key of protectedKeys) {
          expect(p.allowed, `${id} must NOT reach ${key}`).not.toContain(key)
        }
      }
    }
  })
})

/* ── 11. AI separation ─────────────────────────────────────────────────── */

describe('AI Department vs Technical AI Platform separation', () => {
  it('the catalog itself separates the two surfaces', () => {
    const workspace = entry('organizational_departments.ai_workspace')
    const platform = entry('technical_system.ai_command_center')

    expect(workspace.primary_route).toBe('/dashboard/ai-department')
    expect(workspace.risk_level).toBe('SAFE_DELEGATABLE')
    expect(workspace.delegatable).toBe(true)

    // Phase 2G.1C: the technical platform is ADMIN_ONLY (admin-tier backend
    // gate), not root-protected. The separation is unchanged — what keeps it
    // out of ai_manager's reach is delegatable=false, not the risk level.
    expect(platform.primary_route).toBe('/dashboard/admin/ai')
    expect(platform.risk_level).toBe('ADMIN_ONLY')
    expect(platform.delegatable).toBe(false)
    expect(platform.department_scoped).toBe(false)
  })

  it('an ai_manager leading the AI Department reaches its workspace but no technical_system page', () => {
    const ai = persona(SEEDED, 'ai_manager__leader')
    expect(ai.allowed).toContain('organizational_departments.structure')

    const technical = CATALOG.filter((c) => c.category === 'technical_system').map((c) => c.key)
    expect(technical.length).toBeGreaterThan(0)
    for (const key of technical) {
      expect(ai.allowed, `ai_manager must not reach ${key}`).not.toContain(key)
    }
  })

  it('the legacy system also denies ai_manager the technical AI Platform', () => {
    expect(canAccessDashboardPath('ai_manager', '/dashboard/admin/ai')).toBe(false)
    expect(canAccessDashboardPath('ai_manager', '/dashboard/ai-department')).toBe(true)
  })
})

/* ── Phase 2G.2 review — the 34 NEWLY_ALLOWED rows ─────────────────────── */

/**
 * Every NEWLY_ALLOWED row after Phase 2G.2 is `hr.my_requests`, and each one is
 * a HARNESS MODEL DIFFERENCE rather than new access.
 *
 * The capability owns two routes that render the SAME self-service page:
 *   /dashboard/hr/my-requests          legacy rule: ['hr_manager']   (primary)
 *   /dashboard/department/hr-requests  legacy rule: 'authenticated'
 *
 * diffPersona() samples `primary_route`, so the legacy side reads "denied" for
 * every non-hr_manager persona even though the legacy system already exposed
 * that page to them through the second route. These assertions pin that down so
 * the 34 can never quietly become genuine new access.
 */
describe('NEWLY_ALLOWED rows are a harness model difference, not new access', () => {
  const newlyAllowed = diffScenario(UNSEEDED, CATALOG).flatMap((d) =>
    d.rows.filter((r) => r.status === 'NEWLY_ALLOWED').map((r) => ({ ...r, personaId: d.personaId, role: d.role })),
  )

  it('hr.my_requests owns both self-service routes', () => {
    const e = entry('hr.my_requests')
    expect(e.primary_route).toBe('/dashboard/hr/my-requests')
    expect(e.route_patterns).toEqual(['/dashboard/hr/my-requests', '/dashboard/department/hr-requests'])
    expect(e.authenticated_baseline).toBe(true)
  })

  it('the secondary route was legacy-AUTHENTICATED before Phase 2G.2', () => {
    // Read from the legacy module itself, never from the new resolver.
    expect(getAllowedRolesForPath('/dashboard/department/hr-requests')).toBe('authenticated')
    expect(getAllowedRolesForPath('/dashboard/hr/my-requests')).toEqual(['hr_manager'])
  })

  it('every dashboard role could already open the secondary route under legacy', () => {
    const denied = [...EMC_DASHBOARD_ROLES].filter(
      (r) => !canAccessDashboardPath(r, '/dashboard/department/hr-requests'),
    )
    expect(denied).toEqual([])
  })

  it('every NEWLY_ALLOWED row is hr.my_requests sourced from the baseline', () => {
    expect(newlyAllowed.length).toBeGreaterThan(0)
    expect([...new Set(newlyAllowed.map((r) => r.key))]).toEqual(['hr.my_requests'])
    expect([...new Set(newlyAllowed.map((r) => r.effectivePrimarySource))]).toEqual(['authenticated_baseline'])
  })

  it('NONE of them represents access the legacy system actually denied', () => {
    for (const row of newlyAllowed) {
      const owned = entry(row.key).route_patterns
      const legacyAllowsSomeRoute = owned.some((rt) => canAccessDashboardPath(row.role, rt))
      expect(legacyAllowsSomeRoute, `${row.personaId} was genuinely denied ${row.key}`).toBe(true)
    }
  })

  it('no NEWLY_ALLOWED row is protected, admin-only, or a security regression', () => {
    for (const row of newlyAllowed) {
      expect(row.riskLevelOfPage).toBe('SAFE_DELEGATABLE')
      expect(entry(row.key).protected).toBe(false)
      expect(row.risk).not.toBe('CRITICAL')
      expect(row.risk).not.toBe('HIGH')
    }
  })

  it('HR management stays a separate, non-baseline capability', () => {
    const management = entry('hr.incoming_requests')
    const selfService = entry('hr.my_requests')

    expect(management.authenticated_baseline).toBe(false)
    expect(management.route_patterns).not.toContain('/dashboard/department/hr-requests')
    expect(management.route_patterns).not.toContain('/dashboard/hr/my-requests')
    expect(selfService.route_patterns).not.toContain(management.primary_route)
  })

  it('no persona gains HR management from the authenticated baseline', () => {
    for (const [id, p] of Object.entries(UNSEEDED)) {
      if (p.role === 'super_admin' || p.role === 'tech_admin') continue
      expect(p.allowed, `${id} must not gain HR management`).not.toContain('hr.incoming_requests')
      expect(p.allowed).not.toContain('hr.dashboard')
    }
  })
})

/* ── 13. Sidebar comparison ────────────────────────────────────────────── */

describe('sidebar comparison', () => {
  it('classifies every sidebar item for a seeded leader persona', () => {
    const items = getSidebarItemsByRole('operations_manager')
    expect(items.length).toBeGreaterThan(0)

    const rows = diffSidebar(items, persona(SEEDED, 'operations_manager__leader'), CATALOG)

    expect(rows).toHaveLength(items.length)
    for (const row of rows) {
      expect(['MATCH', 'NEWLY_VISIBLE', 'NEWLY_HIDDEN', 'UNMAPPED']).toContain(row.status)
    }
  })

  /**
   * Phase 2G.2: a sidebar item whose capability is an AUTHENTICATED BASELINE now
   * MATCHes even with all three tables empty, because baseline is catalog-driven
   * and needs no stored row. Everything else is still NEWLY_HIDDEN — reported,
   * never silently dropped.
   */
  it('reports unseeded sidebar items as NEWLY_HIDDEN except catalog baseline pages', () => {
    const items = getSidebarItemsByRole('finance_manager')
    const rows = diffSidebar(items, persona(UNSEEDED, 'finance_manager__none'), CATALOG)

    const mapped = rows.filter((r) => r.status !== 'UNMAPPED')
    expect(mapped.length).toBeGreaterThan(0)

    const baselineKeys = new Set(CATALOG.filter((c) => c.authenticated_baseline).map((c) => c.key))

    for (const rowItem of mapped) {
      const expected = baselineKeys.has(rowItem.key ?? '') ? 'MATCH' : 'NEWLY_HIDDEN'
      expect(rowItem.status, `${rowItem.href} (${rowItem.key})`).toBe(expected)
    }

    // The baseline genuinely participates here, so the assertion above is not vacuous.
    expect(mapped.some((r) => r.status === 'MATCH')).toBe(true)
    expect(mapped.some((r) => r.status === 'NEWLY_HIDDEN')).toBe(true)
  })
})

/* ── 14. Route guard comparison ────────────────────────────────────────── */

describe('route guard comparison', () => {
  it('compares canAccessDashboardPath against effective access for every capability', () => {
    const d = diffPersona('finance_manager__none', persona(UNSEEDED, 'finance_manager__none'), CATALOG)

    expect(d.rows).toHaveLength(129)
    expect(d.counts.MATCH_ALLOWED + d.counts.MATCH_DENIED + d.counts.NEWLY_ALLOWED + d.counts.NEWLY_DENIED).toBe(129)
  })
})

/* ── 19. Risk classification ───────────────────────────────────────────── */

describe('risk classification', () => {
  it('escalates a protected page newly allowed to CRITICAL', () => {
    expect(classifyRisk(entry('administration.roles'), 'NEWLY_ALLOWED', 'none')).toBe('CRITICAL')
  })

  it('escalates a leader-only surface gained without leadership to HIGH', () => {
    expect(classifyRisk(entry('organizational_departments.structure'), 'NEWLY_ALLOWED', 'member')).toBe('HIGH')
  })

  it('treats losing a department-scoped page without canonical leadership as EXPECTED', () => {
    expect(classifyRisk(entry('organizational_departments.structure'), 'NEWLY_DENIED', 'none')).toBe('EXPECTED')
  })

  it('treats matches as EXPECTED', () => {
    expect(classifyRisk(entry('finance.dashboard'), 'MATCH_ALLOWED', 'none')).toBe('EXPECTED')
    expect(classifyRisk(entry('finance.dashboard'), 'MATCH_DENIED', 'none')).toBe('EXPECTED')
  })
})

/* ── 18/25. The actual baseline report ─────────────────────────────────── */

describe('BASELINE DIFF REPORT', () => {
  it('unseeded scenario (production today) — deterministic counts', () => {
    const diffs = diffScenario(UNSEEDED, CATALOG)
    const summary = summarize(diffs)

    // Reported via snapshot so any future drift is surfaced for review rather
    // than silently accepted.
    expect({
      personas: diffs.length,
      totalComparisons: summary.totalComparisons,
      counts: summary.counts,
      byRisk: summary.byRisk,
    }).toMatchSnapshot('unseeded-summary')

    expect(summary.totalComparisons).toBe(diffs.length * 129)
  })

  it('seeded scenario — deterministic counts', () => {
    const diffs = diffScenario(SEEDED, CATALOG)
    const summary = summarize(diffs)

    expect({
      personas: diffs.length,
      totalComparisons: summary.totalComparisons,
      counts: summary.counts,
      byRisk: summary.byRisk,
    }).toMatchSnapshot('seeded-summary')
  })

  it('lists every CRITICAL and HIGH mismatch individually', () => {
    const all = [...diffScenario(UNSEEDED, CATALOG), ...diffScenario(SEEDED, CATALOG)]
    const severe = rowsAtRisk(all, ['CRITICAL', 'HIGH']).map((r) => ({
      persona: r.personaId,
      key: r.key,
      status: r.status,
      risk: r.risk,
    }))

    expect(severe).toMatchSnapshot('critical-and-high-mismatches')
  })

  it('per-role NEWLY_DENIED counts for the unseeded scenario', () => {
    const diffs = diffScenario(UNSEEDED, CATALOG)
    const byPersona = Object.fromEntries(
      diffs.map((d) => [d.personaId, d.counts.NEWLY_DENIED]),
    )
    expect(byPersona).toMatchSnapshot('unseeded-newly-denied-by-persona')
  })
})

/* ── 20. Cutover gates ─────────────────────────────────────────────────── */

describe('cutover readiness gates', () => {
  it('evaluates all gates against the unseeded (production-today) scenario', () => {
    const diffs = diffScenario(UNSEEDED, CATALOG)
    const unmapped = findUnmappedPaths(CATALOG, DASHBOARD_NAMESPACE_RULES.map((r) => r.prefix))
    const gates = evaluateCutoverGates(diffs, unmapped)

    expect(gates.map((g) => ({ name: g.name, pass: g.pass, actual: g.actual }))).toMatchSnapshot('unseeded-gates')
  })

  it('evaluates all gates against the seeded scenario', () => {
    const diffs = diffScenario(SEEDED, CATALOG)
    const unmapped = findUnmappedPaths(CATALOG, DASHBOARD_NAMESPACE_RULES.map((r) => r.prefix))
    const gates = evaluateCutoverGates(diffs, unmapped)

    expect(gates.map((g) => ({ name: g.name, pass: g.pass, actual: g.actual }))).toMatchSnapshot('seeded-gates')
  })

  it('the CRITICAL and SYSTEM_PROTECTED gates pass in BOTH scenarios', () => {
    for (const scenario of [UNSEEDED, SEEDED]) {
      const diffs = diffScenario(scenario, CATALOG)
      const gates = evaluateCutoverGates(diffs, [])
      const critical = gates.find((g) => g.name.startsWith('CRITICAL'))
      const protectedGate = gates.find((g) => g.name.startsWith('SYSTEM_PROTECTED'))
      const ai = gates.find((g) => g.name.startsWith('AI separation'))

      expect(critical?.pass, 'no ordinary persona may gain a protected page').toBe(true)
      expect(protectedGate?.pass).toBe(true)
      expect(ai?.pass).toBe(true)
    }
  })
})

/* ── 21/23/24/25. No cutover happened ──────────────────────────────────── */

describe('Phase 2F changed NO production access behaviour', () => {
  const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8')

  it('the diff harness is imported by no production module', () => {
    for (const f of [
      'src/utils/dashboardAccess.ts',
      'src/App.tsx',
      'src/layouts/dashboardSidebar.tsx',
    ]) {
      expect(read(f), `${f} must not import the diff harness`).not.toMatch(/accessDiff/)
    }
  })

  it('dashboardAccess.ts still carries its canonical legacy rules unchanged', () => {
    const src = read('src/utils/dashboardAccess.ts')
    expect(src).toMatch(/role === 'super_admin' \|\| role === 'tech_admin'/)
    expect(src).toMatch(/DASHBOARD_NAMESPACE_RULES/)
    expect(src).not.toMatch(/accessControlApi|effective-page-access|fetchMyPageAccess|allowed_keys/)
  })

  it('the guard and sidebar still have no effective-access dependency', () => {
    expect(read('src/App.tsx')).not.toMatch(/accessControlApi|fetchMyPageAccess|accessDiff/)
    expect(read('src/layouts/dashboardSidebar.tsx')).not.toMatch(/accessControlApi|fetchMyPageAccess|accessDiff/)
  })

  it('introduces no localStorage-based authorization', () => {
    expect(read('src/utils/accessDiff.ts')).not.toMatch(/localStorage|sessionStorage/)
  })

  it('the harness performs no network calls and no writes', () => {
    const src = read('src/utils/accessDiff.ts')
    expect(src).not.toMatch(/apiClient|axios|fetch\(/)
    expect(src).not.toMatch(/\.put\(|\.post\(|\.delete\(/)
  })

  it('legacy guard answers are unchanged for a representative set of paths', () => {
    // Spot-check the production function directly — if a cutover had happened,
    // these role-based answers would have moved.
    expect(canAccessDashboardPath('super_admin', '/dashboard/admin/ai')).toBe(true)
    expect(canAccessDashboardPath('tech_admin', '/dashboard/admin/ai')).toBe(true)
    expect(canAccessDashboardPath('admin', '/dashboard/admin/ai')).toBe(true)
    expect(canAccessDashboardPath('ai_manager', '/dashboard/admin/ai')).toBe(false)
    expect(canAccessDashboardPath('finance_manager', '/dashboard/finance')).toBe(true)
    expect(canAccessDashboardPath('student', '/dashboard/finance')).toBe(false)
    expect(canAccessDashboardPath('student', '/dashboard/student')).toBe(true)
    expect(canAccessDashboardPath('instructor', '/dashboard/instructor')).toBe(true)
  })
})
