/**
 * Exact path match or nested segment match (never substring collisions).
 * Strips hash from href for comparison — location.pathname does not include hash.
 */
export function routeMatchesPath(pathname: string, href: string): boolean {
  const path = href.split('#')[0] ?? href
  if (path === '' || path === '/') {
    return pathname === '/'
  }
  return pathname === path || pathname.startsWith(`${path}/`)
}
