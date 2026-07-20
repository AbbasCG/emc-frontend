import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  X,
} from 'lucide-react'
import {
  completeOralAssessment,
  fetchInstructorOralAssessments,
  getLevelFromScore,
  PLACEMENT_LEVELS,
  type InstructorOralAssessment,
  type OralRubric,
} from '@/api/placementApi'
import type { InstructorStudentRow } from '@/api/instructorApi'
import toast from '@/lib/toast'
import { InstructorHero, InstructorStudentCard, InstructorStudentDrawer } from '@/components/instructor'

/* ── Rubric criteria ─────────────────────────────────────────────────────── */

const RUBRIC_CRITERIA: { key: keyof OralRubric; label: string; hint: string }[] = [
  { key: 'pronunciation_score', label: 'النطق',    hint: 'وضوح الأصوات والمخارج' },
  { key: 'grammar_score',       label: 'القواعد',  hint: 'صحة البنية النحوية' },
  { key: 'vocabulary_score',    label: 'المفردات', hint: 'ثراء وتنوع المفردات' },
  { key: 'fluency_score',       label: 'الطلاقة',  hint: 'الانسياب وعدم التوقف' },
  { key: 'comprehension_score', label: 'الفهم',    hint: 'استيعاب الأسئلة والسياق' },
  { key: 'confidence_score',    label: 'الثقة',    hint: 'الثقة والإقناع في الأداء' },
]

function computeTotalFromRubric(rubric: OralRubric): number | null {
  const vals = RUBRIC_CRITERIA.map((c) => rubric[c.key])
  if (vals.some((v) => v === null)) return null
  return Math.round((vals.reduce<number>((s, v) => s + (v ?? 0), 0) / 60) * 100)
}

