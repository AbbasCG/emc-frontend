import { describe, expect, it } from 'vitest'
// Single source of truth shared with scripts/generate-sitemap.mjs.
import { NOINDEX_PAGES, PUBLIC_ROUTES, SITE_ORIGIN } from '../../scripts/public-routes.mjs'
import sitemapXml from '../../public/sitemap.xml?raw'
import robotsTxt from '../../public/robots.txt?raw'

/**
 * M6.e — the automated "no public page without meta" gate.
 * Source-level assertion: every page in the canonical public-routes list must
 * render <PublicSeo/>; noIndex utility pages must pass noIndex; and the
 * committed sitemap must stay in sync with the list that generated it.
 */

// Raw sources of every page module, keyed by repo-relative path.
const pageSources = Object.fromEntries(
  Object.entries(
    import.meta.glob('../pages/**/*.tsx', { query: '?raw', import: 'default', eager: true }),
  ).map(([key, src]) => [key.replace(/^\.\.\//, 'src/'), src as string]),
)

function sourceOf(file: string): string {
  const src = pageSources[file]
  if (!src) throw new Error(`page module not found for ${file} — update scripts/public-routes.mjs`)
  return src
}

describe('M6 SEO coverage', () => {
  it.each(PUBLIC_ROUTES.map((r) => [r.path, r.file] as const))(
    'public page %s renders PublicSeo',
    (_path, file) => {
      expect(sourceOf(file)).toContain('<PublicSeo')
    },
  )

  it.each(NOINDEX_PAGES.map((f) => [f] as const))(
    '%s renders PublicSeo with noIndex',
    (file) => {
      const src = sourceOf(file)
      expect(src).toContain('<PublicSeo')
      expect(src).toContain('noIndex')
    },
  )

  it('committed sitemap.xml matches the canonical route list', () => {
    for (const { path } of PUBLIC_ROUTES) {
      expect(sitemapXml).toContain(`<loc>${SITE_ORIGIN}${path === '/' ? '/' : path}</loc>`)
    }
    const count = (sitemapXml.match(/<url>/g) ?? []).length
    expect(count).toBe(PUBLIC_ROUTES.length)
  })

  it('robots.txt allows the site, blocks the dashboard, and points at the sitemap', () => {
    expect(robotsTxt).toContain('Disallow: /dashboard')
    expect(robotsTxt).toContain(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`)
  })
})
