import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import {
  BookMarked,
  CalendarClock,
  Filter,
  Layers3,
  RefreshCw,
  UserX,
  Users,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  countNewRegistrations,
  countRegistrationsByCourse,
  deleteCourse,
  fetchAdminCourseDetail,
  fetchAdminRegistrationsIndex,
  fetchDepartmentOptions,
  patchCoursePublishState,
  type AdminRegistrationRow,
} from '@/api/adminCoursesApi'
import { fetchAdminInstructors, type AdminInstructorOption } from '@/api/adminInstructorsApi'
import { getApiErrorMessage } from '@/api/apiErrors'
import { fetchCoursesStrict, fetchTracksStrict, type CatalogTrackRow } from '@/api/superAdminCatalogApi'
import type { Course } from '@/types'
import { formatEuro } from '@/utils/currency'
import { initialsFromName } from '@/pages/super-admin/crud/shared/initials'
import { MiniSelect } from '@/pages/super-admin/crud/shared/FilterBar'
import { CrudBadge } from '@/pages/super-admin/crud/shared/Badge'
import { CrudCardTable, CrudTable, Th, Tr, Td } from '@/pages/super-admin/crud/shared/TableChrome'
import { LoadingPanel, EmptyPanel, ErrorPanel } from '@/pages/super-admin/crud/shared/States'
import { RowActionsMenu } from '@/pages/super-admin/crud/shared/RowActions'
import { CrudToolbar } from '@/pages/super-admin/crud/shared/CrudToolbar'
import {
  EntityDetailDrawer,
  EntityDetailField,
  EntityDetailSection,
} from '@/pages/super-admin/crud/shared/EntityDetailDrawer'
import { EntityActionMenu } from '@/pages/super-admin/crud/shared/EntityActionMenu'
import { SaGlassCard, SaPageRoot } from '@/pages/super-admin/crud/shared/SuperAdminPrimitives'
import { AnimatedTabular } from '@/pages/super-admin/crud/shared/enterprise/EnterpriseMetrics'
import { AssignInstructorModal } from '@/pages/super-admin/crud/programs/AssignInstructorModal'
import { CourseProgramFormModal } from '@/pages/super-admin/crud/programs/CourseProgramFormModal'
import { ScheduleCourseModal } from '@/pages/super-admin/crud/programs/ScheduleCourseModal'
import {
  PROGRAM_KIND_LABEL,
  hasInstructor,
  inferProgramKind,
  isPublishedCourse,
  isUpcomingCourse,
  missingCourseDate,
} from '@/pages/super-admin/crud/programs/programConsoleUtils'
import {
  applyAssignedInstructorToCourse,
  getCourseInstructor,
  instructorLookupMapFromAssignableRows,
  type CourseInstructorLookupRow,
} from '@/utils/courseInstructor'
import type { ElementType, ReactNode } from 'react'

type CourseVM = Course & {
  _regs: number
  _kind: keyof typeof PROGRAM_KIND_LABEL
}

type FilterMode = 'all' | 'published' | 'draft' | 'no_instructor' | 'no_date'

function vmFromCourse(c: Course, regMap: Map<number, number>): CourseVM {
  const id = Number(c.id)
  const count = (Number.isFinite(id) ? regMap.get(id) : 0) ?? c.registrations_count ?? 0
  return {
    ...c,
    _regs: typeof count === 'number' ? count : 0,
    _kind: inferProgramKind(c),
  }
}

function isPaidCourse(c: Course) {
  const numericPrice = typeof c.price === 'string' ? parseFloat(String(c.price)) : Number(c.price)
  return String(c.type) === 'paid' || (Number.isFinite(numericPrice) && numericPrice > 0)
}

