import { motion } from 'framer-motion'
import { AlertCircle, AlertTriangle, CheckCircle2, ClipboardList, Clock, RefreshCw, Star } from 'lucide-react'
import type { StudentAssignment } from '@/types/lms'
import { formatLmsDateTime } from '@/components/lms/lmsFormatters'
import { isNeedsResubmission } from '@/utils/lmsAssignment'

type Props = {
  assignment: StudentAssignment
  onSubmit?: () => void
}

const STATUS_SUBMITTED: StudentAssignment['status'][] = ['submitted', 'graded']

function isOverdue(dueAt: string | null | undefined, status: StudentAssignment['status']): boolean {
  if (!dueAt) return false
  if (STATUS_SUBMITTED.includes(status)) return false
  return new Date(dueAt).getTime() < Date.now()
}

function isDueSoon(dueAt: string | null | undefined, status: StudentAssignment['status']): boolean {
  if (!dueAt) return false
  if (STATUS_SUBMITTED.includes(status)) return false
  const ms = new Date(dueAt).getTime() - Date.now()
  return ms > 0 && ms < 24 * 60 * 60 * 1000
}

function statusLabel(status: StudentAssignment['status'], overdue: boolean): string {
  if (STATUS_SUBMITTED.includes(status) && !isNeedsResubmission(status)) return 'تم التسليم'
  if (status === 'graded') return 'مُقيَّم'
  if (overdue || status === 'late') return 'متأخر'
  if (isNeedsResubmission(status)) return 'إعادة تسليم'
  return 'مطلوب'
}

function statusColors(status: StudentAssignment['status'], overdue: boolean): string {
  if (status === 'graded') return 'bg-blue-50 text-blue-700 border-blue-200'
  if (STATUS_SUBMITTED.includes(status) && !isNeedsResubmission(status)) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (overdue || status === 'late') return 'bg-red-50 text-red-700 border-red-200'
  if (isNeedsResubmission(status)) return 'bg-orange-50 text-orange-700 border-orange-200'
  return 'bg-[#2691C2]/8 text-[#1a6fa0] border-[#2691C2]/20'
}

function statusIcon(status: StudentAssignment['status'], overdue: boolean) {
  if (status === 'graded') return <Star className="h-3 w-3" />
  if (STATUS_SUBMITTED.includes(status) && !isNeedsResubmission(status)) return <CheckCircle2 className="h-3 w-3" />
  if (overdue || status === 'late') return <AlertCircle className="h-3 w-3" />
  if (isNeedsResubmission(status)) return <RefreshCw className="h-3 w-3" />
  return <ClipboardList className="h-3 w-3" />
}

export default function AssignmentCard({ assignment, onSubmit }: Props) {
  const needsResub = isNeedsResubmission(assignment.status)
  const canSubmit = needsResub || assignment.status === 'pending' || assignment.status === 'revision' || assignment.status === 'late'
  const trulySubmitted = STATUS_SUBMITTED.includes(assignment.status) && !needsResub
  const overdue = isOverdue(assignment.due_at, assignment.status)
  const dueSoon = isDueSoon(assignment.due_at, assignment.status)

  const dueLabel = formatLmsDateTime(assignment.due_at ?? null)
  const submittedLabel = formatLmsDateTime(assignment.submitted_at ?? null)

  return (
    <motion.div
      layout
      className={`flex flex-col gap-4 rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md ${
        overdue
          ? 'border-red-200/70 ring-1 ring-red-100'
          : dueSoon
            ? 'border-amber-200/70 ring-1 ring-amber-100'
            : 'border-[#22334A]/[0.07] hover:border-[#2691C2]/25'
      }`}
    >
      {/* Header row: status + urgency badges */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black ${statusColors(assignment.status, overdue)}`}>
          {statusIcon(assignment.status, overdue)}
          {statusLabel(assignment.status, overdue)}
        </span>

        {dueSoon && !trulySubmitted && (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700">
            <AlertTriangle className="h-3 w-3" />
            اقترب الموعد
          </span>
        )}
      </div>

      {/* Title */}
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#EC943C]/12 text-[#EC943C]">
          <ClipboardList className="h-4 w-4" />
        </span>
        <h3 className="flex-1 text-[15px] font-black leading-snug text-[#0F172A]">
          {assignment.title}
        </h3>
      </div>

      {/* Deadline */}
      {dueLabel !== '—' && (
        <div className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 ${
          overdue
            ? 'border-red-200/60 bg-red-50/60'
            : dueSoon
              ? 'border-amber-200/60 bg-amber-50/60'
              : 'border-[#22334A]/[0.07] bg-slate-50/70'
        }`}>
          <Clock className={`h-4 w-4 shrink-0 ${overdue ? 'text-red-500' : dueSoon ? 'text-amber-600' : 'text-[#22334A]/40'}`} />
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wide text-[#22334A]/50">موعد التسليم النهائي</p>
            <p className={`text-[13px] font-black tabular-nums ${overdue ? 'text-red-700' : dueSoon ? 'text-amber-700' : 'text-[#22334A]'}`}>
              {dueLabel}
            </p>
          </div>
        </div>
      )}

      {/* Score + submitted date */}
      <div className="flex flex-wrap gap-2">
        {assignment.max_score != null && (
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#22334A]/[0.07] bg-slate-50 px-3 py-1.5 text-[12px] font-bold text-[#22334A]/70">
            <Star className="h-3.5 w-3.5 text-[#EC943C]/80" />
            {assignment.score != null ? `${assignment.score} / ${assignment.max_score}` : `الدرجة من ${assignment.max_score}`}
          </span>
        )}

        {trulySubmitted && submittedLabel !== '—' && (
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12px] font-bold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            تم التسليم: {submittedLabel}
          </span>
        )}
      </div>

      {/* Instructor feedback */}
      {assignment.feedback && (
        <div className="rounded-xl border border-[#2691C2]/15 bg-blue-50/50 px-3.5 py-3">
          <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-[#2691C2]/70">ملاحظات المدرب</p>
          <p className="text-[12px] font-medium leading-relaxed text-[#0F172A]/80">{assignment.feedback}</p>
        </div>
      )}

      {/* Action */}
      {canSubmit && onSubmit && (
        <button
          type="button"
          onClick={onSubmit}
          className={`mt-auto inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[12px] font-black text-white shadow-sm transition hover:brightness-105 ${
            needsResub ? 'bg-orange-500' : overdue ? 'bg-red-600' : 'bg-[#EC943C]'
          }`}
        >
          {needsResub && <RefreshCw className="h-4 w-4" />}
          {needsResub ? 'إعادة تسليم الواجب' : 'تسليم الواجب'}
        </button>
      )}
    </motion.div>
  )
}
