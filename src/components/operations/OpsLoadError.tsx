import { AlertCircle, RefreshCw } from 'lucide-react'

/** A failed load, shown as such (never as an empty list), with a retry. */
export default function OpsLoadError({
  title = 'تعذّر تحميل البيانات',
  message = 'حدث خطأ أثناء جلب البيانات. تحقق من الاتصال ثم حاول مرة أخرى.',
  onRetry,
  compact = false,
}: {
  title?: string
  message?: string
  onRetry: () => void
  compact?: boolean
}) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center gap-3 rounded-2xl border border-red-100 bg-red-50/70 text-center ${compact ? 'p-4' : 'p-8'}`}
      dir="rtl"
    >
      <AlertCircle size={compact ? 20 : 26} className="text-red-500" aria-hidden="true" />
      <div>
        <p className="text-sm font-black text-red-800">{title}</p>
        <p className="mt-1 text-xs font-semibold leading-relaxed text-red-700/80">{message}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-xl bg-customOrange px-4 py-2 text-xs font-black text-white shadow-sm transition hover:brightness-110"
      >
        <RefreshCw size={13} aria-hidden="true" />
        إعادة المحاولة
      </button>
    </div>
  )
}
