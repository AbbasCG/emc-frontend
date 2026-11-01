import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Share, PlusSquare, Sparkles } from 'lucide-react'
import { isStandalone, isIos, onInstallAvailabilityChange, promptInstallApp } from '@/lib/pwa'

const DISMISSED_KEY = 'emc_pwa_banner_dismissed'

function wasDismissedThisSession(): boolean {
  try {
    return Boolean(sessionStorage.getItem(DISMISSED_KEY))
  } catch {
    return false
  }
}

export default function PwaInstallBanner() {
  // Already running as an installed app: never offer to install. Decided once, from the environment, not in an effect.
  const [installed, setInstalled] = useState(() => isStandalone())
  // iOS Safari has no install prompt event, so the banner (with its how-to guide) is offered directly.
  const [showBanner, setShowBanner] = useState(() => !isStandalone() && !wasDismissedThisSession() && isIos())
  const [showIosGuide, setShowIosGuide] = useState(false)

  useEffect(() => {
    if (installed || wasDismissedThisSession()) return

    // Listen to prompt availability (Android, Windows, Mac, Chrome, Edge)
    return onInstallAvailabilityChange((available) => {
      if (available) setShowBanner(true)
    })
  }, [installed])

  function handleDismiss() {
    setShowBanner(false)
    sessionStorage.setItem(DISMISSED_KEY, 'true')
  }

  async function handleInstallClick() {
    if (isIos()) {
      setShowIosGuide(true)
      return
    }

    const res = await promptInstallApp()
    if (res === 'accepted') {
      setShowBanner(false)
      setInstalled(true)
    }
  }

  if (installed || !showBanner) return null

  return (
    <>
      <AnimatePresence>
        <motion.aside
          aria-label="تثبيت تطبيق المنصة"
          initial={{ opacity: 0, y: -20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.96 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          /* موضع الشريط: في أعلى الشاشة بشكل مصغر وأنيق ليترك أسفل الشاشة حراً بالكامل لزر اختبار AI والأزرار العائمة */
          className="fixed top-20 inset-x-3.5 z-40 sm:inset-x-auto sm:left-6 sm:top-20 sm:max-w-sm pointer-events-auto"
          dir="rtl"
        >
          <div className="relative flex items-center justify-between gap-2.5 overflow-hidden rounded-2xl border border-customBlue/35 bg-gradient-to-r from-deepBlue via-deepBlue to-primary-900 px-3.5 py-2.5 text-white shadow-xl backdrop-blur-xl ring-1 ring-white/10">
            {/* Glowing background blur */}
            <div className="pointer-events-none absolute -left-6 -top-6 h-20 w-20 rounded-full bg-customBlue/25 blur-xl" />

            {/* الأيقونة المصغرة والعنوان المدمج */}
            <div className="flex min-w-0 items-center gap-2.5">
              <img
                src="/brand/logos/logo_icon_color.png"
                alt="EMC"
                className="h-8 w-8 shrink-0 rounded-xl bg-white/10 p-1 ring-1 ring-white/20 shadow-sm"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="truncate text-xs font-black text-white">
                    تطبيق منصة EMC
                  </h2>
                  <span className="hidden sm:inline-flex items-center gap-0.5 rounded-full bg-amber-400/20 px-1.5 py-0.2 text-[9px] font-black text-amber-300">
                    <Sparkles size={10} /> سريع
                  </span>
                </div>
                <p className="truncate text-[10px] font-semibold text-slate-300">
                  {isIos() ? 'أضف لشاشة الآيفون' : 'تثبيت كتطبيق مستقل'}
                </p>
              </div>
            </div>

            {/* أزرار الإجراء المصغرة */}
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => void handleInstallClick()}
                className="inline-flex items-center gap-1 rounded-xl bg-customOrange px-3 py-1.5 text-[11px] font-black text-white shadow-sm transition hover:bg-ember active:scale-95"
              >
                <Download size={13} />
                تثبيت
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                aria-label="إغلاق التنبيه"
                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white transition"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        </motion.aside>
      </AnimatePresence>

      {/* نافذة إرشاد هواتف آيفون (iOS Safari) */}
      <AnimatePresence>
        {showIosGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            dir="rtl"
            onClick={() => setShowIosGuide(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl bg-white p-6 text-right shadow-2xl ring-1 ring-slate-200"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-base font-black text-deepBlue">
                  تثبيت التطبيق على آيفون
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIosGuide(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs font-medium text-slate-600 mb-4 leading-relaxed">
                لتثبيت تطبيق منصة EMC على جهاز الآيفون، اتبع الخطوتين التاليتين في متصفح Safari:
              </p>

              <div className="space-y-3 rounded-2xl bg-slate-50 p-4 border border-slate-100 text-xs font-bold text-deepBlue">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-customBlue text-white shrink-0">
                    <Share size={16} />
                  </div>
                  <span>1. اضغط على زر المشاركة أسفل شاشة المتصفح.</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-white shrink-0">
                    <PlusSquare size={16} />
                  </div>
                  <span>2. مرر للأسفل واختر «إضافة إلى الشاشة الرئيسية».</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="mt-5 w-full rounded-xl bg-deepBlue py-3 text-xs font-black text-white shadow-sm hover:bg-deepBlue/90 transition"
              >
                فهمت، حسناً
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
