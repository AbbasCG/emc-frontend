/**
 * Public addresses of a form. The address is built here, on the screen, from the site's own origin: the server only ever
 * stores a form's slug and a link's hash, so it never has to know what domain the site is served from.
 */

/** The site's public origin: the configured public URL when there is one, otherwise the origin this page is served from. */
export function siteOrigin(): string {
  const configured = String(import.meta.env.VITE_PUBLIC_URL ?? '').trim()
  const origin = configured !== '' ? configured : typeof window !== 'undefined' ? window.location.origin : ''

  return origin.replace(/\/+$/, '')
}

/** `<site>/forms/<slug>`: the address every form has had since it was created. It never changes. */
export function publicFormUrl(slug: string): string {
  return `${siteOrigin()}/forms/${encodeURIComponent(slug)}`
}

/** A share link's full address, from the path the server returned when the link was made (`/forms/<slug>/s/<token>`). */
export function shareLinkUrl(path: string): string {
  return `${siteOrigin()}${path.split('/').map((part, i) => (i === 0 ? part : encodeURIComponent(decodeURIComponent(part)))).join('/')}`
}

/** Puts text on the clipboard. Falls back to a temporary field where the async clipboard is not available. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)

      return true
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const field = document.createElement('textarea')
    field.value = text
    field.setAttribute('readonly', '')
    field.style.position = 'fixed'
    field.style.opacity = '0'
    document.body.appendChild(field)
    field.select()
    const ok = document.execCommand('copy')
    field.remove()

    return ok
  } catch {
    return false
  }
}
