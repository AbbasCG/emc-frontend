import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'
import {
  X, Plus, CalendarClock, MapPin, Loader2,
  Users, BookOpen, Clock, ExternalLink, RefreshCw, AlertCircle,
} from 'lucide-react'
import {
  fetchCalendarEvents,
  fetchCalendarIcsBlob,
  createCalendarEvent,
  deleteCalendarEvent,
} from '@/api/calendarApi'
import { MeetingLinkAction } from '@/components/enterprise/CalendarEventCard'
import { LoadingSkeletonStack } from '@/components/enterprise/LoadingSkeleton'
import CalendarViewSwitcher from '@/components/calendar/CalendarViewSwitcher'
import CalendarListView from '@/components/calendar/CalendarListView'
import CalendarMonthView from '@/components/calendar/CalendarMonthView'
import CalendarWeekView from '@/components/calendar/CalendarWeekView'
import CalendarDayView from '@/components/calendar/CalendarDayView'
import { useAuth } from '@/contexts/AuthContext'
import type { CalendarEventRecord, CalendarFilterKind, CalendarEventInput } from '@/types/phase7'
import {
  formatCalendarDate,
  formatCalendarTime,
  translateEventStatus,
  typeLabel,
  filterTypeLabel,
  getCalendarProgramHref,
  isProgramCalendarEvent,
} from '@/utils/calendarFormat'
import {
  readStoredCalendarView,
  persistCalendarView,
  addMonths,
  addWeeks,
  addDays,
  type CalendarViewMode,
} from '@/utils/calendarGrid'

// ─── Filters ─────────────────────────────────────────────────────────────────

const FILTERS: { id: CalendarFilterKind; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'session', label: 'الجلسات القادمة' },
  { id: 'workshop', label: 'الورش' },
  { id: 'meeting', label: 'الاجتماعات' },
  { id: 'task', label: 'المهام' },
  { id: 'course', label: 'الدورات' },
  { id: 'program', label: 'البرامج' },
  { id: 'learning_path', label: 'المسارات التعليمية' },
]

// ─── Role helpers ─────────────────────────────────────────────────────────────

function getRoleEmptyMsg(role?: string | null): string {
  switch (role) {
    case 'student':
      return 'لا توجد أحداث مرتبطة بالدورات المسجّل فيها. سجّل في دورة لتظهر جلساتها هنا.'
    case 'teacher':
    case 'instructor':
      return 'لا توجد جلسات أو ورش مرتبطة بدوراتك المُسندة.'
    case 'admin':
    case 'super_admin':
      return 'لا أحداث في الفترة الزمنية المحددة.'
    default:
      return 'لا أحداث ضمن الفلتر الحالي. جرّب نوعاً آخر.'
  }
}

function canCreateEvent(role?: string | null): boolean {
  return role === 'admin' || role === 'super_admin'
}

// ─── Detail drawer ────────────────────────────────────────────────────────────

