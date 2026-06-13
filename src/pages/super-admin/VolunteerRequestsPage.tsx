import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Briefcase,
  Calendar,
  ChevronDown,
  ChevronLeft,
  Clock,
  HeartHandshake,
  Loader2,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react'
import toast from '@/lib/toast'
import {
  convertVolunteerToMember,
  fetchVolunteerRequests,
  type VolunteerRequest,
  type VolunteerRequestStatus,
} from '@/api/volunteerApplicationApi'
import VolunteerRequestDetailModal, { STATUS_CFG } from '@/components/volunteer/VolunteerRequestDetailModal'
import { formatDate } from '@/utils/dateTime'

/* ── Status config (table badges) ──────────────────────────────────── */

const ALL_STATUSES: VolunteerRequestStatus[] = ['pending', 'reviewed', 'accepted', 'rejected', 'contacted']

const DEPARTMENTS = [
  'البرامج والمسارات',
  'التسويق والإعلام',
  'التقنية والدعم الفني',
  'الموارد البشرية',
  'الشراكات والعلاقات العامة',
  'المجتمع والصحة النفسية والوعي',
  'الجودة والحوكمة',
  'المالية',
  'التشغيل والعمليات',
  'غير محدد',
]

function StatusBadge({ status }: { status: VolunteerRequestStatus }) {
  const cfg = STATUS_CFG[status]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-black ${cfg.badge}`}>
      {cfg.label}
    </span>
  )
}

function isAlreadyConverted(r: VolunteerRequest): boolean {
  return r.can_convert_to_member !== true || r.converted_member_id !== null
}

/* ── Convert-to-member confirmation modal ─────────────────────────── */

type ConvertModalProps = {
  req: VolunteerRequest
  onClose: () => void
  onConverted: (updated: VolunteerRequest) => void
}

function ConvertToMemberModal({ req, onClose, onConverted }: ConvertModalProps) {
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    try {
      const updated = await convertVolunteerToMember(req.id)
      toast.success('تمت إضافة المتطوع إلى الأعضاء بنجاح')
      onConverted(updated)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 409 || status === 422) {
        toast.warning('هذا المتطوع مضاف بالفعل إلى الأعضاء')
        onClose()
      } else {
        toast.error('تعذّر تحويل المتطوع. تحقق من الاتصال وأعد المحاولة.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
        className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="h-1 bg-gradient-to-l from-emerald-500 to-teal-400" />
        <div className="px-7 py-6 text-right">
          <h2 className="text-[18px] font-black text-[#22334A]">تحويل المتطوع إلى عضو</h2>
          <p className="mt-3 text-[14px] font-semibold leading-relaxed text-slate-600">
            <span className="font-black text-[#22334A]">{req.full_name}</span> — هل تريد نقل بياناته إلى صفحة الأعضاء؟
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-[14px] font-black text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              نعم، إضافة إلى الأعضاء
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-full rounded-2xl border border-slate-200 py-3 text-[13px] font-black text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
            >
              لا، لاحقًا
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

/* ── Main page ─────────────────────────────────────────────────────── */

export default function VolunteerRequestsPage() {
  const { id: routeId } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [items, setItems] = useState<VolunteerRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<VolunteerRequestStatus | 'all'>('all')
  const [filterDept, setFilterDept] = useState<string>(() => searchParams.get('department') ?? 'all')
  const [selected, setSelected] = useState<VolunteerRequest | null>(null)
  const [convertTarget, setConvertTarget] = useState<VolunteerRequest | null>(null)

  async function load() {
    setLoadError(null)
    setLoading(true)
    try {
      const data = await fetchVolunteerRequests()
      setItems(data)
      if (routeId) {
        const match = data.find((r) => String(r.id) === routeId)
        if (match) setSelected(match)
      }
    } catch {
      setLoadError('تعذّر تحميل قائمة طلبات التطوع.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleUpdated(updated: VolunteerRequest) {
    setItems((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
    setSelected((prev) => (prev?.id === updated.id ? updated : prev))
    if (updated.status === 'accepted' && !isAlreadyConverted(updated)) {
      setConvertTarget(updated)
    }
  }

  function handleConverted(updated: VolunteerRequest) {
    setItems((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
    setConvertTarget(null)
  }

  function handleClose() {
    setSelected(null)
    if (routeId) navigate('/dashboard/super-admin/volunteer-requests', { replace: true })
  }

  function openRow(r: VolunteerRequest) {
    setSelected(r)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((r) => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false
      if (filterDept !== 'all' && r.desired_department !== filterDept) return false
      if (q) {
        const hay = `${r.full_name} ${r.email} ${r.phone ?? ''} ${r.city ?? ''} ${r.desired_department ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [items, filterStatus, filterDept, search])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length }
    for (const s of ALL_STATUSES) c[s] = items.filter((r) => r.status === s).length
    return c
  }, [items])

  const fmt = (n: number) => new Intl.NumberFormat('en-US').format(n)

  const kpiIcons: Record<VolunteerRequestStatus, React.ReactNode> = {
    pending: <Clock className="h-4 w-4 text-amber-500" />,
    reviewed: <Clock className="h-4 w-4 text-sky-500" />,
    accepted: <Users className="h-4 w-4 text-emerald-500" />,
    rejected: <Clock className="h-4 w-4 text-red-500" />,
    contacted: <Clock className="h-4 w-4 text-violet-500" />,
  }

  return (
    <div className="space-y-6 pb-16" dir="rtl">
      {/* ── Premium Hero ───────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-[#22334A] via-[#1a2a3a] to-[#2691C2] p-8 text-white shadow-xl">
        <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/[0.04]" />
        <div className="pointer-events-none absolute -bottom-12 left-24 h-48 w-48 rounded-full bg-[#EC943C]/[0.12]" />
        <div className="pointer-events-none absolute -right-8 top-8 h-32 w-32 rounded-full bg-[#2691C2]/20" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur-sm">
              <HeartHandshake className="h-4 w-4 text-[#EC943C]" />
              <span className="text-[11px] font-black uppercase tracking-widest text-white/80">إدارة الموارد البشرية</span>
            </div>
            <h1 className="text-[24px] font-black text-white">طلبات التطوع</h1>
            <p className="mt-1.5 text-[13px] font-semibold text-white/60">
              {loading ? 'جاري التحميل...' : `${fmt(items.length)} طلب مستلم`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-[12px] font-black text-white/80 backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <button
          type="button"
          onClick={() => setFilterStatus('all')}
          className={`flex flex-col gap-1.5 rounded-2xl border p-4 text-right transition hover:shadow-md ${
            filterStatus === 'all'
              ? 'border-[#22334A] bg-[#22334A] text-white shadow-md'
              : 'border-slate-200 bg-white text-[#22334A] hover:border-[#22334A]/30'
          }`}
        >
          <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${filterStatus === 'all' ? 'bg-white/15' : 'bg-slate-100'}`}>
            <Users className={`h-4 w-4 ${filterStatus === 'all' ? 'text-white' : 'text-[#22334A]/60'}`} />
          </div>
          <p className={`text-[20px] font-black tabular-nums ${filterStatus === 'all' ? 'text-white' : 'text-[#22334A]'}`} dir="ltr">
            {fmt(counts.all)}
          </p>
          <p className={`text-[10px] font-black ${filterStatus === 'all' ? 'text-white/70' : 'text-slate-400'}`}>الكل</p>
        </button>

        {ALL_STATUSES.map((s) => {
          const cfg = STATUS_CFG[s]
          const active = filterStatus === s
          return (
            <button
              key={s}
              type="button"
              onClick={() => setFilterStatus(s)}
              className={`flex flex-col gap-1.5 rounded-2xl border p-4 text-right transition hover:shadow-md ${
                active ? `${cfg.badge} shadow-md` : 'border-slate-200 bg-white text-[#22334A] hover:border-slate-300'
              }`}
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${active ? 'bg-white/50' : 'bg-slate-50'}`}>
                {kpiIcons[s]}
              </div>
              <p className="text-[20px] font-black tabular-nums" dir="ltr">
                {fmt(counts[s] ?? 0)}
              </p>
              <p className={`text-[10px] font-black ${active ? '' : 'text-slate-400'}`}>{cfg.label}</p>
            </button>
          )
        })}
      </div>

      {/* ── Search + Filters ────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو البريد أو المدينة..."
            dir="rtl"
            aria-label="بحث في طلبات التطوع"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-10 pl-4 text-[13px] font-semibold text-[#22334A] outline-none placeholder:text-slate-400 focus:border-[#2691C2] focus:ring-4 focus:ring-sky-100"
          />
        </div>
        <div className="relative">
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            dir="rtl"
            aria-label="تصفية حسب القسم"
            className="h-11 min-w-[160px] appearance-none rounded-xl border border-slate-200 bg-white pr-4 pl-9 text-[13px] font-semibold text-[#22334A] outline-none focus:border-[#2691C2] focus:ring-4 focus:ring-sky-100"
          >
            <option value="all">كل الأقسام</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {loadError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="font-black text-rose-800">{loadError}</p>
          <button type="button" onClick={() => void load()} className="mt-4 rounded-xl bg-[#22334A] px-6 py-2.5 text-[13px] font-black text-white">
            إعادة المحاولة
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={String(i)} className="h-14 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-50">
            <HeartHandshake className="h-8 w-8 text-slate-300" />
          </div>
          <p className="font-black text-[#22334A]">لا توجد طلبات</p>
          <p className="mt-1 text-[13px] text-slate-400">
            {search || filterStatus !== 'all' || filterDept !== 'all'
              ? 'لا نتائج تطابق الفلتر الحالي.'
              : 'لم يتم استلام أي طلبات تطوع بعد.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#22334A]/[0.07] bg-white shadow-lg ring-1 ring-[#22334A]/[0.04]">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b border-slate-100 bg-gradient-to-l from-slate-50 to-slate-50/50">
                  {['#', 'الاسم', 'البريد', 'الجوال', 'القسم', 'التوفر', 'الحالة', 'تاريخ التقديم'].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-right text-[10px] font-black uppercase tracking-widest text-[#22334A]/40">
                      {h}
                    </th>
                  ))}
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((r, idx) => (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, delay: Math.min(idx * 0.03, 0.3) }}
                    className="group cursor-pointer transition-colors hover:bg-[#2691C2]/[0.03]"
                    onClick={() => openRow(r)}
                  >
                    <td className="px-5 py-4 text-[11px] font-black text-[#22334A]/30 tabular-nums" dir="ltr">
                      {fmt(r.id)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-bl from-[#22334A] to-[#2691C2] text-[12px] font-black text-white">
                          {r.full_name.charAt(0)}
                        </div>
                        <span className="text-[13px] font-black text-[#22334A]">{r.full_name}</span>
                      </div>
                    </td>
                    <td className="hidden px-5 py-4 text-[12px] font-semibold text-slate-500 md:table-cell" dir="ltr">
                      {r.email}
                    </td>
                    <td className="hidden px-5 py-4 text-[12px] font-semibold text-slate-500 lg:table-cell" dir="ltr">
                      {r.phone ?? '—'}
                    </td>
                    <td className="hidden px-5 py-4 text-[12px] font-semibold text-slate-600 xl:table-cell">
                      <span className="inline-flex items-center gap-1">
                        <Briefcase className="h-3 w-3 text-slate-300" />
                        {r.desired_department ?? '—'}
                      </span>
                    </td>
                    <td className="hidden px-5 py-4 text-[12px] font-semibold text-slate-500 xl:table-cell">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-300" />
                        {r.availability ?? '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="hidden px-5 py-4 text-[11px] font-semibold text-slate-400 tabular-nums sm:table-cell">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-300" />
                        {r.created_at ? formatDate(r.created_at) : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          openRow(r)
                        }}
                        className="inline-flex items-center gap-1 rounded-xl border border-[#2691C2]/20 bg-[#2691C2]/[0.06] px-3 py-1.5 text-[10px] font-black text-[#2691C2] opacity-0 transition group-hover:opacity-100 hover:bg-[#2691C2]/[0.12]"
                      >
                        مراجعة
                        <ChevronLeft className="h-3 w-3" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3">
            <p className="text-[11px] font-semibold text-slate-400">
              {fmt(filtered.length)} طلب من أصل {fmt(items.length)}
            </p>
          </div>
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <VolunteerRequestDetailModal
            req={selected}
            onClose={handleClose}
            onUpdated={handleUpdated}
            onOpenConvert={(req) => setConvertTarget(req)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {convertTarget && (
          <ConvertToMemberModal
            req={convertTarget}
            onClose={() => setConvertTarget(null)}
            onConverted={handleConverted}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
