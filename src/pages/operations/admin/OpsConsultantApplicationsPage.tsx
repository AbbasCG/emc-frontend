import { useState } from 'react'
import { Eye, FileText, RefreshCw, UserCheck, Search } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  fetchConsultantApplication,
  fetchConsultantApplications,
  updateConsultantApplicationStatus,
  type ConsultantApplication,
} from '@/api/consultantApi'
import LoadErrorState from '@/components/dashboard/LoadErrorState'
import ConsultantApplicationDetailModal from '@/components/operations/ConsultantApplicationDetailModal'
import { DetailStateModal } from '@/components/detailModal/DetailModalParts'
import { useDetailParam } from '@/hooks/useDetailParam'
import { useDetailRecord } from '@/hooks/useDetailRecord'
import { useRetryableLoad } from '@/hooks/useRetryableLoad'
import { describeLoadError } from '@/lib/describeLoadError'

/** طلبات المستشارين: مراجعة واعتماد المتقدمين إلى إدارة المستشارين. */

const STATUS_LABELS: Record<ConsultantApplication['status'], string> = {
  new: 'جديد',
  under_review: 'قيد المراجعة',
  interview: 'مقابلة',
  accepted: 'مقبول',
  rejected: 'مرفوض',
  archived: 'مؤرشف',
}

const STATUS_STYLES: Record<ConsultantApplication['status'], string> = {
  new: 'bg-sky/60 text-deepBlue',
  under_review: 'bg-amber-100 text-amber-700',
  interview: 'bg-violet-100 text-violet-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-600',
  archived: 'bg-slate-100 text-slate-500',
}

const FORBIDDEN_VIEW_AR = 'لا تملك صلاحية عرض طلبات الاستشاريين. اطلب منح «عرض طلبات الاستشاريين».'
const FORBIDDEN_UPDATE_AR = 'لا تملك صلاحية تغيير حالة طلبات الاستشاريين.'

