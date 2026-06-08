import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BookOpen,
  CheckCircle2,
  Clock,
  ClipboardCheck,
  Mic,
  RefreshCw,
  Search,
  Users,
  XCircle,
} from 'lucide-react'
import { BackButton } from '@/components/shared/BackButton'
import { fetchInstructorAllStudents, type InstructorStudentRow } from '@/api/instructorApi'
import { fetchInstructorCourses } from '@/api/instructorApi'
import type { TeachingCourseLms } from '@/types/lms'
import toast from '@/lib/toast'

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function toDMY(iso: string | null | undefined): string {
  if (!iso) return '—'
  const s = iso.slice(0, 10)
  if (s.length < 10) return '—'
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

/* ── Label maps ──────────────────────────────────────────────────────────── */

const ENROLL_AR: Record<string, string> = {
  active:    'نشط',
  inactive:  'غير نشط',
  completed: 'مكتمل',
  pending:   'بانتظار',
  approved:  'مقبول',
}

const PLACEMENT_AR: Record<string, string> = {
  pending:          'لم يبدأ',
  in_progress:      'جارٍ',
  written_done:     'كتابي مكتمل',
  oral_booked:      'المقابلة محجوزة',
  oral_completed:   'مقابلة مكتملة',
  completed:        'منتهي',
}

const ENROLL_CLR: Record<string, string> = {
  active:    'bg-emerald-100 text-emerald-700',
  completed: 'bg-sky-100 text-sky-700',
  pending:   'bg-amber-100 text-amber-700',
  approved:  'bg-emerald-100 text-emerald-700',
  inactive:  'bg-slate-100 text-slate-500',
}

const PLACEMENT_CLR: Record<string, string> = {
  pending:          'bg-slate-100 text-slate-500',
  in_progress:      'bg-amber-100 text-amber-700',
  written_done:     'bg-sky-100 text-sky-700',
  oral_booked:      'bg-violet-100 text-violet-700',
  oral_completed:   'bg-purple-100 text-purple-700',
  completed:        'bg-emerald-100 text-emerald-700',
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function InstructorAllStudentsPage() {
  const [students, setStudents] = useState<InstructorStudentRow[]>([])
  const [courses, setCourses]   = useState<TeachingCourseLms[]>([])
  const [loading, setLoading]   = useState(true)

  const [search,          setSearch]          = useState('')
  const [filterCourse,    setFilterCourse]    = useState('')
  const [filterEnroll,    setFilterEnroll]    = useState('')
  const [filterPlacement, setFilterPlacement] = useState('')

  async function load() {
    setLoading(true)
    try {
      const [s, c] = await Promise.all([fetchInstructorAllStudents(), fetchInstructorCourses()])
      setStudents(s)
      setCourses(c)
    } catch {
      toast.error('تعذّر تحميل الطلاب')
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
    total:     students.length,
    active:    students.filter((s) => s.enrollment_status === 'active' || s.enrollment_status === 'approved').length,
    placed:    students.filter((s) => s.placement_status === 'completed').length,
    oralPend:  students.filter((s) => s.placement_status === 'written_done').length,
  }), [students])

  return (
    <div className="space-y-5 pb-16" dir="rtl">

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-bl from-deepBlue via-[#1a2d44] to-customBlue px-6 py-6 shadow-[0_20px_50px_-20px_rgba(34,51,74,0.5)] sm:px-10"
      >
        <div aria-hidden className="pointer-events-none absolute -left-10 top-0 h-44 w-44 rounded-full bg-customOrange/15 blur-[80px]" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <BackButton to="/dashboard/instructor/courses" label="الدورات" className="mb-1.5 text-white/45 hover:!text-white/70" />
            <h1 className="text-[1.5rem] font-black leading-tight text-white">جميع طلابي</h1>
            <p className="mt-1 text-[12px] font-semibold text-white/55">كل الطلاب المسجلين في دوراتك</p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-[11px] font-black text-white backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>

        {!loading && (
          <div className="relative mt-4 flex flex-wrap gap-3">
            <StatPill label="إجمالي الطلاب"  value={stats.total}    />
            <StatPill label="نشط"             value={stats.active}   />
            <StatPill label="مستوى محدد"      value={stats.placed}   />
            <StatPill label="ينتظر المقابلة"  value={stats.oralPend} />
          </div>
        )}
      </motion.div>

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث باسم أو بريد..."
            dir="rtl"
            className="h-9 w-full rounded-2xl border border-slate-200 bg-white pr-8 pl-3.5 text-[12px] font-semibold text-deepBlue outline-none placeholder:text-slate-400 focus:border-customBlue focus:ring-4 focus:ring-sky-100"
          />
        </div>

        <select
          value={filterCourse}
          onChange={(e) => setFilterCourse(e.target.value)}
          dir="rtl"
          className={selectCls}
        >
          <option value="">جميع الدورات</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>

        <select value={filterEnroll} onChange={(e) => setFilterEnroll(e.target.value)} dir="rtl" className={selectCls}>
          <option value="">حالة التسجيل</option>
          {Object.entries(ENROLL_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        <select value={filterPlacement} onChange={(e) => setFilterPlacement(e.target.value)} dir="rtl" className={selectCls}>
          <option value="">حالة تحديد المستوى</option>
          {Object.entries(PLACEMENT_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        {(search || filterCourse || filterEnroll || filterPlacement) && (
          <button
            type="button"
            onClick={() => { setSearch(''); setFilterCourse(''); setFilterEnroll(''); setFilterPlacement('') }}
            className="flex items-center gap-1 rounded-2xl border border-slate-200 px-3 py-2 text-[11px] font-black text-deepBlue/55 transition hover:bg-slate-50"
          >
            <XCircle className="h-3.5 w-3.5" />
            مسح
          </button>
        )}
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}
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
            عرض <span className="font-mono">{filtered.length}</span> من <span className="font-mono">{students.length}</span> طالب
          </p>
          <div className="space-y-2">
            {filtered.map((s, i) => <StudentRow key={`${s.id}-${s.course_id ?? 0}`} student={s} index={i} />)}
          </div>
        </>
      )}
    </div>
  )
}

/* ── Sub-components ───────────────────────────────────────────────────────── */

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/10 px-4 py-2 backdrop-blur-sm">
      <p className="font-mono text-[18px] font-black tabular-nums text-white">{value}</p>
      <p className="text-[9px] font-black text-white/50">{label}</p>
    </div>
  )
}

function StudentRow({ student: s, index }: { student: InstructorStudentRow; index: number }) {
  const enrollKey    = (s.enrollment_status ?? '').toLowerCase()
  const placementKey = (s.placement_status  ?? '').toLowerCase()

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.025 }}
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
    >
      {/* Avatar */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-bl from-deepBlue/90 to-customBlue text-[13px] font-black text-white">
        {s.name.charAt(0)}
      </div>

      {/* Name + email */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-black text-deepBlue">{s.name}</p>
        <p className="truncate text-[10px] font-semibold text-deepBlue/40" dir="ltr">{s.email}</p>
      </div>

      {/* Course */}
      {s.course_title && (
        <div className="flex items-center gap-1 text-[10px] font-semibold text-deepBlue/50">
          <BookOpen className="h-3 w-3 text-customBlue/60" />
          <span className="max-w-[120px] truncate">{s.course_title}</span>
        </div>
      )}

      {/* Enrollment status */}
      {s.enrollment_status && (
        <span className={`rounded-xl px-2 py-0.5 text-[9px] font-black ${ENROLL_CLR[enrollKey] ?? 'bg-slate-100 text-slate-500'}`}>
          {ENROLL_AR[enrollKey] ?? s.enrollment_status}
        </span>
      )}

      {/* Placement status */}
      {s.placement_status && (
        <span className={`rounded-xl px-2 py-0.5 text-[9px] font-black ${PLACEMENT_CLR[placementKey] ?? 'bg-slate-100 text-slate-500'}`}>
          {PLACEMENT_AR[placementKey] ?? s.placement_status}
        </span>
      )}

      {/* Score */}
      {s.written_score != null && (
        <div className="flex items-center gap-1 text-[11px]">
          <ClipboardCheck className="h-3 w-3 text-customOrange/70" />
          <span className="font-mono font-black tabular-nums text-deepBlue">
            {s.written_score}/{s.total_questions ?? 70}
          </span>
          {s.written_level && (
            <span className="font-mono text-[9px] font-black text-deepBlue/45">{s.written_level}</span>
          )}
        </div>
      )}

      {/* Oral booking */}
      {s.oral_booking_at && (
        <div className="flex items-center gap-1 text-[10px] font-semibold text-violet-600">
          <Mic className="h-3 w-3" />
          <span className="font-mono">
            {toDMY(s.oral_booking_at)}
          </span>
        </div>
      )}

      {/* Final level */}
      {s.final_level && (
        <div className="flex items-center gap-1 rounded-xl bg-emerald-100 px-2 py-0.5">
          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
          <span className="font-mono text-[9px] font-black text-emerald-700">{s.final_level}</span>
        </div>
      )}

      {/* Enrolled at */}
      {s.enrolled_at && (
        <div className="flex items-center gap-1 text-[10px] font-semibold text-deepBlue/30">
          <Clock className="h-3 w-3" />
          {toDMY(s.enrolled_at)}
        </div>
      )}
    </motion.div>
  )
}

const selectCls =
  'h-9 appearance-none rounded-2xl border border-slate-200 bg-white px-3.5 text-[11px] font-semibold text-deepBlue/70 outline-none focus:border-customBlue focus:ring-4 focus:ring-sky-100'
