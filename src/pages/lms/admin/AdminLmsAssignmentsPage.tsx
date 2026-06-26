import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Hourglass,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react'
import { motion } from 'framer-motion'
import {
  adminListAssignments,
  adminStoreAssignment,
  adminUpdateAssignment,
  adminDeleteAssignment,
  type AdminAssignmentDetail,
  type AdminAssignmentListItem,
} from '@/api/adminLmsApi'
import { LmsEmptyState } from '@/components/lms'
import AdminLmsShell from '@/components/lms/AdminLmsShell'
import AdminAssignmentDetailDrawer from '@/components/lms/admin/AdminAssignmentDetailDrawer'
import { LmsFilterBar, LmsDataPanel, countActiveFilters, lmsSelectClass } from '@/components/lms/management'
import { fmtDate, normCourseTitle, normInstructor, fmtNum } from '@/components/lms/lmsFormatters'
import { CourseSelectField } from '@/components/lms/CourseSelectField'
import EmcDateTimePicker from '@/components/ui/EmcDateTimePicker'
import toast from '@/lib/toast'

type AssignmentRow = AdminAssignmentListItem & {
  course_title?: string | null
  instructor_name?: string | null
  pending_count?: number
  graded_count?: number
  due_at?: string | null
  deadline?: string | null
}

const ADMIN_STATUSES = new Set(['active', 'archived'])

function normRow(r: AdminAssignmentListItem): AssignmentRow {
  const rawStatus = r.assignment_status ?? (ADMIN_STATUSES.has(r.status ?? '') ? r.status : null) ?? 'active'
  return {
    ...r,
    course_title: normCourseTitle(r.course_title ?? r.course?.title),
    instructor_name: normInstructor(r.instructor_name ?? r.instructor?.name),
    due_date: r.due_date,
    status: rawStatus,
    submissions_count: r.submissions_count ?? 0,
    pending_count: r.pending_submissions_count ?? r.pending_count ?? 0,
    graded_count: r.graded_submissions_count ?? r.graded_count ?? 0,
    needs_resubmission_count: r.needs_resubmission_count ?? 0,
  }
}

const STATUS_OPTIONS = [
  { value: '', label: 'كل الحالات' },
  { value: 'active', label: 'نشط' },
  { value: 'archived', label: 'أرشيف' },
]

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  archived: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
}

const STATUS_LABEL: Record<string, string> = {
  active: 'نشط',
  archived: 'أرشيف',
}

function isOverdue(dueDate?: string | null): boolean {
  if (!dueDate) return false
  return new Date(dueDate).getTime() < Date.now()
}

