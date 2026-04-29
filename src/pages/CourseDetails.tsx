import { useEffect, useState } from 'react'
import axios from 'axios'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Languages,
  Monitor,
  Share2,
  Target,
  UserPlus,
  Users,
} from 'lucide-react'
import api from '../api/axios'
import StateMessage from '../components/StateMessage'
import type { Course, IconComponent } from '../types'
import {
  courseImages,
  extractItem,
  fadeUp,
  formatDuration,
  formatPrice,
  formatSingleDate,
} from '../utils/course'

const fallbackLearningItems = [
  'تطوير مهاراتك الأكاديمية والمهنية',
  'اكتساب معرفة عملية قابلة للتطبيق',
  'تحسين فرصك في الدراسة أو العمل',
  'بناء خطة واضحة للتطور المستقبلي',
]

export default function CourseDetails() {
  const { slug } = useParams()
  const [course, setCourse] = useState<Course | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return

    const controller = new AbortController()

    async function fetchCourse() {
      try {
        setIsLoading(true)
        setError('')
        setNotFound(false)

        const response = await api.get<Course | { data?: Course }>(`/courses/${slug}`, {
          signal: controller.signal,
        })

        const item = extractItem(response.data)

        if (!item?.slug) {
          setNotFound(true)
          setCourse(null)
          return
        }

        setCourse(item)
      } catch (err) {
        if (axios.isCancel(err)) return

        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setNotFound(true)
          setCourse(null)
          return
        }

        setError('تعذر تحميل تفاصيل الدورة. يرجى المحاولة مرة أخرى.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCourse()

    return () => controller.abort()
  }, [slug])

  if (isLoading) return <CourseDetailsLoading />

  if (error) {
    return (
      <main className="bg-slate-50 px-4 pb-20 pt-32 sm:px-6 lg:px-8">
        <StateMessage type="error" title="حدث خطأ" message={error} />
      </main>
    )
  }

  if (notFound || !course) {
    return (
      <main className="bg-slate-50 px-4 pb-20 pt-32 sm:px-6 lg:px-8">
        <StateMessage
          type="empty"
          title="الدورة غير موجودة"
          message="لم نتمكن من العثور على هذه الدورة. يمكنك الرجوع إلى صفحة الدورات واختيار دورة أخرى."
        />
      </main>
    )
  }

  const isOnline = Boolean(course.is_online)
  const isFree = course.type === 'free'
  const courseType = isOnline ? 'أونلاين' : 'حضوري'
  const calculatedDuration = formatDuration(course.start_date, course.end_date)
  const displayDuration = course.duration || calculatedDuration
  const priceLabel = isFree ? 'مجانية' : formatPrice(course.price)
  const registerLabel = isFree ? 'سجل الآن مجاناً' : 'سجل الآن'
  const locationLabel = isOnline ? 'أونلاين' : course.location || 'غير محدد'
  const statusLabel = course.status === 'active' ? 'متاحة للتسجيل' : course.status || 'غير محدد'
  const isSingleDay =
    course.start_date &&
    course.end_date &&
    new Date(course.start_date).toDateString() === new Date(course.end_date).toDateString()
  const programTypeLabel = isSingleDay ? 'ورشة / لقاء واحد' : 'دورة متعددة الأيام'

  const instructorName =
    course.instructor?.name || course.instructor_name || 'مدرب معتمد من EMC'

  const detailRows = [
    { icon: Monitor, label: 'نوع الدورة', value: courseType },
    {
      icon: CalendarDays,
      label: 'نوع البرنامج',
      value: programTypeLabel,
    },
    { icon: Clock3, label: 'المدة', value: displayDuration || 'غير محدد' },
    {
      icon: BookOpen,
      label: 'عدد الساعات',
      value: course.training_hours ? `${course.training_hours} ساعة تدريبية` : 'غير محدد',
    },
    {
      icon: Target,
      label: 'الفئة المستهدفة',
      value: course.target_audience || 'غير محدد',
    },
    {
      icon: Languages,
      label: 'لغة الدورة',
      value: course.language || 'غير محدد',
    },
    {
      icon: Award,
      label: 'المستوى',
      value: course.level || 'غير محدد',
    },
    {
      icon: CalendarDays,
      label: 'تاريخ البداية',
      value: formatSingleDate(course.start_date),
    },
    {
      icon: CalendarDays,
      label: 'تاريخ النهاية',
      value: formatSingleDate(course.end_date),
    },
    {
      icon: CalendarDays,
      label: 'أيام الدراسة',
      value: course.study_days || 'غير محدد',
    },
    {
      icon: Clock3,
      label: 'الوقت',
      value: course.study_time || 'غير محدد',
    },
  ...(!isOnline
    ? [
        {
          icon: Monitor,
          label: 'المكان',
          value: course.location || 'غير محدد',
        },
      ]
    : []),
    {
      icon: Users,
      label: 'عدد المقاعد',
      value: course.capacity ? `${course.capacity} مقعد` : 'غير محدد',
    },
    {
      icon: BadgeCheck,
      label: 'الشهادة',
      value: course.certificate || 'غير محدد',
    },
    {
      icon: BadgeCheck,
      label: 'حالة الدورة',
      value: statusLabel,
    },
  ]

  const learningItems =
    course.features && course.features.length > 0
      ? course.features.map((feature) => feature.title)
      : fallbackLearningItems

  return (
    <main className="bg-slate-50 px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <motion.div
        className="mx-auto max-w-7xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45 }}
      >
        <Breadcrumb courseTitle={course.title} />

        <motion.section
          className="mt-8 grid gap-8 rounded-2xl bg-white p-5 shadow-2xl shadow-slate-200/80 ring-1 ring-slate-100 sm:p-7 lg:grid-cols-[1.05fr_0.95fr] lg:p-9"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <div className="order-2 text-right lg:order-1">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-sky-50 px-4 py-2 text-sm font-black text-customBlue">
              <GraduationCap size={17} />
              تفاصيل البرنامج التدريبي
            </span>

            <h1 className="text-3xl font-black leading-[1.3] text-deepBlue sm:text-4xl lg:text-5xl">
              {course.title}
            </h1>

            <p className="mt-5 text-lg leading-9 text-slate-600">
              {course.short_description ||
                'برنامج تدريبي عملي يساعدك على تطوير مهاراتك بثقة من خلال محتوى واضح وتطبيقات واقعية.'}
            </p>

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <InfoTile icon={Monitor} label="نوع الدورة" value={courseType} />
              <InfoTile icon={CalendarDays} label="نوع البرنامج" value={programTypeLabel} />
              <InfoTile icon={Clock3} label="المدة" value={displayDuration || 'غير محدد'} />
              <InfoTile icon={BriefcaseBusiness} label="المدرب" value={instructorName} />
              <InfoTile icon={Award} label="السعر" value={priceLabel} accent={isFree ? 'blue' : 'orange'} />
              {!isOnline && (
                <InfoTile icon={Monitor} label="المكان" value={locationLabel} />
              )}
              <InfoTile
                icon={Users}
                label="المقاعد المتاحة"
                value={course.capacity ? `${course.capacity} مقعد` : 'مقاعد محدودة'}
              />
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <motion.div whileHover={{ scale: 1.04 }}>
                <Link
                  to={`/courses/${course.slug}/register`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-customOrange px-7 py-4 font-extrabold text-white shadow-lg shadow-orange-100 sm:w-auto"
                >
                  <UserPlus size={20} />
                  {registerLabel}
                </Link>
              </motion.div>

              <motion.button
                type="button"
                whileHover={{ scale: 1.04 }}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-customBlue px-7 py-4 font-extrabold text-customBlue transition hover:bg-sky-50"
              >
                <Share2 size={20} />
                شارك الدورة
              </motion.button>
            </div>
          </div>

          <motion.div
            className="order-1 lg:order-2"
            whileHover={{ scale: 1.015 }}
            transition={{ duration: 0.35 }}
          >
            <div className="relative h-[360px] overflow-hidden rounded-2xl shadow-xl sm:h-[430px]">
              <img
                src={course.course_image || courseImages[1]}
                alt={course.title}
                className="h-full w-full object-cover transition duration-700 hover:scale-105"
              />
              <div className="absolute inset-0 bg-deepBlue/20" />

              <span
                className={`absolute right-5 top-5 rounded-full px-5 py-2 text-sm font-black text-white ${
                  isFree ? 'bg-customBlue' : 'bg-customOrange'
                }`}
              >
                {isFree ? 'مجانية' : 'مدفوعة'}
              </span>
            </div>
          </motion.div>
        </motion.section>

        <section className="mt-10 grid gap-8 lg:grid-cols-[1fr_380px]">
          <motion.article
            className="rounded-2xl bg-white p-6 text-right shadow-xl shadow-slate-200/70 ring-1 ring-slate-100 sm:p-8"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
          >
            <CardHeading>تفاصيل الدورة</CardHeading>

            <p className="mt-7 whitespace-pre-line text-lg leading-10 text-slate-600">
              {course.description ||
                'هذا البرنامج مصمم لمساعدتك على تطوير مهاراتك الأكاديمية والمهنية من خلال محتوى عملي وتدريبات تفاعلية تناسب أهدافك.'}
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {detailRows.map((item) => (
                <DetailRow key={item.label} {...item} />
              ))}
            </div>
          </motion.article>

          <aside className="grid gap-8">
            <motion.article
              className="rounded-2xl bg-white p-6 text-right shadow-xl shadow-slate-200/70 ring-1 ring-slate-100"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.5 }}
            >
              <CardHeading>ماذا ستتعلم</CardHeading>

              <ul className="mt-7 grid gap-4">
                {learningItems.map((item, index) => (
                  <li
                    key={`${item}-${index}`}
                    className="flex items-start gap-3 text-sm font-bold leading-7 text-slate-600"
                  >
                    <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-customBlue" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.article>

            <motion.article
              className="rounded-2xl bg-white p-6 text-right shadow-xl shadow-slate-200/70 ring-1 ring-slate-100"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.5, delay: 0.08 }}
            >
              <CardHeading>المدرب</CardHeading>

              <div className="mt-7 flex items-center gap-4">
                <img
                  src={
                    course.instructor?.image ||
                    'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80'
                  }
                  alt={instructorName}
                  className="h-20 w-20 rounded-full object-cover ring-4 ring-sky-50"
                />

                <div>
                  <h3 className="text-xl font-black text-deepBlue">{instructorName}</h3>
                  <p className="mt-1 text-sm font-bold text-customBlue">
                    {course.instructor?.title || 'مدرب محترف للتدريب المهني'}
                  </p>
                </div>
              </div>

              <p className="mt-5 leading-8 text-slate-600">
                {course.instructor?.bio ||
                  'مدرب متخصص في تطوير المهارات المهنية والتقنية، يقدم برامج واقعية وتركيزاً على التطبيق العملي والدعم الشخصي.'}
              </p>

              <motion.div whileHover={{ scale: 1.03 }} className="mt-6">
                <Link
                  to="/courses"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-deepBlue px-5 py-3 text-sm font-extrabold text-white"
                >
                  عرض جميع الدورات
                  <ArrowLeft size={18} />
                </Link>
              </motion.div>
            </motion.article>
          </aside>
        </section>

        <CourseDetailsCTA course={course} registerLabel={registerLabel} />
      </motion.div>
    </main>
  )
}

