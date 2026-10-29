import { afterEach, describe, expect, it, vi } from 'vitest'
import QRCode from 'qrcode'
import {
  downloadPng,
  downloadSvg,
  printLayoutHtml,
  printQr,
  qrFileName,
  qrPngDataUrl,
  qrSvgMarkup,
} from '@/components/operations/formAdmin/qrExport'
import { copyText, publicFormUrl, shareLinkUrl, siteOrigin } from '@/components/operations/formAdmin/shareUrl'

/**
 * The QR code and the addresses it carries. A QR code is readable by anyone who sees it, so what it encodes is checked here:
 * the address and nothing else.
 */

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  document.body.innerHTML = ''
})

const bytesOf = (url: string): string => {
  const qr = QRCode.create(url, { errorCorrectionLevel: 'M' })
  // The library keeps what it encoded as segments; reading them back is the content of the symbol.
  return qr.segments
    .map((s) => {
      const data = (s as unknown as { data: Uint8Array | string }).data
      // The library splits an address into the cheapest segments (bytes, alphanumerics, digits): put them back in order.
      return typeof data === 'string' ? data : new TextDecoder().decode(data)
    })
    .join('')
}

describe('what a QR code holds', () => {
  const url = 'https://emc.example/forms/survey-2026/s/Ab3dE5gH7jK9mN1pQ3sT5vX7zB9dF1hJ3kL5nP7rT9uW1yA3'

  it('encodes the address exactly and nothing else, for the public address and for a share link', () => {
    expect(bytesOf('https://emc.example/forms/survey-2026')).toBe('https://emc.example/forms/survey-2026')
    expect(bytesOf(url)).toBe(url)
  })

  it('an Arabic slug is carried percent-encoded, so every reader gets the same address', () => {
    vi.stubEnv('VITE_PUBLIC_URL', 'https://emc.example')
    const address = publicFormUrl('استبيان-٢٠٢٦')
    expect(address).toBe('https://emc.example/forms/%D8%A7%D8%B3%D8%AA%D8%A8%D9%8A%D8%A7%D9%86-%D9%A2%D9%A0%D9%A2%D9%A6')
    expect(bytesOf(address)).toBe(address)
    expect(address).toMatch(/^[\x21-\x7e]+$/)
  })

  it('the picture formats are made from that same address: a real PNG and a real SVG', async () => {
    const png = await qrPngDataUrl(url, 512)
    expect(png.startsWith('data:image/png;base64,')).toBe(true)
    const bytes = Uint8Array.from(atob(png.split(',')[1]), (c) => c.charCodeAt(0))
    expect(Array.from(bytes.slice(0, 8))).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const width = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19]
    expect(width).toBeGreaterThan(480) // a whole number of pixels per module, so a hair under the request

    const svg = await qrSvgMarkup(url)
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg).toContain('viewBox')
    expect(svg).not.toContain('<script')
    // Only the picture: the address is not written into the file as text (a scanner reads the pattern, not a string).
    expect(svg).not.toContain('emc.example')
    expect(svg).not.toContain('<text')
  })

  it('has a quiet zone around the symbol so scanners can find it', async () => {
    const svg = await qrSvgMarkup(url)
    const size = Number(/viewBox="0 0 (\d+) \d+"/.exec(svg)?.[1])
    const modules = QRCode.create(url, { errorCorrectionLevel: 'M' }).modules.size
    expect(size).toBe(modules + 8)
  })
})

