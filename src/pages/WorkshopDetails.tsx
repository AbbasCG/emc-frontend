import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Award,
  BadgeCheck,
  Calendar,
  Clock,
  ExternalLink,
  GraduationCap,
  Loader2,
  MapPin,
  Users,
  Wifi,
} from 'lucide-react'
import PublicSeo from '@/components/public/PublicSeo'
import StateMessage from '@/components/StateMessage'
import { fetchPublicWorkshopBySlug, type PublicWorkshop } from '@/api/workshopsApi.public'
import { fetchStudentRegistrations } from '@/api/studentApi'
import { useAuth } from '@/contexts/AuthContext'
import { EMC_COURSE_COVER_PLACEHOLDER } from '@/utils/publicCourseDisplay'
import { resolvePublicAssetUrl } from '@/utils/mediaUrl'
import { normalizeRole } from '@/utils/dashboardAccess'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'يُحدَّد لاحقاً'
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(dateStr))
  } catch {
    return dateStr
  }
}

export default function WorkshopDetailsPage() {
  const { slug } = useParams()
  const { user, isAuthenticated } = useAuth()
  const [workshop, setWorkshop] = useState<PublicWorkshop | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [alreadyEnrolled, setAlreadyEnrolled] = useState(false)

  useEffect(() => {
    if (!slug) {
      setNotFound(true)
      setLoading(false)
      return
    }
    let alive = true
    setLoading(true)
    setLoadError(false)
    void fetchPublicWorkshopBySlug(slug).then((res) => {
      if (!alive) return
      if (!res.workshop) {
        setNotFound(!res.ok)
        setLoadError(!res.ok)
        setWorkshop(null)
      } else {
        setWorkshop(res.workshop)
        setNotFound(false)
      }
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [slug])

  useEffect(() => {
    if (!isAuthenticated || !workshop?.course_id) {
      setAlreadyEnrolled(false)
      return
    }
    let alive = true
    void fetchStudentRegistrations().then((regs) => {
      if (!alive) return
      setAlreadyEnrolled(regs.some((r) => r.course_id === workshop.course_id))
    })
    return () => {
      alive = false
    }
  }, [isAuthenticated, workshop?.course_id])

  const coverUrl = useMemo(
    () => resolvePublicAssetUrl(workshop?.cover_image ?? null) ?? EMC_COURSE_COVER_PLACEHOLDER,
    [workshop?.cover_image],
  )

  const redirectPath = slug ? `/workshops/${slug}` : '/workshops'
  const isStudent = normalizeRole(user?.role) === 'student'
  const externalUrl = workshop?.external_registration_url ?? null
  const registrationOpen = workshop?.registration_open !== false

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-slate-50 pt-28">
        <Loader2 className="h-10 w-10 animate-spin text-[#2691C2]" />
      </main>
    )
  }

  if (loadError && !workshop) {
    return (
      <main className="bg-slate-50 px-4 pb-20 pt-32 sm:px-6">
        <StateMessage type="error" title="تعذّر التحميل" message="لم نتمكن من تحميل تفاصيل الورشة. حاول مجدداً." />
      </main>
    )
  }

  if (notFound || !workshop) {
    return (
      <main className="bg-slate-50 px-4 pb-20 pt-32 sm:px-6">
        <StateMessage type="empty" title="الورشة غير موجودة" message="لم نتمكن من العثور على هذه الورشة." />
      </main>
    )
  }

  const seoDesc =
    workshop.short_description ??
    (workshop.description ? workshop.description.slice(0, 160) : `ورشة ${workshop.title} — EMC`)

  function renderCta(w: PublicWorkshop) {
    const cls =
      'inline-flex w-full items-center justify-center gap-2 rounded-xl px-7 py-4 text-sm font-extrabold text-white shadow-lg sm:w-auto'

    if (!registrationOpen) {
      return (
        <span className={`${cls} cursor-not-allowed bg-slate-300 text-slate-500 shadow-none`}>التسجيل مغلق</span>
      )
    }

    if (externalUrl) {
      return (
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${cls} bg-customOrange shadow-orange-100`}
        >
          <ExternalLink size={18} />
          التسجيل الخارجي
        </a>
      )
    }

    if (alreadyEnrolled) {
      return (
        <Link to="/dashboard/student/courses" className={`${cls} bg-emerald-600 shadow-emerald-100`}>
          <BadgeCheck size={18} />
          عرض تسجيلي
        </Link>
      )
    }

    if (!isAuthenticated) {
      return (
        <Link
          to={`/login?redirect=${encodeURIComponent(redirectPath)}`}
          className={`${cls} bg-customOrange shadow-orange-100`}
        >
          <GraduationCap size={18} />
          سجّل الدخول للتسجيل
        </Link>
      )
    }

    if (isStudent && w.course_slug) {
      return (
        <Link
          to={`/courses/${w.course_slug}/register`}
          className={`${cls} bg-customOrange shadow-orange-100`}
        >
          <GraduationCap size={18} />
          سجّل في الورشة
        </Link>
      )
    }

    if (w.course_slug) {
      return (
        <Link to={`/courses/${w.course_slug}`} className={`${cls} bg-customOrange shadow-orange-100`}>
          <GraduationCap size={18} />
          عرض صفحة البرنامج
        </Link>
      )
    }

    return (
      <Link to="/submit-workshop" className={`${cls} bg-deepBlue shadow-slate-200`}>
        طلب التسجيل
      </Link>
    )
  }

  return (
    <main className="bg-slate-50 px-4 pb-20 pt-28 sm:px-6 lg:px-8" dir="rtl">
      <PublicSeo
        title={workshop.title}
        description={seoDesc}
        path={`/workshops/${workshop.slug}`}
        image={coverUrl}
        type="article"
      />

      <motion.div
        className="mx-auto max-w-7xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45 }}
      >
        <nav aria-label="مسار التصفح" className="mb-6 flex flex-wrap items-center gap-1 text-[12px] font-bold text-slate-500">
          <Link to="/" className="hover:text-deepBlue">الرئيسية</Link>
          <span className="opacity-40">/</span>
          <Link to="/workshops" className="hover:text-deepBlue">الورش</Link>
          <span className="opacity-40">/</span>
          <span className="text-deepBlue">{workshop.title}</span>
        </nav>

        <motion.section
          className="mt-4 grid gap-8 rounded-2xl bg-white p-5 shadow-2xl shadow-slate-200/80 ring-1 ring-slate-100 sm:p-7 lg:grid-cols-[1.05fr_0.95fr] lg:p-9"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="order-2 text-right lg:order-1">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-sky-50 px-4 py-2 text-sm font-black text-customBlue">
              <GraduationCap size={17} />
              ورشة تدريبية
            </span>

            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${
                  registrationOpen ?
                    'bg-emerald-50 text-emerald-800 ring-emerald-100'
                  : 'bg-orange-50 text-orange-800 ring-orange-100'
                }`}
              >
                {registrationOpen ? 'التسجيل مفتوح' : 'التسجيل مغلق'}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${
                  workshop.is_free ?
                    'bg-sky-50 text-customBlue ring-sky-100'
                  : 'bg-orange-50 text-customOrange ring-orange-100'
                }`}
              >
                {workshop.is_free ? 'مجانية' : 'برسوم'}
              </span>
              {workshop.certificate_name ?
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-800 ring-1 ring-violet-100">
                  <Award className="h-3.5 w-3.5" />
                  شهادة
                </span>
              : null}
            </div>

            <h1 className="mt-4 text-3xl font-black leading-[1.3] text-deepBlue sm:text-4xl">{workshop.title}</h1>

            {workshop.instructor_name ?
              <p className="mt-3 text-sm font-bold text-slate-600">المدرب: {workshop.instructor_name}</p>
            : null}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <HeroTile icon={Calendar} label="التاريخ" value={formatDate(workshop.start_date)} />
              <HeroTile
                icon={Clock}
                label="الوقت"
                value={workshop.start_time ?? 'يُعلَن لاحقاً'}
              />
              <HeroTile
                icon={workshop.is_online ? Wifi : MapPin}
                label="النمط"
                value={workshop.is_online ? 'أونلاين' : workshop.location_type === 'offline' ? 'حضوري' : 'مختلط'}
              />
              <HeroTile
                icon={Users}
                label="المقاعد"
                value={
                  workshop.seats_remaining != null ?
                    `${workshop.seats_remaining} متاح`
                  : workshop.seats_total != null ?
                    `${workshop.seats_total} مقعد`
                  : 'غير محدد'
                }
              />
            </div>

            <div className="mt-8">{renderCta(workshop)}</div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="overflow-hidden rounded-2xl bg-slate-100 shadow-inner ring-1 ring-slate-200/80">
              <img src={coverUrl} alt="" className="aspect-[4/3] w-full object-cover" />
            </div>
          </div>
        </motion.section>

        {workshop.description ?
          <section className="mt-10 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 sm:p-8">
            <h2 className="text-xl font-black text-deepBlue">عن الورشة</h2>
            <div className="prose prose-slate mt-4 max-w-none whitespace-pre-wrap text-sm leading-8 text-slate-700">
              {workshop.description}
            </div>
          </section>
        : null}

        {workshop.certificate_name ?
          <section className="mt-6 rounded-2xl border border-emerald-200/80 bg-emerald-50/80 p-5 ring-1 ring-emerald-100">
            <h3 className="flex items-center gap-2 text-sm font-black text-emerald-900">
              <Award className="h-4 w-4" />
              الشهادة
            </h3>
            <p className="mt-2 text-sm font-semibold text-emerald-950">{workshop.certificate_name}</p>
          </section>
        : null}
      </motion.div>
    </main>
  )
}

function HeroTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Calendar
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-right">
      <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-deepBlue">{value}</p>
    </div>
  )
}