export default function ProgramsConsolePage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [rows, setRows] = useState<Course[]>([])
  const [instructorRows, setInstructorRows] = useState<AdminInstructorOption[]>([])
  const [regs, setRegs] = useState<AdminRegistrationRow[]>([])
  const [tracks, setTracks] = useState<CatalogTrackRow[]>([])
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([])

  const [q, setQ] = useState('')
  const [mode, setMode] = useState<FilterMode>('all')

  const [preview, setPreview] = useState<Course | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formCourse, setFormCourse] = useState<Course | null>(null)
  const [assignCourse, setAssignCourse] = useState<Course | null>(null)
  const [scheduleCourse, setScheduleCourse] = useState<Course | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    const [pack, insRows] = await Promise.all([
      fetchCoursesStrict(),
      fetchAdminInstructors().catch(() => [] as AdminInstructorOption[]),
    ])
    setInstructorRows(insRows)
    if (!pack.ok) {
      setFailed(true)
      setRows([])
    } else {
      setRows(pack.rows)
    }
    const [rIndex, tr, dep] = await Promise.all([
      fetchAdminRegistrationsIndex(),
      fetchTracksStrict(),
      fetchDepartmentOptions(),
    ])
    setRegs(rIndex)
    setTracks(tr.ok ? tr.rows : [])
    setDepartments(dep)
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const regMap = useMemo(() => countRegistrationsByCourse(regs), [regs])

  const instructorLookup = useMemo(() => {
    const rows: CourseInstructorLookupRow[] = instructorRows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      avatar_url: r.avatar_url ?? null,
    }))
    return instructorLookupMapFromAssignableRows(rows)
  }, [instructorRows])

  const viewModels: CourseVM[] = useMemo(
    () => rows.map((c) => vmFromCourse(c, regMap)),
    [rows, regMap],
  )

  const kpis = useMemo(() => {
    const total = rows.length
    const published = rows.filter((c) => isPublishedCourse(c)).length
    const noIns = rows.filter((c) => !hasInstructor(c)).length
    const noDate = rows.filter((c) => missingCourseDate(c)).length
    const newRegs = countNewRegistrations(regs, 7)
    const upcoming = rows.filter((c) => isUpcomingCourse(c, Date.now(), 90)).length
    return { total, published, noIns, noDate, newRegs, upcoming }
  }, [rows, regs])

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    return viewModels.filter((c) => {
      const dept = c.department?.name ?? c.department_name ?? ''
      const tr = c.track?.title ?? c.track_title ?? ''
      const insLabel = getCourseInstructor(c, { lookupByInstructorId: instructorLookup }).displayName
      const hay = `${c.title} ${c.slug} ${insLabel} ${dept} ${tr}`.toLowerCase()
      if (t && !hay.includes(t)) return false
      if (mode === 'published' && !isPublishedCourse(c)) return false
      if (mode === 'draft' && isPublishedCourse(c)) return false
      if (mode === 'no_instructor' && hasInstructor(c)) return false
      if (mode === 'no_date' && !missingCourseDate(c)) return false
      return true
    })
  }, [viewModels, q, mode, instructorLookup])

  function openCreate() {
    setFormCourse(null)
    setFormOpen(true)
  }

  async function openEdit(c: Course) {
    setFormCourse(c)
    setFormOpen(true)
    try {
      const fresh = await fetchAdminCourseDetail(c.id)
      setFormCourse(fresh)
    } catch {
      setFormCourse(c)
    }
  }

  async function togglePublish(c: Course) {
    const next = !isPublishedCourse(c)
    try {
      await patchCoursePublishState(c.id, next)
      toast.success(next ? 'تم نشر الدورة' : 'أُعيدت الدورة كمسودة')
      void load()
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    }
  }

  async function removeCourse(c: Course) {
    if (!window.confirm(`حذف «${c.title}»؟ لا يمكن التراجع عند نجاح الخادم.`)) return
    try {
      await deleteCourse(c.id)
      toast.success('تم حذف الدورة')
      void load()
      setPreview(null)
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    }
  }

  function instructorDrawerField(course: Course) {
    const pin = getCourseInstructor(course, { lookupByInstructorId: instructorLookup })
    if (!hasInstructor(course)) {
      return <span className="font-bold text-amber-700">بدون مدرب</span>
    }
    return (
      <div className="space-y-0.5 text-right">
        <div className="font-bold text-deepBlue">{pin.displayName}</div>
        {pin.email ?
          <div className="text-[11px] font-semibold text-slate-500 dir-ltr">{pin.email}</div>
        : null}
      </div>
    )
  }

  return (
    <SaPageRoot className="space-y-8 pb-16">
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-[1.75rem] border border-white/60 bg-gradient-to-bl from-[#22334A] via-[#0F172A] to-[#2691C2] p-[1px] shadow-2xl"
      >
        <div className="rounded-[1.7rem] bg-gradient-to-bl from-[#22334A]/95 via-[#0F172A]/98 to-[#2691C2]/88 px-6 py-8 text-white sm:px-10 sm:py-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 text-right">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/55">EMC · Course OS</p>
              <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-[1.75rem]">إدارة البرامج والدورات</h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-white/78">
                مصدر الكتالوج: GET /courses؛ عدادات التسجيل من فهارس التسجيل عند توفرها. التواريخ اختيارية — الدفعة المفتوحة
                تظهر للزائر كدعوة للانضمام للقادم.
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
                className="rounded-2xl bg-[#EC943C] px-5 py-2.5 text-xs font-black text-[#0F172A] shadow-lg shadow-black/20"
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

          {!failed && (
            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              <KpiMini icon={Layers3} label="إجمالي البرامج" value={<AnimatedTabular value={kpis.total} />} tone="sky" />
              <KpiMini icon={BookMarked} label="الدورات المنشورة" value={<AnimatedTabular value={kpis.published} />} tone="mint" />
              <KpiMini icon={UserX} label="بدون مدرب" value={<AnimatedTabular value={kpis.noIns} />} tone="amber" />
              <KpiMini icon={CalendarClock} label="بدون موعد" value={<AnimatedTabular value={kpis.noDate} />} tone="rose" />
              <KpiMini icon={Users} label="تسجيلات جديدة (~7 أيام)" value={<AnimatedTabular value={kpis.newRegs} />} tone="violet" />
              <KpiMini icon={Zap} label="دورات قادمة (90 يومًا)" value={<AnimatedTabular value={kpis.upcoming} />} tone="orange" />
            </div>
          )}
        </div>
      </motion.header>

      <CrudToolbar
        sticky
        searchValue={q}
        onSearchChange={setQ}
        searchPlaceholder="بحث: عنوان، slug، إدارة، مسار، مدرب…"
      >
        <MiniSelect
          label="تصفية سريعة"
          value={mode}
          onChange={(v) => setMode(v as FilterMode)}
          options={[
            { value: 'all', labelAr: 'الكل' },
            { value: 'published', labelAr: 'منشورة' },
            { value: 'draft', labelAr: 'مسودة / غير منشورة' },
            { value: 'no_instructor', labelAr: 'بدون مدرب' },
            { value: 'no_date', labelAr: 'بدون موعد' },
          ]}
        />
      </CrudToolbar>

      {failed ?
        <ErrorPanel title="تعذّر الاتصال بـ GET /courses" hint="تحقّق من الخادم أو صلاحيات الجلسة." />
      : loading ?
        <LoadingPanel />
      : filtered.length === 0 ?
        <EmptyPanel title="لا توجد عناصر مطابقة" subtitle="غيّر البحث أو أضف برنامجًا جديدًا." />
      :
        <>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filtered.slice(0, 12).map((c, i) => (
              <ProgramBentoCard
                key={c.id}
                c={c}
                instructorLookup={instructorLookup}
                index={i}
                onPreview={() => setPreview(c)}
                onEdit={() => openEdit(c)}
                onAssign={() => setAssignCourse(c)}
                onSchedule={() => setScheduleCourse(c)}
                onPublishToggle={() => void togglePublish(c)}
                onDelete={() => void removeCourse(c)}
              />
            ))}
          </div>

          <SaGlassCard className="overflow-hidden ring-1 ring-deepBlue/[0.04]" glow="blue">
            <div className="border-b border-slate-100 bg-white/95 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-black text-deepBlue">جدول العمليات</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">
                  <Filter size={14} aria-hidden />
                  {filtered.length} صف
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
                  {filtered.map((c) => {
                    const n = typeof c.price === 'string' ? parseFloat(String(c.price)) : Number(c.price)
                    const paid = isPaidCourse(c)
                    const dateLabel = missingCourseDate(c) ?
                        <span className="font-black text-[#EC943C]">الموعد لم يحدد بعد</span>
                      : String(c.start_date ?? '').slice(0, 10)
                    return (
                      <Tr key={c.id}>
                        <Td>
                          <div className="flex items-center gap-3">
                            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#2691C2]/12 text-[11px] font-black text-deepBlue ring-1 ring-[#2691C2]/25">
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
                          {isPublishedCourse(c) ?
                            <CrudBadge variant="success">منشور</CrudBadge>
                          : <CrudBadge variant="default">مسودة</CrudBadge>}
                        </Td>
                        <Td className="text-[12px] font-bold">
                          <CourseInstructorTableCell course={c} lookup={instructorLookup} />
                        </Td>
                        <Td className="max-w-[10rem] text-[11px] font-semibold text-slate-600">
                          <span className="line-clamp-2">
                            {(c.department_name ?? c.department?.name ?? '—') as string} ·{' '}
                            {(c.track_title ?? c.track?.title ?? '—') as string}
                          </span>
                        </Td>
                        <Td className="text-[12px] font-black">
                          {paid && Number.isFinite(n) && n > 0 ?
                            formatEuro(n, { locale: 'ar', minimumFractionDigits: 0, maximumFractionDigits: 0 })
                          : 'مجانية'}
                        </Td>
                        <Td className="tabular-nums text-[12px] font-bold">
                          {c.capacity ?? '—'} / {c._regs}
                        </Td>
                        <Td className="text-[11px]">{dateLabel}</Td>
                        <Td className="text-end">
                          <RowActionsMenu
                            ariaLabel={c.title}
                            actions={[
                              { key: 'd', label: 'عرض التفاصيل', onClick: () => setPreview(c) },
                              { key: 'e', label: 'تعديل', onClick: () => openEdit(c) },
                              { key: 'a', label: 'تعيين مدرب', onClick: () => setAssignCourse(c) },
                              { key: 's', label: 'تحديد موعد', onClick: () => setScheduleCourse(c) },
                              {
                                key: 'lms-cms',
                                label: 'محتوى الدورة — LMS',
                                onClick: () => navigate(`/dashboard/super-admin/crud/programs/${c.id}/content`),
                              },
                              {
                                key: 'p',
                                label: isPublishedCourse(c) ? 'إلغاء النشر' : 'نشر',
                                onClick: () => void togglePublish(c),
                              },
                              { key: 'x', label: 'حذف', onClick: () => void removeCourse(c) },
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
        </>
      }

      <EntityDetailDrawer
        open={preview !== null}
        onClose={() => setPreview(null)}
        title={preview?.title ?? ''}
        subtitle={
          preview ?
            missingCourseDate(preview) ?
              'انضم إلى الدورة القادمة'
            : String(preview.start_date ?? '').slice(0, 10)
          : ''
        }
        avatar={
          preview ?
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-[#2691C2]/15 text-sm font-black text-deepBlue ring-2 ring-white">
              {initialsFromName(preview.title)}
            </span>
          : null
        }
        badges={
          preview ?
            <div className="flex flex-wrap gap-2">
              <CrudBadge variant="brand">{PROGRAM_KIND_LABEL[inferProgramKind(preview)]}</CrudBadge>
              {isPublishedCourse(preview) ?
                <CrudBadge variant="success">منشور</CrudBadge>
              : <CrudBadge variant="default">مسودة</CrudBadge>}
            </div>
          : null
        }
        footerSlot={
          <EntityActionMenu
            onClose={() => setPreview(null)}
            onEdit={preview ? () => openEdit(preview) : undefined}
            editLabel="تعديل"
            extraStart={
              preview ?
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => window.open(`/courses/${preview.slug}`, '_blank')}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-deepBlue hover:bg-slate-50"
                  >
                    صفحة الزائر
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/dashboard/super-admin/crud/programs/${preview.id}/content`)}
                    className="rounded-xl border border-customBlue/30 bg-customBlue/[0.08] px-4 py-2 text-xs font-black text-deepBlue hover:bg-customBlue/[0.12]"
                  >
                    محتوى الدورة LMS
                  </button>
                </div>
              : null
            }
          />
        }
        tabs={
          preview ?
            [
              {
                id: 'o',
                labelAr: 'نظرة عامة',
                content: (
                  <EntityDetailSection title="وصف" icon={<BookMarked className="size-4" aria-hidden />}>
                    <p className="text-[13px] font-semibold leading-relaxed text-slate-600">
                      {preview.short_description ?? preview.description ?? 'لا وصف.'}
                    </p>
                  </EntityDetailSection>
                ),
              },
              {
                id: 'x',
                labelAr: 'تشغيل',
                content: (
                  <EntityDetailSection title="بيانات" icon={<Layers3 className="size-4" aria-hidden />}>
                    <dl className="grid gap-3 sm:grid-cols-2">
                      <EntityDetailField label="معرّف" value={<span className="font-mono">#{preview.id}</span>} />
                      <EntityDetailField
                        label="تسجيلات"
                        value={<span className="font-mono">{String(vmFromCourse(preview, regMap)._regs)}</span>}
                      />
                      <EntityDetailField
                        label="موعد"
                        value={
                          missingCourseDate(preview) ?
                            <span className="font-black text-[#EC943C]">انضم إلى الدورة القادمة</span>
                          : String(preview.start_date ?? '')
                        }
                      />
                      <EntityDetailField label="رابط اجتماع" value={preview.meeting_link ?? '—'} />
                      <EntityDetailField label="المدرب" value={instructorDrawerField(preview)} />
                    </dl>
                  </EntityDetailSection>
                ),
              },
            ]
          : undefined
        }
      />

      <CourseProgramFormModal
        open={formOpen}
        initial={formCourse}
        tracks={tracks}
        departments={departments}
        existingCourses={rows}
        onClose={() => setFormOpen(false)}
        onSaved={() => void load()}
        onCreateAnother={() => setFormCourse(null)}
      />

      <AssignInstructorModal
        open={assignCourse !== null}
        course={assignCourse}
        onClose={() => setAssignCourse(null)}
        onAssigned={(ins) => {
          const target = assignCourse
          if (!target) return
          const cid = target.id
          const merged = applyAssignedInstructorToCourse(target, ins)
          setRows((prev) => prev.map((row) => (row.id === cid ? merged : row)))
          setPreview((p) => (p?.id === cid ? merged : p))
          setFormCourse((fc) => (fc?.id === cid ? merged : fc))
        }}
      />

      <ScheduleCourseModal
        open={scheduleCourse !== null}
        course={scheduleCourse}
        onClose={() => setScheduleCourse(null)}
        onSaved={() => void load()}
      />
    </SaPageRoot>
  )
}

function KpiMini({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: ElementType
  label: string
  value: ReactNode
  tone: 'sky' | 'mint' | 'amber' | 'rose' | 'violet' | 'orange'
}) {
  const ring: Record<typeof tone, string> = {
    sky: 'ring-sky-400/30',
    mint: 'ring-emerald-400/30',
    amber: 'ring-amber-400/35',
    rose: 'ring-rose-400/35',
    violet: 'ring-violet-400/35',
    orange: 'ring-[#EC943C]/40',
  }
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/10 px-4 py-3 shadow-inner shadow-black/10 ring-1 ${ring[tone]} backdrop-blur-md`}
    >
      <div className="flex items-center justify-between gap-2">
        <Icon className="size-5 text-white/80" aria-hidden />
        <span className="text-2xl font-black tabular-nums text-white">{value}</span>
      </div>
      <p className="mt-2 text-[10px] font-black uppercase leading-snug tracking-wide text-white/60">{label}</p>
    </div>
  )
}

function ProgramBentoCard({
  c,
  instructorLookup,
  index,
  onPreview,
  onEdit,
  onAssign,
  onSchedule,
  onPublishToggle,
  onDelete,
}: {
  c: CourseVM
  instructorLookup: Map<number, CourseInstructorLookupRow>
  index: number
  onPreview: () => void
  onEdit: () => void
  onAssign: () => void
  onSchedule: () => void
  onPublishToggle: () => void
  onDelete: () => void
}) {
  const n = typeof c.price === 'string' ? parseFloat(String(c.price)) : Number(c.price)
  const paid = isPaidCourse(c)
  const palette =
    index % 3 === 0 ? 'from-[#22334A] to-[#2691C2]' : index % 3 === 1 ? 'from-[#EC943C] to-[#22334A]' : 'from-[#0F172A] to-[#22334A]'
  const insResolved = getCourseInstructor(c, { lookupByInstructorId: instructorLookup })

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.24) }}
      className={`relative flex flex-col justify-between overflow-hidden rounded-[1.35rem] border border-white/20 bg-gradient-to-bl ${palette} p-5 text-white shadow-xl ring-1 ring-white/10`}
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <span className="rounded-full bg-black/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-white/90">
            {PROGRAM_KIND_LABEL[c._kind]}
          </span>
          {isPublishedCourse(c) ?
            <CrudBadge variant="success">منشور</CrudBadge>
          : <CrudBadge variant="default">مسودة</CrudBadge>}
        </div>
        <h3 className="mt-4 line-clamp-2 min-h-[2.75rem] text-lg font-black leading-snug">{c.title}</h3>
        <p className="mt-2 text-[11px] font-semibold text-white/75">
          {hasInstructor(c) ?
            <>المدرب: {insResolved.displayName}</>
          : <span className="inline-flex items-center gap-1 text-amber-200">
              <UserX size={14} aria-hidden /> بدون مدرب
            </span>}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold text-white/85">
          <span className="rounded-lg bg-black/15 px-2 py-1">سعة: {c.capacity ?? '—'}</span>
          <span className="rounded-lg bg-black/15 px-2 py-1">تسجيلات: {c._regs}</span>
          <span className="rounded-lg bg-black/15 px-2 py-1">
            {paid && Number.isFinite(n) && n > 0 ?
              formatEuro(n, { locale: 'ar', minimumFractionDigits: 0, maximumFractionDigits: 0 })
            : 'مجانية'}
          </span>
        </div>
        <div className="mt-4 rounded-xl border border-white/15 bg-black/10 px-3 py-2 text-[11px] font-bold">
          {missingCourseDate(c) ?
            <span className="text-amber-100">انضم إلى الدورة القادمة · الموعد لم يحدد بعد</span>
          : <>
              <CalendarClock className="mb-1 inline size-3.5 opacity-80" aria-hidden />{' '}
              {String(c.start_date ?? '').slice(0, 10)}
            </>}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={onPreview}
          className="rounded-xl bg-white/15 px-3 py-1.5 text-[11px] font-black hover:bg-white/25"
        >
          تفاصيل
        </button>
        <button type="button" onClick={onEdit} className="rounded-xl bg-white/10 px-3 py-1.5 text-[11px] font-black hover:bg-white/20">
          تعديل
        </button>
        <button type="button" onClick={onAssign} className="rounded-xl bg-white/10 px-3 py-1.5 text-[11px] font-black hover:bg-white/20">
          تعيين
        </button>
        <button type="button" onClick={onSchedule} className="rounded-xl bg-white/10 px-3 py-1.5 text-[11px] font-black hover:bg-white/20">
          موعد
        </button>
        <button type="button" onClick={onPublishToggle} className="rounded-xl bg-[#EC943C]/90 px-3 py-1.5 text-[11px] font-black text-[#0F172A]">
          {isPublishedCourse(c) ? 'إلغاء نشر' : 'نشر'}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-xl border border-white/20 px-3 py-1.5 text-[11px] font-black text-rose-100 hover:bg-white/10"
        >
          حذف
        </button>
      </div>
    </motion.article>
  )
}

function CourseInstructorTableCell({
  course,
  lookup,
}: {
  course: Course
  lookup: Map<number, CourseInstructorLookupRow>
}) {
  const [imgFailed, setImgFailed] = useState(false)
  const resolved = getCourseInstructor(course, { lookupByInstructorId: lookup })

  useEffect(() => {
    setImgFailed(false)
  }, [resolved.avatarUrl])

  if (!hasInstructor(course)) {
    return <span className="font-bold text-amber-700">بدون مدرب</span>
  }

  const showImg = Boolean(resolved.avatarUrl && !imgFailed)

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#2691C2]/12 text-[11px] font-black text-deepBlue ring-1 ring-[#2691C2]/22">
        {showImg && resolved.avatarUrl ?
          <img
            src={resolved.avatarUrl}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
          />
        : initialsFromName(resolved.displayName)}
      </span>
      <div className="min-w-0 text-right">
        <p className="truncate font-bold text-deepBlue">{resolved.displayName}</p>
        {resolved.email ?
          <p className="truncate text-[10px] font-semibold text-slate-500 dir-ltr">{resolved.email}</p>
        : null}
      </div>
    </div>
  )
}
