import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BookOpen,
  CheckCircle,
  ChevronDown,
  Mic,
  User,
  X,
} from 'lucide-react'
import {
  completeOralAssessment,
  fetchInstructorPlacementStudents,
  getLevelFromScore,
  PLACEMENT_LEVELS,
  progressFromStatus,
  type PlacementStudentRow,
} from '@/api/placementApi'
import type { InstructorStudentRow } from '@/api/instructorApi'
import toast from '@/lib/toast'
import { InstructorHero, InstructorStudentCard, InstructorStudentDrawer } from '@/components/instructor'

/* ── CEFR map ─────────────────────────────────────────────────────────────── */

const CEFR_MAP: Record<string, { cefr: string; arabic: string; bg: string; text: string }> = {
  beginner:           { cefr: 'Starter', arabic: 'مبتدئ',         bg: 'bg-slate-100',   text: 'text-slate-600'   },
  elementary:         { cefr: 'A1',      arabic: 'ابتدائي',        bg: 'bg-blue-100',    text: 'text-blue-700'    },
  pre_intermediate:   { cefr: 'A2',      arabic: 'ما قبل المتوسط', bg: 'bg-sky-100',     text: 'text-sky-700'     },
  intermediate:       { cefr: 'B1',      arabic: 'متوسط',          bg: 'bg-emerald-100', text: 'text-emerald-700' },
  upper_intermediate: { cefr: 'B2',      arabic: 'فوق المتوسط',    bg: 'bg-amber-100',   text: 'text-amber-700'   },
  advanced:           { cefr: 'C1',      arabic: 'متقدم',          bg: 'bg-violet-100',  text: 'text-violet-700'  },
}

function cefrBadge(level: string | null | undefined) {
  return CEFR_MAP[level ?? ''] ?? null
}

/* ── Level reference ─────────────────────────────────────────────────────── */

