#!/usr/bin/env node
/**
 * Build-time prerender of the public pages (founder decision 2026-08-07, gate 10 option a).
 *
 * The problem it solves: the app is a client-rendered SPA served from an empty
 * `<div id="root">`, so nothing paints until the JS parses, executes and mounts. On
 * mobile emulation that put FCP and LCP at the same ~6.5s no matter how small the bundle
 * got — a structural ceiling, not a bundle problem (see docs/03-changes/M5-performance.md §4).
 *
 * What this does: after `vite build`, load each public route in headless Chromium against
 * the built output, then write the resulting DOM back over that route's index.html. The
 * browser now paints real markup immediately and React takes over on top of it.
 *
 * Deliberate choices:
 *  - Chromium comes from Playwright, already a devDependency — no new package, no puppeteer.
 *  - API calls are stubbed with empty payloads rather than left to fail. A prerendered
 *    error state would be baked into the HTML and shown to every visitor; an empty state is
 *    what a real first paint looks like anyway, and React replaces it once data arrives.
 *  - The route list is `scripts/public-routes.mjs`, the same source the sitemap and the SEO
 *    coverage test use. One list, so the three can never drift apart.
 *  - Each page is verified before it is written (see checkPage): a page that came out blank,
 *    error-boundaried, or without its <h1> is REJECTED and the route keeps its CSR shell.
 *    Shipping a broken prerender is worse than shipping none.
 *
 * Hosting requirement: the server must serve /about/index.html for /about (and still fall
 * back to /index.html for unknown paths, so client routing keeps working). Documented in
 * docs/04-references/release-and-deploy.md.
 *
 * Usage: npm run prerender   (or `npm run build:prod`, which chains build + prerender)
 */
import { chromium } from '@playwright/test'
import { createServer } from 'node:http'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { PUBLIC_ROUTES, SITE_ORIGIN } from './public-routes.mjs'

const DIST = path.resolve(process.cwd(), 'dist')
const PORT = Number(process.env.PRERENDER_PORT ?? 4183)
const ORIGIN = `http://127.0.0.1:${PORT}`

if (!existsSync(path.join(DIST, 'index.html'))) {
  console.error('✗ dist/index.html not found — run `npm run build` first.')
  process.exit(1)
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.otf': 'font/otf', '.txt': 'text/plain',
  '.xml': 'application/xml', '.webmanifest': 'application/manifest+json',
}

/** Static server with SPA fallback — mirrors how the built app is actually served. */
function serveDist() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0])
      const candidate = path.join(DIST, urlPath)
      const isFile = path.extname(candidate) !== ''
      try {
        const file = isFile ? candidate : path.join(DIST, 'index.html')
        const body = await readFile(file)
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream' })
        res.end(body)
      } catch {
        if (isFile) { res.writeHead(404); res.end('not found'); return }
        res.writeHead(500); res.end('server error')
      }
    })
    server.listen(PORT, '127.0.0.1', () => resolve(server))
  })
}

/**
 * Reasons to reject a prerendered page. Each one would be a visible regression if written:
 * an empty shell is no better than CSR, and a baked error is strictly worse.
 */
function checkPage({ html, bodyText, hasH1, consoleErrors }) {
  const problems = []
  if (!/<div id="root">\s*<[a-z]/i.test(html)) problems.push('root is still empty')
  if (bodyText.trim().length < 200) problems.push(`only ${bodyText.trim().length} chars of text rendered`)
  if (!hasH1) problems.push('no <h1> in the output')
  if (!/<html[^>]*lang="ar"/i.test(html)) problems.push('not prerendered in Arabic (lang)')
  if (!/<html[^>]*dir="rtl"/i.test(html)) problems.push('not prerendered RTL (dir)')
  if (html.includes('127.0.0.1')) problems.push('build-time localhost URL leaked into the output')
  for (const marker of ['حدث خطأ', 'Something went wrong', 'error-boundary']) {
    if (bodyText.includes(marker) || html.includes(marker)) problems.push(`error state baked in ("${marker}")`)
  }
  if (consoleErrors.length) problems.push(`${consoleErrors.length} console error(s): ${consoleErrors[0].slice(0, 120)}`)
  return problems
}

