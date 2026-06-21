import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Award,
  CheckCircle,
  ClipboardCheck,
  GraduationCap,
  Mic,
  Plus,
  Search,
  Users,
  X,
} from 'lucide-react'
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
} from '@/api/placementApi'
import { fetchInstructorCourses } from '@/api/instructorApi'
import type { TeachingCourseLms } from '@/types/lms'
import toast from '@/lib/toast'
import { InstructorHero } from '@/components/instructor'
import { InstructorClassDrawer } from '@/components/instructor/InstructorClassDrawer'
import { CEFR_MAP } from '@/components/instructor/InstructorStudentDrawer'
import { formatDate } from '@/utils/dateTime'

/* ── CEFR level options ───────────────────────────────────────────────────── */

const CEFR_LEVELS = ['Starter', 'A1', 'A2', 'B1', 'B2', 'C1']

const WEEKDAYS_AR: Record<string, string> = {
  sunday: 'الأحد', monday: 'الاثنين', tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء', thursday: 'الخميس', friday: 'الجمعة', saturday: 'السبت',
}

const STATUS_AR: Record<string, string> = {
  draft: 'مسودة', ready: 'جاهزة', active: 'نشطة', completed: 'مكتملة', archived: 'مؤرشفة',
}

const STATUS_CLR: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600', ready: 'bg-sky-100 text-sky-700',
  active: 'bg-emerald-100 text-emerald-700', completed: 'bg-blue-100 text-blue-700',
  archived: 'bg-slate-200 text-slate-500',
}

/* ── Create/edit group modal ─────────────────────────────────────────────── */

type GroupForm = {
  name: string
  level_code: string
  capacity: string
  start_date: string
  schedule_day: string
  schedule_time: string
  location_type: string
  meeting_link: string
}

