import { useEffect, useState } from 'react'
import { Play, Video } from 'lucide-react'
import { DashboardPageShell, Eyebrow, Surface } from '@/components/ui'
import { DataTable, type DataTableColumn } from '@/components/dashboard'
import { fetchStudentRecordings, type StudentRecording } from '@/api/studentApi'

export default function StudentRecordingsPage() {
  const [recordings, setRecordings] = useState<StudentRecording[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStudentRecordings().then(setRecordings).finally(() => setLoading(false))
  }, [])

  const columns: DataTableColumn<StudentRecording>[] = [
    { key: 'title', header: 'الدرس', render: (r) => (
      <div className="flex items-center gap-2">
        <Video size={15} className="text-purple-400 shrink-0" />
        <span className="truncate max-w-[250px]">{r.title}</span>
      </div>
    )},
    { key: 'course_title', header: 'الدورة', render: (r) => r.course_title ?? '—' },
    {
      key: 'session_date', header: 'التاريخ',
      render: (r) => r.session_date ? new Date(r.session_date).toLocaleDateString('ar-EG') : '—',
    },
    {
      key: 'recording_url', header: 'التسجيل',
      render: (r) => (
        <a
          href={r.recording_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-100 transition-colors"
        >
          <Play size={12} /> تشغيل
        </a>
      ),
    },
  ]

  return (
    <DashboardPageShell
      title="أرشيف الدروس المسجلة"
      eyebrow={<Eyebrow tone="accent">STUDENT · RECORDINGS</Eyebrow>}
      description="جميع تسجيلات الجلسات السابقة متاحة للمشاهدة في أي وقت."
    >
      <Surface variant="default" elevation={3} padding="none" className="overflow-hidden">
        {!loading && recordings.length === 0 && (
          <div className="px-6 py-12 text-center">
            <Video size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-black text-slate-500">لا توجد دروس مسجلة بعد</p>
            <p className="mt-2 text-xs text-slate-400">تظهر التسجيلات هنا بعد انتهاء الجلسات وتوفير روابط التسجيل.</p>
          </div>
        )}
        {recordings.length > 0 && (
          <DataTable<StudentRecording> columns={columns} data={recordings} keyExtractor={(r) => r.id} emptyMessage="لا توجد تسجيلات" />
        )}
      </Surface>
    </DashboardPageShell>
  )
}
