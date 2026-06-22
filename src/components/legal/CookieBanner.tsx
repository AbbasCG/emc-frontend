import { motion } from 'framer-motion'
import { Cookie, Settings2, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCookieConsent } from '@/contexts/CookieConsentContext'

export default function CookieBanner() {
  const { bannerVisible, acceptAll, rejectNonEssential, openPreferences } = useCookieConsent()

  if (!bannerVisible) return null

  return (
    <motion.div
      role="dialog"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-desc"
      dir="rtl"
      initial={{ y: 48, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className="fixed inset-x-0 bottom-0 z-[190] px-4 pb-4 sm:px-6 lg:px-10"
    >
      <div className="mx-auto max-w-[1540px] overflow-hidden rounded-2xl border border-white/10 bg-[#0C2A4B]/97 text-white shadow-[0_-8px_48px_rgba(15,23,42,0.35)] backdrop-blur-xl">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_100%_0%,rgba(0,119,182,0.22),transparent_55%)]" />
        <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <div className="flex min-w-0 items-start gap-4 text-right">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#0077B6]/20 text-[#0077B6] ring-1 ring-[#0077B6]/30">
              <Cookie className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black text-white/70">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
                AVG / GDPR
              </div>
              <h2 id="cookie-banner-title" className="text-base font-black sm:text-lg">
                نستخدم ملفات تعريف الارتباط لتحسين تجربتك
              </h2>
              <p id="cookie-banner-desc" className="mt-2 max-w-2xl text-[13px] font-medium leading-relaxed text-white/65">
                ملفات ضرورية لتشغيل EMC. التحليلات والتسويق تُفعَّل فقط بموافقتك.{' '}
                <Link to="/cookies" className="font-black text-[#F28C00] underline-offset-2 hover:underline">
                  سياسة ملفات تعريف الارتباط
                </Link>
                {' · '}
                <Link to="/privacy" className="font-black text-[#0077B6] underline-offset-2 hover:underline">
                  الخصوصية
                </Link>
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end lg:shrink-0">
            <button
              type="button"
              onClick={openPreferences}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-[12px] font-black text-white transition hover:bg-white/10"
            >
              <Settings2 className="h-4 w-4" aria-hidden />
              إدارة التفضيلات
            </button>
            <button
              type="button"
              onClick={rejectNonEssential}
              className="rounded-xl border border-white/15 px-4 py-2.5 text-[12px] font-black text-white/90 transition hover:bg-white/10"
            >
              رفض غير الضرورية
            </button>
            <button
              type="button"
              onClick={acceptAll}
              className="rounded-xl bg-[#F28C00] px-5 py-2.5 text-[12px] font-black text-white shadow-[0_8px_24px_-8px_rgba(242,140,0,0.55)] transition hover:brightness-105"
            >
              قبول الكل
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
