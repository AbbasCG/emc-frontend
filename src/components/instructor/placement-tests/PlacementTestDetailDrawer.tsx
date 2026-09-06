import { createPortal } from 'react-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  LayoutDashboard,
  Mic,
  UserPlus,
  X,
} from 'lucide-react'
import { Link } from 'react-router'
import type { InstructorPlacementTestRow } from '@/api/placementApi'
import { PlacementAnswerReviewBody } from '@/components/instructor/PlacementAnswerReviewBody'
import type { ReviewSubject } from '@/components/instructor/PlacementAnswerReviewModal'
import { CEFR_MAP } from '@/components/instructor/instructorStudentFormats'
import { formatAmsterdamDate, formatAmsterdamTime24 } from '@/utils/amsterdamTime'
import { STATUS_AR, overallPct, writtenPct } from './constants'

export type DetailDrawerTab = 'overview' | 'written' | 'oral' | 'timeline' | 'assignment'

type Props = {
  row: InstructorPlacementTestRow | null
  initialTab?: DetailDrawerTab
  onClose: () => void
}

const TABS: { id: DetailDrawerTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview',   label: 'نظرة عامة',       icon: LayoutDashboard },
  { id: 'written',    label: 'الاختبار الكتابي', icon: ClipboardList },
  { id: 'oral',       label: 'التقييم الشفهي',   icon: Mic },
  { id: 'timeline',   label: 'الخط الزمني',      icon: Clock },
  { id: 'assignment', label: 'التوزيع',          icon: UserPlus },
]

/** Centered, professional student-detail modal — replaces the old narrow
 *  right-side drawer for this flow. Portaled to document.body so it always
 *  stacks above the page regardless of ancestor stacking contexts. */
