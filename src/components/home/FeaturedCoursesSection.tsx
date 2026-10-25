import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useInView } from 'framer-motion'
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react'
import HomeCourseCard from './HomeCourseCard'
import type { Course } from '../../types'
import { extractCoursesList, fetchCoursesFromApi } from '../../api/coursesApi.public'
import apiClient from '@/api/axios'
import { resolveCourseIsEnded } from '@/utils/courseEnded'
import { staggerContainer } from '@/utils/animations'

function useItemsPerPage() {
  const [n, setN] = useState(3)
  useEffect(() => {
    const update = () =>
      setN(window.innerWidth < 640 ? 1 : window.innerWidth < 1024 ? 2 : 3)
    update()
    window.addEventListener('resize', update, { passive: true })
    return () => window.removeEventListener('resize', update)
  }, [])
  return n
}

/**
 * دالة مساعدة لتحويل النصوص التاريخية إلى وقت رقمي موثوق (Timestamp)
 */
function safeTimestamp(val: unknown): number | null {
  if (!val || typeof val !== 'string') return null
  const ts = Date.parse(val)
  return Number.isFinite(ts) ? ts : null
}

/**
 * فحص دقيق وشامل لانتهاء الدورة أو الورشة (Bulletproof IsEnded check)
 */
function isProgramEnded(c: Course): boolean {
  if (resolveCourseIsEnded(c)) return true

  // للورش التي حُدد لها تاريخ بدء فقط وتجاوز موعدها الحالي بأكثر من 24 ساعة
  const isWorkshop = c.program_type === 'workshop' || Boolean((c as Record<string, unknown>).is_workshop)
  if (isWorkshop && c.start_date) {
    const startTs = safeTimestamp(c.start_date)
    if (startTs != null && startTs + 24 * 60 * 60 * 1000 < Date.now()) {
      return true
    }
  }

  return false
}

/**
 * جلب الدورات وورش العمل معاً بالتوازي لعرضها في برامج الصفحة الرئيسية
 */
async function fetchAllFeaturedPrograms(): Promise<Course[]> {
  const [coursesRes, workshopsRes] = await Promise.allSettled([
    fetchCoursesFromApi(),
    apiClient
      .get('/workshops', { params: { per_page: 50 }, skipErrorToast: true })
      .then((res) => extractCoursesList(res.data))
      .catch(() => [] as Course[]),
  ])

  const listA = coursesRes.status === 'fulfilled' ? coursesRes.value : []
  const listB = workshopsRes.status === 'fulfilled' ? workshopsRes.value : []

  // دمج البرامج وإزالة أي تكرار عبر الـ id والـ slug
  const map = new Map<string, Course>()
  for (const item of [...listA, ...listB]) {
    if (!item || !item.title) continue
    const key = item.id != null ? `id_${item.id}` : `slug_${item.slug}`
    if (!map.has(key)) {
      map.set(key, item)
    }
  }
  return Array.from(map.values())
}

/**
 * خوارزمية ترتيب البرامج الذكية للصفحة الرئيسية (Enterprise-Grade Ranking):
 * 1. الأولوية المطلقة للفعاليات والورش القادمة (تاريخ بدء مستقبلي): تُرتّب تصاعدياً (الأقرب موعداً أولاً).
 * 2. تليها البرامج والدورات المستمرة/المفتوحة للتسجيل: تُرتّب تنازلياً حسب الأحدث إضافة (id تنازلي).
 * 3. البرامج المنتهية تُدفع إلى النهاية تماماً ولا تظهر إلا لسد الفراغ عند قلة البرامج النشطة.
 */
function sortFeaturedPrograms(courses: Course[]): Course[] {
  const now = Date.now()
  const todayBuffer = now - 24 * 60 * 60 * 1000

  const upcomingWithDate: Course[] = []
  const activeOpen: Course[] = []
  const ended: Course[] = []

  for (const c of courses) {
    if (isProgramEnded(c)) {
      ended.push(c)
      continue
    }

    const startTs = safeTimestamp(c.start_date)
    if (startTs != null && startTs >= todayBuffer) {
      upcomingWithDate.push(c)
    } else {
      activeOpen.push(c)
    }
  }

  // 1. الفعاليات القادمة: الأقرب بدءاً أولاً (Chronological Soonest)
  upcomingWithDate.sort((a, b) => {
    const timeA = safeTimestamp(a.start_date) ?? Number.POSITIVE_INFINITY
    const timeB = safeTimestamp(b.start_date) ?? Number.POSITIVE_INFINITY
    if (timeA !== timeB) return timeA - timeB
    return (Number(b.id) || 0) - (Number(a.id) || 0)
  })

  // 2. البرامج المفتوحة / المضافة حديثاً: الأحدث إضافةً أولاً (Newest Added First)
  activeOpen.sort((a, b) => {
    const idA = Number(a.id) || 0
    const idB = Number(b.id) || 0
    return idB - idA
  })

  // 3. البرامج المنتهية: الأحدث انتهاءً أولاً
  ended.sort((a, b) => {
    const endA = safeTimestamp(a.end_date) ?? 0
    const endB = safeTimestamp(b.end_date) ?? 0
    if (endA !== endB) return endB - endA
    return (Number(b.id) || 0) - (Number(a.id) || 0)
  })

  return [...upcomingWithDate, ...activeOpen, ...ended]
}

function CardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-[1.375rem] border border-slate-100 bg-white shadow-sm">
      <div className="aspect-[16/10] bg-gradient-to-br from-slate-200 to-slate-100" />
      <div className="space-y-3 p-5">
        <div className="h-4 w-4/5 rounded-lg bg-slate-200" />
        <div className="h-3 w-full rounded bg-slate-100" />
        <div className="h-3 w-3/5 rounded bg-slate-100" />
        <div className="mt-2 h-3 w-2/5 rounded bg-slate-100" />
        <div className="mt-3 h-11 rounded-xl bg-slate-200" />
      </div>
    </div>
  )
}

export default function FeaturedCoursesSection() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-60px' })
  const itemsPerPage = useItemsPerPage()
  const [page, setPage] = useState(0)

  useEffect(() => {
    let active = true
    fetchAllFeaturedPrograms()
      .then((list) => {
        if (!active) return
        setCourses(sortFeaturedPrograms(list).slice(0, 9))
      })
      .catch(() => {
        if (active) setCourses([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    setPage(0)
  }, [itemsPerPage])

  const totalPages = Math.max(1, Math.ceil(courses.length / itemsPerPage))
  const clamped = Math.min(page, totalPages - 1)
  const visible = courses.slice(clamped * itemsPerPage, (clamped + 1) * itemsPerPage)
  const from = clamped * itemsPerPage + 1
  const to = Math.min((clamped + 1) * itemsPerPage, courses.length)

  return (
    <section
      ref={sectionRef}
      dir="rtl"
      className="border-y border-deepBlue/[0.05] bg-white px-4 py-10 sm:px-6 lg:px-10 lg:py-14"
    >
      <div className="mx-auto max-w-[1540px]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mb-8 flex items-end justify-between gap-4"
        >
          <div className="text-right">
            <p className="text-xs font-black uppercase tracking-wider text-customBlue">
              الدورات المتاحة
            </p>
            <h2 className="mt-2 text-2xl font-black text-deepBlue sm:text-3xl">
              برامجنا المميّزة
            </h2>
            <span className="mt-3 block h-1 w-12 rounded-full bg-customOrange" />
          </div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} className="shrink-0">
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 rounded-2xl bg-deepBlue px-5 py-2.5 text-sm font-black text-white shadow transition hover:brightness-105"
            >
              عرض جميع الدورات
              <ArrowLeft size={15} aria-hidden />
            </Link>
          </motion.div>
        </motion.div>

        {/* Body */}
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : courses.length > 0 ? (
          <>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${clamped}-${itemsPerPage}`}
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
              >
                {visible.map((course, i) => (
                  <HomeCourseCard key={course.id} course={course} index={i} />
                ))}
              </motion.div>
            </AnimatePresence>

            {totalPages > 1 && (
              <>
                <div className="mt-8 flex items-center justify-center gap-3" dir="ltr">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={clamped === 0}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-deepBlue shadow-sm transition hover:border-customBlue/40 hover:bg-customBlue/5 disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label="السابق"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="flex gap-1.5">
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPage(i)}
                        aria-label={`صفحة ${String(i + 1)}`}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          i === clamped
                            ? 'w-7 bg-customBlue'
                            : 'w-2 bg-slate-300 hover:bg-slate-400'
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={clamped === totalPages - 1}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-deepBlue shadow-sm transition hover:border-customBlue/40 hover:bg-customBlue/5 disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label="التالي"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-2 text-center text-[11px] text-foreground/40" dir="rtl">
                  {from}–{to} من {courses.length} برنامج
                </p>
              </>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-deepBlue/[0.1] bg-slate-50 py-16 text-center">
            <BookOpen size={40} className="text-customBlue/30" aria-hidden />
            <p className="text-sm font-black text-deepBlue">البرامج تُحمَّل من الخادم</p>
            <Link to="/courses" className="text-xs font-black text-customBlue hover:underline">
              فتح الكتالوج
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