function EventDrawer({
  event,
  role,
  onClose,
}: {
  event: CalendarEventRecord
  role?: string | null
  onClose: () => void
}) {
  const programHref = getCalendarProgramHref(event, role)
  const showProgramBtn =
    programHref &&
    (isProgramCalendarEvent(event) ||
      event.type === 'course' ||
      event.type === 'workshop' ||
      event.type === 'program' ||
      event.type === 'learning_path')
  const instructorName = event.instructor?.name ?? event.owner?.name

  return (
    <motion.div
      key="drawer"
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      className="fixed inset-y-0 left-0 z-modal-content flex w-full max-w-md flex-col border-r border-slate-100 bg-white shadow-2xl sm:max-w-sm md:max-w-md"
      dir="rtl"
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="max-w-[85%] truncate text-base font-black text-[#0C2A4B]">{event.title}</h2>
        <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {event.image_url && (
          <img
            src={event.image_url}
            alt=""
            className="h-40 w-full rounded-2xl object-cover ring-1 ring-slate-100"
          />
        )}

        <div className="flex flex-wrap gap-2">
          <span className="rounded-xl bg-[#0077B6]/10 px-3 py-1 text-xs font-black text-[#0077B6]">
            {typeLabel(event.type)}
          </span>
          {event.status && (
            <span className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              {translateEventStatus(event.status)}
            </span>
          )}
        </div>

        {event.subtitle && (
          <p className="text-sm font-bold text-slate-500">{event.subtitle}</p>
        )}

        <div className="space-y-2 rounded-2xl bg-slate-50 p-4">
          <p className="flex items-start gap-3 text-sm text-slate-700">
            <CalendarClock size={16} className="mt-0.5 shrink-0 text-[#0077B6]" />
            <span className="font-bold">{formatCalendarDate(event.start_at)}</span>
          </p>
          <p className="flex items-start gap-3 text-sm text-slate-600">
            <Clock size={16} className="mt-0.5 shrink-0 text-[#F28C00]" />
            <span>
              {formatCalendarTime(event.start_at)}
              {event.end_at ? ` — ${formatCalendarTime(event.end_at)}` : ''}
            </span>
          </p>
        </div>

        {event.description && (
          <p className="text-sm leading-7 text-slate-600">{event.description}</p>
        )}

        {event.location && (
          <p className="flex items-center gap-3 text-sm text-slate-600">
            <MapPin size={16} className="shrink-0 text-[#F28C00]" />
            {event.location}
          </p>
        )}

        {event.course && (
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
            <BookOpen size={16} className="text-[#0077B6]" />
            <div>
              <p className="text-[11px] text-slate-400">الدورة</p>
              <p className="text-sm font-black text-[#0C2A4B]">{event.course.title}</p>
            </div>
          </div>
        )}

        {event.department && (
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
            <Users size={16} className="text-[#F28C00]" />
            <div>
              <p className="text-[11px] text-slate-400">الإدارة</p>
              <p className="text-sm font-black text-[#0C2A4B]">{event.department.name_ar}</p>
            </div>
          </div>
        )}

        {instructorName && (
          <p className="text-xs text-slate-400">
            المدرب: <span className="font-bold text-slate-600">{instructorName}</span>
          </p>
        )}

        {event.owner && !instructorName && (
          <p className="text-xs text-slate-400">
            بواسطة: <span className="font-bold text-slate-600">{event.owner.name}</span>
          </p>
        )}

        {showProgramBtn && programHref && (
          <Link
            to={programHref}
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#0C2A4B] px-4 py-3 text-sm font-black text-white shadow-md transition hover:opacity-90"
          >
            <BookOpen size={16} />
            عرض البرنامج
            <ExternalLink size={14} />
          </Link>
        )}

        {event.meeting_link && (
          <div className="space-y-2">
            <MeetingLinkAction event={event} />
            {event.meeting_link && (
              <p className="truncate text-[11px] text-slate-400" dir="ltr">
                {event.meeting_link}
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── Create event modal ───────────────────────────────────────────────────────

const EMPTY_FORM: CalendarEventInput = {
  title: '',
  description: '',
  kind: 'meeting',
  start_at: '',
  end_at: '',
  location: '',
  meeting_url: '',
  visibility: 'department',
}

function CreateEventModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<CalendarEventInput>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = (k: keyof CalendarEventInput, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErr('')
    try {
      await createCalendarEvent(form)
      onCreated()
      onClose()
    } catch {
      setErr('فشل الحفظ. تحقق من البيانات وأعد المحاولة.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        className="w-full max-w-lg rounded-3xl bg-white shadow-2xl"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="font-black text-[#0C2A4B]">إنشاء حدث</h2>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={(e) => void submit(e)} className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-xs font-black text-slate-600">العنوان *</label>
            <input
              required
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#0077B6] focus:outline-none"
              placeholder="عنوان الحدث"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-black text-slate-600">النوع *</label>
            <select
              value={form.kind}
              onChange={(e) => set('kind', e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#0077B6] focus:outline-none"
            >
              <option value="meeting">اجتماع</option>
              <option value="event">حدث</option>
              <option value="task">مهمة</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-black text-slate-600">البداية *</label>
              <input
                required
                type="datetime-local"
                value={form.start_at}
                onChange={(e) => set('start_at', e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-[#0077B6] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-black text-slate-600">النهاية</label>
              <input
                type="datetime-local"
                value={form.end_at ?? ''}
                onChange={(e) => set('end_at', e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-[#0077B6] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-black text-slate-600">رابط الاجتماع</label>
            <input
              type="url"
              value={form.meeting_url ?? ''}
              onChange={(e) => set('meeting_url', e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#0077B6] focus:outline-none"
              placeholder="https://meet.google.com/..."
              dir="ltr"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-black text-slate-600">الظهور *</label>
            <select
              value={form.visibility}
              onChange={(e) => set('visibility', e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#0077B6] focus:outline-none"
            >
              <option value="department">الإدارة فقط</option>
              <option value="all">الجميع</option>
              <option value="private">خاص</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-black text-slate-600">الوصف</label>
            <textarea
              value={form.description ?? ''}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#0077B6] focus:outline-none"
            />
          </div>

          {err && <p className="text-sm font-bold text-red-600">{err}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#0077B6] py-3 text-sm font-black text-white shadow-md hover:opacity-90 disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              حفظ الحدث
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              إلغاء
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ─── Delete confirm ───────────────────────────────────────────────────────────

function DeleteConfirm({
  event,
  onConfirm,
  onCancel,
}: {
  event: CalendarEventRecord
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-2 text-base font-black text-[#0C2A4B]">حذف الحدث؟</p>
        <p className="mb-6 text-sm text-slate-500">سيُحذف «{event.title}» نهائياً ولا يمكن التراجع.</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-2xl bg-red-500 py-3 text-sm font-black text-white hover:bg-red-600"
          >
            حذف
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            إلغاء
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { user } = useAuth()
  const [filter, setFilter] = useState<CalendarFilterKind>('all')
  const [events, setEvents] = useState<CalendarEventRecord[]>([])
  const [fetchOk, setFetchOk] = useState(true)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<CalendarEventRecord | null>(null)
  const [toDelete, setToDelete] = useState<CalendarEventRecord | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [icsLoading, setIcsLoading] = useState(false)
  const [view, setView] = useState<CalendarViewMode>(() => readStoredCalendarView())
  const [focusDate, setFocusDate] = useState(() => new Date())

  const changeView = (mode: CalendarViewMode) => {
    setView(mode)
    persistCalendarView(mode)
  }

  /** Imperative refresh from event handlers (refresh buttons, delete, create) — outside
   *  any effect, so the synchronous flip to the loading state is fine here. */
  const load = useCallback(async () => {
    setLoading(true)
    const { events: list, ok } = await fetchCalendarEvents(filter === 'all' ? undefined : filter)
    setFetchOk(ok)
    setEvents(list)
    setLoading(false)
  }, [filter])

  // Re-arm the loading state during render when the filter changes (react.dev "adjusting
  // state when a prop changes"), so the effect below stays pure I/O.
  const [seenFilter, setSeenFilter] = useState(filter)
  if (seenFilter !== filter) {
    setSeenFilter(filter)
    setLoading(true)
  }

  useEffect(() => {
    let alive = true
    void (async () => {
      const { events: list, ok } = await fetchCalendarEvents(filter === 'all' ? undefined : filter)
      if (!alive) return
      setFetchOk(ok)
      setEvents(list)
      setLoading(false)
    })()
    return () => { alive = false }
  }, [filter])

  const handleSelectDay = (date: Date) => {
    setFocusDate(date)
    changeView('day')
  }

  const handleDeleteConfirm = async () => {
    if (!toDelete) return
    await deleteCalendarEvent(toDelete.id)
    setToDelete(null)
    void load()
  }

  const handleIcs = async () => {
    setIcsLoading(true)
    try {
      const blob = await fetchCalendarIcsBlob(filter === 'all' ? undefined : filter)
      downloadBlob(blob, 'emc-calendar.ics')
    } finally {
      setIcsLoading(false)
    }
  }

  // Body scroll lock when event drawer is open
  useEffect(() => {
    if (!selected) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [selected])

  // Escape key closes event drawer
  useEffect(() => {
    if (!selected) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [selected])

  const showCreateBtn = canCreateEvent(user?.role)
  const activeFilterLabel = filterTypeLabel(filter)

  return (
    <div className={`mx-auto ${view === 'list' ? 'max-w-5xl' : 'max-w-7xl'}`} dir="rtl">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-bl from-[#0C2A4B] via-[#1c4567] to-[#162334] px-6 py-8 text-white sm:px-8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -start-16 top-0 h-40 w-40 rounded-full bg-[#0077B6]/20 blur-3xl"
        />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-[#F28C00]">Calendar</p>
            <h1 className="text-3xl font-black">التقويم</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-7 text-white/70">
              الجلسات والورش والاجتماعات والمهام — بيانات حية من حسابك.
            </p>
            {!loading && fetchOk && (
              <p className="mt-3 text-sm font-bold text-[#F28C00]">
                {String(events.length)} حدث · {activeFilterLabel}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-black text-white ring-1 ring-white/15 transition hover:bg-white/15 disabled:opacity-60"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              تحديث
            </button>
            {showCreateBtn && (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#F28C00] px-4 py-2 text-xs font-black text-white shadow-md hover:opacity-90"
              >
                <Plus size={14} />
                حدث جديد
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleIcs()}
              disabled={icsLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-black text-[#0C2A4B] shadow-sm transition hover:shadow-md disabled:opacity-60"
            >
              {icsLoading ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
              تحميل ICS
            </button>
          </div>
        </div>
      </motion.section>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={[
              'rounded-xl px-4 py-2 text-xs font-black transition',
              filter === f.id
                ? 'bg-[#0077B6] text-white shadow-md'
                : 'bg-[#F6F8FB] text-slate-600 hover:text-[#0C2A4B]',
            ].join(' ')}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* View switcher */}
      <div className="mt-4">
        <CalendarViewSwitcher value={view} onChange={changeView} />
      </div>

      {/* Calendar content */}
      <div className="mt-8">
        {loading ? (
          <LoadingSkeletonStack rows={5} />
        ) : !fetchOk ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-red-100 bg-red-50/50 py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertCircle size={28} className="text-red-500" />
            </div>
            <p className="text-base font-black text-[#0C2A4B]">تعذّر تحميل التقويم</p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              تحقق من اتصالك وحاول مرة أخرى.
            </p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0077B6] px-5 py-2.5 text-sm font-black text-white"
            >
              <RefreshCw size={14} />
              إعادة المحاولة
            </button>
          </div>
        ) : view === 'list' ? (
          <CalendarListView
            events={events}
            emptyMsg={getRoleEmptyMsg(user?.role)}
            onSelect={setSelected}
            onEdit={setSelected}
            onDelete={setToDelete}
          />
        ) : view === 'month' ? (
          <CalendarMonthView
            anchor={focusDate}
            events={events}
            onPrev={() => setFocusDate((d) => addMonths(d, -1))}
            onNext={() => setFocusDate((d) => addMonths(d, 1))}
            onToday={() => setFocusDate(new Date())}
            onSelectEvent={setSelected}
            onSelectDay={handleSelectDay}
          />
        ) : view === 'week' ? (
          <CalendarWeekView
            anchor={focusDate}
            events={events}
            onPrev={() => setFocusDate((d) => addWeeks(d, -1))}
            onNext={() => setFocusDate((d) => addWeeks(d, 1))}
            onToday={() => setFocusDate(new Date())}
            onSelectEvent={setSelected}
          />
        ) : (
          <CalendarDayView
            anchor={focusDate}
            events={events}
            onPrev={() => setFocusDate((d) => addDays(d, -1))}
            onNext={() => setFocusDate((d) => addDays(d, 1))}
            onToday={() => setFocusDate(new Date())}
            onSelectEvent={setSelected}
          />
        )}
      </div>

      {createPortal(
        <AnimatePresence>
          {selected && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-modal-overlay bg-black/30"
                onClick={() => setSelected(null)}
              />
              <EventDrawer event={selected} role={user?.role} onClose={() => setSelected(null)} />
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}

      <AnimatePresence>
        {showCreate && (
          <CreateEventModal onClose={() => setShowCreate(false)} onCreated={() => void load()} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toDelete && (
          <DeleteConfirm
            event={toDelete}
            onConfirm={() => void handleDeleteConfirm()}
            onCancel={() => setToDelete(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
