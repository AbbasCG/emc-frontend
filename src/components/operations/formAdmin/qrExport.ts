import QRCode from 'qrcode'

/**
 * QR codes for form addresses, made in the browser with the `qrcode` package the app already uses.
 *
 * WHAT A QR CODE HOLDS: the address and nothing else. No title, no question, no answer, no person: a printed code is readable
 * by anyone who sees it, so it can only ever carry what a link carries. Everything is generated here, on the screen, so a
 * share link's token is never sent anywhere to be turned into a picture.
 */

const OPTIONS = { margin: 4, errorCorrectionLevel: 'M' as const }

/** A PNG of the code as a data URL, `size` pixels square. */
export function qrPngDataUrl(url: string, size = 1024): Promise<string> {
  return QRCode.toDataURL(url, { ...OPTIONS, width: size })
}

/** The code as SVG markup (vector: stays sharp at any print size). */
export function qrSvgMarkup(url: string): Promise<string> {
  return QRCode.toString(url, { ...OPTIONS, type: 'svg' })
}

function triggerDownload(href: string, fileName: string) {
  const link = document.createElement('a')
  link.href = href
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
}

export function downloadPng(dataUrl: string, fileName: string) {
  triggerDownload(dataUrl, fileName)
}

export function downloadSvg(markup: string, fileName: string) {
  const blob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' })
  const href = URL.createObjectURL(blob)
  try {
    triggerDownload(href, fileName)
  } finally {
    URL.revokeObjectURL(href)
  }
}

/** A file name from the form's slug: letters and digits only, so every system accepts it. */
export function qrFileName(slug: string, kind: 'png' | 'svg', suffix = ''): string {
  const safe = slug.replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-+|-+$/g, '') || 'form'

  return `emc-form-${safe}${suffix ? `-${suffix}` : ''}-qr.${kind}`
}

const escapeHtml = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** The page that is printed: a title, the code large and centred, the address under it in plain text. */
export function printLayoutHtml(opts: { title: string; caption: string; url: string; svg: string }): string {
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<title>${escapeHtml(opts.title)}</title>
<style>
  @page { size: A4 portrait; margin: 18mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: white; color: black; font-family: system-ui, 'Segoe UI', Tahoma, sans-serif; }
  main { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14mm; text-align: center; }
  h1 { margin: 0; font-size: 26pt; line-height: 1.4; }
  p { margin: 0; font-size: 13pt; color: dimgray; }
  .qr { width: 120mm; height: 120mm; }
  .qr svg { width: 100%; height: 100%; display: block; }
  .url { direction: ltr; font-family: ui-monospace, Consolas, monospace; font-size: 11pt; color: black; word-break: break-all; max-width: 150mm; }
</style>
</head>
<body>
<main>
  <h1>${escapeHtml(opts.title)}</h1>
  <p>${escapeHtml(opts.caption)}</p>
  <div class="qr" role="img" aria-label="${escapeHtml(opts.caption)}">${opts.svg}</div>
  <div class="url">${escapeHtml(opts.url)}</div>
</main>
</body>
</html>`
}

/** Opens the browser's print dialog on the print layout, in a hidden frame so nothing on the current page is disturbed. */
export function printQr(opts: { title: string; caption: string; url: string; svg: string }): void {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0;visibility:hidden'
  frame.srcdoc = printLayoutHtml(opts)
  frame.onload = () => {
    const win = frame.contentWindow
    if (!win) return frame.remove()
    win.addEventListener('afterprint', () => frame.remove())
    win.focus()
    win.print()
    // Some browsers never fire afterprint: do not leave the frame behind.
    setTimeout(() => frame.remove(), 60_000)
  }
  document.body.appendChild(frame)
}
