#!/usr/bin/env node
/**
 * Honest coverage measurement (M7.A).
 *
 * Why this exists: `vitest run --coverage` under-reports the denominator. Any module
 * that is transitively lazy-imported during the suite but never executed comes back
 * from the v8 provider with an entry of 0 covered / 0 TOTAL lines instead of being
 * counted as fully uncovered — so it vanishes from the denominator entirely and every
 * percentage above it is inflated. On this repo that silently dropped 284 files and
 * 16,642 executable lines, reporting app-wide line coverage as 41.5% when the true
 * figure is 22.1%. `coverage.all: true` does not prevent it (the same files measure
 * correctly when the run does not touch them at all — see the two passes below).
 *
 * The fix is two passes:
 *   1. FULL      — the real suite, which gives trustworthy COVERED counts.
 *   2. DENOMINATOR — one tiny test file with `--coverage.all`, which touches almost
 *                    nothing and therefore reports every file's true TOTAL.
 * Merging covered-from-1 over total-from-2 gives the honest number.
 *
 * Usage: npm run coverage:truth
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const SUMMARY = 'coverage/coverage-summary.json'
const DENOMINATOR_SEED = 'src/test/apiErrors.coverage.test.ts'

/** The scope M7.A is measured on (plan v2.1 — founder decision 2026-08-07). */
const LOGICAL_SCOPE = [
  'api/',
  'utils/',
  'hooks/',
  'lib/',
  'contexts/',
  'components/ui/',
  'components/enrollment/',
]
const TARGET_PCT = 60

// Call vitest's JS entry with the current node binary rather than the `npx` shim:
// spawning a .cmd on Windows needs `shell: true`, which would put every argument
// through cmd.exe quoting for no benefit.
const VITEST_BIN = path.join('node_modules', 'vitest', 'vitest.mjs')

function run(args, label) {
  process.stderr.write(`→ ${label}\n`)
  try {
    execFileSync(process.execPath, [VITEST_BIN, 'run', ...args], { stdio: ['ignore', 'ignore', 'ignore'] })
  } catch {
    // A non-zero exit is expected: the denominator pass runs a single test file and so
    // trips the per-directory thresholds. We only care about the emitted summary.
  }
  if (!fs.existsSync(SUMMARY)) throw new Error(`${label} produced no ${SUMMARY}`)
  return JSON.parse(fs.readFileSync(SUMMARY, 'utf8'))
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'covtruth-'))
const full = run(['--coverage', '--coverage.reporter=json-summary'], 'pass 1/2: full suite (covered counts)')
fs.writeFileSync(path.join(tmp, 'full.json'), JSON.stringify(full))
const denom = run(
  [DENOMINATOR_SEED, '--coverage', '--coverage.all', '--coverage.reporter=json-summary'],
  'pass 2/2: denominator sweep (true totals)',
)

const key = (p) => p.split('\\').join('/').split('/src/')[1]
const fullByKey = new Map()
for (const [k, v] of Object.entries(full)) if (k !== 'total') fullByKey.set(key(k), v)

const rows = []
let droppedFiles = 0
let droppedLines = 0
for (const [k, v] of Object.entries(denom)) {
  if (k === 'total') continue
  const p = key(k)
  const f = fullByKey.get(p)
  const reported = f ? f.lines.total : 0
  if (reported === 0 && v.lines.total > 0) {
    droppedFiles++
    droppedLines += v.lines.total
  }
  rows.push({
    p,
    covered: f ? f.lines.covered : 0,
    total: v.lines.total,
    sCovered: f ? f.statements.covered : 0,
    sTotal: v.statements.total,
  })
}

const agg = (pred) => {
  let c = 0
  let t = 0
  let sc = 0
  let st = 0
  let n = 0
  for (const r of rows) {
    if (!pred(r.p)) continue
    n++
    c += r.covered
    t += r.total
    sc += r.sCovered
    st += r.sTotal
  }
  return { n, pct: t ? (100 * c) / t : 0, c, t, sPct: st ? (100 * sc) / st : 0, sc, st }
}
const fmt = (a) =>
  `${String(a.n).padStart(4)} files · lines ${a.pct.toFixed(2).padStart(6)}% (${a.c}/${a.t}) · stmts ${a.sPct.toFixed(2)}% (${a.sc}/${a.st})`

const inScope = (p) => LOGICAL_SCOPE.some((d) => p.startsWith(d))
const scope = agg(inScope)

console.log('\n══ measurement integrity ══')
console.log(`files silently dropped from the standard run: ${droppedFiles} (${droppedLines} executable lines)`)

console.log(`\n══ M7.A logical scope (target ≥${TARGET_PCT}% lines) ══`)
console.log(fmt(scope))
for (const d of LOGICAL_SCOPE) console.log(`  ${('src/' + d).padEnd(28)}${fmt(agg((p) => p.startsWith(d)))}`)

console.log('\n══ app-wide, honest ══')
console.log(fmt(agg(() => true)))
console.log('\n══ presentational dashboards (excluded from the scope; covered by E2E) ══')
console.log(fmt(agg((p) => !inScope(p))))

fs.rmSync(tmp, { recursive: true, force: true })

const pass = scope.pct >= TARGET_PCT
console.log(`\n${pass ? '✅' : '❌'} logical scope ${scope.pct.toFixed(2)}% vs target ${TARGET_PCT}%`)
process.exit(pass ? 0 : 1)