function Chip({ count, label, variant }: { count: number; label: string; variant: 'blue' | 'amber' | 'emerald' | 'rose' }) {
  const cls = {
    blue: 'bg-[#2691C2]/[0.07] text-[#2691C2] ring-[#2691C2]/10',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
  }[variant]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black ring-1 ${cls}`}>
      {fmtNum(count)} <span className="font-medium opacity-70">{label}</span>
    </span>
  )
}

type FormData = {
  title: string
  course_id: number | null
  description: string
  due_date: string   // datetime-local: "YYYY-MM-DDTHH:mm"
  max_score: string
  status: string
}

const EMPTY_FORM: FormData = { title: '', course_id: null, description: '', due_date: '', max_score: '', status: 'active' }

const fieldCls = 'w-full rounded-xl border border-[#22334A]/10 bg-[#22334A]/[0.02] px-3 py-2.5 text-sm font-semibold text-[#22334A] outline-none focus:border-[#2691C2]/40 focus:ring-2 focus:ring-[#2691C2]/10'

function AssignmentModal({
  initial,
  onSave,
  onClose,
  saving,
}: {
  initial?: AssignmentRow | null
  onSave: (data: FormData) => Promise<void>
  onClose: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<FormData>(() =>
    initial
      ? {
          title: initial.title ?? '',
          course_id: initial.course_id ?? initial.course?.id ?? null,
          description: initial.description ?? '',
          due_date: (initial.due_date ?? '').slice(0, 16),  // trim to HH:mm if longer
          max_score: String(initial.max_score ?? ''),
          status: initial.status ?? 'active',
        }
      : EMPTY_FORM
  )

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const set = <K extends keyof FormData>(k: K, v: FormData[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => ({ ...e, [k]: undefined }))
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof FormData, string>> = {}
    if (!form.title.trim()) errs.title = 'العنوان مطلوب'
    if (!form.course_id) errs.course_id = 'يجب اختيار دورة'
    if (!form.due_date) errs.due_date = 'موعد التسليم مطلوب'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    void onSave(form)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" role="dialog" aria-modal>
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl ring-1 ring-[#22334A]/[0.08]" dir="rtl">
        <div className="flex items-center justify-between border-b border-[#22334A]/[0.06] px-6 py-4">
          <h2 className="text-[15px] font-black text-[#22334A]">
            {initial ? 'تعديل الواجب' : 'إنشاء واجب جديد'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#22334A]/40 hover:bg-slate-100 hover:text-[#22334A]" aria-label="إغلاق">
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          <div className="space-y-4 px-6 py-5">
            {/* Title */}
            <div>
              <label className="mb-1.5 block text-[12px] font-black text-[#22334A]/60">عنوان الواجب <span className="text-rose-500">*</span></label>
              <input
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="أدخل عنوان الواجب"
                className={[fieldCls, errors.title ? 'border-rose-300 ring-1 ring-rose-200' : ''].join(' ')}
              />
              {errors.title && <p className="mt-1 text-[11px] font-bold text-rose-600">{errors.title}</p>}
            </div>

            {/* Course select */}
            <CourseSelectField
              value={form.course_id}
              onChange={(id) => set('course_id', id)}
              label="الدورة"
              required
              error={errors.course_id}
            />

            {/* Due date — modern picker */}
            <EmcDateTimePicker
              label="موعد التسليم"
              value={form.due_date}
              onChange={(v) => set('due_date', v)}
              required
              error={errors.due_date}
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[12px] font-black text-[#22334A]/60">أقصى درجة</label>
                <input
                  type="number"
                  value={form.max_score}
                  onChange={(e) => set('max_score', e.target.value)}
                  placeholder="100"
                  className={fieldCls}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] font-black text-[#22334A]/60">الحالة</label>
                <select
                  value={form.status}
                  onChange={(e) => set('status', e.target.value)}
                  className={fieldCls}
                >
                  <option value="active">نشط</option>
                  <option value="archived">أرشيف</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-[12px] font-black text-[#22334A]/60">الوصف</label>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={3}
                placeholder="وصف اختياري للواجب..."
                className={`${fieldCls} resize-none`}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#22334A]/[0.05] px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-[#22334A]/10 px-5 py-2 text-[12px] font-black text-[#22334A] transition hover:bg-slate-50"
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-xl bg-[#2691C2] px-5 py-2 text-[12px] font-black text-white shadow transition hover:bg-[#2691C2]/90 disabled:opacity-50"
          >
            {saving ? 'جارٍ الحفظ…' : initial ? 'حفظ التغييرات' : 'إنشاء الواجب'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AssignmentCard({
  row,
  onOpen,
  onEdit,
  onDelete,
  deleting,
}: {
  row: AssignmentRow
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
  deleting: boolean
}) {
  const overdue = row.status === 'active' && isOverdue(row.due_date)

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      whileHover={{ y: -2 }}
      className="group w-full rounded-2xl border border-[#22334A]/8 bg-white p-4 text-right shadow-sm transition hover:border-[#2691C2]/25 hover:shadow-md"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-black text-[#22334A] line-clamp-1 group-hover:text-[#2691C2]">{row.title ?? '—'}</p>
          <p className="mt-0.5 text-[12px] font-semibold text-[#2691C2]/80 line-clamp-1">{row.course_title}</p>
          <p className="mt-1 text-[11px] font-medium text-[#22334A]/45">{row.instructor_name}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-black ${STATUS_BADGE[row.status ?? ''] ?? 'bg-slate-100 text-slate-500'}`}>
          {STATUS_LABEL[row.status ?? ''] ?? row.status}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[#22334A]/6 pt-3">
        <div className="text-[11px] font-bold text-[#22334A]/50">
          <span className="text-[#22334A]/35">التسليم: </span>
          <span className={overdue ? 'text-rose-600' : 'text-[#22334A]'}>{fmtDate(row.due_date)}</span>
          {overdue ? <span className="mr-1 text-rose-600">· متأخر</span> : null}
        </div>
        {row.max_score != null ?
          <span className="text-[11px] font-black text-[#22334A]/45">{fmtNum(row.max_score)} نقطة</span>
        : null}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <Chip count={row.submissions_count ?? 0} label="تسليم" variant="blue" />
        {(row.pending_count ?? 0) > 0 ? <Chip count={row.pending_count!} label="مراجعة" variant="amber" /> : null}
        {(row.graded_count ?? 0) > 0 ? <Chip count={row.graded_count!} label="مُقيَّم" variant="emerald" /> : null}
        {(row.needs_resubmission_count ?? 0) > 0 ?
          <Chip count={row.needs_resubmission_count!} label="إعادة تسليم" variant="rose" />
        : null}
      </div>

      <div className="mt-3 flex justify-end gap-1 opacity-0 transition group-hover:opacity-100">
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onEdit() }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onEdit() } }}
          className="rounded-lg p-1.5 text-[#22334A]/40 transition hover:bg-[#2691C2]/10 hover:text-[#2691C2]"
          title="تعديل"
        >
          <Pencil size={14} />
        </span>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onDelete() } }}
          className="rounded-lg p-1.5 text-[#22334A]/40 transition hover:bg-red-50 hover:text-red-600"
          title="حذف"
        >
          {deleting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </span>
      </div>
    </motion.button>
  )
}

