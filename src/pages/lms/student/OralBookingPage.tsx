import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCw,
  User,
} from 'lucide-react'
import {
  bookOralSlot,
  fetchOralSlots,
  fetchPlacementStatus,
  type OralSlot,
} from '@/api/placementApi'
import { notifyNotificationsRefresh } from '@/api/notificationsApi'
import toast from '@/lib/toast'
import { BackButton } from '@/components/shared/BackButton'
import { formatStudentDateWithWeekday, formatStudentDateShort } from '@/components/lms/lmsFormatters'

/* ── Helpers ────────────────────────────────────────────────────────────────── */


function groupByDate(slots: OralSlot[]): Map<string, OralSlot[]> {
  const map = new Map<string, OralSlot[]>()
  for (const s of slots) {
    const arr = map.get(s.date) ?? []
    arr.push(s)
    map.set(s.date, arr)
  }
  return map
}

function groupByInstructor(slots: OralSlot[]): Array<{ name: string; slots: OralSlot[] }> {
  const map = new Map<string, OralSlot[]>()
  for (const s of slots) {
    const key = s.instructor_name || 'غير محدد'
    map.set(key, [...(map.get(key) ?? []), s])
  }
  return [...map.entries()].map(([name, slots]) => ({ name, slots }))
}


/* ── Page ───────────────────────────────────────────────────────────────────── */

