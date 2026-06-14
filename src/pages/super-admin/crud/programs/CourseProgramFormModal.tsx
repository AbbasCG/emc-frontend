import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BookOpen,
  Calendar,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Eye,
  GraduationCap,
  ImagePlus,
  Plus,
  Search,
  Trash2,
  UserCircle2,
} from 'lucide-react'
import toast from '@/lib/toast'
import { fetchAdminInstructors, type AdminInstructorOption } from '@/api/adminInstructorsApi'
import type { CatalogTrackRow } from '@/api/superAdminCatalogApi'
import { upsertCourse, type CourseUpsertPayload, type OpsDepartmentOption } from '@/api/adminCoursesApi'
import { getApiErrorMessage, getLaravelFieldErrors, withArabicValidationMessages } from '@/api/apiErrors'
import { useAuth } from '@/contexts/AuthContext'
import {
  FormActions,
  FormChecklist,
  FormHelpCard,
  FormSectionCard,
  FormSuccessState,
  FormSummaryPanel,
  FormWizardShell,
  emcWizardStepAnimation,
  type WizardStepMeta,
} from '@/components/emc-form-wizard'
import { EMC_WIZARD_INPUT_BASE } from '@/components/emc-form-wizard/emcWizardTokens'
import type { Course } from '@/types'
import { getCourseInstructor } from '@/utils/courseInstructor'
import { defaultSlugFromTitle, inferProgramKind, type ProgramKind } from '@/pages/super-admin/crud/programs/programConsoleUtils'
import {
  apiListToText,
  COURSE_BULLET_MAX_CHARS,
  getBulletListStats,
  loadBulletFieldFromApi,
  normalizeBulletListText,
  normalizeCourseStatus,
  parseBulletField,
  splitKeywords,
  validateBulletField,
  type CourseBulletFieldKey,
} from '@/utils/coursePayload'
import {
  ONE_SESSION_WORKSHOP_DURATION_AR,
  ONE_SESSION_WORKSHOP_UI,
  programTypeForPayload,
  sessionFormatFromApi,
  sessionFormatToApi,
} from '@/utils/courseDuration'

const KINDS: ProgramKind[] = ['course', 'workshop', 'program', 'track']

const LOC_TYPES = [
  { v: 'online', label: 'عن بُعد' },
  { v: 'offline', label: 'حضوري' },
  { v: 'hybrid', label: 'هجين' },
]

const SESSION_FORMAT_OPTIONS = [
  { v: 'دورة متعددة الأيام', label: 'دورة متعددة الأيام' },
  { v: 'ورشة / لقاء واحد', label: 'ورشة / لقاء واحد' },
  { v: 'برنامج كامل', label: 'برنامج كامل' },
  { v: 'دورة قصيرة', label: 'دورة قصيرة' },
]

const STATUS_OPTIONS = [
  { v: 'draft', label: 'مسودة' },
  { v: 'published', label: 'منشور' },
  { v: 'archived', label: 'مؤرشف' },
]

const STEP_META: readonly WizardStepMeta[] = [
  { id: 1, title: 'البيانات الأساسية', hint: 'عنوان، صورة، وصف، نوع البرنامج' },
  { id: 2, title: 'المدرب والجدولة', hint: 'اختيار مدرب ومواعيد اختيارية' },
  { id: 3, title: 'التفاصيل التعليمية', hint: 'مدة، مستوى، ماذا ستتعلم' },
  { id: 4, title: 'السعر والتسجيل', hint: 'تسعير، مقاعد، حالة النشر' },
  { id: 5, title: 'المراجعة والنشر', hint: 'تأكيد ثم الحفظ' },
]

function draftKey(editing: boolean, id?: number | string) {
  return `emc-wizard-course-draft-v2-${editing ? String(id) : 'new'}`
}

/** Normalize native <input type="time"> or manual entry to HH:mm (24h). */
function toHHmm(raw: string): string {
  const t = raw.trim()
  if (!t) return ''
  const p = t.split(':')
  if (p.length < 2) return t
  const h = Math.min(23, Math.max(0, parseInt(p[0] ?? '0', 10) || 0))
  const m = Math.min(59, Math.max(0, parseInt(p[1]?.slice(0, 2) ?? '0', 10) || 0))
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function pickCourseImageUrl(course: Course | null): string {
  if (!course) return ''
  const media = course as Course & {
    course_image?: string | null
    image_url?: string | null
    image?: string | null
    thumbnail?: string | null
  }
  return String(media.image_url || media.course_image || media.image || media.thumbnail || '').trim()
}

function normalizeListText(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object' && 'title' in item) return String((item as { title?: unknown }).title ?? '')
        return String(item ?? '')
      })
      .map((item) => item.trim())
      .filter(Boolean)
      .join('\n')
  }
  return apiListToText(value)
}

function isDuplicateCourseValue(courses: Course[], currentId: number | undefined, key: 'title' | 'slug', value: string) {
  const v = value.trim().toLowerCase()
  if (!v) return false
  return courses.some((course) => Number(course.id) !== Number(currentId) && String(course[key] ?? '').trim().toLowerCase() === v)
}

const EMC_PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#22334A"/><stop offset=".55" stop-color="#2691C2"/><stop offset="1" stop-color="#EC943C"/></linearGradient></defs><rect width="1200" height="675" fill="url(#g)"/><circle cx="1040" cy="90" r="210" fill="rgba(255,255,255,.16)"/><circle cx="140" cy="620" r="260" fill="rgba(255,255,255,.12)"/><text x="600" y="330" fill="white" font-family="Arial, sans-serif" font-size="96" font-weight="900" text-anchor="middle">EMC</text><text x="600" y="398" fill="rgba(255,255,255,.82)" font-family="Arial, sans-serif" font-size="34" font-weight="700" text-anchor="middle">Premium Learning Program</text></svg>',
  )

type DatePickerProps = {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
}

function ModernDatePicker({ label, value, onChange, error }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const baseDate = value ? new Date(`${value}T12:00:00`) : new Date()
  const [cursor, setCursor] = useState(() => new Date(baseDate.getFullYear(), baseDate.getMonth(), 1))
  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const startOffset = (first.getDay() + 1) % 7
    const start = new Date(first)
    start.setDate(first.getDate() - startOffset)
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }, [cursor])
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const labelText = value || 'اختر التاريخ'
  return (
    <div className="relative text-[11px] font-black text-[#22334A]">
      <span className="mb-1 block">{label}</span>
      <button
        type="button"
        onClick={() => setOpen((x) => !x)}
        className={`${EMC_WIZARD_INPUT_BASE} flex min-h-[46px] items-center justify-between gap-3 bg-white text-right`}
      >
        <span className={value ? 'font-mono tabular-nums text-[#22334A]' : 'text-slate-400'}>{labelText}</span>
        <Calendar className="h-4 w-4 text-[#2691C2]" aria-hidden />
      </button>
      {open ? (
        <div className="absolute inset-x-0 top-full z-30 mt-2 rounded-3xl border border-white/80 bg-white/95 p-3 shadow-[0_24px_70px_-18px_rgba(15,23,42,.35)] backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-50 text-[#22334A]">
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="text-sm font-black text-[#22334A]">
              {(['يناير','فبراير','مارس','إبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'][cursor.getMonth()])} {cursor.getFullYear()}
            </span>
            <button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-50 text-[#22334A]">
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-400">
            {['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'].map((d) => <span key={d}>{d}</span>)}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1">
            {days.map((d) => {
              const iso = fmt(d)
              const selected = iso === value
              const muted = d.getMonth() !== cursor.getMonth()
              return (
                <button
                  type="button"
                  key={iso}
                  onClick={() => {
                    onChange(iso)
                    setOpen(false)
                  }}
                  className={`aspect-square rounded-xl text-[12px] font-black transition ${
                    selected ? 'bg-gradient-to-l from-[#2691C2] to-[#22334A] text-white shadow-md' : muted ? 'text-slate-300 hover:bg-slate-50' : 'text-[#22334A] hover:bg-[#2691C2]/10'
                  }`}
                >
                  {d.getDate()}
                </button>
              )
            })}
          </div>
          {value ? (
            <button type="button" onClick={() => { onChange(''); setOpen(false) }} className="mt-3 w-full rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-black text-slate-600">
              مسح التاريخ
            </button>
          ) : null}
        </div>
      ) : null}
      {error ? <span className="mt-1 block text-[11px] font-bold text-rose-600">{error}</span> : null}
    </div>
  )
}

type TimePickerProps = {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
}

