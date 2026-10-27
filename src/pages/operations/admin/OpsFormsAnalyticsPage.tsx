import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import { fetchAnalyticsOverview, parseAnalyticsError } from '@/api/formsAnalyticsApi'
import type { AnalyticsOverview } from '@/api/formsAnalyticsApi'
import { FORM_STATUS_AR } from '@/data/operationsLabels'
import { formatDateTime } from '@/utils/dateTime'

const FIELD = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-deepBlue outline-none focus:border-customBlue'

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-4 text-right shadow-md ring-1 ring-deepBlue/[0.06]">
      <p className="text-[11px] font-black text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums text-deepBlue">{value}</p>
    </div>
  )
}

/**
 * Responses across the forms whose responses the person may read, by department and period. Each form opens on its own page,
 * where the Analytics tab has the details.
 */
export default function OpsFormsAnalyticsPage() {
  const [departmentId, setDepartmentId] = useState<number | null>(null)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [data, setData] = useState<AnalyticsOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const next = await fetchAnalyticsOverview({ department_id: departmentId, from: from || undefined, to: to || undefined })
        if (!cancelled) {
          setData(next)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) setError(parseAnalyticsError(e))
      }
    })()
    return () => { cancelled = true }
  }, [departmentId, from, to, attempt])

  if (error && !data) return (
    <div dir="rtl" className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
      <p className="font-black text-rose-800">{error}</p>
      <button type="button" onClick={() => setAttempt((n) => n + 1)} className="mt-5 rounded-xl bg-deepBlue px-6 py-2.5 text-sm font-black text-white">إعادة المحاولة</button>
    </div>
  )
  if (!data) return <OpsPageSkeleton />

  const top = Math.max(1, ...data.forms.map((f) => f.responses))

  return (
    <div className="space-y-6" dir="rtl">
      <Link to="/dashboard/admin/forms" className="inline-flex items-center gap-1 text-xs font-black text-customBlue hover:text-customOrange">
        <ChevronLeft size={14} />
        كل النماذج
      </Link>

      <header className="rounded-[1.35rem] bg-white p-6 text-right shadow-lg ring-1 ring-deepBlue/[0.06]">
        <h1 className="text-xl font-black text-deepBlue">تحليلات النماذج</h1>
        <p className="mt-2 text-xs font-semibold leading-6 text-slate-500">
          الردود على النماذج التي يحق لك الاطلاع على ردودها. الأرقام محسوبة من الردود المحفوظة فقط.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          {data.departments.length > 0 && (
            <label className="grid gap-1">
              <span className="text-[10px] font-black text-slate-500">القسم</span>
              <select value={departmentId ?? ''} onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : null)} className={FIELD}>
                <option value="">كل الأقسام المتاحة</option>
                {data.departments.map((d) => <option key={d.id} value={d.id}>{d.name_ar || d.name}</option>)}
              </select>
            </label>
          )}
          <label className="grid gap-1">
            <span className="text-[10px] font-black text-slate-500">من</span>
            <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={FIELD} />
          </label>
          <label className="grid gap-1">
            <span className="text-[10px] font-black text-slate-500">إلى</span>
            <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={FIELD} />
          </label>
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label="النماذج" value={data.totals.forms} />
        <Tile label="النماذج المنشورة" value={data.totals.active_forms} />
        <Tile label="الردود في الفترة" value={data.totals.responses} />
        <Tile label="بانتظار المعالجة" value={data.totals.open} />
      </div>

      {data.forms.length === 0 ? (
        <p className="rounded-2xl bg-white p-10 text-center text-sm font-bold text-slate-500 ring-1 ring-deepBlue/[0.06]">لا توجد نماذج يمكنك الاطلاع على ردودها ضمن هذه المرشحات.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-md ring-1 ring-deepBlue/[0.06]">
          <table className="w-full min-w-[40rem] text-right text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3 font-black">النموذج</th>
                <th scope="col" className="px-4 py-3 font-black">القسم</th>
                <th scope="col" className="px-4 py-3 font-black">الردود</th>
                <th scope="col" className="px-4 py-3 font-black">بانتظار المعالجة</th>
                <th scope="col" className="px-4 py-3 font-black">آخر رد</th>
              </tr>
            </thead>
            <tbody>
              {data.forms.map((f) => (
                <tr key={f.id} className="border-t border-slate-100" data-testid="overview-row">
                  <td className="px-4 py-3">
                    <Link to={`/dashboard/admin/forms/${f.id}`} className="font-black text-deepBlue hover:text-customBlue">{f.title}</Link>
                    <span className="mr-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600">{FORM_STATUS_AR[f.status] ?? f.status}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-600">{f.department?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-8 font-black tabular-nums text-deepBlue">{f.responses}</span>
                      <span className="h-2 w-28 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                        <span className="block h-full rounded-full bg-customBlue" style={{ width: `${(f.responses / top) * 100}%` }} />
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-bold tabular-nums text-deepBlue">{f.open}</td>
                  <td className="px-4 py-3 font-semibold text-slate-600">{f.last_response_at ? formatDateTime(f.last_response_at) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
