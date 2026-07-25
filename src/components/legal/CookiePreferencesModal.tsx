import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Cookie, Shield, BarChart3, Megaphone, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCookieConsent, DEFAULT_PREFS } from '@/contexts/CookieConsentContext'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { cn } from '@/lib/utils'

export default function CookiePreferencesModal() {
  const {
    preferencesOpen,
    closePreferences,
    consent,
    savePreferences,
    acceptAll,
    rejectNonEssential,
    withdrawAll,
  } = useCookieConsent()

  // Seeded exactly as the old mount-time effect left it: hydrated from `consent` when the
  // modal is already open on mount, otherwise the defaults.
  const [analytics, setAnalytics] = useState(
    preferencesOpen ? (consent?.analytics ?? false) : DEFAULT_PREFS.analytics,
  )
  const [marketing, setMarketing] = useState(
    preferencesOpen ? (consent?.marketing ?? false) : DEFAULT_PREFS.marketing,
  )
  const panelRef = useRef<HTMLDivElement>(null)

  useFocusTrap(panelRef, { active: preferencesOpen, onEscape: closePreferences })

  // Re-hydrate the toggles during render when the modal opens or the stored consent
  // changes (react.dev "adjusting state when a prop changes").
  const [seenSource, setSeenSource] = useState({ preferencesOpen, consent })
  if (seenSource.preferencesOpen !== preferencesOpen || seenSource.consent !== consent) {
    setSeenSource({ preferencesOpen, consent })
    if (preferencesOpen) {
      setAnalytics(consent?.analytics ?? false)
      setMarketing(consent?.marketing ?? false)
    }
  }

  return (
    <AnimatePresence>
      {preferencesOpen ?
        <>
          <motion.button
            type="button"
            aria-label="إغلاق"
            className="fixed inset-0 z-[200] bg-[#0C2A4B]/55 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closePreferences}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-prefs-title"
            dir="rtl"
            className="fixed inset-x-4 top-[8vh] z-[201] mx-auto max-h-[84vh] max-w-lg overflow-y-auto rounded-3xl border border-slate-200/80 bg-white shadow-[0_32px_80px_-20px_rgba(12,42,75,0.35)] sm:inset-x-auto sm:left-1/2 sm:w-full sm:-translate-x-1/2"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 px-6 py-5 backdrop-blur-md">
              <div className="flex items-start gap-3 text-right">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#0077B6]/10 text-[#0077B6]">
                  <Cookie className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h2 id="cookie-prefs-title" className="text-lg font-black text-[#0C2A4B]">
                    إعدادات ملفات تعريف الارتباط
                  </h2>
                  <p className="mt-1 text-[12px] font-semibold leading-relaxed text-slate-500">
                    اختر ما تسمح به EMC وفق AVG/GDPR. يمكنك تغيير اختيارك في أي وقت.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closePreferences}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-[#0C2A4B]"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <CategoryRow
                icon={Shield}
                title="ضرورية"
                description="مطلوبة لتشغيل المنصة، الجلسات، الأمان، وتفضيلات الموافقة. لا يمكن تعطيلها."
                locked
                checked
              />
              <CategoryRow
                icon={BarChart3}
                title="تحليلات"
                description="تساعدنا على فهم استخدام المنصة وتحسين التجربة — دون تحميلها قبل موافقتك."
                checked={analytics}
                onChange={setAnalytics}
              />
              <CategoryRow
                icon={Megaphone}
                title="تسويق"
                description="قياس الحملات والمحتوى الترويجي عند تفعيل أدوات التسويق."
                checked={marketing}
                onChange={setMarketing}
              />

              <p className="rounded-xl bg-slate-50 px-4 py-3 text-[11px] font-semibold leading-relaxed text-slate-500">
                لمزيد من التفاصيل راجع{' '}
                <Link to="/cookies" onClick={closePreferences} className="font-black text-[#0077B6] hover:underline">
                  سياسة ملفات تعريف الارتباط
                </Link>
                .
              </p>
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-100 px-6 py-5 sm:flex-row sm:flex-wrap sm:justify-end">
              {consent ?
                <button
                  type="button"
                  onClick={withdrawAll}
                  className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-[12px] font-black text-rose-800 transition hover:bg-rose-100"
                >
                  سحب الموافقة
                </button>
              : null}
              <button
                type="button"
                onClick={rejectNonEssential}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-[12px] font-black text-[#0C2A4B] transition hover:bg-slate-50"
              >
                رفض غير الضرورية
              </button>
              <button
                type="button"
                onClick={() => savePreferences({ analytics, marketing })}
                className="rounded-xl bg-[#0C2A4B] px-5 py-2.5 text-[12px] font-black text-white shadow-sm transition hover:opacity-90"
              >
                حفظ التفضيلات
              </button>
              <button
                type="button"
                onClick={acceptAll}
                className="rounded-xl bg-[#F28C00] px-5 py-2.5 text-[12px] font-black text-white shadow-sm transition hover:brightness-105"
              >
                قبول الكل
              </button>
            </div>
          </motion.div>
        </>
      : null}
    </AnimatePresence>
  )
}

function CategoryRow({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
  locked,
}: {
  icon: typeof Shield
  title: string
  description: string
  checked: boolean
  onChange?: (v: boolean) => void
  locked?: boolean
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-[#f8fafc] p-4 text-right">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#0077B6] shadow-sm ring-1 ring-slate-100">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-[13px] font-black text-[#0C2A4B]">{title}</p>
            <p className="mt-1 text-[12px] font-medium leading-relaxed text-slate-500">{description}</p>
          </div>
        </div>
        <label className={cn('relative inline-flex shrink-0 cursor-pointer items-center', locked && 'cursor-not-allowed opacity-70')}>
          <input
            type="checkbox"
            checked={checked}
            disabled={locked}
            onChange={(e) => onChange?.(e.target.checked)}
            className="peer sr-only"
          />
          <span className="h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-[#0077B6] peer-disabled:bg-[#0077B6]/60" />
          <span className="absolute start-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5 peer-disabled:translate-x-5" />
        </label>
      </div>
      {locked ?
        <p className="mt-2 text-[10px] font-bold text-emerald-700">مفعّلة دائماً</p>
      : null}
    </div>
  )
}
