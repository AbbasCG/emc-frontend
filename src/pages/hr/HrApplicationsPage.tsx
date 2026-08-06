import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ClipboardList } from 'lucide-react'
import apiClient from '@/api/axios'
import { asList } from '@/api/lmsApi'
import EmptyState from '@/components/dashboard/EmptyState'
import { HrPageShell } from '@/components/hr/HrLayout'
import type { OpsVolunteer } from '@/types/operations'

function isPendingJoin(v: OpsVolunteer) {
  return v.status === 'applied' || v.status === 'review'
}

export default function HrApplicationsPage() {
  const [rows, setRows] = useState<OpsVolunteer[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let c = false
    ;(async () => {
      try {
        const res = await apiClient.get<unknown>('/operations/volunteers', { skipErrorToast: true })
        const list = asList<OpsVolunteer>(res.data)
        if (!c) setRows(list.filter(isPendingJoin))
      } catch {
        if (!c) setRows(null)
      } finally {
        if (!c) setLoading(false)
      }
    })()
    return () => {
      c = true
    }
  }, [])

  if (loading) return <div className="animate-pulse text-right opacity-70">يتم تحميل الطلبات...</div>

  return (
    <HrPageShell
      title="طلبات الانضمام"
      description="مسارات الانضمام كمتطوع (التقديم والمراجعة). يمكن تركيب نقاط تعيين أخرى لاحقًا دون إعادة بناء هذه الصفحة."
    >
      {rows == null ?
        <p className="rounded-3xl bg-amber-50 px-6 py-8 text-center text-sm font-bold text-amber-900 ring-1 ring-amber-100">
          لم يتم ربط هذا القسم بالبيانات بعد
        </p>
      : rows.length === 0 ?
        <EmptyState icon={ClipboardList} title="لا توجد طلبات متطوعين في المراحل الأولى" />
      : (
        <div className="overflow-x-auto rounded-[1.65rem] border border-deepBlue/[0.06] bg-white/[0.9] shadow-emc ring-1 ring-deepBlue/[0.04]">
          <table className="min-w-[560px] w-full divide-y divide-slate-100 text-right text-sm">
            <thead className="bg-slate-50/90 text-[11px] font-black uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">المتقدّم</th>
                <th className="px-4 py-3">الوحدة</th>
                <th className="px-4 py-3">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-semibold">
              {rows.map((v, i) => (
                <motion.tr key={v.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                  <td className="px-4 py-3 text-deepBlue">{v.name}</td>
                  <td className="px-4 py-3 text-slate-600">{v.department_name ?? '—'}</td>
                  <td className="px-4 py-3 text-customOrange">{v.status === 'applied' ? 'مقدّم' : 'مراجعة'}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </HrPageShell>
  )
}
