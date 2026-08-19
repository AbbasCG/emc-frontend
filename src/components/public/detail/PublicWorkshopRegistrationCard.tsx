import { Link } from 'react-router'
import { BadgeCheck, ExternalLink, GraduationCap } from 'lucide-react'
import toast from '@/lib/toast'
import type { PublicWorkshop } from '@/api/workshopsApi.public'
import {
  buildCourseDetailEnrollHref,
  buildPublicLoginHref,
  PUBLIC_ENROLL_STUDENT_ONLY_MSG,
} from '@/utils/publicEnrollAuth'

type Props = {
  workshop: PublicWorkshop
  registrationOpen: boolean
  alreadyEnrolled: boolean
  isAuthenticated: boolean
  isStudent: boolean
  redirectPath: string
  externalUrl: string | null
  compact?: boolean
}

export default function PublicWorkshopRegistrationCard({
  workshop,
  registrationOpen,
  alreadyEnrolled,
  isAuthenticated,
  isStudent,
  redirectPath,
  externalUrl,
  compact = false,
}: Props) {
  const priceLabel = workshop.is_free ? 'مجانية' : workshop.price != null ? `€${workshop.price}` : 'برسوم'

  function renderCta() {
    const cls =
      'inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-black text-white'

    if (!registrationOpen) {
      return (
        <span className={`${cls} cursor-not-allowed bg-slate-300 text-slate-500`}>
          التسجيل مغلق
        </span>
      )
    }
    if (externalUrl) {
      return (
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${cls} bg-customOrange`}
        >
          <ExternalLink size={18} />
          التسجيل الخارجي
        </a>
      )
    }
    if (alreadyEnrolled) {
      return (
        <Link to="/dashboard/student/courses" className={`${cls} bg-emerald-600`}>
          <BadgeCheck size={18} />
          عرض تسجيلي
        </Link>
      )
    }
    if (!isAuthenticated) {
      return (
        <Link
          to={buildPublicLoginHref(redirectPath)}
          className={`${cls} bg-customOrange`}
        >
          <GraduationCap size={18} />
          سجّل الدخول لإكمال التسجيل
        </Link>
      )
    }
    if (!isStudent) {
      return (
        <button
          type="button"
          onClick={() => toast.error(PUBLIC_ENROLL_STUDENT_ONLY_MSG)}
          className={`${cls} bg-customOrange`}
        >
          <GraduationCap size={18} />
          سجّل في الورشة
        </button>
      )
    }
    if (workshop.course_slug) {
      return (
        <Link to={buildCourseDetailEnrollHref(workshop.course_slug)} className={`${cls} bg-customOrange`}>
          <GraduationCap size={18} />
          سجّل في الورشة
        </Link>
      )
    }
    return (
      <Link to="/submit-workshop" className={`${cls} bg-deepBlue`}>
        طلب التسجيل
      </Link>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-line">
      <div className="border-b border-slate-100 bg-gradient-to-l from-sky-50/90 to-white px-5 py-4 text-right sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-black text-deepBlue">التسجيل</h3>
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-black ring-1 ${
              registrationOpen ?
                'bg-emerald-50 text-emerald-800 ring-emerald-100'
              : 'bg-orange-50 text-orange-800 ring-orange-100'
            }`}
          >
            {registrationOpen ? 'التسجيل مفتوح' : 'التسجيل مغلق'}
          </span>
        </div>
        <span className="mt-2 block h-1 w-12 rounded-full bg-customOrange" />
        {!compact && (
          <p className="mt-3 line-clamp-2 text-sm font-semibold leading-7 text-slate-600">{workshop.title}</p>
        )}
      </div>

      <div className="space-y-3 border-b border-slate-100 px-5 py-4 text-right sm:px-6">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-black text-slate-400">الرسوم</span>
          <span
            className={`text-base font-black ${workshop.is_free ? 'text-customBlue' : 'text-customOrange'}`}
          >
            {priceLabel}
          </span>
        </div>
      </div>

      <div className="p-5 sm:p-6">{renderCta()}</div>
    </div>
  )
}
