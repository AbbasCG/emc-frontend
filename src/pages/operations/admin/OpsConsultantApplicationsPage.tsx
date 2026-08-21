import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, UserCheck, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  fetchConsultantApplications,
  updateConsultantApplicationStatus,
  type ConsultantApplication,
} from '@/api/consultantApi'

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

export default function OpsConsultantApplicationsPage() {
  const [rows, setRows] = useState<ConsultantApplication[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [status, setStatus] = useState<string>('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(async (filters: { status?: string; search?: string }) => {
    setLoading(true)
    try {
      const res = await fetchConsultantApplications(filters)
      setRows(res.rows)
      setCounts(res.counts)
    } catch {
      toast.error('فشل تحميل طلبات المستشارين')
    } finally {
      setLoading(false)
    }
  }, [])

  // Mount fetch — inline async IIFE per effect-patterns.md.
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const res = await fetchConsultantApplications({})
        if (alive) {
          setRows(res.rows)
          setCounts(res.counts)
        }
      } catch {
        if (alive) toast.error('فشل تحميل طلبات المستشارين')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  async function setRowStatus(row: ConsultantApplication, next: ConsultantApplication['status']) {
    setBusyId(row.id)
    try {
      const updated = await updateConsultantApplicationStatus(row.id, next)
      setRows((r) => r.map((x) => (x.id === row.id ? { ...x, ...updated } : x)))
      toast.success(`الحالة الآن: ${STATUS_LABELS[next]}`)
    } catch {
      toast.error('تعذر تحديث الحالة')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-customOrange">إدارة المستشارين</p>
          <h1 className="mt-1 text-2xl font-black text-deepBlue">طلبات المستشارين</h1>
          <p className="mt-1 text-sm text-deepBlue/50">مراجعة المتقدمين واعتماد انضمامهم إلى إدارة المستشارين</p>
        </div>
        <button
          onClick={() => void load({ status: status || undefined, search: search || undefined })}
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
              void load({ status: s || undefined, search: search || undefined })
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
              if (e.key === 'Enter') void load({ status: status || undefined, search: search || undefined })
            }}
            placeholder="بحث بالاسم أو التخصص…"
            className="w-64 rounded-xl border border-slate-200 bg-white py-2 pe-3 ps-9 text-sm font-semibold text-deepBlue outline-none focus:border-customBlue"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <UserCheck size={32} className="mx-auto text-slate-300" />
          <p className="mt-4 text-sm font-bold text-slate-400">لا توجد طلبات مطابقة بعد</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
          <table className="w-full min-w-[52rem] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-start text-[11px] font-black uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3 text-start">المتقدم</th>
                <th className="px-5 py-3 text-start">التخصص</th>
                <th className="px-5 py-3 text-start">الخبرة</th>
                <th className="px-5 py-3 text-start">الحالة</th>
                <th className="px-5 py-3 text-start">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-50 align-top last:border-0">
                  <td className="px-5 py-4">
                    <p className="font-black text-deepBlue">{row.full_name}</p>
                    <p dir="ltr" className="mt-0.5 text-xs text-slate-400">{row.email}</p>
                    {row.motivation && (
                      <p className="mt-1.5 max-w-md text-xs leading-6 text-slate-500 line-clamp-2">{row.motivation}</p>
                    )}
                  </td>
                  <td className="px-5 py-4 font-bold text-ink-600">{row.specialty}</td>
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
                      {(['under_review', 'interview', 'accepted', 'rejected'] as const)
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
    </div>
  )
}