export default function OpsConsultantApplicationsPage() {
  const [filters, setFilters] = useState<{ status: string; search: string }>({ status: '', search: '' })
  const [status, setStatus] = useState<string>('')
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const list = useRetryableLoad(
    () => fetchConsultantApplications({ status: filters.status || undefined, search: filters.search || undefined }),
    `consultants:${filters.status}:${filters.search}`,
  )
  // Rows changed from this page (a status move) are layered over the loaded list until it is loaded again.
  const [patched, setPatched] = useState<{ src: unknown; byId: Record<number, Partial<ConsultantApplication>> }>({ src: null, byId: {} })
  const patches = patched.src === list.data ? patched.byId : {}
  const rows = (list.data?.rows ?? []).map((r) => (patches[r.id] ? { ...r, ...patches[r.id] } : r))
  const counts = list.data?.counts ?? {}
  const metaCanUpdate = list.data?.canUpdateStatus === true
  const loadError = list.error ? describeLoadError(list.cause, { forbiddenMessage: FORBIDDEN_VIEW_AR }) : null
  const canUpdate = (r: ConsultantApplication) => (r.can_update_status ?? metaCanUpdate) === true
  const applyFilters = (next: { status: string; search: string }) => setFilters(next)

  function patchRow(id: number, next: Partial<ConsultantApplication>) {
    setPatched({ src: list.data, byId: { ...patches, [id]: { ...patches[id], ...next } } })
  }

  const detail = useDetailParam('view')
  // In the loaded list when it is there; otherwise that one record is requested (and authorized) by itself.
  const fromList = detail.id !== null ? (rows.find((r) => r.id === detail.id) ?? null) : null
  const record = useDetailRecord(detail.id, fromList, fetchConsultantApplication)
  const opened = record.record

  async function setRowStatus(row: ConsultantApplication, next: ConsultantApplication['status']) {
    setBusyId(row.id)
    try {
      const updated = await updateConsultantApplicationStatus(row.id, next)
      patchRow(row.id, updated)
      toast.success(`الحالة الآن: ${STATUS_LABELS[next]}`)
    } catch (e) {
      toast.error(axios.isAxiosError(e) && e.response?.status === 403 ? FORBIDDEN_UPDATE_AR : 'تعذر تحديث الحالة')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-black tracking-normal text-customOrange">إدارة المستشارين</p>
          <h1 className="mt-1 text-2xl font-black text-deepBlue">طلبات المستشارين</h1>
          <p className="mt-1 text-sm text-deepBlue/50">مراجعة المتقدمين واعتماد انضمامهم إلى إدارة المستشارين</p>
        </div>
        <button
          onClick={() => list.retry()}
          className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-deepBlue hover:bg-slate-50"
        >
          <RefreshCw size={15} /> تحديث
        </button>
      </div>

      {/* عدادات الحالات + بحث */}
      <div className="flex flex-wrap items-center gap-2">
        {(['', 'new', 'under_review', 'interview', 'accepted', 'rejected'] as const).map((s) => (
          <button
            key={s || 'all'}
            onClick={() => {
              setStatus(s)
              applyFilters({ status: s, search })
            }}
            className={`rounded-xl px-4 py-2 text-xs font-black transition ${
              status === s ? 'bg-deepBlue text-white' : 'bg-white text-deepBlue border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {s ? STATUS_LABELS[s] : 'الكل'}
            {s && counts[s] ? ` · ${counts[s]}` : ''}
          </button>
        ))}
        <div className="relative ms-auto">
          <Search size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyFilters({ status, search })
            }}
            placeholder="بحث بالاسم أو التخصص…"
            className="w-64 rounded-xl border border-slate-200 bg-white py-2 pe-3 ps-9 text-sm font-semibold text-deepBlue outline-none focus:border-customBlue"
          />
        </div>
      </div>

      {list.loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : loadError ? (
        <LoadErrorState error={loadError} onRetry={list.retry} />
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <UserCheck size={32} className="mx-auto text-slate-300" />
          <p className="mt-4 text-sm font-bold text-slate-400">لا توجد طلبات مطابقة بعد</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
          <table className="w-full min-w-[52rem] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-start text-[11px] font-black text-slate-400">
                <th className="px-5 py-3 text-start">المتقدم</th>
                <th className="px-5 py-3 text-start">التخصص</th>
                <th className="px-5 py-3 text-start">الإدارة المرغوبة</th>
                <th className="px-5 py-3 text-start">الخبرة</th>
                <th className="px-5 py-3 text-start">الحالة</th>
                <th className="px-5 py-3 text-start">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-50 align-top last:border-0">
                  <td className="px-5 py-4">
                    <button type="button" onClick={() => detail.open(row.id)} className="text-start font-black text-deepBlue hover:text-customBlue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/40" aria-label={`عرض تفاصيل ${row.full_name}`}>{row.full_name}</button>
                    <p dir="ltr" className="mt-0.5 text-xs text-slate-400">{row.email}</p>
                    {row.cv_view_url && (
                      <a
                        href={row.cv_view_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-black text-customBlue hover:underline"
                      >
                        <FileText size={12} aria-hidden />
                        معاينة السيرة الذاتية
                      </a>
                    )}
                    {row.motivation && (
                      <p className="mt-1.5 max-w-md text-xs leading-6 text-slate-500 line-clamp-2">{row.motivation}</p>
                    )}
                  </td>
                  <td className="px-5 py-4 font-bold text-ink-600">{row.specialty}</td>
                  <td className="px-5 py-4 text-ink-500">{row.desired_department ?? '—'}</td>
                  <td className="px-5 py-4 tabular-nums text-ink-500">
                    {row.years_experience != null ? `${row.years_experience} سنة` : '—'}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-lg px-2.5 py-1 text-[11px] font-black ${STATUS_STYLES[row.status]}`}>
                      {STATUS_LABELS[row.status]}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" onClick={() => detail.open(row.id)} className="inline-flex items-center gap-1 rounded-lg bg-customBlue px-2.5 py-1 text-[11px] font-black text-white transition hover:brightness-110">
                        <Eye size={12} aria-hidden /> عرض التفاصيل
                      </button>
                      {(canUpdate(row) ? (['under_review', 'interview', 'accepted', 'rejected'] as const) : [])
                        .filter((s) => s !== row.status)
                        .map((s) => (
                          <button
                            key={s}
                            disabled={busyId === row.id}
                            onClick={() => void setRowStatus(row, s)}
                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-deepBlue transition hover:border-customBlue hover:bg-sky/40 disabled:opacity-50"
                          >
                            {STATUS_LABELS[s]}
                          </button>
                        ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detail.id === null ? null : opened ?
        <ConsultantApplicationDetailModal
          app={opened}
          canUpdateStatus={canUpdate(opened)}
          onClose={detail.close}
          onUpdated={(next) => {
            patchRow(next.id, next)
            record.replace({ ...opened, ...next })
          }}
        />
      : <DetailStateModal state={record.state} onClose={detail.close} onRetry={record.retry} />}
    </div>
  )
}
