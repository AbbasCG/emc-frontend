import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import { fetchVolunteer, updateVolunteer } from '@/api/volunteersApi'
import { fetchWorkspaceDepartments } from '@/api/operationsApi'
import { VOLUNTEER_STATUS_AR } from '@/data/operationsLabels'
import type { OpsVolunteer, VolunteerStatus, WorkspaceDepartment } from '@/types/operations'

export default function OpsVolunteerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const volunteerListPath = location.pathname.startsWith('/dashboard/volunteer')
    ? '/dashboard/volunteer'
    : '/dashboard/admin/volunteers'
  const vid = id ? Number(id) : NaN
  const [v, setV] = useState<OpsVolunteer | null>(null)
  const [depts, setDepts] = useState<WorkspaceDepartment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notes] = useState('مساحة الملاحظات الداخلية — قيد ربط الـ API.')

  async function load() {
    if (!Number.isFinite(vid)) return
    setLoadError(null)
    setLoading(true)
    try {
      const [vData, dData] = await Promise.all([
        fetchVolunteer(vid),
        fetchWorkspaceDepartments(),
      ])
      setV(vData)
      setDepts(dData.items)
    } catch {
      setLoadError('تعذّر تحميل بيانات المتطوع. تحقق من الاتصال وأعد المحاولة.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [vid])

  async function patchStatus(status: VolunteerStatus) {
    if (!v) return
    setV({ ...v, status })
    try {
      const u = await updateVolunteer(v.id, { status })
      setV(u)
    } catch {
      /* keep local */
    }
  }

  async function patchDept(department_id: string) {
    if (!v) return
    const name = depts.find((d) => d.id === department_id)?.title
    setV({ ...v, department_id, department_name: name ?? null })
    try {
      const u = await updateVolunteer(v.id, { department_id })
      setV(u)
    } catch {
      /* keep local */
    }
  }

  if (!Number.isFinite(vid)) return <p className="text-center font-black text-deepBlue">معرف غير صالح</p>
  if (loading) return <OpsPageSkeleton />
  if (loadError) return (
    <div dir="rtl" className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
      <p className="font-black text-rose-800">{loadError}</p>
      <button type="button" onClick={() => void load()} className="mt-5 rounded-xl bg-deepBlue px-6 py-2.5 text-sm font-black text-white">إعادة المحاولة</button>
    </div>
  )
  if (!v) return <OpsPageSkeleton />

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <Link
        to={volunteerListPath}
        className="inline-flex items-center gap-1 text-xs font-black text-customBlue hover:text-customOrange"
      >
        <ChevronLeft size={14} />
        قائمة المتطوعين
      </Link>

      <div className="rounded-[1.35rem] bg-white p-8 text-right shadow-xl ring-1 ring-deepBlue/[0.06]">
        <h1 className="text-2xl font-black text-deepBlue">{v.name}</h1>
        <p className="mt-2 text-xs font-bold text-slate-500">{v.department_name ?? 'بدون إدارة'}</p>

        <div className="mt-8 grid gap-6">
          <label className="grid gap-2 text-xs font-black text-deepBlue">
            الحالة
            <select
              value={v.status}
              onChange={(e) => patchStatus(e.target.value as VolunteerStatus)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold text-deepBlue"
            >
              {(Object.keys(VOLUNTEER_STATUS_AR) as VolunteerStatus[]).map((k) => (
                <option key={k} value={k}>
                  {VOLUNTEER_STATUS_AR[k]}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-xs font-black text-deepBlue">
            الإدارة
            <select
              value={v.department_id ?? ''}
              onChange={(e) => patchDept(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold text-deepBlue"
            >
              <option value="">— اختر —</option>
              {depts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </label>

          <div>
            <p className="text-xs font-black text-deepBlue">المهارات</p>
            <div className="mt-2 flex flex-wrap justify-end gap-2">
              {(v.skills ?? []).map((s) => (
                <span key={s} className="rounded-lg bg-deepBlue/[0.06] px-2 py-1 text-[11px] font-black text-deepBlue">
                  {s}
                </span>
              ))}
            </div>
          </div>

          <dl className="grid gap-2 text-right text-xs font-bold text-slate-600">
            <div className="flex justify-between gap-2">
              <dt>التوفر</dt>
              <dd>{v.availability ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>الساعات</dt>
              <dd>{v.hours_logged ?? 0}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>خطوة الانضمام</dt>
              <dd>{v.onboarding_step ?? '—'}</dd>
            </div>
          </dl>

          <div className="rounded-xl bg-slate-50 px-4 py-3 text-right ring-1 ring-slate-100">
            <p className="text-[11px] font-black text-slate-400">ملاحظات داخلية</p>
            <p className="mt-2 text-sm font-medium text-slate-600">{notes}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
