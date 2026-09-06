import type { ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  onBack?: () => void
  onNext?: () => void
  onSubmit?: () => void
  backLabel?: string
  nextLabel?: string
  submitLabel?: string
  showBack?: boolean
  showNext?: boolean
  showSubmit?: boolean
  busy?: boolean
  disableNext?: boolean
  disableSubmit?: boolean
  className?: string
  /** Extra secondary actions (e.g. حفظ مسودة) */
  extras?: ReactNode
}

export function FormActions({
  onBack,
  onNext,
  onSubmit,
  backLabel = 'السابق',
  nextLabel = 'التالي',
  submitLabel = 'إرسال',
  showBack = true,
  showNext = true,
  showSubmit = false,
  busy = false,
  disableNext = false,
  disableSubmit = false,
  className,
  extras,
}: Props) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-t border-slate-200/80 pt-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between',
        className,
      )}
      dir="rtl"
    >
      <div className="flex flex-wrap gap-2">{extras}</div>
      <div className="flex flex-wrap justify-end gap-2">
        {showBack && onBack ?
          <button
            type="button"
            onClick={onBack}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-[13px] font-black text-[#0C2A4B] shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {backLabel}
          </button>
        : null}
        {showNext && onNext ?
          <button
            type="button"
            onClick={onNext}
            disabled={busy || disableNext}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-l from-[#0077B6] to-[#0C2A4B] px-6 py-2.5 text-[13px] font-black text-white shadow-[0_14px_34px_-12px_rgba(12,42,75,0.45)] disabled:opacity-50"
          >
            {nextLabel}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        : null}
        {showSubmit && onSubmit ?
          <button
            type="button"
            onClick={onSubmit}
            disabled={busy || disableSubmit}
            className="inline-flex items-center gap-2 rounded-2xl bg-customOrange px-6 py-2.5 text-[13px] font-black text-white shadow-emc-md transition duration-250 ease-emc hover:brightness-[1.03] disabled:opacity-50"
          >
            {busy ?
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                جاري المعالجة…
              </>
            : submitLabel}
          </button>
        : null}
      </div>
    </div>
  )
}
