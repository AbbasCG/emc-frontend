import { ChevronDown, Mail, Star } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import type { Course } from '@/types'
import type { CourseDetailDerived } from '@/utils/courseDetailDerived'
import type { CourseFaqItem, CourseReviewItem } from '@/utils/courseDetailPageData'
import type { CurriculumGroup } from '@/components/public/detail/PublicCurriculumSection'
import { cn } from '@/lib/utils'
import { formatPublicText } from '@/utils/publicDetailFormat'
import { safeTrimUnknown } from '@/utils/publicCourseNormalize'

const PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><circle cx="80" cy="80" r="80" fill="#0077B6"/><circle cx="80" cy="62" r="22" fill="#fff3"/><path fill="#fff4" d="M36 138c10-26 26-38 44-38s34 12 44 38"/></svg>`,
  )

const CLAMP_CHARS = 280

function SectionBlock({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section
      id={id}
      className="scroll-mt-20 rounded-2xl border border-white/80 bg-white/90 p-3 shadow-sm backdrop-blur-sm sm:p-4"
    >
      <h2 className="mb-2.5 flex items-center gap-2 text-sm font-black text-[#0C2A4B]">
        <span className="h-4 w-1 rounded-full bg-[#0077B6]" aria-hidden />
        {title}
      </h2>
      {children}
    </section>
  )
}

function ExpandableText({ text, className }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false)
  const needsToggle = text.length > CLAMP_CHARS || text.split(/\r?\n/).length > 4

  return (
    <div className={className}>
      <p
        className={cn(
          'whitespace-pre-line text-[13px] leading-6 text-slate-700',
          !open && needsToggle && 'line-clamp-4',
        )}
      >
        {text}
      </p>
      {needsToggle ?
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-1.5 text-[11px] font-black text-[#0077B6] hover:underline"
        >
          {open ? 'عرض أقل' : 'عرض المزيد'}
        </button>
      : null}
    </div>
  )
}

export function OverviewSection({
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
  const mainText =
    derived.fullDescription?.trim() ||
    overviewParagraphs[0]?.trim() ||
    ''

  return (
    <SectionBlock id="overview" title="نظرة عامة">
      <div className="space-y-2.5">
        {mainText ?
          <ExpandableText text={mainText} />
        : null}

        {learningItems.length > 0 ?
          <div>
            <p className="mb-1 text-[10px] font-black text-[#0C2A4B]/45">ماذا ستتعلم</p>
            <ul className="grid gap-1 sm:grid-cols-2">
              {learningItems.map((item) => (
                <li key={item} className="flex gap-1.5 text-[12px] font-semibold leading-5 text-slate-700">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        : null}

        {derived.learningOutcomesBlock ?
          <div>
            <p className="mb-1 text-[10px] font-black text-[#0C2A4B]/45">المخرجات التعليمية</p>
            <ExpandableText text={derived.learningOutcomesBlock} />
          </div>
        : null}

        {derived.keywordTags.length > 0 ?
          <div className="flex flex-wrap gap-1">
            {derived.keywordTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[#0077B6]/8 px-2 py-0.5 text-[10px] font-black text-[#0C2A4B]"
              >
                {tag}
              </span>
            ))}
          </div>
        : null}

        {derived.targetAudience ?
          <div>
            <p className="mb-1 text-[10px] font-black text-[#0C2A4B]/45">الفئة المستهدفة</p>
            <ExpandableText text={derived.targetAudience} />
          </div>
        : null}

        {reqUniq.length > 0 ?
          <div>
            <p className="mb-1 text-[10px] font-black text-[#0C2A4B]/45">المتطلبات</p>
            <ul className="space-y-0.5">
              {reqUniq.map((item) => (
                <li key={item} className="text-[12px] font-semibold leading-5 text-slate-700">• {item}</li>
              ))}
            </ul>
          </div>
        : null}

        {derived.methodologyLines.length > 0 ?
          <div>
            <p className="mb-1 text-[10px] font-black text-[#0C2A4B]/45">منهجية التدريب</p>
            <ul className="space-y-0.5">
              {derived.methodologyLines.map((line) => (
                <li key={line} className="text-[12px] font-semibold leading-5 text-slate-700">{line}</li>
              ))}
            </ul>
          </div>
        : null}

        {derived.trainingStats.length > 0 ?
          <div className="flex flex-wrap gap-1">
            {derived.trainingStats.map((s) => (
              <span
                key={s.label}
                className="rounded-lg border border-[#0C2A4B]/8 bg-[#f8fafc] px-2 py-0.5 text-[10px] font-black tabular-nums text-[#0C2A4B]"
              >
                {s.label}: {formatPublicText(s.value)}
              </span>
            ))}
          </div>
        : null}
      </div>
    </SectionBlock>
  )
}

function CurriculumAccordionGroup({ group }: { group: CurriculumGroup }) {
  const items = useMemo(() => group.items.filter((x) => x.trim()), [group.items])
  const [open, setOpen] = useState(false)
  if (items.length === 0) return null

  return (
    <div className="overflow-hidden rounded-xl border border-[#0C2A4B]/8 bg-[#f8fafc]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-right hover:bg-[#0077B6]/5"
      >
        <div>
          <p className="text-[12px] font-black text-[#0C2A4B]">{group.title}</p>
          <p className="text-[10px] font-semibold text-slate-500 tabular-nums">
            {formatPublicText(items.length)} عنصر
          </p>
        </div>
        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-[#0077B6] transition', open && 'rotate-180')} />
      </button>
      {open ?
        <ul className="space-y-0.5 border-t border-[#0C2A4B]/6 px-2.5 py-1.5">
          {items.map((item) => (
            <li key={item} className="rounded-lg bg-white px-2.5 py-1.5 text-[12px] font-semibold text-slate-700">
              {item}
            </li>
          ))}
        </ul>
      : null}
    </div>
  )
}

export function CurriculumSection({ groups }: { groups: CurriculumGroup[] }) {
  const nonEmpty = groups.filter((g) => g.items.some((x) => x.trim()))
  if (nonEmpty.length === 0) return null

  return (
    <SectionBlock id="curriculum" title="المنهاج">
      <div className="space-y-1.5">
        {nonEmpty.map((g) => (
          <CurriculumAccordionGroup key={g.id} group={g} />
        ))}
      </div>
    </SectionBlock>
  )
}

export function ScheduleSection({ course, derived }: { course: Course; derived: CourseDetailDerived }) {
  const x = course as Record<string, unknown>
  const rows: { label: string; value: string; highlight?: boolean }[] = []

  if (derived.sessionsLabel) rows.push({ label: 'الجلسات', value: formatPublicText(derived.sessionsLabel) })
  if (derived.hoursLabel) rows.push({ label: 'ساعات التدريب', value: formatPublicText(derived.hoursLabel) })
  if (derived.regsLabel) rows.push({ label: 'المسجّلون', value: formatPublicText(derived.regsLabel) })
  if (derived.programAr) rows.push({ label: 'نوع البرنامج', value: derived.programAr })
  if (safeTrimUnknown(course.study_days ?? x.study_days)) {
    rows.push({ label: 'أيام الدراسة', value: formatPublicText(safeTrimUnknown(course.study_days ?? x.study_days)!) })
  }
  if (safeTrimUnknown(course.study_time ?? x.study_time)) {
    rows.push({ label: 'وقت الدراسة', value: formatPublicText(safeTrimUnknown(course.study_time ?? x.study_time)!) })
  }
  if (safeTrimUnknown(course.session_format ?? x.session_format)) {
    rows.push({ label: 'صيغة الجلسات', value: safeTrimUnknown(course.session_format ?? x.session_format)! })
  }
  if (derived.locationLabel) rows.push({ label: 'المدينة / المكان', value: derived.locationLabel })
  const dept = safeTrimUnknown(course.department?.name ?? course.department_name ?? x.department_name)
  if (dept) rows.push({ label: 'القسم', value: dept })
  const track = safeTrimUnknown(course.track_title ?? course.track?.title ?? x.track_title)
  if (track) rows.push({ label: 'المسار', value: track })
  const tracksCount = safeTrimUnknown(x.tracks_count ?? x.tracks)
  if (tracksCount && derived.itemType === 'program') {
    rows.push({ label: 'المسارات', value: formatPublicText(tracksCount) })
  }
  if (derived.meetingLink) rows.push({ label: 'رابط الاجتماع', value: derived.meetingLink })
  if (derived.completionHint) rows.push({ label: 'معايير الإكمال', value: derived.completionHint.split('\n')[0] ?? derived.completionHint })

  if (rows.length === 0) return null

  return (
    <SectionBlock id="schedule" title="الجدول">
      <ol className="relative space-y-0 border-r-2 border-[#0077B6]/20 pr-4">
        {rows.map((row, i) => (
          <li key={row.label} className="relative pb-2.5 last:pb-0">
            <span
              className={cn(
                'absolute -right-[calc(0.5rem+5px)] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white',
                row.highlight ? 'bg-[#0077B6]' : 'bg-[#F28C00]',
              )}
              aria-hidden
            />
            {i < rows.length - 1 ?
              <span className="absolute -right-[1px] top-4 h-[calc(100%-0.5rem)] w-0 border-r border-dashed border-[#0077B6]/15" aria-hidden />
            : null}
            <p className="text-[9px] font-black text-slate-400">{row.label}</p>
            {row.label === 'رابط الاجتماع' ?
              <a
                href={row.value}
                className="mt-0.5 block truncate text-[12px] font-bold text-[#0077B6]"
                dir="ltr"
                target="_blank"
                rel="noreferrer"
              >
                {row.value}
              </a>
            : <p className="mt-0.5 text-[12px] font-black tabular-nums text-[#0C2A4B]">{row.value}</p>}
          </li>
        ))}
      </ol>
    </SectionBlock>
  )
}

export function InstructorSection({
  instructor,
  course,
}: {
  instructor: CourseDetailDerived['instructor']
  course: Course
}) {
  const x = course as Record<string, unknown>
  const coursesTaught = formatPublicText(safeTrimUnknown(x.instructor_courses_count ?? x.courses_count) ?? '')
  const studentsTaught = formatPublicText(safeTrimUnknown(x.instructor_students_count ?? x.students_count) ?? '')

  if (!instructor.assigned || !instructor.name) return null

  return (
    <SectionBlock id="instructor" title="المدرب">
      <div className="flex items-start gap-2.5">
        <img
          src={instructor.avatarUrl ?? PLACEHOLDER}
          alt=""
          loading="lazy"
          className="h-12 w-12 shrink-0 rounded-lg object-cover ring-2 ring-[#0077B6]/15"
        />
        <div className="min-w-0 flex-1 text-right">
          <p className="text-sm font-black text-[#0C2A4B]">{instructor.name}</p>
          {instructor.title ?
            <p className="text-[10px] font-bold text-[#0077B6]">{instructor.title}</p>
          : null}
          {instructor.bio ?
            <ExpandableText text={instructor.bio} className="mt-1" />
          : null}
          <div className="mt-1.5 flex flex-wrap gap-1">
            {coursesTaught ?
              <span className="rounded-md bg-[#0C2A4B]/5 px-1.5 py-0.5 text-[9px] font-black tabular-nums text-[#0C2A4B]">
                دورات: {coursesTaught}
              </span>
            : null}
            {studentsTaught ?
              <span className="rounded-md bg-[#0077B6]/10 px-1.5 py-0.5 text-[9px] font-black tabular-nums text-[#0077B6]">
                متدربون: {studentsTaught}
              </span>
            : null}
          </div>
          {instructor.email ?
            <a
              href={`mailto:${instructor.email}`}
              className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-[#0077B6]"
              dir="ltr"
            >
              <Mail className="h-3 w-3" />
              {instructor.email}
            </a>
          : null}
        </div>
      </div>
    </SectionBlock>
  )
}

export function ReviewsSection({
  reviews,
  averageRating,
}: {
  reviews: CourseReviewItem[]
  averageRating: number | null
}) {
  if (reviews.length === 0) return null

  return (
    <SectionBlock id="reviews" title="التقييمات">
      <div className="mb-2 flex items-center gap-2 rounded-xl bg-[#0077B6]/8 px-3 py-2">
        <Star className="h-4 w-4 fill-[#F28C00] text-[#F28C00]" />
        <span className="text-lg font-black tabular-nums text-[#0C2A4B]">{formatPublicText(averageRating ?? '—')}</span>
        <span className="text-[10px] font-bold text-slate-500">
          ({formatPublicText(reviews.length)} تقييم)
        </span>
      </div>
      <div className="space-y-1.5">
        {reviews.slice(0, 4).map((r) => (
          <article key={r.id} className="rounded-xl border border-[#0C2A4B]/6 bg-[#f8fafc] px-2.5 py-2 text-right">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] font-black text-[#0C2A4B]">{r.author}</p>
              <span className="text-[10px] font-black tabular-nums text-[#F28C00]">{formatPublicText(r.rating)} ★</span>
            </div>
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-5 text-slate-600">{r.body}</p>
          </article>
        ))}
      </div>
    </SectionBlock>
  )
}

function FaqAccordionItem({ item }: { item: CourseFaqItem }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="overflow-hidden rounded-xl border border-[#0C2A4B]/8 bg-[#f8fafc]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-right text-[12px] font-black text-[#0C2A4B] hover:bg-[#0077B6]/5"
      >
        <span>{item.question}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-[#0077B6] transition', open && 'rotate-180')} />
      </button>
      {open ?
        <p className="border-t border-[#0C2A4B]/6 px-3 py-2 text-[11px] leading-5 text-slate-600">{item.answer}</p>
      : null}
    </div>
  )
}

export function FaqSection({ items }: { items: CourseFaqItem[] }) {
  if (items.length === 0) return null

  return (
    <SectionBlock id="faq" title="أسئلة شائعة">
      <div className="space-y-1">
        {items.map((item) => (
          <FaqAccordionItem key={item.id} item={item} />
        ))}
      </div>
    </SectionBlock>
  )
}

export default function CourseDetailSections({
  derived,
  course,
  overviewParagraphs,
  learningItems,
  requirementsItems,
  curriculumGroups,
  instructor,
  reviews,
  averageRating,
  faqs,
}: {
  derived: CourseDetailDerived
  course: Course
  overviewParagraphs: string[]
  learningItems: string[]
  requirementsItems: string[]
  curriculumGroups: CurriculumGroup[]
  instructor: CourseDetailDerived['instructor']
  reviews: CourseReviewItem[]
  averageRating: number | null
  faqs: CourseFaqItem[]
}) {
  return (
    <div className="space-y-2">
      <OverviewSection
        derived={derived}
        overviewParagraphs={overviewParagraphs}
        learningItems={learningItems}
        requirementsItems={requirementsItems}
        prerequisitesBlock={derived.prerequisitesBlock}
      />
      <CurriculumSection groups={curriculumGroups} />
      <ScheduleSection course={course} derived={derived} />
      <InstructorSection instructor={instructor} course={course} />
      <ReviewsSection reviews={reviews} averageRating={averageRating} />
      <FaqSection items={faqs} />
    </div>
  )
}
