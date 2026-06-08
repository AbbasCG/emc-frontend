import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Award,
  CheckCircle,
  MessageSquare,
  Mic,
  RefreshCw,
  X,
} from 'lucide-react'
import {
  completeOralAssessment,
  fetchInstructorOralAssessments,
  getLevelFromScore,
  PLACEMENT_LEVELS,
  type InstructorOralAssessment,
  type PlacementStatus,
} from '@/api/placementApi'
import toast from '@/lib/toast'
import { BackButton } from '@/components/shared/BackButton'

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function toDMY(iso: string | null | undefined): string {
  if (!iso) return '—'
  const slice = iso.slice(0, 10)
  if (slice.length < 10) return '—'
  const [y, m, d] = slice.split('-')
  return `${d}/${m}/${y}`
}

function toHM(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso.slice(11, 16) || '—'
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch { return '—' }
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
  written_submitted: 'bg-amber-100 text-amber-700',
  oral_booked:       'bg-customBlue/10 text-customBlue',
  oral_completed:    'bg-violet-100 text-violet-700',
  completed:         'bg-emerald-100 text-emerald-700',
}

type ModalState = { row: InstructorOralAssessment; final_level: string; oral_score: string; notes: string }

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function InstructorOralAssessmentsPage() {
  const [rows,    setRows]    = useState<InstructorOralAssessment[]>([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState<ModalState | null>(null)
  const [saving,  setSaving]  = useState(false)

  async function load() {
    setLoading(true)
    try { setRows(await fetchInstructorOralAssessments()) }
    catch { toast.error('تعذّر تحميل المقابلات الشفوية') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, []) // eslint-disable-line

  function openModal(row: InstructorOralAssessment) {
    const estimated = row.written_score != null
      ? getLevelFromScore(row.written_score, row.total_questions ?? 70).level : ''
    setModal({ row, final_level: row.final_level ?? estimated, oral_score: row.oral_score != null ? String(row.oral_score) : '', notes: row.notes ?? '' })
  }

  async function handleSave() {
    if (!modal) return
    setSaving(true)
    try {
      await completeOralAssessment(modal.row.course_id, modal.row.attempt_id, {
        final_level: modal.final_level,
        ...(modal.oral_score ? { oral_score: Number(modal.oral_score) } : {}),
        ...(modal.notes.trim() ? { notes: modal.notes.trim() } : {}),
      })
      toast.success('تم حفظ نتيجة التقييم')
      setModal(null)
      void load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'تعذّر حفظ التقييم')
    } finally { setSaving(false) }
  }

  const canAssess = (s: PlacementStatus) => s === 'oral_booked' || s === 'oral_completed' || s === 'completed'

  const stats = [
    { label: 'إجمالي المقابلات',   count: rows.length,                                                        color: 'text-customBlue',   icon: MessageSquare },
    { label: 'في الانتظار',        count: rows.filter((r) => r.status === 'written_submitted').length,         color: 'text-amber-500',    icon: Mic           },
    { label: 'محجوزة',             count: rows.filter((r) => r.status === 'oral_booked').length,               color: 'text-violet-600',   icon: CheckCircle   },
    { label: 'مكتملة',             count: rows.filter((r) => r.status === 'oral_completed' || r.status === 'completed').length, color: 'text-emerald-600', icon: Award },
  ]

  return (
    <div className="space-y-5 pb-16" dir="rtl">

      <BackButton to="/dashboard/instructor/courses" />

      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-bl from-deepBlue via-[#1a2d44] to-customBlue px-6 py-6 shadow-[0_20px_50px_-20px_rgba(34,51,74,0.5)] sm:px-10">
        <div aria-hidden className="pointer-events-none absolute -left-16 top-0 h-44 w-44 rounded-full bg-customOrange/15 blur-[80px]" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[1.5rem] font-black leading-tight text-white">المقابلات الشفوية</h1>
            <p className="mt-1 text-[12px] font-semibold text-white/55">جميع المقابلات المجدولة وإتمام التقييم النهائي</p>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading}
            className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-[12px] font-black text-white backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map(({ label, count, color, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-right">
              <div className="flex items-center justify-between">
                <Icon className={`h-4 w-4 opacity-40 ${color}`} />
                <p className={`font-mono text-[28px] font-black tabular-nums ${color}`}>{count}</p>
              </div>
              <p className="mt-1 text-[11px] font-semibold text-deepBlue/50">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />)}</div>
      ) : rows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-20 text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-4 font-black text-deepBlue">لا توجد مقابلات مجدولة بعد</p>
          <p className="mt-1 text-[13px] font-semibold text-deepBlue/45">ستظهر المقابلات هنا عندما يحجز الطلاب مواعيدهم</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-[13px]">
              <thead className="border-b border-slate-100 bg-slate-50/80">
                <tr>
                  {['الطالب', 'الدورة', 'الدرجة', 'المستوى', 'تاريخ المقابلة', 'الوقت', 'الحالة', ''].map((h) => (
                    <th key={h} className="px-4 py-3.5 text-[11px] font-black text-deepBlue/45">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, i) => {
                  const estimated = row.written_score != null
                    ? getLevelFromScore(row.written_score, row.total_questions ?? 70) : null
                  const levelLabel = estimated?.label
                    ?? (row.estimated_level ? row.estimated_level : null)
                  return (
                    <motion.tr key={`${row.id}-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }} className="transition hover:bg-slate-50/60">
                      <td className="px-4 py-3.5">
                        <p className="font-black text-deepBlue">{row.student_name}</p>
                        <p className="text-[10px] font-semibold text-deepBlue/40" dir="ltr">{row.student_email}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        {row.course_title ? (
                          <Link to={`/dashboard/instructor/courses/${row.course_id}/placement-students`}
                            className="text-[12px] font-black text-customBlue transition hover:underline">
                            {row.course_title}
                          </Link>
                        ) : (
                          <span className="text-[12px] font-semibold text-deepBlue/40">دورة #{row.course_id}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {row.written_score != null ? (
                          <span className="font-mono font-black tabular-nums text-deepBlue">
                            {row.written_score}<span className="text-deepBlue/35">/{row.total_questions ?? 70}</span>
                          </span>
                        ) : <span className="text-deepBlue/25">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        {levelLabel ? (
                          <span className="rounded-xl bg-slate-100 px-2.5 py-1 text-[11px] font-black text-deepBlue">{levelLabel}</span>
                        ) : <span className="text-deepBlue/25">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-[12px] font-semibold tabular-nums text-deepBlue/65">
                          {toDMY(row.oral_booking_at)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {row.oral_booking_at ? (
                          <span className="font-mono text-[12px] font-semibold tabular-nums text-deepBlue/65">
                            {toHM(row.oral_booking_at)}
                            {row.oral_booking_ends_at && (
                              <span className="text-deepBlue/35"> – {toHM(row.oral_booking_ends_at)}</span>
                            )}
                          </span>
                        ) : <span className="text-deepBlue/25">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`rounded-xl px-2.5 py-1 text-[10px] font-black ${STATUS_CLR[row.status] ?? 'bg-slate-100 text-slate-500'}`}>
                          {STATUS_AR[row.status] ?? row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {canAssess(row.status) && (
                          <button type="button" onClick={() => openModal(row)}
                            className={`rounded-xl border px-3 py-1.5 text-[11px] font-black transition ${row.status === 'completed' ? 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100' : 'border-customBlue/30 bg-customBlue/[0.07] text-customBlue hover:bg-customBlue/[0.14]'}`}>
                            {row.status === 'completed' ? 'تعديل' : 'إتمام التقييم'}
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assessment modal */}
      <AnimatePresence>
        {modal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" dir="rtl">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <h2 className="text-[17px] font-black text-deepBlue">إتمام التقييم الشفوي</h2>
                  <p className="mt-0.5 text-[12px] font-semibold text-deepBlue/50">{modal.row.student_name}</p>
                </div>
                <button type="button" onClick={() => setModal(null)} className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {modal.row.written_score != null && (
                <div className="mb-5 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="font-semibold text-deepBlue/55">الدرجة الكتابية</span>
                    <span className="font-mono font-black tabular-nums text-deepBlue">
                      {modal.row.written_score}/{modal.row.total_questions ?? 70}
                    </span>
                  </div>
                  {modal.row.estimated_level && (
                    <div className="mt-1 flex items-center justify-between text-[12px]">
                      <span className="font-semibold text-deepBlue/45">المستوى التقديري</span>
                      <span className="font-black text-deepBlue">{modal.row.estimated_level}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="mb-4">
                <label className="mb-1.5 block text-[11px] font-black text-deepBlue/55">
                  المستوى النهائي <span className="text-red-500">*</span>
                </label>
                <select value={modal.final_level}
                  onChange={(e) => setModal((m) => m ? { ...m, final_level: e.target.value } : null)}
                  dir="rtl"
                  className="h-11 w-full appearance-none rounded-2xl border border-slate-200 bg-white pr-4 text-[13px] font-semibold text-deepBlue outline-none focus:border-customBlue focus:ring-4 focus:ring-sky-100">
                  <option value="">اختر المستوى</option>
                  {PLACEMENT_LEVELS.map((lvl) => (
                    <option key={lvl.level} value={lvl.level}>{lvl.label} — {lvl.description}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="mb-1.5 block text-[11px] font-black text-deepBlue/55">
                  درجة المقابلة الشفوية
                  <span className="mr-1 font-normal text-deepBlue/35">(اختياري، 0–100)</span>
                </label>
                <input type="number" min="0" max="100" value={modal.oral_score}
                  onChange={(e) => setModal((m) => m ? { ...m, oral_score: e.target.value } : null)}
                  placeholder="مثال: 85" dir="ltr"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-deepBlue outline-none focus:border-customBlue focus:ring-4 focus:ring-sky-100" />
              </div>

              <div className="mb-6">
                <label className="mb-1.5 block text-[11px] font-black text-deepBlue/55">
                  ملاحظات <span className="mr-1 font-normal text-deepBlue/35">(اختياري)</span>
                </label>
                <textarea rows={3} value={modal.notes}
                  onChange={(e) => setModal((m) => m ? { ...m, notes: e.target.value } : null)}
                  placeholder="ملاحظات حول أداء الطالب..." dir="rtl"
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-semibold text-deepBlue outline-none focus:border-customBlue focus:ring-4 focus:ring-sky-100" />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => void handleSave()} disabled={!modal.final_level || saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-customBlue px-4 py-3 text-[13px] font-black text-white transition hover:brightness-105 disabled:opacity-50">
                  <CheckCircle className="h-4 w-4" />
                  {saving ? 'جاري الحفظ...' : 'اعتماد المستوى'}
                </button>
                <button type="button" onClick={() => setModal(null)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-[13px] font-black text-deepBlue/65 transition hover:bg-slate-50">
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
