import { useEffect, useMemo, useState } from 'react'
import { Loader2, Search, UserRound } from 'lucide-react'
import toast from '@/lib/toast'
import { assignInstructorToCourse } from '@/api/adminCoursesApi'
import { fetchAdminInstructors, type AdminInstructorOption } from '@/api/adminInstructorsApi'
import { getApiErrorMessage } from '@/api/apiErrors'
import type { Course } from '@/types'
import { CrudModal } from '@/pages/super-admin/crud/shared/Modal'

type Props = {
  open: boolean
  course: Course | null
  onClose: () => void
  /** Called after successful assign — includes chosen instructor for optimistic UI merge. */
  onAssigned?: (instructor: AdminInstructorOption) => void
}

export function AssignInstructorModal({ open, course, onClose, onAssigned }: Props) {
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<AdminInstructorOption[]>([])
  // Mounted already open ⇒ the effect below fetches straight away, so start loading.
  const [loading, setLoading] = useState(open)
  const [assigningId, setAssigningId] = useState<number | null>(null)

  // Flip back to the loading state during render when the modal opens
  // (react.dev "adjusting state when a prop changes"), not from the effect.
  const [seenOpen, setSeenOpen] = useState(open)
  if (seenOpen !== open) {
    setSeenOpen(open)
    if (open) setLoading(true)
  }

  useEffect(() => {
    if (!open) return
    let alive = true
    void (async () => {
      try {
        const list = await fetchAdminInstructors()
        if (alive) setRows(list)
      } catch {
        if (alive) setRows([])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [open])

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return rows
    return rows.filter((r) => `${r.name} ${r.email}`.toLowerCase().includes(t))
  }, [rows, q])

  async function assign(ins: AdminInstructorOption) {
    if (!course) return
    setAssigningId(ins.id)
    try {
      await assignInstructorToCourse(course.id, ins.id)
      toast.success('تم تعيين المدرب بنجاح')
      onAssigned?.(ins)
      onClose()
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setAssigningId(null)
    }
  }

  return (
    <CrudModal
      open={open}
      onClose={onClose}
      title="تعيين مدرب"
      subtitle={course ? course.title : undefined}
      widthClassName="max-w-lg"
    >
      <div className="space-y-4 text-right" dir="rtl">
        <p className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-[11px] font-bold text-amber-950">
          يُحمَّل المدربون من جدول المدربين (معرّف الإسناد = id المدرب). إن ظهرت القائمة فارغة افتح وحدة تحكم المتصفح وتحقّق من شكل استجابة GET /api/admin/instructors.
        </p>
        <label className="block">
          <span className="sr-only">بحث</span>
          <span className="relative flex rounded-2xl border border-deepBlue/[0.08] bg-white shadow-inner">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث بالاسم أو البريد..."
              className="w-full rounded-2xl border-0 bg-transparent py-3 pe-10 ps-3 text-sm font-semibold outline-none"
            />
          </span>
        </label>

        {loading ?
          <div className="flex justify-center py-14">
            <Loader2 className="size-9 animate-spin text-customBlue" aria-hidden />
          </div>
        : filtered.length === 0 ?
          <p className="py-8 text-center text-sm font-bold text-slate-500">
            لا توجد عناصر بعد التحميل وتطبيع الخادم راجع وحدة تحكم المتصفح (سجلات الاستجابة والمدربين المُطبّعين) أو صلاحيات الجلسة.
          </p>
        : <ul className="max-h-[min(420px,55vh)] space-y-3 overflow-y-auto pe-1">
            {filtered.map((ins) => {
              const busy = assigningId === ins.id
              return (
                <li
                  key={ins.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-deepBlue shadow ring-1 ring-slate-100">
                      <UserRound className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0 text-right">
                      <p className="truncate font-black text-deepBlue">{ins.name}</p>
                      <p className="truncate text-[11px] font-semibold text-slate-500 dir-ltr">{ins.email || '—'}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void assign(ins)}
                    className="shrink-0 rounded-xl bg-gradient-to-l from-[#0C2A4B] to-[#0077B6] px-4 py-2 text-xs font-black text-white shadow-md disabled:opacity-50"
                  >
                    {busy ?
                      <>
                        <Loader2 className="inline size-4 animate-spin" aria-hidden /> جاري…
                      </>
                    : 'تعيين'}
                  </button>
                </li>
              )
            })}
          </ul>
        }
      </div>
    </CrudModal>
  )
}
