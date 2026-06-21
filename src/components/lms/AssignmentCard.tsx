import { motion } from 'framer-motion'
import { CheckCircle2, ClipboardList, RefreshCw } from 'lucide-react'
import type { StudentAssignment } from '@/types/lms'
import { formatDateTime } from '@/utils/dateTime'
import { isNeedsResubmission } from '@/utils/lmsAssignment'
import LmsStatusBadge from './LmsStatusBadge'

type Props = {
  assignment: StudentAssignment
  onSubmit?: () => void
}

const STATUS_SUBMITTED: StudentAssignment['status'][] = ['submitted', 'graded']

export default function AssignmentCard({ assignment, onSubmit }: Props) {
  const needsResub = isNeedsResubmission(assignment.status)
  const canSubmit =
    needsResub ||
    assignment.status === 'pending' ||
    assignment.status === 'revision' ||
    assignment.status === 'late'

  const trulySubmitted =
    STATUS_SUBMITTED.includes(assignment.status) && !needsResub

  const dueLabel = assignment.due_at ? formatDateTime(assignment.due_at) : null
  const submittedLabel = assignment.submitted_at ? formatDateTime(assignment.submitted_at) : null

  return (
    <motion.div
      layout
      className="rounded-2xl border border-[#0C2A4B]/[0.06] bg-white p-4 shadow-sm transition hover:border-[#0077B6]/20 sm:p-5"
    >
      <div className="flex flex-col gap-3 text-right sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center justify-start gap-2">
            <LmsStatusBadge status={assignment.status} kind="assignment" />
            {dueLabel && (
              <span className="text-[10px] font-semibold text-slate-500">التسليم: {dueLabel}</span>
            )}
            {submittedLabel && trulySubmitted && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                تم التسليم: {submittedLabel}
              </span>
            )}
          </div>
          <h3 className="flex items-start justify-start gap-2 text-[14px] font-bold text-[#0F172A] sm:text-[15px]">
            <ClipboardList size={17} className="mt-0.5 shrink-0 text-[#F28C00]" />
            {assignment.title}
          </h3>
          {assignment.score != null && assignment.max_score != null && (
            <p className="text-[12px] font-bold tabular-nums text-[#0077B6]">
              الدرجة: {assignment.score} / {assignment.max_score}
            </p>
          )}
          {assignment.feedback && (
            <div className="rounded-xl bg-[#F8FAFC] px-3 py-2 text-[12px] font-medium leading-relaxed text-[#0F172A]/80 ring-1 ring-[#0C2A4B]/[0.06]">
              <span className="text-[10px] font-bold text-[#0C2A4B]/60">ملاحظات المدرب: </span>
              {assignment.feedback}
            </div>
          )}
        </div>

        {canSubmit && onSubmit && (
          <button
            type="button"
            onClick={onSubmit}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[11px] font-bold text-white shadow-sm transition hover:brightness-105 ${
              needsResub ? 'bg-orange-500' : 'bg-[#F28C00]'
            }`}
          >
            {needsResub && <RefreshCw size={13} aria-hidden />}
            {needsResub ? 'إعادة تسليم الواجب' : 'تسليم الواجب'}
          </button>
        )}

        {trulySubmitted && (
          <span className="shrink-0 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-800">
            مُسلَّم
          </span>
        )}
      </div>
    </motion.div>
  )
}
