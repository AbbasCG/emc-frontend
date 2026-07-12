import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, UserPlus, UserX } from 'lucide-react'
import toast from '@/lib/toast'
import ConfirmDialog from '@/components/feedback/ConfirmDialog'
import {
  fetchCourseStudents,
  removeStudentFromCourse,
  type CourseParticipant,
} from '@/api/adminCoursesApi'
import { getApiErrorMessage } from '@/api/apiErrors'
import { formatEnglishCount, formatEnglishPercent } from '@/utils/formatEnglishNumber'

const STATUS_LABELS: Record<string, string> = {
  registered: 'مسجّل',
  payment_confirmed: 'مؤكد الدفع',
  attended: 'حضر',
  pending_payment: 'بانتظار الدفع',
  cancelled: 'ملغى',
  confirmed: 'مؤكد',
  active: 'نشط',
  enrolled: 'مسجّل في المسار',
}

function statusLabel(s: string): string {
  return STATUS_LABELS[s] ?? s
}

function statusClass(s: string): string {
  if (['registered', 'payment_confirmed', 'attended', 'confirmed', 'active', 'enrolled'].includes(s)) {
    return 'bg-emerald-100 text-emerald-800'
  }
  if (s === 'pending_payment') return 'bg-amber-100 text-amber-800'
  if (s === 'cancelled') return 'bg-rose-100 text-rose-800'
  return 'bg-slate-100 text-slate-600'
}

type Props = {
  courseId: number
  onChanged?: () => void
  onRequestAdd?: () => void
}

export function CourseStudentsTab({ courseId, onChanged, onRequestAdd }: Props) {
  const [participants, setParticipants] = useState<CourseParticipant[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [confirmRemove, setConfirmRemove] = useState<{ userId: number; name: string } | null>(null)
  const [removeLoading, setRemoveLoading] = useState(false)

  const loadParticipants = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchCourseStudents(courseId, {
        per_page: 100,
        search: search.trim() || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
      })
      setParticipants(res.data)
      setTotal(res.meta.total)
    } catch {
      setParticipants([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [courseId, search, statusFilter])

  useEffect(() => {
    const t = setTimeout(() => void loadParticipants(), search ? 300 : 0)
    return () => clearTimeout(t)
  }, [loadParticipants, search])

  const filtered = useMemo(() => participants, [participants])

  async function doRemove() {
    if (!confirmRemove) return
    setRemoveLoading(true)
    try {
      await removeStudentFromCourse(courseId, confirmRemove.userId)
      toast.success('تم إلغاء تسجيل الطالب')
      setConfirmRemove(null)
      void loadParticipants()
      onChanged?.()
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setRemoveLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-[#22334A]">طلاب الدورة</p>
          <p className="text-[11px] font-medium text-[#22334A]/50">{formatEnglishCount(total)} مشترك</p>
        </div>
        <button
          type="button"
          onClick={() => onRequestAdd?.()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#22334A] px-4 py-2 text-[11px] font-black text-white transition hover:bg-[#2691C2]"
        >
          <UserPlus size={14} /> إضافة طالب
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#22334A]/35" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو البريد…"
            className="w-full rounded-xl border border-[#22334A]/10 bg-white py-2.5 pe-3 ps-9 text-[12px] font-semibold outline-none focus:ring-2 focus:ring-[#2691C2]/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-[#22334A]/10 bg-white px-3 py-2.5 text-[12px] font-bold"
        >
          <option value="all">كل الحالات</option>
          <option value="registered">مسجّل</option>
          <option value="payment_confirmed">مؤكد الدفع</option>
          <option value="attended">حضر</option>
          <option value="pending_payment">بانتظار الدفع</option>
        </select>
      </div>

      {loading ?
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-[#22334A]/6" />
          ))}
        </div>
      : filtered.length === 0 ?
        <div className="rounded-xl border border-dashed border-[#22334A]/15 bg-[#f8fafc] py-12 text-center">
          <UserX size={28} className="mx-auto text-[#22334A]/25" />
          <p className="mt-3 text-sm font-black text-[#22334A]/65">لا يوجد طلاب مسجّلون</p>
          <p className="mt-1 text-[12px] text-[#22334A]/45">استخدم «إضافة طالب» لتسجيل متعلّم في هذه الدورة.</p>
        </div>
      : (
        <div className="overflow-hidden rounded-xl border border-[#22334A]/8">
          {filtered.map((p) => (
            <div
              key={p.registration_id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-[#22334A]/6 px-4 py-3 last:border-0 hover:bg-[#2691C2]/4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`size-2 shrink-0 rounded-full ${p.has_account ? 'bg-emerald-500' : 'bg-amber-400'}`}
                    title={p.has_account ? 'لديه حساب' : 'بدون حساب'}
                  />
                  <p className="text-[13px] font-black text-[#22334A]">{p.name}</p>
                </div>
                <p className="mt-0.5 text-[11px] font-mono text-[#22334A]/50 dir-ltr">{p.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${statusClass(p.status)}`}>
                  {statusLabel(p.status)}
                </span>
                <span className="text-[11px] font-bold tabular-nums text-[#22334A]/55" dir="ltr">{formatEnglishPercent(p.progress_pct)}</span>
                {p.user_id != null ?
                  <button
                    type="button"
                    onClick={() => setConfirmRemove({ userId: p.user_id!, name: p.name })}
                    className="rounded-lg border border-rose-200 px-2.5 py-1 text-[10px] font-black text-rose-600 hover:bg-rose-50"
                  >
                    إزالة
                  </button>
                : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmRemove !== null}
        title="تأكيد إزالة الطالب"
        description={confirmRemove ? `إزالة «${confirmRemove.name}» من هذه الدورة؟` : undefined}
        confirmLabel={removeLoading ? 'جار الإزالة…' : 'تأكيد الإزالة'}
        cancelLabel="إلغاء"
        variant="danger"
        onConfirm={() => void doRemove()}
        onCancel={() => setConfirmRemove(null)}
      />
    </div>
  )
}
