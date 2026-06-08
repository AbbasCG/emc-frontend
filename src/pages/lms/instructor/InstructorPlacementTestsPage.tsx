import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CheckCircle2,
  ClipboardCheck,
  Mic,
  RefreshCw,
  Search,
  Users,
  XCircle,
} from 'lucide-react'
import { BackButton } from '@/components/shared/BackButton'
import {
  fetchInstructorAllPlacementTests,
  getLevelFromScore,
  type InstructorPlacementTestRow,
  type PlacementStatus,
} from '@/api/placementApi'
import toast from '@/lib/toast'

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function toDMY(iso: string | null | undefined): string {
  if (!iso) return '—'
  const s = iso.slice(0, 10)
  if (s.length < 10) return '—'
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

/* ── Status maps ─────────────────────────────────────────────────────────── */

const STATUS_AR: Record<string, string> = {
  not_started:       'لم يبدأ',
  in_progress:       'جارٍ',
  written_submitted: 'في انتظار المقابلة',
  oral_booked:       'المقابلة محجوزة',
  oral_completed:    'المقابلة منتهية',
  completed:         'مكتمل',
}

const STATUS_CLR: Record<string, string> = {
  not_started:       'bg-slate-100 text-slate-500',
  in_progress:       'bg-amber-100 text-amber-700',
  written_submitted: 'bg-sky-100 text-sky-700',
  oral_booked:       'bg-violet-100 text-violet-700',
  oral_completed:    'bg-purple-100 text-purple-700',
  completed:         'bg-emerald-100 text-emerald-700',
}

/* ── CEFR label map ──────────────────────────────────────────────────────── */

const CEFR_CODE: Record<string, string> = {
  beginner:           'Starter',
  elementary:         'A1',
  pre_intermediate:   'A2',
  intermediate:       'B1',
  upper_intermediate: 'B2',
  advanced:           'C1',
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function InstructorPlacementTestsPage() {
  const [rows,    setRows]    = useState<InstructorPlacementTestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [filterStatus, setFilterStatus] = useState<PlacementStatus | ''>('')

  async function load() {
    setLoading(true)
    try { setRows(await fetchInstructorAllPlacementTests()) }
    catch { toast.error('تعذّر تحميل نتائج اختبارات تحديد المستوى') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, []) // eslint-disable-line

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (q && !r.student_name.toLowerCase().includes(q) && !r.student_email.toLowerCase().includes(q) && !r.course_title.toLowerCase().includes(q)) return false
      if (filterStatus && r.status !== filterStatus) return false
      return true
    })
  }, [rows, search, filterStatus])

  const stats = useMemo(() => ({
    total:    rows.length,
    waiting:  rows.filter((r) => r.status === 'written_submitted').length,
    booked:   rows.filter((r) => r.status === 'oral_booked').length,
    done:     rows.filter((r) => r.status === 'oral_completed' || r.status === 'completed').length,
  }), [rows])

  return (
    <div className="space-y-5 pb-16" dir="rtl">

      <BackButton to="/dashboard/instructor/courses" />

      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-bl from-deepBlue via-[#1a2d44] to-customBlue px-6 py-6 shadow-[0_20px_50px_-20px_rgba(34,51,74,0.5)] sm:px-10">
        <div aria-hidden className="pointer-events-none absolute -left-10 top-0 h-44 w-44 rounded-full bg-customOrange/15 blur-[80px]" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[1.5rem] font-black leading-tight text-white">اختبارات تحديد المستوى</h1>
            <p className="mt-1 text-[12px] font-semibold text-white/55">نتائج جميع اختبارات الطلاب في دوراتك</p>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading}
            className="flex items-center gap-1.5 rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-[11px] font-black text-white backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="إجمالي الاختبارات"    value={stats.total}   color="text-customBlue"   />
          <StatCard label="ينتظر المقابلة"        value={stats.waiting} color="text-amber-500"    />
          <StatCard label="المقابلة محجوزة"       value={stats.booked}  color="text-violet-600"   />
          <StatCard label="مكتمل"                 value={stats.done}    color="text-emerald-600"  />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث باسم أو دورة..." dir="rtl"
            className="h-9 w-full rounded-2xl border border-slate-200 bg-white pr-8 pl-3.5 text-[12px] font-semibold text-deepBlue outline-none placeholder:text-slate-400 focus:border-customBlue focus:ring-4 focus:ring-sky-100" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as PlacementStatus | '')} dir="rtl"
          className="h-9 appearance-none rounded-2xl border border-slate-200 bg-white px-3.5 text-[11px] font-semibold text-deepBlue/70 outline-none focus:border-customBlue focus:ring-4 focus:ring-sky-100">
          <option value="">جميع الحالات</option>
          {Object.entries(STATUS_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {(search || filterStatus) && (
          <button type="button" onClick={() => { setSearch(''); setFilterStatus('') }}
            className="flex items-center gap-1 rounded-2xl border border-slate-200 px-3 py-2 text-[11px] font-black text-deepBlue/55 transition hover:bg-slate-50">
            <XCircle className="h-3.5 w-3.5" />مسح
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2">{[1, 2, 3, 4].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <ClipboardCheck className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-4 text-[16px] font-black text-deepBlue">
            {rows.length === 0 ? 'لا توجد نتائج اختبارات بعد' : 'لا توجد نتائج تطابق الفلتر'}
          </p>
          {rows.length === 0 && (
            <p className="mt-1.5 text-[12px] font-semibold text-deepBlue/45">
              ستظهر هنا نتائج اختبارات الطلاب بعد إتمامها
            </p>
          )}
        </div>
      ) : (
        <>
          <p className="text-[11px] font-black text-deepBlue/30">
            عرض <span className="font-mono">{filtered.length}</span> من <span className="font-mono">{rows.length}</span>
          </p>
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-[13px]">
                <thead className="border-b border-slate-100 bg-slate-50/80">
                  <tr>
                    {['الطالب', 'الدورة', 'الدرجة', 'المستوى', 'تاريخ التقديم', 'حالة المقابلة', 'الحالة'].map((h) => (
                      <th key={h} className="px-4 py-3.5 text-[11px] font-black text-deepBlue/45">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((row, i) => {
                    const lvl = row.written_score != null
                      ? getLevelFromScore(row.written_score, row.total_questions ?? 70) : null
                    const cefrCode = lvl ? (CEFR_CODE[lvl.level] ?? lvl.level) : null
                    return (
                      <motion.tr key={`${row.attempt_id}-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }} className="transition hover:bg-slate-50/60">
                        <td className="px-4 py-3.5">
                          <p className="font-black text-deepBlue">{row.student_name}</p>
                          <p className="text-[10px] font-semibold text-deepBlue/40" dir="ltr">{row.student_email}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <Link to={`/dashboard/instructor/courses/${row.course_id}/placement-students`}
                            className="text-[12px] font-black text-customBlue transition hover:underline">
                            {row.course_title || `دورة #${row.course_id}`}
                          </Link>
                        </td>
                        <td className="px-4 py-3.5">
                          {row.written_score != null ? (
                            <span className="font-mono font-black tabular-nums text-deepBlue">
                              {row.written_score}<span className="text-deepBlue/35">/{row.total_questions ?? 70}</span>
                            </span>
                          ) : <span className="text-deepBlue/25">—</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          {cefrCode ? (
                            <div>
                              <span className="font-mono text-[12px] font-black text-deepBlue">{cefrCode}</span>
                              {lvl?.label && <p className="text-[10px] font-semibold text-deepBlue/45">{lvl.label}</p>}
                            </div>
                          ) : row.written_level ? (
                            <span className="rounded-xl bg-slate-100 px-2 py-0.5 text-[11px] font-black text-deepBlue">{row.written_level}</span>
                          ) : <span className="text-deepBlue/25">—</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-[12px] font-semibold tabular-nums text-deepBlue/65">
                            {toDMY(row.submitted_at)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          {row.oral_booking_at ? (
                            <div className="flex items-center gap-1 text-[11px] text-violet-600">
                              <Mic className="h-3.5 w-3.5" />
                              <span className="font-mono font-semibold tabular-nums">{toDMY(row.oral_booking_at)}</span>
                            </div>
                          ) : row.final_level ? (
                            <div className="flex items-center gap-1 text-[11px] text-emerald-600">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span className="font-mono font-black">{row.final_level}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] font-semibold text-deepBlue/30">لم يُحجز</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`rounded-xl px-2.5 py-1 text-[10px] font-black ${STATUS_CLR[row.status] ?? 'bg-slate-100 text-slate-500'}`}>
                            {STATUS_AR[row.status] ?? row.status}
                          </span>
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-right shadow-sm">
      <div className="flex items-center justify-between">
        <Users className={`h-4 w-4 opacity-30 ${color}`} />
        <p className={`font-mono text-[28px] font-black tabular-nums ${color}`}>{value}</p>
      </div>
      <p className="mt-1 text-[11px] font-semibold text-deepBlue/50">{label}</p>
    </div>
  )
}
