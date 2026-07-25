#!/usr/bin/env node
/**
 * M5.c — initial-payload report.
 *
 * `npm run build` prints every chunk, which does not answer the question that matters:
 * what does a first-time visitor actually download before the page is interactive?
 * This reads dist/index.html and reports only the modulepreloaded graph, in gzip bytes.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join } from 'node:path'

const html = readFileSync('dist/index.html', 'utf8')
const kb = (n) => (n / 1024).toFixed(1).padStart(7) + ' KB'

const initial = [...new Set([
  ...[...html.matchAll(/href="\/([^"]+\.(?:js|css))"/g)].map((m) => m[1]),
  ...[...html.matchAll(/src="\/([^"]+\.js)"/g)].map((m) => m[1]),
])]

let totalJs = 0
let totalCss = 0
let largest = { name: '', size: 0 }

console.log('INITIAL PAYLOAD (preloaded by index.html)\n')
const rows = initial.map((rel) => {
  const raw = readFileSync(join('dist', rel))
  const gz = gzipSync(raw).length
  if (rel.endsWith('.css')) totalCss += gz
  else {
    totalJs += gz
    if (gz > largest.size) largest = { name: rel.split('/').pop(), size: gz }
  }
  return { rel, raw: raw.length, gz }
}).sort((a, b) => b.gz - a.gz)

for (const r of rows) console.log(`  ${kb(r.gz)} gz  ${kb(r.raw)} raw   ${r.rel.split('/').pop()}`)

console.log(`\n  ${kb(totalJs)} gz  TOTAL initial JS`)
console.log(`  ${kb(totalCss)} gz  TOTAL initial CSS`)
console.log(`  ${kb(largest.size)} gz  LARGEST initial chunk — ${largest.name}`)

// Everything else ships lazily; report the heaviest so regressions are visible.
const all = readdirSync('dist/assets').filter((f) => f.endsWith('.js'))
const lazy = all
  .filter((f) => !initial.some((i) => i.endsWith(f)))
  .map((f) => ({ f, gz: gzipSync(readFileSync(join('dist/assets', f))).length }))
  .sort((a, b) => b.gz - a.gz)
  .slice(0, 8)

console.log('\nHEAVIEST LAZY CHUNKS (loaded on demand)\n')
for (const l of lazy) console.log(`  ${kb(l.gz)} gz   ${l.f}`)

const BUDGET = 250 * 1024
console.log(
  `\n${largest.size <= BUDGET ? '✓' : '✗'} largest initial chunk ${(largest.size / 1024).toFixed(1)}KB gz` +
  ` vs 250KB budget (master-plan M5 DoD)`,
)
process.exit(largest.size <= BUDGET ? 0 : 1)
