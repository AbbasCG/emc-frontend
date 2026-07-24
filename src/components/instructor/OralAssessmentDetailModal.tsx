import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  CheckCircle2,
  Clock,
  History,
  Pencil,
  User,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { ClassAssignmentStudent } from '@/api/placementApi'
import { CEFR_MAP } from './InstructorStudentDrawer'
import { formatAmsterdamDMY, formatAmsterdamTime24 } from '@/utils/amsterdamTime'

type Props = {
  student: ClassAssignmentStudent | null
  courseId: number | null
  onClose: () => void
}

export function OralAssessmentDetailModal({ student, courseId, onClose }: Props) {
  const reduceMotion = useReducedMotion()
  const navigate = useNavigate()
  const assessment = student?.oral_assessment ?? null
  const finalCefr = assessment?.final_level ? (CEFR_MAP[assessment.final_level] ?? null) : null

  function handleEdit() {
    if (!courseId) return
    onClose()
    navigate(`/dashboard/instructor/courses/${courseId}/placement-students`)
  }

  return (
    <AnimatePresence>
      {student && assessment && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.15 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0F172A]/55 p-0 backdrop-blur-sm sm:p-4"
          dir="rtl"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`التقييم الكامل — ${student.student_name}`}
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.96, y: reduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.96, y: reduceMotion ? 0 : 8 }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 38 }}
            className="flex h-full w-full flex-col overflow-hidden bg-white shadow-[0_32px_80px_-20px_rgba(15,23,42,0.45)] sm:h-auto sm:max-h-[90vh] sm:w-[92vw] sm:max-w-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative shrink-0 overflow-hidden bg-gradient-to-l from-[#0C2A4B] to-[#1a2d44] px-5 py-4 text-white sm:px-6 sm:py-5">
              <div className="pointer-events-none absolute -left-4 top-0 h-24 w-24 rounded-full bg-[#F28C00]/20 blur-[45px]" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-[16px] font-black">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-black leading-tight">{student.student_name}</p>
                    <p className="mt-0.5 truncate text-[11px] font-semibold text-white/55">{student.student_email}</p>
                  </div>
                </div>
                <button type="button" onClick={onClose} aria-label="إغلاق"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/20 bg-white/10 text-white transition hover:bg-white/20">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
              <div className="space-y-4">

                {/* Overall result */}
                <Section title="النتيجة الإجمالية">
                  <div className="flex items-center gap-4">
                    <div className="rounded-2xl border border-[#0077B6]/25 bg-[#0077B6]/[0.06] px-4 py-3 text-center">
                      <p className="text-[9px] font-black uppercase tracking-widest text-[#0077B6]">درجة المقابلة</p>
                      <p className="mt-0.5 font-mono text-[22px] font-black tabular-nums text-[#0C2A4B]">
                        {assessment.oral_score ?? '—'}<span className="text-[12px] text-[#0C2A4B]/40">/{assessment.oral_score_max}</span>
                      </p>
                    </div>
                    {finalCefr && (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center">
                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">المستوى النهائي</p>
                        <p className="mt-0.5 text-[16px] font-black text-[#0C2A4B]">{finalCefr.cefr}</p>
                        <p className="text-[10px] font-semibold text-[#0C2A4B]/50">{finalCefr.arabic}</p>
                      </div>
                    )}
                    <span className="mr-auto flex items-center gap-1 rounded-xl bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" />
                      {assessment.system.approval_status === 'approved' ? 'معتمد' : 'قيد المراجعة'}
                    </span>
                  </div>
                </Section>

                {/* Rubric breakdown */}
                <Section title="معايير التقييم">
                  <div className="space-y-2.5">
                    {assessment.rubric.map((c) => {
                      const pct = c.score != null ? Math.round((c.score / c.max) * 100) : 0
                      return (
                        <div key={c.key}>
                          <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-[#0C2A4B]">
                            <span>{c.label}</span>
                            <span className="font-mono tabular-nums text-[#0C2A4B]/60">{c.score ?? '—'}/{c.max}</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <motion.div
                              className="h-full rounded-full bg-[#0077B6]"
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: reduceMotion ? 0 : 0.5 }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Section>

                {/* Interview info */}
                <Section title="معلومات المقابلة">
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    <InfoTile icon={<User className="h-3.5 w-3.5" />} label="اسم المقيّم" value={assessment.evaluator.name ?? '—'} />
                    <InfoTile icon={<Clock className="h-3.5 w-3.5" />} label="تاريخ المقابلة"
                      value={assessment.interview.starts_at ? formatAmsterdamDMY(assessment.interview.starts_at) : '—'} />
                    <InfoTile icon={<Clock className="h-3.5 w-3.5" />} label="مدة المقابلة"
                      value={assessment.interview.duration_minutes != null ? `${assessment.interview.duration_minutes} د` : '—'} />
                  </div>
                </Section>

                {/* Teacher notes */}
                {(assessment.notes.strengths || assessment.notes.weaknesses || assessment.notes.recommendations || assessment.notes.reason) && (
                  <Section title="ملاحظات المدرب">
                    <div className="space-y-2.5">
                      {assessment.notes.strengths && <NoteBlock label="نقاط القوة" text={assessment.notes.strengths} tone="emerald" />}
                      {assessment.notes.weaknesses && <NoteBlock label="نقاط تحتاج تحسين" text={assessment.notes.weaknesses} tone="amber" />}
                      {assessment.notes.recommendations && <NoteBlock label="التوصيات" text={assessment.notes.recommendations} tone="sky" />}
                      {assessment.notes.reason && <NoteBlock label="سبب تحديد المستوى" text={assessment.notes.reason} tone="slate" />}
                    </div>
                  </Section>
                )}

                {/* Edit history */}
                {assessment.history && (
                  <Section title="سجل التعديل">
                    <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5">
                      <History className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      <div className="min-w-0 flex-1 text-[11px] font-semibold text-amber-800">
                        <p>الدرجة السابقة: <span className="font-mono font-black">{assessment.history.previous_oral_score ?? '—'}</span> ·
                          المستوى السابق: <span className="font-black">{assessment.history.previous_final_level ?? '—'}</span></p>
                        <p className="mt-1 text-amber-700/70">
                          عدّله {assessment.history.edited_by ?? 'المدرب'}
                          {assessment.history.edited_at ? ` — ${formatAmsterdamDMY(assessment.history.edited_at)} ${formatAmsterdamTime24(assessment.history.edited_at)}` : ''}
                        </p>
                      </div>
                    </div>
                  </Section>
                )}

                {/* System info */}
                <Section title="معلومات النظام">
                  <div className="grid grid-cols-2 gap-2.5">
                    <InfoTile icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="اعتمده"
                      value={assessment.evaluator.name ?? '—'} />
                    <InfoTile icon={<Clock className="h-3.5 w-3.5" />} label="تاريخ التقييم"
                      value={assessment.system.evaluated_at ? formatAmsterdamDMY(assessment.system.evaluated_at) : '—'} />
                    <InfoTile icon={<Clock className="h-3.5 w-3.5" />} label="آخر تعديل"
                      value={assessment.system.last_modified ? formatAmsterdamDMY(assessment.system.last_modified) : '—'} />
                  </div>
                </Section>
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 sm:px-6">
              <button type="button" onClick={handleEdit}
                className="flex items-center gap-1.5 rounded-xl bg-[#0C2A4B] px-4 py-2 text-[12px] font-black text-white transition hover:brightness-110">
                <Pencil className="h-3.5 w-3.5" />
                تعديل التقييم
              </button>
              <button type="button" onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2 text-[12px] font-black text-deepBlue/60 transition hover:bg-slate-50">
                إغلاق
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5">
      <p className="mb-2.5 text-[10px] font-black uppercase tracking-widest text-deepBlue/35">{title}</p>
      {children}
    </div>
  )
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-2.5 ring-1 ring-black/5">
      <div className="flex items-center gap-1.5 text-[9px] font-black text-deepBlue/40">
        {icon}
        {label}
      </div>
      <p className="mt-1 truncate text-[11px] font-black text-[#0C2A4B]">{value}</p>
    </div>
  )
}

function NoteBlock({ label, text, tone }: { label: string; text: string; tone: 'emerald' | 'amber' | 'sky' | 'slate' }) {
  const cls = {
    emerald: 'border-emerald-200 bg-emerald-50/60 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50/60 text-amber-700',
    sky: 'border-sky-200 bg-sky-50/60 text-sky-700',
    slate: 'border-slate-200 bg-white text-deepBlue/60',
  }[tone]
  return (
    <div className={`rounded-xl border p-3 ${cls}`}>
      <p className="mb-1 text-[9px] font-black uppercase tracking-widest opacity-70">{label}</p>
      <p className="text-[12px] font-semibold leading-relaxed text-[#0C2A4B]/85">{text}</p>
    </div>
  )
}
