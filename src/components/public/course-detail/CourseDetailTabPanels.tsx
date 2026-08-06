import { ChevronDown, Mail, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Course } from '@/types'
import type { CourseDetailDerived } from '@/utils/courseDetailDerived'
import type { CourseFaqItem, CourseReviewItem } from '@/utils/courseDetailPageData'
import type { CurriculumGroup } from '@/components/public/detail/PublicCurriculumSection'
import { cn } from '@/lib/utils'
import { formatPublicDate, formatPublicText, formatPublicTime } from '@/utils/publicDetailFormat'
import { safeTrimUnknown } from '@/utils/publicCourseNormalize'

const PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><circle cx="80" cy="80" r="80" fill="#2691C2"/><circle cx="80" cy="62" r="22" fill="#fff3"/><path fill="#fff4" d="M36 138c10-26 26-38 44-38s34 12 44 38"/></svg>`,
  )

function Card({
  title,
  children,
  className,
  accent,
}: {
  title: string
  children: React.ReactNode
  className?: string
  accent?: 'default' | 'emerald' | 'sky' | 'amber' | 'violet'
}) {
  const accents = {
    default: 'border-white/80 bg-white/90',
    emerald: 'border-emerald-100/80 bg-gradient-to-l from-emerald-50/60 to-white/90',
    sky: 'border-[#2691C2]/12 bg-gradient-to-l from-[#2691C2]/5 to-white/90',
    amber: 'border-amber-100/80 bg-gradient-to-l from-amber-50/50 to-white/90',
    violet: 'border-violet-100/80 bg-gradient-to-l from-violet-50/40 to-white/90',
  }
  return (
    <div className={cn('rounded-2xl border p-3 shadow-sm', accents[accent ?? 'default'], className)}>
      <h3 className="text-[9px] font-black uppercase tracking-wider text-[#22334A]/45">{title}</h3>
      <div className="mt-2">{children}</div>
    </div>
  )
}

export function OverviewTabPanel({
  derived,
  overviewParagraphs,
  learningItems,
  requirementsItems = [],
  prerequisitesBlock = null,
}: {
  derived: CourseDetailDerived
  overviewParagraphs: string[]
  learningItems: string[]
  requirementsItems?: string[]
  prerequisitesBlock?: string | null
}) {
  const reqAll = [
    ...(prerequisitesBlock ?
      prerequisitesBlock.split(/\r?\n+/).map((s) => s.trim()).filter(Boolean)
    : []),
    ...requirementsItems,
  ]
  const reqUniq = [...new Set(reqAll)]

  return (
    <div className="grid gap-2 lg:grid-cols-2">
      <div className="space-y-2 lg:col-span-2">
        {derived.fullDescription ?
          <Card title="الوصف الكامل">
            <p className="whitespace-pre-line text-[13px] leading-6 text-slate-700">{derived.fullDescription}</p>
          </Card>
        : overviewParagraphs.map((block) => (
            <Card key={block.slice(0, 40)} title="نظرة عامة">
              <p className="whitespace-pre-line text-[13px] leading-6 text-slate-700">{block}</p>
            </Card>
          ))}
      </div>

      {learningItems.length > 0 ?
        <Card title="ماذا ستتعلم" accent="emerald">
          <ul className="space-y-1">
            {learningItems.map((item) => (
              <li key={item} className="flex gap-1.5 text-[13px] font-semibold leading-6 text-slate-700">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-emerald-500" />
                {item}
              </li>
            ))}
          </ul>
        </Card>
      : null}

      {derived.learningOutcomesBlock ?
        <Card title="المخرجات التعليمية" accent="sky">
          <p className="whitespace-pre-line text-[13px] leading-6 text-slate-700">{derived.learningOutcomesBlock}</p>
        </Card>
      : null}

      {derived.keywordTags.length > 0 ?
        <Card title="المهارات المكتسبة" accent="sky">
          <div className="flex flex-wrap gap-1">
            {derived.keywordTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-[#22334A] ring-1 ring-[#2691C2]/15"
              >
                {tag}
              </span>
            ))}
          </div>
        </Card>
      : null}

      {derived.targetAudience ?
        <Card title="الفئة المستهدفة" accent="violet">
          <p className="whitespace-pre-line text-[13px] leading-6 text-slate-700">{derived.targetAudience}</p>
        </Card>
      : null}

      {derived.certificateLine ?
        <Card title="الفوائد المهنية والشهادة" accent="amber">
          <p className="text-[13px] font-semibold text-slate-700">{derived.certificateLine}</p>
          {derived.completionHint ?
            <p className="mt-1.5 whitespace-pre-line text-[13px] leading-6 text-slate-600">{derived.completionHint}</p>
          : null}
        </Card>
      : null}

      {reqUniq.length > 0 ?
        <Card title="المتطلبات" className="lg:col-span-2">
          <ul className="space-y-1">
            {reqUniq.map((item) => (
              <li key={item} className="text-[13px] font-semibold leading-6 text-slate-700">• {item}</li>
            ))}
          </ul>
        </Card>
      : null}

      {derived.methodologyLines.length > 0 ?
        <Card title="منهجية التدريب" className="lg:col-span-2">
          <ul className="space-y-0.5">
            {derived.methodologyLines.map((line) => (
              <li key={line} className="text-[13px] font-semibold leading-6 text-slate-700">{line}</li>
            ))}
          </ul>
        </Card>
      : null}

      {derived.trainingStats.length > 0 ?
        <div className="flex flex-wrap gap-1.5 lg:col-span-2">
          {derived.trainingStats.map((s) => (
            <span
              key={s.label}
              className="rounded-lg border border-[#22334A]/8 bg-white/90 px-2.5 py-1 text-[10px] font-black tabular-nums text-[#22334A]"
            >
              {s.label}: {formatPublicText(s.value)}
            </span>
          ))}
        </div>
      : null}
    </div>
  )
}

function CurriculumAccordionGroup({ group }: { group: CurriculumGroup }) {
  const items = useMemo(() => group.items.filter((x) => x.trim()), [group.items])
  const [open, setOpen] = useState(false)
  if (items.length === 0) return null

  return (
    <div className="overflow-hidden rounded-2xl border border-[#22334A]/8 bg-white/90 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-right transition hover:bg-[#2691C2]/5"
      >
        <div>
          <p className="text-[13px] font-black text-[#22334A]">{group.title}</p>
          <p className="text-[10px] font-semibold text-slate-500 tabular-nums">
            {formatPublicText(items.length)} عنصر
          </p>
        </div>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-[#2691C2] transition', open && 'rotate-180')} />
      </button>
      {open ?
        <ul className="space-y-1 border-t border-[#22334A]/6 px-3 py-2">
          {items.map((item) => (
            <li
              key={item}
              className="rounded-xl bg-[#f8fafc] px-3 py-2 text-[13px] font-semibold text-slate-700"
            >
              {item}
            </li>
          ))}
        </ul>
      : null}
    </div>
  )
}

export function CurriculumTabPanel({ groups }: { groups: CurriculumGroup[]; itemType?: string }) {
  const nonEmpty = groups.filter((g) => g.items.some((x) => x.trim()))
  if (nonEmpty.length === 0) {
    return <p className="text-sm font-semibold text-slate-500">لا يوجد منهاج مفصّل بعد.</p>
  }
  return (
    <div className="space-y-1.5">
      {nonEmpty.map((g) => (
        <CurriculumAccordionGroup key={g.id} group={g} />
      ))}
    </div>
  )
}

export function RequirementsTabPanel({
  items,
  prerequisitesBlock,
}: {
  items: string[]
  prerequisitesBlock: string | null
}) {
  const all = [
    ...(prerequisitesBlock ?
      prerequisitesBlock.split(/\r?\n+/).map((s) => s.trim()).filter(Boolean)
    : []),
    ...items,
  ]
  const uniq = [...new Set(all)]
  if (uniq.length === 0) {
    return <p className="text-sm font-semibold text-slate-500">لا توجد متطلبات محددة.</p>
  }
  return (
    <ul className="space-y-2">
      {uniq.map((item) => (
        <li
          key={item}
          className="rounded-2xl border border-[#2691C2]/12 bg-gradient-to-l from-[#2691C2]/5 to-white px-4 py-3 text-sm font-semibold leading-7 text-slate-700"
        >
          {item}
        </li>
      ))}
    </ul>
  )
}

export function InstructorTabPanel({
  instructor,
  course,
}: {
  instructor: CourseDetailDerived['instructor']
  course: Course
}) {
  const x = course as Record<string, unknown>
  const coursesTaught = formatPublicText(safeTrimUnknown(x.instructor_courses_count ?? x.courses_count) ?? '')
  const studentsTaught = formatPublicText(safeTrimUnknown(x.instructor_students_count ?? x.students_count) ?? '')

  if (!instructor.assigned || !instructor.name) {
    return <p className="text-sm font-semibold text-slate-500">لم يُحدّد مدرب بعد.</p>
  }

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[#2691C2]/10 bg-gradient-to-l from-[#2691C2]/5 to-white p-3">
      <img
        src={instructor.avatarUrl ?? PLACEHOLDER}
        alt=""
        loading="lazy"
        className="h-14 w-14 shrink-0 rounded-xl object-cover ring-2 ring-[#2691C2]/15"
      />
      <div className="min-w-0 flex-1 text-right">
        <p className="text-base font-black text-[#22334A]">{instructor.name}</p>
        {instructor.title ?
          <p className="text-[11px] font-bold text-[#2691C2]">{instructor.title}</p>
        : null}
        {instructor.bio ?
          <p className="mt-1.5 line-clamp-3 text-[12px] leading-5 text-slate-600">{instructor.bio}</p>
        : null}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {coursesTaught ?
            <span className="rounded-lg bg-[#22334A]/5 px-2 py-1 text-[10px] font-black tabular-nums text-[#22334A]">
              دورات: {coursesTaught}
            </span>
          : null}
          {studentsTaught ?
            <span className="rounded-lg bg-[#2691C2]/10 px-2 py-1 text-[10px] font-black tabular-nums text-[#2691C2]">
              متدربون: {studentsTaught}
            </span>
          : null}
        </div>
        {instructor.email ?
          <a
            href={`mailto:${instructor.email}`}
            className="mt-2 inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-semibold text-[#2691C2]"
            dir="ltr"
          >
            <Mail className="h-3 w-3" />
            {instructor.email}
          </a>
        : null}
      </div>
    </div>
  )
}

export function ScheduleTabPanel({ course, derived }: { course: Course; derived: CourseDetailDerived }) {
  const x = course as Record<string, unknown>
  const rows: { label: string; value: string }[] = []
  const start = formatPublicDate(course.start_date)
  const end = formatPublicDate(course.end_date)
  if (start) rows.push({ label: 'تاريخ البداية', value: start })
  if (end) rows.push({ label: 'تاريخ النهاية', value: end })
  const startClock = formatPublicTime(course.start_time ?? x.start_time)
  const endClock = formatPublicTime(course.end_time ?? x.end_time)
  if (startClock || endClock) rows.push({ label: 'الوقت', value: [startClock, endClock].filter(Boolean).join(' — ') })
  if (derived.displayDuration) rows.push({ label: 'المدة', value: formatPublicText(derived.displayDuration) })
  if (derived.sessionsLabel) rows.push({ label: 'الجلسات', value: formatPublicText(derived.sessionsLabel) })
  if (derived.hoursLabel) rows.push({ label: 'ساعات التدريب', value: formatPublicText(derived.hoursLabel) })
  if (derived.regsLabel) rows.push({ label: 'المسجّلون', value: formatPublicText(derived.regsLabel) })
  if (derived.programAr) rows.push({ label: 'نوع البرنامج', value: derived.programAr })
  if (derived.seatsLabel) rows.push({ label: 'السعة', value: formatPublicText(derived.seatsLabel) })
  if (derived.certificateLine) rows.push({ label: 'الشهادة', value: derived.certificateLine })
  if (derived.languageDisplay) rows.push({ label: 'اللغة', value: derived.languageDisplay })
  const dept = safeTrimUnknown(course.department?.name ?? course.department_name ?? x.department_name)
  if (dept) rows.push({ label: 'القسم', value: dept })
  const track = safeTrimUnknown(course.track_title ?? course.track?.title ?? x.track_title)
  if (track) rows.push({ label: 'المسار', value: track })
  const tracksCount = safeTrimUnknown(x.tracks_count ?? x.tracks)
  if (tracksCount && derived.itemType === 'program') rows.push({ label: 'المسارات', value: formatPublicText(tracksCount) })
  if (safeTrimUnknown(course.study_days ?? x.study_days)) {
    rows.push({ label: 'أيام الدراسة', value: formatPublicText(safeTrimUnknown(course.study_days ?? x.study_days)!) })
  }
  if (safeTrimUnknown(course.study_time ?? x.study_time)) {
    rows.push({ label: 'وقت الدراسة', value: formatPublicText(safeTrimUnknown(course.study_time ?? x.study_time)!) })
  }
  if (safeTrimUnknown(course.session_format ?? x.session_format)) {
    rows.push({ label: 'صيغة الجلسات', value: safeTrimUnknown(course.session_format ?? x.session_format)! })
  }
  if (derived.deliveryAr) rows.push({ label: 'طريقة التقديم', value: derived.deliveryAr })
  if (derived.locationLabel) rows.push({ label: 'المدينة / المكان', value: derived.locationLabel })
  // meeting links are only visible to enrolled students/staff — not shown on public detail page

  if (rows.length === 0) {
    return <p className="text-[13px] font-semibold text-slate-500">لم تُحدّد جدولة بعد.</p>
  }

  return (
    <div className="grid gap-1.5 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="rounded-xl border border-[#22334A]/8 bg-white/90 px-3 py-2 text-right">
          <p className="text-[9px] font-black text-slate-400">{row.label}</p>
          {row.label === 'رابط الاجتماع' ?
            <a href={row.value} className="mt-0.5 block truncate text-[12px] font-bold text-[#2691C2]" dir="ltr" target="_blank" rel="noreferrer">
              {row.value}
            </a>
          : <p className="mt-0.5 text-[12px] font-black tabular-nums text-[#22334A]">{row.value}</p>}
        </div>
      ))}
    </div>
  )
}

export function ReviewsTabPanel({
  reviews,
  averageRating,
}: {
  reviews: CourseReviewItem[]
  averageRating: number | null
}) {
  const distribution = useMemo(() => {
    const d = [0, 0, 0, 0, 0]
    reviews.forEach((r) => {
      const idx = Math.min(5, Math.max(1, Math.round(r.rating))) - 1
      d[idx] += 1
    })
    return d.reverse()
  }, [reviews])

  if (reviews.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
        <Star className="mx-auto h-8 w-8 text-slate-300" />
        <p className="mt-2 text-sm font-black text-[#22334A]">لا توجد تقييمات بعد</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#2691C2]/12 bg-gradient-to-l from-[#2691C2]/8 to-white px-4 py-3">
        <div className="text-center">
          <p className="text-3xl font-black tabular-nums text-[#22334A]">
            {formatPublicText(averageRating ?? '—')}
          </p>
          <p className="text-[11px] font-bold text-slate-500">من 5</p>
        </div>
        <div className="min-w-[180px] flex-1 space-y-1">
          {distribution.map((count, i) => {
            const stars = 5 - i
            const pct = reviews.length ? Math.round((count / reviews.length) * 100) : 0
            return (
              <div key={stars} className="flex items-center gap-2 text-[11px]">
                <span className="w-3 tabular-nums">{formatPublicText(stars)}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-[#EC943C]" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-8 tabular-nums text-slate-500">{formatPublicText(count)}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        {reviews.map((r) => (
          <article key={r.id} className="rounded-2xl border border-[#22334A]/8 bg-white/90 p-4 text-right shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="font-black text-[#22334A]">{r.author}</p>
              <span className="inline-flex items-center gap-1 text-[12px] font-black tabular-nums text-[#EC943C]">
                <Star className="h-3.5 w-3.5 fill-current" />
                {formatPublicText(r.rating)}
              </span>
            </div>
            <p className="mt-2 text-sm leading-7 text-slate-600">{r.body}</p>
          </article>
        ))}
      </div>
    </div>
  )
}

function FaqItem({ item }: { item: CourseFaqItem }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="overflow-hidden rounded-2xl border border-[#22334A]/8 bg-white/90 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-right font-black text-[#22334A] transition hover:bg-[#2691C2]/5"
      >
        <span className="text-sm">{item.question}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-[#2691C2] transition', open && 'rotate-180')} />
      </button>
      {open ?
        <p className="border-t border-[#22334A]/6 px-4 py-3 text-sm leading-7 text-slate-600">{item.answer}</p>
      : null}
    </div>
  )
}

export function FaqTabPanel({ items }: { items: CourseFaqItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm font-semibold text-slate-500">لا توجد أسئلة شائعة.</p>
  }
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <FaqItem key={item.id} item={item} />
      ))}
    </div>
  )
}

export function TrainingStatsStrip({ derived }: { derived: CourseDetailDerived }) {
  if (derived.trainingStats.length === 0) return null
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {derived.trainingStats.map((s) => (
        <span
          key={s.label}
          className="rounded-xl border border-[#22334A]/10 bg-white/90 px-3 py-1.5 text-[11px] font-black tabular-nums text-[#22334A] shadow-sm"
        >
          {s.label}: {formatPublicText(s.value)}
        </span>
      ))}
    </div>
  )
}
