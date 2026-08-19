import { motion } from 'framer-motion'
import {
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Layers,
  Mic,
  User,
} from 'lucide-react'
import { Link } from 'react-router'
import type { InstructorStudentRow } from '@/api/instructorApi'
import { CEFR_MAP, toDMY } from './instructorStudentFormats'

/* ── Label maps ─────────────────────────────────────────────────────────── */

const PLACEMENT_AR: Record<string, string> = {
  not_started:        'لم يبدأ',
  placement_required: 'مطلوب',
  in_progress:        'جارٍ',
  written_submitted:  'كتابي مكتمل',
  oral_booked:        'مقابلة محجوزة',
  oral_completed:     'مقابلة منتهية',
  completed:          'مستوى معتمد',
}
const PLACEMENT_CLR: Record<string, string> = {
  not_started:        'bg-slate-100 text-slate-500',
  in_progress:        'bg-amber-100 text-amber-700',
  written_submitted:  'bg-sky-100 text-sky-700',
  oral_booked:        'bg-violet-100 text-violet-700',
  oral_completed:     'bg-purple-100 text-purple-700',
  completed:          'bg-emerald-100 text-emerald-700',
}
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

/* ── Props ──────────────────────────────────────────────────────────────── */

interface Props {
  student: InstructorStudentRow
  index: number
  onClick: () => void
  onAssess?: () => void
  assessLabel?: string
  assessed?: boolean
  /** When true (or undefined), show placement test data (written score, oral, final level).
   *  When false, show normal enrollment data without placement UI. */
  showPlacement?: boolean
  /** When provided (and a written attempt exists), shows a "View Test Answers" button. */
  onViewAnswers?: () => void
}

/* ── Component ──────────────────────────────────────────────────────────── */

