import { motion } from 'framer-motion'
import { ClipboardCheck } from 'lucide-react'
import apiClient from '@/api/axios'
import { asList } from '@/api/lmsApi'
import EmptyState from '@/components/dashboard/EmptyState'
import LoadErrorState from '@/components/dashboard/LoadErrorState'
import { HrPageShell } from '@/components/hr/HrLayout'
import { useRetryableLoad } from '@/hooks/useRetryableLoad'
import { describeLoadError } from '@/lib/describeLoadError'
import type { OpsVolunteer } from '@/types/operations'

const FORBIDDEN_AR = 'لا تملك صلاحية عرض مسارات التأهيل. اطلب من مسؤول الوصول منحك الصلاحية المناسبة.'

async function loadOnboarding(): Promise<OpsVolunteer[]> {
  const res = await apiClient.get<unknown>('/operations/volunteers', { skipErrorToast: true })
  return asList<OpsVolunteer>(res.data).filter(
    (v) => Boolean(v.onboarding_step) || v.status === 'applied' || v.status === 'review' || v.status === 'accepted',
  )
}

export default function HrOnboardingPage() {
  const load = useRetryableLoad(loadOnboarding, 'hr-onboarding')
  const rows = load.data ?? []
  const loadError = load.error ? describeLoadError(load.cause, { forbiddenMessage: FORBIDDEN_AR }) : null

  if (load.loading) return <div className="animate-pulse text-right opacity-70">يتم تحميل مسارات التأهيل...</div>

  return (
    <HrPageShell
      title="التأهيل والانضمام"
      description="خطوات التأهيل المسجلة للمتطوعين عبر نظام العمليات. لمزامنة مهام تأهيل أوسع مع HR، ضع نقطة تجمع في الخلفية."
    >
      {loadError ?
        <LoadErrorState error={loadError} onRetry={load.retry} />
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