function AssignmentCardSkeleton() {
  return (
    <div className="rounded-2xl border border-[#22334A]/6 bg-white p-4 shadow-sm">
      <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
      <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-slate-100" />
      <div className="mt-4 h-8 w-full animate-pulse rounded-lg bg-slate-50" />
    </div>
  )
}

export default function AdminLmsAssignmentsPage() {
  const [rows, setRows] = useState<AssignmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCourse, setFilterCourse] = useState('')
  const [filterInstructor, setFilterInstructor] = useState('')
  const [dueDateFrom, setDueDateFrom] = useState('')
  const [dueDateTo, setDueDateTo] = useState('')
  const [filterPendingReview, setFilterPendingReview] = useState(false)
  const [filterNeedsResub, setFilterNeedsResub] = useState(false)
  const [modal, setModal] = useState<'create' | AssignmentRow | null>(null)
  const [drawerId, setDrawerId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    adminListAssignments()
      .then((list) => setRows((list as AdminAssignmentListItem[]).map(normRow)))
      .catch(() => setError('تعذّر تحميل الواجبات. تحقق من الاتصال وأعد المحاولة.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const courseOptions = useMemo(() => {
    const seen = new Set<string>()
    const opts: { value: string; label: string }[] = [{ value: '', label: 'كل الدورات' }]
    for (const r of rows) {
      const key = String(r.course_id ?? r.course?.id ?? '')
      const label = r.course_title ?? ''
      if (key && label && label !== 'دورة غير مرتبطة' && !seen.has(key)) {
        seen.add(key)
        opts.push({ value: key, label })
      }
    }
    return opts
  }, [rows])

  const instructorOptions = useMemo(() => {
    const seen = new Set<string>()
    const opts: { value: string; label: string }[] = [{ value: '', label: 'كل المدربين' }]
    for (const r of rows) {
      const name = r.instructor_name ?? ''
      if (name && name !== 'بدون مدرب' && !seen.has(name)) {
        seen.add(name)
        opts.push({ value: name, label: name })
      }
    }
    return opts
  }, [rows])

  const filtered = useMemo(() => rows.filter((r) => {
    const q = search.toLowerCase()
    const matchSearch = !q
      || (r.title ?? '').toLowerCase().includes(q)
      || (r.course_title ?? '').toLowerCase().includes(q)
      || (r.instructor_name ?? '').toLowerCase().includes(q)
    const matchStatus = !filterStatus || r.status === filterStatus
    const matchCourse = !filterCourse || String(r.course_id ?? r.course?.id ?? '') === filterCourse
    const matchInstructor = !filterInstructor || r.instructor_name === filterInstructor
    const due = r.due_date ?? ''
    const matchDateFrom = !dueDateFrom || due >= dueDateFrom
    const matchDateTo = !dueDateTo || due <= dueDateTo + 'T23:59:59'
    const matchPending = !filterPendingReview || (r.pending_count ?? 0) > 0
    const matchResub = !filterNeedsResub || (r.needs_resubmission_count ?? 0) > 0
    return matchSearch && matchStatus && matchCourse && matchInstructor && matchDateFrom && matchDateTo && matchPending && matchResub
  }), [rows, search, filterStatus, filterCourse, filterInstructor, dueDateFrom, dueDateTo, filterPendingReview, filterNeedsResub])

  const total = rows.length
  const active = rows.filter((r) => r.status === 'active').length
  const pendingTotal = rows.reduce((s, r) => s + (r.pending_count ?? 0), 0)
  const needsResubTotal = rows.reduce((s, r) => s + (r.needs_resubmission_count ?? 0), 0)
  const completedTotal = rows.filter((r) =>
    (r.submissions_count ?? 0) > 0
    && (r.graded_count ?? 0) >= (r.submissions_count ?? 0)
    && (r.pending_count ?? 0) === 0
    && (r.needs_resubmission_count ?? 0) === 0
  ).length
  const overdueTotal = rows.filter((r) => r.status === 'active' && isOverdue(r.due_date)).length

  const activeCount = countActiveFilters([
    search, filterStatus, filterCourse, filterInstructor, dueDateFrom, dueDateTo,
    filterPendingReview ? 'pending' : '', filterNeedsResub ? 'resub' : '',
  ])

  async function handleSave(form: FormData) {
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        course_id: form.course_id ?? undefined,
        description: form.description || undefined,
        due_date: form.due_date || undefined,
        max_score: form.max_score ? Number(form.max_score) : undefined,
        status: form.status,
      }
      if (modal && modal !== 'create') {
        await adminUpdateAssignment((modal as AssignmentRow).id, payload)
        toast.success('تم تحديث الواجب بنجاح')
      } else {
        await adminStoreAssignment(payload as Record<string, unknown>)
        toast.success('تم إنشاء الواجب بنجاح')
      }
      setModal(null)
      load()
    } catch {
      toast.error('تعذّر حفظ الواجب')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('هل أنت متأكد من حذف هذا الواجب؟')) return
    setDeleting(id)
    try {
      await adminDeleteAssignment(id)
      toast.success('تم حذف الواجب')
      setRows((prev) => prev.filter((r) => r.id !== id))
      if (drawerId === id) setDrawerId(null)
    } catch {
      toast.error('تعذّر حذف الواجب')
    } finally {
      setDeleting(null)
    }
  }

  function handleEditFromDrawer(detail: AdminAssignmentDetail) {
    const row = rows.find((r) => r.id === detail.assignment.id)
    if (row) {
      setModal(row)
    } else {
      setModal({
        id: detail.assignment.id,
        title: detail.assignment.title,
        course_id: detail.assignment.course_id ?? detail.course?.id ?? null,
        course: detail.course ? { id: detail.course.id, title: detail.course.title } : null,
        description: detail.assignment.description,
        due_date: detail.assignment.due_date,
        max_score: detail.assignment.max_score,
        status: detail.assignment.status,
      })
    }
  }

  function clearFilters() {
    setSearch('')
    setFilterStatus('')
    setFilterCourse('')
    setFilterInstructor('')
    setDueDateFrom('')
    setDueDateTo('')
    setFilterPendingReview(false)
    setFilterNeedsResub(false)
  }

  const toggleBtn = (active: boolean) =>
    `rounded-xl border px-3 py-2 text-[12px] font-black transition ${
      active
        ? 'border-[#2691C2]/30 bg-[#2691C2]/10 text-[#2691C2]'
        : 'border-[#22334A]/10 bg-white text-[#22334A]/55 hover:border-[#2691C2]/20'
    }`

  return (
    <>
      <AdminLmsShell
        title="إدارة الواجبات"
        description="متابعة الواجبات والتسليمات وحالة المراجعة لكل دورة"
        breadcrumb="الواجبات"
        kpis={[
          { label: 'إجمالي الواجبات', value: fmtNum(total), icon: ClipboardList, variant: 'brand' },
          { label: 'نشطة', value: fmtNum(active), icon: ClipboardCheck, variant: 'muted' },
          { label: 'بانتظار المراجعة', value: fmtNum(pendingTotal), icon: Hourglass, variant: 'accent' },
          { label: 'تحتاج إعادة تسليم', value: fmtNum(needsResubTotal), icon: RotateCcw, variant: 'warning' },
          { label: 'مكتملة', value: fmtNum(completedTotal), icon: CheckCircle2, variant: 'success' },
          { label: 'متأخرة', value: fmtNum(overdueTotal), icon: AlertTriangle, variant: 'warning' },
        ]}
        loading={loading}
        error={error}
        onRetry={load}
        onRefresh={load}
        action={
          <button
            onClick={() => setModal('create')}
            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-[12px] font-black text-[#22334A] shadow-sm transition hover:bg-white/90"
          >
            <Plus size={14} />
            واجب جديد
          </button>
        }
      >
        <LmsFilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="بحث بالعنوان أو الدورة أو المدرب…"
          activeFilterCount={activeCount}
          resultCount={filtered.length}
          totalCount={total}
          onReset={clearFilters}
          primary={
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={lmsSelectClass()}>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          }
          secondary={
            <>
              {courseOptions.length > 1 ?
                <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)} className={lmsSelectClass()}>
                  {courseOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              : null}
              {instructorOptions.length > 1 ?
                <select value={filterInstructor} onChange={(e) => setFilterInstructor(e.target.value)} className={lmsSelectClass()}>
                  {instructorOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              : null}
              <input type="date" value={dueDateFrom} onChange={(e) => setDueDateFrom(e.target.value)} className={lmsSelectClass()} title="من تاريخ" />
              <input type="date" value={dueDateTo} onChange={(e) => setDueDateTo(e.target.value)} className={lmsSelectClass()} title="إلى تاريخ" />
              <button type="button" onClick={() => setFilterPendingReview((v) => !v)} className={toggleBtn(filterPendingReview)}>
                بانتظار المراجعة
              </button>
              <button type="button" onClick={() => setFilterNeedsResub((v) => !v)} className={toggleBtn(filterNeedsResub)}>
                تحتاج إعادة تسليم
              </button>
            </>
          }
        />

        {loading ?
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <AssignmentCardSkeleton key={i} />)}
          </div>
        : filtered.length === 0 ?
          <LmsEmptyState
            icon={ClipboardList}
            title={activeCount > 0 ? 'لا توجد نتائج' : 'لا توجد واجبات حالياً'}
            description={activeCount > 0 ? 'جرّب تغيير معايير البحث أو مسح الفلاتر.' : 'أنشئ أول واجب للدورات.'}
          />
        : (
          <LmsDataPanel footer={`عرض ${fmtNum(filtered.length)} من ${fmtNum(total)} واجب`}>
            <div className="hidden border-b border-[#22334A]/6 bg-[#f8fafc]/80 px-5 py-3 lg:grid lg:grid-cols-[1.4fr_1fr_0.8fr_1.2fr_0.6fr] lg:gap-3">
              {['الواجب / الدورة', 'المدرب', 'التسليم', 'التسليمات', 'الحالة'].map((h) => (
                <span key={h} className="text-[10px] font-black uppercase tracking-wide text-[#22334A]/40">{h}</span>
              ))}
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-1 xl:gap-0 xl:divide-y xl:divide-[#22334A]/6">
              {filtered.map((r) => (
                <div key={r.id} className="xl:px-2 xl:py-1">
                  <div className="hidden xl:block">
                    <motion.button
                      type="button"
                      onClick={() => setDrawerId(r.id)}
                      whileHover={{ backgroundColor: 'rgba(38,145,194,0.04)' }}
                      className="grid w-full grid-cols-[1.4fr_1fr_0.8fr_1.2fr_0.6fr] items-center gap-3 rounded-xl px-3 py-3.5 text-right transition"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-[#22334A] line-clamp-1">{r.title ?? '—'}</p>
                        <p className="text-[11px] font-semibold text-[#2691C2]/70 line-clamp-1">{r.course_title}</p>
                      </div>
                      <p className="text-[12px] font-semibold text-[#22334A]/65">{r.instructor_name}</p>
                      <div>
                        <p className={`text-[12px] font-semibold ${isOverdue(r.due_date) && r.status === 'active' ? 'text-rose-600' : 'text-[#22334A]/65'}`}>
                          {fmtDate(r.due_date)}
                        </p>
                        {r.max_score != null ?
                          <p className="text-[10px] text-[#22334A]/35">{fmtNum(r.max_score)} نقطة</p>
                        : null}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <Chip count={r.submissions_count ?? 0} label="إجمالي" variant="blue" />
                        {(r.pending_count ?? 0) > 0 ? <Chip count={r.pending_count!} label="مراجعة" variant="amber" /> : null}
                        {(r.needs_resubmission_count ?? 0) > 0 ?
                          <Chip count={r.needs_resubmission_count!} label="إعادة" variant="rose" />
                        : null}
                      </div>
                      <span className={`justify-self-start rounded-full px-2 py-0.5 text-[10px] font-black ${STATUS_BADGE[r.status ?? ''] ?? ''}`}>
                        {STATUS_LABEL[r.status ?? ''] ?? r.status}
                      </span>
                    </motion.button>
                  </div>
                  <div className="xl:hidden">
                    <AssignmentCard
                      row={r}
                      onOpen={() => setDrawerId(r.id)}
                      onEdit={() => setModal(r)}
                      onDelete={() => void handleDelete(r.id)}
                      deleting={deleting === r.id}
                    />
                  </div>
                </div>
              ))}
            </div>
          </LmsDataPanel>
        )}
      </AdminLmsShell>

      <AdminAssignmentDetailDrawer
        assignmentId={drawerId}
        open={drawerId != null}
        onClose={() => setDrawerId(null)}
        onEdit={handleEditFromDrawer}
        onDelete={(id) => void handleDelete(id)}
        deleting={deleting != null}
      />

      {modal != null && (
        <AssignmentModal
          initial={modal === 'create' ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
          saving={saving}
        />
      )}
    </>
  )
}