export function PlacementTestDetailDrawer({ row, initialTab = 'overview', onClose }: Props) {
  const [tab, setTab] = useState<DetailDrawerTab>(initialTab)
  const dialogRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<Element | null>(null)
  const reduceMotion = useReducedMotion()

  // Re-select the requested tab during render whenever the drawer is pointed at a
  // different student or opened on a different tab (react.dev "adjusting state when a
  // prop changes") — the initial `useState(initialTab)` already covers mount.
  const studentId = row?.student_id
  const [seenTabKey, setSeenTabKey] = useState({ studentId, initialTab })
  if (seenTabKey.studentId !== studentId || seenTabKey.initialTab !== initialTab) {
    setSeenTabKey({ studentId, initialTab })
    if (row) setTab(initialTab)
  }

  // Open/close side effects: remember the triggering element, lock body
  // scroll, trap focus, restore focus to the card on close.
  useEffect(() => {
    if (!row) return
    triggerRef.current = document.activeElement
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab' || !dialogRef.current) return
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
      if (triggerRef.current instanceof HTMLElement) triggerRef.current.focus()
    }
  }, [row, onClose])

  const reviewSubject: ReviewSubject | null = useMemo(() => {
    if (!row || !row.attempt_id) return null
    return {
      attemptId: row.attempt_id,
      name: row.student_name,
      email: row.student_email,
      avatarUrl: row.avatar_url,
      score: row.written_score,
      totalQuestions: row.total_questions ?? 70,
      level: row.written_level,
      completedAt: row.submitted_at,
    }
  }, [row])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {row && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-4" dir="rtl">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={`تفاصيل ${row.student_name}`}
            tabIndex={-1}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            className="relative flex h-full w-full flex-col overflow-hidden bg-white shadow-[0_32px_80px_-20px_rgba(15,23,42,0.45)] sm:h-auto sm:max-h-[88vh] sm:w-[92vw] sm:max-w-[1000px] sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fixed header */}
            <div className="shrink-0 border-b border-slate-100 bg-gradient-to-l from-[#0C2A4B] to-[#1a2d44] px-5 py-4 text-white sm:px-6 sm:py-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  {row.avatar_url ? (
                    <img src={row.avatar_url} alt="" className="h-11 w-11 shrink-0 rounded-2xl object-cover" />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-[16px] font-black">
                      {row.student_name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-black leading-tight">{row.student_name}</p>
                    <p className="truncate text-[11px] font-semibold text-white/55" dir="ltr">{row.student_email}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-lg bg-white/15 px-2 py-0.5 text-[10px] font-black">{row.course_title}</span>
                      <span className="rounded-lg bg-white/15 px-2 py-0.5 text-[10px] font-black">{STATUS_AR[row.status] ?? row.status}</span>
                    </div>
                    {/* Three separate badges never conflate estimated vs. final vs. current class. */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <HeaderBadge label="المستوى التقديري" value={row.written_level} tone="neutral" />
                      <HeaderBadge label="النتيجة النهائية" value={row.final_level} tone="final" fallback="لم يتم اعتماد المستوى النهائي بعد" />
                      <HeaderBadge label="الصف الحالي" value={row.is_assigned ? row.assigned_class : null} tone="assigned" fallback="بانتظار التوزيع" />
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="إغلاق"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Fixed tab bar equal-width grid, no horizontal scroll ever */}
            <div role="tablist" className="grid shrink-0 grid-cols-5 gap-1 border-b border-slate-100 p-2">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={`flex flex-col items-center gap-1 rounded-xl px-1.5 py-2 text-[10px] font-black transition sm:flex-row sm:justify-center sm:gap-1.5 sm:text-[11px] ${
                    tab === id ? 'bg-[#0C2A4B] text-white' : 'text-deepBlue/55 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>

            {/* Single scrollable body */}
            <div className="flex-1 overflow-y-auto">
              {tab === 'overview' && <OverviewTab row={row} />}
              {tab === 'written' && (
                reviewSubject ? (
                  <div className="flex min-h-[400px] flex-col">
                    <PlacementAnswerReviewBody subject={reviewSubject} showOverview />
                  </div>
                ) : (
                  <EmptyTab message="لا يوجد اختبار كتابي متاح." />
                )
              )}
              {tab === 'oral' && <OralTab row={row} />}
              {tab === 'timeline' && <TimelineTab row={row} />}
              {tab === 'assignment' && <AssignmentTab row={row} />}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function HeaderBadge({
  label, value, tone, fallback,
}: {
  label: string
  value: string | null
  tone: 'neutral' | 'final' | 'assigned'
  fallback?: string
}) {
  const toneCls = value
    ? tone === 'final' ? 'bg-[#F28C00]/25 text-[#FFD9AE]'
      : tone === 'assigned' ? 'bg-emerald-500/25 text-emerald-200'
      : 'bg-white/15 text-white'
    : 'bg-white/10 text-white/45'
  return (
    <span className={`flex flex-col rounded-lg px-2 py-1 text-[9px] font-bold leading-tight ${toneCls}`}>
      <span className="opacity-80">{label}</span>
      <span className="text-[11px] font-black">{value ?? fallback ?? '—'}</span>
    </span>
  )
}

function OverviewTab({ row }: { row: InstructorPlacementTestRow }) {
  const wPct = writtenPct(row)
  const overall = overallPct(row)
  const rec = row.recommended_class ?? (row.final_level ? `${row.final_level}-03` : null)
  const levelBadge = row.final_level ? CEFR_MAP[row.final_level] : (row.written_level ? CEFR_MAP[row.written_level] : null)

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="grid gap-2 sm:grid-cols-2">
        <StatBox label="المستوى الحالي" value={levelBadge?.cefr ?? '—'} />
        <StatBox label="المستوى الموصى به" value={row.final_level ?? row.written_level ?? '—'} />
        <StatBox label="الصف المعيّن" value={row.assigned_class ?? '—'} />
        <StatBox label="الصف المقترح" value={rec ?? '—'} />
        <StatBox label="الكتابي" value={wPct != null ? `${row.written_score}/${row.total_questions} (${wPct}%)` : '—'} />
        <StatBox label="الشفوي" value={row.oral_score != null ? `${row.oral_score}/100` : '—'} />
        <StatBox label="الإجمالي" value={overall != null ? `${overall}%` : '—'} />
        <StatBox label="الحالة" value={STATUS_AR[row.status] ?? row.status} />
      </div>
      {overall != null && (
        <div>
          <p className="mb-1 text-[10px] font-black text-deepBlue/40">التقدم</p>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-[#0077B6]" style={{ width: `${overall}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}

// Real rubric categories — matches OralAssessmentBooking's 6 stored score
// columns / PlacementProgressService::oralAssessmentFullShape()'s rubric
// keys exactly. Previously this hardcoded 5 different, partly-invented
// category names ("speaking"/"listening" have no backend column at all),
// which is why the boxes always rendered empty.
const ORAL_CATEGORIES: { key: string; label: string }[] = [
  { key: 'pronunciation', label: 'النطق' },
  { key: 'grammar',       label: 'القواعد' },
  { key: 'vocabulary',    label: 'المفردات' },
  { key: 'fluency',       label: 'الطلاقة' },
  { key: 'comprehension', label: 'الاستيعاب' },
  { key: 'confidence',    label: 'الثقة بالنفس' },
]

function OralTab({ row }: { row: InstructorPlacementTestRow }) {
  const rubric = row.oral_rubric ?? []
  const hasRubric = rubric.some((r) => r.score != null)
  const oa = row.oral_assessment
  const evalDate = oa?.system.evaluated_at ? formatAmsterdamDate(oa.system.evaluated_at) : null
  const evalTime = oa?.system.evaluated_at ? formatAmsterdamTime24(oa.system.evaluated_at) : null

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-black text-violet-800/70">الدرجة الشفوية الإجمالية</p>
          {row.oral_score != null && (
            <span className="rounded-lg bg-violet-100 px-2 py-0.5 text-[9px] font-black text-violet-700">نتيجة محفوظة</span>
          )}
        </div>
        <p className="mt-1 font-mono text-2xl font-black text-deepBlue">
          {row.oral_score ?? '—'}<span className="text-sm font-semibold text-deepBlue/40">/100</span>
        </p>
        {row.final_level && (
          <p className="mt-2 text-[12px] font-bold text-deepBlue">المستوى النهائي: {row.final_level}</p>
        )}
      </div>

      {row.oral_score != null && (
        <div className="grid gap-2 sm:grid-cols-2">
          <StatBox label="المقيّم" value={oa?.evaluator.name ?? '—'} />
          <StatBox label="طريقة الاحتساب" value={hasRubric ? 'مجموع معايير التقييم' : 'درجة إجمالية مدخلة يدويًا'} />
          <StatBox label="تاريخ التقييم" value={evalDate ?? '—'} />
          <StatBox label="الوقت" value={evalTime ?? '—'} />
        </div>
      )}

      {row.oral_score != null && (
        hasRubric ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {ORAL_CATEGORIES.map(({ label, key }) => {
              const item = rubric.find((r) => r.key === key)
              const pct = item?.score != null && item.max ? Math.round((item.score / item.max) * 100) : null
              return (
                <div key={key} className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-deepBlue/45">{label}</p>
                    <p className="font-mono text-[13px] font-black text-deepBlue">
                      {item?.score ?? '—'}{item?.max ? `/${item.max}` : ''}
                    </p>
                  </div>
                  {pct != null && (
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-violet-400" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
            <p className="text-[12px] font-bold text-deepBlue/40">لم يتم تسجيل تفصيل الدرجات لهذا التقييم</p>
            <Link
              to={`/dashboard/instructor/courses/${row.course_id}/placement-students`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[11px] font-black text-[#0077B6] shadow-sm ring-1 ring-slate-200 transition hover:bg-[#0077B6]/5"
            >
              استكمال تفاصيل الدرجات
            </Link>
          </div>
        )
      )}

      {(row.instructor_notes || oa?.notes) && (
        <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
          {row.instructor_notes && (
            <div>
              <p className="text-[10px] font-black text-deepBlue/40">ملاحظات المعلم</p>
              <p className="mt-1 text-[12px] font-semibold leading-relaxed text-deepBlue/70">{row.instructor_notes}</p>
            </div>
          )}
          {oa?.notes.strengths && (
            <div>
              <p className="text-[10px] font-black text-emerald-600/70">نقاط القوة</p>
              <p className="mt-1 text-[12px] font-semibold leading-relaxed text-deepBlue/70">{oa.notes.strengths}</p>
            </div>
          )}
          {oa?.notes.weaknesses && (
            <div>
              <p className="text-[10px] font-black text-amber-600/70">نقاط تحتاج تحسين</p>
              <p className="mt-1 text-[12px] font-semibold leading-relaxed text-deepBlue/70">{oa.notes.weaknesses}</p>
            </div>
          )}
        </div>
      )}
      {!row.oral_score && (
        <p className="text-center text-[12px] font-semibold text-deepBlue/40">لم يُسجّل تقييم شفوي بعد.</p>
      )}
      <Link
        to={`/dashboard/instructor/courses/${row.course_id}/placement-students`}
        className="flex items-center justify-center gap-2 rounded-xl bg-[#0077B6] px-4 py-2.5 text-[12px] font-black text-white"
      >
        <Mic className="h-4 w-4" />
        فتح لوحة التقييم الكاملة
      </Link>
    </div>
  )
}

function TimelineTab({ row }: { row: InstructorPlacementTestRow }) {
  const events = buildEvents(row)
  return (
    <div className="p-4 sm:p-6">
      {/* Line sits at right-[7px] (dot center), text starts at pr-7 the dot
          (14px) never overlaps the label regardless of content length. */}
      <ol className="relative border-r-2 border-slate-100 pr-7">
        {events.map((ev) => {
          const date = ev.date ? formatAmsterdamDate(ev.date) : null
          const time = ev.date ? formatAmsterdamTime24(ev.date) : null
          return (
            <li key={ev.label} className="relative pb-6 last:pb-0">
              <span className={`absolute -right-[7px] top-0.5 h-3.5 w-3.5 rounded-full ring-4 ring-white ${ev.done ? 'bg-emerald-500' : 'bg-slate-200'}`} />
              <p className={`text-[12px] font-black leading-snug ${ev.done ? 'text-deepBlue' : 'text-deepBlue/40'}`}>{ev.label}</p>
              {date ? (
                <p className="mt-1.5 text-[10.5px] leading-relaxed">
                  <span className="font-medium text-deepBlue/45">{date}</span>
                  {time && (
                    <>
                      <span className="mx-1 text-deepBlue/25">—</span>
                      <span className="font-black tabular-nums text-deepBlue/80" dir="ltr">{time}</span>
                    </>
                  )}
                </p>
              ) : ev.done ? (
                <p className="mt-1.5 text-[10.5px] font-medium text-deepBlue/35">لم يتم تسجيل الوقت</p>
              ) : null}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

const REASON_LABELS: Record<string, string> = {
  level_match:        'مستوى الطالب النهائي يطابق مستوى الصف',
  same_course:        'الصف تابع لنفس الدورة',
  capacity_available: 'توجد مقاعد متاحة',
  lowest_occupancy:   'تم اختيار الصف الأقل إشغالًا',
}

function AssignmentTab({ row }: { row: InstructorPlacementTestRow }) {
  const assignedDate = row.assigned_at ? formatAmsterdamDate(row.assigned_at) : null
  const assignedTime = row.assigned_at ? formatAmsterdamTime24(row.assigned_at) : null

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="grid gap-2 sm:grid-cols-2">
        <StatBox label="الصف الحالي" value={row.is_assigned ? (row.assigned_class ?? '—') : 'لم يتم إسناد الطالب إلى صف بعد'} />
        <StatBox label="الصف المقترح" value={row.recommended_class ?? 'لم يتم اقتراح صف بعد'} />
        <StatBox
          label="أُسند بواسطة"
          value={!row.is_assigned ? '—' : row.assignment_method === 'automatic' ? 'النظام تلقائيًا' : (row.assigned_by ?? 'لم يتم حفظ منفذ العملية')}
        />
        <StatBox
          label="تاريخ الإسناد"
          value={assignedDate ? `${assignedDate}${assignedTime ? ` — ${assignedTime}` : ''}` : '—'}
        />
        <StatBox label="طريقة التوزيع" value={row.assignment_method === 'automatic' ? 'تلقائي' : row.assignment_method === 'manual' ? 'يدوي' : '—'} />
      </div>

      {row.is_assigned && row.assignment_method === 'automatic' && row.assignment_reason_details.length > 0 && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
          <p className="mb-2 text-[11px] font-black text-emerald-800/80">سبب التوصية</p>
          <ul className="space-y-1.5">
            {row.assignment_reason_details.map((key) => (
              <li key={key} className="flex items-center gap-2 text-[12px] font-semibold text-deepBlue/70">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                {REASON_LABELS[key] ?? key}
              </li>
            ))}
          </ul>
        </div>
      )}
      {row.is_assigned && row.assignment_method === 'manual' && (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-3 text-center text-[12px] font-semibold text-deepBlue/45">
          تم اختيار الصف يدويًا بواسطة المسؤول
        </p>
      )}

      <Link
        to={`/dashboard/instructor/classes?course=${row.course_id}`}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#0077B6]/30 bg-sky-50 px-4 py-3 text-[12px] font-black text-[#0077B6]"
      >
        <UserPlus className="h-4 w-4" />
        {row.is_assigned ? 'نقل إلى صف آخر' : 'إسناد إلى صف'}
      </Link>
    </div>
  )
}

function buildEvents(row: InstructorPlacementTestRow) {
  return [
    { label: 'التسجيل', done: true, date: row.submitted_at },
    { label: 'اكتمل الاختبار الكتابي', done: !!row.submitted_at, date: row.submitted_at },
    { label: 'حُجزت المقابلة', done: !!row.oral_booking_at, date: row.oral_booking_at },
    { label: 'اكتملت المقابلة', done: row.status === 'oral_completed' || row.status === 'completed', date: row.oral_booking_ends_at },
    { label: 'تعيين المستوى', done: row.status === 'completed', date: row.submitted_at },
    { label: 'إسناد الصف', done: row.is_assigned, date: row.assigned_at },
  ]
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#F8FAFC] px-3 py-2.5 ring-1 ring-[#0C2A4B]/[0.04]">
      <p className="text-[9px] font-bold text-deepBlue/40">{label}</p>
      <p className="mt-0.5 text-[12px] font-black text-deepBlue">{value}</p>
    </div>
  )
}

function EmptyTab({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <ClipboardList className="h-8 w-8 text-slate-300" />
      <p className="text-[13px] font-bold text-deepBlue/45">{message}</p>
    </div>
  )
}
