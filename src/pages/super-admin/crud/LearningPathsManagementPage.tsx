import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  GraduationCap,
  BookOpen,
  Users,
  Clock,
  Award,
  Star,
  X,
  ImageIcon,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  ChevronDown,
  UserCircle,
  TrendingUp,
  Mail,
  Phone,
  ChevronRight,
  Archive,
  Globe,
  PauseCircle,
} from 'lucide-react'
import {
  fetchAdminLearningPaths,
  fetchAdminLearningPath,
  fetchAdminLearningPathDetail,
  createLearningPath,
  updateLearningPath,
  deleteLearningPath,
  updateLearningPathStatus,
  fetchInstructorOptions,
  type LearningPath,
  type LearningPathStudent,
  type InstructorOption,
} from '../../../api/learningPathsApi'
import CourseSelector from '../../../components/learning-paths/CourseSelector'
import { DropdownPortal } from '@/components/ui/DropdownPortal'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Always returns ASCII/English digit string for a number (no Arabic numerals). */
function en(n: number | string | null | undefined): string {
  if (n == null) return '—'
  const num = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(num)) return String(n)
  return new Intl.NumberFormat('en-US').format(num)
}

function enPrice(n: number | string | null | undefined): string {
  if (n == null) return '—'
  const num = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(num)) return '—'
  return '€' + new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(num)
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft:     { label: 'مسودة',  cls: 'bg-slate-100 text-slate-600 border-slate-200' },
    published: { label: 'منشور', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    archived:  { label: 'مؤرشف', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  }
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-slate-100 text-slate-600 border-slate-200' }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${cls}`}>
      {label}
    </span>
  )
}

// ─── Instructor Searchable Select ─────────────────────────────────────────────

function InstructorSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (id: string, name: string) => void
}) {
  const [search, setSearch]           = useState('')
  const [options, setOptions]         = useState<InstructorOption[]>([])
  const [loading, setLoading]         = useState(false)
  const [open, setOpen]               = useState(false)
  const [selectedLabel, setSelectedLabel] = useState<string>('')
  const wrapRef = useRef<HTMLDivElement>(null)

  // Load options (debounced on search change)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const timer = setTimeout(() => {
      fetchInstructorOptions(search || undefined)
        .then((opts) => { if (!cancelled) setOptions(opts) })
        .catch(() => {})
        .finally(() => { if (!cancelled) setLoading(false) })
    }, 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [search])

  // Sync label from options when value changes
  useEffect(() => {
    if (!value) { setSelectedLabel(''); return }
    const found = options.find((o) => String(o.id) === value)
    if (found) setSelectedLabel(found.name)
  }, [value, options])

  const select = (opt: InstructorOption) => {
    onChange(String(opt.id), opt.name)
    setSelectedLabel(opt.name)
    setSearch('')
    setOpen(false)
  }

  const clear = () => {
    onChange('', '')
    setSelectedLabel('')
    setSearch('')
  }

  return (
    <div ref={wrapRef} className="relative">
      {/* Trigger / selected display */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm transition hover:border-[#2691C2] focus:border-[#2691C2] focus:outline-none focus:ring-2 focus:ring-[#2691C2]/20"
      >
        <div className="flex min-w-0 items-center gap-2">
          <UserCircle className="h-4 w-4 shrink-0 text-slate-400" />
          <span className={`truncate text-right ${selectedLabel ? 'text-slate-800' : 'text-slate-400'}`}>
            {selectedLabel || 'اختر المدرب...'}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); clear() }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); clear() } }}
              className="rounded p-0.5 text-slate-400 hover:text-red-400"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className={`h-4 w-4 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown */}
      <DropdownPortal
        open={open}
        anchorRef={wrapRef}
        onClose={() => setOpen(false)}
        align="stretch"
        offset={4}
        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
      >
        {/* Search input */}
        <div className="border-b border-slate-100 p-2">
          <div className="relative">
            <Search className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث..."
              className="w-full rounded-lg border border-slate-100 py-1.5 pr-8 pl-3 text-sm focus:border-[#2691C2] focus:outline-none"
            />
          </div>
        </div>
        {/* Options list */}
        <div className="max-h-52 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            </div>
          ) : options.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-400">لا توجد نتائج</p>
          ) : (
            options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => select(opt)}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-right text-sm transition hover:bg-[#2691C2]/5 ${
                  String(opt.id) === value ? 'bg-[#2691C2]/10 font-bold text-[#2691C2]' : 'text-slate-700'
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                  {opt.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1 text-right">
                  <p className="truncate font-semibold">{opt.name}</p>
                  {opt.email && (
                    <p className="truncate text-[11px] text-slate-400" dir="ltr">{opt.email}</p>
                  )}
                </div>
                {opt.title && (
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                    {opt.title}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </DropdownPortal>
    </div>
  )
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteModal({
  path,
  onConfirm,
  onCancel,
  deleting,
}: {
  path: LearningPath
  onConfirm: () => void
  onCancel: () => void
  deleting: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl"
        dir="rtl"
      >
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
          <AlertTriangle className="h-7 w-7 text-red-500" />
        </div>
        <h3 className="mb-2 text-xl font-black text-slate-800">حذف المسار التعليمي</h3>
        <p className="mb-6 text-sm text-slate-500">
          هل أنت متأكد من حذف المسار "<strong>{path.title}</strong>"؟ هذا الإجراء لا يمكن التراجع عنه.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-500 py-3 text-sm font-black text-white transition hover:bg-red-600 disabled:opacity-60"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            حذف
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Status Confirm Modal ─────────────────────────────────────────────────────

type StatusAction = 'published' | 'draft' | 'archived'

function StatusModal({
  path,
  action,
  onConfirm,
  onCancel,
  loading,
}: {
  path: LearningPath
  action: StatusAction
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  const config: Record<StatusAction, { title: string; desc: string; icon: React.ReactNode; btnCls: string; btnLabel: string }> = {
    published: {
      title:    'نشر المسار التعليمي',
      desc:     `سيصبح المسار "${path.title}" مرئياً للطلاب بعد النشر.`,
      icon:     <Globe className="h-7 w-7 text-emerald-500" />,
      btnCls:   'bg-emerald-500 hover:bg-emerald-600',
      btnLabel: 'نشر',
    },
    draft: {
      title:    'إلغاء نشر المسار',
      desc:     `سيتم إخفاء المسار "${path.title}" عن الطلاب وتحويله إلى مسودة.`,
      icon:     <PauseCircle className="h-7 w-7 text-slate-500" />,
      btnCls:   'bg-slate-600 hover:bg-slate-700',
      btnLabel: 'إلغاء النشر',
    },
    archived: {
      title:    'أرشفة المسار التعليمي',
      desc:     `سيتم أرشفة المسار "${path.title}". يمكنك إعادة نشره لاحقاً.`,
      icon:     <Archive className="h-7 w-7 text-amber-500" />,
      btnCls:   'bg-amber-500 hover:bg-amber-600',
      btnLabel: 'أرشفة',
    },
  }

  const c = config[action]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl"
        dir="rtl"
      >
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50">
          {c.icon}
        </div>
        <h3 className="mb-2 text-xl font-black text-slate-800">{c.title}</h3>
        <p className="mb-6 text-sm text-slate-500">{c.desc}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-black text-white transition disabled:opacity-60 ${c.btnCls}`}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {c.btnLabel}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Form Modal ───────────────────────────────────────────────────────────────

