import { motion } from 'framer-motion'
import { Building2 } from 'lucide-react'
import apiClient from '@/api/axios'
import { asList } from '@/api/lmsApi'
import EmptyState from '@/components/dashboard/EmptyState'
import LoadErrorState from '@/components/dashboard/LoadErrorState'
import { HrPageShell } from '@/components/hr/HrLayout'
import { useRetryableLoad } from '@/hooks/useRetryableLoad'
import { describeLoadError } from '@/lib/describeLoadError'
import { getTeam } from '@/services/teamApi'

/** One row of GET /api/hr/departments (the HR manager's own endpoint). */
type HrDepartment = {
  id: number | string
  name: string
  team_members_count?: number | null
  volunteers_count?: number | null
  tasks_count?: number | null
}

const FORBIDDEN_AR = 'لا تملك صلاحية عرض الإدارات. اطلب من مسؤول الوصول منحك صلاحية عرض الإدارات.'

async function loadDepartments(): Promise<{ departments: HrDepartment[]; legacyCount: number | null }> {
  const res = await apiClient.get<unknown>('/hr/departments', { skipErrorToast: true })
  const departments = asList<HrDepartment>(res.data)
  // The public team directory is only a reference line: its failure must not hide the departments.
  const legacyCount = await getTeam().then((t) => t.length, () => null)
  return { departments, legacyCount }
}

export default function HrDepartmentsPage() {
  const load = useRetryableLoad(loadDepartments, 'hr-departments')
  const loadError = load.error ? describeLoadError(load.cause, { forbiddenMessage: FORBIDDEN_AR }) : null
  const workspace = load.data?.departments ?? []
  const legacyCount = load.data?.legacyCount ?? null

  if (load.loading) return <div className="animate-pulse text-right opacity-70">يتم تحميل الإدارات...</div>

  const legacyTxt = legacyCount != null ? `${legacyCount} وحدة على الموقع العام` : 'لا يتوفر دليل الوحدات العام'

  return (
    <HrPageShell
      title="الإدارات والأدوار"
      description={`إدارات المنصّة؛ مع مرجع هيكلي للموقع (${legacyTxt}).`}
    >
      {loadError ?
        <LoadErrorState error={loadError} onRetry={load.retry} />
      : workspace.length === 0 ?
        <EmptyState icon={Building2} title="لا توجد إدارات ضمن هذا العرض" />
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
              <h2 className="font-black text-deepBlue">{d.name}</h2>
              <dl className="mt-4 space-y-2 text-right text-sm font-semibold text-slate-600">
                <div className="flex justify-between gap-3">
                  <dt>عدد الأعضاء</dt>
                  <dd className="font-latin text-deepBlue">{d.team_members_count ?? 0}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>عدد المتطوعين</dt>
                  <dd className="font-latin text-deepBlue">{d.volunteers_count ?? 0}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>عدد المهام</dt>
                  <dd className="font-latin text-deepBlue">{d.tasks_count ?? 0}</dd>
                </div>
              </dl>
            </motion.article>
          ))}
        </div>
      )}
    </HrPageShell>
  )
}
