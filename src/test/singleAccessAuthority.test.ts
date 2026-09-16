import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * PHASE I — ONE PAGE-ACCESS AUTHORITY.
 *
 * After the cutover the browser must hold exactly one page-access decision
 * path: the backend manifest, read through PageAccessContext. This suite is an
 * architecture guard — it scans the real source tree so a second decision path
 * cannot be reintroduced quietly by a future change.
 *
 * It does NOT assert that legacy code was deleted. dashboardAccess.ts still
 * supplies genuine route metadata (normalizeRole, getDashboardPathByRole,
 * labels, prefix maps) that the UI legitimately needs, and the Phase 2F diff
 * harness deliberately executes the real legacy rule in order to compare the
 * two systems. What must not happen is either one being used to GATE a page.
 */

const SRC = resolve(process.cwd(), 'src')

/** Files allowed to reference the legacy path rule, each for a stated reason. */
const LEGACY_RULE_ALLOWLIST = new Set([
  // Defines it, and uses it as a post-login redirect hint (not enforcement).
  'utils/dashboardAccess.ts',
  // The measurement harness: comparing systems requires running the real rule.
  'utils/accessDiff.ts',
])

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)

    if (statSync(full).isDirectory()) {
      // Tests describe behaviour rather than perform it.
      if (entry === 'test') continue
      sourceFiles(full, acc)
      continue
    }

    if (/\.(ts|tsx)$/.test(entry)) acc.push(full)
  }

  return acc
}

/** Strip comments so the scan tests CODE, not prose describing the rule. */
function codeOf(file: string): string {
  return readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
}

describe('single page-access authority', () => {
  const files = sourceFiles(SRC)

  it('scans a real source tree', () => {
    expect(files.length).toBeGreaterThan(100)
  })

  it('no production module outside the allowlist calls the legacy path rule', () => {
    const offenders = files
      .map((f) => relative(SRC, f).replace(/\\/g, '/'))
      .filter((rel) => !LEGACY_RULE_ALLOWLIST.has(rel))
      .filter((rel) => /canAccessDashboardPath\s*\(/.test(codeOf(join(SRC, rel))))

    expect(
      offenders,
      'These modules gate on the legacy role matrix. Page access is the backend manifest.',
    ).toEqual([])
  })

  it('the route guard and the sidebar filter read the same manifest', () => {
    const guard = codeOf(join(SRC, 'components/DashboardAccessGuard.tsx'))
    const filter = codeOf(join(SRC, 'utils/sidebarAccessFilter.ts'))

    // Both funnel through the shared matcher over the backend's own rows.
    expect(guard).toMatch(/usePageAccess/)
    expect(filter).toMatch(/isPathAllowed/)

    // Neither invents its own rule.
    expect(guard).not.toMatch(/canAccessDashboardPath\s*\(/)
    expect(filter).not.toMatch(/canAccessDashboardPath\s*\(/)
  })

  it('no production module persists an access decision to browser storage', () => {
    const accessModules = [
      'utils/pageAccessMatch.ts',
      'utils/sidebarAccessFilter.ts',
      'contexts/PageAccessContext.tsx',
      'components/DashboardAccessGuard.tsx',
    ]

    for (const rel of accessModules) {
      expect(codeOf(join(SRC, rel)), `${rel} must not persist authorization`).not.toMatch(
        /localStorage|sessionStorage|indexedDB/,
      )
    }
  })

  it('the rejected local override store was not resurrected', () => {
    const offenders = files
      .map((f) => relative(SRC, f).replace(/\\/g, '/'))
      .filter((rel) => /userPageOverridesStore/.test(codeOf(join(SRC, rel))))

    expect(offenders).toEqual([])
  })

  it('the diff harness stays out of production', () => {
    const importers = files
      .map((f) => relative(SRC, f).replace(/\\/g, '/'))
      .filter((rel) => rel !== 'utils/accessDiff.ts')
      .filter((rel) => /from '@\/utils\/accessDiff'/.test(codeOf(join(SRC, rel))))

    expect(importers, 'accessDiff is measurement only and must stay unimported.').toEqual([])
  })
})
