import { Lock, RefreshCw, TriangleAlert } from 'lucide-react'
import type { DescribedLoadError } from '@/lib/describeLoadError'

type Props = {
  error: DescribedLoadError
  onRetry?: () => void
}

/** One inline alert for a failed read: a missing permission (no retry) or a retryable failure. */
export default function LoadErrorState({ error, onRetry }: Props) {
  const forbidden = error.kind === 'forbidden'
  const Icon = forbidden ? Lock : TriangleAlert
  return (
    <div
      role="alert"
      dir="rtl"
      className="flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-amber-300/70 bg-amber-50/60 px-6 py-14 text-center"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white ring-1 ring-amber-200">
        <Icon size={26} strokeWidth={1.75} className="text-amber-600" aria-hidden />
      </div>
      <h3 className="text-base font-black text-deepBlue">{forbidden ? 'لا تملك صلاحية العرض' : 'تعذر تحميل البيانات'}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-7 text-deepBlue/65">{error.message_ar}</p>
      {error.retryable && onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="emc-focus-ring mt-6 inline-flex items-center gap-2 rounded-xl border border-customBlue/30 bg-white px-6 py-2.5 text-sm font-black text-customBlue transition hover:border-customBlue/50"
        >
          <RefreshCw size={16} aria-hidden />
          إعادة المحاولة
        </button>
      ) : null}
    </div>
  )
}
