import { useState } from 'react'
import { BookOpen, Mail, Users } from 'lucide-react'
import type { Course } from '@/types'
import type { CourseDetailDerived } from '@/utils/courseDetailDerived'
import { formatPublicText } from '@/utils/publicDetailFormat'
import { safeTrimUnknown } from '@/utils/publicCourseNormalize'

const AVATAR_PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><circle cx="80" cy="80" r="80" fill="#0077B6"/><circle cx="80" cy="60" r="26" fill="rgba(255,255,255,0.35)"/><path fill="rgba(255,255,255,0.25)" d="M20 148c14-36 34-52 60-52s46 16 60 52"/></svg>`,
  )

type Props = {
  instructor: CourseDetailDerived['instructor']
  course: Course
}

export default function PremiumInstructor({ instructor, course }: Props) {
  const [bioExpanded, setBioExpanded] = useState(false)

  if (!instructor.assigned || !instructor.name) return null

  const x = course as Record<string, unknown>
  const coursesCount = safeTrimUnknown(x.instructor_courses_count ?? x.courses_count)
  const studentsCount = safeTrimUnknown(x.instructor_students_count ?? x.students_count)

  const bioText = instructor.bio?.trim() ?? ''
  const bioNeedsClamp = bioText.length > 220
  const bioDisplay = bioNeedsClamp && !bioExpanded ? bioText.slice(0, 220) + '…' : bioText

  return (
    <section aria-label="المدرب" dir="rtl">
      <h2 className="mb-4 flex items-center gap-2.5 font-display text-sm font-black tracking-tight text-deepBlue">
        <span className="h-4 w-1 rounded-full bg-customOrange" aria-hidden />
        عن المدرب
      </h2>

      <div className="overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-customBlue/[0.06] to-white">
        <div className="flex items-start gap-4 p-5 text-right">
          <img
            src={instructor.avatarUrl ?? AVATAR_PLACEHOLDER}
            alt=""
            loading="lazy"
            className="h-20 w-20 shrink-0 rounded-2xl object-cover ring-2 ring-customBlue/18"
          />
          <div className="min-w-0 flex-1">
            <p className="text-base font-black text-deepBlue">{instructor.name}</p>
            {instructor.title && (
              <p className="mt-0.5 text-xs font-bold text-customBlue">{instructor.title}</p>
            )}

            {(coursesCount || studentsCount) && (
              <div className="mt-2.5 flex flex-wrap gap-2">
                {coursesCount && (
                  <span className="flex items-center gap-1.5 rounded-full bg-deepBlue/[0.06] px-2.5 py-1 text-[10px] font-black text-deepBlue">
                    <BookOpen className="h-3 w-3" />
                    <span className="font-latin tabular-nums">{formatPublicText(coursesCount)}</span> دورة
                  </span>
                )}
                {studentsCount && (
                  <span className="flex items-center gap-1.5 rounded-full bg-customBlue/[0.08] px-2.5 py-1 text-[10px] font-black text-customBlue">
                    <Users className="h-3 w-3" />
                    <span className="font-latin tabular-nums">{formatPublicText(studentsCount)}</span> متدرب
                  </span>
                )}
              </div>
            )}

            {bioText && (
              <div className="mt-2.5">
                <p className="text-[12.5px] leading-[1.8] text-foreground/80">{bioDisplay}</p>
                {bioNeedsClamp && (
                  <button
                    type="button"
                    onClick={() => setBioExpanded((v) => !v)}
                    className="mt-1 text-[11px] font-black text-customBlue underline-offset-4 transition-colors hover:text-deepBlue hover:underline"
                  >
                    {bioExpanded ? 'عرض أقل' : 'عرض المزيد'}
                  </button>
                )}
              </div>
            )}

            {instructor.email && (
              <a
                href={`mailto:${instructor.email}`}
                className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-customBlue underline-offset-4 transition-colors hover:text-deepBlue hover:underline"
                dir="ltr"
              >
                <Mail className="h-3 w-3" />
                {instructor.email}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
