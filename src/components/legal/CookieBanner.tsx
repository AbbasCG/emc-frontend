import { motion } from 'framer-motion'
import { Cookie, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '@/i18n/useLanguage'
import { useCookieConsent } from '@/contexts/useCookieConsent'

/**
 * The consent gate for the whole measurement layer (§17).
 *
 * Three laws hold this component:
 *   1. NO TRACKING BEFORE A CHOICE. Refusal is the pre-decision default: the
 *      provider seeds `consent` from storage only, so with no record nothing is
 *      injected (`applyConsentScripts` never runs) and `trackFunnelEvent`
 *      suppresses every push and beacon until `analytics` is explicitly true.
 *   2. TWO EQUALLY PROMINENT CHOICES. «قبول» and «رفض غير الضروري» are rendered
 *      with the SAME geometry, weight and contrast — refusal is never the quieter
 *      button. Fine-grained control stays available as a third, plainly-labelled
 *      text control; it is not a substitute for the refusal button.
 *   3. Tokens only, no shadows: the surface is a navy sheet with a hairline.
 */
export default function CookieBanner() {
  const { t } = useTranslation()
  const { dir } = useLanguage()
  const { bannerVisible, acceptAll, rejectNonEssential, openPreferences } = useCookieConsent()

  if (!bannerVisible) return null

  // ONE class for BOTH decisions — equal prominence is enforced by construction,
  // not by eye. Any change here changes accept and refuse together.
  const decisionCls =
    'emc-focus-ring inline-flex h-12 min-w-[9.5rem] flex-1 items-center justify-center rounded-xl bg-white px-6 text-sm font-black text-navy transition duration-250 ease-emc hover:brightness-95 sm:flex-none'

  return (
    <motion.div
      role="dialog"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-desc"
      dir={dir}
      initial={{ y: 48, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className="fixed inset-x-0 bottom-0 z-[190] px-4 pb-4 sm:px-6 lg:px-10"
    >
      <div className="mx-auto max-w-[1540px] overflow-hidden rounded-2xl border border-white/15 bg-navy text-white">
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <div className="flex min-w-0 items-start gap-4 text-right">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-ice ring-1 ring-white/20">
              <Cookie className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-black text-white/85">
                <ShieldCheck className="h-3.5 w-3.5 text-ice" aria-hidden />
                AVG / GDPR
              </div>
              <h2 id="cookie-banner-title" className="text-base font-black sm:text-lg">
                {t('cookie.title')}
              </h2>
              <p
                id="cookie-banner-desc"
                className="mt-2 max-w-2xl text-[13px] font-medium leading-relaxed text-white/85"
              >
                {t('cookie.description')}{' '}
                <Link
                  to="/cookies"
                  className="emc-focus-ring font-black text-ice underline underline-offset-2"
                >
                  {t('cookie.policyLink')}
                </Link>
                {' · '}
                <Link
                  to="/privacy"
                  className="emc-focus-ring font-black text-ice underline underline-offset-2"
                >
                  {t('cookie.privacyLink')}
                </Link>
              </p>
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-3 lg:shrink-0 lg:items-end">
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={rejectNonEssential} className={decisionCls}>
                {t('cookie.rejectNonEssential')}
              </button>
              <button type="button" onClick={acceptAll} className={decisionCls}>
                {t('cookie.acceptAll')}
              </button>
            </div>
            <button
              type="button"
              onClick={openPreferences}
              className="emc-focus-ring self-center text-xs font-black text-white/85 underline underline-offset-4 sm:self-end"
            >
              {t('cookie.managePreferences')}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
