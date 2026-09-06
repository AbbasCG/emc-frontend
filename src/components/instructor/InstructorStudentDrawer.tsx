import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Award, CheckCircle2, ClipboardCheck, ExternalLink, Layers, Mic, X } from 'lucide-react'
import { Link } from 'react-router'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { progressFromStatus } from '@/api/placementApi'
import type { InstructorStudentRow } from '@/api/instructorApi'
import { CEFR_MAP, toDMY, toHM } from './instructorStudentFormats'

const ENROLL_AR: Record<string, string> = {
  active: 'نشط', inactive: 'غير نشط', completed: 'مكتمل', pending: 'بانتظار', approved: 'مقبول',
}
const ENROLL_CLR: Record<string, string> = {
  active:    'bg-emerald-100 text-emerald-700',
  completed: 'bg-sky-100 text-sky-700',
  pending:   'bg-amber-100 text-amber-700',
  approved:  'bg-emerald-100 text-emerald-700',
  inactive:  'bg-slate-100 text-slate-500',
}

const TIMELINE_STEPS = [
  'الاختبار الكتابي',
  'حجز المقابلة',
  'المقابلة الشفوية',
  'اعتماد المستوى',
  'الوصول للدورة',
]

/* ── Props ──────────────────────────────────────────────────────────────── */

interface Props {
  student: InstructorStudentRow | null
  onClose: () => void
  /** When provided, a "Start oral assessment" CTA appears for eligible students */
  onStartAssessment?: () => void
  /** When provided, a "View Test Answers" button opens the full answer-review modal. */
  onViewAnswers?: () => void
}

/* ── Exported drawer wrapper ────────────────────────────────────────────── */

export function InstructorStudentDrawer({ student, onClose, onStartAssessment, onViewAnswers }: Props) {
  const panelRef = useRef<HTMLElement | null>(null)

  useFocusTrap(panelRef, { active: Boolean(student), onEscape: onClose })

  // Rendered via a portal directly under document.body — the previous
  // in-tree placement (nested under <main>) meant it shared a stacking
  // context with page content, so the dashboard header's own `isolate` +
  // equal z-index could paint above it despite `fixed` positioning. A
  // portal removes the ambiguity outright; the z-index bump is just a
  // second guarantee, not the actual fix.
  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {student && (
        <motion.div
          key="student-drawer-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[60] overflow-hidden"
          dir="rtl"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer panel */}
          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="تفاصيل الطالب"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 42 }}
            className="absolute inset-y-0 left-0 flex w-full max-w-[480px] flex-col overflow-hidden bg-white shadow-[0_0_80px_-10px_rgba(15,23,42,0.45)]"
            onClick={(e) => e.stopPropagation()}
          >
            <DrawerContent
              student={student}
              onClose={onClose}
              onStartAssessment={onStartAssessment}
              onViewAnswers={onViewAnswers}
            />
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/* ── Drawer body ────────────────────────────────────────────────────────── */

