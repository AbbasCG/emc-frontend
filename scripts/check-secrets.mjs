#!/usr/bin/env node
/**
 * M4.5 — production leak scan.
 *
 * Two things this catches that a reviewer reliably will not:
 *   1. a credential hard-coded into the shipped bundle or into source;
 *   2. an unguarded `console.*` in our own source. Several API helpers log full
 *      request/response bodies — volunteer PII, student registrations, placement exam
 *      answers — which would land in every production visitor's browser console.
 *      `import.meta.env.DEV` is statically false in a production build, so a guarded
 *      call is dead-code-eliminated; that guard is the enforcement point, because
 *      Vite 8's default Oxc minifier offers no `drop` option.
 *
 * Run against a production build:  npm run build && node scripts/check-secrets.mjs
 * Exits non-zero on any finding, so it can gate CI.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'

const DIST = 'dist'
const SRC = 'src'

/** Credential shapes. Deliberately narrow — a noisy scanner gets muted, which is worse. */
const SECRET_PATTERNS = [
  { name: 'AWS access key id', re: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: 'Google API key', re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { name: 'Slack token', re: /\bxox[abprs]-[0-9A-Za-z-]{10,}\b/g },
  { name: 'Stripe secret key', re: /\bsk_(live|test)_[0-9A-Za-z]{16,}\b/g },
  { name: 'GitHub token', re: /\bgh[pousr]_[0-9A-Za-z]{36,}\b/g },
  { name: 'private key block', re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/g },
  { name: 'JWT literal', re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g },
  // A Laravel/Sanctum style secret assigned to an obviously-secret identifier.
  { name: 'hard-coded secret assignment', re: /\b(?:api|secret|private|auth)[_-]?(?:key|token|secret)\s*[:=]\s*['"][A-Za-z0-9_\-/+=]{20,}['"]/gi },
]

/** Env vars that must never be inlined: Vite only exposes VITE_*, so anything else here is a mistake. */
const NON_VITE_ENV = /\bprocess\.env\.(?!NODE_ENV\b)[A-Z_]+/g

function walk(dir, exts, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, exts, out)
    else if (exts.includes(extname(p))) out.push(p)
  }
  return out
}

const findings = []

// ── 1. secrets in shipped assets ────────────────────────────────────────────────
if (!existsSync(DIST)) {
  console.error(`✗ ${DIST}/ not found — run \`npm run build\` first.`)
  process.exit(2)
}

const distFiles = walk(DIST, ['.js', '.mjs', '.css', '.html', '.json', '.map'])
for (const file of distFiles) {
  const text = readFileSync(file, 'utf8')
  for (const { name, re } of SECRET_PATTERNS) {
    re.lastIndex = 0
    const hit = re.exec(text)
    if (hit) findings.push(`${file}: possible ${name} — ${hit[0].slice(0, 24)}…`)
  }
  const envHit = NON_VITE_ENV.exec(text)
  NON_VITE_ENV.lastIndex = 0
  if (envHit) findings.push(`${file}: non-VITE env reference survived into the bundle — ${envHit[0]}`)
}

// ── 2. unguarded console.* in our own source ───────────────────────────────────
// Many API helpers log full request/response bodies. Vite 8's default Oxc minifier has
// no `drop` option, so the guard has to live in the source: `import.meta.env.DEV` is
// statically false in a production build, so a guarded call is eliminated entirely.
// Vendor chunks are third-party and out of scope — we only police what we author.
const CONSOLE_RE = /(^|[^.\w])console\s*\.\s*(?:log|info|debug|warn|error|table|dir|trace|group|groupEnd)\s*\(/
const DEV = 'import.meta.env.DEV'
const srcFiles = walk(SRC, ['.ts', '.tsx']).filter((f) => !/[\\/]test[\\/]/.test(f))

/**
 * Tracks brace depth so an enclosing `if (import.meta.env.DEV) { … }` counts however
 * many lines away it opened. A fixed lookback window silently misses guards that sit a
 * few lines up, which is worse than no check at all — it reads as a clean result.
 *
 * Three guard shapes are recognised, all of which occur in this codebase:
 *   1. block          `if (import.meta.env.DEV) { … }`
 *   2. single line    `if (import.meta.env.DEV) console.warn(…)`
 *   3. early return   `if (!import.meta.env.DEV) return`  — makes the rest dev-only
 */
function unguardedConsoleLines(source) {
  const lines = source.split('\n')
  const out = []
  let depth = 0
  /** Brace depths at which a DEV guard is currently open. */
  const devDepths = new Set()
  /** Depth of a function body made dev-only by an early return. */
  const devReturnDepths = new Set()

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const opensDevBlock = line.includes(DEV) && !line.includes(`!${DEV}`) && line.includes('{')
    const devEarlyReturn = line.includes(`!${DEV}`) && /\breturn\b/.test(line)

    const inDev =
      line.includes(DEV) ||
      [...devDepths].some((d) => depth >= d) ||
      [...devReturnDepths].some((d) => depth >= d)

    if (CONSOLE_RE.test(line) && !inDev) out.push({ line: i + 1, text: line.trim() })

    const opens = (line.match(/\{/g) ?? []).length
    const closes = (line.match(/\}/g) ?? []).length
    if (opensDevBlock) devDepths.add(depth + 1)
    if (devEarlyReturn) devReturnDepths.add(depth)
    depth += opens - closes
    for (const d of [...devDepths]) if (depth < d) devDepths.delete(d)
    for (const d of [...devReturnDepths]) if (depth < d) devReturnDepths.delete(d)
  }
  return out
}

for (const file of srcFiles) {
  for (const { line, text } of unguardedConsoleLines(readFileSync(file, 'utf8'))) {
    findings.push(`${file}:${line}: unguarded console.* — wrap in \`if (${DEV})\`\n      ${text.slice(0, 110)}`)
  }
}

// ── 3. secrets committed in source ─────────────────────────────────────────────
for (const file of srcFiles) {
  const text = readFileSync(file, 'utf8')
  for (const { name, re } of SECRET_PATTERNS) {
    re.lastIndex = 0
    const hit = re.exec(text)
    if (hit) findings.push(`${file}: possible ${name} committed in source — ${hit[0].slice(0, 24)}…`)
  }
}

if (findings.length > 0) {
  console.error('✗ production leak scan failed:\n')
  for (const f of findings) console.error('  • ' + f)
  console.error(`\n${findings.length} finding(s).`)
  process.exit(1)
}

console.log(`✓ production leak scan clean (${distFiles.length} built assets + ${SRC}/ scanned)`)
