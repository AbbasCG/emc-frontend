import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Armchair,
  Calendar,
  CalendarClock,
  CheckCircle,
  ClipboardList,
  Layers,
  Plus,
  Users,
  X,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  assignStudentToClass,
  createClassGroup,
  deleteClassGroup,
  fetchClassAssignmentStudents,
  fetchCourseEnrolledStudents,
  fetchInstructorClasses,
  removeStudentFromClass,
  updateClassGroup,
  type ClassAssignmentStudent,
  type ClassGroup,
  type ClassGroupScheduleRow,
} from '@/api/placementApi'
import { fetchInstructorCourses } from '@/api/instructorApi'
import type { TeachingCourseLms } from '@/types/lms'
import toast from '@/lib/toast'
import { useAuth } from '@/contexts/AuthContext'
import { ClassCard, InstructorHero, KpiCard, KpiSkeletonRow } from '@/components/instructor'
import { CEFR_MAP } from '@/components/instructor/instructorStudentFormats'
import {
  CEFR_LEVELS,
  ClassesEmptyState,
  ClassPreviewDrawer,
  FilterToolbar,
  STATUS_FILTERS,
  WEEKDAYS_AR,
  WaitingStudentsPanel,
  type StatusFilter,
} from '@/components/instructor/classes'
import GoogleStyleTimePicker from '@/components/shared/GoogleStyleTimePicker'

type ScheduleFormRow = {
  day_of_week: string
  start_time: string
  end_time: string
  delivery_mode: string
  location: string
}

type GroupForm = {
  name: string
  level_code: string
  capacity: string
  start_date: string
  schedules: ScheduleFormRow[]
}

function emptyScheduleRow(): ScheduleFormRow {
  return { day_of_week: '', start_time: '', end_time: '', delivery_mode: 'online', location: '' }
}

function emptyGroupForm(): GroupForm {
  return {
    name: '',
    level_code: '',
    capacity: '20',
    start_date: '',
    schedules: [emptyScheduleRow()],
  }
}

/** Pure I/O — kept outside the component so the load effect and the imperative
 *  refreshers share it without either having to call a state-mutating callback. */
async function fetchStudentsForCourse(
  courseId: number,
  course: TeachingCourseLms | undefined,
): Promise<ClassAssignmentStudent[]> {
  if (course?.requires_placement_test) {
    try {
      return await fetchClassAssignmentStudents(courseId)
    } catch {
      return await fetchCourseEnrolledStudents(courseId)
    }
  }
  return fetchCourseEnrolledStudents(courseId)
}

function todayWeekdayKey(): string {
  const keys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return keys[new Date().getDay()] ?? 'sunday'
}

