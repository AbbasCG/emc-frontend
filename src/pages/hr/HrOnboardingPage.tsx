import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ClipboardCheck } from 'lucide-react'
import apiClient from '@/api/axios'
import { asList } from '@/api/lmsApi'
import EmptyState from '@/components/dashboard/EmptyState'
import { HrPageShell } from '@/components/hr/HrLayout'
import type { OpsVolunteer } from '@/types/operations'

export default function HrOnboardingPage() {
  const [rows, setRows] = useState<OpsVolunteer[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let c = false
    ;(async () => {
      try {
        const res = await apiClient.get<unknown>('/operations/volunteers', { skipErrorToast: true })
        const list = asList<OpsVolunteer>(res.data)
        if (!c)
          setRows(
            list.filter(
              (v) =>
                Boolean(v.onboarding_step) ||
                v.status === 'applied' ||
                v.status === 'review' ||
                v.status === 'accepted',
            ),
          )
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

  if (loading) return <div className="animate-pulse text-right opacity-70">يتم تحميل مسارات التأهيل...</div>

  return (
    <HrPageShell
      title="التأهيل والانضمام"
      description="خطوات التأهيل المسجلة للمتطوعين عبر نظام العمليات. لمزامنة مهام تأهيل أوسع مع HR، ضع نقطة تجمع في الخلفية."
    >
      {rows == null ?
        <p className="rounded-3xl bg-amber-50 px-6 py-8 text-center text-sm font-bold text-amber-900 ring-1 ring-amber-100">
          لم يتم ربط هذا القسم بالبيانات بعد
        </p>
      : rows.length === 0 ?
        <EmptyState icon={ClipboardCheck} title="لا توجد سجلات تأهيل واضحة في العيّنة الحالية" />
      : (
        <div className="overflow-x-auto rounded-[1.65rem] border border-deepBlue/[0.06] bg-white/[0.9] shadow-emc ring-1 ring-deepBlue/[0.04]">
          <table className="min-w-[600px] w-full divide-y divide-slate-100 text-right text-sm">
            <thead className="bg-slate-50/90 text-[11px] font-black uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">الجهة</th>
                <th className="px-4 py-3">خطوة التأهيل</th>
                <th className="px-4 py-3">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-semibold">
              {rows.map((v, i) => (
                <motion.tr key={v.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                  <td className="px-4 py-3 text-deepBlue">{v.name}</td>
                  <td className="px-4 py-3 text-slate-600">{v.onboarding_step ?? '—'}</td>
                  <td className="px-4 py-3 text-brand-700">{v.status}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </HrPageShell>
  )
}
