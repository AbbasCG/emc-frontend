import { useEffect, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import { DashboardPageShell, Eyebrow, Surface } from '@/components/ui'
import { DataTable, type DataTableColumn } from '@/components/dashboard'
import { fetchInstructorProgress, type StudentProgressItem } from '@/api/instructorApi'

const statusBadge = (status: string) => {
  const map: Record<string, { label: string; cls: string }> = {
    active:     { label: 'نشط',    cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
    completed:  { label: 'مكتمل',  cls: 'bg-blue-50 text-blue-700 ring-blue-200' },
    dropped:    { label: 'منسحب',  cls: 'bg-red-50 text-red-700 ring-red-200' },
    pending:    { label: 'معلق',   cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  }
  const entry = map[status] ?? { label: status, cls: 'bg-slate-50 text-slate-700 ring-slate-200' }
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${entry.cls}`}>{entry.label}</span>
}

export default function InstructorProgressPage() {
  const [items, setItems] = useState<StudentProgressItem[]>([])

  useEffect(() => {
    fetchInstructorProgress().then(setItems)
  }, [])

  const columns: DataTableColumn<StudentProgressItem>[] = [
    { key: 'user', header: 'الطالب', render: (r) => r.user?.name ?? '—' },
    { key: 'course', header: 'الدورة', render: (r) => r.course?.title ?? '—' },
    {
      key: 'progress_percentage', header: 'نسبة التقدم',
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-customBlue transition-all" style={{ width: `${r.progress_percentage}%` }} />
          </div>
          <span className="text-xs font-bold text-slate-600">{r.progress_percentage}%</span>
        </div>
      ),
    },
    { key: 'attendance_percentage', header: 'الحضور', render: (r) => `${r.attendance_percentage}%` },
    { key: 'assignment_completion_percentage', header: 'الواجبات', render: (r) => `${r.assignment_completion_percentage}%` },
    { key: 'status', header: 'الحالة', render: (r) => statusBadge(r.status) },
  ]

  return (
    <DashboardPageShell
      title="تقدم الطلاب"
      eyebrow={<Eyebrow tone="accent">INSTRUCTOR · PROGRESS</Eyebrow>}
      description="متابعة تقدم الطلاب في دوراتك."
    >
      <Surface variant="default" elevation={3} padding="none" className="overflow-hidden">
        {items.length > 0 ? (
          <DataTable<StudentProgressItem> columns={columns} data={items} keyExtractor={(r) => r.id} emptyMessage="لا توجد بيانات تقدم" />
        ) : (
          <div className="px-6 py-12 text-center">
            <TrendingUp size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-black text-slate-500">لا توجد بيانات تقدم</p>
            <p className="mt-2 text-xs text-slate-400">تظهر بيانات التقدم بعد التحاق الطلاب بدوراتك</p>
          </div>
        )}
      </Surface>
    </DashboardPageShell>
  )
}
