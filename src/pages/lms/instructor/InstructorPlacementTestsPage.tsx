import { useEffect, useMemo, useState } from 'react'
import {
  ClipboardCheck,
  Search,
  XCircle,
} from 'lucide-react'
import {
  fetchInstructorAllPlacementTests,
  type InstructorPlacementTestRow,
  type PlacementStatus,
} from '@/api/placementApi'
import type { InstructorStudentRow } from '@/api/instructorApi'
import toast from '@/lib/toast'
import { InstructorHero, InstructorStudentCard, InstructorStudentDrawer } from '@/components/instructor'

/* ── Status maps ─────────────────────────────────────────────────────────── */

const STATUS_AR: Record<string, string> = {
  not_started:       'لم يبدأ',
  in_progress:       'جارٍ',
  written_submitted: 'بانتظار حجز المقابلة',
  oral_booked:       'تم حجز المقابلة',
  oral_completed:    'تم تقييم المقابلة',
  completed:         'تم اعتماد المستوى النهائي',
}

/* ── Adapter: InstructorPlacementTestRow → InstructorStudentRow ──────────── */

function toStudentRow(row: InstructorPlacementTestRow): InstructorStudentRow {
  return {
    id:                row.student_id,
    name:              row.student_name,
    email:             row.student_email,
    course_id:         row.course_id,
    course_title:      row.course_title,
    enrollment_status: null,
    placement_status:  row.status,
    written_score:     row.written_score,
    total_questions:   row.total_questions,
    written_level:     row.written_level,
    oral_booking_at:   row.oral_booking_at,
    final_level:       row.final_level,
    oral_score:        row.oral_score,
    instructor_notes:  null,
    enrolled_at:       row.submitted_at,
    avatar_url:        row.avatar_url,
    attempt_id:        row.attempt_id,
  }
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function InstructorPlacementTestsPage() {
  const [rows,         setRows]         = useState<InstructorPlacementTestRow[]>([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState<PlacementStatus | ''>('')
  const [selected,     setSelected]     = useState<InstructorPlacementTestRow | null>(null)

  async function load() {
    setLoading(true)
    try { setRows(await fetchInstructorAllPlacementTests()) }
    catch (err) {
      toast.error('تعذّر تحميل نتائج اختبارات تحديد المستوى')
      if (import.meta.env.DEV) console.error('[placement-tests] load failed:', err)
    }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, []) // eslint-disable-line

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (q && !r.student_name.toLowerCase().includes(q) && !r.student_email.toLowerCase().includes(q) && !r.course_title.toLowerCase().includes(q)) return false
      if (filterStatus && r.status !== filterStatus) return false
      return true
    })
  }, [rows, search, filterStatus])

  const stats = useMemo(() => ({
    total:   rows.length,
    waiting: rows.filter((r) => r.status === 'written_submitted').length,
    booked:  rows.filter((r) => r.status === 'oral_booked').length,
    done:    rows.filter((r) => r.status === 'oral_completed' || r.status === 'completed').length,
  }), [rows])

  const drawerStudent = selected ? toStudentRow(selected) : null

  return (
    <div className="space-y-5 pb-16" dir="rtl">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <InstructorHero
        title="اختبارات تحديد المستوى"
        subtitle="نتائج جميع اختبارات الطلاب في دوراتك — اضغط على أي طالب للتفاصيل"
        backTo="/dashboard/instructor/courses"
        backLabel="الدورات"
        onRefresh={load}
        refreshing={loading}
        pills={loading ? [] : [
          { label: 'إجمالي الاختبارات',     value: stats.total   },
          { label: 'بانتظار حجز المقابلة',  value: stats.waiting },
          { label: 'المقابلة محجوزة',        value: stats.booked  },
          { label: 'تم الاعتماد',            value: stats.done    },
        ]}
      />

      {/* ── Filters ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث باسم طالب أو دورة..."
            dir="rtl"
            className="h-9 w-full rounded-2xl border border-slate-200 bg-white pr-8 pl-3.5 text-[12px] font-semibold text-deepBlue outline-none placeholder:text-slate-400 focus:border-[#0077B6] focus:ring-4 focus:ring-sky-100"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as PlacementStatus | '')}
          dir="rtl"
          className="h-9 appearance-none rounded-2xl border border-slate-200 bg-white px-3.5 text-[11px] font-semibold text-deepBlue/70 outline-none focus:border-[#0077B6] focus:ring-4 focus:ring-sky-100"
        >
          <option value="">جميع الحالات</option>
          {Object.entries(STATUS_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {(search || filterStatus) && (
          <button
            type="button"
            onClick={() => { setSearch(''); setFilterStatus('') }}
            className="flex items-center gap-1 rounded-2xl border border-slate-200 px-3 py-2 text-[11px] font-black text-deepBlue/55 transition hover:bg-slate-50"
          >
            <XCircle className="h-3.5 w-3.5" /> مسح
          </button>
        )}
      </div>

      {/* ── Content ──────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1,2,3,4].map((i) => <div key={i} className="h-44 animate-pulse rounded-3xl bg-slate-100" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <ClipboardCheck className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-4 text-[16px] font-black text-deepBlue">
            {rows.length === 0 ? 'لا توجد نتائج اختبارات بعد' : 'لا توجد نتائج تطابق الفلتر'}
          </p>
          {rows.length === 0 && (
            <p className="mt-1.5 text-[12px] font-semibold text-deepBlue/45">
              ستظهر هنا نتائج اختبارات الطلاب بعد إتمامها
            </p>
          )}
        </div>
      ) : (
        <>
          <p className="text-[11px] font-black text-deepBlue/30">
            عرض <span className="font-mono tabular-nums">{filtered.length}</span> من <span className="font-mono tabular-nums">{rows.length}</span>
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((row, i) => (
              <InstructorStudentCard
                key={`${row.attempt_id}-${i}`}
                student={toStudentRow(row)}
                index={i}
                onClick={() => setSelected(row)}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Student detail drawer ─────────────────────────────────────── */}
      <InstructorStudentDrawer
        student={drawerStudent}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