/**
 * The pristine built head, captured BEFORE any route overwrites dist/index.html.
 *
 * Only the prerendered <body> is kept; the head always comes from this template. Capturing
 * the live head instead would bake react-helmet-async's tags into the file, and since those
 * are re-inserted by helmet on mount the page ended up with four <title> tags and three
 * canonicals — Lighthouse SEO 100 -> 92 ("multiple conflicting URLs"). Meta therefore keeps
 * working exactly as it does today: helmet owns it at runtime.
 */
const template = await readFile(path.join(DIST, 'index.html'), 'utf8')
const templateHead = /<head[^>]*>([\s\S]*?)<\/head>/i.exec(template)?.[1] ?? ''
if (!templateHead) {
  console.error('✗ could not read <head> from dist/index.html')
  process.exit(1)
}

const server = await serveDist()
const browser = await chromium.launch()
const results = { written: [], skipped: [] }

try {
  for (const route of PUBLIC_ROUTES) {
    // Arabic is the source language. Without an explicit locale the i18n detector reads
    // Chromium's default (en-US) and bakes lang="en" dir="ltr" into every page, so every
    // visitor would first-paint English LTR before React corrected it.
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'ar-EG' })

    // Stub the API so pages render their empty state instead of an error state.
    await context.route('**/api/**', (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) }),
    )

    const page = await context.newPage()
    const consoleErrors = []
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
    page.on('pageerror', (e) => consoleErrors.push(String(e)))

    try {
      await page.goto(ORIGIN + route.path, { waitUntil: 'networkidle', timeout: 45_000 })
      // Lazy route chunks resolve a tick after mount; wait for real content, not a timer.
      await page.waitForSelector('#root > *', { timeout: 20_000 })
      await page.waitForLoadState('networkidle')

      // PublicSeo builds canonical/og:url from window.location.origin, which during
      // prerender is this throwaway localhost server. Left alone, every public page would
      // ship a canonical pointing at 127.0.0.1 — Lighthouse SEO caught it at 100 -> 92,
      // and search engines would have seen it too.
      const rendered = (await page.content()).split(ORIGIN).join(SITE_ORIGIN)
      const bodyMatch = /<body([^>]*)>([\s\S]*)<\/body>/i.exec(rendered)
      const htmlAttrs = /<html([^>]*)>/i.exec(rendered)?.[1] ?? ' lang="ar" dir="rtl"'
      const html = bodyMatch
        ? `<!DOCTYPE html><html${htmlAttrs}><head>${templateHead}</head><body${bodyMatch[1]}>${bodyMatch[2]}</body></html>`
        : rendered
      const bodyText = await page.evaluate(() => document.body.innerText)
      const hasH1 = (await page.locator('h1').count()) > 0

      const problems = checkPage({ html, bodyText, hasH1, consoleErrors })
      if (problems.length) {
        results.skipped.push({ path: route.path, problems })
      } else {
        const outDir = route.path === '/' ? DIST : path.join(DIST, route.path)
        await mkdir(outDir, { recursive: true })
        await writeFile(path.join(outDir, 'index.html'), html, 'utf8')
        results.written.push({ path: route.path, bytes: html.length, text: bodyText.trim().length })
      }
    } catch (err) {
      results.skipped.push({ path: route.path, problems: [String(err).split('\n')[0]] })
    } finally {
      await context.close()
    }
  }
} finally {
  await browser.close()
  server.close()
}

for (const r of results.written) {
  console.log(`  ✓ ${r.path.padEnd(24)} ${String(Math.round(r.bytes / 1024)).padStart(4)}KB html · ${r.text} chars of text`)
}
for (const s of results.skipped) {
  console.log(`  ⨯ ${s.path.padEnd(24)} SKIPPED (kept CSR shell) — ${s.problems.join('; ')}`)
}

console.log(`\nprerendered ${results.written.length}/${PUBLIC_ROUTES.length} public routes`)

// A skip is a real signal: that page renders nothing useful without a backend, or it errors.
// Never fail silently — but never ship a bad page either; the route just stays client-rendered.
if (results.skipped.length) {
  console.log(`${results.skipped.length} route(s) left as CSR — see reasons above.`)
}
if (!results.written.length) {
  console.error('✗ nothing was prerendered — treating as a failure.')
  process.exit(1)
}
