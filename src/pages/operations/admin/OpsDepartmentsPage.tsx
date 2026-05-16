import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import DepartmentCard from '@/components/operations/DepartmentCard'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import EmptyState from '@/components/dashboard/EmptyState'
import { fetchWorkspaceDepartments } from '@/api/operationsApi'
import { seedWorkspaceDepartments } from '@/data/operationsSeed'
import type { WorkspaceDepartment } from '@/types/operations'
import { Building2 } from 'lucide-react'

export default function OpsDepartmentsPage() {
  const location = useLocation()
  const departmentPathPrefix = location.pathname.startsWith('/dashboard/department')
    ? '/dashboard/department'
    : '/dashboard/admin/departments'

  const [items, setItems] = useState<WorkspaceDepartment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const d = await fetchWorkspaceDepartments()
        if (!cancelled) setItems(d)
      } catch {
        if (!cancelled) setItems(seedWorkspaceDepartments())
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <OpsPageSkeleton />

  return (
    <div className="space-y-8">
      <header className="relative overflow-hidden rounded-[1.35rem] bg-gradient-to-bl from-white via-sky-50/40 to-white p-8 text-right shadow-lg ring-1 ring-deepBlue/[0.06]">
        <div className="pointer-events-none absolute -left-24 top-0 h-56 w-56 rounded-full bg-customBlue/10 blur-3xl" />
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-customBlue">خريطة الإدارات</p>
        <h1 className="mt-2 text-2xl font-black text-deepBlue">منظومة EMC التشغيلية</h1>
        <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-slate-600">
          عرض تكاملي للإدارات العشر، الصحة التشغيلية، والحمولة الحالية — تصميم يذكرك بلوحة قيادة حديثة دون
          فقدان الهوية العربية للمؤسسة.
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