function emptyGroupForm(): GroupForm {
  return { name: '', level_code: '', capacity: '20', start_date: '', schedule_day: '', schedule_time: '', location_type: 'online', meeting_link: '' }
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function InstructorClassesPage() {
  const [searchParams] = useSearchParams()
  const initCourseId = searchParams.get('course_id') ? Number(searchParams.get('course_id')) : null

  const [courses,        setCourses]        = useState<TeachingCourseLms[]>([])
  const [groups,         setGroups]         = useState<ClassGroup[]>([])
  const [students,       setStudents]       = useState<ClassAssignmentStudent[]>([])
  const [selectedCourse, setSelectedCourse] = useState<number | null>(initCourseId)
  const [filterLevel,    setFilterLevel]    = useState('')
  const [search,         setSearch]         = useState('')
  const [loading,        setLoading]        = useState(true)
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [showCreate,     setShowCreate]     = useState(false)
  const [editGroup,      setEditGroup]      = useState<ClassGroup | null>(null)
  const [groupForm,      setGroupForm]      = useState<GroupForm>(emptyGroupForm())
  const [saving,         setSaving]         = useState(false)
  const [assigningTo,    setAssigningTo]    = useState<number | null>(null)  // groupId being assigned to
  const [drawerGroup,    setDrawerGroup]    = useState<ClassGroup | null>(null)

  // Load courses
  useEffect(() => {
    fetchInstructorCourses()
      .then((list) => {
        setCourses(list)
        if (!selectedCourse && list.length === 1) {
          setSelectedCourse(list[0].id)
        }
      })
      .catch(() => toast.error('تعذّر تحميل الدورات'))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadGroups = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchInstructorClasses(selectedCourse ?? undefined)
      setGroups(data)
    } catch {
      toast.error('تعذّر تحميل المجموعات')
    } finally {
      setLoading(false)
    }
  }, [selectedCourse])

  const loadStudents = useCallback(async () => {
    if (!selectedCourse) { setStudents([]); return }
    setStudentsLoading(true)
    try {
      const course = courses.find((c) => c.id === selectedCourse)
      // For placement courses try the placement endpoint (includes scores/levels)
      // then fall back to the general enrollment endpoint
      let data: ClassAssignmentStudent[] = []
      if (course?.requires_placement_test) {
        try {
          data = await fetchClassAssignmentStudents(selectedCourse)
        } catch {
          data = await fetchCourseEnrolledStudents(selectedCourse)
        }
      } else {
        data = await fetchCourseEnrolledStudents(selectedCourse)
      }
      setStudents(data)
    } catch {
      toast.error('تعذّر تحميل الطلاب')
    } finally {
      setStudentsLoading(false)
    }
  }, [selectedCourse, courses])

  useEffect(() => { void loadGroups() }, [loadGroups])
  useEffect(() => { void loadStudents() }, [loadStudents])

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase()
    return students.filter((s) => {
      if (filterLevel && s.final_level !== filterLevel && s.written_level !== filterLevel) return false
      if (q && !s.student_name.toLowerCase().includes(q) && !s.student_email.toLowerCase().includes(q)) return false
      return true
    })
  }, [students, filterLevel, search])

  const unassigned = useMemo(() => filteredStudents.filter((s) => !s.is_assigned), [filteredStudents])
  const assigned   = useMemo(() => filteredStudents.filter((s) => s.is_assigned), [filteredStudents])

  // ── Group form handlers ──────────────────────────────────────────────────

  function openCreate() {
    setGroupForm(emptyGroupForm())
    setEditGroup(null)
    setShowCreate(true)
  }

  function openEdit(g: ClassGroup) {
    setGroupForm({
      name:          g.name,
      level_code:    g.level_code ?? '',
      capacity:      String(g.capacity),
      start_date:    g.start_date ?? '',
      schedule_day:  g.schedule_day ?? '',
      schedule_time: g.schedule_time ?? '',
      location_type: g.location_type,
      meeting_link:  g.meeting_link ?? '',
    })
    setEditGroup(g)
    setShowCreate(true)
  }

  async function handleSaveGroup() {
    if (!selectedCourse && !editGroup) return
    if (!groupForm.name.trim()) { toast.warning('يرجى إدخال اسم المجموعة'); return }
    setSaving(true)
    try {
      const payload = {
        name:          groupForm.name.trim(),
        level_code:    groupForm.level_code || null,
        capacity:      Number(groupForm.capacity) || 20,
        start_date:    groupForm.start_date || null,
        schedule_day:  groupForm.schedule_day || null,
        schedule_time: groupForm.schedule_time || null,
        location_type: groupForm.location_type,
        meeting_link:  groupForm.meeting_link.trim() || null,
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
        user_id:                   student.student_id,
        placement_attempt_id:      student.attempt_id,
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

  const noPlacementCourses = !loading && courses.length === 0 && !selectedCourse

  return (
    <div className="space-y-5 pb-16" dir="rtl">
      <InstructorHero
        title="الصفوف والمجموعات"
        subtitle="توزيع الطلاب على المجموعات بناءً على نتائج تحديد المستوى"
        backTo="/dashboard/instructor/courses"
        backLabel="الدورات"
        onRefresh={() => { void loadGroups(); void loadStudents() }}
        refreshing={loading || studentsLoading}
        pills={loading ? [] : [
          { label: 'المجموعات',       value: groups.length },
          { label: 'بانتظار التعيين', value: unassigned.length },
          { label: 'تم التعيين',      value: assigned.length },
        ]}
      />

      {/* No placement courses message */}
      {noPlacementCourses && (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-20 text-center">
          <GraduationCap className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-4 font-black text-deepBlue">لا توجد دورات مُسندة إليك حالياً</p>
          <p className="mt-2 text-[12px] font-semibold text-deepBlue/45">
            ستظهر هنا المجموعات عند إسناد دورة إليك من قِبَل الإدارة
          </p>
        </div>
      )}

      {!noPlacementCourses && (
        <>
          {/* ── Filters ────────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Course selector */}
            <select
              value={selectedCourse ?? ''}
              onChange={(e) => setSelectedCourse(e.target.value ? Number(e.target.value) : null)}
              dir="rtl"
              className="h-9 min-w-[160px] appearance-none rounded-2xl border border-slate-200 bg-white px-3.5 text-[12px] font-semibold text-deepBlue outline-none focus:border-[#0077B6] focus:ring-4 focus:ring-sky-100"
            >
              <option value="">جميع الدورات</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>

            {/* Level filter */}
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              dir="rtl"
              className="h-9 appearance-none rounded-2xl border border-slate-200 bg-white px-3.5 text-[12px] font-semibold text-deepBlue/70 outline-none focus:border-[#0077B6] focus:ring-4 focus:ring-sky-100"
            >
              <option value="">جميع المستويات</option>
              {CEFR_LEVELS.map((l) => (
                <option key={l} value={l}>{l} — {CEFR_MAP[l]?.arabic ?? l}</option>
              ))}
            </select>

            {/* Search */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث باسم الطالب..."
                dir="rtl"
                className="h-9 w-full rounded-2xl border border-slate-200 bg-white pr-8 pl-3.5 text-[12px] font-semibold text-deepBlue outline-none placeholder:text-slate-400 focus:border-[#0077B6] focus:ring-4 focus:ring-sky-100"
              />
            </div>

            {/* Create group */}
            {selectedCourse && (
              <button
                type="button"
                onClick={openCreate}
                className="flex items-center gap-1.5 rounded-2xl bg-[#0077B6] px-3.5 py-2 text-[11px] font-black text-white transition hover:brightness-105"
              >
                <Plus className="h-3.5 w-3.5" />
                مجموعة جديدة
              </button>
            )}
          </div>

          {/* ── Main layout: groups + unassigned students ────────────── */}
          <div className="grid gap-5 lg:grid-cols-2">

            {/* ── Groups ─────────────────────────────────────────────── */}
            <section>
              <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-deepBlue/35">
                المجموعات ({groups.length})
              </p>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-3xl bg-slate-100" />)}
                </div>
              ) : groups.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-10 text-center">
                  <GraduationCap className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-3 text-[12px] font-semibold text-deepBlue/45">لا توجد مجموعات بعد</p>
                  {selectedCourse && (
                    <button
                      type="button"
                      onClick={openCreate}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-2xl bg-[#0077B6] px-3.5 py-2 text-[11px] font-black text-white transition hover:brightness-105"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      إنشاء أول مجموعة
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {groups.map((g) => (
                    <GroupCard
                      key={g.id}
                      group={g}
                      students={students}
                      onOpen={() => setDrawerGroup(g)}
                      onEdit={() => openEdit(g)}
                      onDelete={() => void handleDeleteGroup(g)}
                      onRemoveStudent={(userId, name) => void handleRemoveStudent(g.id, userId, name)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* ── Unassigned students ─────────────────────────────────── */}
            <section>
              <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-deepBlue/35">
                طلاب بانتظار التعيين ({unassigned.length})
              </p>
              {studentsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}
                </div>
              ) : unassigned.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-10 text-center">
                  <Users className="mx-auto h-7 w-7 text-slate-300" />
                  <p className="mt-2 text-[11px] font-semibold text-deepBlue/35">
                    {!selectedCourse ? 'اختر دورة لعرض الطلاب' : 'جميع الطلاب مُعيَّنون'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {unassigned.map((s) => (
                    <StudentAssignCard
                      key={s.student_id}
                      student={s}
                      groups={groups}
                      assigning={assigningTo}
                      onAssign={(groupId) => void handleAssignStudent(s, groupId)}
                    />
                  ))}
                </div>
              )}

              {/* Already assigned (collapsed) */}
              {assigned.length > 0 && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-[10px] font-black uppercase tracking-widest text-deepBlue/35 hover:text-deepBlue/60">
                    طلاب مُعيَّنون ({assigned.length})
                  </summary>
                  <div className="mt-2 space-y-2">
                    {assigned.map((s) => (
                      <StudentAssignCard
                        key={s.student_id}
                        student={s}
                        groups={groups}
                        assigning={assigningTo}
                        onAssign={(groupId) => void handleAssignStudent(s, groupId)}
                      />
                    ))}
                  </div>
                </details>
              )}
            </section>
          </div>
        </>
      )}

      {/* ── Create / Edit group modal ──────────────────────────────── */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl"
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-[16px] font-black text-deepBlue">
                  {editGroup ? 'تعديل المجموعة' : 'مجموعة جديدة'}
                </h2>
                <button type="button" onClick={() => setShowCreate(false)} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="mb-1 block text-[11px] font-black text-deepBlue/55">اسم المجموعة <span className="text-red-500">*</span></label>
                  <input
                    value={groupForm.name}
                    onChange={(e) => setGroupForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="مثال: مجموعة A1 صباح"
                    dir="rtl"
                    className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-deepBlue outline-none focus:border-[#0077B6] focus:ring-4 focus:ring-sky-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Level */}
                  <div>
                    <label className="mb-1 block text-[11px] font-black text-deepBlue/55">المستوى</label>
                    <select
                      value={groupForm.level_code}
                      onChange={(e) => setGroupForm((f) => ({ ...f, level_code: e.target.value }))}
                      dir="rtl"
                      className="h-10 w-full appearance-none rounded-2xl border border-slate-200 bg-white pr-3 text-[12px] font-semibold text-deepBlue outline-none focus:border-[#0077B6]"
                    >
                      <option value="">— اختر المستوى —</option>
                      {CEFR_LEVELS.map((l) => (
                        <option key={l} value={l}>{l} — {CEFR_MAP[l]?.arabic ?? l}</option>
                      ))}
                    </select>
                  </div>

                  {/* Capacity */}
                  <div>
                    <label className="mb-1 block text-[11px] font-black text-deepBlue/55">السعة القصوى</label>
                    <input
                      type="number" min="1" max="200"
                      value={groupForm.capacity}
                      onChange={(e) => setGroupForm((f) => ({ ...f, capacity: e.target.value }))}
                      dir="ltr"
                      className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-deepBlue outline-none focus:border-[#0077B6]"
                    />
                  </div>

                  {/* Schedule day */}
                  <div>
                    <label className="mb-1 block text-[11px] font-black text-deepBlue/55">يوم الحصة</label>
                    <select
                      value={groupForm.schedule_day}
                      onChange={(e) => setGroupForm((f) => ({ ...f, schedule_day: e.target.value }))}
                      dir="rtl"
                      className="h-10 w-full appearance-none rounded-2xl border border-slate-200 bg-white pr-3 text-[12px] font-semibold text-deepBlue outline-none focus:border-[#0077B6]"
                    >
                      <option value="">— اختر اليوم —</option>
                      {Object.entries(WEEKDAYS_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>

                  {/* Schedule time */}
                  <div>
                    <label className="mb-1 block text-[11px] font-black text-deepBlue/55">وقت الحصة</label>
                    <input
                      type="time"
                      value={groupForm.schedule_time}
                      onChange={(e) => setGroupForm((f) => ({ ...f, schedule_time: e.target.value }))}
                      className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-deepBlue outline-none focus:border-[#0077B6]"
                    />
                  </div>

                  {/* Start date */}
                  <div>
                    <label className="mb-1 block text-[11px] font-black text-deepBlue/55">تاريخ البدء</label>
                    <input
                      type="date"
                      value={groupForm.start_date}
                      onChange={(e) => setGroupForm((f) => ({ ...f, start_date: e.target.value }))}
                      className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[12px] font-semibold text-deepBlue outline-none focus:border-[#0077B6]"
                    />
                  </div>

                  {/* Location type */}
                  <div>
                    <label className="mb-1 block text-[11px] font-black text-deepBlue/55">نوع الحصة</label>
                    <select
                      value={groupForm.location_type}
                      onChange={(e) => setGroupForm((f) => ({ ...f, location_type: e.target.value }))}
                      dir="rtl"
                      className="h-10 w-full appearance-none rounded-2xl border border-slate-200 bg-white pr-3 text-[12px] font-semibold text-deepBlue outline-none focus:border-[#0077B6]"
                    >
                      <option value="online">أونلاين</option>
                      <option value="in_person">حضوري</option>
                      <option value="hybrid">هجين</option>
                    </select>
                  </div>
                </div>

                {/* Meeting link */}
                <div>
                  <label className="mb-1 block text-[11px] font-black text-deepBlue/55">رابط الاجتماع</label>
                  <input
                    value={groupForm.meeting_link}
                    onChange={(e) => setGroupForm((f) => ({ ...f, meeting_link: e.target.value }))}
                    placeholder="https://meet.google.com/..."
                    dir="ltr"
                    className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[12px] font-semibold text-deepBlue outline-none focus:border-[#0077B6]"
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => void handleSaveGroup()}
                  disabled={saving || !groupForm.name.trim()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#0077B6] py-3 text-[13px] font-black text-white transition hover:brightness-105 disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4" />
                  {saving ? 'جاري الحفظ...' : (editGroup ? 'حفظ التعديلات' : 'إنشاء المجموعة')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-[13px] font-black text-deepBlue/65 hover:bg-slate-50"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <InstructorClassDrawer group={drawerGroup} onClose={() => setDrawerGroup(null)} />
    </div>
  )
}

/* ── Group card ───────────────────────────────────────────────────────────── */

function GroupCard({
  group: g,
  students,
  onOpen,
  onEdit,
  onDelete,
  onRemoveStudent,
}: {
  group: ClassGroup
  students: ClassAssignmentStudent[]
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
  onRemoveStudent: (userId: number, name: string) => void
}) {
  const cefrInfo = g.level_code ? (CEFR_MAP[g.level_code] ?? null) : null
  const assignedStudents = students.filter((s) => s.is_assigned)
  const pct = g.capacity > 0 ? Math.round((g.enrolled / g.capacity) * 100) : 0
  const isFull = g.enrolled >= g.capacity

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }}
      className="cursor-pointer rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#0077B6]/30 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-black text-deepBlue">{g.name}</p>
            {cefrInfo && (
              <span className={`rounded-xl px-2 py-0.5 text-[10px] font-black ${cefrInfo.bg} ${cefrInfo.text}`}>
                {cefrInfo.cefr} · {cefrInfo.arabic}
              </span>
            )}
            <span className={`rounded-xl px-2 py-0.5 text-[9px] font-black ${STATUS_CLR[g.status] ?? 'bg-slate-100 text-slate-500'}`}>
              {STATUS_AR[g.status] ?? g.status}
            </span>
          </div>
          {g.course_title && (
            <p className="mt-0.5 text-[11px] font-semibold text-deepBlue/45 truncate">{g.course_title}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={onEdit}
            className="rounded-xl border border-slate-200 px-2.5 py-1 text-[10px] font-black text-deepBlue/55 hover:bg-slate-50 transition">
            تعديل
          </button>
          <button type="button" onClick={onDelete}
            className="rounded-xl border border-red-100 px-2.5 py-1 text-[10px] font-black text-red-500 hover:bg-red-50 transition">
            حذف
          </button>
        </div>
      </div>

      {/* Schedule info */}
      <div className="mt-2 flex flex-wrap gap-3 text-[10px] font-semibold text-deepBlue/45">
        {g.schedule_day && <span>{WEEKDAYS_AR[g.schedule_day] ?? g.schedule_day}</span>}
        {g.schedule_time && <span dir="ltr">{g.schedule_time}</span>}
        {g.start_date && <span>{formatDate(g.start_date)}</span>}
        <span>{g.location_type === 'online' ? 'أونلاين' : g.location_type === 'in_person' ? 'حضوري' : 'هجين'}</span>
      </div>

      {/* Capacity bar */}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[10px] font-black">
          <span className="text-deepBlue/55">الطاقة الاستيعابية</span>
          <span className={isFull ? 'text-red-500' : 'text-deepBlue/55'}>
            {g.enrolled}/{g.capacity}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all ${isFull ? 'bg-red-400' : 'bg-[#0077B6]'}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>

      {/* Students in this group */}
      {assignedStudents.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {assignedStudents.slice(0, 3).map((s) => (
            <div key={s.student_id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-1.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-black text-deepBlue">{s.student_name}</p>
              </div>
              {s.final_level && (
                <span className={`shrink-0 rounded-lg px-1.5 py-0.5 text-[9px] font-black ${CEFR_MAP[s.final_level]?.bg ?? 'bg-slate-100'} ${CEFR_MAP[s.final_level]?.text ?? 'text-slate-600'}`}>
                  {s.final_level}
                </span>
              )}
              <button type="button"
                onClick={(e) => { e.stopPropagation(); onRemoveStudent(s.student_id, s.student_name) }}
                className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 transition">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {assignedStudents.length > 3 && (
            <p className="text-[10px] font-semibold text-deepBlue/35 text-center">
              و {assignedStudents.length - 3} طالب آخر...
            </p>
          )}
        </div>
      )}
    </motion.div>
  )
}

/* ── Student assignment card ──────────────────────────────────────────────── */

function StudentAssignCard({
  student: s,
  groups,
  assigning,
  onAssign,
}: {
  student: ClassAssignmentStudent
  groups: ClassGroup[]
  assigning: number | null
  onAssign: (groupId: number) => void
}) {
  const [showAssign, setShowAssign] = useState(false)
  const cefrInfo = s.final_level
    ? (CEFR_MAP[s.final_level] ?? null)
    : s.written_level ? (CEFR_MAP[s.written_level] ?? null) : null

  const recommended = groups.filter((g) => g.level_code === (s.final_level ?? s.written_level) && g.enrolled < g.capacity)

  return (
    <div className={`rounded-2xl border p-3 transition ${s.is_assigned ? 'border-emerald-100 bg-emerald-50/40' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-bl from-[#0C2A4B]/90 to-[#0077B6] text-[13px] font-black text-white">
          {s.student_name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-black text-deepBlue">{s.student_name}</p>
          <p className="truncate text-[10px] font-semibold text-deepBlue/40" dir="ltr">{s.student_email}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {cefrInfo && (
            <span className={`rounded-xl px-2 py-0.5 text-[9px] font-black ${cefrInfo.bg} ${cefrInfo.text}`}>
              {cefrInfo.cefr}
            </span>
          )}
          {s.is_assigned && (
            <span className="rounded-xl bg-emerald-100 px-2 py-0.5 text-[9px] font-black text-emerald-700">
              معيَّن
            </span>
          )}
        </div>
      </div>

      {/* Scores row */}
      <div className="mt-2 flex flex-wrap gap-2">
        {s.written_score != null && (
          <span className="flex items-center gap-1 rounded-xl bg-emerald-50 px-2 py-1 text-[9px] font-black text-emerald-700">
            <ClipboardCheck className="h-3 w-3" />
            كتابي: {s.written_score}/{s.total_questions ?? 70}
          </span>
        )}
        {s.oral_score != null && (
          <span className="flex items-center gap-1 rounded-xl bg-violet-50 px-2 py-1 text-[9px] font-black text-violet-700">
            <Mic className="h-3 w-3" />
            شفوي: {s.oral_score}/100
          </span>
        )}
        {s.final_level && (
          <span className="flex items-center gap-1 rounded-xl bg-amber-50 px-2 py-1 text-[9px] font-black text-amber-700">
            <Award className="h-3 w-3" />
            {s.final_level}
          </span>
        )}
        {/* Assign button */}
        {!s.is_assigned && groups.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAssign((v) => !v)}
            className="mr-auto flex items-center gap-1 rounded-xl bg-[#0077B6]/[0.08] px-2.5 py-1 text-[9px] font-black text-[#0077B6] transition hover:bg-[#0077B6]/[0.15]"
          >
            <GraduationCap className="h-3 w-3" />
            تعيين إلى صف
          </button>
        )}
      </div>

      {/* Group selector */}
      <AnimatePresence>
        {showAssign && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-1.5">
              {recommended.length > 0 && (
                <p className="text-[9px] font-black text-deepBlue/35">مجموعات مقترحة</p>
              )}
              {(recommended.length > 0 ? recommended : groups).map((g) => (
                <button
                  key={g.id}
                  type="button"
                  disabled={assigning === g.id || g.enrolled >= g.capacity}
                  onClick={() => { onAssign(g.id); setShowAssign(false) }}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-deepBlue transition hover:border-[#0077B6]/30 hover:bg-[#0077B6]/[0.04] disabled:opacity-50"
                >
                  <span className="font-black">{g.name}</span>
                  <span className={g.enrolled >= g.capacity ? 'text-red-400' : 'text-deepBlue/45'}>
                    {g.enrolled}/{g.capacity}
                    {g.level_code ? ` · ${g.level_code}` : ''}
                  </span>
                </button>
              ))}
              {groups.length === 0 && (
                <p className="rounded-xl border border-dashed border-slate-200 py-2 text-center text-[10px] font-semibold text-deepBlue/35">
                  لا توجد مجموعات — أنشئ مجموعة أولاً
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