function CourseDetailsLoading() {
  return (
    <main className="bg-slate-50 px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="h-6 w-64 animate-pulse rounded bg-slate-200" />
        <div className="mt-8 grid gap-8 rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-100 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-5">
            <div className="h-10 animate-pulse rounded bg-slate-200" />
            <div className="h-24 animate-pulse rounded bg-slate-100" />
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          </div>
          <div className="h-[430px] animate-pulse rounded-2xl bg-slate-200" />
        </div>
      </div>
    </main>
  )
}

function Breadcrumb({ courseTitle }: { courseTitle: string }) {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-500">
      <Link to="/" className="transition hover:text-customBlue">
        الرئيسية
      </Link>
      <span className="text-customOrange">&gt;</span>
      <Link to="/courses" className="transition hover:text-customBlue">
        الدورات
      </Link>
      <span className="text-customOrange">&gt;</span>
      <span className="text-deepBlue">{courseTitle}</span>
    </nav>
  )
}

function InfoTile({
  icon: Icon,
  label,
  value,
  accent = 'blue',
}: {
  icon: IconComponent
  label: string
  value: string
  accent?: 'blue' | 'orange'
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <div className="flex items-center gap-3">
        <span
          className={`grid h-11 w-11 place-items-center rounded-lg ${
            accent === 'orange' ? 'bg-orange-50 text-customOrange' : 'bg-sky-50 text-customBlue'
          }`}
        >
          <Icon size={21} />
        </span>

        <div>
          <span className="block text-xs font-black text-slate-400">{label}</span>
          <strong
            className={`mt-1 block text-base font-black ${
              accent === 'orange' ? 'text-customOrange' : 'text-deepBlue'
            }`}
          >
            {value}
          </strong>
        </div>
      </div>
    </div>
  )
}

