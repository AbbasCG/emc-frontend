import React, { lazy, Suspense, useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  Check,
  ClipboardList,
  ExternalLink,
  FileText,
  GraduationCap,
  Layers,
  Loader2,
  Settings,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react'
import { fetchAdminCourseDetail, type AdminCourseDetail } from '@/api/adminCoursesApi'
import { fetchEligibility, type EligibilityResponse } from '@/api/certificatesApi'
import { CourseStudentsTab } from '@/components/programs/CourseStudentsTab'
import { CrudBadge } from '@/pages/super-admin/crud/shared/Badge'
import { EntityDetailDrawer, EntityDetailField, EntityDetailSection } from '@/pages/super-admin/crud/shared/EntityDetailDrawer'
import { isEndedCourse, inferProgramKind, PROGRAM_KIND_LABEL } from '@/pages/super-admin/crud/programs/programConsoleUtils'
import CourseStatusBadge from '@/components/shared/CourseStatusBadge'
import { getCourseInstructor } from '@/utils/courseInstructor'
import { formatEuro } from '@/utils/currency'
import {
  formatEnglishCount,
  formatEnglishDate,
  formatEnglishDetailText,
  formatEnglishPercent,
  formatEnglishTime,
} from '@/utils/formatEnglishNumber'
import type { Course } from '@/types'
import type { CatalogTrackRow } from '@/api/superAdminCatalogApi'
import type { OpsDepartmentOption } from '@/api/adminCoursesApi'
import { initialsFromName } from '@/pages/super-admin/crud/shared/initials'
import { adminRoleLabelAr } from '@/pages/super-admin/users/assignableRoles'

const CourseProgramFormModal = lazy(() =>
  import('@/pages/super-admin/crud/programs/CourseProgramFormModal').then((m) => ({ default: m.CourseProgramFormModal })),
)

const AddStudentModal = lazy(() =>
  import('@/pages/super-admin/crud/programs/AddStudentModal').then((m) => ({ default: m.AddStudentModal })),
)

export type CourseDrawerMode = 'details' | 'edit'

type Props = {
  open: boolean
  course: Course | null
  mode: CourseDrawerMode
  onClose: () => void
  onModeChange: (mode: CourseDrawerMode) => void
  onSaved: () => void
  onAssignInstructor?: () => void
  tracks: CatalogTrackRow[]
  departments: OpsDepartmentOption[]
  learningPaths: { id: number; title: string; status: string }[]
  existingCourses: Course[]
}

function fmtDate(v: string | null | undefined): string {
  return formatEnglishDate(v, 'short')
}

type UserRef = { id: number; name: string; email?: string; role?: string }

function CreatorCard({
  label,
  user,
  date,
  dateLabel,
}: {
  label: string
  user: UserRef | null | undefined
  date: string | null | undefined
  dateLabel: string
}) {
  const initials = user?.name ? initialsFromName(user.name) : '؟'
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[#0C2A4B]/8 bg-gradient-to-br from-white to-slate-50 p-3.5" dir="rtl">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#0077B6]/10 text-[11px] font-black text-[#0077B6] ring-1 ring-[#0077B6]/20 select-none">
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-wide text-[#0C2A4B]/45">{label}</p>
        {user ? (
          <>
            <p className="mt-0.5 font-black text-[13px] text-[#0C2A4B]">{user.name}</p>
            {user.email && (
              <p className="mt-0.5 text-[11px] font-semibold text-slate-500" dir="ltr" style={{ unicodeBidi: 'plaintext' }}>
                {user.email}
              </p>
            )}
            {user.role && (
              <span className="mt-1 inline-block rounded-full bg-[#0077B6]/8 px-2 py-0.5 text-[10px] font-black text-[#0077B6]">
                {adminRoleLabelAr(user.role)}
              </span>
            )}
          </>
        ) : (
          <p className="mt-0.5 text-[12px] font-semibold text-slate-400">غير معروف</p>
        )}
        {date && (
          <p className="mt-1.5 text-[10px] text-slate-400">
            {dateLabel}: <span className="font-bold text-[#0C2A4B]/60">{fmtDate(date)}</span>
          </p>
        )}
      </div>
    </div>
  )
}

function MetricTile({ label, value, icon: Icon }: { label: string; value: ReactNode; icon: React.ElementType }) {
  return (
    <div className="rounded-xl border border-[#0C2A4B]/8 bg-gradient-to-br from-white to-[#f8fafc] p-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-wide text-[#0C2A4B]/45">{label}</p>
        <Icon size={14} className="text-[#0077B6]" />
      </div>
      <p className="mt-2 text-lg font-black tabular-nums text-[#0C2A4B]" dir="ltr">{value}</p>
    </div>
  )
}

function ListPanel({
  empty,
  items,
  render,
  manageHref,
  manageLabel,
}: {
  empty: string
  items: unknown[]
  render: (item: never, i: number) => ReactNode
  manageHref?: string
  manageLabel?: string
}) {
  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-[#0C2A4B]/12 bg-[#f8fafc] px-5 py-10 text-center">
        <p className="text-sm font-black text-[#0C2A4B]/60">{empty}</p>
        {manageHref ?
          <Link to={manageHref} className="mt-3 inline-flex items-center gap-1 text-[11px] font-black text-[#0077B6] hover:underline">
            {manageLabel ?? 'إدارة'} <ArrowRight size={12} />
          </Link>
        : null}
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {items.map((item, i) => render(item as never, i))}
      {manageHref ?
        <Link to={manageHref} className="inline-flex items-center gap-1 pt-2 text-[11px] font-black text-[#0077B6] hover:underline">
          {manageLabel ?? 'عرض الكل'} <ExternalLink size={12} />
        </Link>
      : null}
    </div>
  )
}

// ── Certificates Tab ──────────────────────────────────────────────────────────

/** Pure I/O — shared by the mount effect and the retry button, neither touching state. */
function fetchCourseEligibility(courseId: number): Promise<EligibilityResponse> {
  return fetchEligibility({ related_type: 'course', related_id: courseId, certificate_type: 'course_completion' })
}

function CourseCertificatesTab({ courseId }: { courseId: number }) {
  const navigate = useNavigate()
  const [data, setData]       = useState<EligibilityResponse | null>(null)
  const [loading, setLoading] = useState(Boolean(courseId))
  const [error, setError]     = useState<string | null>(null)

  // Re-arm the loading state during render when the course changes (react.dev
  // "adjusting state when a prop changes"), so the fetch effect below never has to.
  const [seenCourseId, setSeenCourseId] = useState(courseId)
  if (seenCourseId !== courseId) {
    setSeenCourseId(courseId)
    if (courseId) setLoading(true)
  }

  useEffect(() => {
    if (!courseId) return
    let alive = true
    void (async () => {
      try {
        const res = await fetchCourseEligibility(courseId)
        if (alive) setData(res)
      } catch {
        if (alive) setError('تعذر تحميل بيانات الشهادات')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [courseId])

  const issuePath = `/dashboard/admin/certificates/issue?type=course_completion&related_type=course&related_id=${courseId}`

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-7 animate-spin text-[#0077B6]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center">
        <p className="text-[13px] font-black text-red-600">{error}</p>
        <button type="button" onClick={() => {
          setError(null)
          setLoading(true)
          fetchCourseEligibility(courseId)
            .then(setData).catch(() => setError('تعذر تحميل بيانات الشهادات')).finally(() => setLoading(false))
        }} className="mt-3 rounded-lg bg-red-100 px-3 py-1.5 text-[11px] font-black text-red-600 hover:bg-red-200">
          إعادة المحاولة
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* Stats row */}
      {data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { label: 'إجمالي الطلاب',  value: data.summary.total,      cls: 'bg-slate-50 border-slate-200 text-[#1E2D40]' },
            { label: 'المؤهلون',        value: data.summary.eligible,   cls: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
            { label: 'غير المؤهلين',   value: data.summary.ineligible,  cls: 'bg-amber-50 border-amber-100 text-amber-700' },
          ].map(({ label, value, cls }) => (
            <div key={label} className={`rounded-xl border p-3.5 ${cls}`}>
              <p className="text-[10px] font-black uppercase tracking-wide opacity-60">{label}</p>
              <p className="mt-1 text-xl font-black tabular-nums" dir="ltr">{formatEnglishCount(value)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => navigate(issuePath)}
          className="flex items-center gap-1.5 rounded-xl bg-[#0077B6] px-4 py-2.5 text-[12px] font-black text-white shadow-md shadow-[#0077B6]/20 hover:bg-[#1E7FAD]"
        >
          <Award size={13} /> إصدار الشهادات
        </button>
        <Link
          to={`/dashboard/admin/certificates?course_id=${courseId}`}
          className="flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-[12px] font-black text-[#64748B] hover:bg-slate-50"
        >
          عرض شهادات الدورة
        </Link>
        {data && data.summary.eligible > 0 && (
          <button
            type="button"
            onClick={() => navigate(issuePath)}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[12px] font-black text-emerald-700 hover:bg-emerald-100"
          >
            <Check size={13} strokeWidth={3} /> إصدار للمؤهلين ({formatEnglishCount(data.summary.eligible)})
          </button>
        )}
      </div>

      {/* Students table */}
      {data && data.students.length > 0 && (
        <div className="space-y-2">
          <p className="text-[12px] font-black text-[#1E2D40]">المتعلمون وحالة الأهلية</p>
          <div className="max-h-72 overflow-y-auto rounded-xl border border-[#E2E8F0]">
            {data.students.map((s) => (
              <div key={s.user.id} className="flex items-center gap-3 border-b border-[#F1F5F9] px-4 py-3 last:border-0 hover:bg-slate-50">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0077B6] to-[#1E2D40] text-[10px] font-black text-white">
                  {s.user.name.slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-[12px] font-black text-[#1E2D40]">{s.user.name}</p>
                  <p className="truncate text-[10px] text-[#94A3B8]">{s.user.email}</p>
                </div>
                <div className="hidden sm:flex items-center gap-3 text-[10px] text-[#64748B]">
                  <span dir="ltr"><TrendingUp size={10} className="inline ml-0.5" />{formatEnglishPercent(s.progress_pct ?? s.progress ?? 0)}</span>
                </div>
                {s.existing_certificate ? (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-700">صدرت</span>
                ) : s.is_eligible ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">مؤهل</span>
                ) : (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700" title={s.reason ?? ''}>غير مؤهل</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {data && data.students.length === 0 && (
        <div className="rounded-xl border border-dashed border-[#E2E8F0] p-8 text-center">
          <Users size={24} className="mx-auto mb-2 text-[#94A3B8]" />
          <p className="text-[12px] font-black text-[#94A3B8]">لا يوجد طلاب مسجلون في هذه الدورة</p>
        </div>
      )}
    </div>
  )
}

// ── Main Drawer ───────────────────────────────────────────────────────────────

export function CourseManagementDrawer({
  open,
  course,
  mode,
  onClose,
  onModeChange,
  onSaved,
  onAssignInstructor,
  tracks,
  departments,
  learningPaths,
  existingCourses,
}: Props) {
  const shouldLoadDetail = open && course !== null && (mode === 'details' || mode === 'edit')

  const [detail, setDetail] = useState<AdminCourseDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(shouldLoadDetail)
  const [addStudentOpen, setAddStudentOpen] = useState(false)
  const [studentsRefreshKey, setStudentsRefreshKey] = useState(0)

  // Re-arm the loading state (and drop the add-student modal on close) during render when
  // the drawer's inputs change — react.dev "adjusting state when a prop changes". Keeps the
  // fetch effect below free of synchronous state writes.
  const [seenSource, setSeenSource] = useState({ open, course, mode })
  if (seenSource.open !== open || seenSource.course !== course || seenSource.mode !== mode) {
    setSeenSource({ open, course, mode })
    if (shouldLoadDetail) setLoadingDetail(true)
    if (!open) setAddStudentOpen(false)
  }

  /** Imperative refresh from event handlers — outside any effect, so it may flip to the
   *  loading state synchronously. */
  const loadDetail = useCallback(async () => {
    if (!course?.id) return
    setLoadingDetail(true)
    try {
      setDetail(await fetchAdminCourseDetail(course.id))
    } catch {
      setDetail(course as AdminCourseDetail)
    } finally {
      setLoadingDetail(false)
    }
  }, [course])

  useEffect(() => {
    if (!open || !course || (mode !== 'details' && mode !== 'edit')) return
    const courseId = course.id
    let alive = true
    void (async () => {
      try {
        const next = await fetchAdminCourseDetail(courseId)
        if (alive) setDetail(next)
      } catch {
        if (alive) setDetail(course as AdminCourseDetail)
      } finally {
        if (alive) setLoadingDetail(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [open, course, mode])

  if (!course) return null

  const d = detail ?? (course as AdminCourseDetail)
  const kind = inferProgramKind(d)
  const ins = getCourseInstructor(d)
  const contentPath = `/dashboard/admin/lms/courses/${course.id}/content`
  const lmsSessionsPath = '/dashboard/admin/lms/sessions'
  const lmsAssignmentsPath = '/dashboard/admin/lms/assignments'

  const statusBadge =
    isEndedCourse(d) ? <CourseStatusBadge isEnded placement="inline" />
    : d.status === 'published' ? <CrudBadge variant="success">منشور</CrudBadge>
    : d.status === 'archived' ? <CrudBadge variant="danger">مؤرشف</CrudBadge>
    : <CrudBadge variant="default">مسودة</CrudBadge>

  const overviewTab = loadingDetail ?
    <div className="flex items-center justify-center py-20">
      <Loader2 className="size-8 animate-spin text-[#0077B6]" />
    </div>
  : (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile label="الطلاب" value={formatEnglishCount(d.students_count ?? d.effective_enrollment_count ?? d.registrations_count ?? 0)} icon={Users} />
        <MetricTile label="التسجيلات" value={formatEnglishCount(d.registrations_count ?? 0)} icon={UserCheck} />
        <MetricTile label="الجلسات" value={formatEnglishCount(d.sessions_count ?? 0)} icon={Calendar} />
        <MetricTile label="الواجبات" value={formatEnglishCount(d.assignments_count ?? 0)} icon={ClipboardList} />
        <MetricTile label="المواد" value={formatEnglishCount(d.materials_count ?? 0)} icon={FileText} />
        <MetricTile label="متوسط التقدم" value={formatEnglishPercent(d.average_progress ?? 0)} icon={GraduationCap} />
        <MetricTile label="نسبة الحضور" value={formatEnglishPercent(d.attendance_summary?.present_pct ?? 0)} icon={UserCheck} />
        <MetricTile label="السعر" value={
          String(d.type) === 'paid' && Number(d.price) > 0
            ? formatEuro(Number(d.price), { locale: 'nl-NL', minimumFractionDigits: 0 })
            : 'مجانية'
        } icon={BookOpen} />
      </div>

      <EntityDetailSection title="المعلومات الأساسية" icon={<BookOpen className="size-4" />}>
        <dl className="grid gap-3 sm:grid-cols-2">
          <EntityDetailField label="العنوان" value={d.title} />
          <EntityDetailField label="Slug" value={<code className="text-[12px]">{d.slug}</code>} />
          <EntityDetailField label="الحالة" value={statusBadge} />
          <EntityDetailField label="النشر" value={d.is_published || d.status === 'published' ? 'منشور' : 'غير منشور'} />
          <EntityDetailField label="نوع البرنامج" value={PROGRAM_KIND_LABEL[kind]} />
          <EntityDetailField label="نوع التسعير" value={String(d.type) === 'paid' ? 'مدفوع' : 'مجاني'} />
          <EntityDetailField label="المدة" value={formatEnglishDetailText(d.computed_duration_label ?? d.duration)} />
          <EntityDetailField label="ساعات التدريب" value={formatEnglishDetailText(d.training_hours ?? d.hours_count)} />
        </dl>
      </EntityDetailSection>

      <EntityDetailSection title="التصنيف والمسار" icon={<Layers className="size-4" />}>
        <dl className="grid gap-3 sm:grid-cols-2">
          <EntityDetailField label="الإدارة / القسم" value={d.department?.name ?? d.department_name ?? '—'} />
          <EntityDetailField label="البرنامج / المسار" value={d.track?.title ?? d.track_title ?? d.category ?? '—'} />
          <EntityDetailField label="المسار التعليمي" value={d.learning_path?.title ?? '—'} />
          <EntityDetailField label="المدرب" value={ins.displayName || '—'} />
        </dl>
      </EntityDetailSection>

      <EntityDetailSection title="الجدولة والتسليم" icon={<Calendar className="size-4" />}>
        <dl className="grid gap-3 sm:grid-cols-2">
          <EntityDetailField label="تاريخ البداية" value={fmtDate(d.start_date as string)} />
          <EntityDetailField label="تاريخ النهاية" value={fmtDate(d.end_date as string)} />
          <EntityDetailField label="وقت البداية" value={formatEnglishTime(d.start_time as string)} />
          <EntityDetailField label="نوع الموقع" value={d.location_type ?? d.delivery_type ?? '—'} />
          <EntityDetailField label="الموقع" value={d.location ?? '—'} />
          <EntityDetailField label="رابط الاجتماع" value={
            d.meeting_link ?
              <a href={d.meeting_link} target="_blank" rel="noreferrer" className="text-[#0077B6] hover:underline break-all">{d.meeting_link}</a>
            : '—'
          } />
          <EntityDetailField label="مجتمع واتساب" value={
            d.whatsapp_community_url ?
              <a href={d.whatsapp_community_url} target="_blank" rel="noreferrer" className="text-[#0077B6] hover:underline">فتح الرابط</a>
            : '—'
          } />
          <EntityDetailField label="السعة" value={formatEnglishDetailText(d.capacity ?? d.seats_count)} />
        </dl>
      </EntityDetailSection>

      {(d.short_description || d.description) ?
        <EntityDetailSection title="الوصف">
          <p className="text-[13px] font-medium leading-relaxed text-[#0C2A4B]/70">
            {d.short_description ?? d.description}
          </p>
        </EntityDetailSection>
      : null}

      <EntityDetailSection title="معلومات الإنشاء والإدارة" icon={<UserCheck className="size-4" />}>
        <div className="space-y-4">
          <CreatorCard
            label="أنشأه"
            user={(d as Record<string, unknown>).created_by as UserRef | null | undefined}
            date={d.created_at as string}
            dateLabel="تاريخ الإنشاء"
          />
          <CreatorCard
            label="آخر تعديل بواسطة"
            user={(d as Record<string, unknown>).updated_by as UserRef | null | undefined}
            date={d.updated_at as string}
            dateLabel="تاريخ آخر تعديل"
          />
        </div>
      </EntityDetailSection>
    </div>
  )

  const tabs = [
    { id: 'overview', labelAr: 'نظرة عامة', content: overviewTab },
    {
      id: 'students',
      labelAr: 'الطلاب',
      content: (
        <CourseStudentsTab
          key={studentsRefreshKey}
          courseId={course.id}
          onRequestAdd={() => setAddStudentOpen(true)}
          onChanged={() => {
            void loadDetail()
            setStudentsRefreshKey((k) => k + 1)
            // Registration counts shown on the programs overview list must
            // reflect a removal immediately, not only after the drawer closes.
            onSaved()
          }}
        />
      ),
    },
    {
      id: 'sessions',
      labelAr: 'الجلسات',
      content: (
        <ListPanel
          empty="لا توجد جلسات مسجّلة لهذه الدورة"
          items={d.sessions ?? []}
          manageHref={lmsSessionsPath}
          manageLabel="إدارة الجلسات"
          render={(s: AdminCourseDetail['sessions'] extends (infer U)[] | undefined ? U : never) => (
            <div key={s.id} className="rounded-xl border border-[#0C2A4B]/8 px-4 py-3">
              <p className="text-[13px] font-black text-[#0C2A4B]">{s.title ?? 'جلسة'}</p>
              <p className="mt-1 text-[11px] text-[#0C2A4B]/50">
                {fmtDate(s.session_date)} · {formatEnglishTime(s.start_time)} · {s.status}
              </p>
            </div>
          )}
        />
      ),
    },
    {
      id: 'assignments',
      labelAr: 'الواجبات',
      content: (
        <ListPanel
          empty="لا توجد واجبات لهذه الدورة"
          items={d.assignments ?? []}
          manageHref={lmsAssignmentsPath}
          manageLabel="إدارة الواجبات"
          render={(a: NonNullable<AdminCourseDetail['assignments']>[number]) => (
            <div key={a.id} className="rounded-xl border border-[#0C2A4B]/8 px-4 py-3">
              <p className="text-[13px] font-black text-[#0C2A4B]">{a.title}</p>
              <p className="mt-1 text-[11px] text-[#0C2A4B]/50">استحقاق: {fmtDate(a.due_date)}</p>
            </div>
          )}
        />
      ),
    },
    {
      id: 'materials',
      labelAr: 'المواد',
      content: (
        <ListPanel
          empty="لا توجد مواد تعليمية"
          items={d.materials ?? []}
          manageHref={contentPath}
          manageLabel="إدارة المحتوى"
          render={(m: NonNullable<AdminCourseDetail['materials']>[number]) => (
            <div key={m.id} className="flex items-center justify-between rounded-xl border border-[#0C2A4B]/8 px-4 py-3">
              <p className="text-[13px] font-black text-[#0C2A4B]">{m.title}</p>
              <span className="text-[10px] font-bold text-[#0C2A4B]/45">{m.type ?? 'ملف'}</span>
            </div>
          )}
        />
      ),
    },
    {
      id: 'instructors',
      labelAr: 'المدربون',
      content: (
        <EntityDetailSection title="المدرب المعيّن">
          <dl className="grid gap-3 sm:grid-cols-2">
            <EntityDetailField label="الاسم" value={ins.displayName || 'لم يُعيَّن مدرب'} />
            <EntityDetailField label="البريد" value={ins.email ?? '—'} />
          </dl>
          {onAssignInstructor ?
            <button
              type="button"
              onClick={onAssignInstructor}
              className="mt-3 rounded-xl bg-[#0077B6]/10 px-4 py-2 text-[11px] font-black text-[#0077B6] hover:bg-[#0077B6]/15"
            >
              تعيين / تغيير المدرب
            </button>
          : null}
        </EntityDetailSection>
      ),
    },
    {
      id: 'registrations',
      labelAr: 'التسجيلات',
      content: (
        <ListPanel
          empty="لا توجد تسجيلات"
          items={d.registrations ?? []}
          manageHref="/dashboard/admin/registrations"
          manageLabel="إدارة التسجيلات"
          render={(r: NonNullable<AdminCourseDetail['registrations']>[number]) => (
            <div key={r.id} className="rounded-xl border border-[#0C2A4B]/8 px-4 py-3">
              <p className="text-[13px] font-black text-[#0C2A4B]">{r.student ?? r.email ?? '—'}</p>
              <p className="mt-1 text-[11px] text-[#0C2A4B]/50">{r.status} · {fmtDate(r.submitted_at)}</p>
            </div>
          )}
        />
      ),
    },
    {
      id: 'certificates',
      labelAr: 'الشهادات',
      content: <CourseCertificatesTab courseId={course.id} />,
    },
    {
      id: 'settings',
      labelAr: 'الإعدادات',
      content: (
        <EntityDetailSection title="إعدادات الدورة" icon={<Settings className="size-4" />}>
          <dl className="grid gap-3 sm:grid-cols-2">
            <EntityDetailField label="التسجيل مفتوح" value={d.registration_open !== false ? 'نعم' : 'لا'} />
            <EntityDetailField label="حالة التسجيل" value={d.registration_status ?? '—'} />
            <EntityDetailField
              label="رمز التسجيل"
              value={
                d.requires_registration_code
                  ? (d.registration_code ? `مفعّل · ${formatEnglishDetailText(d.registration_code)}` : 'مفعّل · —')
                  : 'غير مطلوب'
              }
            />
            <EntityDetailField label="اختبار تحديد المستوى" value={d.requires_placement_test ? 'مطلوب' : 'غير مطلوب'} />
            <EntityDetailField label="الشهادة" value={d.certificate_available ? 'متاحة' : 'غير متاحة'} />
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to={contentPath} className="rounded-xl border border-[#0077B6]/30 bg-[#0077B6]/8 px-4 py-2 text-[11px] font-black text-[#0077B6]">
              محتوى LMS
            </Link>
            <a href={`/courses/${d.slug}`} target="_blank" rel="noreferrer" className="rounded-xl border border-[#0C2A4B]/15 px-4 py-2 text-[11px] font-black text-[#0C2A4B]">
              صفحة الزائر
            </a>
          </div>
        </EntityDetailSection>
      ),
    },
  ]

  if (mode === 'edit') {
    return (
      <EntityDetailDrawer
        open={open}
        onClose={onClose}
        title="تعديل الدورة"
        subtitle={course.title}
        widthClassName="max-w-full sm:max-w-5xl lg:max-w-6xl"
        scrollBody={false}
        footerSlot={null}
      >
        <Suspense fallback={<div className="py-16 text-center"><Loader2 className="mx-auto size-8 animate-spin text-[#0077B6]" /></div>}>
          <CourseProgramFormModal
            open
            presentation="drawer"
            initial={detail ?? course}
            tracks={tracks}
            departments={departments}
            learningPaths={learningPaths}
            existingCourses={existingCourses}
            onClose={() => onModeChange('details')}
            onCancelDrawer={() => onModeChange('details')}
            onSaved={() => {
              onSaved()
              void loadDetail()
              onModeChange('details')
            }}
          />
        </Suspense>
      </EntityDetailDrawer>
    )
  }

  return (
    <>
      <EntityDetailDrawer
        open={open}
        onClose={onClose}
        title={course.title}
        subtitle={d.slug}
      avatar={
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-[#0077B6]/15 text-sm font-black text-deepBlue ring-2 ring-white">
          {initialsFromName(course.title)}
        </span>
      }
      badges={
        <div className="flex flex-wrap gap-2">
          <CrudBadge variant="brand">{PROGRAM_KIND_LABEL[kind]}</CrudBadge>
          {statusBadge}
        </div>
      }
      tabs={tabs}
      footerSlot={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => window.open(`/courses/${d.slug}`, '_blank')}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-deepBlue hover:bg-slate-50">
              صفحة الزائر
            </button>
            <Link to={contentPath} className="rounded-xl border border-customBlue/30 bg-customBlue/[0.08] px-4 py-2 text-xs font-black text-deepBlue">
              محتوى LMS
            </Link>
          </div>
          <button
            type="button"
            onClick={() => onModeChange('edit')}
            className="rounded-xl bg-[#0C2A4B] px-5 py-2.5 text-xs font-black text-white hover:bg-[#0077B6]"
          >
            تعديل
          </button>
        </div>
      }
      />

      <Suspense fallback={null}>
        {addStudentOpen && course ?
          <AddStudentModal
            courseId={course.id}
            courseTitle={course.title}
            onClose={() => setAddStudentOpen(false)}
            onAdded={() => {
              void loadDetail()
              setStudentsRefreshKey((k) => k + 1)
            }}
          />
        : null}
      </Suspense>
    </>
  )
}
