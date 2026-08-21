import { useCallback, useEffect, useMemo, useState } from 'react'
import { Lock, LockOpen, RefreshCw, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import {
  BOARD_COLUMNS,
  fetchOperationsBoard,
  lockTask,
  unlockTask,
  type BoardColumns,
  type BoardTask,
} from '@/api/operationsBoardApi'

/**
 * لوحة التشغيل — مرئية لكل الفريق: من يعمل على ماذا، وأين وصلت كل مهمة.
 * المهمة المقفلة مُسلَّمة نهائياً ولا يعدلها أحد حتى يفتحها مدير مخوَّل.
 */

const MANAGER_ROLES = new Set([
  'admin', 'super_admin', 'tech_admin', 'executive_admin',
  'hr_manager', 'operations_manager', 'department_manager',
])

const PRIORITY_STYLES: Record<BoardTask['priority'], string> = {
  low: 'bg-slate-100 text-slate-500',
  medium: 'bg-sky/60 text-deepBlue',
  high: 'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-600',
}

const PRIORITY_LABELS: Record<BoardTask['priority'], string> = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
  urgent: 'عاجلة',
}

export default function OperationsBoardPage() {
  const { user } = useAuth()
  const [columns, setColumns] = useState<BoardColumns>({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)

  const canLock = MANAGER_ROLES.has(user?.role ?? '')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setColumns(await fetchOperationsBoard())
    } catch {
      toast.error('فشل تحميل لوحة التشغيل')
    } finally {
      setLoading(false)
    }
  }, [])

  // Mount fetch — inline async IIFE per effect-patterns.md; `load` stays for the
  // refresh button, which may re-arm the loading state synchronously in a handler.
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const data = await fetchOperationsBoard()
        if (alive) setColumns(data)
      } catch {
        if (alive) toast.error('فشل تحميل لوحة التشغيل')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const totals = useMemo(() => {
    const all = Object.values(columns).flat()
    return {
      total: all.length,
      locked: all.filter((t) => t.locked_at).length,
      assigned: all.filter((t) => t.assigned_to).length,
    }
  }, [columns])

  async function toggleLock(task: BoardTask) {
    setBusyId(task.id)
    try {
      if (task.locked_at) {
        await unlockTask(task.id)
        toast.success('فُتحت المهمة للتعديل')
      } else {
        await lockTask(task.id)
        toast.success('قُفلت المهمة — لا تعديل بعد الآن')
      }
      await load()
    } catch {
      toast.error('تعذر تغيير حالة القفل')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-customOrange">Operations</p>
          <h1 className="mt-1 text-2xl font-black text-deepBlue">لوحة التشغيل</h1>
          <p className="mt-1 text-sm text-deepBlue/50">
            {totals.total} مهمة · {totals.assigned} معيَّنة · {totals.locked} مقفلة — يراها كل الفريق
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-deepBlue hover:bg-slate-50"
        >
          <RefreshCw size={15} /> تحديث
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex min-w-max gap-4">
            {BOARD_COLUMNS.map((col) => {
              const tasks = columns[col.key] ?? []
              if (tasks.length === 0 && ['postponed', 'cancelled'].includes(col.key)) return null
              return (
                <section key={col.key} className="w-72 shrink-0">
                  <header className="flex items-center justify-between rounded-t-2xl border border-b-0 border-slate-100 bg-slate-50/80 px-4 py-2.5">
                    <h2 className="text-xs font-black text-deepBlue">{col.label}</h2>
                    <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-black tabular-nums text-slate-500">
                      {tasks.length}
                    </span>
                  </header>
                  <div className="space-y-2.5 rounded-b-2xl border border-slate-100 bg-white p-3">
                    {tasks.length === 0 && (
                      <p className="py-6 text-center text-[11px] font-bold text-slate-300">لا مهام هنا</p>
                    )}
                    {tasks.map((task) => (
                      <article
                        key={task.id}
                        className={`rounded-xl border p-3 transition ${
                          task.locked_at ? 'border-slate-200 bg-slate-50/70' : 'border-slate-100 bg-white hover:border-customBlue/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h3 className={`text-[13px] font-black leading-snug ${task.locked_at ? 'text-slate-500' : 'text-deepBlue'}`}>
                            {task.title}
                          </h3>
                          {task.locked_at ? (
                            <Lock size={13} className="mt-0.5 shrink-0 text-slate-400" aria-label="مهمة مقفلة" />
                          ) : null}
                        </div>
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-black ${PRIORITY_STYLES[task.priority]}`}>
                            {PRIORITY_LABELS[task.priority]}
                          </span>
                          {task.department && (
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                              {task.department.name}
                            </span>
                          )}
                        </div>
                        <div className="mt-2.5 flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 text-[11px] font-bold text-ink-500">
                            <User size={12} className="text-customBlue" aria-hidden />
                            {task.assigned_to?.name ?? 'غير معيَّنة'}
                          </span>
                          {canLock && (
                            <button
                              disabled={busyId === task.id}
                              onClick={() => void toggleLock(task)}
                              className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-black text-deepBlue transition hover:border-customBlue disabled:opacity-50"
                            >
                              {task.locked_at ? <LockOpen size={11} /> : <Lock size={11} />}
                              {task.locked_at ? 'فتح' : 'قفل'}
                            </button>
                          )}
                        </div>
                        {task.due_date && (
                          <p className="mt-2 text-[10px] font-bold tabular-nums text-slate-400">
                            الاستحقاق: {task.due_date.slice(0, 10)}
                          </p>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