type FormStep = 1 | 2 | 3 | 4

interface FormState {
  title: string
  slug: string
  short_description: string
  full_description: string
  duration: string
  duration_unit: string
  language: string
  level: string
  certificate_name: string
  price: string
  discount_price: string
  status: string
  is_featured: boolean
  enrollment_open: boolean
  learning_outcomes: string[]
  requirements: string[]
  instructor_id: string
  instructor_name: string
  course_ids: number[]
  featured_image_file: File | null
  featured_image_preview: string | null
  study_days_per_week: string
  study_days: string[]
  study_time: string
  schedule_note: string
}

const STUDY_DAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

const defaultForm = (): FormState => ({
  title: '',
  slug: '',
  short_description: '',
  full_description: '',
  duration: '',
  duration_unit: 'weeks',
  language: '',
  level: '',
  certificate_name: '',
  price: '',
  discount_price: '',
  status: 'draft',
  is_featured: false,
  enrollment_open: true,
  learning_outcomes: [''],
  requirements: [''],
  instructor_id: '',
  instructor_name: '',
  course_ids: [],
  featured_image_file: null,
  featured_image_preview: null,
  study_days_per_week: '',
  study_days: [],
  study_time: '',
  schedule_note: '',
})

function pathToForm(p: LearningPath): FormState {
  return {
    title:                p.title,
    slug:                 p.slug,
    short_description:    p.short_description ?? '',
    full_description:     p.full_description ?? '',
    duration:             p.duration ?? '',
    duration_unit:        p.duration_unit ?? 'weeks',
    language:             p.language ?? '',
    level:                p.level ?? '',
    certificate_name:     p.certificate_name ?? '',
    price:                p.price != null ? String(p.price) : '',
    discount_price:       p.discount_price != null ? String(p.discount_price) : '',
    status:               p.status,
    is_featured:          p.is_featured,
    enrollment_open:      p.enrollment_open,
    learning_outcomes:    p.learning_outcomes.length ? p.learning_outcomes : [''],
    requirements:         p.requirements.length ? p.requirements : [''],
    instructor_id:        p.instructor_id != null ? String(p.instructor_id) : '',
    instructor_name:      p.instructor?.name ?? '',
    course_ids:           (p.courses ?? []).map((c) => c.id),
    featured_image_file:  null,
    featured_image_preview: p.featured_image ?? null,
    study_days_per_week:  p.study_days_per_week != null ? String(p.study_days_per_week) : '',
    study_days:           p.study_days ?? [],
    study_time:           p.study_time ?? '',
    schedule_note:        p.schedule_note ?? '',
  }
}

