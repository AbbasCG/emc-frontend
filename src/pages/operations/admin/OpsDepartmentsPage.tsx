import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { motion } from 'framer-motion'
import { Building2 } from 'lucide-react'
import DepartmentCard from '@/components/operations/DepartmentCard'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import EmptyState from '@/components/dashboard/EmptyState'
import { fetchWorkspaceDepartments } from '@/api/operationsApi'
import type { WorkspaceDepartment } from '@/types/operations'

const LOAD_ERROR = 'تعذّر تحميل الإدارات. تحقق من الاتصال وأعد المحاولة.'

export default function OpsDepartmentsPage() {
  const location = useLocation()
  const departmentPathPrefix = location.pathname.startsWith('/dashboard/department')
    ? '/dashboard/department'
    : '/dashboard/admin/departments'

  const [items, setItems] = useState<WorkspaceDepartment[]>([])
  // Starts in the loading state, so the mount effect never has to flip it synchronously.
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [noDeptLinked, setNoDeptLinked] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const result = await fetchWorkspaceDepartments()
        if (cancelled) return
        setItems(result.items)
        setNoDeptLinked(result.noDepartmentLinked)
      } catch {
        if (!cancelled) setLoadError(LOAD_ERROR)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Retry lives outside the effect, so the synchronous reset here is legitimate.
  const retry = useCallback(async () => {
    setLoadError(null)
    setNoDeptLinked(false)
    setLoading(true)
    try {
      const result = await fetchWorkspaceDepartments()
      setItems(result.items)
      setNoDeptLinked(result.noDepartmentLinked)
    } catch {
      setLoadError(LOAD_ERROR)
    } finally {
      setLoading(false)
    }
  }, [])

  if (loading) return <OpsPageSkeleton />

  if (loadError) return (
    <div dir="rtl" className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
      <p className="font-black text-rose-800">{loadError}</p>
      <button type="button" onClick={() => void retry()} className="mt-5 rounded-xl bg-deepBlue px-6 py-2.5 text-sm font-black text-white">
        إعادة المحاولة
      </button>
    </div>
  )

  if (noDeptLinked) return (
    <div dir="rtl" className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100">
        <Building2 className="h-8 w-8 text-amber-500" />
      </div>
      <p className="text-[16px] font-black text-amber-900">لم يتم ربط حسابك بإدارة</p>
      <p className="max-w-sm text-[13px] font-semibold text-amber-700">
        حسابك يحمل دور "مدير الإدارة" ولكن لم يتم تعيينك مسؤولاً عن أي إدارة بعد.
        تواصل مع المسؤول ليقوم بتحديث إعدادات حسابك.
      </p>
    </div>
  )

  return (
    <div className="space-y-8">
      <header className="relative overflow-hidden rounded-[1.35rem] bg-gradient-to-bl from-white via-sky-50/40 to-white p-8 text-right shadow-lg ring-1 ring-deepBlue/[0.06]">
        <div className="pointer-events-none absolute -left-24 top-0 h-56 w-56 rounded-full bg-customBlue/10 blur-3xl" />
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-customBlue">خريطة الإدارات</p>
        <h1 className="mt-2 text-2xl font-black text-deepBlue">منظومة EMC التشغيلية</h1>
        <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-slate-600">
          عرض تكاملي للإدارات، الصحة التشغيلية، والحمولة الحالية.
        </p>
      </header>

      {items.length === 0 ? (
        <EmptyState icon={Building2} title="لا توجد إدارات" description="تظهر البيانات بعد ربط الخادم." />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mx-auto max-w-6xl"
        >
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-[70%] w-[70%] rounded-full border border-dashed border-customBlue/15 bg-customBlue/[0.02]" />
          </div>
          <div className="relative grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((d, i) => (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <DepartmentCard d={d} listPathPrefix={departmentPathPrefix} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