function ScoreInput({
  label, hint, value, onChange, disabled,
}: { label: string; hint: string; value: number | null; onChange: (v: number | null) => void; disabled?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-black text-[#22334A]">{label}</p>
          <p className="text-[10px] font-semibold text-slate-400">{hint}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={0}
            max={10}
            value={value ?? ''}
            disabled={disabled}
            onChange={(e) => {
              const v = e.target.value === '' ? null : Math.min(10, Math.max(0, Number(e.target.value)))
              onChange(v)
            }}
            className="w-12 rounded-xl border border-slate-200 bg-white px-2 py-1 text-center text-[14px] font-black text-[#22334A] outline-none focus:border-[#2691C2] disabled:opacity-50"
            dir="ltr"
          />
          <span className="text-[10px] font-semibold text-slate-400">/10</span>
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={value ?? 0}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-[#2691C2] disabled:opacity-50"
      />
    </div>
  )
}

/* ── CEFR mapping for final_level payload ────────────────────────────────── */

const LEVEL_TO_CEFR: Record<string, string> = {
  beginner:           'Starter',
  elementary:         'A1',
  pre_intermediate:   'A2',
  intermediate:       'B1',
  upper_intermediate: 'B2',
  advanced:           'C1',
}

/* ── Adapter: InstructorOralAssessment → InstructorStudentRow ────────────── */

function toStudentRow(row: InstructorOralAssessment): InstructorStudentRow {
  return {
    id:                row.student_id,
    name:              row.student_name,
    email:             row.student_email,
    course_id:         row.course_id,
    course_title:      row.course_title,
    enrollment_status: null,
    placement_status:  row.status,
    written_score:     row.written_score,
    total_questions:   row.total_questions,
    written_level:     row.estimated_level,
    oral_booking_at:   row.oral_booking_at,
    final_level:       row.final_level,
    oral_score:        row.oral_score,
    instructor_notes:  row.instructor_notes ?? row.notes,
    enrolled_at:       null,
    avatar_url:        row.avatar_url,
    attempt_id:        row.attempt_id,
    class_assignment:  null,
  }
}

/* ── Modal state ─────────────────────────────────────────────────────────── */

type ModalState = {
  row: InstructorOralAssessment
  final_level: string
  oral_score: string
  notes: string
  showRubric: boolean
  rubric: OralRubric
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function InstructorOralAssessmentsPage() {
  const [rows,      setRows]      = useState<InstructorOralAssessment[]>([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState<ModalState | null>(null)
  const [drawerRow, setDrawerRow] = useState<InstructorOralAssessment | null>(null)
  const [saving,    setSaving]    = useState(false)

  async function load() {
    setLoading(true)
    try {
      const all = await fetchInstructorOralAssessments()
      // Only show records that have an oral booking or are in oral/completed stage
      setRows(all.filter((r) =>
        r.oral_booking_at != null ||
        r.status === 'oral_booked' ||
        r.status === 'oral_completed' ||
        r.status === 'completed'
      ))
    } catch (err) {
      toast.error('تعذّر تحميل المقابلات الشفوية')
      if (import.meta.env.DEV) console.error('[oral-assessments] load failed:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, []) // eslint-disable-line

  function openModal(row: InstructorOralAssessment) {
    const estimated = row.written_score != null
      ? getLevelFromScore(row.written_score, row.total_questions ?? 70).level : ''
    setModal({
      row,
      final_level: row.final_level ?? estimated,
      oral_score:  row.oral_score != null ? String(row.oral_score) : '',
      notes:       row.instructor_notes ?? row.notes ?? '',
      showRubric:  true,
      rubric: {
        pronunciation_score: row.pronunciation_score,
        grammar_score:       row.grammar_score,
        vocabulary_score:    row.vocabulary_score,
        fluency_score:       row.fluency_score,
        comprehension_score: row.comprehension_score,
        confidence_score:    row.confidence_score,
      },
    })
    setDrawerRow(null)
  }

  function updateRubric(key: keyof OralRubric, value: number | null) {
    setModal((m) => {
      if (!m) return null
      const rubric = { ...m.rubric, [key]: value }
      const total = computeTotalFromRubric(rubric)
      return { ...m, rubric, oral_score: total != null ? String(total) : m.oral_score }
    })
  }

  async function handleSave() {
    if (!modal) return
    setSaving(true)
    try {
      const rubricPayload: Partial<OralRubric> = {}
      RUBRIC_CRITERIA.forEach((c) => {
        if (modal.rubric[c.key] !== null) rubricPayload[c.key] = modal.rubric[c.key] as number
      })

      const result = await completeOralAssessment(modal.row.id, {
        final_level: LEVEL_TO_CEFR[modal.final_level] ?? modal.final_level,
        ...(modal.oral_score !== '' ? { oral_score: Number(modal.oral_score) } : {}),
        ...(modal.notes.trim() ? { instructor_notes: modal.notes.trim() } : {}),
        ...rubricPayload,
      })
      toast.success('تم حفظ نتيجة التقييم')
      const savedScore = result.oral_score ?? (modal.oral_score !== '' ? Number(modal.oral_score) : null)
      const savedLevel = result.final_level ?? modal.final_level
      const savedNotes = result.instructor_notes ?? (modal.notes.trim() || null)
      setRows((prev) => prev.map((r) =>
        r.id === modal.row.id
          ? { ...r, ...modal.rubric, oral_score: savedScore, final_level: savedLevel, instructor_notes: savedNotes, status: 'completed' }
          : r,
      ))
      setModal(null)
      void load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      if (import.meta.env.DEV) console.error('[oral-assessments] save failed:', err)
      toast.error(msg ?? 'تعذّر حفظ التقييم')
    } finally {
      setSaving(false)
    }
  }

  const canAssess = (s: string) =>
    s === 'oral_booked' || s === 'oral_completed' || s === 'completed'

  const stats = [
    { label: 'إجمالي المقابلات', count: rows.length },
    { label: 'محجوزة',           count: rows.filter((r) => r.status === 'oral_booked').length },
    { label: 'مكتملة',           count: rows.filter((r) => r.status === 'oral_completed' || r.status === 'completed').length },
  ]

  const drawerStudent = drawerRow ? toStudentRow(drawerRow) : null
  const autoTotal = modal ? computeTotalFromRubric(modal.rubric) : null

  return (
    <div className="space-y-5 pb-16" dir="rtl">

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <InstructorHero
        title="المقابلات الشفوية"
        subtitle="جميع المقابلات المجدولة وإتمام التقييم النهائي"
        backTo="/dashboard/instructor/courses"
        backLabel="الدورات"
        onRefresh={load}
        refreshing={loading}
        pills={loading ? [] : [
          { label: 'إجمالي المقابلات', value: stats[0].count },
          { label: 'محجوزة',           value: stats[1].count },
          { label: 'مكتملة',           value: stats[2].count },
        ]}
      />

      {/* ── Cards ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-44 animate-pulse rounded-3xl bg-slate-100" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-20 text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-4 font-black text-deepBlue">لا توجد مقابلات مجدولة بعد</p>
          <p className="mt-1 text-[13px] font-semibold text-deepBlue/45">
            ستظهر المقابلات هنا عندما يحجز الطلاب مواعيدهم
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((row, i) => (
            <InstructorStudentCard
              key={`${row.id}-${i}`}
              student={toStudentRow(row)}
              index={i}
              onClick={() => setDrawerRow(row)}
              onAssess={canAssess(row.status) ? () => openModal(row) : undefined}
              assessLabel={row.status === 'completed' || row.oral_score != null ? 'تعديل' : 'إتمام التقييم'}
              assessed={row.status === 'completed' || row.oral_score != null}
            />
          ))}
        </div>
      )}

      {/* ── Student detail drawer ─────────────────────────────────────── */}
      <InstructorStudentDrawer
        student={drawerStudent}
        onClose={() => setDrawerRow(null)}
        onStartAssessment={
          drawerRow && canAssess(drawerRow.status)
            ? () => openModal(drawerRow)
            : undefined
        }
      />

      {/* ── Assessment modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {modal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-8" dir="rtl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mb-8 w-full max-w-lg rounded-3xl bg-white shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 p-6 pb-4">
                <div>
                  <h2 className="text-[17px] font-black text-deepBlue">إتمام التقييم الشفوي</h2>
                  <p className="mt-0.5 text-[12px] font-semibold text-deepBlue/50">{modal.row.student_name}</p>
                </div>
                <button type="button" onClick={() => setModal(null)}
                  className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-5 p-6">
                {/* Written test summary */}
                {modal.row.written_score != null && (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
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

                {/* Rubric section */}
                <div>
                  <button
                    type="button"
                    onClick={() => setModal((m) => m ? { ...m, showRubric: !m.showRubric } : null)}
                    className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-black text-[#22334A] transition hover:border-[#2691C2]/40"
                  >
                    <span>تقييم المعايير التفصيلية</span>
                    <div className="flex items-center gap-2">
                      {autoTotal !== null && (
                        <span className="rounded-lg bg-[#2691C2]/10 px-2 py-0.5 text-[11px] font-black text-[#2691C2]">
                          إجمالي: {autoTotal}%
                        </span>
                      )}
                      {modal.showRubric
                        ? <ChevronUp className="h-4 w-4 text-slate-400" />
                        : <ChevronDown className="h-4 w-4 text-slate-400" />}
                    </div>
                  </button>

                  {modal.showRubric && (
                    <div className="mt-3 space-y-3">
                      {RUBRIC_CRITERIA.map((c) => (
                        <ScoreInput
                          key={c.key}
                          label={c.label}
                          hint={c.hint}
                          value={modal.rubric[c.key]}
                          onChange={(v) => updateRubric(c.key, v)}
                          disabled={saving}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Total oral score (auto-filled or manual) */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-black text-deepBlue/55">
                    الدرجة الإجمالية للمقابلة
                    {autoTotal !== null
                      ? <span className="mr-1 font-normal text-[#2691C2]">(محسوبة من المعايير)</span>
                      : <span className="mr-1 font-normal text-deepBlue/35">(0–100، اختياري)</span>}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={modal.oral_score}
                    onChange={(e) => setModal((m) => m ? { ...m, oral_score: e.target.value } : null)}
                    placeholder="مثال: 85"
                    dir="ltr"
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-deepBlue outline-none focus:border-[#2691C2] focus:ring-4 focus:ring-sky-100"
                  />
                </div>

                {/* Final level */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-black text-deepBlue/55">
                    المستوى النهائي <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={modal.final_level}
                    onChange={(e) => setModal((m) => m ? { ...m, final_level: e.target.value } : null)}
                    dir="rtl"
                    className="h-11 w-full appearance-none rounded-2xl border border-slate-200 bg-white pr-4 text-[13px] font-semibold text-deepBlue outline-none focus:border-[#2691C2] focus:ring-4 focus:ring-sky-100"
                  >
                    <option value="">اختر المستوى</option>
                    {PLACEMENT_LEVELS.map((lvl) => (
                      <option key={lvl.level} value={lvl.level}>{lvl.label} — {lvl.description}</option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-black text-deepBlue/55">
                    ملاحظات <span className="mr-1 font-normal text-deepBlue/35">(اختياري)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={modal.notes}
                    onChange={(e) => setModal((m) => m ? { ...m, notes: e.target.value } : null)}
                    placeholder="ملاحظات حول أداء الطالب..."
                    dir="rtl"
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-semibold text-deepBlue outline-none focus:border-[#2691C2] focus:ring-4 focus:ring-sky-100"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={!modal.final_level || saving}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#2691C2] px-4 py-3 text-[13px] font-black text-white transition hover:brightness-105 disabled:opacity-50"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {saving ? 'جاري الحفظ...' : 'اعتماد المستوى'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal(null)}
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
