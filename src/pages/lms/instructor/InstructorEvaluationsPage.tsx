import { useEffect, useState } from 'react'
import { Star, MessageSquare } from 'lucide-react'
import { DashboardPageShell, Eyebrow, Surface } from '@/components/ui'
import { DataTable, type DataTableColumn } from '@/components/dashboard'
import { fetchInstructorEvaluations, type StudentEvaluation } from '@/api/instructorApi'

function RatingStars({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star key={i} size={13} className={i < value ? 'text-amber-400 fill-amber-400' : 'text-slate-200'} />
      ))}
    </div>
  )
}

export default function InstructorEvaluationsPage() {
  const [evaluations, setEvaluations] = useState<StudentEvaluation[]>([])

  useEffect(() => {
    fetchInstructorEvaluations().then(setEvaluations)
  }, [])

  const columns: DataTableColumn<StudentEvaluation>[] = [
    { key: 'user', header: 'الطالب', render: (r) => r.user?.name ?? '—' },
    { key: 'course', header: 'الدورة', render: (r) => r.course?.title ?? '—' },
    { key: 'rating', header: 'التقييم', render: (r) => <RatingStars value={r.rating} /> },
    { key: 'content_quality', header: 'جودة المحتوى', render: (r) => r.content_quality != null ? `${r.content_quality}/10` : '—' },
    { key: 'comment', header: 'التعليق', render: (r) => r.comment ? (
      <div className="flex items-center gap-1.5 max-w-[220px] truncate" title={r.comment}>
        <MessageSquare size={12} className="text-slate-400 shrink-0" />
        <span className="truncate text-xs text-slate-600">{r.comment}</span>
      </div>
    ) : '—' },
    { key: 'created_at', header: 'التاريخ', render: (r) => new Date(r.created_at).toLocaleDateString('ar-EG') },
  ]

  return (
    <DashboardPageShell
      title="تقييمات الطلاب"
      eyebrow={<Eyebrow tone="accent">INSTRUCTOR · EVALUATIONS</Eyebrow>}
      description="مشاهدة تقييمات الطلاب لدوراتك."
    >
      <Surface variant="default" elevation={3} padding="none" className="overflow-hidden">
        {evaluations.length > 0 ? (
          <DataTable<StudentEvaluation> columns={columns} data={evaluations} keyExtractor={(r) => r.id} emptyMessage="لا توجد تقييمات بعد" />
        ) : (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-black text-slate-500">لا توجد تقييمات بعد</p>
            <p className="mt-2 text-xs text-slate-400">تظهر التقييمات بعد أن يقوم الطلاب بتقييم دوراتك</p>
          </div>
        )}
      </Surface>
    </DashboardPageShell>
  )
}
