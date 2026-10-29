import { useEffect, useState } from 'react'
import { Download, Printer } from 'lucide-react'
import { downloadPng, downloadSvg, printQr, qrFileName, qrPngDataUrl, qrSvgMarkup } from './qrExport'

const BTN = 'inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-black text-deepBlue ring-1 ring-deepBlue/10 transition hover:bg-slate-50 disabled:opacity-50'

/**
 * A QR code for one address, with the ways to take it away: PNG, SVG and a print-ready page.
 *
 * The code holds the address only (see qrExport). It is drawn in the browser, so a share link's token is never sent to a server
 * to be turned into a picture.
 */
export default function ShareQrCard({
  url,
  slug,
  title,
  caption,
  fileSuffix = '',
  size = 176,
}: {
  url: string
  slug: string
  /** Heading of the printed page: the form's title. */
  title: string
  /** Line under it on the printed page, and the picture's description. */
  caption: string
  fileSuffix?: string
  size?: number
}) {
  const [png, setPng] = useState<string | null>(null)
  const [svg, setSvg] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [seenUrl, setSeenUrl] = useState(url)

  if (seenUrl !== url) {
    setSeenUrl(url)
    setPng(null)
    setSvg(null)
    setFailed(false)
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [p, s] = await Promise.all([qrPngDataUrl(url), qrSvgMarkup(url)])
        if (!cancelled) {
          setPng(p)
          setSvg(s)
        }
      } catch {
        if (!cancelled) setFailed(true)
      }
    })()

    return () => { cancelled = true }
  }, [url])

  const ready = png !== null && svg !== null

  return (
    <div className="flex flex-col items-center gap-3 text-center" data-testid="qr-card">
      <div className="rounded-2xl bg-white p-2 ring-1 ring-deepBlue/10" style={{ width: size + 16, height: size + 16 }}>
        {png ? (
          <img src={png} alt={`رمز QR: ${caption}`} width={size} height={size} data-testid="qr-image" className="block" />
        ) : failed ? (
          <p role="alert" className="grid h-full place-items-center px-2 text-[11px] font-bold text-red-700">تعذّر إنشاء رمز QR. انسخ الرابط واستخدمه مباشرة.</p>
        ) : (
          <p className="grid h-full place-items-center text-[11px] font-bold text-slate-400" aria-busy="true">جارٍ إنشاء الرمز...</p>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" className={BTN} disabled={!ready} onClick={() => png && downloadPng(png, qrFileName(slug, 'png', fileSuffix))}>
          <Download size={13} aria-hidden /> تنزيل PNG
        </button>
        <button type="button" className={BTN} disabled={!ready} onClick={() => svg && downloadSvg(svg, qrFileName(slug, 'svg', fileSuffix))}>
          <Download size={13} aria-hidden /> تنزيل SVG
        </button>
        <button type="button" className={BTN} disabled={!ready} onClick={() => svg && printQr({ title, caption, url, svg })}>
          <Printer size={13} aria-hidden /> طباعة
        </button>
      </div>
    </div>
  )
}
