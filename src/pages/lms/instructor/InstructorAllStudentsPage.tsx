import { useEffect, useMemo, useState } from 'react'
import {
  Search,
  Users,
  XCircle,
} from 'lucide-react'
import { fetchInstructorAllStudents, fetchInstructorCourses, type InstructorStudentRow } from '@/api/instructorApi'
import type { TeachingCourseLms } from '@/types/lms'
import toast from '@/lib/toast'
import { InstructorHero, InstructorStudentCard, InstructorStudentDrawer } from '@/components/instructor'

/* ── Label maps ─────────────────────────────────────────────────────────── */

const ENROLL_AR: Record<string, string> = {
  active: 'نشط', inactive: 'غير نشط', completed: 'مكتمل', pending: 'بانتظار', approved: 'مقبول',
}

const PLACEMENT_AR: Record<string, string> = {
  not_started:       'لم يبدأ',
  pending:           'لم يبدأ',
  in_progress:       'جارٍ',
  written_submitted: 'الكتابي مكتمل',
  written_done:      'الكتابي مكتمل',
  oral_booked:       'المقابلة محجوزة',
  oral_completed:    'المقابلة مكتملة',
  completed:         'مستوى معتمد',
}

const selectCls =
  'h-9 appearance-none rounded-2xl border border-slate-200 bg-white px-3.5 text-[11px] font-semibold text-deepBlue/70 outline-none focus:border-[#2691C2] focus:ring-4 focus:ring-sky-100'

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function InstructorAllStudentsPage() {
  const [students, setStudents] = useState<InstructorStudentRow[]>([])
  const [courses,  setCourses]  = useState<TeachingCourseLms[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,          setSearch]          = useState('')
  const [filterCourse,    setFilterCourse]    = useState('')
  const [filterEnroll,    setFilterEnroll]    = useState('')
  const [filterPlacement, setFilterPlacement] = useState('')
  const [selected, setSelected] = useState<InstructorStudentRow | null>(null)

  async function load() {
    setLoading(true)
    try {
      const [s, c] = await Promise.all([
        fetchInstructorAllStudents(),
        fetchInstructorCourses(),
      ])
      setStudents(s)
      setCourses(c)
    } catch (err) {
      toast.error('تعذّر تحميل الطلاب')
      if (import.meta.env.DEV) console.error('[all-students] load failed:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return students.filter((s) => {
      if (q && !s.name.toLowerCase().includes(q) && !s.email.toLowerCase().includes(q)) return false
      if (filterCourse    && String(s.course_id) !== filterCourse) return false
      if (filterEnroll    && s.enrollment_status !== filterEnroll) return false
      if (filterPlacement && s.placement_status  !== filterPlacement) return false
      return true
    })
  }, [students, search, filterCourse, filterEnroll, filterPlacement])

  const stats = useMemo(() => ({
    total:    students.length,
    active:   students.filter((s) => s.enrollment_status === 'active' || s.enrollment_status === 'approved').length,
    placed:   students.filter((s) => s.placement_status === 'completed').length,
    oralPend: students.filter((s) => s.placement_status === 'written_submitted' || s.placement_status === 'written_done').length,
  }), [students])

  const hasFilters = Boolean(search || filterCourse || filterEnroll || filterPlacement)

  return (
    <div className="space-y-5 pb-16" dir="rtl">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <InstructorHero
        title="جميع طلابي"
        subtitle="كل الطلاب المسجلين في دوراتك — اضغط على أي طالب للتفاصيل"
        backTo="/dashboard/instructor/courses"
        backLabel="الدورات"
        onRefresh={load}
        refreshing={loading}
        pills={loading ? [] : [
          { label: 'إجمالي الطلاب',  value: stats.total    },
          { label: 'نشط',             value: stats.active   },
          { label: 'مستوى معتمد',     value: stats.placed   },
          { label: 'ينتظر المقابلة',  value: stats.oralPend },
        ]}
      />

      {/* ── Filters ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث باسم أو بريد..."
            dir="rtl"
            className="h-9 w-full rounded-2xl border border-slate-200 bg-white pr-8 pl-3.5 text-[12px] font-semibold text-deepBlue outline-none placeholder:text-slate-400 focus:border-[#2691C2] focus:ring-4 focus:ring-sky-100"
          />
        </div>
        <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)} dir="rtl" className={selectCls}>
          <option value="">جميع الدورات</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <select value={filterEnroll} onChange={(e) => setFilterEnroll(e.target.value)} dir="rtl" className={selectCls}>
          <option value="">حالة التسجيل</option>
          {Object.entries(ENROLL_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterPlacement} onChange={(e) => setFilterPlacement(e.target.value)} dir="rtl" className={selectCls}>
          <option value="">حالة تحديد المستوى</option>
          {(['not_started','in_progress','written_submitted','oral_booked','oral_completed','completed'] as const).map((k) => (
            <option key={k} value={k}>{PLACEMENT_AR[k]}</option>
          ))}
        </select>
        {hasFilters && (
          <button
            type="button"
            onClick={() => { setSearch(''); setFilterCourse(''); setFilterEnroll(''); setFilterPlacement('') }}
            className="flex items-center gap-1 rounded-2xl border border-slate-200 px-3 py-2 text-[11px] font-black text-deepBlue/55 transition hover:bg-slate-50"
          >
            <XCircle className="h-3.5 w-3.5" /> مسح
          </button>
        )}
      </div>

      {/* ── Content ──────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1,2,3,4,5,6].map((i) => <div key={i} className="h-40 animate-pulse rounded-3xl bg-slate-100" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <Users className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-4 text-[16px] font-black text-deepBlue">لا يوجد طلاب</p>
          <p className="mt-1.5 text-[12px] font-semibold text-deepBlue/45">
            {students.length === 0 ? 'لا يوجد طلاب مسجلون في دوراتك' : 'لا توجد نتائج تطابق الفلتر'}
          </p>
        </div>
      ) : (
        <>
          <p className="text-[11px] font-black text-deepBlue/30">
            {filtered.length} طالب من أصل {students.length}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((s, i) => (
              <InstructorStudentCard
                key={`${s.id}-${s.course_id ?? 0}`}
                student={s}
                index={i}
                onClick={() => setSelected(s)}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Student detail drawer ─────────────────────────────────────── */}
      <InstructorStudentDrawer
        student={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
