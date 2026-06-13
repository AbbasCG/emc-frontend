const sessionLabels: Record<string, string> = {
  scheduled: 'قادمة',
  live: 'مباشرة الآن',
  completed: 'انتهت',
  cancelled: 'ملغاة',
}

const assignmentLabels: Record<string, string> = {
  pending: 'مطلوب',
  submitted: 'مُسلَّم',
  graded: 'تم التقييم',
  revision: 'يحتاج مراجعة',
  late: 'متأخر',
}

type Props = {
  status: string
  kind?: 'session' | 'assignment' | 'neutral' | 'submission'
}

const submissionLabels: Record<string, string> = {
  pending_review: 'بانتظار المراجعة',
  reviewed: 'تمت المراجعة',
  needs_revision: 'يحتاج تسليماً جديداً',
  not_submitted: 'لم يُسلّم',
}

export default function LmsStatusBadge({ status, kind = 'neutral' }: Props) {
  const map =
    kind === 'session'
      ? sessionLabels
      : kind === 'assignment'
        ? assignmentLabels
        : kind === 'submission'
          ? submissionLabels
          : {}
  const label = (map as Record<string, string>)[status] ?? status

  const cls =
    kind === 'submission'
      ? status === 'reviewed'
        ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
        : status === 'needs_revision'
          ? 'bg-amber-50 text-amber-800 ring-amber-100'
          : status === 'not_submitted'
            ? 'bg-slate-50 text-slate-500 ring-slate-100'
            : 'bg-sky-50 text-customBlue ring-sky-100'
      : status === 'live'
        ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
        : status === 'completed' || status === 'graded'
          ? 'bg-slate-50 text-slate-600 ring-slate-100'
          : status === 'cancelled'
            ? 'bg-red-50 text-red-700 ring-red-100'
            : status === 'late' || status === 'revision'
              ? 'bg-amber-50 text-amber-800 ring-amber-100'
              : 'bg-sky-50 text-customBlue ring-sky-100'

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${cls}`}>
      {label}
    </span>
  )
}
