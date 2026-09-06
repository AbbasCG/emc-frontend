#!/usr/bin/env node
/**
 * M7.C — brand gate: raw hex colours belong in the design tokens, not in components.
 *
 * The tokens live in `tailwind.config.js` (+ the CSS variables in `src/index.css`).
 * Every colour a component uses should come through a token class — `text-navy`,
 * `bg-customOrange`, `border-brand-500` — so the whole app re-skins from one place and
 * the V3 brand laws (no sea↔fire gradient, no sky/orange as small text on light) stay
 * enforceable. A literal `text-[#0C2A4B]` bypasses all of that.
 *
 * Why a ratchet instead of a flat ban: the M0 V1→V3 remap rewrote colours in place as
 * raw hex, leaving 5,494 occurrences across 384 files. Converting them all is a wide
 * refactor that plan v2.1 (economy mode) rules out. So this gate holds the line instead:
 *
 *   • a file NOT in the baseline must contain zero raw hex — all new code uses tokens;
 *   • a file IN the baseline may never exceed its recorded count — legacy only shrinks.
 *
 * The counts also shrink automatically as files are cleaned: run with `--update` to
 * re-record (deliberate act, reviewed as its own commit).
 *
 * The complementary ESLint rule (eslint.config.js) gives the same feedback in-editor for
 * every file that is already clean.
 *
 * Usage: npm run check:brand   ·   node scripts/check-raw-hex.mjs --update
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const SRC = path.join(ROOT, 'src')
const BASELINE = path.join(ROOT, 'scripts', 'raw-hex-baseline.json')
const HEX = /#[0-9a-fA-F]{3,8}\b/g

// Only src/**/*.{ts,tsx} is scanned. The token definitions themselves — tailwind.config.js
// and the CSS variables in src/index.css — are where raw hex belongs, and are out of scope
// by construction.
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.d\.ts$/.test(entry.name)) out.push(full)
  }
  return out
}

const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/')

const counts = {}
for (const file of walk(SRC)) {
  const key = rel(file)
  const matches = fs.readFileSync(file, 'utf8').match(HEX)
  if (matches?.length) counts[key] = matches.length
}

if (process.argv.includes('--update')) {
  const sorted = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)))
  const total = Object.values(sorted).reduce((a, b) => a + b, 0)
  fs.writeFileSync(BASELINE, JSON.stringify({ total, files: sorted }, null, 2) + '\n')
  console.log(`baseline written: ${Object.keys(sorted).length} files, ${total} occurrences`)
  process.exit(0)
}

if (!fs.existsSync(BASELINE)) {
  console.error(`✗ missing ${rel(BASELINE)} — run: node scripts/check-raw-hex.mjs --update`)
  process.exit(1)
}
const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'))

const introduced = []
const grown = []
for (const [file, n] of Object.entries(counts)) {
  const allowed = baseline.files[file]
  if (allowed === undefined) introduced.push({ file, n })
  else if (n > allowed) grown.push({ file, n, allowed })
}

if (introduced.length || grown.length) {
  console.error('✗ raw hex colours must come from the design tokens (tailwind.config.js).\n')
  for (const { file, n } of introduced) {
    console.error(`  NEW FILE  ${file} — ${n} raw hex value${n === 1 ? '' : 's'}`)
  }
  for (const { file, n, allowed } of grown) {
    console.error(`  GREW      ${file} — ${n} raw hex values, baseline allows ${allowed}`)
  }
  console.error(
    '\n  Use a token class instead: text-navy (#0C2A4B) · text-customBlue (#0077B6) ·' +
      '\n  bg-customOrange (#F28C00) · text-night (#06182C) · brand-50…950 for the sea scale.' +
      '\n  Adding a genuinely new colour means adding a token, not a literal.',
  )
  process.exit(1)
}

const total = Object.values(counts).reduce((a, b) => a + b, 0)
const shrunk = baseline.total - total
console.log(
  `✓ raw hex gate: ${total} occurrences in ${Object.keys(counts).length} files` +
    (shrunk > 0 ? ` — ${shrunk} fewer than baseline (run --update to lock the win in)` : ' — at baseline'),
)
