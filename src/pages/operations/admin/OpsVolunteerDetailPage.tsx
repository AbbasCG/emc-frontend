import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import axios from 'axios'
import apiClient from '@/api/axios'
import LoadErrorState from '@/components/dashboard/LoadErrorState'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import { fetchVolunteer, updateVolunteer } from '@/api/volunteersApi'
import { fetchWorkspaceDepartments } from '@/api/operationsApi'
import { asList } from '@/api/lmsApi'
import { VOLUNTEER_STATUS_AR } from '@/data/operationsLabels'
import { useRetryableLoad } from '@/hooks/useRetryableLoad'
import { describeLoadError } from '@/lib/describeLoadError'
import type { OpsVolunteer, VolunteerStatus, WorkspaceDepartment } from '@/types/operations'

const FORBIDDEN_VIEW_AR = 'لا تملك صلاحية عرض بيانات هذا المتطوع. اطلب من مسؤول الوصول منحك الصلاحية المناسبة.'
const FORBIDDEN_SAVE_AR = 'لا تملك صلاحية تعديل بيانات هذا المتطوع.'
const SAVE_FAILED_AR = 'تعذّر حفظ التعديل. حاول مرة أخرى.'
const DEPTS_UNAVAILABLE_AR = 'تعذّر تحميل قائمة الإدارات، لذلك لا يمكن تغيير الإدارة الآن.'

type DepartmentOption = Pick<WorkspaceDepartment, 'id' | 'title'>

/**
 * The department list only feeds the edit dropdown, so it must never fail the page: try the operations list,
 * then the open `GET /departments/options`, and report "unavailable" (null) when neither answers.
 */
async function loadDepartmentOptions(): Promise<DepartmentOption[] | null> {
  try {
    const { items } = await fetchWorkspaceDepartments({ silent: true })
    return items
  } catch {
    // fall through to the open list
  }
  try {
    const res = await apiClient.get<unknown>('/departments/options', { skipErrorToast: true })
    return asList<{ id: number | string; name_ar?: string | null; name?: string | null }>(res.data).map((d) => ({
      id: String(d.id),
      title: d.name_ar || d.name || String(d.id),
    }))
  } catch {
    return null
  }
}

async function loadVolunteerPage(vid: number): Promise<{ volunteer: OpsVolunteer; depts: DepartmentOption[] | null }> {
  const [vol, depts] = await Promise.allSettled([fetchVolunteer(vid), loadDepartmentOptions()])
  if (vol.status === 'rejected') throw vol.reason
  return { volunteer: vol.value, depts: depts.status === 'fulfilled' ? depts.value : null }
}

export default function OpsVolunteerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const volunteerListPath = location.pathname.startsWith('/dashboard/volunteer')
    ? '/dashboard/volunteer'
    : '/dashboard/admin/volunteers'
  const vid = id ? Number(id) : NaN
  const validId = Number.isFinite(vid)
  const load = useRetryableLoad(() => loadVolunteerPage(vid), `volunteer:${vid}`, validId)
  const [edited, setEdited] = useState<{ src: OpsVolunteer; value: OpsVolunteer } | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [canEdit, setCanEdit] = useState(true)
  const [notes] = useState('مساحة الملاحظات الداخلية قيد ربط الـ API.')

  const loaded = load.data
  const v = loaded ? (edited?.src === loaded.volunteer ? edited.value : loaded.volunteer) : null
  const depts = loaded?.depts ?? []
  const deptsUnavailable = loaded != null && loaded.depts == null
  const loadError = load.error ? describeLoadError(load.cause, { forbiddenMessage: FORBIDDEN_VIEW_AR }) : null

  /** Optimistic update that is rolled back, with a message, when the server refuses or fails. */
  async function save(patch: Partial<OpsVolunteer>, body: Parameters<typeof updateVolunteer>[1]) {
    if (!v || !loaded) return
    const previous = v
    const src = loaded.volunteer
    setSaveError(null)
    setEdited({ src, value: { ...v, ...patch } })
    try {
      const u = await updateVolunteer(v.id, body)
      setEdited({ src, value: u })
    } catch (e) {
      setEdited({ src, value: previous })
      if (axios.isAxiosError(e) && e.response?.status === 403) {
        setCanEdit(false)
        setSaveError(FORBIDDEN_SAVE_AR)
      } else {
        setSaveError(SAVE_FAILED_AR)
      }
    }
  }

  function patchStatus(status: VolunteerStatus) {
    void save({ status }, { status })
  }

  function patchDept(department_id: string) {
    const name = depts.find((d) => d.id === department_id)?.title
    void save({ department_id, department_name: name ?? null }, { department_id })
  }

  if (!Number.isFinite(vid)) return <p className="text-center font-black text-deepBlue">معرف غير صالح</p>
  if (load.loading) return <OpsPageSkeleton />
  if (loadError) return <LoadErrorState error={loadError} onRetry={load.retry} />
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
              disabled={!canEdit}
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
              disabled={!canEdit || deptsUnavailable}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold text-deepBlue"
            >
              <option value=""> اختر </option>
              {depts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </label>

          {saveError ?
            <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-right text-xs font-black text-rose-800 ring-1 ring-rose-200">
              {saveError}
            </p>
          : null}
          {deptsUnavailable ?
            <p role="status" className="rounded-xl bg-amber-50 px-4 py-3 text-right text-xs font-bold text-amber-900 ring-1 ring-amber-200">
              {DEPTS_UNAVAILABLE_AR}
            </p>
          : null}

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
