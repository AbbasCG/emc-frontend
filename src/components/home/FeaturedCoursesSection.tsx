import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { BookOpen } from 'lucide-react'
import ArrowLeftIcon from '@/components/ui/ArrowLeftIcon'
import { useTranslation } from 'react-i18next'
import HomeCourseCard from './HomeCourseCard'
import type { Course } from '../../types'
import { extractCoursesList, fetchCoursesFromApi } from '../../api/coursesApi.public'
import apiClient from '@/api/axios'
import { resolveCourseIsEnded } from '@/utils/courseEnded'
import { staggerContainer } from '@/utils/animations'

type TierTabId = 'all' | 'workshops' | 'courses' | 'paths'

interface TierTab {
  id: TierTabId
  label: string
  sublabel: string
}

const TIER_TABS: TierTab[] = [
  { id: 'all', label: 'جميع البرامج', sublabel: 'المنظومة الكاملة' },
  { id: 'workshops', label: 'ورش عمل مباشرة', sublabel: 'المستوى 0: مجانية وسريعة' },
  { id: 'courses', label: 'دورات تخصصية', sublabel: 'المستوى 1: تعميق مهاري' },
  { id: 'paths', label: 'مسارات التأهيل الشامل', sublabel: 'المستوى 2: تمكين معتمد' },
]

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
export function sortFeaturedPrograms(courses: Course[]): Course[] {
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

function matchTier(c: Course, tier: TierTabId): boolean {
  if (tier === 'all') return true

  const title = (c.title || '').toLowerCase()
  const rawCatalogType = (c as Record<string, unknown>).catalog_type as string | undefined
  const kind = ((c.program_kind || c.program_type || rawCatalogType || '') as string).toLowerCase()
  const hours = Number(c.training_hours || 0)

  if (tier === 'workshops') {
    return (
      kind === 'workshop' ||
      title.includes('ورشة') ||
      title.includes('ندوة') ||
      (hours > 0 && hours <= 6)
    )
  }

  if (tier === 'paths') {
    return (
      Boolean(c.learning_path) ||
      Boolean(c.is_part_of_learning_path) ||
      kind === 'path' ||
      title.includes('مسار') ||
      title.includes('دبلوم') ||
      title.includes('تأهيل') ||
      hours >= 40
    )
  }

  if (tier === 'courses') {
    const isWorkshop =
      kind === 'workshop' || title.includes('ورشة') || title.includes('ندوة') || (hours > 0 && hours <= 6)
    const isPath =
      Boolean(c.learning_path) ||
      Boolean(c.is_part_of_learning_path) ||
      kind === 'path' ||
      title.includes('مسار') ||
      title.includes('دبلوم') ||
      title.includes('تأهيل') ||
      hours >= 40

    return !isWorkshop && !isPath
  }

  return true
}

// Skeleton screen matching the 3-second card anatomy
function CardSkeleton() {
  return (
    <div className="flex animate-pulse flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-32 rounded-lg bg-slate-200" />
          <div className="h-6 w-16 rounded-lg bg-slate-100" />
        </div>
        <div className="flex items-start gap-4 mb-4">
          <div className="aspect-video w-24 shrink-0 rounded-2xl bg-slate-200 sm:w-32" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-20 rounded bg-slate-100" />
            <div className="h-5 w-4/5 rounded bg-slate-200" />
            <div className="h-3 w-1/2 rounded bg-slate-100" />
          </div>
        </div>
        <div className="h-12 rounded-xl bg-slate-100 mb-4" />
        <div className="grid grid-cols-3 gap-2 py-2">
          <div className="h-7 rounded-lg bg-slate-100" />
          <div className="h-7 rounded-lg bg-slate-100" />
          <div className="h-7 rounded-lg bg-slate-100" />
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-slate-100">
        <div className="h-11 rounded-xl bg-slate-200" />
      </div>
    </div>
  )
}

export default function FeaturedCoursesSection() {
  const { t } = useTranslation()
  const [courses, setCourses] = useState<Course[]>([])
  const [activeTier, setActiveTier] = useState<TierTabId>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetchAllFeaturedPrograms()
      .then((list) => {
        if (!active) return
        setCourses(list)
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

  // Calculate counts per tier tab
  const counts = useMemo(() => {
    return {
      all: courses.length,
      workshops: courses.filter((c) => matchTier(c, 'workshops')).length,
      courses: courses.filter((c) => matchTier(c, 'courses')).length,
      paths: courses.filter((c) => matchTier(c, 'paths')).length,
    }
  }, [courses])

  // Filter by active tier, then apply enterprise ranking (upcoming first, newest, ended last)
  const displayedCourses = useMemo(() => {
    const filtered = courses.filter((c) => matchTier(c, activeTier))
    const sorted = sortFeaturedPrograms(filtered)
    return sorted.slice(0, 8)
  }, [courses, activeTier])

  return (
    <section
      dir="rtl"
      className="relative overflow-hidden border-y border-deepBlue/[0.05] bg-paper px-4 py-16 sm:px-6 lg:px-10 lg:py-24"
    >
      {/* Decorative ambient orb */}
      <div
        aria-hidden
        className="animate-soft-float pointer-events-none absolute -right-32 -top-32 h-[26rem] w-[26rem] rounded-full bg-customBlue/10 blur-3xl"
      />
      <span aria-hidden className="emc-ghost-num absolute -top-5 left-4 text-[7rem] sm:text-[10rem]">
        01
      </span>

      <div className="relative mx-auto max-w-[1540px]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end"
        >
          <div className="text-right">
            <span className="emc-eyebrow">{t('home.featured.eyebrow')}</span>
            <h2 className="emc-title-arc mt-3 font-display text-2xl font-black tracking-tight text-deepBlue sm:text-3xl lg:text-4xl">
              {t('home.featured.title')}
            </h2>
            <p className="mt-2 text-xs font-semibold text-ink-400 sm:text-sm">
              برامج تدريبية مرتبة زمنياً: الفعاليات والورش القادمة والمتاحة أولاً، والبرامج المنتهية في الأرشيف
            </p>
          </div>

          <Link to="/courses" className="emc-cta-line shrink-0 text-sm">
            {t('home.featured.viewAll')}
            <ArrowLeftIcon size={15} />
          </Link>
        </motion.div>

        {/* 3-Tier Hierarchy Filter Tabs with Badges */}
        <div className="mb-8 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex items-center gap-2 min-w-max border-b border-line pb-3">
            {TIER_TABS.map((tab) => {
              const isSelected = activeTier === tab.id
              const count = counts[tab.id]

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTier(tab.id)}
                  className={`group relative flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all sm:text-sm ${
                    isSelected
                      ? 'bg-deepBlue text-white shadow-md'
                      : 'bg-paper2 text-ink-500 hover:bg-slate-200/70 hover:text-deepBlue'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black tabular-nums transition-colors ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-300/60 text-ink-500 group-hover:bg-slate-300'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Body grid with CardSkeleton */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : displayedCourses.length > 0 ? (
          <motion.div
            key={activeTier}
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6"
          >
            {displayedCourses.map((course, i) => (
              <div key={course.id}>
                <HomeCourseCard course={course} index={i} />
              </div>
            ))}
          </motion.div>
        ) : (
          <div className="py-14 text-center">
            <div aria-hidden className="emc-hairline mb-10" />
            <BookOpen size={36} className="mx-auto text-customBlue/30" aria-hidden />
            <p className="mt-3 text-sm font-black text-deepBlue">لا توجد برامج متاحة في هذا التصنيف حالياً</p>
            <p className="mt-1 text-xs text-ink-400">تابعنا أو اشترك لتصلك التحديثات فور إطلاق برامج جديدة</p>
            <Link to="/courses" className="emc-cta-line mt-4 text-xs">
              {t('home.featured.emptyCta')}
            </Link>
            <div aria-hidden className="emc-hairline mt-10" />
          </div>
        )}
      </div>
    </section>
  )
}
