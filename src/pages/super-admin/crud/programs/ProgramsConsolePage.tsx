import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CourseStatusBadge from '@/components/shared/CourseStatusBadge'
import ConfirmDialog from '@/components/feedback/ConfirmDialog'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Archive,
  BookMarked,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  ChevronLeft,
  ChevronRight,
  FilePen,
  Filter,
  LayoutGrid,
  Layers3,
  List,
  RefreshCw,
  UserX,
} from 'lucide-react'
import toast from '@/lib/toast'
import {
  deleteCourse,
  fetchDepartmentOptions,
  patchCoursePublishState,
  patchCourseStatus,
} from '@/api/adminCoursesApi'
import { fetchAdminInstructors, type AdminInstructorOption } from '@/api/adminInstructorsApi'
import { getApiErrorMessage } from '@/api/apiErrors'
import {
  fetchAdminCoursesPage,
  fetchTracksStrict,
  type CatalogTrackRow,
  type CourseSummary,
  type CoursePageMeta,
} from '@/api/superAdminCatalogApi'
import { fetchAdminLearningPaths } from '@/api/learningPathsApi'
import { programFinanceApi } from '@/api/programFinanceApi'
import type { Course } from '@/types'
import { formatEuro } from '@/utils/currency'
import { initialsFromName } from '@/pages/super-admin/crud/shared/initials'
import { MiniSelect } from '@/pages/super-admin/crud/shared/FilterBar'
import { CrudBadge } from '@/pages/super-admin/crud/shared/Badge'
import { CrudCardTable, CrudTable, Th, Tr, Td } from '@/pages/super-admin/crud/shared/TableChrome'
import { EmptyPanel, ErrorPanel } from '@/pages/super-admin/crud/shared/States'
import { RowActionsMenu } from '@/pages/super-admin/crud/shared/RowActions'
import { CourseManagementDrawer, type CourseDrawerMode } from '@/components/programs/CourseManagementDrawer'
import { SaGlassCard, SaPageRoot } from '@/pages/super-admin/crud/shared/SuperAdminPrimitives'
import { AnimatedTabular } from '@/pages/super-admin/crud/shared/enterprise/EnterpriseMetrics'
import {
  PROGRAM_KIND_LABEL,
  hasInstructor,
  inferProgramKind,
  isArchivedCourse,
  isEndedCourse,
  isPublishedCourse,
  missingCourseDate,
} from '@/pages/super-admin/crud/programs/programConsoleUtils'
import {
  applyAssignedInstructorToCourse,
  getCourseInstructor,
  instructorLookupMapFromAssignableRows,
  type CourseInstructorLookupRow,
} from '@/utils/courseInstructor'
import { CourseMultiChipSearch, type ChipItem } from './CourseMultiChipSearch'
import type { ElementType, ReactNode } from 'react'

/* ── Lazy-load heavy modals ──────────────────────────────────────────── */
const CourseProgramFormModal = lazy(() =>
  import('./CourseProgramFormModal').then((m) => ({ default: m.CourseProgramFormModal })),
)
const AssignInstructorModal = lazy(() =>
  import('./AssignInstructorModal').then((m) => ({ default: m.AssignInstructorModal })),
)
const ScheduleCourseModal = lazy(() =>
  import('./ScheduleCourseModal').then((m) => ({ default: m.ScheduleCourseModal })),
)

/* ── Types ───────────────────────────────────────────────────────────── */

type CourseVM = Course & {
  _regs:               number
  _kind:               keyof typeof PROGRAM_KIND_LABEL
  _instructorLabel:    string
  _effectiveInstructor: Course['effective_instructor'] | null
  _instructorSource:   'course' | 'learning_path' | null
  _isPaid:             boolean
  _priceNum:           number
  _status:             'published' | 'archived' | 'draft'
  _hasDate:            boolean
  _financeStatus:      'not_required' | 'pending' | 'approved' | 'rejected' | null
}

/** All params sent to the backend — single source of truth for filters + pagination */
type ServerParams = {
  page:         number
  perPage:      number
  chips:        ChipItem[]
  status:       string   // published | draft | archived | ended | scheduled | no_instructor | no_date
  kind:         string   // course | workshop | program | track → program_type
  instructorId: string   // numeric string → instructor_id
  departmentId: string   // numeric string → department_id
  delivery:     string   // online | offline | hybrid → location_type
  sort:         string   // latest | oldest | title_asc | title_desc | price_asc | price_desc
}

type ViewMode = 'cards' | 'table'

/* ── Helpers ─────────────────────────────────────────────────────────── */

function getCourseImage(c: Course): string {
  const m = c as Course & { course_image?: string | null; image_url?: string | null; image?: string | null }
  return String(m.image_url ?? m.course_image ?? m.image ?? '').trim()
}

function vmFromCourse(
  c: Course,
  lookup: Map<number, CourseInstructorLookupRow>,
): CourseVM {
  const effective = (c as Record<string, unknown>).effective_enrollment_count
  const count     = effective != null ? Number(effective) : (c.registrations_count ?? 0)
  const ins = getCourseInstructor(c, { lookupByInstructorId: lookup })
  const n   = typeof c.price === 'string' ? parseFloat(String(c.price)) : Number(c.price)
  const pub = isPublishedCourse(c)
  const arc = isArchivedCourse(c)
  // Resolve the display instructor: course's own, or effective from LP
  const effectiveIns = c.instructor ? null : (c.effective_instructor ?? null)
  const displayLabel = ins.displayName || effectiveIns?.name || ''

  return {
    ...c,
    _regs:                typeof count === 'number' ? count : 0,
    _kind:                inferProgramKind(c),
    _instructorLabel:     displayLabel,
    _effectiveInstructor: effectiveIns,
    _instructorSource:    c.instructor_source ?? null,
    _isPaid:              String(c.type) === 'paid' || (Number.isFinite(n) && n > 0),
    _priceNum:            Number.isFinite(n) ? n : 0,
    _status:              pub ? 'published' : arc ? 'archived' : 'draft',
    _hasDate:             !missingCourseDate(c),
    _financeStatus:       ((c as Record<string, unknown>).finance_approval_status as CourseVM['_financeStatus']) ?? null,
  }
}

