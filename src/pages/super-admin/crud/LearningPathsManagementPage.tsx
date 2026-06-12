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
} from 'lucide-react'
import {
  fetchAdminLearningPaths,
  fetchAdminLearningPath,
  createLearningPath,
  updateLearningPath,
  deleteLearningPath,
  fetchInstructorOptions,
  type LearningPath,
  type InstructorOption,
} from '../../../api/learningPathsApi'
import CourseSelector from '../../../components/learning-paths/CourseSelector'

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

  // Close on outside click
  useEffect(() => {
    function onClickOut(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOut)
    return () => document.removeEventListener('mousedown', onClickOut)
  }, [])

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
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
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
          </motion.div>
        )}
      </AnimatePresence>
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
}

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

                    {/* Students — English number */}
                    <td className="hidden px-4 py-4 lg:table-cell">
                      <span className="inline-flex items-center gap-1 text-slate-500" dir="ltr">
                        <Users className="h-3.5 w-3.5" /> {en(p.students_count)}
                      </span>
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
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); void openEdit(p) }}
                          className="rounded-xl p-2 text-slate-400 transition hover:bg-[#2691C2]/10 hover:text-[#2691C2]"
                          title="تعديل"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
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
      </AnimatePresence>
    </div>
  )
}
