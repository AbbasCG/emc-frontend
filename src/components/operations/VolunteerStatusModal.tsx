import { useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, ShieldAlert, X } from 'lucide-react'
import toast from '@/lib/toast'
import {
  updateVolunteerStatus,
  type VolunteerHubItem,
  type VolunteerStatus,
} from '@/api/volunteersHubApi'

interface Props {
  volunteer: VolunteerHubItem | null
  onClose: () => void
  onSuccess: () => void
}

const STATUS_CONFIG: Record<
  VolunteerStatus,
  { label: string; desc: string; badgeCls: string; activeBorder: string }
> = {
  active: {
    label: 'نشط',
    desc: 'متاح للعمل وإسناد المهام والمشاركة في التقييم الأسبوعي',
    badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    activeBorder: 'border-emerald-500 bg-emerald-50/50',
  },
  inactive: {
    label: 'منقطع',
    desc: 'غير متاح حالياً للعمل - يُمنع إسناد مهام جديدة له ويُعفى من التقييم',
    badgeCls: 'bg-slate-100 text-slate-700 border-slate-200',
    activeBorder: 'border-slate-500 bg-slate-50',
  },
  on_leave: {
    label: 'في إجازة',
    desc: 'في فترة إجازة رسمية مؤقتة - يُمنع إسناد المهام ويُعفى من التقييم',
    badgeCls: 'bg-amber-50 text-amber-800 border-amber-200',
    activeBorder: 'border-amber-500 bg-amber-50/50',
  },
  withdrawn: {
    label: 'انسحب',
    desc: 'منسحب من الفريق التطوعي - يُجمّد الصرف ويُحفظ رصيده التراكمي للشهادة',
    badgeCls: 'bg-rose-50 text-rose-700 border-rose-200',
    activeBorder: 'border-rose-500 bg-rose-50/50',
  },
}

export default function VolunteerStatusModal({ volunteer, onClose, onSuccess }: Props) {
  const [status, setStatus] = useState<VolunteerStatus>(volunteer?.status ?? 'active')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  if (!volunteer) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) {
      toast.error('سبب تغيير الحالة إلزامي لحفظ الأثر في سجل النشاط.')
      return
    }

    setLoading(true)
    try {
      await updateVolunteerStatus(volunteer.id, {
        status,
        reason: reason.trim(),
      })
      toast.success('تم تحديث حالة المتطوع وتوثيق الحركة بنجاح.')
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'تعذر تحديث حالة المتطوع.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#0C2A4B] text-white">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#0C2A4B]">تعديل حالة المتطوع</h3>
              <p className="text-xs text-slate-500">{volunteer.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Status selector */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-2.5">
              اختر الحالة الجديدة:
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {(Object.keys(STATUS_CONFIG) as VolunteerStatus[]).map((stKey) => {
                const conf = STATUS_CONFIG[stKey]
                const isSelected = status === stKey
                return (
                  <button
                    key={stKey}
                    type="button"
                    onClick={() => setStatus(stKey)}
                    className={`flex flex-col items-start p-3 rounded-2xl border text-right transition ${
                      isSelected
                        ? `${conf.activeBorder} ring-2 ring-offset-1 ring-current`
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm font-black text-slate-800">{conf.label}</span>
                      {isSelected && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500 line-clamp-2">
                      {conf.desc}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Reason Input */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5">
              سبب التغيير <span className="text-rose-500 font-bold">* (إلزامي للتوثيق)</span>:
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="اكتب سبب تغيير حالة المتطوع بشكل مفصل لحفظه في سجل النشاط..."
              className="w-full rounded-2xl border border-slate-200 p-3 text-sm text-slate-800 outline-none transition focus:border-customBlue focus:ring-2 focus:ring-customBlue/20"
            />
          </div>

          {/* Notice */}
          <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50 p-3.5 border border-amber-200/80 text-xs text-amber-900 leading-relaxed">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <p>
              يتم حفظ التغيير مع السبب واسم المنفذ تلقائياً في <strong>سجل النشاط الدائم</strong>،
              ولا يمكن حذفه أو التراجع عنه دون إنشاء قيد جديد.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-2xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading || !reason.trim()}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#0C2A4B] px-6 py-2.5 text-xs font-black text-white shadow-lg transition hover:bg-[#1a3e68] disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              حفظ التغيير في سجل النشاط
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