function DrawerContent({
  student: s,
  onClose,
  onStartAssessment,
  onViewAnswers,
}: {
  student: InstructorStudentRow
  onClose: () => void
  onStartAssessment?: () => void
  onViewAnswers?: () => void
}) {
  const progress  = progressFromStatus(s.placement_status)
  const cefrInfo  = s.written_level ? (CEFR_MAP[s.written_level] ?? null) : null
  const finalCefr = s.final_level   ? (CEFR_MAP[s.final_level]   ?? null) : null
  const pct =
    s.written_score != null && (s.total_questions ?? 70) > 0
      ? Math.round((s.written_score / (s.total_questions ?? 70)) * 100)
      : null
  const oralTime  = toHM(s.oral_booking_at)
  const enrollKey = (s.enrollment_status ?? '').toLowerCase()

  return (
    <>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="relative flex shrink-0 items-center gap-4 overflow-hidden bg-gradient-to-l from-[#0C2A4B] to-[#1a2d44] px-5 py-5 text-white">
        <div className="pointer-events-none absolute -left-6 top-0 h-28 w-28 rounded-full bg-[#F28C00]/20 blur-[50px]" />

        {/* Avatar */}
        {s.avatar_url ? (
          <img
            src={s.avatar_url}
            alt={s.name}
            className="relative h-12 w-12 shrink-0 rounded-2xl object-cover"
          />
        ) : (
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-[18px] font-black">
            {s.name.charAt(0)}
          </div>
        )}

        {/* Name / email / status */}
        <div className="relative min-w-0 flex-1">
          <p className="text-[15px] font-black leading-tight">{s.name}</p>
          <p className="mt-0.5 text-[11px] font-semibold text-white/55">{s.email}</p>
          {s.enrollment_status && (
            <span
              className={`mt-1.5 inline-block rounded-xl px-2 py-0.5 text-[9px] font-black
                ${ENROLL_CLR[enrollKey] ?? 'bg-white/15 text-white'}`}
            >
              {ENROLL_AR[enrollKey] ?? s.enrollment_status}
            </span>
          )}
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="relative grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
          aria-label="إغلاق"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Scrollable body ────────────────────────────────────────────── */}
      <div className="flex-1 space-y-4 overflow-y-auto p-5">

        {/* Course info */}
        {s.course_title && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-deepBlue/35">الدورة المسجّل بها</p>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <p className="min-w-0 flex-1 truncate text-[13px] font-black text-deepBlue">{s.course_title}</p>
              {s.course_id && (
                <Link
                  to={`/dashboard/instructor/courses/${s.course_id}/placement-students`}
                  className="flex shrink-0 items-center gap-1 rounded-xl bg-[#0077B6]/[0.08] px-2.5 py-1 text-[10px] font-black text-[#0077B6] transition hover:bg-[#0077B6]/[0.15]"
                  onClick={onClose}
                >
                  <ExternalLink className="h-3 w-3" />
                  نتائج المستوى
                </Link>
              )}
            </div>
            {s.enrolled_at && (
              <p className="mt-1 text-[10px] font-semibold text-deepBlue/35">
                تاريخ التسجيل: {toDMY(s.enrolled_at)}
              </p>
            )}
          </div>
        )}

        {/* Placement timeline */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-deepBlue/35">
            مراحل تحديد المستوى
          </p>
          <div className="space-y-2.5">
            {([
              progress.written_done,
              progress.oral_booked,
              progress.oral_done,
              progress.level_approved,
              progress.can_start,
            ] as const).map((isDone, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-black transition
                    ${isDone
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-slate-200 bg-white text-slate-400'}`}
                >
                  {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
                </div>
                <span className={`flex-1 text-[12px] font-semibold ${isDone ? 'text-deepBlue' : 'text-deepBlue/35'}`}>
                  {TIMELINE_STEPS[idx]}
                </span>
                <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${isDone ? 'bg-emerald-400' : 'bg-slate-200'}`} />
              </div>
            ))}
          </div>
        </div>

        {/* Written test result */}
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-deepBlue/35">
            الاختبار الكتابي
          </p>
          {s.written_score != null ? (
            <div className="space-y-2.5 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-700/70">الدرجة</span>
                <span className="font-mono text-[20px] font-black tabular-nums text-deepBlue">
                  {s.written_score}
                  <span className="text-[12px] font-semibold text-deepBlue/40">/{s.total_questions ?? 70}</span>
                </span>
              </div>
              {pct != null && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-emerald-700/70">النسبة</span>
                  <span className="font-mono text-[13px] font-black tabular-nums text-deepBlue/70">{pct}%</span>
                </div>
              )}
              {cefrInfo && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-emerald-700/70">المستوى التقديري</span>
                  <span className={`rounded-xl px-2.5 py-1 text-[11px] font-black ${cefrInfo.bg} ${cefrInfo.text}`}>
                    {cefrInfo.cefr} · {cefrInfo.arabic}
                  </span>
                </div>
              )}
              {pct != null && (
                <div className="h-1.5 overflow-hidden rounded-full bg-emerald-100">
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-6 text-center">
              <ClipboardCheck className="mx-auto h-6 w-6 text-slate-300" />
              <p className="mt-2 text-[11px] font-semibold text-deepBlue/35">لم يُكمل الاختبار الكتابي بعد</p>
            </div>
          )}
        </div>

        {/* Written test answers opens the full review modal (see PlacementAnswerReviewModal) */}
        {s.attempt_id != null && s.written_score != null && onViewAnswers && (
          <button
            type="button"
            onClick={onViewAnswers}
            className="flex w-full items-center justify-between rounded-2xl border border-[#0077B6]/25 bg-[#0077B6]/[0.06] px-4 py-3 transition hover:bg-[#0077B6]/[0.12]"
          >
            <span className="text-[12px] font-black text-[#0077B6]">عرض إجابات الاختبار</span>
            <ClipboardCheck className="h-4 w-4 text-[#0077B6]" />
          </button>
        )}

        {/* Oral interview */}
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-deepBlue/35">
            المقابلة الشفوية
          </p>
          {s.oral_booking_at ? (
            <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                  <Mic className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-black text-deepBlue">
                    {progress.oral_done ? 'تمت المقابلة' : 'موعد محجوز'}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] font-semibold tabular-nums text-deepBlue/55">
                    {toDMY(s.oral_booking_at)}
                    {oralTime ? ` · ${oralTime}` : ''}
                  </p>
                  {s.oral_score != null && (
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-violet-600/70">درجة المقابلة</span>
                      <span className="font-mono text-[16px] font-black tabular-nums text-deepBlue">
                        {s.oral_score}
                        <span className="text-[10px] font-semibold text-deepBlue/40">/100</span>
                      </span>
                    </div>
                  )}
                  {s.instructor_notes && (
                    <div className="mt-2 rounded-xl border border-violet-100 bg-violet-50 px-3 py-2">
                      <p className="mb-0.5 text-[9px] font-black uppercase tracking-widest text-violet-500">ملاحظات المدرّب</p>
                      <p className="text-[11px] font-semibold leading-relaxed text-deepBlue/70">{s.instructor_notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-6 text-center">
              <Mic className="mx-auto h-6 w-6 text-slate-300" />
              <p className="mt-2 text-[11px] font-semibold text-deepBlue/35">
                {progress.written_done && !progress.oral_booked
                  ? 'بانتظار حجز موعد المقابلة من الطالب'
                  : 'لا يوجد موعد مقابلة'}
              </p>
            </div>
          )}
        </div>

        {/* Final level */}
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-deepBlue/35">
            المستوى النهائي
          </p>
          {s.final_level ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-md">
                  <Award className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  {finalCefr ? (
                    <>
                      <p className="font-mono text-[18px] font-black leading-tight text-deepBlue">{finalCefr.cefr}</p>
                      <p className="text-[11px] font-semibold text-deepBlue/55">{finalCefr.arabic}</p>
                    </>
                  ) : (
                    <p className="font-mono text-[14px] font-black text-deepBlue">{s.final_level}</p>
                  )}
                </div>
                <span className="flex items-center gap-1 rounded-xl bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" />
                  معتمد
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-6 text-center">
              <Award className="mx-auto h-6 w-6 text-slate-300" />
              <p className="mt-2 text-[11px] font-semibold text-deepBlue/35">لم يُعتمد المستوى النهائي بعد</p>
            </div>
          )}
        </div>

        {/* Class assignment */}
        {s.final_level && (
          <div>
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-deepBlue/35">
              الفصل الدراسي
            </p>
            {s.class_assignment?.status === 'assigned' ? (
              <div className="rounded-2xl border border-[#0077B6]/25 bg-[#0077B6]/[0.06] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0077B6] text-white shadow-md">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-[14px] font-black text-deepBlue">{s.class_assignment.class_name}</p>
                    {s.class_assignment.instructor_name && (
                      <p className="text-[11px] font-semibold text-deepBlue/55">المدرّب: {s.class_assignment.instructor_name}</p>
                    )}
                  </div>
                  <span className="flex items-center gap-1 rounded-xl bg-[#0077B6]/15 px-2.5 py-1 text-[10px] font-black text-[#0077B6]">
                    <CheckCircle2 className="h-3 w-3" />
                    تم التوزيع
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/50 py-6 text-center">
                <Layers className="mx-auto h-6 w-6 text-amber-400" />
                <p className="mt-2 text-[11px] font-semibold text-amber-700">بانتظار التوزيع على فصل</p>
              </div>
            )}
          </div>
        )}

        {/* CTAs */}
        {onStartAssessment && progress.oral_booked && (
          <button
            type="button"
            onClick={onStartAssessment}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0077B6] px-4 py-3 text-[13px] font-black text-white transition hover:brightness-105"
          >
            <Mic className="h-4 w-4" />
            {progress.level_approved ? 'تعديل التقييم الشفوي' : 'بدء التقييم الشفوي'}
          </button>
        )}

        {!onStartAssessment && s.course_id && progress.oral_booked && (
          <Link
            to={`/dashboard/instructor/courses/${s.course_id}/placement-students`}
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0077B6] px-4 py-3 text-[13px] font-black text-white transition hover:brightness-105"
          >
            <Mic className="h-4 w-4" />
            {progress.level_approved ? 'تعديل التقييم الشفوي' : 'انتقل إلى التقييم الشفوي'}
          </Link>
        )}

      </div>
    </>
  )
}
