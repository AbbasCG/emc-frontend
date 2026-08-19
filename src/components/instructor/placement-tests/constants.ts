import type { InstructorPlacementTestRow, PlacementStatus } from '@/api/placementApi'

export type PipelineStageId =
  | 'waiting_written'
  | 'written_completed'
  | 'waiting_oral'
  | 'oral_assessment'
  | 'ready_assignment'
  | 'assigned'

export type PipelineStage = {
  id: PipelineStageId
  label: string
  dot: string
  description: string
}

export const PIPELINE_STAGES: PipelineStage[] = [
  { id: 'waiting_written',   label: 'بانتظار الاختبار الكتابي', dot: 'bg-slate-400',    description: 'لم يكمل الطالب الاختبار بعد' },
  { id: 'written_completed', label: 'اكتمل الاختبار الكتابي',   dot: 'bg-sky-500',      description: 'بانتظار حجز المقابلة الشفوية' },
  { id: 'waiting_oral',      label: 'بانتظار المقابلة الشفوية', dot: 'bg-violet-500',  description: 'المقابلة محجوزة أو قريبة' },
  { id: 'oral_assessment', label: 'التقييم الشفوي', dot: 'bg-amber-500', description: 'تمت المقابلة بانتظار الاعتماد' },
  { id: 'ready_assignment', label: 'جاهز للإسناد', dot: 'bg-emerald-500', description: 'المستوى معتمد يمكن إسناد صف' },
  { id: 'assigned',          label: 'مُسند إلى صف',             dot: 'bg-[#0077B6]',    description: 'تم إسناد الطالب إلى صف' },
]

export const STATUS_AR: Record<string, string> = {
  not_started:       'لم يبدأ',
  in_progress:       'جارٍ',
  written_submitted: 'اكتمل الكتابي',
  oral_booked:       'المقابلة محجوزة',
  oral_completed:    'تم التقييم الشفوي',
  completed:         'مستوى معتمد',
}

export const STATUS_BADGE: Record<string, string> = {
  not_started:       'bg-slate-100 text-slate-600 ring-slate-200/80',
  in_progress:       'bg-amber-50 text-amber-700 ring-amber-200/80',
  written_submitted: 'bg-sky-50 text-sky-700 ring-sky-200/80',
  oral_booked:       'bg-violet-50 text-violet-700 ring-violet-200/80',
  oral_completed:    'bg-purple-50 text-purple-700 ring-purple-200/80',
  completed:         'bg-emerald-50 text-emerald-700 ring-emerald-200/80',
}

export type SortKey = 'date_desc' | 'date_asc' | 'name' | 'written' | 'oral'

export const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: 'date_desc', label: 'الأحدث أولاً' },
  { id: 'date_asc',  label: 'الأقدم أولاً' },
  { id: 'name',      label: 'الاسم' },
  { id: 'written',   label: 'الدرجة الكتابية' },
  { id: 'oral',      label: 'الدرجة الشفوية' },
]

export type AssignmentFilter = '' | 'assigned' | 'unassigned'

export function getPipelineStage(row: InstructorPlacementTestRow): PipelineStageId {
  if (row.is_assigned) return 'assigned'
  switch (row.status as PlacementStatus) {
    case 'not_started':
    case 'in_progress':
      return 'waiting_written'
    case 'written_submitted':
      return 'written_completed'
    case 'oral_booked':
      return 'waiting_oral'
    case 'oral_completed':
      return 'oral_assessment'
    case 'completed':
      return 'ready_assignment'
    default:
      return 'waiting_written'
  }
}

export function writtenPct(row: InstructorPlacementTestRow): number | null {
  if (row.percentage != null) return row.percentage
  if (row.written_score != null && row.total_questions && row.total_questions > 0) {
    return Math.round((row.written_score / row.total_questions) * 100)
  }
  return null
}

export function overallPct(row: InstructorPlacementTestRow): number | null {
  const w = writtenPct(row)
  const o = row.oral_score
  const parts: number[] = []
  if (w != null) parts.push(w)
  if (o != null) parts.push(o)
  if (!parts.length) return null
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length)
}