export function InstructorStudentCard({
  student: s,
  index,
  onClick,
  onAssess,
  assessLabel = 'إتمام التقييم',
  assessed = false,
  showPlacement = true,
  onViewAnswers,
}: Props) {
  const pct = s.written_score != null && (s.total_questions ?? 70) > 0
    ? Math.round((s.written_score / (s.total_questions ?? 70)) * 100)
    : null
  const cefrInfo  = s.written_level ? (CEFR_MAP[s.written_level]  ?? null) : null
  const finalCefr = s.final_level   ? (CEFR_MAP[s.final_level]    ?? null) : null
  const placementKey = (s.placement_status ?? '').toLowerCase()
  const enrollKey    = (s.enrollment_status ?? '').toLowerCase()

  const courseLink = s.course_id
    ? showPlacement
      ? `/dashboard/instructor/courses/${s.course_id}/placement-students`
      : `/dashboard/instructor/courses/${s.course_id}/students`
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      className="group flex w-full max-w-[520px] cursor-pointer flex-col gap-2.5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#0077B6]/30 hover:shadow-md"
      onClick={onClick}
    >
      {/* Header: avatar + name + badges */}
      <div className="flex items-start gap-3">
        {s.avatar_url ? (
          <img
            src={s.avatar_url}
            alt={s.name}
            className="h-10 w-10 shrink-0 rounded-2xl object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-bl from-[#0C2A4B]/90 to-[#0077B6] text-[14px] font-black text-white">
            {s.name.charAt(0)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-black text-[#0C2A4B]">{s.name}</p>
          <p className="truncate text-[10px] font-semibold text-[#0C2A4B]/40" dir="ltr">{s.email}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {enrollKey && !['active', 'approved'].includes(enrollKey) && s.enrollment_status && (
            <span className={`rounded-xl px-2 py-0.5 text-[9px] font-black ${ENROLL_CLR[enrollKey] ?? 'bg-slate-100 text-slate-500'}`}>
              {ENROLL_AR[enrollKey] ?? s.enrollment_status}
            </span>
          )}
          {showPlacement && placementKey && placementKey !== 'not_started' && (
            <span className={`rounded-xl px-2 py-0.5 text-[9px] font-black ${PLACEMENT_CLR[placementKey] ?? 'bg-slate-100 text-slate-500'}`}>
              {PLACEMENT_AR[placementKey] ?? placementKey}
            </span>
          )}
        </div>
      </div>

      {/* Course link routes to correct page based on placement requirement */}
      {s.course_title && (
        courseLink ? (
          <Link
            to={courseLink}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 truncate text-[11px] font-black text-[#0077B6] transition hover:underline"
          >
            <BookOpen className="h-3 w-3 shrink-0" />
            {s.course_title}
          </Link>
        ) : (
          <p className="flex items-center gap-1 truncate text-[11px] font-semibold text-[#0C2A4B]/40">
            <BookOpen className="h-3 w-3 shrink-0" />
            {s.course_title}
          </p>
        )
      )}

      {/* ── Placement mode: written score + oral + level ─────────────── */}
      {showPlacement && (
        <>
          {s.written_score != null && (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-2">
              <ClipboardCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span className="font-mono text-[13px] font-black tabular-nums text-[#0C2A4B]">
                {s.written_score}<span className="text-[10px] text-[#0C2A4B]/40">/{s.total_questions ?? 70}</span>
              </span>
              {pct != null && (
                <span className="rounded-lg bg-emerald-100 px-1.5 py-0.5 font-mono text-[9px] font-black text-emerald-700">{pct}%</span>
              )}
              {cefrInfo && (
                <span className="mr-auto font-mono text-[10px] font-black text-[#0C2A4B]">
                  {cefrInfo.cefr} <span className="font-normal text-[#0C2A4B]/40">· {cefrInfo.arabic}</span>
                </span>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-1.5">
            {s.oral_booking_at && (
              <span className="flex items-center gap-1 rounded-xl bg-violet-50 px-2 py-1 text-[9px] font-black text-violet-600">
                <Mic className="h-3 w-3" />
                {toDMY(s.oral_booking_at)}
              </span>
            )}
            {s.oral_score != null && (
              <span className="flex items-center gap-1 rounded-xl bg-violet-100 px-2 py-1 text-[9px] font-black text-violet-700">
                <Mic className="h-3 w-3" />
                {s.oral_score}/100
              </span>
            )}
            {s.final_level && (
              <span className="flex items-center gap-1 rounded-xl bg-emerald-50 px-2 py-1 text-[9px] font-black text-emerald-700">
                <Award className="h-3 w-3" />
                {finalCefr ? `${finalCefr.cefr} · ${finalCefr.arabic}` : s.final_level}
                <CheckCircle2 className="h-3 w-3" />
              </span>
            )}
            {s.enrolled_at && !s.oral_booking_at && !s.final_level && (
              <span className="font-mono text-[9px] font-semibold tabular-nums text-[#0C2A4B]/30">
                {toDMY(s.enrolled_at)}
              </span>
            )}
            {onAssess && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onAssess() }}
                className={`mr-auto rounded-xl border px-2.5 py-1 text-[10px] font-black transition ${
                  assessed
                    ? 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                    : 'border-[#0077B6]/30 bg-[#0077B6]/[0.07] text-[#0077B6] hover:bg-[#0077B6]/[0.14]'
                }`}
              >
                {assessed ? 'تعديل' : assessLabel}
              </button>
            )}
          </div>

          {/* Class assignment visible whenever the student has at least reached final approval */}
          {s.final_level && s.class_assignment && (
            s.class_assignment.status === 'assigned' ? (
              <div className="flex items-center gap-1.5 rounded-2xl border border-[#0077B6]/20 bg-[#0077B6]/[0.06] px-3 py-2">
                <Layers className="h-3.5 w-3.5 shrink-0 text-[#0077B6]" />
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-black text-[#0077B6]">تم التوزيع</p>
                  <p className="truncate text-[11px] font-black text-[#0C2A4B]">{s.class_assignment.class_name}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-2xl border border-amber-200 bg-amber-50/70 px-3 py-2">
                <Layers className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                <p className="text-[10px] font-black text-amber-700">بانتظار التوزيع على فصل</p>
              </div>
            )
          )}

          {onViewAnswers && s.written_score != null && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onViewAnswers() }}
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-[#0C2A4B]/10 bg-[#0C2A4B]/[0.03] py-2 text-[11px] font-black text-[#0C2A4B] transition hover:bg-[#0C2A4B]/[0.08]"
            >
              <ClipboardCheck className="h-3.5 w-3.5" />
              عرض إجابات الاختبار
            </button>
          )}
        </>
      )}

      {/* ── Normal mode: enrollment info without placement data ───────── */}
      {!showPlacement && (
        <div className="flex flex-wrap items-center gap-1.5">
          {s.enrollment_status && (
            <span className={`rounded-xl px-2 py-1 text-[9px] font-black ${ENROLL_CLR[enrollKey] ?? 'bg-slate-100 text-slate-500'}`}>
              {ENROLL_AR[enrollKey] ?? s.enrollment_status}
            </span>
          )}
          {s.enrolled_at && (
            <span className="flex items-center gap-1 text-[9px] font-semibold text-[#0C2A4B]/40">
              <User className="h-3 w-3" />
              {toDMY(s.enrolled_at)}
            </span>
          )}
          {onAssess && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onAssess() }}
              className="mr-auto rounded-xl border border-[#0077B6]/30 bg-[#0077B6]/[0.07] px-2.5 py-1 text-[10px] font-black text-[#0077B6] transition hover:bg-[#0077B6]/[0.14]"
            >
              {assessLabel}
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}
