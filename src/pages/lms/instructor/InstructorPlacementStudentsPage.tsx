import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BackButton } from '@/components/shared/BackButton'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  BookOpen,
  CheckCircle,
  ChevronDown,
  ClipboardCheck,
  RefreshCw,
  User,
  X,
} from 'lucide-react'
import {
  completeOralAssessment,
  fetchInstructorPlacementStudents,
  getLevelFromScore,
  PLACEMENT_LEVELS,
  type PlacementStudentRow,
} from '@/api/placementApi'
import toast from '@/lib/toast'

/* ── CEFR data ───────────────────────────────────────────────────────────── */

const CEFR_MAP: Record<string, { cefr: string; arabic: string; bg: string; text: string }> = {
  beginner:           { cefr: 'Starter', arabic: 'مبتدئ',         bg: 'bg-slate-100',   text: 'text-slate-600'   },
  elementary:         { cefr: 'A1',      arabic: 'ابتدائي',        bg: 'bg-blue-100',    text: 'text-blue-700'    },
  pre_intermediate:   { cefr: 'A2',      arabic: 'ما قبل المتوسط', bg: 'bg-sky-100',     text: 'text-sky-700'     },
  intermediate:       { cefr: 'B1',      arabic: 'متوسط',          bg: 'bg-emerald-100', text: 'text-emerald-700' },
  upper_intermediate: { cefr: 'B2',      arabic: 'فوق المتوسط',    bg: 'bg-amber-100',   text: 'text-amber-700'   },
  advanced:           { cefr: 'C1',      arabic: 'متقدم',          bg: 'bg-violet-100',  text: 'text-violet-700'  },
}

/* ── Status display ─────────────────────────────────────────────────────── */

const STATUS_AR: Record<string, string> = {
  not_started:       'لم يبدأ',
  in_progress:       'جارٍ',
  written_submitted: 'اكتمل الاختبار الكتابي',
  oral_booked:       'المقابلة محجوزة',
  oral_completed:    'المقابلة منتهية',
  completed:         'مكتمل',
}

const STATUS_COLOR: Record<string, string> = {
  not_started:       'bg-slate-100 text-slate-500',
  in_progress:       'bg-sky-100 text-sky-700',
  written_submitted: 'bg-amber-100 text-amber-700',
  oral_booked:       'bg-blue-100 text-blue-700',
  oral_completed:    'bg-violet-100 text-violet-700',
  completed:         'bg-emerald-100 text-emerald-700',
}

/* ── Level reference table ─────────────────────────────────────────────── */