function ModernTimePicker({ label, value, onChange, error }: TimePickerProps) {
  const [open, setOpen] = useState(false)
  const [hour, minute] = (value || '09:00').split(':')
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
  const minutes = ['00', '15', '30', '45']
  return (
    <div className="relative text-[11px] font-black text-[#22334A]">
      <span className="mb-1 block">{label}</span>
      <button
        type="button"
        onClick={() => setOpen((x) => !x)}
        className={`${EMC_WIZARD_INPUT_BASE} flex min-h-[46px] items-center justify-between gap-3 bg-white text-right`}
      >
        <span className={value ? 'font-mono tabular-nums text-[#22334A]' : 'text-slate-400'}>{value || 'اختر الوقت'}</span>
        <Clock className="h-4 w-4 text-[#2691C2]" aria-hidden />
      </button>
      {open ? (
        <div className="absolute inset-x-0 top-full z-30 mt-2 rounded-3xl border border-white/80 bg-white/95 p-3 shadow-[0_24px_70px_-18px_rgba(15,23,42,.35)] backdrop-blur-xl">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid max-h-48 grid-cols-3 gap-1">
              {hours.map((h) => (
                <button key={h} type="button" onClick={() => onChange(`${h}:${minute ?? '00'}`)} className={`rounded-xl px-2 py-2 font-mono text-[12px] font-black ${h === hour ? 'bg-[#22334A] text-white' : 'bg-slate-50 text-[#22334A]'}`}>
                  {h}
                </button>
              ))}
            </div>
            <div className="grid content-start gap-1">
              {minutes.map((m) => (
                <button key={m} type="button" onClick={() => onChange(`${hour ?? '09'}:${m}`)} className={`rounded-xl px-2 py-2 font-mono text-[12px] font-black ${m === minute ? 'bg-[#2691C2] text-white' : 'bg-slate-50 text-[#22334A]'}`}>
                  :{m}
                </button>
              ))}
              <button type="button" onClick={() => { onChange(''); setOpen(false) }} className="mt-2 rounded-xl bg-rose-50 px-2 py-2 text-[11px] font-black text-rose-600">
                مسح
              </button>
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl bg-emerald-50 px-2 py-2 text-[11px] font-black text-emerald-700">
                <Check className="mx-auto h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {error ? <span className="mt-1 block text-[11px] font-bold text-rose-600">{error}</span> : null}
    </div>
  )
}

const FIELD_LABEL_AR: Record<string, string> = {
  title: 'العنوان',
  slug: 'المختصر',
  course_image: 'صورة الدورة',
  short_description: 'الوصف المختصر',
  description: 'الوصف',
  location: 'الموقع',
  location_type: 'نوع التقديم',
  delivery_type: 'نوع التقديم',
  instructor_id: 'المدرب',
  start_date: 'تاريخ البداية',
  end_date: 'تاريخ النهاية',
  start_time: 'وقت البداية',
  end_time: 'وقت الانتهاء',
  study_time: 'وقت البداية',
  price: 'السعر',
  type: 'نوع التسعير',
  status: 'الحالة',
  features: 'ماذا ستتعلم',
  learning_outcomes: 'المخرجات التعليمية',
  requirements: 'المتطلبات المسبقة',
  keywords: 'الكلمات المفتاحية',
  notes: 'الملاحظات الداخلية',
  curriculum_topics: 'محاور الدورة',
  program_type: 'نوع البرنامج',
}

/** Laravel errors like `features.0` resolve to the base field label */
function fieldErrorFor(errors: Record<string, string>, base: string): string | undefined {
  if (errors[base]) return errors[base]
  const prefix = `${base}.`
  for (const [k, v] of Object.entries(errors)) {
    if (k.startsWith(prefix)) return v
  }
  return undefined
}

function BulletListCounter({ text, field }: { text: string; field: CourseBulletFieldKey }) {
  const stats = getBulletListStats(text, field)
  const max = COURSE_BULLET_MAX_CHARS[field]
  return (
    <p className={`mt-1 text-[10px] font-semibold ${stats.invalid ? 'text-rose-600' : 'text-[#5a6b7d]'}`}>
      {stats.count > 0 ? `${stats.count} نقطة · ` : 'لا توجد نقاط بعد · '}
      أطول نقطة: {stats.maxItemLength}/{max} حرف
      {stats.invalid && stats.message ? ` — ${stats.message}` : null}
    </p>
  )
}

type Props = {
  open: boolean
  initial: Course | null
  tracks: CatalogTrackRow[]
  departments: OpsDepartmentOption[]
  existingCourses?: Course[]
  onClose: () => void
  onSaved: () => void
  /** يُعاد تعيين النموذج لإنشاء دورة جديدة دون إغلاق النافذة */
  onCreateAnother?: () => void
  /** رابط صفحة قائمة البرامج في لوحة التحكم (زر العودة) */
  programsListPath?: string
}

export function CourseProgramFormModal({
  open,
  initial,
  tracks,
  departments,
  existingCourses = [],
  onClose,
  onSaved,
  onCreateAnother,
  programsListPath,
}: Props) {
  const editing = initial != null
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const listHref = programsListPath ?? (location.pathname || '/dashboard/super-admin/crud/programs')

  const [currentStep, setCurrentStep] = useState(1)
  const [busy, setBusy] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [savedCourse, setSavedCourse] = useState<Course | null>(null)
  const [lastSavedAsPublished, setLastSavedAsPublished] = useState(false)
  const [localDraftSavedAt, setLocalDraftSavedAt] = useState<string | null>(null)
  const [draftHint, setDraftHint] = useState(false)

  const [instructorRows, setInstructorRows] = useState<AdminInstructorOption[]>([])
  const [instructorQuery, setInstructorQuery] = useState('')

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [shortDescription, setShortDescription] = useState('')
  const [courseImage, setCourseImage] = useState('')
  const [kind, setKind] = useState<ProgramKind>('course')
  const [trackId, setTrackId] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [instructorId, setInstructorId] = useState('')
  const [priceFree, setPriceFree] = useState(true)
  const [price, setPrice] = useState('0')
  const [capacity, setCapacity] = useState('')
  const [status, setStatus] = useState('draft')
  const [registrationOpen, setRegistrationOpen] = useState(true)
  const [isOnline, setIsOnline] = useState(true)
  const [locationType, setLocationType] = useState('online')
  const [locationText, setLocationText] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [meetingLink, setMeetingLink] = useState('')
  const [durationText, setDurationText] = useState('')
  const [trainingHours, setTrainingHours] = useState('')
  const [language, setLanguage] = useState('')
  const [level, setLevel] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [certificate, setCertificate] = useState('')
  const [sessionFormat, setSessionFormat] = useState(SESSION_FORMAT_OPTIONS[0].v)
  const [learnText, setLearnText] = useState('')
  const [prerequisites, setPrerequisites] = useState('')
  const [learningOutcomes, setLearningOutcomes] = useState('')
  const [outline, setOutline] = useState('')
  const [keywords, setKeywords] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [requiresPlacementTest, setRequiresPlacementTest] = useState(false)

  const resetFromInitial = useCallback(() => {
    if (!initial) {
      setTitle('')
      setSlug('')
      setDescription('')
      setShortDescription('')
      setCourseImage('')
      setKind('course')
      setTrackId('')
      setDepartmentId('')
      setInstructorId('')
      setPriceFree(true)
      setPrice('0')
      setCapacity('')
      setStatus('draft')
      setRegistrationOpen(true)
      setIsOnline(true)
      setLocationType('online')
      setLocationText('')
      setStartDate('')
      setStartTime('')
      setEndDate('')
      setEndTime('')
      setMeetingLink('')
      setDurationText('')
      setTrainingHours('')
      setLanguage('عربي')
      setLevel('')
      setTargetAudience('')
      setCertificate('شهادة حضور')
      setSessionFormat(SESSION_FORMAT_OPTIONS[0].v)
      setLearnText('')
      setPrerequisites('')
      setLearningOutcomes('')
      setOutline('')
      setKeywords('')
      setAdminNotes('')
      setRequiresPlacementTest(false)
      setInstructorQuery('')
      setImageFile(null)
      setImagePreviewUrl((u) => {
        if (u?.startsWith('blob:')) URL.revokeObjectURL(u)
        return null
      })
      setFieldErrors({})
      return
    }
    setTitle(initial.title ?? '')
    setSlug(initial.slug ?? '')
    setDescription(initial.description ?? '')
    setShortDescription(initial.short_description ?? '')
    setCourseImage(pickCourseImageUrl(initial))
    setKind(inferProgramKind(initial))
    setTrackId(initial.track_id != null ? String(initial.track_id) : '')
    setDepartmentId(initial.department_id != null ? String(initial.department_id) : '')
    setInstructorId(initial.instructor_id != null ? String(initial.instructor_id) : '')
    const free =
      initial.is_free != null ?
        initial.is_free === true || initial.is_free === 1
      : String(initial.type) !== 'paid'
    setPriceFree(free)
    setPrice(String(initial.price ?? '0'))
    setCapacity(initial.capacity != null ? String(initial.capacity) : '')
    setStatus(normalizeCourseStatus(String(initial.status ?? 'draft')))
    setRegistrationOpen(
      typeof initial.registration_open === 'boolean' ?
        initial.registration_open
      : typeof initial.registration_open === 'number' ?
        initial.registration_open === 1
      : true,
    )
    setIsOnline(Boolean(initial.is_online))
    setLocationType((initial.location_type as string) || (initial.delivery_type as string) || (initial.is_online ? 'online' : 'offline'))
    setLocationText(initial.location ?? '')
    setStartDate(initial.start_date ? String(initial.start_date).slice(0, 10) : '')
    setStartTime(initial.start_time ? String(initial.start_time).slice(0, 5) : initial.study_time ? String(initial.study_time).slice(0, 5) : '')
    setEndDate(initial.end_date ? String(initial.end_date).slice(0, 10) : '')
    setEndTime(initial.end_time ? String(initial.end_time).slice(0, 5) : '')
    setMeetingLink(initial.meeting_link ?? '')
    setTrainingHours(initial.training_hours != null ? String(initial.training_hours) : '')
    setLanguage(initial.language ?? '')
    setLevel(initial.level ?? '')
    setTargetAudience(initial.target_audience ?? (initial as { audience?: string | null }).audience ?? '')
    setCertificate(initial.certificate ?? '')
    const resolvedSessionFormat =
      sessionFormatFromApi(initial.session_format, initial.program_type) || SESSION_FORMAT_OPTIONS[0].v
    setSessionFormat(resolvedSessionFormat)
    const loadOneSession =
      resolvedSessionFormat === ONE_SESSION_WORKSHOP_UI ||
      String(initial.program_type ?? '').toLowerCase() === 'one_session'
    setDurationText(loadOneSession ? ONE_SESSION_WORKSHOP_DURATION_AR : (initial.duration ?? ''))
    setPrerequisites(loadBulletFieldFromApi((initial as { requirements?: unknown }).requirements ?? initial.prerequisites))
    setLearningOutcomes(
      loadBulletFieldFromApi(
        (initial as { learning_outcomes?: unknown; outcomes?: unknown }).learning_outcomes
          ?? (initial as { outcomes?: unknown }).outcomes,
      ),
    )
    setOutline(
      loadBulletFieldFromApi((initial as { curriculum_topics?: unknown }).curriculum_topics)
        || loadBulletFieldFromApi(initial.study_days ?? ''),
    )
    setKeywords(normalizeListText((initial as { keywords?: unknown; tags?: unknown }).keywords ?? (initial as { tags?: unknown }).tags))
    setAdminNotes((initial as { notes?: string | null }).notes ?? initial.admin_notes ?? '')
    setRequiresPlacementTest(Boolean((initial as Record<string, unknown>).requires_placement_test))
    setLearnText(loadBulletFieldFromApi(initial.features))
    setFieldErrors({})
    setImageFile(null)
    setImagePreviewUrl((u) => {
      if (u?.startsWith('blob:')) URL.revokeObjectURL(u)
      return null
    })
    setInstructorQuery('')
  }, [initial])

  useEffect(() => {
    if (!open) return
    setCurrentStep(1)
    setSuccessOpen(false)
    setSavedCourse(null)
    setLastSavedAsPublished(false)
    setLocalDraftSavedAt(null)
    resetFromInitial()
    const k = draftKey(editing, initial?.id)
    try {
      const raw = localStorage.getItem(k)
      setDraftHint(Boolean(raw && !editing))
    } catch {
      setDraftHint(false)
    }
  }, [open, initial, editing, resetFromInitial])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void (async () => {
      try {
        const rows = await fetchAdminInstructors()
        if (!cancelled) setInstructorRows(rows)
      } catch {
        if (!cancelled) setInstructorRows([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open])

  /** After successful publish: brief success overlay then open the public course page (user is not left in the modal). */
  useEffect(() => {
    if (!successOpen || !savedCourse?.slug || !lastSavedAsPublished) return
    const id = window.setTimeout(() => {
      navigate(`/courses/${savedCourse.slug}`)
      setSuccessOpen(false)
      onSaved()
      onClose()
    }, 3200)
    return () => window.clearTimeout(id)
  }, [successOpen, savedCourse?.slug, lastSavedAsPublished, navigate, onSaved, onClose])

  const persistDraft = useCallback(() => {
    if (!open) return
    const k = draftKey(editing, initial?.id)
    const pack = {
      title,
      slug,
      description,
      shortDescription,
      courseImage,
      kind,
      trackId,
      departmentId,
      instructorId,
      priceFree,
      price,
      capacity,
      status,
      registrationOpen,
      isOnline,
      locationType,
      locationText,
      startDate,
      startTime,
      endDate,
      endTime,
      meetingLink,
      durationText,
      trainingHours,
      language,
      level,
      targetAudience,
      certificate,
      sessionFormat,
      learnText,
      prerequisites,
      learningOutcomes,
      outline,
      keywords,
      adminNotes,
      requiresPlacementTest,
    }
    try {
      localStorage.setItem(k, JSON.stringify(pack))
      const _t = new Date()
      setLocalDraftSavedAt(
        `${String(_t.getHours()).padStart(2, '0')}:${String(_t.getMinutes()).padStart(2, '0')}:${String(_t.getSeconds()).padStart(2, '0')}`,
      )
    } catch {
      /* quota */
    }
  }, [
    open,
    editing,
    initial?.id,
    title,
    slug,
    description,
    shortDescription,
    courseImage,
    kind,
    trackId,
    departmentId,
    instructorId,
    priceFree,
    price,
    capacity,
    status,
    registrationOpen,
    isOnline,
    locationType,
    locationText,
    startDate,
    startTime,
    endDate,
    endTime,
    meetingLink,
    durationText,
    trainingHours,
    language,
    level,
    targetAudience,
    certificate,
    sessionFormat,
    learnText,
    prerequisites,
    learningOutcomes,
    outline,
    keywords,
    adminNotes,
    requiresPlacementTest,
  ])

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => persistDraft(), 500)
    return () => window.clearTimeout(t)
  }, [open, persistDraft])

  function restoreDraft() {
    const k = draftKey(editing, initial?.id)
    try {
      const raw = localStorage.getItem(k)
      if (!raw) return
      const p = JSON.parse(raw) as Record<string, unknown>
      const str = (x: unknown) => (typeof x === 'string' ? x : '')
      const bool = (x: unknown) => (typeof x === 'boolean' ? x : undefined)
      if (str(p.title)) setTitle(str(p.title))
      if (str(p.slug)) setSlug(str(p.slug))
      if (str(p.description)) setDescription(str(p.description))
      if (str(p.shortDescription)) setShortDescription(str(p.shortDescription))
      if (str(p.courseImage)) setCourseImage(str(p.courseImage))
      if (str(p.kind)) setKind(p.kind as ProgramKind)
      if (str(p.trackId)) setTrackId(str(p.trackId))
      if (str(p.departmentId)) setDepartmentId(str(p.departmentId))
      if (str(p.instructorId)) setInstructorId(str(p.instructorId))
      if (bool(p.priceFree) !== undefined) setPriceFree(bool(p.priceFree)!)
      if (str(p.price)) setPrice(str(p.price))
      if (str(p.capacity)) setCapacity(str(p.capacity))
      if (str(p.status)) setStatus(normalizeCourseStatus(str(p.status)))
      if (bool(p.registrationOpen) !== undefined) setRegistrationOpen(bool(p.registrationOpen)!)
      if (bool(p.isOnline) !== undefined) setIsOnline(bool(p.isOnline)!)
      if (str(p.locationType)) setLocationType(str(p.locationType))
      if (str(p.locationText)) setLocationText(str(p.locationText))
      if (str(p.startDate)) setStartDate(str(p.startDate))
      if (str(p.startTime)) setStartTime(str(p.startTime))
      if (str(p.endDate)) setEndDate(str(p.endDate))
      if (str(p.endTime)) setEndTime(str(p.endTime))
      if (str(p.meetingLink)) setMeetingLink(str(p.meetingLink))
      if (str(p.durationText)) setDurationText(str(p.durationText))
      if (str(p.trainingHours)) setTrainingHours(str(p.trainingHours))
      if (str(p.language)) setLanguage(str(p.language))
      if (str(p.level)) setLevel(str(p.level))
      if (str(p.targetAudience)) setTargetAudience(str(p.targetAudience))
      if (str(p.certificate)) setCertificate(str(p.certificate))
      if (str(p.sessionFormat)) setSessionFormat(str(p.sessionFormat))
      if (str(p.learnText)) setLearnText(str(p.learnText))
      if (str(p.prerequisites)) setPrerequisites(str(p.prerequisites))
      if (str(p.learningOutcomes)) setLearningOutcomes(str(p.learningOutcomes))
      if (str(p.outline)) setOutline(str(p.outline))
      if (str(p.keywords)) setKeywords(str(p.keywords))
      if (str(p.adminNotes)) setAdminNotes(str(p.adminNotes))
      if (bool(p.requiresPlacementTest) !== undefined) setRequiresPlacementTest(bool(p.requiresPlacementTest)!)
      toast.success('تمت استعادة المسودة')
    } catch {
      toast.error('تعذّر قراءة المسودة')
    }
  }

  function clearDraft() {
    const k = draftKey(editing, initial?.id)
    try {
      localStorage.removeItem(k)
      setDraftHint(false)
      toast.message('تم مسح المسودة المحلية')
    } catch {
      /* ignore */
    }
  }

  const kindLabel = useMemo(() => {
    if (kind === 'course') return 'دورة'
    if (kind === 'workshop') return 'ورشة'
    if (kind === 'program') return 'برنامج'
    return 'مسار'
  }, [kind])

  const deptLabel = useMemo(() => {
    const d = departments.find((x) => String(x.id) === departmentId)
    return d?.name ?? '—'
  }, [departments, departmentId])

  const trackLabel = useMemo(() => {
    const t = tracks.find((x) => String(x.id) === trackId)
    return t?.title ?? '—'
  }, [tracks, trackId])

  const locLabel = useMemo(() => LOC_TYPES.find((x) => x.v === locationType)?.label ?? locationType, [locationType])

  const selectedInstructor = useMemo(() => {
    if (!instructorId) return null
    const id = Number(instructorId)
    return instructorRows.find((u) => u.id === id) ?? null
  }, [instructorRows, instructorId])

  /** Review/summary label — never surfaces raw numeric instructor ids to learners/admins here. */
  const wizardInstructorSummary = useMemo(() => {
    if (selectedInstructor?.name) return selectedInstructor.name
    const raw = instructorId.trim()
    if (!raw) return 'بدون مدرب'
    const id = Number(raw)
    if (!Number.isFinite(id) || id <= 0) return 'بدون مدرب'
    if (initial && Number(initial.instructor_id) === id) {
      const lab = getCourseInstructor(initial).displayName
      if (lab !== 'بدون مدرب') return lab
    }
    return 'مدرب مسند'
  }, [selectedInstructor, instructorId, initial])

  const filteredInstructors = useMemo(() => {
    const q = instructorQuery.trim().toLowerCase()
    let list = instructorRows
    if (q) {
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          (u.email && u.email.toLowerCase().includes(q)) ||
          String(u.id).includes(q),
      )
    }
    return list.slice(0, 10)
  }, [instructorRows, instructorQuery])

  const clearField = useCallback((key: string) => {
    setFieldErrors((prev) => {
      const n = { ...prev }
      delete n[key]
      return n
    })
  }, [])

  const pickImageFile = useCallback(
    (file: File | null) => {
      setImagePreviewUrl((prev) => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
        return file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null
      })
      setImageFile(file && file.type.startsWith('image/') ? file : null)
      clearField('course_image')
    },
    [clearField],
  )

  const isWorkshop = kind === 'workshop'
  const isOneSession = isWorkshop || sessionFormat === ONE_SESSION_WORKSHOP_UI

  useEffect(() => {
    if (kind === 'workshop') {
      setSessionFormat(ONE_SESSION_WORKSHOP_UI)
    } else if (sessionFormat === ONE_SESSION_WORKSHOP_UI) {
      setSessionFormat(SESSION_FORMAT_OPTIONS[0].v)
    }
  }, [kind]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isOneSession) {
      setDurationText(ONE_SESSION_WORKSHOP_DURATION_AR)
    }
  }, [isOneSession])

  const showLocationField = locationType === 'offline' || locationType === 'hybrid'

  function validateStep(step: number): boolean {
    if (step === 1) {
      if (!title.trim()) {
        toast.warning('عنوان البرنامج مطلوب')
        return false
      }
      const nextSlug = slug.trim() || defaultSlugFromTitle(title)
      const nextErrors: Record<string, string> = {}
      if (isDuplicateCourseValue(existingCourses, initial?.id, 'title', title)) {
        nextErrors.title = 'يوجد برنامج بنفس العنوان. يرجى اختيار عنوان مختلف.'
      }
      if (isDuplicateCourseValue(existingCourses, initial?.id, 'slug', nextSlug)) {
        nextErrors.slug = 'هذا المختصر مستخدم بالفعل. يرجى اختيار مختصر مختلف.'
      }
      if (Object.keys(nextErrors).length > 0) {
        setFieldErrors((prev) => ({ ...prev, ...nextErrors }))
        toast.warning('لا يمكن حفظ برنامج بعنوان أو مختصر مكرر.')
        return false
      }
      return true
    }
    if (step === 2) {
      if (showLocationField && !locationText.trim()) {
        toast.warning('حقل الموقع مطلوب للحضوري أو الهجين')
        return false
      }
      return true
    }
    if (step === 3) {
      const checks: Array<{ field: CourseBulletFieldKey; text: string }> = [
        { field: 'features', text: learnText },
      ]
      if (!isWorkshop) {
        checks.push(
          { field: 'learning_outcomes', text: learningOutcomes },
          { field: 'requirements', text: prerequisites },
          { field: 'curriculum_topics', text: outline },
        )
      }
      const nextErrors: Record<string, string> = {}
      for (const { field, text } of checks) {
        const result = validateBulletField(text, field)
        if (!result.valid && result.message) nextErrors[field] = result.message
      }
      if (Object.keys(nextErrors).length > 0) {
        setFieldErrors((prev) => ({ ...prev, ...nextErrors }))
        toast.warning(Object.values(nextErrors)[0])
        return false
      }
      return true
    }
    if (step === 4) {
      if (!priceFree) {
        const n = Number(price)
        if (!Number.isFinite(n) || n <= 0) {
          toast.warning('أدخل سعرًا صالحًا للبرامج المدفوعة')
          return false
        }
      }
      return true
    }
    return true
  }

  function goNext() {
    if (!validateStep(currentStep)) return
    setCurrentStep((s) => Math.min(STEP_META.length, s + 1))
  }

  function goBack() {
    setCurrentStep((s) => Math.max(1, s - 1))
  }

  function buildPayload(): CourseUpsertPayload {
    function optionalFkId(raw: string): number | undefined {
      const s = raw.trim()
      if (!s) return undefined
      const n = Number(s)
      return Number.isFinite(n) && n > 0 ? Math.trunc(n) : undefined
    }

    const featuresLines = parseBulletField(learnText)
    const outcomesLines = parseBulletField(learningOutcomes)
    const requirementsLines = parseBulletField(prerequisites)
    const topicLines = parseBulletField(outline)
    const keywordLines = splitKeywords(keywords)

    const hoursParsed = trainingHours.trim() ? Number(trainingHours) : undefined
    const hoursOk =
      hoursParsed !== undefined && Number.isFinite(hoursParsed) && hoursParsed >= 0 ?
        Math.round(hoursParsed)
      : undefined

    const capParsed = capacity.trim() ? Number(capacity) : undefined
    const capacityOk =
      capParsed !== undefined && Number.isFinite(capParsed) && capParsed >= 1 ? Math.floor(capParsed) : undefined

    const tStart = toHHmm(startTime)
    const tEnd = toHHmm(endTime)
    const onlineOnly = locationType === 'online'
    /** API contract: strictly `draft` | `published` | `archived` (Arabic labels only in STATUS_OPTIONS UI, values are EN) */
    const lifecycle = normalizeCourseStatus(status)
    const apiSessionFormat = sessionFormatToApi(sessionFormat)
    const resolvedDuration =
      isOneSession ? ONE_SESSION_WORKSHOP_DURATION_AR : durationText.trim() || undefined

    return {
      title: title.trim(),
      slug: slug.trim() || defaultSlugFromTitle(title),
      description: description.trim() || undefined,
      short_description: shortDescription.trim() || undefined,
      ...(imageFile ?
        {}
      : courseImage.trim()
        ? { course_image: courseImage.trim() }
        : {}),
      program_type: programTypeForPayload(kind, sessionFormat),
      ...(apiSessionFormat ? { session_format: apiSessionFormat } : {}),
      type: priceFree ? 'free' : 'paid',
      is_free: priceFree,
      price: priceFree ? 0 : Number(price) || 0,
      is_online: locationType === 'online' || locationType === 'hybrid',
      delivery_type: locationType,
      location_type: locationType,
      location: onlineOnly ? null : locationText.trim() || null,
      capacity: capacityOk,
      status: lifecycle,
      registration_open: registrationOpen,
      start_date: startDate.trim() || undefined,
      end_date: endDate.trim() || undefined,
      start_time: tStart || undefined,
      end_time: tEnd || undefined,
      study_time: tStart || undefined,
      meeting_link: meetingLink.trim() || undefined,
      track_id: optionalFkId(trackId),
      department_id: optionalFkId(departmentId),
      instructor_id: optionalFkId(instructorId),
      duration: resolvedDuration,
      training_hours: hoursOk,
      target_audience: targetAudience.trim() || undefined,
      language: language.trim() || undefined,
      level: level.trim() || undefined,
      certificate: certificate.trim() || undefined,
      study_days: outline.trim() || undefined,
      notes: adminNotes.trim() || undefined,
      requires_placement_test: requiresPlacementTest,
      features: featuresLines,
      learning_outcomes: outcomesLines,
      requirements: requirementsLines,
      curriculum_topics: topicLines,
      keywords: keywordLines,
    }
  }

  async function submit() {
    setFieldErrors({})
    if (!validateStep(1) || !validateStep(2) || !validateStep(3) || !validateStep(4)) return
    setBusy(true)
    try {
      const payload = buildPayload()
      const course = await upsertCourse(payload, editing ? initial?.id : undefined, {
        imageFile: imageFile ?? undefined,
      })
      try {
        localStorage.removeItem(draftKey(editing, initial?.id))
        setLocalDraftSavedAt(null)
      } catch {
        /* ignore */
      }
      setSavedCourse(course)
      setLastSavedAsPublished(String(payload.status).toLowerCase() === 'published')
      setSuccessOpen(true)
      onSaved()
    } catch (e) {
      const fieldErrors = withArabicValidationMessages(getLaravelFieldErrors(e))
      setFieldErrors(fieldErrors)
      if (import.meta.env.DEV) {
        console.error('[course.program.save]', fieldErrors, e)
      }
      toast.error(getApiErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const progressPercent = Math.round(((currentStep - 1) / (STEP_META.length - 1)) * 100)

  const summaryRows = useMemo(
    () => [
      { label: 'العنوان', value: title.trim() || '—' },
      { label: 'النوع', value: kindLabel },
      { label: 'صورة', value: courseImage.trim() ? 'رابط مضاف' : '—' },
      { label: 'المختصر (slug)', value: slug.trim() || defaultSlugFromTitle(title) || '—' },
      { label: 'تنسيق الجلسة', value: sessionFormat },
      { label: 'الإدارة', value: deptLabel },
      { label: 'المسار', value: trackLabel },
      { label: 'المدرب', value: wizardInstructorSummary },
      { label: 'نوع الحضور', value: locLabel },
      { label: 'التسعير', value: priceFree ? 'مجاني' : `${price} (مدفوع)` },
      { label: 'المقاعد', value: capacity.trim() || '—' },
      { label: 'حالة النشر', value: STATUS_OPTIONS.find((s) => s.v === status)?.label ?? status },
      { label: 'التسجيل', value: registrationOpen ? 'مفتوح' : 'مغلق' },
      { label: 'جدولة', value: `${startDate || '—'} · ${endDate || '—'}` },
      { label: 'اختبار تحديد المستوى', value: requiresPlacementTest ? 'نعم' : 'لا' },
    ],
    [
      title,
      kindLabel,
      courseImage,
      slug,
      sessionFormat,
      deptLabel,
      trackLabel,
      wizardInstructorSummary,
      locLabel,
      priceFree,
      price,
      capacity,
      status,
      registrationOpen,
      startDate,
      endDate,
      requiresPlacementTest,
    ],
  )

  const checklistItems = useMemo(
    () => [
      { id: 't', label: 'عنوان واضح', done: Boolean(title.trim()) },
      { id: 'i', label: 'صورة غلاف أو وصف للعرض العام', done: Boolean(imageFile || courseImage.trim() || shortDescription.trim()) },
      { id: 'p', label: priceFree ? 'مجاني' : 'سعر صالح', done: priceFree || (Number(price) > 0 && Number.isFinite(Number(price))) },
      { id: 'r', label: 'حالة النشر محددة', done: Boolean(status) },
    ],
    [title, courseImage, shortDescription, priceFree, price, status, imageFile],
  )

  const coverPreviewSrc = imagePreviewUrl || courseImage || EMC_PLACEHOLDER

  const helpByStep = useMemo((): ReactNode => {
    if (currentStep === 1) {
      return (
        <>
          <p>أضف عنوانًا ووصفًا قصيرًا يظهران في صفحة الزائر؛ رابط الصورة يمكن أن يكون مطلقًا من مكتبة الوسائط.</p>
          <p>حقل «نوع البرنامج» يحدّد التصنيف في كتالوج الإدارة؛ «تنسيق الجلسة» يظهر للزائر إن كان الخادم يخزّنه.</p>
        </>
      )
    }
    if (currentStep === 2) {
      return (
        <>
          <p>ابحث عن المدرب بالاسم أو البريد — لا حاجة لمعرّف رقمي. اتركه فارغًا إن لم يُحدد بعد.</p>
          <p>المواعيد كلها اختيارية؛ الفراغ يدعم عبارة «انضم إلى الدورة القادمة» في الموقع العام عند عدم وجود جدول.</p>
        </>
      )
    }
    if (currentStep === 3) {
      return (
        <>
          <p>«ماذا ستتعلم»: سطر لكل نقطة — تُحفظ كقائمة في واجهة البرنامج عند دعم الخادم لها.</p>
          <p>المتطلبات والمخرجات والمحاور تظهر للمتعلم عند توفرها في الاستجابة من API.</p>
        </>
      )
    }
    if (currentStep === 4) {
      return (
        <>
          <p>السعة والتسجيل وربط الإدارة والمسار يساعدون عمليات التشغيل وعرض المقاعد في الصفحة العامة.</p>
        </>
      )
    }
    return (
      <>
        <p>راجع الحقول ثم احفظ. يمكن الرجوع لتعديل أي خطوة قبل الإرسال النهائي.</p>
      </>
    )
  }, [currentStep])

  function handleCreateAnother() {
    setSuccessOpen(false)
    setSavedCourse(null)
    setLastSavedAsPublished(false)
    onCreateAnother?.()
    onSaved()
  }

  const mainFields = useMemo(() => {
    if (currentStep === 1) {
      return (
        <FormSectionCard title="المحتوى الأساسي" eyebrow="الخطوة 1" icon={BookOpen}>
          <div
            role="presentation"
            onDragOver={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            onDrop={(e) => {
              e.preventDefault()
              pickImageFile(e.dataTransfer.files?.[0] ?? null)
            }}
            className="relative rounded-3xl border-2 border-dashed border-[#2691C2]/35 bg-gradient-to-br from-[#2691C2]/[0.06] to-white px-4 py-6 text-center transition hover:border-[#2691C2]/55"
          >
            <input
              type="file"
              accept="image/*"
              className="hidden"
              id="course-wizard-cover"
              onChange={(e) => pickImageFile(e.target.files?.[0] ?? null)}
            />
            {coverPreviewSrc ?
              <div className="relative mx-auto max-h-56 overflow-hidden rounded-2xl ring-2 ring-white">
                <img
                  src={coverPreviewSrc}
                  alt=""
                  className="max-h-56 w-full object-cover"
                />
                <div className="absolute start-2 top-2 flex gap-2">
                  <label
                    htmlFor="course-wizard-cover"
                    className="cursor-pointer rounded-xl bg-white/95 px-3 py-1.5 text-[11px] font-black text-[#22334A] shadow-md ring-1 ring-slate-200"
                  >
                    تغيير
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      pickImageFile(null)
                      setCourseImage('')
                    }}
                    className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-1.5 text-[11px] font-black text-white shadow-md"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    إزالة
                  </button>
                </div>
              </div>
            : (
              <label htmlFor="course-wizard-cover" className="flex cursor-pointer flex-col items-center gap-2">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#2691C2]/15 text-[#2691C2] ring-1 ring-[#2691C2]/25">
                  <ImagePlus className="h-7 w-7" aria-hidden />
                </span>
                <span className="text-sm font-black text-[#22334A]">اسحب صورة الغلاف أو اضغط للرفع</span>
                <span className="text-[11px] font-semibold text-slate-500">PNG أو JPG — يُرسل الملف للخادم عند الحفظ</span>
              </label>
            )}
          </div>
          {fieldErrors.course_image ?
            <p className="text-[12px] font-bold text-rose-600">{fieldErrors.course_image}</p>
          : null}

          <label className="block text-[11px] font-black text-[#22334A]">
            أو أدخل رابط الصورة (اختياري)
            <input
              value={courseImage}
              onChange={(e) => {
                setCourseImage(e.target.value)
                clearField('course_image')
              }}
              dir="ltr"
              className={`${EMC_WIZARD_INPUT_BASE} font-mono`}
              placeholder="https://…"
            />
          </label>

          <label className="block text-[11px] font-black text-[#22334A]">
            العنوان
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                clearField('title')
              }}
              className={EMC_WIZARD_INPUT_BASE}
            />
            {fieldErrors.title ?
              <span className="mt-1 block text-[11px] font-bold text-rose-600">{fieldErrors.title}</span>
            : null}
          </label>
          <label className="block text-[11px] font-black text-[#22334A]">
            المختصر (slug)
            <input
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value)
                clearField('slug')
              }}
              dir="ltr"
              className={`${EMC_WIZARD_INPUT_BASE} font-mono`}
            />
            {fieldErrors.slug ?
              <span className="mt-1 block text-[11px] font-bold text-rose-600">{fieldErrors.slug}</span>
            : null}
          </label>
          <label className="block text-[11px] font-black text-[#22334A]">
            الوصف المختصر
            <textarea
              value={shortDescription}
              onChange={(e) => {
                setShortDescription(e.target.value)
                clearField('short_description')
              }}
              rows={2}
              className={EMC_WIZARD_INPUT_BASE}
            />
            {fieldErrors.short_description ?
              <span className="mt-1 block text-[11px] font-bold text-rose-600">{fieldErrors.short_description}</span>
            : null}
          </label>
          <label className="block text-[11px] font-black text-[#22334A]">
            الوصف الكامل
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                clearField('description')
              }}
              rows={4}
              className={EMC_WIZARD_INPUT_BASE}
            />
            {fieldErrors.description ?
              <span className="mt-1 block text-[11px] font-bold text-rose-600">{fieldErrors.description}</span>
            : null}
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-[11px] font-black text-[#22334A]">
              نوع البرنامج
              <select value={kind} onChange={(e) => setKind(e.target.value as ProgramKind)} className={EMC_WIZARD_INPUT_BASE}>
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k === 'course' ? 'دورة' : k === 'workshop' ? 'ورشة' : k === 'program' ? 'برنامج' : 'مسار'}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[11px] font-black text-[#22334A]">
              حالة النشر / العمل
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value)
                  clearField('status')
                }}
                className={EMC_WIZARD_INPUT_BASE}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.v} value={s.v}>
                    {s.label}
                  </option>
                ))}
              </select>
              {fieldErrors.status ?
                <span className="mt-1 block text-[11px] font-bold text-rose-600">{fieldErrors.status}</span>
              : null}
            </label>
            <label className="block text-[11px] font-black text-[#22334A]">
              تنسيق الجلسة (للعرض العام)
              <select value={sessionFormat} onChange={(e) => setSessionFormat(e.target.value)} className={EMC_WIZARD_INPUT_BASE}>
                {SESSION_FORMAT_OPTIONS.map((s) => (
                  <option key={s.v} value={s.v}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[11px] font-black text-[#22334A]">
              الإدارة
              <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={EMC_WIZARD_INPUT_BASE}>
                <option value="">— اختياري —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[11px] font-black sm:col-span-2 text-[#22334A]">
              المسار
              <select value={trackId} onChange={(e) => setTrackId(e.target.value)} className={EMC_WIZARD_INPUT_BASE}>
                <option value="">— اختياري —</option>
                {tracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </FormSectionCard>
      )
    }
    if (currentStep === 2) {
      return (
        <FormSectionCard title="المدرب والجدولة" eyebrow="الخطوة 2" icon={CalendarDays}>
          <label className="block text-[11px] font-black text-[#22334A]">
            نوع التقديم (للزائر)
            <select
              value={locationType}
              onChange={(e) => {
                const v = e.target.value
                setLocationType(v)
                setIsOnline(v === 'online' || v === 'hybrid')
                clearField('location')
                clearField('location_type')
                clearField('delivery_type')
              }}
              className={EMC_WIZARD_INPUT_BASE}
            >
              {LOC_TYPES.map((x) => (
                <option key={x.v} value={x.v}>
                  {x.label}
                </option>
              ))}
            </select>
            {fieldErrors.location_type || fieldErrors.delivery_type ?
              <span className="mt-1 block text-[11px] font-bold text-rose-600">
                {fieldErrors.location_type || fieldErrors.delivery_type}
              </span>
            : null}
          </label>

          {showLocationField ?
            <label className="block text-[11px] font-black text-[#22334A]">
              الموقع / العنوان <span className="text-rose-600">*</span>
              <input
                value={locationText}
                onChange={(e) => {
                  setLocationText(e.target.value)
                  clearField('location')
                }}
                className={EMC_WIZARD_INPUT_BASE}
                placeholder="مدينة، قاعة، عنوان…"
              />
              {fieldErrors.location ?
                <span className="mt-1 block text-[11px] font-bold text-rose-600">{fieldErrors.location}</span>
              : null}
            </label>
          : null}

          <div className="space-y-3 border-t border-slate-200/80 pt-4">
            <p className="text-[12px] font-bold text-slate-600">اختيار المدرب — قائمة المدربين فقط</p>
            <div className="relative">
              <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                value={instructorQuery}
                onChange={(e) => setInstructorQuery(e.target.value)}
                className={`${EMC_WIZARD_INPUT_BASE} pe-10`}
                placeholder="ابحث بالاسم أو البريد…"
              />
            </div>
            {fieldErrors.instructor_id ?
              <p className="text-[12px] font-bold text-rose-600">{fieldErrors.instructor_id}</p>
            : null}
            {selectedInstructor ?
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#2691C2]/25 bg-[#2691C2]/[0.06] p-4">
                {selectedInstructor.avatar_url ?
                  <img src={selectedInstructor.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-white" />
                : <UserCircle2 className="h-12 w-12 text-slate-400" aria-hidden />}
                <div className="min-w-0 flex-1 text-right">
                  <p className="text-sm font-black text-[#22334A]">{selectedInstructor.name}</p>
                  <p className="truncate text-xs font-semibold text-slate-600">{selectedInstructor.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setInstructorId('')
                    clearField('instructor_id')
                  }}
                  className="text-[11px] font-black text-rose-600"
                >
                  إزالة
                </button>
              </div>
            : null}
            {!selectedInstructor ?
              <ul
                className="rounded-2xl border border-slate-200/90 bg-white p-2 shadow-inner"
                role="listbox"
              >
                {filteredInstructors.length === 0 ?
                  <li className="px-3 py-4 text-center text-[12px] font-semibold text-slate-500">
                    لا يمكن عرض المدربين بعد التحميل — راجع وحدة التحكم (استجابة GET /admin/instructors) أو أضِف صفًا في جدول المدربين.
                  </li>
                : filteredInstructors.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setInstructorId(String(u.id))
                          clearField('instructor_id')
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right transition hover:bg-slate-50"
                      >
                        {u.avatar_url ?
                          <img src={u.avatar_url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                        : <UserCircle2 className="h-9 w-9 shrink-0 text-slate-400" />}
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-black text-[#22334A]">{u.name}</p>
                          <p className="truncate text-[11px] font-semibold text-slate-500">{u.email}</p>
                        </div>
                      </button>
                    </li>
                  ))
                }
              </ul>
            : null}
            <Link
              to="/dashboard/super-admin/crud/instructors"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-[12px] font-black text-[#2691C2] hover:underline"
            >
              <Plus className="h-4 w-4" aria-hidden />
              إدارة المدربين
            </Link>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <ModernDatePicker
              label="تاريخ البداية (اختياري)"
              value={startDate}
              onChange={(v) => {
                setStartDate(v)
                clearField('start_date')
              }}
              error={fieldErrors.start_date}
            />
            <ModernTimePicker
              label="وقت البداية (24 ساعة، اختياري)"
              value={startTime}
              onChange={(v) => {
                setStartTime(toHHmm(v))
                clearField('start_time')
                clearField('study_time')
              }}
              error={fieldErrors.start_time || fieldErrors.study_time}
            />
            <ModernDatePicker
              label="تاريخ الانتهاء (اختياري)"
              value={endDate}
              onChange={(v) => {
                setEndDate(v)
                clearField('end_date')
              }}
              error={fieldErrors.end_date}
            />
            <ModernTimePicker
              label="وقت الانتهاء (24 ساعة، اختياري)"
              value={endTime}
              onChange={(v) => {
                setEndTime(toHHmm(v))
                clearField('end_time')
              }}
              error={fieldErrors.end_time}
            />
            <div className="hidden text-[11px] font-black text-[#22334A]">
              <span className="mb-1 block">تاريخ البداية (اختياري)</span>
              <div className="relative mt-1">
                <Calendar className="pointer-events-none absolute end-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-[#2691C2]" aria-hidden />
                <input
                  type="text"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    clearField('start_date')
                  }}
                  className={`${EMC_WIZARD_INPUT_BASE} min-h-[44px] cursor-pointer pe-10 [color-scheme:light] shadow-inner`}
                />
              </div>
              {fieldErrors.start_date ?
                <span className="mt-1 block text-[11px] font-bold text-rose-600">{fieldErrors.start_date}</span>
              : null}
            </div>
            <div className="hidden text-[11px] font-black text-[#22334A]">
              <span className="mb-1 block">وقت البداية (24 ساعة، اختياري)</span>
              <div className="relative mt-1">
                <Clock className="pointer-events-none absolute end-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-[#2691C2]" aria-hidden />
                <input
                  type="text"
                  step={60}
                  value={startTime}
                  onChange={(e) => {
                    setStartTime(toHHmm(e.target.value))
                    clearField('start_time')
                    clearField('study_time')
                  }}
                  className={`${EMC_WIZARD_INPUT_BASE} min-h-[44px] pe-10 font-mono tabular-nums [color-scheme:light]`}
                  placeholder="20:00"
                />
              </div>
              {fieldErrors.start_time || fieldErrors.study_time ?
                <span className="mt-1 block text-[11px] font-bold text-rose-600">
                  {fieldErrors.start_time || fieldErrors.study_time}
                </span>
              : null}
            </div>
            <div className="hidden text-[11px] font-black text-[#22334A]">
              <span className="mb-1 block">تاريخ الانتهاء (اختياري)</span>
              <div className="relative mt-1">
                <Calendar className="pointer-events-none absolute end-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-[#2691C2]" aria-hidden />
                <input
                  type="text"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value)
                    clearField('end_date')
                  }}
                  className={`${EMC_WIZARD_INPUT_BASE} min-h-[44px] pe-10 [color-scheme:light]`}
                />
              </div>
              {fieldErrors.end_date ?
                <span className="mt-1 block text-[11px] font-bold text-rose-600">{fieldErrors.end_date}</span>
              : null}
            </div>
            <div className="hidden text-[11px] font-black text-[#22334A]">
              <span className="mb-1 block">وقت الانتهاء (24 ساعة، اختياري)</span>
              <div className="relative mt-1">
                <Clock className="pointer-events-none absolute end-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-[#2691C2]" aria-hidden />
                <input
                  type="text"
                  step={60}
                  value={endTime}
                  onChange={(e) => {
                    setEndTime(toHHmm(e.target.value))
                    clearField('end_time')
                  }}
                  className={`${EMC_WIZARD_INPUT_BASE} min-h-[44px] pe-10 font-mono tabular-nums [color-scheme:light]`}
                />
              </div>
              {fieldErrors.end_time ?
                <span className="mt-1 block text-[11px] font-bold text-rose-600">{fieldErrors.end_time}</span>
              : null}
            </div>
            <label className="block text-[11px] font-black sm:col-span-2 text-[#22334A]">
              رابط الاجتماع (اختياري)
              <input
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                dir="ltr"
                className={`${EMC_WIZARD_INPUT_BASE} font-mono`}
              />
            </label>
          </div>
        </FormSectionCard>
      )
    }
    if (currentStep === 3) {
      return (
        <FormSectionCard title="التفاصيل التعليمية" eyebrow="الخطوة 3" icon={GraduationCap}>
          <div className="grid gap-4 sm:grid-cols-2">
            {isOneSession && (
              <div className="sm:col-span-2 rounded-xl border border-[#2691C2]/25 bg-[#2691C2]/8 px-4 py-3">
                <p className="text-sm font-black text-[#22334A]">مدة الورشة: {ONE_SESSION_WORKSHOP_DURATION_AR}</p>
                <p className="mt-1 text-[11px] font-semibold text-[#4a6278]">
                  سيتم عرض مدة الورشة كيوم واحد تلقائياً
                </p>
              </div>
            )}

            {/* Duration & training hours — hidden for one-session workshops */}
            {!isOneSession && (
              <label className="block text-[11px] font-black text-[#22334A]">
                المدة (نص للزائر)
                <input value={durationText} onChange={(e) => setDurationText(e.target.value)} className={EMC_WIZARD_INPUT_BASE} placeholder="مثال: 4 أسابيع" />
              </label>
            )}

            {!isOneSession && (
              <label className="block text-[11px] font-black text-[#22334A]">
                عدد الساعات التدريبية
                <input value={trainingHours} onChange={(e) => setTrainingHours(e.target.value)} inputMode="decimal" className={EMC_WIZARD_INPUT_BASE} />
              </label>
            )}

            {/* Language — dropdown */}
            <label className="block text-[11px] font-black text-[#22334A]">
              لغة الدورة
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className={EMC_WIZARD_INPUT_BASE}>
                <option value="">— اختياري —</option>
                <option value="عربي">عربي</option>
                <option value="إنجليزي">إنجليزي</option>
              </select>
            </label>

            {/* Level — dropdown, hidden for workshops */}
            {!isWorkshop && (
              <label className="block text-[11px] font-black text-[#22334A]">
                المستوى
                <select value={level} onChange={(e) => setLevel(e.target.value)} className={EMC_WIZARD_INPUT_BASE}>
                  <option value="">— اختياري —</option>
                  <option value="مبتدئ">مبتدئ</option>
                  <option value="متوسط">متوسط</option>
                  <option value="متقدم">متقدم</option>
                </select>
              </label>
            )}

            {/* Target audience */}
            <label className="block text-[11px] font-black text-[#22334A]">
              الفئة المستهدفة
              <input value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} className={EMC_WIZARD_INPUT_BASE} />
            </label>

            {/* Certificate — dropdown */}
            <label className="block text-[11px] font-black text-[#22334A]">
              الشهادة المتاحة
              <select value={certificate} onChange={(e) => setCertificate(e.target.value)} className={EMC_WIZARD_INPUT_BASE}>
                <option value="">— اختياري —</option>
                <option value="لا توجد شهادة">لا توجد شهادة</option>
                <option value="شهادة حضور">شهادة حضور</option>
                <option value="شهادة إتمام">شهادة إتمام</option>
                <option value="شهادة مشاركة">شهادة مشاركة</option>
              </select>
            </label>

            {/* Placement test toggle */}
            <div className="sm:col-span-2">
              <p className="mb-2 text-[11px] font-black text-[#22334A]">هل يتطلب اختبار تحديد مستوى؟</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRequiresPlacementTest(false)}
                  className={`rounded-xl border py-2.5 text-[12px] font-black transition ${
                    !requiresPlacementTest
                      ? 'border-[#22334A] bg-[#22334A] text-white shadow-md'
                      : 'border-slate-200 bg-white text-[#22334A]/50 hover:bg-slate-50'
                  }`}
                >
                  لا
                </button>
                <button
                  type="button"
                  onClick={() => setRequiresPlacementTest(true)}
                  className={`rounded-xl border py-2.5 text-[12px] font-black transition ${
                    requiresPlacementTest
                      ? 'border-[#2691C2] bg-[#2691C2] text-white shadow-md'
                      : 'border-slate-200 bg-white text-[#22334A]/50 hover:bg-slate-50'
                  }`}
                >
                  نعم
                </button>
              </div>
            </div>
          </div>

          {/* What you'll learn — always shown */}
          <label className="block text-[11px] font-black text-[#22334A]">
            ماذا ستتعلم؟ (نقطة قصيرة لكل سطر)
            <textarea
              value={learnText}
              onChange={(e) => {
                setLearnText(normalizeBulletListText(e.target.value))
                clearField('features')
              }}
              rows={4}
              className={EMC_WIZARD_INPUT_BASE}
              placeholder={'سطر 1\nسطر 2'}
            />
            <BulletListCounter text={learnText} field="features" />
            {fieldErrorFor(fieldErrors, 'features') ?
              <span className="mt-1 block text-[11px] font-bold text-rose-600">{fieldErrorFor(fieldErrors, 'features')}</span>
            : null}
          </label>

          {/* Course-only fields: hide for workshops */}
          {!isWorkshop && (
            <>
              <label className="block text-[11px] font-black text-[#22334A]">
                المتطلبات المسبقة (نقطة قصيرة لكل سطر)
                <textarea
                  value={prerequisites}
                  onChange={(e) => {
                    setPrerequisites(normalizeBulletListText(e.target.value))
                    clearField('requirements')
                  }}
                  rows={3}
                  className={EMC_WIZARD_INPUT_BASE}
                  placeholder={'سطر 1\nسطر 2'}
                />
                <BulletListCounter text={prerequisites} field="requirements" />
                {fieldErrorFor(fieldErrors, 'requirements') ?
                  <span className="mt-1 block text-[11px] font-bold text-rose-600">{fieldErrorFor(fieldErrors, 'requirements')}</span>
                : null}
              </label>
              <label className="block text-[11px] font-black text-[#22334A]">
                المخرجات التعليمية (نقطة قصيرة لكل سطر)
                <textarea
                  value={learningOutcomes}
                  onChange={(e) => {
                    setLearningOutcomes(normalizeBulletListText(e.target.value))
                    clearField('learning_outcomes')
                  }}
                  rows={3}
                  className={EMC_WIZARD_INPUT_BASE}
                  placeholder={'سطر 1\nسطر 2'}
                />
                <BulletListCounter text={learningOutcomes} field="learning_outcomes" />
                <p className="mt-1 text-[10px] font-medium text-[#5a6b7d]">
                  للفقرات الطويلة استخدم «الوصف الكامل» في الخطوة 1 — لا تضعها هنا.
                </p>
                {fieldErrorFor(fieldErrors, 'learning_outcomes') ?
                  <span className="mt-1 block text-[11px] font-bold text-rose-600">{fieldErrorFor(fieldErrors, 'learning_outcomes')}</span>
                : null}
              </label>
              <label className="block text-[11px] font-black text-[#22334A]">
                محاور الدورة (نقطة قصيرة لكل سطر)
                <textarea
                  value={outline}
                  onChange={(e) => {
                    setOutline(normalizeBulletListText(e.target.value))
                    clearField('curriculum_topics')
                  }}
                  rows={3}
                  className={EMC_WIZARD_INPUT_BASE}
                  placeholder={'سطر 1\nسطر 2'}
                />
                <BulletListCounter text={outline} field="curriculum_topics" />
                {fieldErrorFor(fieldErrors, 'curriculum_topics') ?
                  <span className="mt-1 block text-[11px] font-bold text-rose-600">{fieldErrorFor(fieldErrors, 'curriculum_topics')}</span>
                : null}
              </label>
            </>
          )}

          <label className="block text-[11px] font-black text-[#22334A]">
            الكلمات المفتاحية (مفصولة بفواصل)
            <input
              value={keywords}
              onChange={(e) => { setKeywords(e.target.value); clearField('keywords') }}
              className={EMC_WIZARD_INPUT_BASE}
              placeholder="كلمات، مفتاحية"
            />
            {fieldErrorFor(fieldErrors, 'keywords') ?
              <span className="mt-1 block text-[11px] font-bold text-rose-600">{fieldErrorFor(fieldErrors, 'keywords')}</span>
            : null}
          </label>
        </FormSectionCard>
      )
    }
    if (currentStep === 4) {
      return (
        <FormSectionCard title="السعر والتسجيل والإدارة الداخلية" eyebrow="الخطوة 4" icon={CreditCard}>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-slate-50/80 px-4 py-3 text-[13px] font-black text-[#22334A]">
            <input type="checkbox" checked={priceFree} onChange={(e) => setPriceFree(e.target.checked)} className="size-4 rounded border-slate-300" />
            البرنامج مجاني
          </label>
          {!priceFree ?
            <label className="block text-[11px] font-black text-[#22334A]">
              السعر
              <input value={price} onChange={(e) => setPrice(e.target.value)} className={`${EMC_WIZARD_INPUT_BASE} font-mono`} />
            </label>
          : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-[11px] font-black text-[#22334A]">
              عدد المقاعد
              <input value={capacity} onChange={(e) => setCapacity(e.target.value)} className={EMC_WIZARD_INPUT_BASE} />
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 text-[13px] font-black text-[#22334A] sm:mt-6">
              <input
                type="checkbox"
                checked={registrationOpen}
                onChange={(e) => setRegistrationOpen(e.target.checked)}
                className="size-4 rounded border-slate-300"
              />
              التسجيل مفتوح
            </label>
          </div>
          <label className="block text-[11px] font-black text-[#22334A]">
            ملاحظات داخلية (لا تُعرض للزائر عادةً)
            <textarea
              value={adminNotes}
              onChange={(e) => {
                setAdminNotes(e.target.value)
                clearField('notes')
              }}
              rows={3}
              className={EMC_WIZARD_INPUT_BASE}
            />
            {fieldErrorFor(fieldErrors, 'notes') ?
              <span className="mt-1 block text-[11px] font-bold text-rose-600">{fieldErrorFor(fieldErrors, 'notes')}</span>
            : null}
          </label>
          <p className="rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 text-[11px] font-semibold text-slate-600">
            تم إنشاء السجل بواسطة: {user?.name ? `${user.name} (#${user.id})` : `#${user?.id ?? '—'}`}
          </p>
        </FormSectionCard>
      )
    }
    return (
      <FormSectionCard title="مراجعة نهائية" eyebrow="الخطوة 5" icon={Eye}>
        <p className="text-[13px] font-semibold leading-relaxed text-slate-700">
          سيتم الإرسال إلى واجهة البرامج ({editing ? 'PUT' : 'POST'}) مع كل الحقول المدعومة في الطلب.
        </p>
        <ul className="space-y-2 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 text-[12px] font-bold text-slate-700">
          <li>العنوان: {title.trim() || '—'}</li>
          <li>المدرب: {wizardInstructorSummary}</li>
          <li>التسعير: {priceFree ? 'مجاني' : `${price}`}</li>
          <li>الحالة: {status}</li>
        </ul>
      </FormSectionCard>
    )
  }, [
    currentStep,
    title,
    slug,
    shortDescription,
    description,
    courseImage,
    kind,
    status,
    sessionFormat,
    departmentId,
    departments,
    trackId,
    tracks,
    instructorQuery,
    selectedInstructor,
    filteredInstructors,
    wizardInstructorSummary,
    locationText,
    locationType,
    startDate,
    startTime,
    endDate,
    endTime,
    meetingLink,
    durationText,
    trainingHours,
    language,
    level,
    targetAudience,
    certificate,
    learnText,
    prerequisites,
    learningOutcomes,
    outline,
    keywords,
    priceFree,
    price,
    capacity,
    registrationOpen,
    adminNotes,
    editing,
    showLocationField,
    isWorkshop,
    requiresPlacementTest,
    clearField,
    pickImageFile,
    fieldErrors,
    imagePreviewUrl,
    coverPreviewSrc,
    imageFile,
  ])

  const successSlug = savedCourse?.slug
  const successTitle = editing
    ? 'تم تحديث الدورة بنجاح'
    : lastSavedAsPublished
      ? 'تم إنشاء الدورة ونشرها بنجاح'
      : 'تم إنشاء الدورة بنجاح'

  return (
    <>
      <FormWizardShell
        open={open && !successOpen}
        onClose={onClose}
        title={editing ? 'تعديل برنامج / دورة' : 'إنشاء برنامج / دورة'}
        eyebrow={`Programs · LMS${isWorkshop ? ' · ورشة' : ''}`}
        stepsMeta={STEP_META}
        currentStep={currentStep}
        onStepSelect={(id) => {
          if (id < currentStep) setCurrentStep(id)
        }}
        progressPercent={progressPercent}
        progressLabel="اكتمال المعالج"
        mainColumn={
          <div className="space-y-2">
            {Object.keys(fieldErrors).length > 0 ?
              <div className="mb-2 rounded-2xl border border-rose-200/90 bg-rose-50/90 px-4 py-3 text-right">
                <p className="text-[11px] font-black text-rose-800">تأكّد من الحقول التالية (ردًّا من الخادم):</p>
                <ul className="mt-2 space-y-1 text-[12px] font-bold text-rose-700">
                  {Object.entries(fieldErrors).map(([k, msg]) => {
                    const base = k.split('.')[0] ?? k
                    return (
                      <li key={k}>
                        <span className="text-rose-900">{FIELD_LABEL_AR[base] ?? base}:</span> {msg}
                      </li>
                    )
                  })}
                </ul>
              </div>
            : null}
            {localDraftSavedAt ?
              <div className="mb-2 flex items-center justify-end rounded-2xl border border-emerald-200/90 bg-emerald-50/90 px-4 py-2 text-[11px] font-black text-emerald-900">
                تم حفظ المسودة — {localDraftSavedAt}
              </div>
            : null}
            {draftHint && !editing ?
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#2691C2]/30 bg-[#2691C2]/[0.07] px-4 py-3 text-[12px] font-bold text-[#22334A]">
                <span>يوجد مسودة محفوظة محليًا لهذا النموذج.</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={restoreDraft}
                    className="rounded-xl bg-white px-3 py-1.5 text-[11px] font-black text-[#2691C2] shadow-sm ring-1 ring-[#2691C2]/25"
                  >
                    استعادة
                  </button>
                  <button type="button" onClick={clearDraft} className="rounded-xl px-3 py-1.5 text-[11px] font-black text-slate-600">
                    تجاهل
                  </button>
                </div>
              </div>
            : null}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={emcWizardStepAnimation.initial}
                animate={emcWizardStepAnimation.animate}
                exit={emcWizardStepAnimation.exit}
                transition={emcWizardStepAnimation.transition}
                className="min-h-[240px]"
              >
                {mainFields}
              </motion.div>
            </AnimatePresence>
            <FormActions
              showBack={currentStep > 1}
              onBack={goBack}
              showNext={currentStep < STEP_META.length}
              onNext={goNext}
              showSubmit={currentStep === STEP_META.length}
              onSubmit={() => void submit()}
              busy={busy}
              disableNext={busy}
              disableSubmit={busy}
              submitLabel={editing ? 'حفظ التعديلات' : 'حفظ ونشر في النظام'}
              extras={
                <button
                  type="button"
                  onClick={() => {
                    persistDraft()
                  }}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[12px] font-black text-slate-700 shadow-sm"
                >
                  حفظ مسودة
                </button>
              }
            />
          </div>
        }
        sidebar={
          <>
            <FormSummaryPanel rows={summaryRows} />
            <FormHelpCard title="إرشادات الخطوة">{helpByStep}</FormHelpCard>
            <FormChecklist items={checklistItems} />
          </>
        }
      />
      <FormSuccessState
        open={successOpen}
        title={successTitle}
        description="تم حفظ بيانات الدورة وإتاحتها حسب حالة النشر والتسجيل."
        actions={
          <div className="flex w-full flex-col gap-3 text-right">
            {successSlug ?
              <a
                href={`/courses/${successSlug}`}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  setSuccessOpen(false)
                  onSaved()
                  onClose()
                }}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-l from-[#2691C2] to-[#22334A] px-5 py-3 text-sm font-black text-white shadow-lg"
              >
                عرض الدورة
              </a>
            : null}
            {!editing ?
              <button
                type="button"
                onClick={handleCreateAnother}
                className="inline-flex w-full items-center justify-center rounded-2xl border-2 border-[#2691C2]/40 bg-white px-5 py-3 text-sm font-black text-[#22334A] transition hover:bg-slate-50"
              >
                إنشاء دورة جديدة
              </button>
            : null}
            <Link
              to={listHref}
              onClick={() => {
                setSuccessOpen(false)
                setLastSavedAsPublished(false)
                onSaved()
                onClose()
              }}
              className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-black text-slate-800"
            >
              العودة للقائمة
            </Link>
          </div>
        }
      />
    </>
  )
}