export default function InstructorClassesPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const initCourseId = searchParams.get('course_id') ? Number(searchParams.get('course_id')) : null

  const [courses, setCourses] = useState<TeachingCourseLms[]>([])
  const [groups, setGroups] = useState<ClassGroup[]>([])
  const [students, setStudents] = useState<ClassAssignmentStudent[]>([])
  const [selectedCourse, setSelectedCourse] = useState<number | null>(initCourseId)
  const [filterLevel, setFilterLevel] = useState('')
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [groupSearch, setGroupSearch] = useState('')
  const [queueSearch, setQueueSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [studentsLoading, setStudentsLoading] = useState(initCourseId !== null)
  const [showCreate, setShowCreate] = useState(false)
  const [editGroup, setEditGroup] = useState<ClassGroup | null>(null)
  const [groupForm, setGroupForm] = useState<GroupForm>(emptyGroupForm())
  const [saving, setSaving] = useState(false)
  const [assigningTo, setAssigningTo] = useState<number | null>(null)
  const [drawerGroup, setDrawerGroup] = useState<ClassGroup | null>(null)

  const instructorName = user?.name ?? null

  useEffect(() => {
    fetchInstructorCourses()
      .then((list) => {
        setCourses(list)
        if (!selectedCourse && list.length === 1) setSelectedCourse(list[0].id)
      })
      .catch(() => toast.error('تعذّر تحميل الدورات'))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadGroups = useCallback(async () => {
    setLoading(true)
    try {
      setGroups(await fetchInstructorClasses(selectedCourse ?? undefined))
    } catch {
      toast.error('تعذّر تحميل المجموعات')
    } finally {
      setLoading(false)
    }
  }, [selectedCourse])

  const loadStudents = useCallback(async () => {
    if (!selectedCourse) {
      setStudents([])
      return
    }
    setStudentsLoading(true)
    try {
      setStudents(await fetchStudentsForCourse(selectedCourse, courses.find((c) => c.id === selectedCourse)))
    } catch {
      toast.error('تعذّر تحميل الطلاب')
    } finally {
      setStudentsLoading(false)
    }
  }, [selectedCourse, courses])

  // Re-arm the loading states during render when the query changes (react.dev
  // "adjusting state when a prop changes"), so a newly selected course never paints the
  // previous course's rows as if they were settled. Mount is covered by the initial values.
  const [seenQuery, setSeenQuery] = useState({ selectedCourse, courses })
  if (seenQuery.selectedCourse !== selectedCourse || seenQuery.courses !== courses) {
    if (seenQuery.selectedCourse !== selectedCourse) setLoading(true)
    if (selectedCourse) {
      setStudentsLoading(true)
    } else {
      setStudents([])
      setStudentsLoading(false)
    }
    setSeenQuery({ selectedCourse, courses })
  }

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const list = await fetchInstructorClasses(selectedCourse ?? undefined)
        if (alive) setGroups(list)
      } catch {
        if (alive) toast.error('تعذّر تحميل المجموعات')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [selectedCourse])

  useEffect(() => {
    if (!selectedCourse) return
    const course = courses.find((c) => c.id === selectedCourse)
    let alive = true
    void (async () => {
      try {
        const data = await fetchStudentsForCourse(selectedCourse, course)
        if (alive) setStudents(data)
      } catch {
        if (alive) toast.error('تعذّر تحميل الطلاب')
      } finally {
        if (alive) setStudentsLoading(false)
      }
    })()
    return () => { alive = false }
  }, [selectedCourse, courses])

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase()
    return students.filter((s) => {
      if (filterLevel && s.final_level !== filterLevel && s.written_level !== filterLevel) return false
      if (q && !s.student_name.toLowerCase().includes(q) && !s.student_email.toLowerCase().includes(q))
        return false
      return true
    })
  }, [students, filterLevel, search])

  const unassigned = useMemo(() => filteredStudents.filter((s) => !s.is_assigned), [filteredStudents])
  const assigned = useMemo(() => filteredStudents.filter((s) => s.is_assigned), [filteredStudents])

  const filteredGroups = useMemo(() => {
    let list = groups
    if (filterStatus !== 'all') list = list.filter((g) => g.status === filterStatus)
    const q = groupSearch.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          (g.course_title ?? '').toLowerCase().includes(q) ||
          (g.level_code ?? '').toLowerCase().includes(q),
      )
    }
    return list
  }, [groups, filterStatus, groupSearch])

  const todayKey = todayWeekdayKey()

  const kpis = useMemo(() => {
    const running = groups.filter((g) => g.status === 'active').length
    const totalSeats = groups.reduce((sum, g) => sum + Math.max(0, g.capacity - g.enrolled), 0)
    const todaySessions = groups.filter(
      (g) => g.status === 'active' && g.schedules.some((s) => s.day_of_week === todayKey && s.is_active !== false),
    ).length
    return {
      total: groups.length,
      running,
      students: groups.reduce((sum, g) => sum + g.enrolled, 0),
      seats: totalSeats,
      waiting: unassigned.length,
      todaySessions,
      assignmentsPending: groups.filter((g) => g.status === 'active').length > 0 ? '—' : 0,
    }
  }, [groups, unassigned.length, todayKey])

  function openCreate() {
    setGroupForm(emptyGroupForm())
    setEditGroup(null)
    setShowCreate(true)
  }

  function openEdit(g: ClassGroup) {
    const rows: ScheduleFormRow[] = g.schedules.length > 0
      ? g.schedules.map((s) => ({
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
          delivery_mode: s.delivery_mode,
          location: s.location ?? '',
        }))
      : g.schedule_day
        ? [{ day_of_week: g.schedule_day, start_time: g.schedule_time ?? '', end_time: '', delivery_mode: g.location_type, location: '' }]
        : [emptyScheduleRow()]

    setGroupForm({
      name: g.name,
      level_code: g.level_code ?? '',
      capacity: String(g.capacity),
      start_date: g.start_date ?? '',
      schedules: rows,
    })
    setEditGroup(g)
    setShowCreate(true)
  }

  function addScheduleRow() {
    setGroupForm((f) => ({ ...f, schedules: [...f.schedules, emptyScheduleRow()] }))
  }

  function removeScheduleRow(index: number) {
    setGroupForm((f) => ({ ...f, schedules: f.schedules.filter((_, i) => i !== index) }))
  }

  function updateScheduleRow(index: number, patch: Partial<ScheduleFormRow>) {
    setGroupForm((f) => ({
      ...f,
      schedules: f.schedules.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }))
  }

  async function handleSaveGroup() {
    if (!selectedCourse && !editGroup) return
    if (!groupForm.name.trim()) {
      toast.warning('يرجى إدخال اسم المجموعة')
      return
    }
    const validSchedules = groupForm.schedules.filter((r) => r.day_of_week && r.start_time && r.end_time)
    const incompleteRow = groupForm.schedules.some(
      (r) => (r.day_of_week || r.start_time || r.end_time) && !(r.day_of_week && r.start_time && r.end_time),
    )
    if (incompleteRow) {
      toast.warning('يرجى إكمال اليوم ووقتي البداية والنهاية لكل موعد، أو حذف الموعد غير المكتمل')
      return
    }
    if (validSchedules.some((r) => r.end_time <= r.start_time)) {
      toast.warning('وقت نهاية الحصة يجب أن يكون بعد وقت البداية')
      return
    }
    setSaving(true)
    try {
      const schedules: Omit<ClassGroupScheduleRow, 'id' | 'is_active'>[] = validSchedules.map((r) => ({
        day_of_week: r.day_of_week,
        start_time: r.start_time,
        end_time: r.end_time,
        delivery_mode: r.delivery_mode,
        location: r.location.trim() || null,
      }))
      const payload = {
        name: groupForm.name.trim(),
        level_code: groupForm.level_code || null,
        capacity: Number(groupForm.capacity) || 20,
        start_date: groupForm.start_date || null,
        schedules,
      }
      if (editGroup) {
        await updateClassGroup(editGroup.id, payload)
        toast.success('تم تحديث المجموعة')
      } else {
        await createClassGroup({ course_id: selectedCourse!, ...payload })
        toast.success('تم إنشاء المجموعة')
      }
      setShowCreate(false)
      void loadGroups()
    } catch {
      toast.error('تعذّر حفظ المجموعة')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteGroup(g: ClassGroup) {
    if (!window.confirm(`هل تريد حذف المجموعة "${g.name}"؟`)) return
    try {
      await deleteClassGroup(g.id)
      toast.success('تم حذف المجموعة')
      void loadGroups()
    } catch {
      toast.error('تعذّر حذف المجموعة')
    }
  }

  async function handleAssignStudent(student: ClassAssignmentStudent, groupId: number) {
    setAssigningTo(groupId)
    try {
      await assignStudentToClass(groupId, {
        user_id: student.student_id,
        placement_attempt_id: student.attempt_id,
        oral_assessment_booking_id: student.booking_id,
      })
      toast.success(`تم تعيين ${student.student_name} إلى المجموعة`)
      void Promise.all([loadGroups(), loadStudents()])
    } catch {
      toast.error('تعذّر تعيين الطالب')
    } finally {
      setAssigningTo(null)
    }
  }

  async function handleRemoveStudent(groupId: number, userId: number, name: string) {
    try {
      await removeStudentFromClass(groupId, userId)
      toast.success(`تمت إزالة ${name}`)
      void Promise.all([loadGroups(), loadStudents()])
    } catch {
      toast.error('تعذّر إزالة الطالب')
    }
  }

  const refreshAll = () => {
    void loadGroups()
    void loadStudents()
  }

  const noPlacementCourses = !loading && courses.length === 0 && !selectedCourse

  return (
    <div className="space-y-5 pb-16 font-[Cairo,sans-serif]" dir="rtl">
      <InstructorHero
        title="إدارة الصفوف والمجموعات"
        subtitle="توزيع الطلاب على المجموعات، متابعة السعة، وإدارة الجلسات والحضور"
        backTo="/dashboard/instructor/courses"
        backLabel="الدورات"
        onRefresh={refreshAll}
        refreshing={loading || studentsLoading}
        actions={
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/dashboard/instructor/calendar')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-deepBlue/10 bg-white px-4 py-2 text-[12px] font-bold text-deepBlue/70 transition hover:border-[#0077B6]/30"
            >
              <Calendar className="h-4 w-4" />
              التقويم
            </button>
            {selectedCourse && (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#F28C00] px-4 py-2 text-[12px] font-bold text-white shadow-md transition hover:brightness-105"
              >
                <Plus className="h-4 w-4" />
                مجموعة جديدة
              </button>
            )}
          </div>
        }
      />

      {noPlacementCourses ? (
        <ClassesEmptyState
          title="لا توجد دورات مُسندة إليك حالياً"
          description="ستظهر هنا المجموعات عند إسناد دورة إليك من قِبَل الإدارة"
        />
      ) : (
        <>
          {loading ? (
            <KpiSkeletonRow count={6} />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              <KpiCard index={0} icon={Layers} label="إجمالي الصفوف" value={kpis.total} tone="text-[#0077B6] bg-[#0077B6]/[0.08]" />
              <KpiCard index={1} icon={CheckCircle} label="صفوف نشطة" value={kpis.running} tone="text-emerald-600 bg-emerald-50" badge={`${kpis.running ? Math.round((kpis.running / Math.max(kpis.total, 1)) * 100) : 0}%`} />
              <KpiCard index={2} icon={Users} label="طلاب مُعيَّنون" value={kpis.students} tone="text-violet-600 bg-violet-50" />
              <KpiCard index={3} icon={Armchair} label="مقاعد متاحة" value={kpis.seats} tone="text-[#F28C00] bg-[#F28C00]/10" />
              <KpiCard index={4} icon={CalendarClock} label="جلسات اليوم" value={kpis.todaySessions} tone="text-sky-600 bg-sky-50" />
              <KpiCard index={5} icon={ClipboardList} label="بانتظار التوزيع" value={kpis.waiting} tone="text-amber-600 bg-amber-50" />
            </div>
          )}

          <FilterToolbar
            courses={courses}
            selectedCourse={selectedCourse}
            onCourseChange={setSelectedCourse}
            filterLevel={filterLevel}
            onLevelChange={setFilterLevel}
            filterStatus={filterStatus}
            onStatusChange={setFilterStatus}
            search={search}
            onSearchChange={setSearch}
            groupSearch={groupSearch}
            onGroupSearchChange={setGroupSearch}
          />

          <div className="grid gap-5 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_360px]">
            <section>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-[15px] font-bold text-[#0C2A4B]">الصفوف والمجموعات</h2>
                  <p className="text-[11px] font-medium text-slate-400">
                    {filteredGroups.length} صف · {STATUS_FILTERS.find((f) => f.id === filterStatus)?.label}
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-52 animate-pulse rounded-[16px] bg-slate-100" />
                  ))}
                </div>
              ) : filteredGroups.length === 0 ? (
                <ClassesEmptyState
                  title={groups.length === 0 ? 'لا توجد صفوف بعد' : 'لا توجد صفوف مطابقة للفلتر'}
                  description={
                    groups.length === 0
                      ? 'ابدأ بإنشاء مجموعتك الأولى لتوزيع الطلاب وإدارة الجلسات بشكل احترافي ومنظم.'
                      : 'جرّب تغيير معايير البحث أو الفلتر.'
                  }
                  primaryAction={
                    selectedCourse && groups.length === 0
                      ? { label: 'إنشاء أول صف', onClick: openCreate }
                      : undefined
                  }
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {filteredGroups.map((g, i) => (
                    <ClassCard
                      key={g.id}
                      group={g}
                      students={students}
                      instructorName={instructorName}
                      index={i}
                      onOpen={() => setDrawerGroup(g)}
                      onEdit={() => openEdit(g)}
                      onDelete={() => void handleDeleteGroup(g)}
                      onRemoveStudent={(userId, name) => void handleRemoveStudent(g.id, userId, name)}
                    />
                  ))}
                </div>
              )}
            </section>

            <WaitingStudentsPanel
              unassigned={unassigned}
              assigned={assigned}
              groups={groups}
              loading={studentsLoading}
              assigningTo={assigningTo}
              onAssign={handleAssignStudent}
              selectedCourse={selectedCourse}
              queueSearch={queueSearch}
              onQueueSearchChange={setQueueSearch}
            />
          </div>
        </>
      )}

      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/50 p-4 backdrop-blur-sm" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[16px] bg-white p-6 shadow-2xl"
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-[16px] font-bold text-[#0C2A4B]">
                  {editGroup ? 'تعديل المجموعة' : 'مجموعة جديدة'}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-500">
                    اسم المجموعة <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={groupForm.name}
                    onChange={(e) => setGroupForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="مثال: مجموعة A1 صباح"
                    dir="rtl"
                    className="h-10 w-full rounded-xl border border-[#0C2A4B]/10 bg-[#F8FAFC] px-4 text-[13px] font-semibold text-[#0C2A4B] outline-none focus:border-[#0077B6] focus:bg-white focus:ring-2 focus:ring-[#0077B6]/15"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-500">المستوى</label>
                    <select
                      value={groupForm.level_code}
                      onChange={(e) => setGroupForm((f) => ({ ...f, level_code: e.target.value }))}
                      dir="rtl"
                      className="h-10 w-full rounded-xl border border-[#0C2A4B]/10 bg-white px-3 text-[12px] font-bold text-[#0C2A4B] outline-none focus:border-[#0077B6]"
                    >
                      <option value="">— اختر —</option>
                      {CEFR_LEVELS.map((l) => (
                        <option key={l} value={l}>
                          {l} — {CEFR_MAP[l]?.arabic ?? l}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-500">السعة</label>
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={groupForm.capacity}
                      onChange={(e) => setGroupForm((f) => ({ ...f, capacity: e.target.value }))}
                      dir="ltr"
                      className="h-10 w-full rounded-xl border border-[#0C2A4B]/10 bg-white px-4 text-[13px] font-semibold outline-none focus:border-[#0077B6]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-500">تاريخ البدء</label>
                    <input
                      type="date"
                      value={groupForm.start_date}
                      onChange={(e) => setGroupForm((f) => ({ ...f, start_date: e.target.value }))}
                      className="h-10 w-full rounded-xl border border-[#0C2A4B]/10 bg-white px-4 text-[12px] font-bold outline-none focus:border-[#0077B6]"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-500">
                      الجدول الأسبوعي <span className="font-normal text-slate-400">(اختر أي عدد من الأيام)</span>
                    </label>
                    <button
                      type="button"
                      onClick={addScheduleRow}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#0077B6]/[0.08] px-2.5 py-1 text-[10px] font-bold text-[#0077B6] transition hover:bg-[#0077B6]/[0.15]"
                    >
                      <Plus className="h-3 w-3" />
                      إضافة موعد
                    </button>
                  </div>
                  <div className="space-y-2">
                    {groupForm.schedules.map((row, i) => (
                      <div key={i} className="rounded-xl border border-[#0C2A4B]/10 bg-[#F8FAFC] p-2.5">
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <select
                            value={row.day_of_week}
                            onChange={(e) => updateScheduleRow(i, { day_of_week: e.target.value })}
                            dir="rtl"
                            className="h-9 w-full rounded-lg border border-[#0C2A4B]/10 bg-white px-2 text-[11px] font-bold outline-none focus:border-[#0077B6]"
                          >
                            <option value="">— اليوم —</option>
                            {Object.entries(WEEKDAYS_AR).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                          <GoogleStyleTimePicker
                            value={row.start_time || null}
                            onChange={(v) => updateScheduleRow(i, { start_time: v ?? '' })}
                            minuteStep={15}
                          />
                          <GoogleStyleTimePicker
                            value={row.end_time || null}
                            onChange={(v) => updateScheduleRow(i, { end_time: v ?? '' })}
                            minuteStep={15}
                          />
                          <select
                            value={row.delivery_mode}
                            onChange={(e) => updateScheduleRow(i, { delivery_mode: e.target.value })}
                            dir="rtl"
                            className="h-9 w-full rounded-lg border border-[#0C2A4B]/10 bg-white px-2 text-[11px] font-bold outline-none focus:border-[#0077B6]"
                          >
                            <option value="online">أونلاين</option>
                            <option value="in_person">حضوري</option>
                            <option value="hybrid">هجين</option>
                          </select>
                        </div>
                        {groupForm.schedules.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeScheduleRow(i)}
                            className="mt-2 flex items-center gap-1 text-[10px] font-bold text-red-500 hover:text-red-600"
                          >
                            <X className="h-3 w-3" />
                            حذف الموعد
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => void handleSaveGroup()}
                  disabled={saving || !groupForm.name.trim()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0C2A4B] py-3 text-[13px] font-bold text-white transition hover:bg-[#0077B6] disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4" />
                  {saving ? 'جاري الحفظ...' : editGroup ? 'حفظ التعديلات' : 'إنشاء المجموعة'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-xl border border-[#0C2A4B]/10 px-4 py-3 text-[13px] font-bold text-[#0C2A4B]/70 hover:bg-[#F8FAFC]"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ClassPreviewDrawer group={drawerGroup} onClose={() => setDrawerGroup(null)} />
    </div>
  )
}