function buildApiParams(p: ServerParams): Record<string, unknown> {
  const out: Record<string, unknown> = { page: p.page, per_page: p.perPage, sort: p.sort }
  if (p.chips.length > 0) out.selected = p.chips.map((c) => c.id)
  if (p.status) {
    if      (p.status === 'ended')         out.ended          = 1
    else if (p.status === 'scheduled')     out.has_date       = true
    else if (p.status === 'no_instructor') out.has_instructor = false
    else if (p.status === 'no_date')       out.has_date       = false
    else                                   out.status         = p.status
  }
  if (p.kind)         out.program_type  = p.kind
  if (p.instructorId) out.instructor_id = p.instructorId
  if (p.departmentId) out.department_id = p.departmentId
  if (p.delivery)     out.location_type = p.delivery
  return out
}

/* ── Skeleton ────────────────────────────────────────────────────────── */

function CardSkeleton() {
  return (
    <div className="relative h-72 overflow-hidden rounded-[1.35rem] bg-gradient-to-bl from-[#0C2A4B] to-[#1a2535] p-5">
      <div className="animate-pulse space-y-3">
        <div className="flex items-start justify-between">
          <div className="h-4 w-16 rounded-full bg-white/15" />
          <div className="h-4 w-12 rounded-full bg-white/15" />
        </div>
        <div className="pt-2 space-y-2">
          <div className="h-5 w-3/4 rounded-lg bg-white/20" />
          <div className="h-5 w-1/2 rounded-lg bg-white/15" />
        </div>
        <div className="h-3 w-1/3 rounded bg-white/12" />
        <div className="flex gap-2 pt-1">
          <div className="h-6 w-14 rounded-lg bg-white/12" />
          <div className="h-6 w-14 rounded-lg bg-white/12" />
        </div>
        <div className="absolute bottom-5 left-5 right-5">
          <div className="h-8 rounded-xl bg-white/10" />
          <div className="mt-2 flex gap-1.5">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-7 flex-1 rounded-xl bg-white/10" />)}
          </div>
        </div>
      </div>
    </div>
  )
}

function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => <CardSkeleton key={i} />)}
    </div>
  )
}

/* ── PaginationBar ───────────────────────────────────────────────────── */

function PaginationBar({
  page, lastPage, total, perPage, onPageChange,
}: {
  page: number; lastPage: number; total: number; perPage: number
  onPageChange: (p: number) => void
}) {
  if (lastPage <= 1) return null

  // Build page number array with ellipsis
  const nums: (number | '…')[] = []
  if (lastPage <= 7) {
    for (let i = 1; i <= lastPage; i++) nums.push(i)
  } else {
    nums.push(1)
    if (page > 4)            nums.push('…')
    for (let i = Math.max(2, page - 2); i <= Math.min(lastPage - 1, page + 2); i++) nums.push(i)
    if (page < lastPage - 3) nums.push('…')
    nums.push(lastPage)
  }

  const from = (page - 1) * perPage + 1
  const to   = Math.min(page * perPage, total)

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-3 py-4"
      dir="rtl"
    >
      <p className="text-[12px] font-bold text-slate-500">
        عرض{' '}
        <span className="font-black text-deepBlue">{from}–{to}</span>
        {' '}من أصل{' '}
        <span className="font-black text-deepBlue">{total}</span>
        {' '}برنامج
      </p>

      <div className="flex items-center gap-1 flex-wrap justify-center">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          aria-label="الصفحة السابقة"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-deepBlue transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRight size={15} />
        </button>

        {nums.map((n, i) =>
          n === '…' ? (
            <span key={`e${i}`} className="flex h-9 w-9 items-center justify-center text-[12px] text-slate-400">
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => onPageChange(n as number)}
              aria-current={n === page ? 'page' : undefined}
              className={[
                'flex h-9 w-9 items-center justify-center rounded-xl text-[12px] font-black transition',
                n === page
                  ? 'bg-deepBlue text-white shadow'
                  : 'border border-slate-200 text-deepBlue hover:bg-slate-50',
              ].join(' ')}
            >
              {n}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page === lastPage}
          aria-label="الصفحة التالية"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-deepBlue transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft size={15} />
        </button>
      </div>
    </motion.div>
  )
}

/* ── Page ────────────────────────────────────────────────────────────── */

