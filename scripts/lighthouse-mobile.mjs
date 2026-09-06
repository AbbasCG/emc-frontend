#!/usr/bin/env node
/**
 * M5.a — Lighthouse with mobile emulation over the four reference pages.
 *
 * Usage:
 *   npm run build && npm run preview &      # serves dist on :4173
 *   node scripts/lighthouse-mobile.mjs
 *
 * Mobile emulation is the point: ~40% of the audience is phone-only (brand ref V3), so
 * a desktop score would flatter the result and hide exactly the regressions that matter.
 * Writes docs/03-changes/lighthouse-mobile.json for before/after comparison.
 */
import { writeFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { spawn } from 'node:child_process'

const BASE = process.env.LH_BASE ?? 'http://127.0.0.1:4173'
const PAGES = [
  { name: 'home', path: '/' },
  { name: 'courses', path: '/courses' },
  { name: 'course-detail', path: process.env.LH_COURSE_PATH ?? '/courses/1' },
  { name: 'login', path: '/login' },
]

/** Playwright already downloads Chromium; reuse it instead of requiring a system Chrome. */
function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH
  const root = join(process.env.LOCALAPPDATA ?? process.env.HOME ?? '', 'ms-playwright')
  if (!existsSync(root)) return null
  const dirs = readdirSync(root).filter((d) => d.startsWith('chromium-')).sort().reverse()
  for (const d of dirs) {
    for (const exe of ['chrome-win64/chrome.exe', 'chrome-linux/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium']) {
      const p = join(root, d, exe)
      if (existsSync(p)) return p
    }
  }
  return null
}

const chromePath = findChrome()
if (!chromePath) {
  console.error('✗ no Chrome/Chromium found. Set CHROME_PATH, or run `npx playwright install chromium`.')
  process.exit(2)
}
process.env.CHROME_PATH = chromePath

function runLighthouse(url) {
  return new Promise((resolve) => {
    const args = [
      'lighthouse', url,
      '--quiet',
      '--output=json',
      '--only-categories=performance,accessibility,best-practices,seo',
      '--form-factor=mobile',
      '--screenEmulation.mobile',
      '--throttling-method=simulate',
      '--chrome-flags=--headless=new --no-sandbox --disable-gpu',
    ]
    const child = spawn('npx', args, { shell: true })
    let out = ''
    child.stdout.on('data', (d) => (out += d))
    child.stderr.on('data', () => {})
    child.on('close', () => {
      try {
        resolve(JSON.parse(out.slice(out.indexOf('{'))))
      } catch {
        resolve(null)
      }
    })
  })
}

const results = {}
for (const page of PAGES) {
  const url = BASE + page.path
  process.stdout.write(`  auditing ${page.name.padEnd(14)} ${url} … `)
  const lhr = await runLighthouse(url)
  if (!lhr?.categories) {
    console.log('FAILED')
    results[page.name] = { url, error: 'lighthouse did not return a report' }
    continue
  }
  const score = (c) => Math.round((lhr.categories[c]?.score ?? 0) * 100)
  const r = {
    url,
    performance: score('performance'),
    accessibility: score('accessibility'),
    bestPractices: score('best-practices'),
    seo: score('seo'),
    lcpMs: Math.round(lhr.audits['largest-contentful-paint']?.numericValue ?? 0),
    tbtMs: Math.round(lhr.audits['total-blocking-time']?.numericValue ?? 0),
    cls: Number((lhr.audits['cumulative-layout-shift']?.numericValue ?? 0).toFixed(3)),
  }
  results[page.name] = r
  console.log(`perf ${r.performance}  a11y ${r.accessibility}  bp ${r.bestPractices}  seo ${r.seo}`)
}

writeFileSync('docs/03-changes/lighthouse-mobile.json', JSON.stringify(results, null, 2) + '\n')

console.log('\nsummary (mobile emulation)')
console.table(
  Object.fromEntries(
    Object.entries(results).map(([k, v]) => [
      k,
      v.error ? { error: v.error } : { perf: v.performance, a11y: v.accessibility, bp: v.bestPractices, seo: v.seo, LCP: v.lcpMs + 'ms', TBT: v.tbtMs + 'ms', CLS: v.cls },
    ]),
  ),
)
console.log('\nwritten to docs/03-changes/lighthouse-mobile.json')