export default function OralBookingPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()

  const [slots, setSlots]           = useState<OralSlot[]>([])
  const [loading, setLoading]       = useState(true)
  const [slotsError, setSlotsError] = useState(false)
  const [attemptId, setAttemptId]   = useState<number | null>(null)
  const [selected, setSelected]     = useState<OralSlot | null>(null)
  const [booking, setBooking]       = useState(false)
  const [done, setDone]             = useState(false)
  const [dates, setDates]           = useState<string[]>([])
  const [dateIdx, setDateIdx]       = useState(0)
  const [retryCount, setRetryCount] = useState(0)

  // Re-arm the loading state during render when the query changes (react.dev
  // "adjusting state when a prop changes") — the initial state already carries the
  // first pass's values, so the effect below never has to touch state synchronously.
  const [seenQuery, setSeenQuery] = useState({ courseId, retryCount })
  if (seenQuery.courseId !== courseId || seenQuery.retryCount !== retryCount) {
    setSeenQuery({ courseId, retryCount })
    if (courseId) {
      setLoading(true)
      setSlotsError(false)
    }
  }

  useEffect(() => {
    if (!courseId) return

    void (async () => {
      try {
        const { status, attempt } = await fetchPlacementStatus(courseId)
        if (
          status === 'oral_booked' ||
          status === 'oral_completed' ||
          status === 'completed'
        ) {
          void navigate(`/dashboard/student/courses/${courseId}/placement-result`, { replace: true })
          return
        }
        if (attempt?.id) setAttemptId(attempt.id)
      } catch { /* still try to load slots */ }

      try {
        const data = await fetchOralSlots(courseId)
        setSlots(data)
        setDates([...new Set(data.map((s) => s.date))].sort())
      } catch {
        setSlotsError(true)
      } finally {
        setLoading(false)
      }
    })()
  }, [courseId, navigate, retryCount])

  async function handleBook() {
    if (!courseId || !selected) return
    setBooking(true)
    try {
      await bookOralSlot(courseId, selected.id, attemptId)
      setDone(true)
      toast.success('تم حجز المقابلة الشفوية بنجاح')
      notifyNotificationsRefresh()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'تعذّر حجز الموعد. حاول مجدداً.')
    } finally {
      setBooking(false)
    }
  }

  /* ── Success ─────────────────────────────────────────────────────────── */
  if (done) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-xl"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
            <Check className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-[20px] font-black text-deepBlue">تم حجز المقابلة بنجاح</h2>
          {selected && (
            <p className="mt-2 text-[13px] font-semibold text-deepBlue/55">
              {formatStudentDateWithWeekday(selected.date)} — {selected.time}
            </p>
          )}
          {selected?.instructor_name && (
            <p className="mt-1 text-[12px] font-semibold text-deepBlue/45">
              المدرب: {selected.instructor_name}
            </p>
          )}
          <p className="mt-3 text-[12px] font-semibold leading-relaxed text-deepBlue/45">
            ستُفعَّل دورتك بعد إتمام المقابلة واعتماد مستواك من المدرب.
          </p>
          <Link
            to={`/dashboard/student/courses/${courseId}/placement-result`}
            className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-customBlue px-6 py-3 text-[13px] font-black text-white transition hover:brightness-105"
          >
            عرض النتيجة
          </Link>
        </motion.div>
      </div>
    )
  }

  const slotsByDate    = groupByDate(slots)
  const currentDate    = dates[dateIdx] ?? ''
  const currentSlots   = slotsByDate.get(currentDate) ?? []
  const byInstructor   = groupByInstructor(currentSlots)
  const availableCount = currentSlots.filter((s) => s.is_available).length

  return (
    <div className="mx-auto max-w-xl space-y-5 px-4 py-10" dir="rtl">

      {/* ── Back ────────────────────────────────────────────────────── */}
      <BackButton
        to={`/dashboard/student/courses/${courseId}/placement-result`}
        label="العودة للنتيجة"
      />

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-[22px] font-black text-deepBlue">حجز المقابلة الشفوية</h1>
        <p className="mt-1 text-[13px] font-semibold text-deepBlue/50">
          اختر موعداً مناسباً مع المدرب لإكمال تقييم مستواك
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : slotsError ? (
        /* ── Error ─────────────────────────────────────────────────── */
        <div className="rounded-3xl border border-red-100 bg-red-50 py-16 text-center">
          <Calendar className="mx-auto h-10 w-10 text-red-300" />
          <p className="mt-4 font-black text-deepBlue">تعذّر تحميل المواعيد المتاحة</p>
          <p className="mt-1 text-[13px] font-semibold text-deepBlue/50">
            تحقق من اتصالك أو تواصل مع الإدارة.
          </p>
          <button
            type="button"
            onClick={() => setRetryCount((n) => n + 1)}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-customBlue px-5 py-2.5 text-[12px] font-black text-white transition hover:brightness-105"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            إعادة تحميل المواعيد
          </button>
        </div>
      ) : slots.length === 0 ? (
        /* ── Empty ──────────────────────────────────────────────────── */
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-20 text-center">
          <Calendar className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-4 font-black text-deepBlue">لا توجد مواعيد متاحة حالياً</p>
          <p className="mt-1 text-[13px] font-semibold text-deepBlue/50">
            يرجى المحاولة لاحقًا أو التواصل مع الإدارة.
          </p>
          <button
            type="button"
            onClick={() => setRetryCount((n) => n + 1)}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-[12px] font-black text-deepBlue/65 transition hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            إعادة تحميل
          </button>
        </div>
      ) : (
        <>
          {/* ── Date pill tabs ─────────────────────────────────────── */}
          {dates.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {dates.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => { setDateIdx(i); setSelected(null) }}
                  className={`rounded-xl px-3 py-1.5 text-[11px] font-black transition ${
                    i === dateIdx
                      ? 'bg-deepBlue text-white shadow-sm'
                      : 'border border-slate-200 bg-white text-deepBlue/55 hover:text-deepBlue'
                  }`}
                >
                  {formatStudentDateShort(d)}
                </button>
              ))}
            </div>
          )}

          {/* ── Date navigator ─────────────────────────────────────── */}
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <button
              type="button"
              onClick={() => { setDateIdx((i) => Math.max(0, i - 1)); setSelected(null) }}
              disabled={dateIdx === 0}
              className="rounded-xl p-1.5 text-deepBlue/40 transition hover:bg-slate-100 hover:text-deepBlue disabled:opacity-25"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="flex-1 text-center">
              <p className="text-[14px] font-black text-deepBlue">{formatStudentDateWithWeekday(currentDate)}</p>
              <p className="text-[11px] font-semibold text-deepBlue/40">
                {availableCount} موعد متاح
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setDateIdx((i) => Math.min(dates.length - 1, i + 1)); setSelected(null) }}
              disabled={dateIdx === dates.length - 1}
              className="rounded-xl p-1.5 text-deepBlue/40 transition hover:bg-slate-100 hover:text-deepBlue disabled:opacity-25"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </div>

          {/* ── Slot chips ──────────────────────────────────────────── */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            {byInstructor.length === 0 ? (
              <p className="py-4 text-center text-[13px] font-semibold text-deepBlue/40">
                لا توجد مواعيد لهذا اليوم
              </p>
            ) : (
              <div className="space-y-5">
                {byInstructor.map(({ name, slots: instructorSlots }) => (
                  <div key={name}>
                    <div className="mb-3 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-deepBlue/35" />
                      <span className="text-[11px] font-black tracking-wide text-deepBlue/50">{name}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {instructorSlots.map((slot) => {
                        const isSelected = selected?.id === slot.id
                        const available  = slot.is_available
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => available && setSelected(isSelected ? null : slot)}
                            disabled={!available}
                            title={!available ? 'هذا الموعد محجوز' : undefined}
                            className={[
                              'relative rounded-2xl px-4 py-2.5 font-mono text-[13px] font-black tabular-nums transition',
                              !available
                                ? 'cursor-not-allowed bg-slate-100 text-slate-400 line-through opacity-55'
                                : isSelected
                                  ? 'bg-deepBlue text-white shadow-md ring-2 ring-deepBlue/20'
                                  : 'border border-slate-200 bg-white text-deepBlue hover:border-customBlue/40 hover:bg-customBlue/[0.05]',
                            ].join(' ')}
                          >
                            {slot.time}
                            <span className="mr-1.5 font-sans text-[10px] opacity-50">
                              {slot.duration_minutes}د
                            </span>
                            {isSelected && (
                              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 shadow">
                                <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Selected summary + confirm ───────────────────────────── */}
          <AnimatePresence>
            {selected && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="rounded-3xl border border-customBlue/20 bg-customBlue/[0.04] p-5"
              >
                <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-deepBlue/35">
                  الموعد المختار
                </p>
                <div className="mb-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-deepBlue/70">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-customBlue" />
                    <span className="font-mono font-black tabular-nums text-deepBlue">{selected.time}</span>
                    <span className="text-deepBlue/35">·</span>
                    <span>{formatStudentDateWithWeekday(selected.date)}</span>
                  </div>
                  {selected.instructor_name && (
                    <div className="flex items-center gap-2 text-[12px] font-semibold text-deepBlue/60">
                      <User className="h-3.5 w-3.5 shrink-0 text-customBlue" />
                      {selected.instructor_name}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void handleBook()}
                  disabled={booking}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-customBlue to-deepBlue px-6 py-3.5 text-[14px] font-black text-white shadow-md shadow-deepBlue/20 transition hover:brightness-105 disabled:opacity-50"
                >
                  {booking ? 'جاري الحجز...' : 'تأكيد حجز المقابلة'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  )
}