export default function ProgramsConsolePage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const deepLinkId = Number(searchParams.get('id') || '')

  // ── Server data ──────────────────────────────────────────
  const [loading, setLoading]     = useState(true)
  const [failed, setFailed]       = useState(false)
  const [rows, setRows]           = useState<Course[]>([])
  const [meta, setMeta]           = useState<CoursePageMeta | null>(null)
  const [summary, setSummary]     = useState<CourseSummary | null>(null)

  // ── Aux data (loaded once) ───────────────────────────────
  const [instructorRows, setInstructorRows] = useState<AdminInstructorOption[]>([])
  const [tracks, setTracks]                 = useState<CatalogTrackRow[]>([])
  const [departments, setDepartments]       = useState<{ id: number; name: string }[]>([])
  const [learningPaths, setLearningPaths]   = useState<{ id: number; title: string; status: string }[]>([])

  // ── UI state ─────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    (localStorage.getItem('emc-programs-view') ?? 'cards') as ViewMode,
  )

  // ── Unified server params ────────────────────────────────
  const [params, setParams] = useState<ServerParams>(() => ({
    page:         1,
    perPage:      Number(localStorage.getItem('emc-programs-per-page') || '24'),
    chips:        [],
    status:       '',
    kind:         '',
    instructorId: '',
    departmentId: '',
    delivery:     '',
    sort:         'latest',
  }))

  // ── Modal / drawer state ─────────────────────────────────
  const [drawer,              setDrawer]              = useState<{ course: CourseVM; mode: CourseDrawerMode } | null>(null)
  const [formOpen,            setFormOpen]            = useState(false)
  const [formCourse,          setFormCourse]          = useState<Course | null>(null)
  const [assignCourse,        setAssignCourse]        = useState<Course | null>(null)
  const [scheduleCourse,      setScheduleCourse]      = useState<Course | null>(null)
  const [confirmDeleteCourse, setConfirmDeleteCourse] = useState<Course | null>(null)

  // ── Instructor lookup map ────────────────────────────────
  const instructorLookup = useMemo(() => {
    const mapped: CourseInstructorLookupRow[] = instructorRows.map((r) => ({
      id: r.id, name: r.name, email: r.email, avatar_url: r.avatar_url ?? null,
    }))
    return instructorLookupMapFromAssignableRows(mapped)
  }, [instructorRows])

  // ── View models (current page only, no regMap needed) ───
  const viewModels = useMemo(
    () => rows.map((c) => vmFromCourse(c, instructorLookup)),
    [rows, instructorLookup],
  )

  // ── KPI counts from server summary ──────────────────────
  const kpis = summary ?? {
    total: 0, published: 0, draft: 0, archived: 0,
    no_date: 0, no_instructor: 0, ended: 0, scheduled: 0,
  }

  // ── Load ─────────────────────────────────────────────────
  // Bumped by `load()` so an imperative refresh re-runs the fetch effect below with the
  // current params — the effect stays the single owner of the request.
  const [reloadToken, setReloadToken] = useState(0)

  /** Imperative refresh from an event handler (toolbar, post-save, post-delete). */
  const load = useCallback(() => {
    setReloadToken((n) => n + 1)
  }, [])

  // Re-arm the request state during render whenever the params (or the refresh token)
  // change — react.dev "adjusting state when a prop changes". The initial
  // `loading: true` / `failed: false` already carry the first pass.
  const [seenQuery, setSeenQuery] = useState({ params, reloadToken })
  if (seenQuery.params !== params || seenQuery.reloadToken !== reloadToken) {
    setSeenQuery({ params, reloadToken })
    setLoading(true)
    setFailed(false)
  }

  // Re-load whenever params change or a refresh is requested
  useEffect(() => {
    let alive = true
    void (async () => {
      const result = await fetchAdminCoursesPage(buildApiParams(params))
      if (!alive) return
      if (result) {
        setRows(result.rows)
        setMeta(result.meta)
        if (result.summary) setSummary(result.summary)
        setFailed(false)
      } else {
        setFailed(true)
        setRows([])
        setMeta(null)
      }
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [params, reloadToken])

  // Aux data — one-time on mount
  useEffect(() => {
    void Promise.all([
      fetchAdminInstructors().catch(() => [] as AdminInstructorOption[]),
      fetchTracksStrict().catch(() => ({ ok: false as const })),
      fetchDepartmentOptions().catch(() => [] as { id: number; name: string }[]),
      fetchAdminLearningPaths({ per_page: 200 }).catch(() => null),
    ]).then(([insRows, tr, dep, lpRes]) => {
      setInstructorRows(insRows as AdminInstructorOption[])
      if ((tr as { ok: boolean }).ok) setTracks((tr as { ok: true; rows: CatalogTrackRow[] }).rows)
      setDepartments(dep as { id: number; name: string }[])
      setLearningPaths(
        ((lpRes as { data?: { id: number; title: string; status: string }[] } | null)?.data ?? [])
          .map((lp) => ({ id: lp.id, title: lp.title, status: lp.status })),
      )
    })
  }, [])

  // Deep link: fetch specific course and open drawer
  const deepLinkHandled = useRef(false)
  useEffect(() => {
    if (!deepLinkId || deepLinkHandled.current) return
    deepLinkHandled.current = true
    fetchAdminCoursesPage({ selected: [deepLinkId], per_page: 1 }).then((result) => {
      const match = result?.rows[0]
      if (match) setDrawer({ course: vmFromCourse(match, instructorLookup), mode: 'details' })
      setSearchParams({}, { replace: true })
    })
  }, [deepLinkId, instructorLookup, setSearchParams])

  // ── Param helpers ────────────────────────────────────────

  function setFilter(updates: Partial<Omit<ServerParams, 'page'>>) {
    setParams((prev) => ({ ...prev, ...updates, page: 1 }))
  }

  function goToPage(newPage: number) {
    setParams((prev) => ({ ...prev, page: newPage }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function changePerPage(n: number) {
    localStorage.setItem('emc-programs-per-page', String(n))
    setParams((prev) => ({ ...prev, perPage: n, page: 1 }))
  }

  function toggleView(mode: ViewMode) {
    setViewMode(mode)
    localStorage.setItem('emc-programs-view', mode)
  }

  function resetAllFilters() {
    setParams((prev) => ({
      ...prev, page: 1, chips: [], status: '', kind: '', instructorId: '', departmentId: '', delivery: '', sort: 'latest',
    }))
  }

  // ── Course actions ───────────────────────────────────────

  function openCreate() { setFormCourse(null); setFormOpen(true) }
  function openDetails(c: CourseVM) { setDrawer({ course: c, mode: 'details' }) }
  function openEdit(c: Course) {
    const vm = viewModels.find((r) => r.id === c.id) ?? vmFromCourse(c, instructorLookup)
    setDrawer({ course: vm, mode: 'edit' })
  }

  async function togglePublish(c: Course) {
    const next = !isPublishedCourse(c)
    try {
      await patchCoursePublishState(c.id, next)
      toast.success(next ? 'تم نشر الدورة' : 'أُعيدت الدورة كمسودة')
      void load()
    } catch (e) { toast.error(getApiErrorMessage(e)) }
  }

  async function submitForFinanceReview(c: CourseVM) {
    try {
      await programFinanceApi.submitCourse(c.id)
      toast.success('تم إرسال الدورة للمراجعة المالية')
      void load()
    } catch (e) { toast.error(getApiErrorMessage(e)) }
  }

  async function changeStatus(c: Course, status: 'draft' | 'published' | 'archived') {
    const labels: Record<string, string> = {
      published: 'تم نشر الدورة', draft: 'أُعيدت الدورة كمسودة', archived: 'تم أرشفة الدورة',
    }
    try {
      await patchCourseStatus(c.id, status)
      toast.success(labels[status] ?? 'تم تحديث الحالة')
      void load()
    } catch (e) { toast.error(getApiErrorMessage(e)) }
  }

  function removeCourse(c: Course) { setConfirmDeleteCourse(c) }

  async function doDeleteCourse(c: Course) {
    setConfirmDeleteCourse(null)
    try {
      await deleteCourse(c.id)
      toast.success('تم حذف الدورة')
      void load()
      setDrawer(null)
    } catch (e) { toast.error(getApiErrorMessage(e)) }
  }

  // ── Active filter count ──────────────────────────────────
  const hasActiveFilters = params.chips.length > 0 || params.status || params.kind ||
    params.instructorId || params.departmentId || params.delivery || params.sort !== 'latest'

  // ── Render ───────────────────────────────────────────────

  return (
    <SaPageRoot className="space-y-6 pb-16">

      {/* ── Header ── */}
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-[1.75rem] border border-white/60 bg-gradient-to-bl from-[#0C2A4B] via-[#0F172A] to-[#0077B6] p-[1px] shadow-2xl"
      >
        <div className="rounded-[1.7rem] bg-gradient-to-bl from-[#0C2A4B]/95 via-[#0F172A]/98 to-[#0077B6]/88 px-6 py-8 text-white sm:px-10 sm:py-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 text-right">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/55">EMC · Course OS</p>
              <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-[1.75rem]">إدارة البرامج والدورات</h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-white/78">
                عرض الصفحة الحالية فقط — استخدم البحث والتصفية للتنقل عبر الكتالوج.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void load()}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-4 py-2.5 text-xs font-black backdrop-blur-md transition hover:bg-white/15"
              >
                <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />
                تحديث
              </button>
              <button
                type="button"
                onClick={openCreate}
                className="rounded-2xl bg-[#F28C00] px-5 py-2.5 text-xs font-black text-[#0F172A] shadow-lg shadow-black/20"
              >
                + إنشاء برنامج
              </button>
              <Link
                to="/courses"
                className="rounded-2xl border border-white/35 bg-transparent px-4 py-2.5 text-xs font-black text-white hover:bg-white/10"
              >
                معاينة الكتالوج
              </Link>
            </div>
          </div>

          {/* KPI chips */}
          <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {loading && !summary ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-[72px] animate-pulse rounded-2xl bg-white/10" />
              ))
            ) : (
              <>
                <KpiMini icon={Layers3}       label="إجمالي البرامج"    value={<AnimatedTabular value={kpis.total} />}        tone="sky" />
                <KpiMini icon={BookMarked}    label="منشورة"            value={<AnimatedTabular value={kpis.published} />}    tone="mint" />
                <KpiMini icon={FilePen}       label="مسودة"             value={<AnimatedTabular value={kpis.draft} />}        tone="amber" />
                <KpiMini icon={Archive}       label="مؤرشفة"            value={<AnimatedTabular value={kpis.archived} />}     tone="rose" />
                <KpiMini icon={CalendarClock} label="انتهت"             value={<AnimatedTabular value={kpis.ended} />}        tone="neutral" />
                <KpiMini icon={CalendarCheck} label="مجدولة (لها موعد)" value={<AnimatedTabular value={kpis.scheduled} />}   tone="violet" />
                <KpiMini icon={CalendarX}     label="بدون موعد"         value={<AnimatedTabular value={kpis.no_date} />}      tone="orange" />
              </>
            )}
          </div>
        </div>
      </motion.header>

      {/* ── Search + Filters toolbar ── */}
      <div className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm" dir="rtl">

        {/* Row 1: Multi-chip search + view toggle + per-page */}
        <div className="flex flex-wrap items-center gap-3">
          <CourseMultiChipSearch
            chips={params.chips}
            onAdd={(chip) => setFilter({ chips: [...params.chips, chip] })}
            onRemove={(id) => setFilter({ chips: params.chips.filter((c) => c.id !== id) })}
            className="flex-1 min-w-[220px]"
          />

          {/* View toggle */}
          <div className="flex rounded-xl border border-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleView('cards')}
              title="عرض البطاقات"
              className={[
                'flex h-9 w-9 items-center justify-center transition',
                viewMode === 'cards'
                  ? 'bg-deepBlue text-white'
                  : 'bg-white text-slate-500 hover:bg-slate-50',
              ].join(' ')}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              onClick={() => toggleView('table')}
              title="عرض الجدول"
              className={[
                'flex h-9 w-9 items-center justify-center transition',
                viewMode === 'table'
                  ? 'bg-deepBlue text-white'
                  : 'bg-white text-slate-500 hover:bg-slate-50',
              ].join(' ')}
            >
              <List size={15} />
            </button>
          </div>

          {/* Per-page selector */}
          <select
            value={params.perPage}
            onChange={(e) => changePerPage(Number(e.target.value))}
            className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-[12px] font-bold text-deepBlue outline-none focus:border-[#0077B6]"
            aria-label="عدد النتائج في الصفحة"
          >
            {[12, 24, 48, 96].map((n) => (
              <option key={n} value={n}>{n} لكل صفحة</option>
            ))}
          </select>
        </div>

        {/* Row 2: Dropdown filters + sort + reset */}
        <div className="flex flex-wrap items-center gap-2">
          <MiniSelect
            label="الحالة"
            value={params.status}
            onChange={(v) => setFilter({ status: v })}
            options={[
              { value: '',             labelAr: 'الكل' },
              { value: 'published',    labelAr: 'منشورة' },
              { value: 'draft',        labelAr: 'مسودة' },
              { value: 'archived',     labelAr: 'مؤرشفة' },
              { value: 'ended',        labelAr: 'انتهت' },
              { value: 'scheduled',    labelAr: 'مجدولة' },
              { value: 'no_instructor',labelAr: 'بدون مدرب' },
              { value: 'no_date',      labelAr: 'بدون موعد' },
            ]}
          />
          <MiniSelect
            label="النوع"
            value={params.kind}
            onChange={(v) => setFilter({ kind: v })}
            options={[
              { value: '',         labelAr: 'كل الأنواع' },
              { value: 'course',   labelAr: 'دورة' },
              { value: 'workshop', labelAr: 'ورشة' },
              { value: 'program',  labelAr: 'برنامج' },
              { value: 'track',    labelAr: 'مسار' },
            ]}
          />
          <MiniSelect
            label="التنفيذ"
            value={params.delivery}
            onChange={(v) => setFilter({ delivery: v })}
            options={[
              { value: '',        labelAr: 'كل الأنماط' },
              { value: 'online',  labelAr: 'عن بعد' },
              { value: 'offline', labelAr: 'حضوري' },
              { value: 'hybrid',  labelAr: 'مختلط' },
            ]}
          />
          {instructorRows.length > 0 && (
            <MiniSelect
              label="المدرب"
              value={params.instructorId}
              onChange={(v) => setFilter({ instructorId: v })}
              options={[
                { value: '', labelAr: 'كل المدربين' },
                ...instructorRows.map((r) => ({ value: String(r.id), labelAr: r.name })),
              ]}
            />
          )}
          {departments.length > 0 && (
            <MiniSelect
              label="الإدارة"
              value={params.departmentId}
              onChange={(v) => setFilter({ departmentId: v })}
              options={[
                { value: '', labelAr: 'كل الإدارات' },
                ...departments.map((d) => ({ value: String(d.id), labelAr: d.name })),
              ]}
            />
          )}
          <MiniSelect
            label="الترتيب"
            value={params.sort}
            onChange={(v) => setFilter({ sort: v })}
            options={[
              { value: 'latest',     labelAr: 'الأحدث' },
              { value: 'oldest',     labelAr: 'الأقدم' },
              { value: 'title_asc',  labelAr: 'العنوان أ–ي' },
              { value: 'title_desc', labelAr: 'العنوان ي–أ' },
              { value: 'price_asc',  labelAr: 'السعر ↑' },
              { value: 'price_desc', labelAr: 'السعر ↓' },
            ]}
          />
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="h-10 rounded-xl border border-rose-200 bg-rose-50 px-3 text-[12px] font-black text-rose-600 transition hover:bg-rose-100"
            >
              إعادة ضبط الكل
            </button>
          )}
        </div>

        {/* Active filter chips summary */}
        <AnimatePresence>
          {hasActiveFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap items-center gap-1.5 pt-1"
            >
              <span className="text-[11px] font-black text-slate-400 flex items-center gap-1">
                <Filter size={11} />فلاتر نشطة:
              </span>
              {params.chips.map((c) => (
                <FilterChip key={c.id} label={c.label} onRemove={() => setFilter({ chips: params.chips.filter((x) => x.id !== c.id) })} />
              ))}
              {params.status && <FilterChip label={statusLabel(params.status)} onRemove={() => setFilter({ status: '' })} />}
              {params.kind && <FilterChip label={kindLabel(params.kind)} onRemove={() => setFilter({ kind: '' })} />}
              {params.delivery && <FilterChip label={deliveryLabel(params.delivery)} onRemove={() => setFilter({ delivery: '' })} />}
              {params.instructorId && (
                <FilterChip
                  label={`مدرب: ${instructorRows.find((r) => String(r.id) === params.instructorId)?.name ?? params.instructorId}`}
                  onRemove={() => setFilter({ instructorId: '' })}
                />
              )}
              {params.departmentId && (
                <FilterChip
                  label={`إدارة: ${departments.find((d) => String(d.id) === params.departmentId)?.name ?? params.departmentId}`}
                  onRemove={() => setFilter({ departmentId: '' })}
                />
              )}
              {params.sort !== 'latest' && <FilterChip label={`ترتيب: ${sortLabel(params.sort)}`} onRemove={() => setFilter({ sort: 'latest' })} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Result counter ── */}
      {!loading && !failed && meta && (
        <p className="text-[11px] font-bold text-slate-400" dir="rtl">
          {meta.total === 0
            ? 'لا توجد نتائج'
            : meta.last_page === 1
              ? <>تم العثور على <span className="font-black text-[#0C2A4B]">{meta.total}</span> برنامج</>
              : <>صفحة <span className="font-black text-[#0C2A4B]">{meta.current_page}</span> من <span className="font-black text-[#0C2A4B]">{meta.last_page}</span> — إجمالي <span className="font-black text-[#0C2A4B]">{meta.total}</span> برنامج</>
          }
        </p>
      )}

      {/* ── Main content ── */}
      {failed ? (
        <ErrorPanel title="تعذّر الاتصال بـ /admin/courses" hint="تحقّق من الخادم أو صلاحيات الجلسة." />
      ) : loading ? (
        viewMode === 'cards' ? <SkeletonGrid count={params.perPage > 24 ? 12 : 8} /> : (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        )
      ) : viewModels.length === 0 ? (
        <EmptyPanel title="لا توجد برامج بهذا التصنيف حالياً" subtitle="غيّر التصفية أو أضف برنامجًا جديدًا." />
      ) : viewMode === 'cards' ? (
        <motion.div layout className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {viewModels.map((c, i) => (
              <ProgramBentoCard
                key={c.id}
                c={c}
                index={i}
                onPreview={() => openDetails(c)}
                onEdit={() => openEdit(c)}
                onAssign={() => setAssignCourse(c)}
                onSchedule={() => setScheduleCourse(c)}
                onStatusChange={(s) => void changeStatus(c, s)}
                onDelete={() => void removeCourse(c)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <SaGlassCard className="overflow-hidden ring-1 ring-deepBlue/[0.04]" glow="blue">
          <div className="border-b border-slate-100 bg-white/95 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-black text-deepBlue">جدول العمليات</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">
                <Filter size={14} aria-hidden />
                {meta?.total ?? viewModels.length} برنامج
              </span>
            </div>
          </div>
          <CrudCardTable className="rounded-none border-0 shadow-none ring-0">
            <CrudTable>
              <thead>
                <tr>
                  <Th>العنوان والنوع</Th>
                  <Th>الحالة</Th>
                  <Th>المدرب</Th>
                  <Th>الإدارة / المسار</Th>
                  <Th>السعر</Th>
                  <Th>سعة / تسجيلات</Th>
                  <Th>الموعد</Th>
                  <Th className="text-end">إجراءات</Th>
                </tr>
              </thead>
              <tbody>
                {viewModels.map((c) => {
                  const dateLabel = !c._hasDate
                    ? <span className="font-black text-[#F28C00]">الموعد لم يحدد بعد</span>
                    : String(c.start_date ?? '').slice(0, 10)
                  return (
                    <Tr key={c.id}>
                      <Td>
                        <div className="flex items-center gap-3">
                          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#0077B6]/12 text-[11px] font-black text-deepBlue ring-1 ring-[#0077B6]/25">
                            {initialsFromName(c.title)}
                          </span>
                          <div className="min-w-0 text-right">
                            <p className="truncate font-black text-deepBlue">{c.title}</p>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              <CrudBadge variant="brand">{PROGRAM_KIND_LABEL[c._kind]}</CrudBadge>
                              <code className="truncate text-[10px] text-slate-400">{c.slug}</code>
                            </div>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {c._status === 'published' ? <CrudBadge variant="success">منشور</CrudBadge>
                          : c._status === 'archived'  ? <CrudBadge variant="danger">مؤرشف</CrudBadge>
                          : <CrudBadge variant="default">مسودة</CrudBadge>}
                          {isEndedCourse(c) ? <CourseStatusBadge isEnded placement="inline" className="!text-[10px]" /> : null}
                        </div>
                      </Td>
                      <Td className="text-[12px] font-bold">
                        <CourseInstructorTableCell course={c} lookup={instructorLookup} />
                      </Td>
                      <Td className="max-w-[11rem] text-[11px] font-semibold text-slate-600">
                        {c.is_part_of_learning_path && c.learning_path ? (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${
                            c.learning_path.status === 'published' || c.learning_path.status === 'active'
                              ? 'bg-[#0077B6]/10 text-[#0077B6]'
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            🎓 {c.learning_path.title}
                          </span>
                        ) : (
                          <span className="line-clamp-2">
                            {(c.department_name ?? c.department?.name ?? '—') as string} ·{' '}
                            {(c.track_title ?? c.track?.title ?? '—') as string}
                          </span>
                        )}
                      </Td>
                      <Td className="text-[12px] font-black">
                        {c._isPaid && c._priceNum > 0
                          ? formatEuro(c._priceNum, { locale: 'nl-NL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
                          : 'مجانية'}
                      </Td>
                      <Td className="tabular-nums text-[12px] font-bold">{c.capacity ?? '—'} / {c._regs}</Td>
                      <Td className="text-[11px]">{dateLabel}</Td>
                      <Td className="text-end">
                        <RowActionsMenu
                          ariaLabel={c.title}
                          actions={[
                            { key: 'd',       label: 'عرض التفاصيل',       onClick: () => openDetails(c) },
                            { key: 'e',       label: 'تعديل',              onClick: () => openEdit(c) },
                            { key: 'a',       label: 'تعيين مدرب',         onClick: () => setAssignCourse(c) },
                            { key: 's',       label: 'تحديد موعد',         onClick: () => setScheduleCourse(c) },
                            { key: 'lms-cms', label: 'محتوى الدورة — LMS', onClick: () => navigate(`/dashboard/super-admin/crud/programs/${c.id}/content`) },
                            ...(c._status === 'archived' ? [
                              { key: 'restore', label: 'استعادة (تحويل لمسودة)', onClick: () => void changeStatus(c, 'draft') },
                            ] : c._status === 'published' ? [
                              { key: 'p',    label: 'إلغاء النشر (تحويل لمسودة)', onClick: () => void togglePublish(c), disabled: c.can_deactivate === false },
                              { key: 'arch', label: c.can_archive === false ? 'أرشفة (مقيّد — مرتبط بمسار نشط)' : 'أرشفة', onClick: () => void changeStatus(c, 'archived'), disabled: c.can_archive === false },
                            ] : c._isPaid && c._financeStatus !== 'approved' ? [
                              // Paid course awaiting / needing finance approval
                              ...(c._financeStatus === 'pending' ? [
                                { key: 'p', label: 'بانتظار الاعتماد المالي', onClick: () => {}, disabled: true },
                              ] : c._financeStatus === 'rejected' ? [
                                { key: 'p', label: 'إعادة الإرسال للمراجعة المالية', onClick: () => void submitForFinanceReview(c) },
                              ] : [
                                { key: 'p', label: 'إرسال للمراجعة المالية', onClick: () => void submitForFinanceReview(c) },
                              ]),
                              { key: 'arch', label: c.can_archive === false ? 'أرشفة (مقيّد — مرتبط بمسار نشط)' : 'أرشفة', onClick: () => void changeStatus(c, 'archived'), disabled: c.can_archive === false },
                            ] : [
                              { key: 'p',    label: 'نشر البرنامج',   onClick: () => void togglePublish(c) },
                              { key: 'arch', label: c.can_archive === false ? 'أرشفة (مقيّد — مرتبط بمسار نشط)' : 'أرشفة', onClick: () => void changeStatus(c, 'archived'), disabled: c.can_archive === false },
                            ]),
                            { key: 'x', label: c.can_delete === false ? 'حذف (مقيّد — مرتبط بمسار نشط)' : 'حذف', onClick: () => void removeCourse(c), disabled: c.can_delete === false, destructive: true },
                          ]}
                        />
                      </Td>
                    </Tr>
                  )
                })}
              </tbody>
            </CrudTable>
          </CrudCardTable>
        </SaGlassCard>
      )}

      {/* ── Pagination bar ── */}
      {!loading && !failed && meta && meta.last_page > 1 && (
        <PaginationBar
          page={meta.current_page}
          lastPage={meta.last_page}
          total={meta.total}
          perPage={meta.per_page}
          onPageChange={goToPage}
        />
      )}

      {/* ── Drawers & modals (unchanged) ── */}
      <CourseManagementDrawer
        open={drawer !== null}
        course={drawer?.course ?? null}
        mode={drawer?.mode ?? 'details'}
        onClose={() => setDrawer(null)}
        onModeChange={(m) => setDrawer((prev) => (prev ? { ...prev, mode: m } : null))}
        onSaved={() => void load()}
        onAssignInstructor={drawer ? () => { setAssignCourse(drawer.course) } : undefined}
        tracks={tracks}
        departments={departments}
        learningPaths={learningPaths}
        existingCourses={rows}
      />

      <Suspense fallback={null}>
        <CourseProgramFormModal
          open={formOpen}
          initial={formCourse}
          tracks={tracks}
          departments={departments}
          learningPaths={learningPaths}
          existingCourses={rows}
          onClose={() => setFormOpen(false)}
          onSaved={() => void load()}
          onCreateAnother={() => setFormCourse(null)}
        />
      </Suspense>

      <Suspense fallback={null}>
        <AssignInstructorModal
          open={assignCourse !== null}
          course={assignCourse}
          onClose={() => setAssignCourse(null)}
          onAssigned={(ins) => {
            const target = assignCourse
            if (!target) return
            const merged = applyAssignedInstructorToCourse(target, ins)
            setRows((prev) => prev.map((row) => (row.id === target.id ? merged : row)))
            setDrawer((d) => {
              if (!d || d.course.id !== target.id) return d
              return { ...d, course: vmFromCourse(merged, instructorLookup) }
            })
            setFormCourse((fc) => (fc?.id === target.id ? merged : fc))
          }}
        />
      </Suspense>

      <Suspense fallback={null}>
        <ScheduleCourseModal
          open={scheduleCourse !== null}
          course={scheduleCourse}
          onClose={() => setScheduleCourse(null)}
          onSaved={() => void load()}
        />
      </Suspense>

      <ConfirmDialog
        open={confirmDeleteCourse !== null}
        title="تأكيد حذف الدورة"
        description={confirmDeleteCourse ? `هل أنت متأكد أنك تريد حذف «${confirmDeleteCourse.title}»؟ لا يمكن التراجع عند نجاح الخادم.` : undefined}
        confirmLabel="حذف الدورة"
        cancelLabel="إلغاء"
        variant="danger"
        onConfirm={() => confirmDeleteCourse && void doDeleteCourse(confirmDeleteCourse)}
        onCancel={() => setConfirmDeleteCourse(null)}
      />
    </SaPageRoot>
  )
}

/* ── Filter chip label helpers ───────────────────────────────────────── */

function statusLabel(v: string) {
  const m: Record<string, string> = {
    published: 'منشورة', draft: 'مسودة', archived: 'مؤرشفة',
    ended: 'انتهت', scheduled: 'مجدولة', no_instructor: 'بدون مدرب', no_date: 'بدون موعد',
  }
  return m[v] ?? v
}
function kindLabel(v: string) {
  const m: Record<string, string> = { course: 'دورة', workshop: 'ورشة', program: 'برنامج', track: 'مسار' }
  return m[v] ?? v
}
function deliveryLabel(v: string) {
  const m: Record<string, string> = { online: 'عن بعد', offline: 'حضوري', hybrid: 'مختلط' }
  return m[v] ?? v
}
function sortLabel(v: string) {
  const m: Record<string, string> = {
    latest: 'الأحدث', oldest: 'الأقدم', title_asc: 'العنوان أ–ي',
    title_desc: 'العنوان ي–أ', price_asc: 'السعر ↑', price_desc: 'السعر ↓',
  }
  return m[v] ?? v
}

/* ── FilterChip ──────────────────────────────────────────────────────── */

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-bold text-slate-600"
    >
      {label}
      <button type="button" onClick={onRemove} className="hover:text-rose-600 transition-colors" aria-label={`إزالة ${label}`}>
        ✕
      </button>
    </motion.span>
  )
}

/* ── KpiMini ─────────────────────────────────────────────────────────── */

function KpiMini({ icon: Icon, label, value, tone }: {
  icon: ElementType; label: string; value: ReactNode
  tone: 'sky' | 'mint' | 'amber' | 'rose' | 'violet' | 'orange' | 'neutral'
}) {
  const ring: Record<typeof tone, string> = {
    sky: 'ring-sky-400/30', mint: 'ring-emerald-400/30', amber: 'ring-amber-400/35',
    rose: 'ring-rose-400/35', violet: 'ring-violet-400/35', orange: 'ring-[#F28C00]/40',
    neutral: 'ring-white/25',
  }
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/10 px-4 py-3 shadow-inner shadow-black/10 ring-1 ${ring[tone]} backdrop-blur-md`}>
      <div className="flex items-center justify-between gap-2">
        <Icon className="size-5 text-white/80" aria-hidden />
        <span className="text-2xl font-black tabular-nums text-white">{value}</span>
      </div>
      <p className="mt-2 text-[10px] font-black uppercase leading-snug tracking-wide text-white/60">{label}</p>
    </div>
  )
}

/* ── ProgramBentoCard ────────────────────────────────────────────────── */

const ProgramBentoCard = memo(function ProgramBentoCard({
  c, index, onPreview, onEdit, onAssign, onSchedule, onStatusChange, onDelete,
}: {
  c: CourseVM
  index: number
  onPreview: () => void
  onEdit: () => void
  onAssign: () => void
  onSchedule: () => void
  onStatusChange: (status: 'draft' | 'published' | 'archived') => void
  onDelete: () => void
}) {
  const imgUrl = getCourseImage(c)

  const accentColor =
    index % 3 === 0 ? '#0077B6'
    : index % 3 === 1 ? '#F28C00'
    : '#0C2A4B'

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: Math.min(index * 0.03, 0.18) }}
      className="flex flex-col overflow-hidden rounded-[1.35rem] border border-deepBlue/[0.08] bg-white shadow-md hover:shadow-lg transition-shadow"
    >
      {/* Thumbnail */}
      <div className="relative h-32 shrink-0 overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
        {imgUrl ? (
          <img
            src={imgUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div className="h-full w-full" style={{ background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}44)` }}>
            <span className="flex h-full items-center justify-center text-3xl font-black opacity-30" style={{ color: accentColor }}>
              {c.title?.charAt(0) ?? '؟'}
            </span>
          </div>
        )}
        <div className="absolute inset-x-0 top-2 flex items-center justify-between px-3">
          <span className="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-white shadow-sm" style={{ background: accentColor }}>
            {PROGRAM_KIND_LABEL[c._kind]}
          </span>
          <div className="flex gap-1">
            {c._status === 'published' ? <CrudBadge variant="success">منشور</CrudBadge>
            : c._status === 'archived'  ? <CrudBadge variant="danger">مؤرشف</CrudBadge>
            : <CrudBadge variant="default">مسودة</CrudBadge>}
            {isEndedCourse(c) ? <CourseStatusBadge isEnded placement="inline" className="!text-[10px]" /> : null}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-black leading-snug text-deepBlue">{c.title}</h3>

        {/* Learning path badge */}
        {c.is_part_of_learning_path && c.learning_path && (
          <div className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${
            c.learning_path.status === 'published' || c.learning_path.status === 'active'
              ? 'bg-[#0077B6]/10 text-[#0077B6]'
              : 'bg-slate-100 text-slate-500'
          }`}>
            🎓 ضمن مسار: {c.learning_path.title}
          </div>
        )}

        {/* Lock badge */}
        {c.can_delete === false && (
          <div
            className="mt-1 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700"
            title={c.lock_reason ?? 'هذا المحتوى مستخدم داخل مسار تعليمي نشط.'}
          >
            🔒 مرتبط بمسار تعليمي
          </div>
        )}

        <p className="mt-2 text-[11px] font-semibold text-slate-500">
          {hasInstructor(c) ? (
            <>المدرب: {c._instructorLabel}</>
          ) : c._effectiveInstructor ? (
            <span className="inline-flex flex-wrap items-center gap-1">
              <span>أ. {c._effectiveInstructor.name}</span>
              <span className="rounded-full bg-[#0077B6]/10 px-1.5 py-px text-[9px] font-black text-[#0077B6]">
                من المسار التعليمي
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-amber-600">
              <UserX size={12} aria-hidden /> بدون مدرب
            </span>
          )}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold text-slate-600">
          <span className="rounded-lg bg-slate-100 px-2 py-0.5">سعة: {c.capacity ?? '—'}</span>
          <span className="rounded-lg bg-slate-100 px-2 py-0.5">تسجيلات: {c._regs}</span>
          <span className="rounded-lg bg-slate-100 px-2 py-0.5">
            {c._isPaid && c._priceNum > 0
              ? formatEuro(c._priceNum, { locale: 'nl-NL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
              : 'مجانية'}
          </span>
        </div>
        <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-600">
          {!c._hasDate
            ? <span className="text-amber-600">الموعد لم يحدد بعد</span>
            : <><CalendarClock className="mb-0.5 inline size-3 opacity-70" aria-hidden /> {String(c.start_date ?? '').slice(0, 10)}</>}
        </div>
      </div>

      <div className="mt-auto space-y-2.5 border-t border-slate-100 p-4">
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {(['published', 'draft', 'archived'] as const).map((s) => {
            const isLocked = s === 'archived' ? c.can_archive === false : s === 'draft' ? c.can_deactivate === false : false
            return (
              <button
                key={s}
                type="button"
                onClick={() => !isLocked && c._status !== s && onStatusChange(s)}
                disabled={isLocked && c._status !== s}
                title={isLocked ? c.lock_reason ?? undefined : undefined}
                className={[
                  'flex-1 rounded-lg py-1 text-[10px] font-black transition',
                  c._status === s
                    ? s === 'published' ? 'bg-emerald-500 text-white shadow'
                      : s === 'archived' ? 'bg-slate-500 text-white shadow'
                      : 'bg-white text-deepBlue shadow'
                    : isLocked ? 'cursor-not-allowed text-slate-300' : 'text-slate-500 hover:text-slate-700',
                ].join(' ')}
              >
                {s === 'published' ? 'منشور' : s === 'draft' ? 'مسودة' : 'مؤرشف'}
              </button>
            )
          })}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={onPreview}  className="rounded-xl bg-deepBlue/[0.07] px-3 py-1.5 text-[11px] font-black text-deepBlue hover:bg-deepBlue/[0.12]">تفاصيل</button>
          <button type="button" onClick={onEdit}     className="rounded-xl bg-[#0077B6]/10 px-3 py-1.5 text-[11px] font-black text-[#0077B6] hover:bg-[#0077B6]/20">تعديل</button>
          <button type="button" onClick={onAssign}   className="rounded-xl bg-slate-100 px-3 py-1.5 text-[11px] font-black text-slate-600 hover:bg-slate-200">تعيين</button>
          <button type="button" onClick={onSchedule} className="rounded-xl bg-slate-100 px-3 py-1.5 text-[11px] font-black text-slate-600 hover:bg-slate-200">موعد</button>
          <button
            type="button"
            onClick={c.can_delete === false ? undefined : onDelete}
            title={c.lock_reason ?? undefined}
            disabled={c.can_delete === false}
            className={`rounded-xl border px-3 py-1.5 text-[11px] font-black transition ${
              c.can_delete === false
                ? 'cursor-not-allowed border-slate-100 text-slate-300 opacity-50'
                : 'border-rose-100 text-rose-600 hover:bg-rose-50'
            }`}
          >
            {c.can_delete === false ? '🔒 حذف' : 'حذف'}
          </button>
        </div>
      </div>
    </motion.article>
  )
})

/* ── CourseInstructorTableCell ───────────────────────────────────────── */

function CourseInstructorTableCell({
  course, lookup,
}: {
  course: CourseVM
  lookup: Map<number, CourseInstructorLookupRow>
}) {
  const [imgFailed, setImgFailed] = useState(false)
  const resolved = getCourseInstructor(course, { lookupByInstructorId: lookup })

  // Fallback to effective_instructor (inherited from LP) when course has no own instructor
  const effectiveIns = !hasInstructor(course) ? course._effectiveInstructor : null
  const isInherited  = course._instructorSource === 'learning_path'

  const displayName  = resolved.displayName || effectiveIns?.name || ''
  const displayEmail = resolved.email || effectiveIns?.email || ''
  const avatarUrl    = resolved.avatarUrl || effectiveIns?.profile_photo_url || null

  // Clear the broken-image flag during render when the URL changes — react.dev
  // "adjusting state when a prop changes" (it already starts `false` on mount).
  const [seenAvatarUrl, setSeenAvatarUrl] = useState(avatarUrl)
  if (seenAvatarUrl !== avatarUrl) {
    setSeenAvatarUrl(avatarUrl)
    setImgFailed(false)
  }

  if (!hasInstructor(course) && !effectiveIns) {
    return <span className="font-bold text-amber-700">بدون مدرب</span>
  }

  const showImg = Boolean(avatarUrl && !imgFailed)
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#0077B6]/12 text-[11px] font-black text-deepBlue ring-1 ring-[#0077B6]/22">
        {showImg && avatarUrl
          ? <img src={avatarUrl} alt="" loading="lazy" decoding="async"
              className="h-full w-full object-cover" referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)} />
          : initialsFromName(displayName)}
      </span>
      <div className="min-w-0 text-right">
        <p className="truncate font-bold text-deepBlue">{displayName}</p>
        {displayEmail && <p className="truncate text-[10px] font-semibold text-slate-500 dir-ltr">{displayEmail}</p>}
        {isInherited && (
          <span className="mt-0.5 inline-block rounded-full bg-[#0077B6]/10 px-1.5 py-px text-[9px] font-black text-[#0077B6]">
            من المسار التعليمي
          </span>
        )}
      </div>
    </div>
  )
}
