import { Mail, UserRound } from 'lucide-react'
import PublicDetailSection from '@/components/public/detail/PublicDetailSection'
import type { ResolvedPublicCourseInstructor } from '@/utils/courseInstructor'

const PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#0C2A4B"/><stop offset="100%" stop-color="#0077B6"/></linearGradient></defs><circle cx="80" cy="80" r="80" fill="url(#g)"/><circle cx="80" cy="62" r="22" fill="#ffffff33"/><path fill="#ffffff44" d="M36 138c10-26 26-38 44-38s34 12 44 38"/></svg>`,
  )

export type WorkshopInstructor = {
  name: string
  avatarUrl?: string | null
  title?: string | null
  bio?: string | null
  email?: string | null
}

type Props = {
  instructor: ResolvedPublicCourseInstructor | WorkshopInstructor
  className?: string
  variant?: 'compact' | 'featured'
}

function isCourseInstructor(
  i: ResolvedPublicCourseInstructor | WorkshopInstructor,
): i is ResolvedPublicCourseInstructor {
  return 'assigned' in i
}

function InstructorBody({
  name,
  title,
  bio,
  email,
  avatarUrl,
}: {
  name: string
  title: string | null
  bio: string | null
  email: string | null
  avatarUrl: string
}) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
      <div className="relative shrink-0">
        <img
          src={avatarUrl}
          alt=""
          loading="lazy"
          className="h-24 w-24 rounded-3xl object-cover ring-4 ring-sky-50 sm:h-28 sm:w-28"
        />
        <span className="absolute -bottom-2 -start-2 grid h-10 w-10 place-items-center rounded-2xl bg-customBlue text-white">
          <UserRound size={18} aria-hidden />
        </span>
      </div>
      <div className="min-w-0 flex-1 text-right">
        <p className="text-xl font-black text-deepBlue">{name}</p>
        {title && <p className="mt-1 text-sm font-bold text-customBlue">{title}</p>}
        {bio && (
          <p className="mt-4 whitespace-pre-line text-sm font-semibold leading-8 text-slate-600">{bio}</p>
        )}
        {email && (
          <a
            href={`mailto:${email}`}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-50 px-4 py-2 text-sm font-semibold text-customBlue ring-1 ring-sky-100 transition hover:bg-sky-100"
            dir="ltr"
          >
            <Mail size={14} aria-hidden />
            {email}
          </a>
        )}
      </div>
    </div>
  )
}

export default function PublicInstructorCard({
  instructor,
  className = '',
  variant = 'compact',
}: Props) {
  const name = isCourseInstructor(instructor) ?
    instructor.assigned && instructor.name ?
      instructor.name
    : null
  : instructor.name?.trim() || null

  if (!name) return null

  const title = isCourseInstructor(instructor) ? instructor.title : instructor.title ?? null
  const bio = isCourseInstructor(instructor) ? instructor.bio : instructor.bio ?? null
  const email = isCourseInstructor(instructor) ? instructor.email : instructor.email ?? null
  const avatarUrl =
    isCourseInstructor(instructor) ?
      instructor.assigned ? instructor.avatarUrl ?? PLACEHOLDER : PLACEHOLDER
    : instructor.avatarUrl ?? PLACEHOLDER

  if (variant === 'featured') {
    return (
      <PublicDetailSection id="instructor" title="المدرب" className={className} compact>
        <InstructorBody name={name} title={title} bio={bio} email={email} avatarUrl={avatarUrl} />
      </PublicDetailSection>
    )
  }

  return (
    <div
      className={`overflow-hidden rounded-3xl bg-white ring-1 ring-line ${className}`}
    >
      <div className="border-b border-slate-100 px-5 py-4 text-right">
        <h3 className="text-base font-black text-deepBlue">المدرب</h3>
        <span className="mt-2 block h-1 w-10 rounded-full bg-customBlue" />
      </div>
      <div className="p-5">
        <InstructorBody name={name} title={title} bio={bio} email={email} avatarUrl={avatarUrl} />
      </div>
    </div>
  )
}
