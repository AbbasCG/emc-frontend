import { useEffect, useState } from 'react'
import { Video } from 'lucide-react'
import { DashboardPageShell, Eyebrow, Surface } from '@/components/ui'
import { DataTable, type DataTableColumn } from '@/components/dashboard'
import { fetchInstructorRecordings, type InstructorRecording } from '@/api/instructorApi'

export default function InstructorRecordingsPage() {
  const [recordings, setRecordings] = useState<InstructorRecording[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchInstructorRecordings().then(setRecordings).finally(() => setIsLoading(false))
  }, [])

  const columns: DataTableColumn<InstructorRecording>[] = [
    { key: 'title', header: 'العنوان', render: (r) => (
      <div className="flex items-center gap-2">
        <Video size={15} className="text-purple-400 shrink-0" />
        <span className="truncate max-w-[250px]">{r.title}</span>
      </div>
    )},
    { key: 'course', header: 'الدورة', render: (r) => r.course?.title ?? r.workshop?.title ?? '—' },
    { key: 'session_date', header: 'تاريخ الجلسة', render: (r) => r.session_date ? new Date(r.session_date).toLocaleDateString('ar-EG') : '—' },
    {
      key: 'recording_url', header: 'التسجيل',
      render: (r) => r.recording_url ? (
        <a href={r.recording_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-bold text-customBlue hover:underline">
          <Video size={14} /> مشاهدة
        </a>
      ) : '—',
    },
  ]

  return (
    <DashboardPageShell
      title="أرشيف التسجيلات"
      eyebrow={<Eyebrow tone="accent">INSTRUCTOR · RECORDINGS</Eyebrow>}
      description="جميع تسجيلات جلسات دوراتك مسجلة هنا."
    >
      <Surface variant="default" elevation={3} padding="none" className="overflow-hidden">
        {!isLoading && recordings.length === 0 && (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-black text-slate-500">لا توجد تسجيلات متاحة</p>
            <p className="mt-2 text-xs text-slate-400">ستظهر التسجيلات هنا بعد رفعها من قبل الأدمن</p>
          </div>
        )}
        {recordings.length > 0 && (
          <DataTable<InstructorRecording> columns={columns} data={recordings} keyExtractor={(r) => r.id} emptyMessage="لا توجد تسجيلات" />
        )}
      </Surface>
    </DashboardPageShell>
  )
}
