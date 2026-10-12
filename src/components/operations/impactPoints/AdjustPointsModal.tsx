import { useEffect, useRef, useState } from 'react'
import { MinusCircle, PlusCircle, ShieldAlert, X } from 'lucide-react'
import toast from '@/lib/toast'
import { adjustMemberPoints, type PointsMember } from '@/api/volunteerPointsApi'
import { fieldClass, formatNumber, serverMessage } from './impactPointsUi'

type Direction = 'add' | 'subtract'

const MAX_POINTS = 5000
const MIN_REASON = 3

type Props = {
  member: PointsMember
  onClose: () => void
  /** Called after a successful adjustment so the list and KPIs refresh. */
  onDone: () => void
}

/**
 * Append a correction to a person's points.
 *
 * It never edits a total: the server records a new, attributed ledger row. The
 * reason is required and shown to the member; the note is optional and staff-only.
 * The preview below is a convenience — the server re-checks the monthly cap and
 * the balance rules and its message is shown verbatim when it refuses.
 */
export default function AdjustPointsModal({ member, onClose, onDone }: Props) {
  const [direction, setDirection] = useState<Direction>('add')
  const [points, setPoints] = useState('')
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<{ points?: string; reason?: string }>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const firstRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    firstRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      opener?.focus?.()
    }
  }, [onClose, submitting])

  const amount = Number(points)
  const validAmount = Number.isInteger(amount) && amount >= 1 && amount <= MAX_POINTS
  const after = validAmount ? member.lifetime_points + (direction === 'add' ? amount : -amount) : null

  async function submit() {
    const next: typeof errors = {}
    if (!validAmount) next.points = `أدخل عدداً صحيحاً بين 1 و${formatNumber(MAX_POINTS)}`
    if (reason.trim().length < MIN_REASON) next.reason = `السبب إلزامي (${MIN_REASON} أحرف على الأقل)`
    setErrors(next)
    setServerError(null)
    if (Object.keys(next).length > 0) return

    setSubmitting(true)
    try {
      await adjustMemberPoints(member.user_id, {
        direction,
        points: amount,
        reason: reason.trim(),
        note: note.trim() || undefined,
      })
      toast.success('سُجِّل التعديل في سجل النقاط')
      onDone()
    } catch (err) {
      setServerError(serverMessage(err, 'تعذر تسجيل التعديل'))
    } finally {
      setSubmitting(false)
    }
  }

  const adding = direction === 'add'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => !submitting && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="adjust-title"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="adjust-title" className="text-lg font-black text-navy">تعديل نقاط الأثر</h2>
            <p className="mt-1 truncate text-sm font-bold text-muted-600">
              {member.name}
              {member.department ? ` — ${member.department}` : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} aria-label="إغلاق" className="rounded-xl p-2 text-muted-500 hover:bg-slate-100">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-center">
          <p className="text-[11px] font-bold text-muted-500">النقاط الحالية</p>
          <p className="mt-1 text-3xl font-black tabular-nums text-navy">{formatNumber(member.lifetime_points)}</p>
        </div>

        <fieldset className="mt-5">
          <legend className="mb-2 text-xs font-black text-navy">نوع التعديل</legend>
          <div role="radiogroup" aria-label="نوع التعديل" className="grid grid-cols-2 gap-2">
            <button ref={firstRef} type="button" role="radio" aria-checked={adding} onClick={() => setDirection('add')}
              className={`flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-black transition ${adding ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-muted-600 hover:bg-slate-50'}`}>
              <PlusCircle size={16} aria-hidden="true" /> إضافة نقاط
            </button>
            <button type="button" role="radio" aria-checked={!adding} onClick={() => setDirection('subtract')}
              className={`flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-black transition ${!adding ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 text-muted-600 hover:bg-slate-50'}`}>
              <MinusCircle size={16} aria-hidden="true" /> خصم / تصحيح
            </button>
          </div>
        </fieldset>

        <div className="mt-4">
          <label htmlFor="adjust-points" className="mb-1.5 block text-xs font-black text-navy">عدد النقاط</label>
          <input id="adjust-points" type="number" inputMode="numeric" dir="ltr" min={1} max={MAX_POINTS} placeholder="مثال: 100"
            value={points} onChange={(e) => setPoints(e.target.value)}
            aria-invalid={Boolean(errors.points)} aria-describedby={errors.points ? 'adjust-points-error' : undefined}
            className={fieldClass} />
          {errors.points && <p id="adjust-points-error" className="mt-1 text-[11px] font-bold text-rose-600">{errors.points}</p>}
          {after !== null && (
            <p className={`mt-1.5 text-[11px] font-bold ${after < 0 ? 'text-rose-600' : 'text-muted-500'}`}>
              الرصيد بعد التعديل: <span className="tabular-nums">{formatNumber(after)}</span>
              {after < 0 && ' — لن يقبل الخادم رصيداً سالباً'}
            </p>
          )}
        </div>

        <div className="mt-4">
          <label htmlFor="adjust-reason" className="mb-1.5 block text-xs font-black text-navy">
            السبب <span className="text-rose-500" aria-hidden="true">*</span>
            <span className="ms-1 font-semibold text-muted-500">— يظهر للعضو في سجله</span>
          </label>
          <textarea id="adjust-reason" rows={2} required aria-required="true" placeholder="اشرح سبب التعديل بوضوح…"
            value={reason} onChange={(e) => setReason(e.target.value)}
            aria-invalid={Boolean(errors.reason)} aria-describedby={errors.reason ? 'adjust-reason-error' : undefined}
            className={`${fieldClass} resize-none`} />
          {errors.reason && <p id="adjust-reason-error" className="mt-1 text-[11px] font-bold text-rose-600">{errors.reason}</p>}
        </div>

        <div className="mt-4">
          <label htmlFor="adjust-note" className="mb-1.5 block text-xs font-black text-navy">
            ملاحظة داخلية <span className="font-semibold text-muted-500">(اختيارية — لا يراها العضو)</span>
          </label>
          <textarea id="adjust-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={`${fieldClass} resize-none`} />
        </div>

        <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-accent-200 bg-accent-50 p-3.5">
          <ShieldAlert size={18} className="mt-0.5 shrink-0 text-accent-700" aria-hidden="true" />
          <p className="text-xs font-semibold leading-6 text-accent-900">
            يُسجَّل هذا التعديل كحركة جديدة باسمك وبالسبب المذكور، ولا يمكن تعديله أو حذفه لاحقاً. لا يُستبدل الرصيد ولا يُمسّ السجل السابق.
          </p>
        </div>

        {serverError && (
          <p role="alert" className="mt-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">{serverError}</p>
        )}

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} disabled={submitting} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-black text-navy hover:bg-slate-50">
            إلغاء
          </button>
          <button type="button" onClick={() => void submit()} disabled={submitting}
            className={`flex-1 rounded-xl py-2.5 text-sm font-black text-white transition disabled:opacity-60 ${adding ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
            {submitting ? 'جارٍ التسجيل…' : 'تأكيد التعديل'}
          </button>
        </div>
      </div>
    </div>
  )
}
