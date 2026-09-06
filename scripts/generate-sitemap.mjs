#!/usr/bin/env node
/**
 * M6.c — static sitemap.xml + robots.txt for the public site.
 * `node scripts/generate-sitemap.mjs` regenerates both under public/.
 * Routes come from scripts/public-routes.mjs (single source of truth, also
 * enforced by src/test/publicSeoCoverage.test.ts). Dynamic :slug detail pages
 * are intentionally absent — they need a server-side or build-time data pass.
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { PUBLIC_ROUTES, SITE_ORIGIN } from './public-routes.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const urls = PUBLIC_ROUTES.map(({ path, priority }) => `  <url>
    <loc>${SITE_ORIGIN}${path === '/' ? '/' : path}</loc>
    <changefreq>weekly</changefreq>
    <priority>${priority.toFixed(1)}</priority>
  </url>`).join('\n')

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`

const robots = `User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /thank-you
Disallow: /reset-password
Disallow: /forgot-password

Sitemap: ${SITE_ORIGIN}/sitemap.xml
`

writeFileSync(join(root, 'public/sitemap.xml'), sitemap)
writeFileSync(join(root, 'public/robots.txt'), robots)
console.log(`✓ public/sitemap.xml (${PUBLIC_ROUTES.length} URLs) + public/robots.txt`)
