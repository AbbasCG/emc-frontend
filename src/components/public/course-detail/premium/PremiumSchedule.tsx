import type { Course } from '@/types'
import type { CourseDetailDerived } from '@/utils/courseDetailDerived'
import { formatPublicText } from '@/utils/publicDetailFormat'
import { safeTrimUnknown } from '@/utils/publicCourseNormalize'

type Props = { course: Course; derived: CourseDetailDerived }

export default function PremiumSchedule({ course, derived }: Props) {
  const x = course as Record<string, unknown>
  const rows: { label: string; value: string; link?: boolean }[] = []

  const studyDays = safeTrimUnknown(course.study_days ?? x.study_days)
  const studyTime = safeTrimUnknown(course.study_time ?? x.study_time)
  const sessionFmt = safeTrimUnknown(course.session_format ?? x.session_format)
  const dept = safeTrimUnknown(course.department?.name ?? course.department_name ?? x.department_name)
  const track = safeTrimUnknown(course.track_title ?? course.track?.title ?? x.track_title)
  const tracksCount = safeTrimUnknown(x.tracks_count ?? x.tracks)

  if (derived.hoursLabel) rows.push({ label: 'ساعات التدريب', value: formatPublicText(derived.hoursLabel) })
  if (studyDays) rows.push({ label: 'أيام الدراسة', value: formatPublicText(studyDays) })
  if (studyTime) rows.push({ label: 'وقت الدراسة', value: formatPublicText(studyTime) })
  if (sessionFmt) rows.push({ label: 'صيغة الجلسات', value: sessionFmt })
  if (derived.programAr) rows.push({ label: 'نوع البرنامج', value: derived.programAr })
  if (dept) rows.push({ label: 'القسم', value: dept })
  if (track) rows.push({ label: 'المسار', value: track })
  if (tracksCount && derived.itemType === 'program') {
    rows.push({ label: 'المسارات', value: formatPublicText(tracksCount) })
  }
  if (derived.meetingLink) rows.push({ label: 'رابط الاجتماع', value: derived.meetingLink, link: true })
  if (derived.completionHint) {
    rows.push({ label: 'معايير الإكمال', value: derived.completionHint.split('\n')[0] ?? derived.completionHint })
  }

  if (rows.length === 0) return null

  return (
    <section aria-label="الجدول" dir="rtl" className="rounded-2xl border border-line bg-white p-3.5 shadow-emc sm:p-4">
      <h2 className="mb-3.5 flex items-center gap-2.5 font-display text-sm font-black tracking-tight text-deepBlue">
        <span className="h-4 w-1 rounded-full bg-customOrange" aria-hidden />
        الجدول والتفاصيل
      </h2>
      <ol className="relative space-y-0 border-r-2 border-customBlue/18 pr-3.5">
        {rows.map((row, i) => (
          <li key={row.label} className="relative pb-2.5 last:pb-0">
            <span
              className="absolute -right-[calc(0.4rem+4px)] top-1.5 h-2 w-2 rounded-full bg-customBlue ring-2 ring-white"
              aria-hidden
            />
            {i < rows.length - 1 ?
              <span className="absolute -right-px top-3 h-[calc(100%-0.25rem)] border-r border-dashed border-customBlue/12" aria-hidden />
            : null}
            <p className="text-[9px] font-black uppercase tracking-[0.1em] text-muted-400">{row.label}</p>
            {row.link ?
              <a href={row.value} className="mt-0.5 block truncate text-[12px] font-bold text-customBlue underline-offset-4 transition-colors hover:text-deepBlue hover:underline" dir="ltr" target="_blank" rel="noreferrer">
                {row.value}
              </a>
            : <p className="mt-0.5 text-[12px] font-black tabular-nums text-deepBlue">{row.value}</p>}
          </li>
        ))}
      </ol>
    </section>
  )
}
