import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { HeartHandshake } from 'lucide-react'
import apiClient from '@/api/axios'
import EmptyState from '@/components/dashboard/EmptyState'
import { HrPageShell } from '@/components/hr/HrLayout'
import { asList } from '@/api/lmsApi'
import type { OpsVolunteer } from '@/types/operations'

const STATUS_AR: Partial<Record<OpsVolunteer['status'], string>> = {
  applied: 'مقدّم',
  review: 'قيد المراجعة',
  accepted: 'مقبول',
  active: 'نشط',
  partial: 'جزئي',
  inactive: 'غير نشط',
  withdrawn: 'منسحب',
}

export default function HrVolunteersPage() {
  const [rows, setRows] = useState<OpsVolunteer[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let c = false
    ;(async () => {
      try {
        const res = await apiClient.get<unknown>('/operations/volunteers', { skipErrorToast: true })
        const list = asList<OpsVolunteer>(res.data)
        if (!c) setRows(list)
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

  if (loading)
    return <div className="animate-pulse text-right opacity-70">يتم تحميل المتطوعين...</div>

  return (
    <HrPageShell title="المتطوعون" description="قائمة المتطوعين من وحدة عمليات المنصّة عند توفر الصلاحية لهذا الدور.">
      {rows == null ?
        <p className="rounded-3xl bg-amber-50 px-6 py-8 text-center text-sm font-bold text-amber-900 ring-1 ring-amber-100">
          لم يتم ربط هذا القسم بالبيانات بعد
        </p>
      : rows.length === 0 ?
        <EmptyState icon={HeartHandshake} title="لا يوجد متطوعون في السجل الحالي" />
      : (
        <div className="overflow-x-auto rounded-[1.65rem] border border-deepBlue/[0.06] bg-white/[0.9] shadow-emc ring-1 ring-deepBlue/[0.04]">
          <table className="min-w-[640px] w-full divide-y divide-slate-100 text-right text-sm">
            <thead className="bg-slate-50/90 text-[11px] font-black uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">الاسم</th>
                <th className="px-4 py-3">الوحدة</th>
                <th className="px-4 py-3">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-semibold text-deepBlue">
              {rows.map((v, i) => (
                <motion.tr key={v.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                  <td className="px-4 py-3">{v.name}</td>
                  <td className="px-4 py-3 text-slate-600">{v.department_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-brand-500/12 px-2.5 py-1 text-[11px] font-black text-brand-800 ring-1 ring-brand-500/20">
                      {STATUS_AR[v.status] ?? v.status}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </HrPageShell>
  )
}
