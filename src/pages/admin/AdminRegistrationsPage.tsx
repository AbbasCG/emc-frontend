import { useCallback, useEffect, useState } from 'react'
import {
  CheckCircle2,
  ClipboardList,
  Download,
  RefreshCw,
  Search,
  UserCheck,
  UserX,
  XCircle,
} from 'lucide-react'
import {
  fetchAdminRegistrations,
  updateRegistrationStatus,
  type AdminRegistrationListFilters,
  type AdminRegistrationListRow,
} from '@/api/adminRegistrationsApi'
import toast from '@/lib/toast'

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso?.trim()) return '—'
  try {
    return new Date(iso).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch { return iso.slice(0, 10) }
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'قيد الانتظار', cls: 'bg-amber-100 text-amber-800'   },
  approved:  { label: 'مقبول',        cls: 'bg-green-100 text-green-800'   },
  confirmed: { label: 'مؤكد',         cls: 'bg-green-100 text-green-800'   },
  rejected:  { label: 'مرفوض',       cls: 'bg-red-100 text-red-800'       },
  cancelled: { label: 'ملغي',         cls: 'bg-gray-100 text-gray-600'     },
  paid:      { label: 'مدفوع',        cls: 'bg-blue-100 text-blue-800'     },
}

function StatusBadge({ status }: { status: string | null }) {
  const s = (status ?? 'pending').toLowerCase()
  const m = STATUS_MAP[s] ?? { label: status ?? '—', cls: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black ${m.cls}`}>
      {m.label}
    </span>
  )
}

// ─── stat card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: React.ElementType; color: string
}) {
  return (
    <div className={`flex items-center gap-4 rounded-2xl border p-5 shadow-sm ${color}`}>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/60">
        <Icon size={20} className="text-current opacity-80" />
      </div>
      <div>
        <p className="text-xs font-semibold opacity-70">{label}</p>
        <p className="text-2xl font-black">{value}</p>
      </div>
    </div>
  )
}

// ─── skeleton ────────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <tr className="border-b border-deepBlue/[0.04]">
      {[1,2,3,4,5,6].map(i => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 w-full animate-pulse rounded bg-deepBlue/[0.06]" />
        </td>
      ))}
    </tr>
  )
}

// ─── main ────────────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { value: '', label: 'جميع الحالات' },
  { value: 'pending',   label: 'قيد الانتظار' },
  { value: 'approved',  label: 'مقبول' },
  { value: 'rejected',  label: 'مرفوض' },
  { value: 'cancelled', label: 'ملغي' },
]

export default function AdminRegistrationsPage() {
  const [rows, setRows] = useState<AdminRegistrationListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState<number | null>(null)

  const [search, setSearch]   = useState('')
  const [status, setStatus]   = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]   = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const filters: AdminRegistrationListFilters = {}
      if (search.trim())  filters.search    = search.trim()
      if (status.trim())  filters.status    = status.trim()
      if (dateFrom.trim()) filters.date_from = dateFrom.trim()
      if (dateTo.trim())  filters.date_to   = dateTo.trim()
      setRows(await fetchAdminRegistrations(filters))
    } catch {
      setError('تعذّر تحميل التسجيلات. تحقق من الاتصال وأعد المحاولة.')
    } finally {
      setLoading(false)
    }
  }, [search, status, dateFrom, dateTo])

  useEffect(() => { void load() }, [load])

  async function handleStatus(id: number, newStatus: string) {
    setUpdating(id)
    try {
      await updateRegistrationStatus(id, newStatus)
      toast.success(newStatus === 'approved' ? 'تمت الموافقة على التسجيل' : 'تم رفض التسجيل')
      setRows(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r))
    } catch {
      toast.error('تعذّر تحديث حالة التسجيل')
    } finally {
      setUpdating(null)
    }
  }

  // Compute stats from loaded rows
  const stats = {
    total:    rows.length,
    pending:  rows.filter(r => (r.status ?? '').toLowerCase() === 'pending').length,
    approved: rows.filter(r => ['approved','confirmed','paid'].includes((r.status ?? '').toLowerCase())).length,
    rejected: rows.filter(r => ['rejected','cancelled'].includes((r.status ?? '').toLowerCase())).length,
  }

  return (
    <div dir="rtl" className="space-y-6 text-right">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-bl from-deepBlue via-deepBlue/90 to-customBlue p-7 text-white shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-white/50">إدارة التسجيلات</p>
            <h1 className="text-2xl font-black">التسجيلات</h1>
            <p className="mt-1 text-sm text-white/60">مراجعة وإدارة طلبات تسجيل المتعلمين في الدورات والبرامج</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void load()}
              className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-black text-white transition hover:bg-white/20"
            >
              <RefreshCw size={13} /> تحديث
            </button>
            <button
              className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-black text-deepBlue shadow transition hover:bg-white/90"
            >
              <Download size={13} /> تصدير
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="إجمالي التسجيلات"     value={stats.total}    icon={ClipboardList} color="border-deepBlue/[0.06] bg-white text-deepBlue" />
        <StatCard label="قيد الانتظار"          value={stats.pending}  icon={UserCheck}     color="border-amber-200 bg-amber-50 text-amber-800"  />
        <StatCard label="تسجيلات مقبولة"        value={stats.approved} icon={CheckCircle2}  color="border-green-200 bg-green-50 text-green-800"  />
        <StatCard label="مرفوضة أو ملغاة"       value={stats.rejected} icon={XCircle}       color="border-red-200 bg-red-50 text-red-800"        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-deepBlue/[0.06] bg-white p-4 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-deepBlue/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && void load()}
            placeholder="بحث بالاسم أو البريد..."
            className="w-full rounded-xl border border-deepBlue/10 bg-deepBlue/[0.03] py-2.5 pr-9 pl-3 text-sm outline-none focus:border-customBlue/40 focus:ring-2 focus:ring-customBlue/10"
          />
        </div>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="rounded-xl border border-deepBlue/10 bg-deepBlue/[0.03] px-3 py-2.5 text-sm outline-none focus:border-customBlue/40"
        >
          {STATUS_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="rounded-xl border border-deepBlue/10 bg-deepBlue/[0.03] px-3 py-2.5 text-sm outline-none focus:border-customBlue/40"
          placeholder="من تاريخ"
        />
        <input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="rounded-xl border border-deepBlue/10 bg-deepBlue/[0.03] px-3 py-2.5 text-sm outline-none focus:border-customBlue/40"
          placeholder="إلى تاريخ"
        />
        <button
          onClick={() => void load()}
          className="rounded-xl bg-customBlue px-5 py-2.5 text-xs font-black text-white shadow transition hover:bg-customBlue/90"
        >
          بحث
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700">{error}</p>
          <button onClick={() => void load()} className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-1.5 text-xs font-black text-white">
            <RefreshCw size={12} /> إعادة المحاولة
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-deepBlue/[0.06] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b border-deepBlue/[0.06] bg-deepBlue/[0.02]">
                <th className="px-4 py-3 text-[11px] font-black text-deepBlue/50">الطالب</th>
                <th className="px-4 py-3 text-[11px] font-black text-deepBlue/50">الدورة</th>
                <th className="px-4 py-3 text-[11px] font-black text-deepBlue/50">البريد الإلكتروني</th>
                <th className="px-4 py-3 text-[11px] font-black text-deepBlue/50">تاريخ التسجيل</th>
                <th className="px-4 py-3 text-[11px] font-black text-deepBlue/50">الحالة</th>
                <th className="px-4 py-3 text-[11px] font-black text-deepBlue/50">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} />)
                : rows.length === 0
                ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-sm text-deepBlue/40">
                      لا توجد تسجيلات تطابق معايير البحث
                    </td>
                  </tr>
                )
                : rows.map(r => (
                  <tr key={r.id} className="border-b border-deepBlue/[0.04] transition hover:bg-deepBlue/[0.02]">
                    <td className="px-4 py-3">
                      <p className="font-bold text-deepBlue">{r.student_name ?? '—'}</p>
                      {r.phone && <p className="text-[11px] text-deepBlue/40">{r.phone}</p>}
                    </td>
                    <td className="px-4 py-3 text-[13px] font-semibold text-deepBlue/80 max-w-[200px] truncate">
                      {r.course_title}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-deepBlue/60">{r.email ?? '—'}</td>
                    <td className="px-4 py-3 text-[12px] text-deepBlue/50">{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {r.status !== 'approved' && r.status !== 'confirmed' && (
                          <button
                            onClick={() => void handleStatus(r.id, 'approved')}
                            disabled={updating === r.id}
                            className="flex items-center gap-1 rounded-lg bg-green-600 px-2.5 py-1 text-[10px] font-black text-white transition hover:bg-green-700 disabled:opacity-50"
                          >
                            <UserCheck size={11} /> قبول
                          </button>
                        )}
                        {r.status !== 'rejected' && (
                          <button
                            onClick={() => void handleStatus(r.id, 'rejected')}
                            disabled={updating === r.id}
                            className="flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1 text-[10px] font-black text-white transition hover:bg-red-700 disabled:opacity-50"
                          >
                            <UserX size={11} /> رفض
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        {!loading && rows.length > 0 && (
          <div className="border-t border-deepBlue/[0.04] px-4 py-2.5">
            <p className="text-[11px] text-deepBlue/40">
              يُعرض {rows.length} تسجيل
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