const LEVEL_REF = [
  { range: '1–6',   cefr: 'Starter', arabic: 'مبتدئ',         bg: 'bg-slate-100',   text: 'text-slate-600'   },
  { range: '7–20',  cefr: 'A1',      arabic: 'ابتدائي',        bg: 'bg-blue-100',    text: 'text-blue-700'    },
  { range: '21–34', cefr: 'A2',      arabic: 'ما قبل المتوسط', bg: 'bg-sky-100',     text: 'text-sky-700'     },
  { range: '35–48', cefr: 'B1',      arabic: 'متوسط',          bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { range: '49–62', cefr: 'B2',      arabic: 'فوق المتوسط',    bg: 'bg-amber-100',   text: 'text-amber-700'   },
  { range: '63–70', cefr: 'C1',      arabic: 'متقدم',          bg: 'bg-violet-100',  text: 'text-violet-700'  },
]

/* ── Adapter: PlacementStudentRow → InstructorStudentRow ─────────────────── */

function toStudentRow(row: PlacementStudentRow, courseId: string): InstructorStudentRow {
  return {
    id:                row.student_id,
    name:              row.student_name,
    email:             row.email,
    course_id:         Number(courseId),
    course_title:      null,
    enrollment_status: null,
    placement_status:  row.status,
    written_score:     row.written_score,
    total_questions:   row.total_questions,
    written_level:     row.written_level,
    oral_booking_at:   row.oral_booking_at,
    final_level:       row.final_level,
    oral_score:        row.oral_score,
    instructor_notes:  row.notes,
    enrolled_at:       null,
    avatar_url:        row.avatar_url,
    attempt_id:        row.attempt_id,
  }
}

/* ── Oral form type ──────────────────────────────────────────────────────── */

type OralForm = {
  final_level:         string
  notes:               string
  score_speaking:      string
  score_pronunciation: string
  score_vocabulary:    string
  score_grammar:       string
  score_fluency:       string
}

const ORAL_SCORES: { key: keyof OralForm; label: string; max: number }[] = [
  { key: 'score_speaking',      label: 'التحدث',   max: 20 },
  { key: 'score_pronunciation', label: 'النطق',    max: 20 },
  { key: 'score_vocabulary',    label: 'المفردات',  max: 20 },
  { key: 'score_grammar',       label: 'القواعد',   max: 20 },
  { key: 'score_fluency',       label: 'الطلاقة',   max: 20 },
]

function emptyForm(row?: PlacementStudentRow): OralForm {
  const estimated = row?.written_score != null
    ? getLevelFromScore(row.written_score, row.total_questions ?? 70).level
    : ''
  return {
    final_level:         row?.final_level ?? estimated,
    notes:               row?.notes ?? '',
    score_speaking:      '',
    score_pronunciation: '',
    score_vocabulary:    '',
    score_grammar:       '',
    score_fluency:       '',
  }
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function InstructorPlacementStudentsPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const [students,           setStudents]          = useState<PlacementStudentRow[]>([])
  const [loading,            setLoading]           = useState(true)
  const [noPlacementCourse,  setNoPlacementCourse] = useState(false)
  const [drawerRow,          setDrawerRow]         = useState<PlacementStudentRow | null>(null)
  const [modalRow,           setModalRow]          = useState<PlacementStudentRow | null>(null)
  const [form,               setForm]              = useState<OralForm>(emptyForm())
  const [saving,             setSaving]            = useState(false)
  const [showRef,            setShowRef]           = useState(false)

  async function load() {
    if (!courseId) return
    setLoading(true)
    setNoPlacementCourse(false)
    try { setStudents(await fetchInstructorPlacementStudents(courseId)) }
    catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 422) {
        setNoPlacementCourse(true)
      } else {
        toast.error('تعذّر تحميل قائمة الطلاب')
        if (import.meta.env.DEV) console.error('[placement-students] load failed:', err)
      }
    }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [courseId]) // eslint-disable-line react-hooks/exhaustive-deps

  function openDrawer(row: PlacementStudentRow) {
    setDrawerRow(row)
  }

  function openModal(row: PlacementStudentRow) {
    setModalRow(row)
    setForm(emptyForm(row))
    setDrawerRow(null)
  }

  const totalOralScore = useMemo(() => {
    const parts = ORAL_SCORES.map((s) => form[s.key])
    // Compute from filled fields only — empty fields treated as 0
    const hasAny = parts.some((v) => v !== '')
    if (!hasAny) return null
    const nums = parts.map((v) => (v === '' ? 0 : Number(v)))
    if (nums.some((n) => isNaN(n))) return null
    return nums.reduce((a, b) => a + b, 0)
  }, [form])

  async function handleSave() {
    if (!courseId || !modalRow) return
    if (!form.final_level) { toast.warning('يجب اختيار المستوى النهائي'); return }
    if (!modalRow.booking_id) {
      toast.error('تعذر تحديد الطالب، يرجى تحديث الصفحة والمحاولة مرة أخرى')
      return
    }
    setSaving(true)
    try {
      const result = await completeOralAssessment(modalRow.booking_id, {
        final_level: CEFR_MAP[form.final_level]?.cefr ?? form.final_level,
        ...(totalOralScore != null ? { oral_score: totalOralScore } : {}),
        ...(form.notes.trim() ? { instructor_notes: form.notes.trim() } : {}),
      })
      toast.success('تم حفظ نتيجة التقييم بنجاح')
      const savedScore = result.oral_score ?? totalOralScore
      const savedLevel = result.final_level ?? (CEFR_MAP[form.final_level]?.cefr ?? form.final_level)
      const savedNotes = result.instructor_notes ?? (form.notes.trim() || null)
      setStudents((prev) => prev.map((s) =>
        s.booking_id === modalRow.booking_id
          ? { ...s, oral_score: savedScore, final_level: savedLevel, notes: savedNotes, status: 'completed' as const }
          : s,
      ))
      setModalRow(null)
      void load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      if (import.meta.env.DEV) console.error('[placement-students] save failed:', err)
      const display =
        msg?.toLowerCase().includes('sql') || msg?.toLowerCase().includes('sqlstate')
          ? 'تعذّر حفظ الموعد. يرجى التحقق من إعدادات الخادم.'
          : (msg ?? 'تعذّر حفظ التقييم')
      toast.error(display)
    } finally {
      setSaving(false)
    }
  }

  /* ── Stats ─────────────────────────────────────────────────────────────── */

  const stats = [
    { label: 'إجمالي الطلاب',   count: students.length,                                                 color: '#0077B6' },
    { label: 'اكتمل الاختبار',  count: students.filter((s) => s.status === 'written_submitted').length, color: '#f59e0b' },
    { label: 'المقابلة محجوزة', count: students.filter((s) => s.status === 'oral_booked').length,       color: '#7c3aed' },
    { label: 'مستوى معتمد',     count: students.filter((s) => s.status === 'completed').length,         color: '#10b981' },
  ]

  /* ── Drawer student row (adapted) ───────────────────────────────────────── */

  const drawerStudent = drawerRow && courseId ? toStudentRow(drawerRow, courseId) : null

  return (
    <div className="space-y-5 pb-16" dir="rtl">

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <InstructorHero
        title="نتائج تحديد المستوى"
        subtitle="الاختبار الكتابي · المقابلات الشفوية · المستويات النهائية"
        backTo="/dashboard/instructor/courses"
        backLabel="الدورات"
        onRefresh={load}
        refreshing={loading}
        pills={loading ? [] : [
          { label: 'إجمالي الطلاب',    value: stats[0].count },
          { label: 'اكتمل الاختبار',   value: stats[1].count },
          { label: 'المقابلة محجوزة',  value: stats[2].count },
          { label: 'مستوى معتمد',      value: stats[3].count },
        ]}
      >
        {/* Level reference toggle */}
        <button
          type="button"
          onClick={() => setShowRef((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-[11px] font-black text-white/70 transition hover:bg-white/20 hover:text-white"
        >
          <BookOpen className="h-3.5 w-3.5" />
          جدول المستويات
          <ChevronDown className={`h-3 w-3 transition-transform ${showRef ? 'rotate-180' : ''}`} />
        </button>
      </InstructorHero>

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
                    <span className={`rounded-xl px-2.5 py-1 text-[11px] font-black ${r.bg} ${r.text}`}>{r.cefr}</span>
                    <span className="font-mono text-[10px] font-black text-deepBlue/40">{r.range}</span>
                    <span className="text-[9px] font-semibold text-deepBlue/55">{r.arabic}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Students cards ────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1,2,3,4].map((i) => <div key={i} className="h-44 animate-pulse rounded-3xl bg-slate-100" />)}
        </div>
      ) : noPlacementCourse ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-4 font-black text-deepBlue">هذه الدورة لا تتطلب اختبار تحديد مستوى</p>
          <p className="mt-1 text-[12px] font-semibold text-deepBlue/45">
            صفحات الاختبار والمقابلات الشفوية متاحة فقط للدورات التي تتطلب تحديد المستوى
          </p>
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
        <div className="grid gap-3 sm:grid-cols-2">
          {students.map((row, i) => {
            const progress  = progressFromStatus(row.status)
            const canAssess = progress.oral_booked
            return (
              <InstructorStudentCard
                key={row.attempt_id}
                student={toStudentRow(row, courseId!)}
                index={i}
                onClick={() => openDrawer(row)}
                onAssess={canAssess ? () => openModal(row) : undefined}
                assessLabel={progress.level_approved ? 'تعديل التقييم' : 'بدء التقييم'}
                assessed={progress.level_approved}
              />
            )
          })}
        </div>
      )}

      {/* ── Student detail drawer ─────────────────────────────────────── */}
      <InstructorStudentDrawer
        student={drawerStudent}
        onClose={() => setDrawerRow(null)}
        onStartAssessment={
          drawerRow && progressFromStatus(drawerRow.status).oral_booked
            ? () => openModal(drawerRow)
            : undefined
        }
      />

      {/* ── Oral assessment modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {modalRow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/45 p-4 backdrop-blur-sm" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              className="relative my-4 w-full max-w-lg rounded-3xl bg-white shadow-[0_32px_80px_-20px_rgba(15,23,42,0.4)]"
            >
              {/* Modal header */}
              <div className="relative overflow-hidden rounded-t-3xl bg-gradient-to-l from-[#0C2A4B] to-[#1a2d44] px-6 py-5 text-white">
                <div className="pointer-events-none absolute -left-4 top-0 h-20 w-20 rounded-full bg-[#F28C00]/20 blur-[40px]" />
                <div className="relative flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-violet-300" />
                      <h2 className="text-[15px] font-black">التقييم الشفوي</h2>
                    </div>
                    <p className="mt-1 text-[12px] font-semibold text-white/55">{modalRow.student_name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalRow(null)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Written summary */}
                {modalRow.written_score != null && (() => {
                  const b = cefrBadge(
                    getLevelFromScore(modalRow.written_score, modalRow.total_questions ?? 70).level
                  )
                  return (
                    <div className="mb-5 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-deepBlue/55">الدرجة الكتابية</span>
                        <span className="font-mono font-black tabular-nums text-deepBlue">
                          {modalRow.written_score}/{modalRow.total_questions ?? '—'}
                        </span>
                      </div>
                      {b && (
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-deepBlue/45">المستوى التقديري</span>
                          <span className={`rounded-xl px-2.5 py-0.5 text-[11px] font-black ${b.bg} ${b.text}`}>
                            {b.cefr} · {b.arabic}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Existing oral score (when re-editing) */}
                {modalRow.oral_score != null && (
                  <div className="mb-4 flex items-center justify-between rounded-2xl border border-violet-100 bg-violet-50/70 px-4 py-2.5">
                    <span className="text-[11px] font-semibold text-violet-700/70">الدرجة الشفوية المحفوظة</span>
                    <span className="font-mono text-[15px] font-black tabular-nums text-deepBlue">
                      {modalRow.oral_score}<span className="text-[10px] font-semibold text-deepBlue/40">/100</span>
                    </span>
                  </div>
                )}

                {/* Oral score inputs */}
                <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[11px] font-black text-deepBlue/55">
                      درجات المقابلة الشفوية
                      <span className="mr-1 font-normal text-deepBlue/35">(اختياري — الحقول الفارغة تُحسب صفراً)</span>
                    </p>
                    {totalOralScore != null && (
                      <span className="font-mono text-[11px] font-black tabular-nums text-[#0077B6]">
                        المجموع: {totalOralScore}/100
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {ORAL_SCORES.map(({ key, label, max }) => (
                      <label key={key} className="block text-[10px] font-black text-deepBlue/50">
                        {label}
                        <span className="font-mono font-normal text-deepBlue/30"> (0–{max})</span>
                        <input
                          type="number"
                          min="0"
                          max={max}
                          value={form[key]}
                          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                          dir="ltr"
                          placeholder="—"
                          className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-deepBlue outline-none focus:border-[#0077B6] focus:ring-2 focus:ring-sky-100"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {/* Final level select */}
                <div className="mb-4">
                  <label className="mb-1.5 block text-[11px] font-black text-deepBlue/55">
                    المستوى النهائي <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.final_level}
                    onChange={(e) => setForm((f) => ({ ...f, final_level: e.target.value }))}
                    dir="rtl"
                    className="h-11 w-full appearance-none rounded-2xl border border-slate-200 bg-white pr-4 pl-8 text-[13px] font-semibold text-deepBlue outline-none focus:border-[#0077B6] focus:ring-4 focus:ring-sky-100"
                  >
                    <option value="">اختر المستوى النهائي</option>
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

                {/* Notes */}
                <div className="mb-6">
                  <label className="mb-1.5 block text-[11px] font-black text-deepBlue/55">
                    ملاحظات المعلم <span className="font-normal text-deepBlue/35">(اختياري)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="ملاحظات حول أداء الطالب في المقابلة..."
                    dir="rtl"
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-semibold text-deepBlue outline-none focus:border-[#0077B6] focus:ring-4 focus:ring-sky-100"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={!form.final_level || saving || !modalRow.booking_id}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#0077B6] px-4 py-3 text-[13px] font-black text-white transition hover:brightness-105 disabled:opacity-50"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {saving ? 'جاري الحفظ...' : 'اعتماد المستوى'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalRow(null)}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-[13px] font-black text-deepBlue/65 transition hover:bg-slate-50"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
