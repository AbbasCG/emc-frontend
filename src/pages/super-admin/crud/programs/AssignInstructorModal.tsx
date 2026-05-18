import { useEffect, useMemo, useState } from 'react'
import { Loader2, Search, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { assignInstructorToCourse } from '@/api/adminCoursesApi'
import { getApiErrorMessage } from '@/api/apiErrors'
import { fetchInstructors, type InstructorPublic } from '@/api/instructorsApi'
import type { Course } from '@/types'
import { CrudModal } from '@/pages/super-admin/crud/shared/Modal'

type Props = {
  open: boolean
  course: Course | null
  onClose: () => void
  onAssigned: () => void
}

export function AssignInstructorModal({ open, course, onClose, onAssigned }: Props) {
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<InstructorPublic[]>([])
  const [loading, setLoading] = useState(false)
  const [assigningId, setAssigningId] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetchInstructors()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [open])

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return rows
    return rows.filter((r) => `${r.name} ${r.title ?? ''} ${r.expertise ?? ''}`.toLowerCase().includes(t))
  }, [rows, q])

  async function assign(ins: InstructorPublic) {
    if (!course) return
    setAssigningId(ins.id)
    try {
      await assignInstructorToCourse(course.id, ins.id)
      toast.success('تم ربط المدرب بالدورة بنجاح')
      onAssigned()
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
        <label className="block">
          <span className="sr-only">بحث</span>
          <span className="relative flex rounded-2xl border border-deepBlue/[0.08] bg-white shadow-inner">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث بالاسم أو التخصّص..."
              className="w-full rounded-2xl border-0 bg-transparent py-3 pe-10 ps-3 text-sm font-semibold outline-none"
            />
          </span>
        </label>

        {loading ?
          <div className="flex justify-center py-14">
            <Loader2 className="size-9 animate-spin text-customBlue" aria-hidden />
          </div>
        : filtered.length === 0 ?
          <p className="py-8 text-center text-sm font-bold text-slate-500">لا يوجد مدربون مطابقون أو تعذّر التحميل.</p>
        : <ul className="max-h-[min(420px,55vh)] space-y-3 overflow-y-auto pe-1">
            {filtered.map((ins) => {
              const tags = (ins.expertise ?? '')
                .split(/[,،]/)
                .map((s) => s.trim())
                .filter(Boolean)
                .slice(0, 4)
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
                      {ins.title ?
                        <p className="truncate text-[11px] font-semibold text-slate-500">{ins.title}</p>
                      : null}
                      {tags.length > 0 ?
                        <div className="mt-2 flex flex-wrap justify-end gap-1">
                          {tags.map((tag) => (
                            <span key={tag} className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-customBlue ring-1 ring-sky-100">
                              {tag}
                            </span>
                          ))}
                        </div>
                      : null}
                      <p className="mt-1 text-[10px] font-bold text-slate-400">
                        دورات مسنَدة (مرجع كتالوج):{' '}
                        <span className="font-mono text-deepBlue">{ins.courses_count ?? '—'}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void assign(ins)}
                    className="shrink-0 rounded-xl bg-gradient-to-l from-[#22334A] to-[#2691C2] px-4 py-2 text-xs font-black text-white shadow-md disabled:opacity-50"
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
