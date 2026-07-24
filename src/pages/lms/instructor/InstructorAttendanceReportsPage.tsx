import { useCallback, useEffect, useState } from 'react'
import { Download, FileSpreadsheet, FileText, RefreshCw, X } from 'lucide-react'
import {
  fetchAttendanceReports, downloadAttendanceExport, downloadAttendanceExportPdf, downloadAttendanceExportExcel,
  type AttendanceReportResult, type AttendanceReportFilters,
} from '@/api/instructorApi'
import { InstructorHero, InstructorEmptyState } from '@/components/instructor'
import toast from '@/lib/toast'
import { formatWallClockDMY } from '@/utils/amsterdamTime'

const ATTENDANCE_STATUS_CLS: Record<string, string> = {
  present: 'bg-emerald-100 text-emerald-700',
  absent: 'bg-red-100 text-red-600',
  late: 'bg-amber-100 text-amber-700',
  excused: 'bg-slate-200 text-slate-600',
}

function AttendanceStatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span className={`rounded-lg px-2 py-1 text-[9px] font-black ${ATTENDANCE_STATUS_CLS[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {label}
    </span>
  )
}

const STATUS_OPTIONS = [
  { value: '', label: 'كل الحالات' },
  { value: 'present', label: 'حاضر' },
  { value: 'absent', label: 'غائب' },
  { value: 'late', label: 'متأخر' },
  { value: 'excused', label: 'معذور' },
]

export default function InstructorAttendanceReportsPage() {
  const [filters, setFilters] = useState<AttendanceReportFilters>({ page: 1, per_page: 25 })
  const [result, setResult] = useState<AttendanceReportResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [exporting, setExporting] = useState<'csv' | 'pdf' | 'excel' | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(false)
    fetchAttendanceReports(filters)
      .then(setResult)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [filters])

  useEffect(() => { load() }, [load])

  function updateFilter<K extends keyof AttendanceReportFilters>(key: K, value: AttendanceReportFilters[K]) {
    setFilters((f) => ({ ...f, [key]: value, page: 1 }))
  }

  function clearFilters() {
    setFilters({ page: 1, per_page: 25 })
  }

  async function handleExport(kind: 'csv' | 'pdf' | 'excel') {
    if (exporting) return
    setExporting(kind)
    try {
      if (kind === 'csv') await downloadAttendanceExport(filters)
      else if (kind === 'pdf') await downloadAttendanceExportPdf(filters)
      else await downloadAttendanceExportExcel(filters)
      toast.success('تم تنزيل التقرير.')
    } catch {
      toast.error('تعذّر تصدير التقرير.')
    } finally {
      setExporting(null)
    }
  }

  const summary = result?.summary

  return (
    <div className="space-y-5 pb-16 font-[Cairo,sans-serif]" dir="rtl">
      <InstructorHero
        title="تقارير الحضور"
        subtitle="تصفية وتصدير سجلات الحضور عبر جميع دوراتك"
        backTo="/dashboard/instructor/attendance/dashboard"
        backLabel="لوحة الحضور"
        onRefresh={load}
        refreshing={loading}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={!!exporting} onClick={() => handleExport('csv')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-deepBlue/10 bg-white px-3 py-2 text-[11px] font-bold text-deepBlue/70 transition hover:border-[#0077B6]/30 disabled:opacity-40">
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
            <button type="button" disabled={!!exporting} onClick={() => handleExport('excel')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-deepBlue/10 bg-white px-3 py-2 text-[11px] font-bold text-deepBlue/70 transition hover:border-[#0077B6]/30 disabled:opacity-40">
              <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
            </button>
            <button type="button" disabled={!!exporting} onClick={() => handleExport('pdf')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-deepBlue/10 bg-white px-3 py-2 text-[11px] font-bold text-deepBlue/70 transition hover:border-[#0077B6]/30 disabled:opacity-40">
              <FileText className="h-3.5 w-3.5" /> PDF
            </button>
          </div>
        }
      />

      {/* Filter panel */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="text-[10px] font-black text-deepBlue/40">الحالة</label>
            <select value={filters.status ?? ''} onChange={(e) => updateFilter('status', e.target.value || undefined)}
              className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold text-deepBlue outline-none focus:border-[#0077B6]">
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-deepBlue/40">من تاريخ</label>
            <input type="date" value={filters.from ?? ''} onChange={(e) => updateFilter('from', e.target.value || undefined)}
              className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold text-deepBlue outline-none focus:border-[#0077B6]" />
          </div>
          <div>
            <label className="text-[10px] font-black text-deepBlue/40">إلى تاريخ</label>
            <input type="date" value={filters.to ?? ''} onChange={(e) => updateFilter('to', e.target.value || undefined)}
              className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold text-deepBlue outline-none focus:border-[#0077B6]" />
          </div>
          <div>
            <label className="text-[10px] font-black text-deepBlue/40">رقم الدورة</label>
            <input type="number" value={filters.course_id ?? ''} onChange={(e) => updateFilter('course_id', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="اختياري"
              className="mt-1 block w-28 rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold text-deepBlue outline-none focus:border-[#0077B6]" />
          </div>
          <button type="button" onClick={clearFilters}
            className="mr-auto flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-black text-deepBlue/55 transition hover:bg-slate-50">
            <X className="h-3.5 w-3.5" /> مسح الفلاتر
          </button>
        </div>
      </div>

      {/* KPI cards — all backend-computed */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-black uppercase text-deepBlue/40">الإجمالي</p>
            <p className="mt-1 text-[20px] font-black text-deepBlue">{summary.total}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-black uppercase text-deepBlue/40">نسبة الحضور</p>
            <p className="mt-1 text-[20px] font-black text-emerald-600">{summary.attendance_percentage}%</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-black uppercase text-deepBlue/40">غائب</p>
            <p className="mt-1 text-[20px] font-black text-red-500">{summary.absent_count}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-black uppercase text-deepBlue/40">مستوى الخطر</p>
            <p className="mt-1 text-[14px] font-black">
              {summary.risk_level === 'high' ? '🔴 مرتفع' : summary.risk_level === 'medium' ? '🟡 متوسط' : '🟢 منخفض'}
            </p>
          </div>
        </div>
      )}

      {/* Results table */}
      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-slate-100" />)}</div>
      ) : error ? (
        <div className="rounded-3xl border border-dashed border-red-200 bg-red-50/40 py-14 text-center">
          <p className="text-[13px] font-semibold text-red-500">تعذّر تحميل التقرير</p>
          <button type="button" onClick={load} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-deepBlue px-4 py-2 text-[11px] font-black text-white">
            <RefreshCw className="h-3.5 w-3.5" /> إعادة المحاولة
          </button>
        </div>
      ) : !result || result.data.length === 0 ? (
        <InstructorEmptyState icon={FileText} title="لا توجد نتائج" description="جرّب تغيير معايير التصفية" />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-right text-[12px]">
              <thead className="bg-slate-50 text-[10px] font-black uppercase text-deepBlue/40">
                <tr>
                  <th className="px-4 py-3">الطالب</th>
                  <th className="px-4 py-3">الدورة</th>
                  <th className="px-4 py-3">الجلسة</th>
                  <th className="px-4 py-3">التاريخ</th>
                  <th className="px-4 py-3">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.data.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-bold text-deepBlue">{row.student_name}</td>
                    <td className="px-4 py-3 text-deepBlue/60">{row.course_title}</td>
                    <td className="px-4 py-3 text-deepBlue/60">{row.session_title}</td>
                    <td className="px-4 py-3 font-mono text-deepBlue/50">{formatWallClockDMY(row.date)}</td>
                    <td className="px-4 py-3"><AttendanceStatusBadge status={row.status} label={row.status_label} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-[11px] font-bold text-deepBlue/50">
            <span>صفحة {result.meta.current_page} من {result.meta.last_page} — {result.meta.total} سجل</span>
            <div className="flex gap-2">
              <button type="button" disabled={result.meta.current_page <= 1} onClick={() => updateFilter('page', (filters.page ?? 1) - 1)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-30">السابق</button>
              <button type="button" disabled={result.meta.current_page >= result.meta.last_page} onClick={() => updateFilter('page', (filters.page ?? 1) + 1)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-30">التالي</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
