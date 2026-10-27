import { useEffect, useState } from 'react'
import {
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  GraduationCap,
  Loader2,
  Sparkles,
  UserRound,
  XCircle,
  ExternalLink,
  MessageSquare,
  Send,
} from 'lucide-react'
import toast from '@/lib/toast'
import {
  TRAINER_STATUS_LABELS,
  TRAINER_STATUS_TRANSITIONS,
  fetchTrainerApplicationDetail,
  updateTrainerApplicationStatus,
  updateTrainerApplicationNotes,
  type TrainerApplicationDetail,
  type TrainerApplicationStatus,
} from '@/api/trainerApplicationsAdminApi'

interface Props {
  id: number
  onClose: () => void
  onStatusChanged?: () => void
}

export function TrainerStatusBadge({ status }: { status: string }) {
  const styles: Record<TrainerApplicationStatus, { cls: string; icon: typeof Clock }> = {
    new: { cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200', icon: Clock },
    under_review: { cls: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200', icon: AlertCircle },
    approved: { cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', icon: CheckCircle },
    rejected: { cls: 'bg-red-50 text-red-700 ring-1 ring-red-200', icon: XCircle },
  }

  const s = status as TrainerApplicationStatus
  const conf = styles[s] || { cls: 'bg-slate-100 text-slate-600', icon: Clock }
  const Icon = conf.icon

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${conf.cls}`}>
      <Icon size={13} />
      {TRAINER_STATUS_LABELS[s] || status}
    </span>
  )
}

export default function TrainerApplicationDetailModal({ id, onClose, onStatusChanged }: Props) {
  const [data, setData] = useState<TrainerApplicationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchTrainerApplicationDetail(id)
      .then(res => {
        if (!cancelled) {
          setData(res)
          setNotes(res.admin_notes || '')
        }
      })
      .catch(() => {
        if (!cancelled) toast.error('تعذر جلب تفاصيل طلب المدرب')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const handleStatusChange = async (nextStatus: TrainerApplicationStatus) => {
    if (!data) return
    setActing(true)
    try {
      const res = await updateTrainerApplicationStatus(data.id, nextStatus)
      setData(res.application)
      toast.success(`تم تحديث حالة الطلب إلى "${TRAINER_STATUS_LABELS[nextStatus]}".`)
      onStatusChanged?.()
    } catch {
      toast.error('تعذر تحديث حالة الطلب')
    } finally {
      setActing(false)
    }
  }

  const handleSaveNotes = async () => {
    if (!data) return
    setSavingNotes(true)
    try {
      const res = await updateTrainerApplicationNotes(data.id, notes)
      setData(res.application)
      toast.success('تم حفظ ملاحظات الإدارة بنجاح.')
      onStatusChanged?.()
    } catch {
      toast.error('تعذر حفظ ملاحظات الإدارة')
    } finally {
      setSavingNotes(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="rounded-2xl bg-white p-8 shadow-xl flex items-center gap-3">
          <Loader2 className="animate-spin text-customBlue" size={24} />
          <span className="text-sm font-bold text-slate-700">جاري تحميل بيانات الطلب...</span>
        </div>
      </div>
    )
  }

  if (!data) return null

  const allowedTransitions = TRAINER_STATUS_TRANSITIONS[data.status] || []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-3xl bg-white shadow-2xl overflow-hidden my-8 text-right">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-5">
          <div className="flex items-center gap-3">
            <TrainerStatusBadge status={data.status} />
            <h2 className="text-lg font-black text-deepBlue">{data.full_name}</h2>
            <span className="text-xs text-slate-400 font-mono">#{data.id}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
          >
            إغلاق
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Section 1: Personal & Contact */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5">
            <div className="flex items-center gap-2 mb-4 text-customBlue font-black text-sm">
              <UserRound size={18} />
              <span>أولاً: البيانات الشخصية والتواصل</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="block text-slate-400 font-bold mb-1">الاسم الكامل:</span>
                <span className="font-black text-deepBlue text-sm">{data.full_name}</span>
              </div>
              <div>
                <span className="block text-slate-400 font-bold mb-1">الهاتف أو الواتساب:</span>
                <span className="font-bold text-slate-800 dir-ltr inline-block">{data.phone_or_whatsapp}</span>
              </div>
              <div>
                <span className="block text-slate-400 font-bold mb-1">البريد الإلكتروني:</span>
                <span className="font-bold text-slate-800">{data.email}</span>
              </div>
              {data.linkedin_url && (
                <div className="sm:col-span-2">
                  <span className="block text-slate-400 font-bold mb-1">حساب LinkedIn:</span>
                  <a
                    href={data.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 font-bold text-customBlue hover:underline"
                  >
                    {data.linkedin_url}
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Specialty & Experience */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5">
            <div className="flex items-center gap-2 mb-4 text-customBlue font-black text-sm">
              <GraduationCap size={18} />
              <span>ثانياً: التخصص والخبرة</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="block text-slate-400 font-bold mb-1">التخصص الرئيسي:</span>
                <span className="font-black text-deepBlue">{data.primary_specialty}</span>
              </div>
              <div>
                <span className="block text-slate-400 font-bold mb-1">سنوات الخبرة:</span>
                <span className="font-bold text-slate-800">{data.years_of_experience}</span>
              </div>
              <div>
                <span className="block text-slate-400 font-bold mb-1">سابقة التدريب:</span>
                <span
                  className={`inline-flex items-center gap-1 font-black ${
                    data.has_training_experience ? 'text-emerald-700' : 'text-slate-600'
                  }`}
                >
                  {data.has_training_experience ? 'نعم، سبق له التدريب' : 'لا (جديد)'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: AI Training Fields */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5">
            <div className="flex items-center gap-2 mb-4 text-customBlue font-black text-sm">
              <Sparkles size={18} />
              <span>ثالثاً: مجالات التدريب والفئات</span>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="block text-slate-400 font-bold mb-2">مجالات الذكاء الاصطناعي:</span>
                <div className="flex flex-wrap gap-2">
                  {data.ai_training_fields?.map((f, i) => (
                    <span
                      key={i}
                      className="rounded-lg bg-sky-100/80 px-2.5 py-1 font-bold text-sky-900 border border-sky-200"
                    >
                      {f}
                    </span>
                  ))}
                  {data.other_ai_field && (
                    <span className="rounded-lg bg-amber-50 px-2.5 py-1 font-bold text-amber-800 border border-amber-200">
                      أخرى: {data.other_ai_field}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <span className="block text-slate-400 font-bold mb-2">نوع البرامج التدريبية:</span>
                <div className="flex flex-wrap gap-2">
                  {data.training_program_types?.map((p, i) => (
                    <span
                      key={i}
                      className="rounded-lg bg-indigo-50 px-2.5 py-1 font-bold text-indigo-800 border border-indigo-200"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-slate-400 font-bold mb-2">الفئات المستهدفة:</span>
                <div className="flex flex-wrap gap-2">
                  {data.target_audiences?.map((a, i) => (
                    <span
                      key={i}
                      className="rounded-lg bg-emerald-50 px-2.5 py-1 font-bold text-emerald-800 border border-emerald-200"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Cooperation & Rate */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5">
            <div className="flex items-center gap-2 mb-4 text-customBlue font-black text-sm">
              <DollarSign size={18} />
              <span>رابعاً: آلية التعاون والتسعير</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="block text-slate-400 font-bold mb-1">نمط تقديم التدريب:</span>
                <span className="font-bold text-slate-800">{data.delivery_mode}</span>
              </div>
              <div>
                <span className="block text-slate-400 font-bold mb-1">المقابل المالي للساعة:</span>
                {data.hourly_rate ? (
                  <span className="font-black text-emerald-700 text-sm">
                    {data.hourly_rate} {data.currency === 'OTHER' ? data.currency_other : data.currency}
                  </span>
                ) : (
                  <span className="text-slate-400">لم يحدد (غير مطلوب أو قابل للتفاوض)</span>
                )}
              </div>
              {data.additional_notes && (
                <div className="sm:col-span-2">
                  <span className="block text-slate-400 font-bold mb-1">ملاحظات المدرب الإضافية:</span>
                  <p className="rounded-xl bg-white p-3 border border-slate-200 text-slate-700 leading-relaxed">
                    {data.additional_notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Section 5: Admin Notes */}
          <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-5">
            <div className="flex items-center gap-2 mb-2 text-amber-900 font-black text-sm">
              <MessageSquare size={16} />
              <span>ملاحظات وتقييم الإدارة (داخلية):</span>
            </div>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="اكتب ملاحظات داخلية لفريق العمل حول هذا المدرب..."
              className="w-full rounded-xl border border-amber-200 bg-white p-3 text-xs font-semibold text-deepBlue outline-none focus:border-customBlue"
            />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                disabled={savingNotes}
                onClick={handleSaveNotes}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-amber-700 transition disabled:opacity-50"
              >
                {savingNotes ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                حفظ الملاحظات
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            تاريخ التقديم: {new Date(data.created_at).toLocaleDateString('ar-EG')}
          </div>

          <div className="flex items-center gap-2">
            {allowedTransitions.includes('under_review') && (
              <button
                type="button"
                disabled={acting}
                onClick={() => handleStatusChange('under_review')}
                className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white shadow hover:bg-orange-600 transition disabled:opacity-50"
              >
                تحويل لقيد المراجعة
              </button>
            )}

            {allowedTransitions.includes('approved') && (
              <button
                type="button"
                disabled={acting}
                onClick={() => handleStatusChange('approved')}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700 transition disabled:opacity-50"
              >
                قبول المدرب
              </button>
            )}

            {allowedTransitions.includes('rejected') && (
              <button
                type="button"
                disabled={acting}
                onClick={() => handleStatusChange('rejected')}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-red-700 transition disabled:opacity-50"
              >
                رفض الطلب
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
