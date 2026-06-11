import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle,
  MessageSquare,
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
import type { InstructorStudentRow } from '@/api/instructorApi'
import toast from '@/lib/toast'
import { InstructorHero, InstructorStudentCard, InstructorStudentDrawer } from '@/components/instructor'

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
  }
}

/* ── Modal state ─────────────────────────────────────────────────────────── */

type ModalState = {
  row: InstructorOralAssessment
  final_level: string
  oral_score: string
  notes: string
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
    })
    setDrawerRow(null)
  }

  async function handleSave() {
    if (!modal) return
    setSaving(true)
    try {
      await completeOralAssessment(modal.row.id, {
        final_level: LEVEL_TO_CEFR[modal.final_level] ?? modal.final_level,
        ...(modal.oral_score ? { oral_score: Number(modal.oral_score) } : {}),
        ...(modal.notes.trim() ? { instructor_notes: modal.notes.trim() } : {}),
      })
      toast.success('تم حفظ نتيجة التقييم')
      const savedScore = modal.oral_score ? Number(modal.oral_score) : null
      const savedLevel = modal.final_level
      const savedNotes = modal.notes.trim() || null
      setRows((prev) => prev.map((r) =>
        r.id === modal.row.id
          ? { ...r, oral_score: savedScore, final_level: savedLevel, instructor_notes: savedNotes, status: 'oral_completed' as PlacementStatus }
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

  const canAssess = (s: PlacementStatus) =>
    s === 'oral_booked' || s === 'oral_completed' || s === 'completed'

  const stats = [
    { label: 'إجمالي المقابلات', count: rows.length },
    { label: 'محجوزة',           count: rows.filter((r) => r.status === 'oral_booked').length },
    { label: 'مكتملة',           count: rows.filter((r) => r.status === 'oral_completed' || r.status === 'completed').length },
  ]

  const drawerStudent = drawerRow ? toStudentRow(drawerRow) : null

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
              assessLabel={row.status === 'completed' ? 'تعديل' : 'إتمام التقييم'}
              assessed={row.status === 'completed'}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl"
            >
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <h2 className="text-[17px] font-black text-deepBlue">إتمام التقييم الشفوي</h2>
                  <p className="mt-0.5 text-[12px] font-semibold text-deepBlue/50">{modal.row.student_name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100"
                >
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

              <div className="mb-4">
                <label className="mb-1.5 block text-[11px] font-black text-deepBlue/55">
                  درجة المقابلة الشفوية
                  <span className="mr-1 font-normal text-deepBlue/35">(اختياري، 0–100)</span>
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

              <div className="mb-6">
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
