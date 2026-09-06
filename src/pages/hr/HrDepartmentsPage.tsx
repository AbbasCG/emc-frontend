import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Building2 } from 'lucide-react'
import apiClient from '@/api/axios'
import { asList } from '@/api/lmsApi'
import EmptyState from '@/components/dashboard/EmptyState'
import { HrPageShell } from '@/components/hr/HrLayout'
import { getTeam } from '@/services/teamApi'
import type { WorkspaceDepartment } from '@/types/operations'

export default function HrDepartmentsPage() {
  const [workspace, setWorkspace] = useState<WorkspaceDepartment[] | null>(null)
  const [legacyCount, setLegacyCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let c = false
    ;(async () => {
      let wc: WorkspaceDepartment[] | null
      let lc: number | null
      try {
        const res = await apiClient.get<unknown>('/operations/departments', { skipErrorToast: true })
        wc = asList<WorkspaceDepartment>(res.data)
      } catch {
        wc = null
      }
      try {
        const t = await getTeam()
        lc = t.length
      } catch {
        lc = null
      }
      if (!c) {
        setWorkspace(wc != null ? wc : null)
        setLegacyCount(lc)
        setLoading(false)
      }
    })()
    return () => {
      c = true
    }
  }, [])

  if (loading) return <div className="animate-pulse text-right opacity-70">يتم تحميل الإدارات...</div>

  const legacyTxt = legacyCount != null ? `${legacyCount} وحدة على الموقع العام` : 'لا يتوفر دليل الوحدات العام'

  return (
    <HrPageShell
      title="الإدارات والأدوار"
      description={`إدارات مساحة العمل التشغيلية؛ مع مرجع هيكلي للموقع (${legacyTxt}).`}
    >
      {workspace == null ?
        <p className="rounded-3xl bg-amber-50 px-6 py-8 text-center text-sm font-bold text-amber-900 ring-1 ring-amber-100">
          لم يتم ربط هذا القسم بالبيانات بعد
        </p>
      : workspace.length === 0 ?
        <EmptyState icon={Building2} title="لا توجد إدارات تشغيلية ضمن هذا العرض" />
      : (
        <div className="grid gap-5 lg:grid-cols-2">
          {workspace.map((d, i) => (
            <motion.article
              key={d.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-3xl border border-deepBlue/[0.06] bg-white/[0.9] p-6 shadow-emc ring-1 ring-deepBlue/[0.04]"
            >
              <h2 className="font-black text-deepBlue">{d.title}</h2>
              <dl className="mt-4 space-y-2 text-right text-sm font-semibold text-slate-600">
                <div className="flex justify-between gap-3">
                  <dt>العضو المسؤول</dt>
                  <dd className="text-deepBlue">{d.leader_name ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>عدد الأعضاء</dt>
                  <dd className="font-latin text-deepBlue">{d.members_count}</dd>
                </div>
              </dl>
            </motion.article>
          ))}
        </div>
      )}
    </HrPageShell>
  )
}
