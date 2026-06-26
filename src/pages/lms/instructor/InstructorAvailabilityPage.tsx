import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react'
import {
  createInstructorAvailability,
  deleteInstructorAvailability,
  fetchInstructorAvailability,
  type InstructorAvailabilitySlot,
} from '@/api/placementApi'
import { fetchInstructorCourses } from '@/api/instructorApi'
import type { TeachingCourseLms } from '@/types/lms'
import toast from '@/lib/toast'
import { BackButton } from '@/components/shared/BackButton'
import GoogleStyleTimePicker from '@/components/shared/GoogleStyleTimePicker'

/* ── Constants ───────────────────────────────────────────────────────────── */

const DAYS_AR   = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'] as const
const DAYS_NAME = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const

const TIME_PRESETS: Array<{ label: string; start: string; end: string }> = [
  { label: 'صباحاً', start: '09:00', end: '12:00' },
  { label: 'ظهراً',  start: '12:00', end: '15:00' },
  { label: 'عصراً',  start: '15:00', end: '18:00' },
  { label: 'مساءً',  start: '18:00', end: '21:00' },
  { label: 'مخصص',   start: '',      end: ''       },
]

const DURATION_OPTS = [15, 30, 45, 60] as const

type FilterMode = 'upcoming' | 'all' | 'available' | 'booked'

/* ── Date helpers ────────────────────────────────────────────────────────── */