describe('addresses', () => {
  it('uses the configured public site when there is one, otherwise the page origin, without a trailing slash', () => {
    vi.stubEnv('VITE_PUBLIC_URL', 'https://emc.example///')
    expect(siteOrigin()).toBe('https://emc.example')
    expect(publicFormUrl('abc')).toBe('https://emc.example/forms/abc')
    vi.stubEnv('VITE_PUBLIC_URL', '')
    expect(siteOrigin()).toBe(window.location.origin)
  })

  it('a share link address is the site plus the path the server made, with the token intact', () => {
    vi.stubEnv('VITE_PUBLIC_URL', 'https://emc.example')
    const token = 'Ab3dE5gH7jK9mN1pQ3sT5vX7zB9dF1hJ3kL5nP7rT9uW1yA3'
    expect(shareLinkUrl(`/forms/abc/s/${token}`)).toBe(`https://emc.example/forms/abc/s/${token}`)
  })

  it('copies to the clipboard, and falls back when the clipboard is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    expect(await copyText('x')).toBe(true)
    expect(writeText).toHaveBeenCalledWith('x')

    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
    document.execCommand = vi.fn().mockReturnValue(true)
    expect(await copyText('y')).toBe(true)
    expect(document.execCommand).toHaveBeenCalledWith('copy')
    expect(document.querySelector('textarea')).toBeNull()
  })
})

describe('downloads and printing', () => {
  it('file names are safe and say what they are', () => {
    expect(qrFileName('survey-2026', 'png')).toBe('emc-form-survey-2026-qr.png')
    expect(qrFileName('استبيان ٢٠٢٦!', 'svg', 'link')).toBe('emc-form-استبيان-٢٠٢٦-link-qr.svg')
    expect(qrFileName('///', 'png')).toBe('emc-form-form-qr.png')
    expect(qrFileName('a/b\\c:d', 'png')).not.toMatch(/[\\/:]/)
  })

  it('a PNG and an SVG are handed to the browser as downloads with those names', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    const created = vi.fn(() => 'blob:x')
    const revoked = vi.fn()
    URL.createObjectURL = created
    URL.revokeObjectURL = revoked
    const names: string[] = []
    const original = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      const el = original(tag)
      if (tag === 'a') Object.defineProperty(el, 'download', { set: (v: string) => names.push(v), get: () => names.at(-1) ?? '' })
      return el
    }) as typeof document.createElement)

    downloadPng('data:image/png;base64,AAAA', 'a-qr.png')
    downloadSvg('<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'a-qr.svg')

    expect(click).toHaveBeenCalledTimes(2)
    expect(names).toEqual(['a-qr.png', 'a-qr.svg'])
    expect(created).toHaveBeenCalledTimes(1)
    expect((created.mock.calls[0] as unknown[])[0]).toBeInstanceOf(Blob)
    expect(revoked).toHaveBeenCalledWith('blob:x')
    expect(document.querySelector('a')).toBeNull()
  })

  it('the print page is right to left, shows the title, the code and the address, and escapes everything it is given', () => {
    const html = printLayoutHtml({ title: '<b>نموذج</b> "رضا"', caption: 'امسح الرمز', url: 'https://emc.example/forms/a?x=1&y=2', svg: '<svg></svg>' })

    expect(html).toContain('dir="rtl"')
    expect(html).toContain('lang="ar"')
    expect(html).toContain('&lt;b&gt;نموذج&lt;/b&gt; &quot;رضا&quot;')
    expect(html).not.toContain('<b>')
    expect(html).toContain('https://emc.example/forms/a?x=1&amp;y=2')
    expect(html).toContain('<svg></svg>')
    expect(html).toContain('@page')
    expect(html).not.toMatch(/<script/i)
  })

  it('printing opens the print dialog from a hidden frame and cleans the frame up afterwards', () => {
    vi.useFakeTimers()
    try {
      const print = vi.fn()
      let after: (() => void) | undefined
      Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
        configurable: true,
        get() { return { focus: vi.fn(), print, addEventListener: (_e: string, cb: () => void) => { after = cb } } },
      })

      printQr({ title: 't', caption: 'c', url: 'https://x', svg: '<svg></svg>' })
      const frame = document.querySelector('iframe') as HTMLIFrameElement
      expect(frame).not.toBeNull()
      expect(frame.getAttribute('aria-hidden')).toBe('true')
      expect(frame.srcdoc).toContain('https://x')

      frame.onload?.(new Event('load'))
      expect(print).toHaveBeenCalledTimes(1)
      after?.()
      expect(document.querySelector('iframe')).toBeNull()
    } finally {
      vi.useRealTimers()
      Reflect.deleteProperty(HTMLIFrameElement.prototype, 'contentWindow')
    }
  })
})