function FormModal({
  editPath,
  onClose,
  onSaved,
}: {
  editPath: LearningPath | null
  onClose: () => void
  onSaved: () => void
}) {
  const [step, setStep] = useState<FormStep>(1)
  const [form, setForm] = useState<FormState>(editPath ? pathToForm(editPath) : defaultForm())
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const set = (key: keyof FormState, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    set('featured_image_file', file)
    set('featured_image_preview', URL.createObjectURL(file))
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError('عنوان المسار مطلوب'); return }
    setSaving(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('title',             form.title)
      fd.append('slug',              form.slug)
      fd.append('short_description', form.short_description)
      fd.append('full_description',  form.full_description)
      fd.append('duration',          form.duration)
      fd.append('duration_unit',     form.duration_unit)
      fd.append('language',          form.language)
      fd.append('level',             form.level)
      fd.append('certificate_name',  form.certificate_name)
      fd.append('price',             form.price)
      fd.append('discount_price',    form.discount_price)
      fd.append('status',            form.status)
      fd.append('is_featured',       String(form.is_featured ? 1 : 0))
      fd.append('enrollment_open',   String(form.enrollment_open ? 1 : 0))
      if (form.instructor_id) fd.append('instructor_id', form.instructor_id)
      form.learning_outcomes.filter(Boolean).forEach((o, i) => fd.append(`learning_outcomes[${i}]`, o))
      form.requirements.filter(Boolean).forEach((r, i)      => fd.append(`requirements[${i}]`, r))
      form.course_ids.forEach((id, i) => fd.append(`course_ids[${i}]`, String(id)))
      if (form.study_days_per_week.trim()) fd.append('study_days_per_week', form.study_days_per_week.trim())
      form.study_days.forEach((d, i) => fd.append(`study_days[${i}]`, d))
      if (form.study_time.trim()) fd.append('study_time', form.study_time.trim())
      if (form.schedule_note.trim()) fd.append('schedule_note', form.schedule_note.trim())
      if (form.featured_image_file) fd.append('featured_image', form.featured_image_file)

      if (editPath) {
        await updateLearningPath(editPath.id, fd)
      } else {
        await createLearningPath(fd)
      }
      onSaved()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'حدث خطأ أثناء الحفظ')
    } finally {
      setSaving(false)
    }
  }

  const steps = [
    { num: 1, label: 'المعلومات الأساسية' },
    { num: 2, label: 'الوسائط' },
    { num: 3, label: 'التفاصيل التعليمية' },
    { num: 4, label: 'الدورات المضمنة' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-10">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-6">
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-xl font-black text-slate-800">
            {editPath ? 'تعديل المسار التعليمي' : 'إنشاء مسار تعليمي جديد'}
          </h2>
        </div>

        {/* Step tabs */}
        <div className="flex border-b border-slate-100 px-6">
          {steps.map((s) => (
            <button
              key={s.num}
              onClick={() => setStep(s.num as FormStep)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition ${
                step === s.num
                  ? 'border-[#2691C2] text-[#2691C2]'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <span
                dir="ltr"
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${
                  step === s.num ? 'bg-[#2691C2] text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {s.num}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          ))}
        </div>

        {/* Step content */}
        <div className="space-y-5 p-6">
          {/* Step 1 — Basic info + Instructor */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">عنوان المسار *</label>
                <input
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder="مسار مهندس الذكاء الاصطناعي"
                  className="w-full rounded-xl border border-slate-200 p-3 text-right text-sm focus:border-[#2691C2] focus:outline-none focus:ring-2 focus:ring-[#2691C2]/20"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">الرابط المختصر (slug)</label>
                  <input
                    value={form.slug}
                    onChange={(e) => set('slug', e.target.value)}
                    placeholder="ai-engineer-path"
                    dir="ltr"
                    className="w-full rounded-xl border border-slate-200 p-3 text-left text-sm focus:border-[#2691C2] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">حالة النشر</label>
                  <select
                    value={form.status}
                    onChange={(e) => set('status', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-3 text-right text-sm focus:border-[#2691C2] focus:outline-none"
                  >
                    <option value="draft">مسودة</option>
                    <option value="published">منشور</option>
                    <option value="archived">مؤرشف</option>
                  </select>
                </div>
              </div>

              {/* ── Instructor ── */}
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">المدرب المسؤول</label>
                <InstructorSelect
                  value={form.instructor_id}
                  onChange={(id, name) => {
                    set('instructor_id', id)
                    set('instructor_name', name)
                  }}
                />
                {form.instructor_id && (
                  <p className="mt-1.5 text-xs font-semibold text-emerald-600">
                    ✓ المدرب المحدد: {form.instructor_name || form.instructor_id}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">وصف قصير</label>
                <textarea
                  rows={3}
                  value={form.short_description}
                  onChange={(e) => set('short_description', e.target.value)}
                  placeholder="وصف موجز للمسار يظهر في بطاقة المسار..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-right text-sm focus:border-[#2691C2] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">وصف تفصيلي</label>
                <textarea
                  rows={5}
                  value={form.full_description}
                  onChange={(e) => set('full_description', e.target.value)}
                  placeholder="وصف شامل للمسار..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-right text-sm focus:border-[#2691C2] focus:outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.is_featured}
                    onChange={(e) => set('is_featured', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#2691C2]"
                  />
                  <span className="text-sm font-semibold text-slate-700">مسار مميز</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.enrollment_open}
                    onChange={(e) => set('enrollment_open', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#2691C2]"
                  />
                  <span className="text-sm font-semibold text-slate-700">التسجيل مفتوح</span>
                </label>
              </div>
            </div>
          )}

          {/* Step 2 — Media + Pricing */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">صورة الغلاف</label>
                <label className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center transition hover:border-[#2691C2]/50 hover:bg-[#2691C2]/5">
                  {form.featured_image_preview ? (
                    <img
                      src={form.featured_image_preview}
                      alt="preview"
                      className="h-40 w-full rounded-xl object-cover"
                    />
                  ) : (
                    <>
                      <ImageIcon className="mb-3 h-10 w-10 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-500">اضغط لرفع صورة الغلاف</p>
                      <p className="mt-1 text-xs text-slate-400">PNG, JPG, WEBP — حتى 4MB</p>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
                </label>
                {form.featured_image_preview && (
                  <button
                    onClick={() => { set('featured_image_file', null); set('featured_image_preview', null) }}
                    className="mt-2 text-xs text-red-500 hover:underline"
                  >
                    إزالة الصورة
                  </button>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">السعر (€)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.price}
                    onChange={(e) => set('price', e.target.value)}
                    placeholder="440"
                    dir="ltr"
                    className="w-full rounded-xl border border-slate-200 p-3 text-left text-sm focus:border-[#2691C2] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">سعر الخصم (€)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.discount_price}
                    onChange={(e) => set('discount_price', e.target.value)}
                    placeholder="390"
                    dir="ltr"
                    className="w-full rounded-xl border border-slate-200 p-3 text-left text-sm focus:border-[#2691C2] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Educational details */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">المدة</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      value={form.duration}
                      onChange={(e) => set('duration', e.target.value)}
                      placeholder="6"
                      dir="ltr"
                      className="w-20 rounded-xl border border-slate-200 p-3 text-left text-sm focus:border-[#2691C2] focus:outline-none"
                    />
                    <select
                      value={form.duration_unit}
                      onChange={(e) => set('duration_unit', e.target.value)}
                      className="flex-1 rounded-xl border border-slate-200 p-3 text-sm focus:border-[#2691C2] focus:outline-none"
                    >
                      <option value="days">أيام</option>
                      <option value="weeks">أسابيع</option>
                      <option value="months">أشهر</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">المستوى</label>
                  <select
                    value={form.level}
                    onChange={(e) => set('level', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-[#2691C2] focus:outline-none"
                  >
                    <option value="">اختر المستوى</option>
                    <option value="beginner">مبتدئ</option>
                    <option value="intermediate">متوسط</option>
                    <option value="advanced">متقدم</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">اللغة</label>
                  <input
                    value={form.language}
                    onChange={(e) => set('language', e.target.value)}
                    placeholder="العربية"
                    className="w-full rounded-xl border border-slate-200 p-3 text-right text-sm focus:border-[#2691C2] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">اسم الشهادة</label>
                  <input
                    value={form.certificate_name}
                    onChange={(e) => set('certificate_name', e.target.value)}
                    placeholder="AI Engineering Certificate"
                    className="w-full rounded-xl border border-slate-200 p-3 text-right text-sm focus:border-[#2691C2] focus:outline-none"
                  />
                </div>
              </div>

              {/* Learning outcomes */}
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">ماذا ستتعلم</label>
                {form.learning_outcomes.map((item, i) => (
                  <div key={i} className="mb-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => set('learning_outcomes', form.learning_outcomes.filter((_, j) => j !== i))}
                      className="text-red-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <input
                      value={item}
                      onChange={(e) => {
                        const arr = [...form.learning_outcomes]
                        arr[i] = e.target.value
                        set('learning_outcomes', arr)
                      }}
                      placeholder={`النقطة ${en(i + 1)}`}
                      className="flex-1 rounded-xl border border-slate-200 p-3 text-right text-sm focus:border-[#2691C2] focus:outline-none"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => set('learning_outcomes', [...form.learning_outcomes, ''])}
                  className="mt-1 text-xs font-semibold text-[#2691C2] hover:underline"
                >
                  + إضافة نقطة
                </button>
              </div>

              {/* Requirements */}
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">المتطلبات</label>
                {form.requirements.map((item, i) => (
                  <div key={i} className="mb-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => set('requirements', form.requirements.filter((_, j) => j !== i))}
                      className="text-red-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <input
                      value={item}
                      onChange={(e) => {
                        const arr = [...form.requirements]
                        arr[i] = e.target.value
                        set('requirements', arr)
                      }}
                      placeholder={`المتطلب ${en(i + 1)}`}
                      className="flex-1 rounded-xl border border-slate-200 p-3 text-right text-sm focus:border-[#2691C2] focus:outline-none"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => set('requirements', [...form.requirements, ''])}
                  className="mt-1 text-xs font-semibold text-[#2691C2] hover:underline"
                >
                  + إضافة متطلب
                </button>
              </div>

              {/* Schedule metadata */}
              <div className="border-t border-slate-100 pt-4">
                <p className="mb-3 text-sm font-black text-slate-800">جدول الدراسة (اختياري)</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-bold text-slate-700">عدد أيام الدراسة في الأسبوع</label>
                    <select
                      value={form.study_days_per_week}
                      onChange={(e) => set('study_days_per_week', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-3 text-right text-sm focus:border-[#2691C2] focus:outline-none"
                    >
                      <option value="">— غير محدد —</option>
                      {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                        <option key={n} value={String(n)}>{en(n)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-bold text-slate-700">وقت الدراسة</label>
                    <input
                      value={form.study_time}
                      onChange={(e) => set('study_time', e.target.value)}
                      placeholder="19:00 - 20:30"
                      dir="ltr"
                      className="w-full rounded-xl border border-slate-200 p-3 text-left text-sm focus:border-[#2691C2] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="mb-2 block text-sm font-bold text-slate-700">أيام الدراسة</label>
                  <div className="flex flex-wrap gap-2">
                    {STUDY_DAYS_AR.map((day) => {
                      const checked = form.study_days.includes(day)
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() =>
                            set(
                              'study_days',
                              checked ?
                                form.study_days.filter((d) => d !== day)
                              : [...form.study_days, day],
                            )
                          }
                          className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                            checked
                              ? 'border-[#2691C2] bg-[#2691C2] text-white'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-[#2691C2]/50'
                          }`}
                        >
                          {day}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="mt-4">
                  <label className="mb-1 block text-sm font-bold text-slate-700">ملاحظات الجدول</label>
                  <input
                    value={form.schedule_note}
                    onChange={(e) => set('schedule_note', e.target.value)}
                    placeholder="مرتين في الأسبوع"
                    className="w-full rounded-xl border border-slate-200 p-3 text-right text-sm focus:border-[#2691C2] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4 — Course selector */}
          {step === 4 && (
            <CourseSelector
              value={form.course_ids}
              onChange={(ids) => set('course_ids', ids)}
            />
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-600">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 p-6">
          <div className="flex gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep((s) => (s - 1) as FormStep)}
                className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                السابق
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              إلغاء
            </button>
            {step < 4 ? (
              <button
                onClick={() => setStep((s) => (s + 1) as FormStep)}
                className="rounded-2xl bg-[#2691C2] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#1d7aab]"
              >
                التالي
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#2691C2] px-6 py-2.5 text-sm font-black text-white transition hover:bg-[#1d7aab] disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                {editPath ? 'حفظ التعديلات' : 'إنشاء المسار'}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LearningPathsManagementPage() {
  const [paths, setPaths]           = useState<LearningPath[]>([])
  const [meta, setMeta]             = useState({ total: 0, current_page: 1, last_page: 1, per_page: 20 })
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage]             = useState(1)
  const [showForm, setShowForm]     = useState(false)
  const [editPath, setEditPath]     = useState<LearningPath | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LearningPath | null>(null)
  const [deleting, setDeleting]     = useState(false)
  const [toast, setToast]           = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [statusTarget, setStatusTarget] = useState<{ path: LearningPath; action: StatusAction } | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)
  const [detailPath, setDetailPath] = useState<LearningPath | null>(null)
  const [detailStudents, setDetailStudents] = useState<LearningPathStudent[]>([])
  const [detailCounts, setDetailCounts] = useState({ courses: 0, students: 0, active_students: 0, completed_students: 0 })
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailTab, setDetailTab]   = useState<'overview' | 'courses' | 'students'>('overview')

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(() => {
    setLoading(true)
    fetchAdminLearningPaths({
      search:   search || undefined,
      status:   statusFilter || undefined,
      page,
      per_page: 20,
    })
      .then((res) => { setPaths(res.data); setMeta(res.meta) })
      .catch(() => showToast('فشل تحميل المسارات', 'error'))
      .finally(() => setLoading(false))
  }, [search, statusFilter, page])

  useEffect(() => { load() }, [load])

  const openEdit = async (p: LearningPath) => {
    const full = await fetchAdminLearningPath(p.id)
    setEditPath(full ?? p)
    setShowForm(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteLearningPath(deleteTarget.id)
      showToast('تم حذف المسار بنجاح')
      setDeleteTarget(null)
      load()
    } catch {
      showToast('فشل حذف المسار', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const handleStatusChange = async () => {
    if (!statusTarget) return
    setStatusLoading(true)
    try {
      await updateLearningPathStatus(statusTarget.path.id, statusTarget.action)
      const labels: Record<StatusAction, string> = {
        published: 'تم نشر المسار بنجاح',
        draft:     'تم إلغاء نشر المسار',
        archived:  'تم أرشفة المسار',
      }
      showToast(labels[statusTarget.action])
      setStatusTarget(null)
      load()
    } catch {
      showToast('فشل تغيير حالة المسار', 'error')
    } finally {
      setStatusLoading(false)
    }
  }

  const openDetail = async (p: LearningPath, tab: 'overview' | 'courses' | 'students' = 'overview') => {
    setDetailPath(p)
    setDetailTab(tab)
    setDetailLoading(true)
    const detail = await fetchAdminLearningPathDetail(p.id)
    if (detail) {
      setDetailStudents(detail.students)
      setDetailCounts(detail.counts)
      setDetailPath(detail.data)
    }
    setDetailLoading(false)
  }

  const statusTabs = [
    { value: '',          label: 'الكل' },
    { value: 'published', label: 'منشور' },
    { value: 'draft',     label: 'مسودة' },
    { value: 'archived',  label: 'مؤرشف' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8" dir="rtl">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`fixed right-4 top-4 z-50 flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-xl ${
              toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#22334A]">المسارات التعليمية</h1>
          <p className="mt-1 text-sm text-slate-500">إدارة المسارات التعليمية المتكاملة للمنصة</p>
        </div>
        <button
          onClick={() => { setEditPath(null); setShowForm(true) }}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#2691C2] px-5 py-3 font-black text-white shadow-md shadow-[#2691C2]/25 transition hover:bg-[#1d7aab]"
        >
          <Plus className="h-5 w-5" />
          إنشاء مسار جديد
        </button>
      </div>

      {/* Stats strip — English numerals */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'إجمالي المسارات', value: meta.total,                                               icon: GraduationCap, color: 'text-[#2691C2]' },
          { label: 'المنشورة',        value: paths.filter((p) => p.status === 'published').length,    icon: Eye,           color: 'text-emerald-500' },
          { label: 'المسودات',        value: paths.filter((p) => p.status === 'draft').length,        icon: EyeOff,        color: 'text-slate-400' },
          { label: 'المميزة',         value: paths.filter((p) => p.is_featured).length,               icon: Star,          color: 'text-amber-500' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <s.icon className={`h-6 w-6 ${s.color}`} />
              <p className="text-2xl font-black text-[#22334A]" dir="ltr">{en(s.value)}</p>
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="بحث عن مسار..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-9 pl-4 text-sm text-right focus:border-[#2691C2] focus:outline-none focus:ring-2 focus:ring-[#2691C2]/20"
          />
        </div>
        <div className="flex gap-2">
          {statusTabs.map((t) => (
            <button
              key={t.value}
              onClick={() => { setStatusFilter(t.value); setPage(1) }}
              className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                statusFilter === t.value
                  ? 'bg-[#2691C2] text-white shadow'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-[#2691C2]/40'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Result count */}
      {!loading && (
        <p className="mb-3 text-[11px] font-bold text-slate-400" dir="rtl">
          تم العثور على <span className="font-black text-[#22334A]">{paths.length}</span> نتيجة من أصل <span className="font-black text-[#22334A]">{meta.total}</span> مسار
        </p>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#2691C2]" />
          </div>
        ) : paths.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <GraduationCap className="mb-3 h-12 w-12 text-slate-200" />
            <p className="font-semibold text-slate-400">لا توجد مسارات</p>
            <button
              onClick={() => { setEditPath(null); setShowForm(true) }}
              className="mt-4 text-sm font-bold text-[#2691C2] hover:underline"
            >
              إنشاء أول مسار
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-6 py-4 font-bold text-slate-500">المسار</th>
                  <th className="hidden px-4 py-4 font-bold text-slate-500 sm:table-cell">المدرب</th>
                  <th className="hidden px-4 py-4 font-bold text-slate-500 lg:table-cell">الدورات</th>
                  <th className="hidden px-4 py-4 font-bold text-slate-500 lg:table-cell">الطلاب</th>
                  <th className="hidden px-4 py-4 font-bold text-slate-500 md:table-cell">السعر</th>
                  <th className="px-4 py-4 font-bold text-slate-500">الحالة</th>
                  <th className="px-4 py-4 font-bold text-slate-500">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paths.map((p) => (
                  // ── Entire row is clickable → opens edit modal ──
                  <tr
                    key={p.id}
                    className="group cursor-pointer transition hover:bg-[#2691C2]/[0.03]"
                    onClick={() => void openEdit(p)}
                  >
                    {/* Path */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-[#2691C2] to-[#22334A]">
                          {p.featured_image ? (
                            <img src={p.featured_image} alt={p.title} className="h-full w-full object-cover" />
                          ) : (
                            <GraduationCap className="absolute inset-0 m-auto h-6 w-6 text-white/40" />
                          )}
                        </div>
                        <div>
                          <p className="line-clamp-1 font-black text-[#22334A] group-hover:text-[#2691C2]">
                            {p.title}
                          </p>
                          <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                            {p.is_featured && (
                              <span className="flex items-center gap-0.5 text-amber-500">
                                <Star className="h-3 w-3 fill-amber-500" /> مميز
                              </span>
                            )}
                            {p.duration && (
                              <span className="flex items-center gap-1" dir="ltr">
                                <Clock className="h-3 w-3" />
                                {en(p.duration)} {p.duration_unit === 'weeks' ? 'أسابيع' : p.duration_unit === 'months' ? 'أشهر' : 'أيام'}
                              </span>
                            )}
                            {p.certificate_name && (
                              <span className="flex items-center gap-1 text-amber-500">
                                <Award className="h-3 w-3" /> شهادة
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Instructor */}
                    <td className="hidden px-4 py-4 sm:table-cell">
                      {p.instructor?.name ? (
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2691C2]/10 text-xs font-black text-[#2691C2]">
                            {p.instructor.name.charAt(0)}
                          </div>
                          <span className="text-slate-700">{p.instructor.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">غير محدد</span>
                      )}
                    </td>

                    {/* Courses — English number */}
                    <td className="hidden px-4 py-4 lg:table-cell">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#2691C2]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#2691C2]" dir="ltr">
                        <BookOpen className="h-3 w-3" /> {en(p.courses_count)}
                      </span>
                    </td>

                    {/* Students — clickable to show drawer */}
                    <td className="hidden px-4 py-4 lg:table-cell">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); void openDetail(p, 'students') }}
                        className="inline-flex items-center gap-1 rounded-xl px-2 py-1 text-slate-500 transition hover:bg-[#2691C2]/10 hover:text-[#2691C2]"
                        title="عرض الطلاب المسجلين"
                        dir="ltr"
                      >
                        <Users className="h-3.5 w-3.5" /> {en(p.students_count)}
                        {Number(p.students_count) > 0 && <ChevronRight className="h-3 w-3 opacity-50" />}
                      </button>
                    </td>

                    {/* Price — English number */}
                    <td className="hidden px-4 py-4 md:table-cell">
                      <span className="font-bold text-[#22334A]" dir="ltr">
                        {p.price != null ? enPrice(p.price) : '—'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <StatusBadge status={p.status} />
                    </td>

                    {/* Actions — stopPropagation prevents row click */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); void openDetail(p) }}
                          className="rounded-xl p-2 text-slate-400 transition hover:bg-[#2691C2]/10 hover:text-[#2691C2]"
                          title="عرض التفاصيل والطلاب"
                        >
                          <Users className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); void openEdit(p) }}
                          className="rounded-xl p-2 text-slate-400 transition hover:bg-[#2691C2]/10 hover:text-[#2691C2]"
                          title="تعديل"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {p.status !== 'published' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setStatusTarget({ path: p, action: 'published' }) }}
                            className="rounded-xl p-2 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600"
                            title="نشر"
                          >
                            <Globe className="h-4 w-4" />
                          </button>
                        )}
                        {p.status === 'published' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setStatusTarget({ path: p, action: 'draft' }) }}
                            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                            title="إلغاء النشر"
                          >
                            <PauseCircle className="h-4 w-4" />
                          </button>
                        )}
                        {p.status !== 'archived' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setStatusTarget({ path: p, action: 'archived' }) }}
                            className="rounded-xl p-2 text-slate-400 transition hover:bg-amber-50 hover:text-amber-600"
                            title="أرشفة"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(p) }}
                          className="rounded-xl p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination — English numerals */}
        {meta.last_page > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
            <p className="text-xs text-slate-400" dir="ltr">
              {en(meta.total)} مسار إجمالاً
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-[#2691C2] disabled:opacity-40"
              >
                السابق
              </button>
              <span className="text-xs text-slate-500" dir="ltr">
                {en(page)} / {en(meta.last_page)}
              </span>
              <button
                disabled={page === meta.last_page}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-[#2691C2] disabled:opacity-40"
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showForm && (
          <FormModal
            editPath={editPath}
            onClose={() => { setShowForm(false); setEditPath(null) }}
            onSaved={() => {
              setShowForm(false)
              setEditPath(null)
              showToast(editPath ? 'تم تحديث المسار بنجاح' : 'تم إنشاء المسار بنجاح')
              load()
            }}
          />
        )}
        {deleteTarget && (
          <DeleteModal
            path={deleteTarget}
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
            deleting={deleting}
          />
        )}
        {statusTarget && (
          <StatusModal
            path={statusTarget.path}
            action={statusTarget.action}
            onConfirm={() => void handleStatusChange()}
            onCancel={() => setStatusTarget(null)}
            loading={statusLoading}
          />
        )}
      </AnimatePresence>

      {/* Learning Path Detail Drawer */}
      <AnimatePresence>
        {detailPath && (
          <LearningPathDetailDrawer
            path={detailPath}
            students={detailStudents}
            counts={detailCounts}
            loading={detailLoading}
            tab={detailTab}
            onTabChange={setDetailTab}
            onClose={() => { setDetailPath(null); setDetailStudents([]); setDetailCounts({ courses: 0, students: 0, active_students: 0, completed_students: 0 }) }}
            onEdit={() => { setDetailPath(null); void openEdit(detailPath) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Learning Path Detail Drawer ──────────────────────────────────────────────

function enrollmentStatusBadge(status: string) {
  if (status === 'completed') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (status === 'dropped')   return 'bg-rose-50 text-rose-700 border-rose-200'
  return 'bg-[#2691C2]/10 text-[#2691C2] border-[#2691C2]/20'
}

function enrollmentStatusLabel(status: string) {
  if (status === 'completed') return 'مكتمل'
  if (status === 'dropped')   return 'منسحب'
  return 'نشط'
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-l from-[#2691C2] to-[#22334A] transition-all"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <span className="text-[10px] font-black tabular-nums text-slate-500" dir="ltr">{pct}%</span>
    </div>
  )
}

function LearningPathDetailDrawer({
  path, students, counts, loading, tab, onTabChange, onClose, onEdit,
}: {
  path: LearningPath
  students: LearningPathStudent[]
  counts: { courses: number; students: number; active_students: number; completed_students: number }
  loading: boolean
  tab: 'overview' | 'courses' | 'students'
  onTabChange: (t: 'overview' | 'courses' | 'students') => void
  onClose: () => void
  onEdit: () => void
}) {
  const TABS = [
    { id: 'overview' as const,  label: 'نظرة عامة' },
    { id: 'courses'  as const,  label: 'الدورات' },
    { id: 'students' as const,  label: 'الطلاب' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-x-0 bottom-0 top-16 z-[60] flex justify-end bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 250 }}
        className="relative flex h-full w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-bl from-[#22334A] to-[#2691C2] px-6 py-5 text-white">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/60">مسار تعليمي</p>
            <h2 className="mt-1 text-xl font-black leading-snug">{path.title}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={path.status} />
              <span className="text-[11px] font-bold text-white/70">{en(counts.courses)} دورة</span>
              <span className="text-[11px] font-bold text-white/70">·</span>
              <span className="text-[11px] font-bold text-white/70">{en(counts.students)} طالب</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button onClick={onEdit} className="rounded-xl border border-white/30 bg-white/15 px-3 py-1.5 text-xs font-black hover:bg-white/25 transition">
              تعديل
            </button>
            <button onClick={onClose} className="rounded-xl p-2 text-white/70 hover:bg-white/15 transition">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Count cards */}
        <div className="grid grid-cols-3 border-b border-slate-100 bg-slate-50">
          {[
            { label: 'إجمالي الطلاب', value: counts.students, icon: Users, color: 'text-[#2691C2]' },
            { label: 'طلاب نشطون',    value: counts.active_students, icon: TrendingUp, color: 'text-emerald-600' },
            { label: 'أتموا المسار',  value: counts.completed_students, icon: Award, color: 'text-amber-600' },
          ].map((s) => (
            <div key={s.label} className="border-l border-slate-100 px-4 py-3 text-center first:border-0">
              <s.icon className={`mx-auto h-4 w-4 ${s.color}`} />
              <p className="mt-1 text-xl font-black text-[#22334A]" dir="ltr">{en(s.value)}</p>
              <p className="text-[10px] font-semibold text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 bg-white px-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTabChange(t.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-[12px] font-black transition ${
                tab === t.id
                  ? 'border-[#2691C2] text-[#2691C2]'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {t.label}
              {t.id === 'students' && counts.students > 0 && (
                <span className="rounded-full bg-[#2691C2]/10 px-1.5 py-0.5 text-[9px] font-black text-[#2691C2]" dir="ltr">
                  {en(counts.students)}
                </span>
              )}
              {t.id === 'courses' && counts.courses > 0 && (
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-black text-slate-500" dir="ltr">
                  {en(counts.courses)}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-[#2691C2]" />
            </div>
          ) : tab === 'overview' ? (
            <div className="space-y-5 p-6">
              {path.short_description && (
                <div>
                  <p className="mb-1 text-[11px] font-black text-slate-400">وصف</p>
                  <p className="text-sm font-semibold leading-relaxed text-slate-700">{path.short_description}</p>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                {path.language && (
                  <div className="rounded-xl bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-black text-slate-400">اللغة</p>
                    <p className="mt-0.5 font-black text-slate-700">{path.language}</p>
                  </div>
                )}
                {path.level && (
                  <div className="rounded-xl bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-black text-slate-400">المستوى</p>
                    <p className="mt-0.5 font-black text-slate-700">{path.level}</p>
                  </div>
                )}
                {path.duration && (
                  <div className="rounded-xl bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-black text-slate-400">المدة</p>
                    <p className="mt-0.5 font-black text-slate-700" dir="ltr">
                      {en(path.duration)} {path.duration_unit === 'weeks' ? 'أسابيع' : path.duration_unit === 'months' ? 'أشهر' : 'أيام'}
                    </p>
                  </div>
                )}
                {path.price != null && (
                  <div className="rounded-xl bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-black text-slate-400">السعر</p>
                    <p className="mt-0.5 font-black text-slate-700" dir="ltr">€{en(path.price)}</p>
                  </div>
                )}
              </div>
              {path.instructor && (
                <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#2691C2]/10 text-sm font-black text-[#2691C2]">
                    {path.instructor.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-black text-[#22334A]">{path.instructor.name}</p>
                    {path.instructor.title && <p className="text-xs font-semibold text-slate-500">{path.instructor.title}</p>}
                  </div>
                </div>
              )}
            </div>
          ) : tab === 'courses' ? (
            <div className="p-6">
              {!path.courses || path.courses.length === 0 ? (
                <div className="rounded-xl bg-slate-50 py-10 text-center text-sm font-semibold text-slate-400">
                  لا دورات مرتبطة بهذا المسار بعد
                </div>
              ) : (
                <div className="space-y-2">
                  {path.courses.map((c, i) => (
                    <div key={c.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 hover:border-[#2691C2]/30 transition">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#2691C2]/10 text-[11px] font-black text-[#2691C2]" dir="ltr">
                        {en(i + 1)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-black text-[#22334A]">{c.title}</p>
                        {c.duration && (
                          <p className="text-[11px] font-semibold text-slate-500" dir="ltr">
                            <Clock className="mb-0.5 inline h-3 w-3" /> {c.duration}
                          </p>
                        )}
                      </div>
                      {c.level && (
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">
                          {c.level}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6">
              {students.length === 0 ? (
                <div className="rounded-xl bg-slate-50 py-10 text-center text-sm font-semibold text-slate-400">
                  لا يوجد طلاب مسجلون في هذا المسار بعد
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-100">
                  <table className="w-full text-right text-[12px]">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2.5 font-black text-slate-500">الطالب</th>
                        <th className="hidden px-3 py-2.5 font-black text-slate-500 sm:table-cell">الحالة</th>
                        <th className="hidden px-3 py-2.5 font-black text-slate-500 md:table-cell">التقدم</th>
                        <th className="px-3 py-2.5 font-black text-slate-500">الدورات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {students.map((s) => (
                        <tr key={s.user_id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#2691C2]/10 text-[11px] font-black text-[#2691C2]">
                                {(s.name ?? '?').charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-black text-[#22334A]">{s.name}</p>
                                <p className="flex items-center gap-1 truncate text-[10px] font-semibold text-slate-500 dir-ltr">
                                  <Mail className="h-3 w-3 shrink-0" /> {s.email}
                                </p>
                                {s.phone && (
                                  <p className="flex items-center gap-1 truncate text-[10px] font-semibold text-slate-400 dir-ltr">
                                    <Phone className="h-3 w-3 shrink-0" /> {s.phone}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="hidden px-3 py-3 sm:table-cell">
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black ${enrollmentStatusBadge(s.enrollment_status)}`}>
                              {enrollmentStatusLabel(s.enrollment_status)}
                            </span>
                            {s.enrolled_at && (
                              <p className="mt-0.5 text-[10px] text-slate-400">{new Date(s.enrolled_at).toLocaleDateString('ar-SA')}</p>
                            )}
                          </td>
                          <td className="hidden px-3 py-3 md:table-cell">
                            <ProgressBar pct={s.progress_percentage} />
                          </td>
                          <td className="px-3 py-3">
                            <span className="font-bold text-slate-600" dir="ltr">
                              {en(s.courses_completed)} / {en(s.total_courses)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
