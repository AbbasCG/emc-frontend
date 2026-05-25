import { useEffect, useState } from 'react'
import { Video, ExternalLink, Monitor, AlertCircle } from 'lucide-react'
import { DashboardPageShell, Eyebrow, Surface } from '@/components/ui'
import { DataTable, type DataTableColumn } from '@/components/dashboard'
import { fetchStudentSessions } from '@/api/studentApi'
import type { LmsSession } from '@/types/lms'

export default function StudentLiveStreamPage() {
  const [sessions, setSessions] = useState<LmsSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStudentSessions().then((data) => {
      setSessions(data.upcoming)
    }).finally(() => setLoading(false))
  }, [])

  const liveSessions = sessions.filter((s) => s.status === 'live')
  const upcomingSessions = sessions.filter((s) => s.status === 'scheduled')

  const columns: DataTableColumn<LmsSession>[] = [
    { key: 'title', header: 'الجلسة', render: (r) => (
      <div className="flex items-center gap-2">
        <Monitor size={15} className="text-customBlue shrink-0" />
        <span className="truncate max-w-[200px]">{r.title || r.course_name}</span>
      </div>
    )},
    { key: 'course_name', header: 'الدورة' },
    { key: 'date', header: 'التاريخ', render: (r) => r.date ?? (r.starts_at ? new Date(r.starts_at).toLocaleDateString('ar-EG') : '—') },
    { key: 'time', header: 'الوقت', render: (r) => r.time ?? (r.starts_at ? new Date(r.starts_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '—') },
    {
      key: 'meeting_link', header: 'الرابط',
      render: (r) => r.meeting_link ? (
        <a
          href={r.meeting_link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-customBlue/10 px-3 py-1.5 text-xs font-bold text-customBlue hover:bg-customBlue/20 transition-colors"
        >
          <ExternalLink size={12} /> دخول البث
        </a>
      ) : <span className="text-xs text-slate-400">—</span>,
    },
  ]

  return (
    <DashboardPageShell
      title="غرفة البث المباشر"
      eyebrow={<Eyebrow tone="accent">STUDENT · LIVE STREAM</Eyebrow>}
      description="الجلسات المباشرة القادمة والحالية. انقر على رابط الدخول للانضمام."
    >
      {/* Current live sessions */}
      {liveSessions.length > 0 && (
        <Surface variant="default" elevation={4} padding="lg" className="mb-6 border-r-4 border-r-red-500">
          <div className="flex items-center gap-3 mb-4">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
            <h3 className="text-base font-black text-red-600">بث مباشر الآن</h3>
          </div>
          <div className="grid gap-4">
            {liveSessions.map((s) => (
              <div key={s.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl bg-red-50 p-4">
                <div>
                  <p className="font-black text-deepBlue">{s.title || s.course_name}</p>
                  <p className="text-xs text-slate-500">{s.course_name}</p>
                </div>
                {s.meeting_link && (
                  <a
                    href={s.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-5 py-3 text-sm font-black text-white shadow-lg hover:bg-red-600 transition-all"
                  >
                    <Video size={16} /> انضم الآن
                  </a>
                )}
              </div>
            ))}
          </div>
        </Surface>
      )}

      {/* Upcoming sessions with meeting links */}
      <Surface variant="default" elevation={3} padding="none" className="overflow-hidden">
        {!loading && upcomingSessions.length === 0 && (
          <div className="px-6 py-12 text-center">
            <Monitor size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-black text-slate-500">لا توجد جلسات بث مباشر</p>
            <p className="mt-2 text-xs text-slate-400">ستظهر هنا جلسات البث المباشر المجدولة لدوراتك.</p>
          </div>
        )}
        {upcomingSessions.filter((s) => s.meeting_link).length > 0 && (
          <>
            <div className="px-6 py-3 border-b border-slate-100">
              <h3 className="text-xs font-black text-slate-500">الجلسات القادمة</h3>
            </div>
            <DataTable<LmsSession>
              columns={columns}
              data={upcomingSessions.filter((s) => s.meeting_link)}
              keyExtractor={(r) => r.id}
              emptyMessage="لا توجد جلسات"
            />
          </>
        )}
        {upcomingSessions.filter((s) => !s.meeting_link).length > 0 && !loading && (
          <div className="px-6 py-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <AlertCircle size={12} />
              <span>هناك {upcomingSessions.filter((s) => !s.meeting_link).length} جلسة بدون رابط بث بعد.</span>
            </div>
          </div>
        )}
      </Surface>
    </DashboardPageShell>
  )
}
