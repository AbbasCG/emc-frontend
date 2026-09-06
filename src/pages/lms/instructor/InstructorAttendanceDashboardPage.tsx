import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { CalendarCheck, Download, TrendingUp, AlertTriangle, BarChart3 } from 'lucide-react'
import { fetchAttendanceDashboard, downloadAttendanceExport, type AttendanceDashboardData } from '@/api/instructorApi'
import { InstructorHero } from '@/components/instructor'
import toast from '@/lib/toast'

function Card({ label, value, icon: Icon, accent }: { label: string; value: number | string; icon: typeof CalendarCheck; accent: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-wide text-deepBlue/40">{label}</p>
        <Icon className={`h-4 w-4 ${accent}`} />
      </div>
      <p className="mt-1.5 text-[22px] font-black text-deepBlue">{value}</p>
    </div>
  )
}

function StudentList({ title, students, tone }: { title: string; students: AttendanceDashboardData['at_risk_students']; tone: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-[11px] font-black text-deepBlue/50">{title}</p>
      {students.length === 0 ? (
        <p className="mt-2 text-[11px] font-semibold text-deepBlue/35">لا توجد بيانات</p>
      ) : (
        <div className="mt-2 space-y-1.5">
          {students.map((s) => (
            <div key={s.user_id} className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-deepBlue/70">{s.name ?? `#${s.user_id}`}</span>
              <span className={`rounded-lg px-2 py-0.5 text-[10px] font-black ${tone}`}>{s.attendance_percentage}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function InstructorAttendanceDashboardPage() {
  const [data, setData] = useState<AttendanceDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  // Runs once — `loading` already starts as `true`, so the effect only settles it.
  useEffect(() => {
    fetchAttendanceDashboard()
      .then(setData)
      .catch(() => toast.error('تعذّر تحميل لوحة الحضور'))
      .finally(() => setLoading(false))
  }, [])

  async function handleExport() {
    if (exporting) return
    setExporting(true)
    try {
      await downloadAttendanceExport()
      toast.success('تم تنزيل ملف الحضور.')
    } catch {
      toast.error('تعذّر تصدير بيانات الحضور.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-5 pb-16 font-[Cairo,sans-serif]" dir="rtl">
      <InstructorHero
        title="لوحة الحضور"
        subtitle="نظرة عامة على الحضور اليومي والأسبوعي والشهري، والطلاب المعرّضون للخطر"
        backTo="/dashboard/instructor/attendance"
        backLabel="سجلات الحضور"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/dashboard/instructor/attendance/reports"
              className="inline-flex items-center gap-1.5 rounded-xl border border-deepBlue/10 bg-white px-4 py-2 text-[12px] font-bold text-deepBlue/70 transition hover:border-[#0077B6]/30"
            >
              <BarChart3 className="h-4 w-4" />
              التقارير التفصيلية
            </Link>
            <button
              type="button"
              disabled={exporting}
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 rounded-xl border border-deepBlue/10 bg-white px-4 py-2 text-[12px] font-bold text-deepBlue/70 transition hover:border-[#0077B6]/30 disabled:opacity-40"
            >
              <Download className="h-4 w-4" />
              تصدير CSV
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      ) : !data ? (
        <div className="rounded-3xl border border-dashed border-red-200 bg-red-50/40 py-14 text-center text-[13px] font-semibold text-red-500">
          تعذّر تحميل البيانات
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card label="جلسات اليوم" value={data.today_sessions} icon={CalendarCheck} accent="text-deepBlue/50" />
            <Card label="حضور مُسجَّل اليوم" value={data.today_attendance_marked} icon={CalendarCheck} accent="text-sky-500" />
            <Card label="نسبة الحضور الحالية" value={`${data.current_attendance_percentage}%`} icon={TrendingUp} accent="text-emerald-600" />
            <Card label="طلاب معرّضون للخطر" value={data.at_risk_students.length} icon={AlertTriangle} accent="text-red-500" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-black text-deepBlue/50">هذا الأسبوع</p>
              <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                <div><p className="text-[15px] font-black text-emerald-600">{data.week_present}</p><p className="text-[9px] font-bold text-deepBlue/40">حاضر</p></div>
                <div><p className="text-[15px] font-black text-red-500">{data.week_absent}</p><p className="text-[9px] font-bold text-deepBlue/40">غائب</p></div>
                <div><p className="text-[15px] font-black text-amber-600">{data.week_late}</p><p className="text-[9px] font-bold text-deepBlue/40">متأخر</p></div>
                <div><p className="text-[15px] font-black text-slate-500">{data.week_excused}</p><p className="text-[9px] font-bold text-deepBlue/40">معذور</p></div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-black text-deepBlue/50">هذا الشهر</p>
              <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                <div><p className="text-[15px] font-black text-emerald-600">{data.month_present}</p><p className="text-[9px] font-bold text-deepBlue/40">حاضر</p></div>
                <div><p className="text-[15px] font-black text-red-500">{data.month_absent}</p><p className="text-[9px] font-bold text-deepBlue/40">غائب</p></div>
                <div><p className="text-[15px] font-black text-amber-600">{data.month_late}</p><p className="text-[9px] font-bold text-deepBlue/40">متأخر</p></div>
                <div><p className="text-[15px] font-black text-slate-500">{data.month_excused}</p><p className="text-[9px] font-bold text-deepBlue/40">معذور</p></div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <StudentList title="الأكثر التزاماً بالحضور" students={data.top_attendance} tone="bg-emerald-50 text-emerald-700" />
            <StudentList title="الأقل حضوراً" students={data.worst_attendance} tone="bg-red-50 text-red-700" />
            <StudentList title="طلاب معرّضون للخطر (أقل من 70%)" students={data.at_risk_students} tone="bg-amber-50 text-amber-700" />
          </div>
        </>
      )}
    </div>
  )
}