function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function toDMY(iso: string): string {
  if (!iso || iso.length < 10) return iso
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

function isoToHM(iso: string | null | undefined): string {
  if (!iso) return '—'
  const part = iso.slice(11, 16)
  if (/^\d{2}:\d{2}$/.test(part)) return part
  const start = iso.slice(0, 5)
  if (/^\d{2}:\d{2}$/.test(start)) return start
  try {
    const d = new Date(iso)
    if (!isNaN(d.getTime()))
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch { /* fall through */ }
  return '—'
}

function dateDayHeader(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  return `${DAYS_AR[d.getDay()]}، ${toDMY(iso)}`
}

function addMins(t: string, m: number): string {
  const [h, min] = t.split(':').map(Number)
  const total = h * 60 + min + m
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function getDatesInRange(start: string, end: string): string[] {
  const out: string[] = []
  const cur = new Date(`${start}T00:00:00`)
  const last = new Date(`${end}T00:00:00`)
  while (cur <= last) { out.push(localISO(cur)); cur.setDate(cur.getDate() + 1) }
  return out
}

function getWeekBounds(): { startISO: string; endISO: string } {
  const now = new Date()
  const s = new Date(now); s.setDate(now.getDate() - now.getDay())
  const e = new Date(now); e.setDate(now.getDate() + (6 - now.getDay()))
  return { startISO: localISO(s), endISO: localISO(e) }
}

/* ── Form types ──────────────────────────────────────────────────────────── */

type BulkForm = {
  applyToAll:  boolean
  courseId:    string
  dateMode:    'single' | 'range'
  singleDate:  string
  dateFrom:    string
  dateTo:      string
  days:        number[]
  presetIdx:   number
  customStart: string
  customEnd:   string
  duration:    number
  notes:       string
}

const TODAY      = localISO(new Date())
const DEFAULT_TO = localISO(new Date(Date.now() + 7 * 86400000))

const EMPTY_FORM: BulkForm = {
  applyToAll:  true,
  courseId:    '',
  dateMode:    'single',
  singleDate:  TODAY,
  dateFrom:    TODAY,
  dateTo:      DEFAULT_TO,
  days:        [0, 1, 2, 3, 4],
  presetIdx:   0,
  customStart: '09:00',
  customEnd:   '12:00',
  duration:    60,
  notes:       '',
}

/* ── Preview ─────────────────────────────────────────────────────────────── */

type SlotPreview = { date: string; start: string; end: string }

function buildPreviews(form: BulkForm): SlotPreview[] {
  const isCustom = form.presetIdx === TIME_PRESETS.length - 1
  const startT = isCustom ? form.customStart : TIME_PRESETS[form.presetIdx].start
  const endT   = isCustom ? form.customEnd   : TIME_PRESETS[form.presetIdx].end
  if (!startT || !endT || startT >= endT) return []

  let dates: string[]
  if (form.dateMode === 'single') {
    dates = form.singleDate ? [form.singleDate] : []
  } else {
    if (!form.dateFrom || !form.dateTo || form.dateFrom > form.dateTo) return []
    dates = getDatesInRange(form.dateFrom, form.dateTo)
  }

  const out: SlotPreview[] = []
  for (const date of dates) {
    if (form.dateMode === 'range') {
      if (!form.days.includes(new Date(`${date}T00:00:00`).getDay())) continue
    }
    let cursor = startT
    while (cursor < endT) {
      const next = addMins(cursor, form.duration)
      if (next > endT) break
      out.push({ date, start: cursor, end: next })
      cursor = next
    }
  }
  return out
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const fieldCls = (hasError: boolean) =>
  `h-10 w-full rounded-2xl border bg-white px-3.5 text-[13px] font-semibold text-deepBlue outline-none focus:ring-4 focus:ring-sky-100 ${
    hasError ? 'border-red-400 focus:border-red-400' : 'border-slate-200 focus:border-customBlue'
  }`

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function InstructorAvailabilityPage() {
  const [slots,      setSlots]      = useState<InstructorAvailabilitySlot[]>([])
  const [courses,    setCourses]    = useState<TeachingCourseLms[]>([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [form,       setForm]       = useState<BulkForm>(EMPTY_FORM)
  const [errors,     setErrors]     = useState<Record<string, string>>({})
  const [saving,     setSaving]     = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [filter,     setFilter]     = useState<FilterMode>('upcoming')
  const [showPast,   setShowPast]   = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [s, c] = await Promise.all([fetchInstructorAvailability(), fetchInstructorCourses()])
      setSlots(s.sort((a, b) => a.starts_at.localeCompare(b.starts_at)))
      setCourses(c)
    } catch {
      toast.error('تعذّر تحميل المواعيد')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, []) // eslint-disable-line

  const previews = useMemo(() => buildPreviews(form), [form])

  function patchForm(patch: Partial<BulkForm>) {
    setForm((f) => ({ ...f, ...patch }))
    setErrors({})
  }

  /* ── Validate ─────────────────────────────────────────────────────────── */
  function validate(): Record<string, string> {
    const errs: Record<string, string> = {}
    const isCustom = form.presetIdx === TIME_PRESETS.length - 1
    const startT = isCustom ? form.customStart : TIME_PRESETS[form.presetIdx].start
    const endT   = isCustom ? form.customEnd   : TIME_PRESETS[form.presetIdx].end

    if (!form.applyToAll && !form.courseId) errs.courseId = 'يرجى اختيار الدورة'
    if (form.dateMode === 'single' && !form.singleDate) errs.singleDate = 'يرجى اختيار التاريخ'
    if (form.dateMode === 'range') {
      if (!form.dateFrom) errs.dateFrom = 'يرجى اختيار تاريخ البداية'
      if (!form.dateTo)   errs.dateTo   = 'يرجى اختيار تاريخ النهاية'
      if (form.dateFrom && form.dateTo && form.dateFrom > form.dateTo)
        errs.dateTo = 'يجب أن يكون تاريخ النهاية بعد البداية'
      if (form.days.length === 0) errs.days = 'يرجى اختيار يوم واحد على الأقل'
    }
    if (!startT) errs.startTime = 'يرجى تحديد وقت البداية'
    if (!endT)   errs.endTime   = 'يرجى تحديد وقت النهاية'
    if (startT && endT && startT >= endT) errs.endTime = 'وقت النهاية يجب أن يكون بعد وقت البداية'
    if (previews.length === 0 && Object.keys(errs).length === 0)
      errs.general = 'لا توجد مواعيد ستُنشأ — يرجى مراجعة التاريخ والوقت'
    return errs
  }

  /* ── Save ─────────────────────────────────────────────────────────────── */
  async function handleSave() {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    const isCustom = form.presetIdx === TIME_PRESETS.length - 1
    const startTime = isCustom ? form.customStart : TIME_PRESETS[form.presetIdx].start
    const endTime   = isCustom ? form.customEnd   : TIME_PRESETS[form.presetIdx].end

    setSaving(true)
    try {
      const created = await createInstructorAvailability({
        course_id:     form.applyToAll ? null : Number(form.courseId),
        date_from:     form.dateMode === 'single' ? form.singleDate : form.dateFrom,
        date_to:       form.dateMode === 'single' ? form.singleDate : form.dateTo,
        weekdays:      form.dateMode === 'single'
          ? [DAYS_NAME[new Date(`${form.singleDate}T00:00:00`).getDay()]]
          : [...form.days].sort().map((d) => DAYS_NAME[d]),
        start_time:    startTime,
        end_time:      endTime,
        slot_duration: form.duration,
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      })
      const count = created.length || previews.length
      toast.success(`تم إنشاء ${count} موعدًا بنجاح`)
      setShowForm(false)
      setForm(EMPTY_FORM)
      setErrors({})
      // Prepend immediately so UI updates without waiting for reload
      setSlots(prev => [...created, ...prev].sort((a, b) => a.starts_at.localeCompare(b.starts_at)))
      void load()
    } catch (err: unknown) {
      const resp = (err as {
        response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } }
      }).response
      if (resp?.status === 422) {
        const be = resp.data?.errors ?? {}
        const newErrs: Record<string, string> = {}
        for (const [field, msgs] of Object.entries(be))
          if (Array.isArray(msgs)) newErrs[field] = msgs[0] ?? 'خطأ في الحقل'
        if (Object.keys(newErrs).length === 0 && resp.data?.message)
          newErrs.general = resp.data.message
        setErrors(newErrs)
        toast.error('تعذر حفظ المواعيد، يرجى مراجعة الحقول.')
      } else {
        toast.error('تعذّر حفظ المواعيد. يرجى التحقق من إعدادات الخادم.')
      }
    } finally {
      setSaving(false)
    }
  }

  /* ── Delete ───────────────────────────────────────────────────────────── */
  async function handleDelete(id: number) {
    setDeletingId(id)
    try {
      await deleteInstructorAvailability(id)
      setSlots((prev) => prev.filter((s) => s.id !== id))
      toast.success('تم حذف الموعد')
    } catch {
      toast.error('تعذّر حذف الموعد')
    } finally {
      setDeletingId(null)
    }
  }

  /* ── Compute ──────────────────────────────────────────────────────────── */
  const grouped = useMemo(() => {
    const m = new Map<string, InstructorAvailabilitySlot[]>()
    for (const s of slots) {
      const d = s.starts_at.slice(0, 10)
      m.set(d, [...(m.get(d) ?? []), s])
    }
    return m
  }, [slots])

  const allDates = useMemo(() => [...grouped.keys()].sort(), [grouped])
  const upcoming = useMemo(() => allDates.filter((d) => d >= TODAY), [allDates])

  const { startISO: weekStart, endISO: weekEnd } = getWeekBounds()
  const thisWeekCount  = slots.filter((s) => { const d = s.starts_at.slice(0, 10); return d >= weekStart && d <= weekEnd }).length
  const upcomingSlots  = upcoming.reduce((n, d) => n + (grouped.get(d)?.length ?? 0), 0)
  const availableCount = slots.filter((s) => s.is_available && s.starts_at.slice(0, 10) >= TODAY).length
  const bookedCount    = slots.filter((s) => !s.is_available).length

  const filterDates = useMemo(() => {
    const base = filter === 'upcoming' ? upcoming : allDates
    return base.filter((d) => {
      const ds = grouped.get(d) ?? []
      if (filter === 'available') return ds.some((s) => s.is_available)
      if (filter === 'booked')    return ds.some((s) => !s.is_available)
      return true
    }).map((d) => {
      const ds = grouped.get(d) ?? []
      return {
        date: d,
        slots: filter === 'available' ? ds.filter((s) => s.is_available)
             : filter === 'booked'    ? ds.filter((s) => !s.is_available)
             : ds,
      }
    })
  }, [filter, upcoming, allDates, grouped])

  const upcomingFiltered = filterDates.filter(({ date }) => date >= TODAY)
  const pastFiltered     = filterDates.filter(({ date }) => date <  TODAY)

  return (
    <div className="space-y-5 pb-16" dir="rtl">

      <BackButton to="/dashboard/instructor/courses" />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-bl from-deepBlue via-[#1a2d44] to-customBlue px-6 py-6 shadow-[0_20px_50px_-20px_rgba(34,51,74,0.5)] sm:px-10"
      >
        <div aria-hidden className="pointer-events-none absolute -left-10 top-0 h-44 w-44 rounded-full bg-customOrange/15 blur-[80px]" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">مدرّب EMC</p>
            <h1 className="mt-0.5 text-[1.5rem] font-black leading-tight text-white">التوفر والمواعيد</h1>
            <p className="mt-1 text-[12px] font-semibold text-white/55">
              أنشئ أوقات المقابلات الشفوية واسمح للطلاب بحجز الموعد المناسب.
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => void load()} disabled={loading}
              className="flex items-center gap-1.5 rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-[11px] font-black text-white backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-50">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </button>
            <button type="button" onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 rounded-2xl bg-customOrange px-4 py-2 text-[11px] font-black text-white shadow-md transition hover:brightness-105">
              <Plus className="h-4 w-4" />
              إنشاء مواعيد
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── KPI cards ─────────────────────────────────────────────────────── */}
      {!loading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {([
            { label: 'مواعيد قادمة',  value: upcomingSlots,  color: 'text-customBlue',   bg: 'bg-customBlue/[0.06]'   },
            { label: 'متاحة',          value: availableCount, color: 'text-emerald-600',  bg: 'bg-emerald-50'          },
            { label: 'محجوزة',         value: bookedCount,    color: 'text-customOrange', bg: 'bg-customOrange/[0.07]' },
            { label: 'هذا الأسبوع',   value: thisWeekCount,  color: 'text-violet-600',   bg: 'bg-violet-50'           },
          ] as { label: string; value: number; color: string; bg: string }[]).map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className={`font-mono text-[28px] font-black tabular-nums ${color}`}>{value}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-deepBlue/50">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Main layout ───────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      ) : slots.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="rounded-3xl border border-dashed border-slate-200 bg-white py-20 text-center">
          <CalendarDays className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-4 text-[16px] font-black text-deepBlue">لا توجد مواعيد توفر</p>
          <p className="mt-2 text-[12px] font-semibold text-deepBlue/40">
            أنشئ مواعيدك حتى يتمكن الطلاب من حجز المقابلات
          </p>
          <button type="button" onClick={() => setShowForm(true)}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-customBlue px-5 py-2.5 text-[12px] font-black text-white shadow-md transition hover:brightness-105">
            <Plus className="h-4 w-4" />
            إنشاء أول موعد
          </button>
        </motion.div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_240px]">

          {/* ── Schedule ────────────────────────────────────────────────── */}
          <div className="space-y-4">

            {upcomingFiltered.length > 0 ? (
              <div className="space-y-3">
                <SectionLabel label="المواعيد القادمة"
                  count={upcomingFiltered.reduce((n, x) => n + x.slots.length, 0)} />
                {upcomingFiltered.map(({ date, slots: ds }) => (
                  <DayCard key={date} date={date} slots={ds} courses={courses}
                    onDelete={handleDelete} deletingId={deletingId} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-10 text-center">
                <CalendarDays className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 text-[13px] font-black text-deepBlue">لا توجد مواعيد قادمة</p>
              </div>
            )}

            {pastFiltered.length > 0 && (
              <div>
                <button type="button" onClick={() => setShowPast((v) => !v)}
                  className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-deepBlue/30 transition hover:text-deepBlue/50">
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showPast ? 'rotate-180' : ''}`} />
                  المواعيد السابقة ({pastFiltered.reduce((n, x) => n + x.slots.length, 0)})
                </button>
                <AnimatePresence>
                  {showPast && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }} className="mt-3 space-y-3 overflow-hidden opacity-60">
                      {pastFiltered.map(({ date, slots: ds }) => (
                        <DayCard key={date} date={date} slots={ds} courses={courses}
                          onDelete={handleDelete} deletingId={deletingId} />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* ── Sidebar ─────────────────────────────────────────────────── */}
          <div className="space-y-4">
            <button type="button" onClick={() => setShowForm(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-customBlue py-3 text-[12px] font-black text-white shadow-md transition hover:brightness-105">
              <Plus className="h-4 w-4" />
              إنشاء مواعيد جديدة
            </button>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-deepBlue/35">تصفية</p>
              <div className="space-y-0.5">
                {([
                  { value: 'upcoming',  label: 'القادمة فقط'   },
                  { value: 'all',       label: 'كل المواعيد'   },
                  { value: 'available', label: 'المتاحة فقط'   },
                  { value: 'booked',    label: 'المحجوزة فقط'  },
                ] as { value: FilterMode; label: string }[]).map(({ value, label }) => (
                  <button key={value} type="button" onClick={() => setFilter(value)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-right text-[12px] font-black transition ${
                      filter === value
                        ? 'bg-customBlue/[0.08] text-customBlue'
                        : 'text-deepBlue/55 hover:bg-slate-50'
                    }`}>
                    {label}
                    <span className={`h-2 w-2 rounded-full ${filter === value ? 'bg-customBlue' : 'bg-slate-200'}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <AvailabilityModal
            form={form}
            errors={errors}
            courses={courses}
            saving={saving}
            previews={previews}
            onPatch={patchForm}
            onSave={() => void handleSave()}
            onClose={() => { setShowForm(false); setErrors({}) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── SectionLabel ────────────────────────────────────────────────────────── */

function SectionLabel({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-[11px] font-black uppercase tracking-widest text-deepBlue/40">{label}</p>
      <span className="font-mono text-[11px] font-semibold text-deepBlue/30">{count} موعد</span>
    </div>
  )
}

/* ── DayCard ─────────────────────────────────────────────────────────────── */

function DayCard({ date, slots, courses, onDelete, deletingId }: {
  date: string
  slots: InstructorAvailabilitySlot[]
  courses: TeachingCourseLms[]
  onDelete: (id: number) => Promise<void>
  deletingId: number | null
}) {
  const d         = new Date(`${date}T00:00:00`)
  const dayName   = DAYS_AR[d.getDay()]
  const dayNum    = String(d.getDate()).padStart(2, '0')
  const available = slots.filter((s) => s.is_available).length
  const booked    = slots.length - available

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-customBlue/[0.08] text-[14px] font-black text-customBlue">
          {dayNum}
        </div>
        <div className="flex-1">
          <p className="text-[13px] font-black text-deepBlue">{dayName}، {toDMY(date)}</p>
          <div className="mt-0.5 flex gap-2 text-[10px] font-semibold">
            {available > 0 && <span className="text-emerald-600">{available} متاح</span>}
            {booked > 0    && <span className="text-customOrange">{booked} محجوز</span>}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 p-3">
        {slots.map((slot) => {
          const course     = courses.find((c) => c.id === slot.course_id)
          const courseName = course?.title ?? (slot as { course_title?: string }).course_title
          const isBooked   = !slot.is_available
          const isDeleting = deletingId === slot.id

          return (
            <div key={slot.id}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
                isBooked ? 'border-customOrange/20 bg-customOrange/[0.05]' : 'border-emerald-200 bg-emerald-50/60'
              }`}>
              <div>
                <p className={`font-mono text-[12px] font-black tabular-nums ${isBooked ? 'text-customOrange' : 'text-emerald-700'}`}>
                  {isoToHM(slot.starts_at)}<span className="opacity-40"> – </span>{isoToHM(slot.ends_at)}
                </p>
                {courseName && (
                  <p className="max-w-[110px] truncate text-[9px] font-semibold text-deepBlue/45">{courseName}</p>
                )}
              </div>
              <span className={`shrink-0 rounded-lg px-1.5 py-0.5 text-[9px] font-black ${
                isBooked ? 'bg-customOrange/15 text-customOrange' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {isBooked ? 'محجوز' : 'متاح'}
              </span>
              {!isBooked && (
                <button type="button" onClick={() => void onDelete(slot.id)} disabled={isDeleting}
                  title="حذف الموعد"
                  className="shrink-0 rounded-lg p-1 text-slate-300 transition hover:bg-red-50 hover:text-red-400 disabled:opacity-40">
                  {isDeleting
                    ? <RefreshCw className="h-3 w-3 animate-spin" />
                    : <Trash2 className="h-3 w-3" />}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

/* ── AvailabilityModal ───────────────────────────────────────────────────── */

function AvailabilityModal({ form, errors, courses, saving, previews, onPatch, onSave, onClose }: {
  form: BulkForm
  errors: Record<string, string>
  courses: TeachingCourseLms[]
  saving: boolean
  previews: SlotPreview[]
  onPatch: (patch: Partial<BulkForm>) => void
  onSave: () => void
  onClose: () => void
}) {
  const previewByDate = useMemo(() => {
    const m = new Map<string, Array<{ start: string; end: string }>>()
    for (const p of previews) m.set(p.date, [...(m.get(p.date) ?? []), { start: p.start, end: p.end }])
    return m
  }, [previews])

  const isCustom = form.presetIdx === TIME_PRESETS.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4 pt-6" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-5xl rounded-3xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-7 py-5">
          <div>
            <h2 className="text-[17px] font-black text-deepBlue">إنشاء مواعيد توفر</h2>
            <p className="mt-0.5 text-[11px] font-semibold text-deepBlue/40">أنشئ عدة مواعيد دفعة واحدة</p>
          </div>
          <button type="button" onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body: Form (right/RTL-start) + Preview (left/RTL-end) */}
        <div className="grid grid-cols-1 divide-x divide-x-reverse divide-slate-100 lg:grid-cols-[1fr_300px]">

          {/* ── Form ────────────────────────────────────────────────────── */}
          <div className="space-y-5 px-7 py-6">

            {errors.general && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-[12px] font-bold text-red-700 ring-1 ring-red-100">
                {errors.general}
              </div>
            )}

            {/* A. Course scope */}
            <FieldSection label="أ. نطاق التطبيق">
              <div className="flex gap-2">
                <Chip active={form.applyToAll}  label="جميع دوراتي" onClick={() => onPatch({ applyToAll: true, courseId: '' })} />
                <Chip active={!form.applyToAll} label="دورة محددة"   onClick={() => onPatch({ applyToAll: false })} />
              </div>
              {!form.applyToAll && (
                <>
                  <select value={form.courseId} dir="rtl"
                    className={`mt-2 ${fieldCls(!!errors.courseId)}`}
                    onChange={(e) => onPatch({ courseId: e.target.value })}>
                    <option value="">اختر دورة</option>
                    {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                  {errors.courseId && <FieldError msg={errors.courseId} />}
                </>
              )}
            </FieldSection>

            {/* B. Date */}
            <FieldSection label="ب. التاريخ">
              <div className="mb-2 flex gap-2">
                <Chip active={form.dateMode === 'single'} label="يوم واحد"   onClick={() => onPatch({ dateMode: 'single' })} />
                <Chip active={form.dateMode === 'range'}  label="نطاق تاريخ" onClick={() => onPatch({ dateMode: 'range' })} />
              </div>

              {form.dateMode === 'single' ? (
                <div className="flex items-center gap-3">
                  <input type="date" value={form.singleDate} min={TODAY} dir="ltr"
                    className={fieldCls(!!errors.singleDate)}
                    onChange={(e) => {
                      const val = e.target.value
                      const dow = val ? new Date(`${val}T00:00:00`).getDay() : 0
                      onPatch({ singleDate: val, days: [dow] })
                    }} />
                  {form.singleDate && (
                    <span className="shrink-0 rounded-xl bg-slate-100 px-2.5 py-1 text-[11px] font-black text-deepBlue/60">
                      {DAYS_AR[new Date(`${form.singleDate}T00:00:00`).getDay()]}
                    </span>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="mb-1 text-[10px] font-black text-deepBlue/40">من</p>
                    <input type="date" value={form.dateFrom} min={TODAY} dir="ltr"
                      className={fieldCls(!!errors.dateFrom)}
                      onChange={(e) => onPatch({ dateFrom: e.target.value })} />
                    {errors.dateFrom && <FieldError msg={errors.dateFrom} />}
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] font-black text-deepBlue/40">إلى</p>
                    <input type="date" value={form.dateTo} min={form.dateFrom || TODAY} dir="ltr"
                      className={fieldCls(!!errors.dateTo)}
                      onChange={(e) => onPatch({ dateTo: e.target.value })} />
                    {errors.dateTo && <FieldError msg={errors.dateTo} />}
                  </div>
                </div>
              )}
              {errors.singleDate && <FieldError msg={errors.singleDate} />}
            </FieldSection>

            {/* C. Weekdays (range only) */}
            {form.dateMode === 'range' && (
              <FieldSection label="ج. أيام الأسبوع">
                <div className="flex flex-wrap gap-2">
                  {DAYS_AR.map((day, i) => {
                    const on = form.days.includes(i)
                    return (
                      <button key={day} type="button"
                        onClick={() => onPatch({ days: on ? form.days.filter((d) => d !== i) : [...form.days, i] })}
                        className={`rounded-xl px-3 py-1.5 text-[11px] font-black transition ${
                          on ? 'bg-customBlue text-white shadow-sm' : 'border border-slate-200 bg-white text-deepBlue/55 hover:border-slate-300'
                        }`}>
                        {day}
                      </button>
                    )
                  })}
                </div>
                {errors.days && <FieldError msg={errors.days} />}
              </FieldSection>
            )}

            {/* D. Time preset */}
            <FieldSection label="د. الوقت">
              <div className="flex flex-wrap gap-2">
                {TIME_PRESETS.map((p, i) => (
                  <button key={p.label} type="button" onClick={() => onPatch({ presetIdx: i })}
                    className={`rounded-xl px-3 py-1.5 text-[11px] font-black transition ${
                      form.presetIdx === i ? 'bg-deepBlue text-white shadow-sm' : 'border border-slate-200 bg-white text-deepBlue/55 hover:border-slate-300'
                    }`}>
                    {p.label}
                    {p.start && <span className="mr-1 font-mono text-[9px] opacity-60">({p.start}–{p.end})</span>}
                  </button>
                ))}
              </div>

              {isCustom && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <GoogleStyleTimePicker
                    label="من"
                    value={form.customStart || null}
                    onChange={(v) => onPatch({ customStart: v })}
                    error={errors.startTime}
                    minuteStep={15}
                  />
                  <GoogleStyleTimePicker
                    label="إلى"
                    value={form.customEnd || null}
                    onChange={(v) => onPatch({ customEnd: v })}
                    error={errors.endTime}
                    minuteStep={15}
                  />
                </div>
              )}
              {!isCustom && errors.endTime && <FieldError msg={errors.endTime} />}
            </FieldSection>

            {/* E. Duration */}
            <FieldSection label="هـ. مدة الموعد">
              <div className="flex gap-2">
                {DURATION_OPTS.map((d) => (
                  <button key={d} type="button" onClick={() => onPatch({ duration: d })}
                    className={`rounded-xl px-4 py-1.5 font-mono text-[12px] font-black transition ${
                      form.duration === d ? 'bg-customOrange text-white shadow-sm' : 'border border-slate-200 bg-white text-deepBlue/55 hover:border-slate-300'
                    }`}>
                    {d} د
                  </button>
                ))}
              </div>
            </FieldSection>

            {/* Notes */}
            <FieldSection label="ملاحظات" hint="اختياري">
              <input type="text" value={form.notes} dir="rtl"
                placeholder="مثال: للمقابلات الشفوية فقط"
                className={fieldCls(false)}
                onChange={(e) => onPatch({ notes: e.target.value })} />
            </FieldSection>
          </div>

          {/* ── Preview (left / RTL-end) ──────────────────────────────── */}
          <div className="flex flex-col bg-slate-50/60 px-5 py-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-deepBlue/35">معاينة</p>
              {previews.length > 0 && (
                <span className="rounded-xl bg-emerald-100 px-2.5 py-0.5 font-mono text-[11px] font-black text-emerald-700">
                  {previews.length} موعد
                </span>
              )}
            </div>

            {previews.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white py-10 text-center">
                <CalendarDays className="h-7 w-7 text-slate-300" />
                <p className="text-[11px] font-semibold text-deepBlue/35">اختر تاريخًا وأوقاتًا<br />لعرض المعاينة</p>
              </div>
            ) : (
              <div className="flex-1 space-y-3 overflow-y-auto">
                {[...previewByDate.entries()].map(([date, times]) => (
                  <div key={date} className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="mb-2 text-[10px] font-black text-deepBlue/55">{dateDayHeader(date)}</p>
                    <div className="flex flex-wrap gap-1">
                      {times.map((t, i) => (
                        <span key={i} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] font-black tabular-nums text-deepBlue/70">
                          {t.start}–{t.end}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {previews.length > 0 && (
              <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <p className="text-[11px] font-bold text-emerald-700">
                  سيتم إنشاء <span className="font-mono font-black">{previews.length}</span> موعدًا
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-slate-100 px-7 py-5">
          <button type="button" onClick={onSave}
            disabled={saving || previews.length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-customBlue px-4 py-3 text-[13px] font-black text-white transition hover:brightness-105 disabled:opacity-40">
            <Plus className="h-4 w-4" />
            {saving ? 'جاري الإنشاء...' : previews.length > 0 ? `إنشاء ${previews.length} موعد` : 'إنشاء المواعيد'}
          </button>
          <button type="button" onClick={onClose}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-[13px] font-black text-deepBlue/65 transition hover:bg-slate-50">
            إلغاء
          </button>
        </div>
      </motion.div>
    </div>
  )
}

/* ── Micro-components ────────────────────────────────────────────────────── */

function FieldSection({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-black text-deepBlue/50">
        {label}
        {hint && <span className="font-normal text-deepBlue/30">({hint})</span>}
      </p>
      {children}
    </div>
  )
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick}
      className={`rounded-xl px-3.5 py-1.5 text-[11px] font-black transition ${
        active ? 'bg-deepBlue text-white shadow-sm' : 'border border-slate-200 bg-white text-deepBlue/55 hover:border-slate-300'
      }`}>
      {label}
    </button>
  )
}

function FieldError({ msg }: { msg: string }) {
  return <p className="mt-1 text-[11px] font-semibold text-red-500">{msg}</p>
}
