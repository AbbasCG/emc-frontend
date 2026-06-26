import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Award,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Download,
  ExternalLink,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  TrendingUp,
  UserCheck,
  Users,
  X,
} from 'lucide-react'
import toast from '@/lib/toast'
import {
  convertVolunteerToMember,
  fetchAcceptedVolunteers,
  type AcceptedVolunteersMeta,
  type VolunteerRequest,
} from '@/api/volunteerApplicationApi'
import { formatDate } from '@/utils/dateTime'
import VolunteerRequestDetailModal from '@/components/volunteer/VolunteerRequestDetailModal'
import { AnimatePresence, motion } from 'framer-motion'

/* ── Constants ──────────────────────────────────────────────────────── */

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
]

const SORT_OPTIONS = [
  { value: 'accepted_asc',  label: 'الأقدم قبولاً أولاً' },
  { value: 'accepted_desc', label: 'الأحدث قبولاً أولاً' },
  { value: 'name_asc',      label: 'الاسم أ-ي' },
  { value: 'department',    label: 'حسب القسم' },
  { value: 'city',          label: 'حسب المدينة' },
]

/* ── KPI card ────────────────────────────────────────────────────────── */

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
          <p className={`mt-1 text-2xl font-black leading-tight ${typeof value === 'string' && value.length > 12 ? 'text-lg line-clamp-2' : ''} ${color}`}>{value}</p>
          {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${color.replace('text-', 'bg-').replace('-600', '-50').replace('-700', '-50')}`}>
          <Icon size={18} className={color} />
        </span>
      </div>
    </div>
  )
}

/* ── Convert confirmation modal ─────────────────────────────────────── */

function ConvertModal({
  req,
  onClose,
  onConverted,
}: {
  req: VolunteerRequest
  onClose: () => void
  onConverted: (updated: VolunteerRequest) => void
}) {
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    try {
      const updated = await convertVolunteerToMember(req.id)
      toast.success('تم تحويل المتطوع إلى عضو بنجاح')
      onConverted(updated)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 409) {
        toast.warning('هذا المتطوع محوّل بالفعل إلى عضو')
        onClose()
      } else {
        toast.error('تعذّر التحويل. تحقق من الاتصال وأعد المحاولة.')
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
        transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
        className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="h-1.5 bg-gradient-to-l from-emerald-500 to-teal-400" />
        <div className="px-7 py-6 text-right">
          <h2 className="text-lg font-black text-[#22334A]">تحويل المتطوع إلى عضو</h2>
          <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">
            سيتم إنشاء سجل عضو جديد لـ{' '}
            <span className="font-black text-[#22334A]">{req.full_name}</span>{' '}
            وتغيير حالته إلى <span className="font-black text-emerald-700">تم التحويل</span>.
          </p>
          <p className="mt-1 text-[12px] text-slate-400">لا يمكن التراجع عن هذا الإجراء.</p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-100 transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              تأكيد التحويل إلى عضو
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-full rounded-2xl border border-slate-200 py-3 text-sm font-black text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
            >
              إلغاء
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

/* ── Main page ─────────────────────────────────────────────────────── */

export default function AcceptedVolunteersPage() {
  const [items, setItems] = useState<VolunteerRequest[]>([])
  const [meta, setMeta] = useState<AcceptedVolunteersMeta>({
    total_accepted: 0,
    total_converted: 0,
    accepted_this_month: 0,
    top_department: null,
  })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  /* filters */
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const [filterAvailability, setFilterAvailability] = useState('')
  const [filterHasCv, setFilterHasCv] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [sort, setSort] = useState('accepted_asc')
  const [showFilters, setShowFilters] = useState(false)

  /* modals */
  const [selected, setSelected] = useState<VolunteerRequest | null>(null)
  const [convertTarget, setConvertTarget] = useState<VolunteerRequest | null>(null)

  const load = useCallback(async () => {
    setLoadError(null)
    setLoading(true)
    try {
      const params: Record<string, string> = { sort, per_page: '200' }
      if (filterDept) params.desired_department = filterDept
      if (filterCity) params.city = filterCity
      if (filterAvailability) params.availability = filterAvailability
      if (filterHasCv) params.has_cv = filterHasCv
      if (filterDateFrom) params.date_from = filterDateFrom
      if (filterDateTo) params.date_to = filterDateTo

      const result = await fetchAcceptedVolunteers(params)
      setItems(result.data)
      setMeta(result.meta)
    } catch {
      setLoadError('تعذّر تحميل قائمة المتطوعين المقبولين.')
    } finally {
      setLoading(false)
    }
  }, [sort, filterDept, filterCity, filterAvailability, filterHasCv, filterDateFrom, filterDateTo])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((r) => {
      if (!q) return true
      const hay = `${r.full_name} ${r.email} ${r.phone ?? ''} ${r.city ?? ''} ${r.desired_department ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [items, search])

  function handleConverted(updated: VolunteerRequest) {
    setItems((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
    setConvertTarget(null)
    // Remove from list since it's now converted
    setTimeout(() => {
      setItems((prev) => prev.filter((r) => r.id !== updated.id))
    }, 800)
  }

  function handleUpdated(updated: VolunteerRequest) {
    setItems((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
    setSelected((prev) => (prev?.id === updated.id ? updated : prev))
  }

  function resetFilters() {
    setSearch('')
    setFilterDept('')
    setFilterCity('')
    setFilterAvailability('')
    setFilterHasCv('')
    setFilterDateFrom('')
    setFilterDateTo('')
    setSort('accepted_asc')
  }

  const hasActiveFilters = !!(search || filterDept || filterCity || filterAvailability || filterHasCv || filterDateFrom || filterDateTo || sort !== 'accepted_asc')

  /* derive unique cities from loaded data */
  const cities = useMemo(() => {
    const s = new Set<string>()
    items.forEach((r) => { if (r.city) s.add(r.city) })
    return Array.from(s).sort()
  }, [items])

  return (
    <div className="min-h-screen bg-slate-50/60" dir="rtl">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-[#22334A]">المتطوعون المقبولون</h1>
              <p className="mt-0.5 text-sm text-slate-500">
                إدارة المتطوعين المقبولين قبل تحويلهم إلى أعضاء رسميين
              </p>
            </div>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              تحديث
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {/* ── KPI cards ─────────────────────────────────────────────── */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiCard
            label="بانتظار التحويل"
            value={meta.total_accepted}
            icon={UserCheck}
            color="text-emerald-600"
          />
          <KpiCard
            label="تم التحويل"
            value={meta.total_converted}
            icon={CheckCircle2}
            color="text-sky-600"
          />
          <KpiCard
            label="مقبولون هذا الشهر"
            value={meta.accepted_this_month}
            icon={TrendingUp}
            color="text-violet-600"
          />
          <KpiCard
            label="أكثر قسم طلباً"
            value={meta.top_department ?? '—'}
            icon={Award}
            color="text-amber-600"
          />
        </div>

        {/* ── Search + filter toggle ─────────────────────────────────── */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو البريد أو الهاتف..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-9 pl-4 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-[#2691C2] focus:outline-none"
            />
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 shadow-sm focus:border-[#2691C2] focus:outline-none"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold shadow-sm transition ${
              hasActiveFilters
                ? 'border-[#2691C2] bg-[#2691C2]/10 text-[#2691C2]'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Filter size={14} />
            فلاتر
            {hasActiveFilters && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#2691C2] text-[9px] text-white">!</span>
            )}
            <ChevronDown size={12} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-100"
            >
              <X size={12} /> إعادة تعيين
            </button>
          )}
        </div>

        {/* ── Filter panel ──────────────────────────────────────────── */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mb-4 grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-3 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-slate-400">القسم</label>
                  <select
                    value={filterDept}
                    onChange={(e) => setFilterDept(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 focus:border-[#2691C2] focus:outline-none"
                  >
                    <option value="">الكل</option>
                    {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-slate-400">المدينة</label>
                  <select
                    value={filterCity}
                    onChange={(e) => setFilterCity(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 focus:border-[#2691C2] focus:outline-none"
                  >
                    <option value="">الكل</option>
                    {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-slate-400">التفرغ</label>
                  <select
                    value={filterAvailability}
                    onChange={(e) => setFilterAvailability(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 focus:border-[#2691C2] focus:outline-none"
                  >
                    <option value="">الكل</option>
                    <option value="full_time">دوام كامل</option>
                    <option value="part_time">دوام جزئي</option>
                    <option value="weekends">عطلة نهاية الأسبوع</option>
                    <option value="flexible">مرن</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-slate-400">السيرة الذاتية</label>
                  <select
                    value={filterHasCv}
                    onChange={(e) => setFilterHasCv(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 focus:border-[#2691C2] focus:outline-none"
                  >
                    <option value="">الكل</option>
                    <option value="yes">لديه سيرة ذاتية</option>
                    <option value="no">بدون سيرة ذاتية</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-slate-400">تاريخ القبول من</label>
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 focus:border-[#2691C2] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-slate-400">تاريخ القبول إلى</label>
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 focus:border-[#2691C2] focus:outline-none"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Result count ──────────────────────────────────────────── */}
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-slate-500">
            {loading ? (
              <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> جارٍ التحميل...</span>
            ) : (
              <>عرض <span className="font-black text-[#22334A]">{filtered.length}</span> من <span className="font-black text-[#22334A]">{items.length}</span> متطوعاً مقبولاً</>
            )}
          </p>
        </div>

        {/* ── Error ─────────────────────────────────────────────────── */}
        {loadError && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="flex-1 text-sm font-bold text-red-600">{loadError}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-black text-red-600 hover:bg-red-100"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* ── Empty state ───────────────────────────────────────────── */}
        {!loading && !loadError && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 text-center">
            <Users size={40} className="mb-3 text-slate-300" />
            <p className="font-black text-slate-400">
              {hasActiveFilters ? 'لا توجد نتائج تطابق الفلاتر المحددة' : 'لا يوجد متطوعون مقبولون في انتظار التحويل'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-3 text-sm font-bold text-[#2691C2] hover:underline"
              >
                إعادة تعيين الفلاتر
              </button>
            )}
          </div>
        )}

        {/* ── Table ─────────────────────────────────────────────────── */}
        {filtered.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">#</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">المتطوع</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">القسم</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">المدينة</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">التفرغ</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">تاريخ القبول</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">قُبل بواسطة</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">CV</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, index) => (
                    <tr
                      key={r.id}
                      className="border-b border-slate-50 transition hover:bg-slate-50/50"
                    >
                      <td className="px-4 py-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#22334A] text-[11px] font-black text-white">
                          #{index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setSelected(r)}
                          className="text-right"
                        >
                          <p className="font-black text-[#22334A] hover:text-[#2691C2]">{r.full_name}</p>
                          <p className="text-[11px] text-slate-400">{r.email}</p>
                          {r.phone && <p className="text-[11px] text-slate-400">{r.phone}</p>}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                          {r.desired_department ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[13px] font-semibold text-slate-600">{r.city ?? '—'}</td>
                      <td className="px-4 py-3 text-[13px] font-semibold text-slate-600">{r.availability ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
                          <Calendar size={12} />
                          {r.accepted_at ? formatDate(r.accepted_at) : '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-slate-500">
                        {r.accepted_by_name ?? r.accepted_by?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        {r.cv_download_url ? (
                          <div className="flex items-center gap-1">
                            <a
                              href={r.cv_view_url ?? r.cv_download_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="عرض السيرة"
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-sky-200 hover:text-sky-600"
                            >
                              <ExternalLink size={13} />
                            </a>
                            <a
                              href={r.cv_download_url}
                              download
                              title="تنزيل السيرة"
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-emerald-200 hover:text-emerald-600"
                            >
                              <Download size={13} />
                            </a>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelected(r)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-black text-slate-600 transition hover:bg-slate-50"
                          >
                            عرض
                          </button>
                          {!r.is_converted && (
                            <button
                              type="button"
                              onClick={() => setConvertTarget(r)}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-black text-white shadow-sm transition hover:bg-emerald-700"
                            >
                              تحويل إلى عضو
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Detail drawer ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <VolunteerRequestDetailModal
            req={selected}
            onClose={() => setSelected(null)}
            onUpdated={handleUpdated}
            onOpenConvert={(req) => setConvertTarget(req)}
          />
        )}
      </AnimatePresence>

      {/* ── Convert modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {convertTarget && (
          <ConvertModal
            req={convertTarget}
            onClose={() => setConvertTarget(null)}
            onConverted={handleConverted}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