const LEVEL_REF = [
  { range: '1–6',   cefr: 'Starter', arabic: 'مبتدئ',         bg: 'bg-slate-100',   text: 'text-slate-600'   },
  { range: '7–20',  cefr: 'A1',      arabic: 'ابتدائي',        bg: 'bg-blue-100',    text: 'text-blue-700'    },
  { range: '21–34', cefr: 'A2',      arabic: 'ما قبل المتوسط', bg: 'bg-sky-100',     text: 'text-sky-700'     },
  { range: '35–48', cefr: 'B1',      arabic: 'متوسط',          bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { range: '49–62', cefr: 'B2',      arabic: 'فوق المتوسط',    bg: 'bg-amber-100',   text: 'text-amber-700'   },
  { range: '63–70', cefr: 'C1',      arabic: 'متقدم',          bg: 'bg-violet-100',  text: 'text-violet-700'  },
]

/* ── Helper: build CEFR badge label ──────────────────────────────────────── */

function cefrBadge(levelKey: string | null) {
  if (!levelKey) return null
  return CEFR_MAP[levelKey] ?? null
}

function toDMY(iso: string | null | undefined): string {
  if (!iso) return '—'
  const s = iso.slice(0, 10)
  if (s.length < 10) return '—'
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

function toHM(iso: string | null | undefined): string {
  if (!iso) return '—'
  const t = iso.slice(11, 16)
  if (/^\d{2}:\d{2}$/.test(t)) return t
  try {
    const dt = new Date(iso)
    if (!isNaN(dt.getTime())) return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`
  } catch { /* */ }
  return '—'
}

function toDMYHM(iso: string | null | undefined): string {
  const date = toDMY(iso)
  const time = toHM(iso)
  if (date === '—') return '—'
  if (time === '—' || time === '00:00') return date
  return `${date}، ${time}`
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function InstructorPlacementStudentsPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const [students, setStudents]   = useState<PlacementStudentRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState<PlacementStudentRow | null>(null)
  const [form, setForm]           = useState({ final_level: '', oral_score: '', notes: '' })
  const [saving, setSaving]       = useState(false)
  const [showRef, setShowRef]     = useState(false)

  async function load() {
    if (!courseId) return
    setLoading(true)
    try {
      const data = await fetchInstructorPlacementStudents(courseId)
      setStudents(data)
    } catch {
      toast.error('تعذّر تحميل قائمة الطلاب')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [courseId]) // eslint-disable-line react-hooks/exhaustive-deps

  function openModal(row: PlacementStudentRow) {
    setSelected(row)
    const estimated = row.written_score != null
      ? getLevelFromScore(row.written_score, row.total_questions ?? 70).level : ''
    setForm({
      final_level: row.final_level ?? estimated,
      oral_score:  row.oral_score != null ? String(row.oral_score) : '',
      notes:       row.notes ?? '',
    })
  }

  async function handleSave() {
    if (!courseId || !selected) return
    setSaving(true)
    try {
      await completeOralAssessment(courseId, selected.attempt_id, {
        final_level: form.final_level,
        ...(form.oral_score ? { oral_score: Number(form.oral_score) } : {}),
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      })
      toast.success('تم حفظ نتيجة التقييم بنجاح')
      setSelected(null)
      void load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      // Show readable message on SQL or server errors
      const display = msg?.toLowerCase().includes('sql') || msg?.toLowerCase().includes('sqlstate')
        ? 'تعذّر حفظ الموعد. يرجى التحقق من إعدادات الخادم.'
        : (msg ?? 'تعذّر حفظ التقييم')
      toast.error(display)
    } finally {
      setSaving(false)
    }
  }

  /* ── Stats ─────────────────────────────────────────────────────────────── */
  const stats = [
    { label: 'إجمالي الطلاب',    count: students.length,                                                  color: '#2691C2' },
    { label: 'اكتمل الاختبار',   count: students.filter((s) => s.status === 'written_submitted').length,  color: '#f59e0b' },
    { label: 'بانتظار المقابلة', count: students.filter((s) => s.status === 'oral_booked').length,        color: '#3b82f6' },
    { label: 'مكتمل',            count: students.filter((s) => s.status === 'completed').length,          color: '#10b981' },
  ]

  return (
    <div className="space-y-5 pb-16" dir="rtl">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <BackButton to="/dashboard/instructor/courses" label="العودة إلى الدورات" className="mb-1.5" />
          <h1 className="text-[20px] font-black text-deepBlue">نتائج تحديد المستوى</h1>
          <p className="mt-0.5 text-[12px] font-semibold text-deepBlue/45">
            الاختبار الكتابي · المقابلات الشفوية · المستويات النهائية
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowRef((v) => !v)}
            className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-[11px] font-bold text-deepBlue/55 shadow-sm transition hover:bg-slate-50"
          >
            <BookOpen className="h-3.5 w-3.5" />
            جدول المستويات
            <ChevronDown className={`h-3 w-3 transition-transform ${showRef ? 'rotate-180' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-[11px] font-bold text-deepBlue/55 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>
      </div>

      {/* ── Level reference (collapsible) ─────────────────────────────── */}
      <AnimatePresence>
        {showRef && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <p className="border-b border-slate-100 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-deepBlue/40">
                جدول المستويات (من أصل 70)
              </p>
              <div className="grid grid-cols-3 gap-px bg-slate-100 sm:grid-cols-6">
                {LEVEL_REF.map((r) => (
                  <div key={r.cefr} className="flex flex-col items-center gap-1 bg-white px-2 py-3 text-center">
                    <span className={`rounded-xl px-2.5 py-1 text-[11px] font-black ${r.bg} ${r.text}`}>
                      {r.cefr}
                    </span>
                    <span className="font-mono text-[10px] font-black text-deepBlue/40">{r.range}</span>
                    <span className="text-[9px] font-semibold text-deepBlue/55">{r.arabic}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Stats ────────────────────────────────────────────────────── */}
      {!loading && students.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map(({ label, count, color }) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="font-mono text-[24px] font-black tabular-nums" style={{ color }}>{count}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-deepBlue/50">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Students list ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <User className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-4 font-black text-deepBlue">لا يوجد طلاب بعد</p>
          <p className="mt-1 text-[12px] font-semibold text-deepBlue/45">
            سيظهر الطلاب هنا بعد تقديم الاختبار الكتابي
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-[13px]">
              <thead className="border-b border-slate-100 bg-slate-50/80">
                <tr>
                  {['الطالب', 'الدرجة', 'مستوى CEFR', 'الاختبار الكتابي', 'موعد المقابلة', 'المستوى النهائي', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-[10px] font-black text-deepBlue/45">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {students.map((row) => {
                  const score     = row.written_score
                  const total     = row.total_questions ?? 70
                  const estimated = score != null ? getLevelFromScore(score, total) : null
                  const badge     = cefrBadge(estimated?.level ?? null)
                  const finalBadge = cefrBadge(row.final_level)
                  const pct = row.percentage != null
                    ? row.percentage
                    : score != null && total > 0
                      ? Math.round((score / total) * 100)
                      : null

                  const canAssess =
                    row.status === 'oral_booked' ||
                    row.status === 'oral_completed' ||
                    row.status === 'completed'

                  const statusNeedsOral = row.status === 'written_submitted'

                  return (
                    <motion.tr
                      key={row.attempt_id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="transition hover:bg-slate-50/60"
                    >
                      {/* Student */}
                      <td className="px-4 py-3.5">
                        <p className="font-black text-deepBlue">{row.student_name}</p>
                        <p className="text-[10px] font-semibold text-deepBlue/35">{row.email}</p>
                      </td>

                      {/* Score + percentage */}
                      <td className="px-4 py-3.5">
                        {score != null ? (
                          <div>
                            <span className="font-mono font-black tabular-nums text-deepBlue">
                              {score}<span className="text-deepBlue/30">/{total}</span>
                            </span>
                            {pct != null && (
                              <p className="mt-0.5 font-mono text-[10px] font-semibold text-deepBlue/40">{pct}%</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-deepBlue/20">—</span>
                        )}
                      </td>

                      {/* CEFR level — always show "A2 / ما قبل المتوسط" format */}
                      <td className="px-4 py-3.5">
                        {badge ? (
                          <span className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-black ${badge.bg} ${badge.text}`}>
                            <span className="font-mono">{badge.cefr}</span>
                            <span className="opacity-50">·</span>
                            <span>{badge.arabic}</span>
                          </span>
                        ) : (
                          <span className="text-deepBlue/20">—</span>
                        )}
                      </td>

                      {/* Written test status */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          {/* Status badge */}
                          <span className={`inline-flex items-center gap-1 rounded-xl px-2 py-0.5 text-[10px] font-black ${STATUS_COLOR[row.status] ?? 'bg-slate-100 text-slate-500'}`}>
                            {statusNeedsOral
                              ? <><ClipboardCheck className="h-3 w-3" /> بانتظار المقابلة الشفوية</>
                              : STATUS_AR[row.status] ?? row.status}
                          </span>
                          {/* Submitted date */}
                          {row.submitted_at && (
                            <p className="text-[10px] font-semibold text-deepBlue/35">
                              {toDMY(row.submitted_at)}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Oral booking date */}
                      <td className="px-4 py-3.5">
                        {row.oral_booking_at ? (
                          <span className="font-mono text-[11px] font-semibold tabular-nums text-deepBlue/65">
                            {toDMYHM(row.oral_booking_at)}
                          </span>
                        ) : (
                          <span className="text-deepBlue/20">—</span>
                        )}
                      </td>

                      {/* Final level */}
                      <td className="px-4 py-3.5">
                        {finalBadge ? (
                          <span className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-black ${finalBadge.bg} ${finalBadge.text}`}>
                            <span className="font-mono">{finalBadge.cefr}</span>
                            <span className="opacity-50">·</span>
                            <span>{finalBadge.arabic}</span>
                          </span>
                        ) : row.final_level ? (
                          <span className="rounded-xl bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-700">
                            {PLACEMENT_LEVELS.find((l) => l.level === row.final_level)?.label ?? row.final_level}
                          </span>
                        ) : (
                          <span className="text-deepBlue/20">—</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3.5">
                        {canAssess && (
                          <button
                            type="button"
                            onClick={() => openModal(row)}
                            className={`rounded-xl border px-3 py-1.5 text-[11px] font-black transition ${
                              row.status === 'completed'
                                ? 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                                : 'border-customBlue/30 bg-customBlue/[0.07] text-customBlue hover:bg-customBlue/[0.14]'
                            }`}
                          >
                            {row.status === 'completed' ? 'تعديل' : 'تقييم شفوي'}
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

      {/* ── Oral assessment modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl"
            >
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <h2 className="text-[16px] font-black text-deepBlue">التقييم الشفوي</h2>
                  <p className="mt-0.5 text-[12px] font-semibold text-deepBlue/50">{selected.student_name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Written summary */}
              {selected.written_score != null && (
                <div className="mb-5 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-[13px]">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-deepBlue/55">الدرجة الكتابية</span>
                    <span className="font-mono font-black tabular-nums text-deepBlue">
                      {selected.written_score}/{selected.total_questions ?? '—'}
                    </span>
                  </div>
                  {selected.written_level && (() => {
                    const b = cefrBadge(selected.written_level)
                    return b ? (
                      <div className="mt-1.5 flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-deepBlue/45">المستوى التقديري</span>
                        <span className={`rounded-xl px-2.5 py-0.5 font-black ${b.bg} ${b.text}`}>
                          {b.cefr} · {b.arabic}
                        </span>
                      </div>
                    ) : null
                  })()}
                </div>
              )}

              {/* Final level selector */}
              <div className="mb-4">
                <label className="mb-1.5 block text-[11px] font-black text-deepBlue/55">
                  المستوى النهائي <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.final_level}
                  onChange={(e) => setForm((f) => ({ ...f, final_level: e.target.value }))}
                  dir="rtl"
                  className="h-11 w-full appearance-none rounded-2xl border border-slate-200 bg-white pr-4 pl-8 text-[13px] font-semibold text-deepBlue outline-none focus:border-customBlue focus:ring-4 focus:ring-sky-100"
                >
                  <option value="">اختر المستوى</option>
                  {PLACEMENT_LEVELS.map((lvl) => {
                    const b = CEFR_MAP[lvl.level]
                    return (
                      <option key={lvl.level} value={lvl.level}>
                        {b ? `${b.cefr} — ${b.arabic}` : lvl.label}
                      </option>
                    )
                  })}
                </select>
              </div>

              {/* Oral score */}
              <div className="mb-4">
                <label className="mb-1.5 block text-[11px] font-black text-deepBlue/55">
                  درجة المقابلة الشفوية
                  <span className="mr-1 font-normal text-deepBlue/35">(اختياري، 0–100)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.oral_score}
                  onChange={(e) => setForm((f) => ({ ...f, oral_score: e.target.value }))}
                  placeholder="مثال: 85"
                  dir="ltr"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-deepBlue outline-none focus:border-customBlue focus:ring-4 focus:ring-sky-100"
                />
              </div>

              {/* Notes */}
              <div className="mb-6">
                <label className="mb-1.5 block text-[11px] font-black text-deepBlue/55">
                  ملاحظات <span className="font-normal text-deepBlue/35">(اختياري)</span>
                </label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="ملاحظات حول أداء الطالب في المقابلة..."
                  dir="rtl"
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-semibold text-deepBlue outline-none focus:border-customBlue focus:ring-4 focus:ring-sky-100"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={!form.final_level || saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-customBlue px-4 py-3 text-[13px] font-black text-white transition hover:brightness-105 disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4" />
                  {saving ? 'جاري الحفظ...' : 'اعتماد المستوى'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-[13px] font-black text-deepBlue/65 transition hover:bg-slate-50"
                >
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
