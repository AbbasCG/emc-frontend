import { useEffect, useId, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle } from 'lucide-react'
import { getApiErrorMessage } from '@/api/apiErrors'
import { resolveReconciliation } from '@/api/paymentReconciliationsApi'
import type { ReconciliationCase, ReconciliationResolution } from '@/api/paymentReconciliationsApi'
import EmcButton from '@/components/ui/EmcButton'
import { formatMoney } from '@/utils/financeFormatters'
import { MIN_NOTE } from './reconciliationLabels'

type Props = {
  /** The case being decided, or null while the dialog is closed. */
  item: ReconciliationCase | null
  resolution: ReconciliationResolution | null
  onClose: () => void
  onResolved: (updated: ReconciliationCase) => void
}

const COPY: Record<ReconciliationResolution, { title: string; button: string; what: string }> = {
  enrollment_activated: {
    title: 'تفعيل التسجيل',
    button: 'تأكيد تفعيل التسجيل',
    what: 'سيصبح التسجيل فعّالاً ويحصل المستخدم على وصول المتعلّم للبرنامج. لا يُنفَّذ إلا إذا زال تعارض التدريس، وسيُعاد فحصه عند التأكيد.',
  },
  closed_without_enrollment: {
    title: 'إغلاق الحالة دون تفعيل التسجيل',
    button: 'تأكيد الإغلاق دون تفعيل',
    what: 'سيُلغى التسجيل ويبقى سجل الدفعة والفاتورة كما هما. لن يحصل المستخدم على وصول متعلّم.',
  },
}

/**
 * The confirmation every decision goes through: it says what will happen, requires an internal note, and (when closing) lets
 * finance flag that money is owed back. The platform never refunds and never marks a payment refunded; the flag is a to-do for the
 * people who return the money outside the platform.
 */
export default function ReconciliationResolveDialog({ item, resolution, onClose, onResolved }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const open = item !== null && resolution !== null
  // Whether a request is running is owned by the form; the dialog only needs it to refuse Escape meanwhile.
  const busyRef = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  if (typeof document === 'undefined') return null

  return createPortal(
    <dialog
      ref={ref}
      dir="rtl"
      aria-labelledby={titleId}
      className="emc-dialog w-[min(520px,calc(100%-24px))] rounded-2xl border border-deepBlue/10 bg-white p-0 text-right shadow-emc-lg"
      onCancel={(e) => {
        e.preventDefault()
        if (!busyRef.current) onClose()
      }}
    >
      {item && resolution && (
        // A new decision always starts clean: the form is a new instance per case + decision.
        <DecisionForm key={`${item.id}:${resolution}`} item={item} resolution={resolution} titleId={titleId} busyRef={busyRef} onClose={onClose} onResolved={onResolved} />
      )}
    </dialog>,
    document.body,
  )
}

function DecisionForm({
  item,
  resolution,
  titleId,
  busyRef,
  onClose,
  onResolved,
}: {
  item: ReconciliationCase
  resolution: ReconciliationResolution
  titleId: string
  busyRef: MutableRefObject<boolean>
  onClose: () => void
  onResolved: (updated: ReconciliationCase) => void
}) {
  const noteId = useId()
  const [note, setNote] = useState('')
  const [refund, setRefund] = useState(false)
  const [busy, setBusyState] = useState(false)
  const [error, setError] = useState('')

  const setBusy = (value: boolean) => {
    busyRef.current = value
    setBusyState(value)
  }

  const copy = COPY[resolution]
  const trimmed = note.trim()
  const valid = trimmed.length >= MIN_NOTE

  async function confirm() {
    if (!valid || busy) return
    setBusy(true)
    setError('')
    try {
      const updated = await resolveReconciliation(item.id, { resolution, note: trimmed, refundRequired: refund })
      busyRef.current = false // the form is about to unmount; the next decision must be able to close on Escape
      onResolved(updated)
    } catch (e) {
      setError(getApiErrorMessage(e))
      setBusy(false)
    }
  }

  return (
    <form
      className="p-5 sm:p-6"
      onSubmit={(e) => {
        e.preventDefault()
        void confirm()
      }}
    >
      <h2 id={titleId} className="font-display text-lg font-black tracking-tight text-deepBlue">
        {copy.title}
      </h2>
      <p className="mt-2 text-sm font-semibold leading-7 text-deepBlue/70">{copy.what}</p>

      <dl className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-4 text-xs ring-1 ring-deepBlue/[0.06]">
        <div className="flex justify-between gap-3"><dt className="font-bold text-slate-500">المستخدم</dt><dd className="font-black text-deepBlue">{item.user?.name ?? '—'}</dd></div>
        <div className="flex justify-between gap-3"><dt className="font-bold text-slate-500">البرنامج</dt><dd className="font-black text-deepBlue">{item.program?.title ?? '—'}</dd></div>
        <div className="flex justify-between gap-3"><dt className="font-bold text-slate-500">المبلغ المستلم</dt><dd className="font-black text-deepBlue" dir="ltr">{item.payment ? formatMoney(item.payment.amount, item.payment.currency) : '—'}</dd></div>
      </dl>

      <label htmlFor={noteId} className="mt-4 block text-xs font-black text-deepBlue">
        ملاحظة داخلية (إلزامية)
      </label>
      <textarea
        id={noteId}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        maxLength={2000}
        required
        aria-required="true"
        aria-describedby={`${noteId}-hint`}
        placeholder="اكتب سبب القرار وما تم الاتفاق عليه مع المستخدم…"
        className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-deepBlue outline-none focus:border-customBlue focus:ring-2 focus:ring-customBlue/15"
      />
      <p id={`${noteId}-hint`} className={`mt-1 text-[11px] font-bold ${valid ? 'text-slate-400' : 'text-amber-700'}`}>
        {valid ? 'تُحفظ الملاحظة في سجل الحالة وتظهر للمراجعين.' : `اكتب ${MIN_NOTE} أحرف على الأقل ليُفعَّل التأكيد.`}
      </p>

      {resolution === 'closed_without_enrollment' && (
        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
          <input type="checkbox" checked={refund} onChange={(e) => setRefund(e.target.checked)} className="mt-1 size-4 accent-customBlue" />
          <span className="text-xs font-bold leading-6 text-amber-950">
            المبلغ مستحق للإرجاع للمستخدم (يُسجَّل «استرداد معلّق»)
            <span className="block font-semibold text-amber-900/80">
              المنصة لا تُجري الاسترداد ولا تعتبر الدفعة «مستردّة»: يُنفَّذ خارج المنصة، وهذه العلامة تذكير للمتابعة فقط.
            </span>
          </span>
        </label>
      )}

      {error && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold leading-6 text-red-800 ring-1 ring-red-200">
          <AlertTriangle size={14} aria-hidden className="mt-1 shrink-0" />
          {error}
        </p>
      )}

      {/* Sticky, so on a short phone screen the confirmation is always reachable without scrolling the note away. */}
          <div className="sticky bottom-0 -mx-5 mt-6 flex flex-wrap justify-end gap-3 border-t border-deepBlue/[0.06] bg-white px-5 py-3 sm:-mx-6 sm:px-6">
        <EmcButton type="button" variant="secondary" onClick={onClose} disabled={busy}>
          إلغاء
        </EmcButton>
        <EmcButton type="submit" variant={resolution === 'enrollment_activated' ? 'primary' : 'danger'} disabled={!valid} loading={busy}>
          {copy.button}
        </EmcButton>
      </div>
    </form>
  )
}
