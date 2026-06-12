import { motion } from 'framer-motion'
import { CheckCircle2, ClipboardList } from 'lucide-react'
import type { StudentAssignment } from '@/types/lms'
import { formatDateTime } from '@/utils/dateTime'
import LmsStatusBadge from './LmsStatusBadge'

type Props = {
  assignment: StudentAssignment
  onSubmit?: () => void
}

const STATUS_SUBMITTED: StudentAssignment['status'][] = ['submitted', 'graded']

export default function AssignmentCard({ assignment, onSubmit }: Props) {
  const canSubmit =
    (assignment.status === 'pending' || assignment.status === 'revision' || assignment.status === 'late') &&
    !STATUS_SUBMITTED.includes(assignment.status)

  const dueLabel = assignment.due_at ? formatDateTime(assignment.due_at) : null
  const submittedLabel = assignment.submitted_at ? formatDateTime(assignment.submitted_at) : null

  return (
    <motion.div
      layout
      className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-deepBlue/[0.06]"
    >
      <div className="flex flex-col gap-4 text-right sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center justify-start gap-2">
            <LmsStatusBadge status={assignment.status} kind="assignment" />
            {dueLabel && (
              <span className="text-[11px] font-bold text-slate-500">التسليم: {dueLabel}</span>
            )}
            {submittedLabel && STATUS_SUBMITTED.includes(assignment.status) && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                تم التسليم: {submittedLabel}
              </span>
            )}
          </div>
          <h3 className="flex items-start justify-start gap-2 text-base font-black text-deepBlue">
            <ClipboardList size={18} className="mt-0.5 shrink-0 text-customOrange" />
            {assignment.title}
          </h3>
          {assignment.course_name && (
            <p className="text-xs font-bold text-slate-500">{assignment.course_name}</p>
          )}
          {assignment.score != null && assignment.max_score != null && (
            <p className="text-sm font-black text-customBlue">
              الدرجة: {assignment.score} / {assignment.max_score}
            </p>
          )}
          {assignment.feedback && (
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-100">
              <span className="text-xs font-black text-deepBlue">ملاحظات المدرب: </span>
              {assignment.feedback}
            </div>
          )}
        </div>
        {canSubmit && onSubmit && (
          <button
            type="button"
            onClick={onSubmit}
            className="shrink-0 rounded-xl bg-customOrange px-5 py-2.5 text-xs font-black text-white shadow-md shadow-orange-100 transition hover:opacity-95"
          >
            تسليم الواجب
          </button>
        )}
        {!canSubmit && STATUS_SUBMITTED.includes(assignment.status) && (
          <span className="shrink-0 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-[11px] font-black text-emerald-800">
            مُسلَّم
          </span>
        )}
      </div>
    </motion.div>
  )
}