function CardHeading({ children }: { children: string }) {
  return (
    <div>
      <h2 className="text-2xl font-black text-deepBlue">{children}</h2>
      <span className="mt-3 block h-1 w-16 rounded-full bg-customOrange" />
    </div>
  )
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: IconComponent
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white text-customBlue shadow-sm">
        <Icon size={20} />
      </span>

      <div>
        <span className="block text-xs font-black text-slate-400">{label}</span>
        <strong className="mt-1 block text-sm font-black text-deepBlue">{value}</strong>
      </div>
    </div>
  )
}

function CourseDetailsCTA({
  course,
  registerLabel,
}: {
  course: Course
  registerLabel: string
}) {
  return (
    <motion.section
      className="mt-10 grid items-center gap-8 overflow-hidden rounded-2xl bg-gradient-to-l from-deepBlue via-[#1c4567] to-[#162334] px-6 py-9 text-white shadow-2xl sm:px-10 lg:grid-cols-[1fr_360px]"
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.5 }}
    >
      <div className="text-right">
        <h2 className="text-3xl font-black leading-tight sm:text-4xl">
          ابدأ رحلتك التعليمية الآن
        </h2>

        <p className="mt-4 text-lg leading-9 text-slate-200">
          اختر الدورة المناسبة لك وابدأ تطوير مهاراتك اليوم.
        </p>

        <div className="mt-7 flex flex-col gap-4 sm:flex-row">
          <motion.div whileHover={{ scale: 1.04 }}>
            <Link
              to={`/courses/${course.slug}/register`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-customOrange px-7 py-4 font-extrabold text-white sm:w-auto"
            >
              <UserPlus size={20} />
              {registerLabel}
            </Link>
          </motion.div>

          <motion.div whileHover={{ scale: 1.04 }}>
            <Link
              to="/courses"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-customBlue px-7 py-4 font-extrabold text-white sm:w-auto"
            >
              استكشف جميع الدورات
              <ArrowLeft size={20} />
            </Link>
          </motion.div>
        </div>
      </div>

      <img
        src="https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=900&q=85"
        alt=""
        className="h-72 w-full rounded-2xl object-cover shadow-2xl"
      />
    </motion.section>
  )
}