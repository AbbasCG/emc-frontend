import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { ChevronLeft, Route } from 'lucide-react'
import PublicSeo from '@/components/public/PublicSeo'
import Skeleton from '@/components/ui/Skeleton'
import { useAuth } from '@/contexts/AuthContext'
import {
  fetchPublicLearningPaths,
  fetchStudentLearningPaths,
  type LearningPath,
} from '@/api/learningPathsApi'
import { normalizeRole } from '@/utils/dashboardAccess'
import { formatPathPrice } from './learningPathDisplay'
import LearningPathsHero from './LearningPathsHero'
import LearningPathsFilterBar from './LearningPathsFilterBar'
import LearningPathJourneyCard from './LearningPathJourneyCard'

export default function LearningPathsPage() {
  const { isAuthenticated, user } = useAuth()
  const [paths, setPaths] = useState<LearningPath[]>([])
  const [meta, setMeta] = useState({ total: 0, current_page: 1, last_page: 1, per_page: 12 })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [enrolledIds, setEnrolledIds] = useState<Set<number>>(new Set())

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [level, setLevel] = useState('all')
  const [priceFilter, setPriceFilter] = useState('all')
  const [featuredFilter, setFeaturedFilter] = useState('all')
  const [enrollmentFilter, setEnrollmentFilter] = useState('all')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(t)
  }, [search])

  // Re-arm the loading state during render when the query changes (react.dev "adjusting
  // state when a prop changes"). On mount the effect only re-set the already-initial
  // values, so seeding `seen` with the current query keeps behaviour identical.
  const [seenQuery, setSeenQuery] = useState({ debouncedSearch, level, featuredFilter, page })
  if (
    seenQuery.debouncedSearch !== debouncedSearch ||
    seenQuery.level !== level ||
    seenQuery.featuredFilter !== featuredFilter ||
    seenQuery.page !== page
  ) {
    setSeenQuery({ debouncedSearch, level, featuredFilter, page })
    setLoading(true)
    setLoadError(false)
  }

  useEffect(() => {
    let cancelled = false

    void fetchPublicLearningPaths({
      search: debouncedSearch || undefined,
      level: level !== 'all' ? level : undefined,
      featured: featuredFilter === 'featured' ? true : undefined,
      page,
      per_page: 100,
    })
      .then((res) => {
        if (cancelled) return
        setPaths(res.data)
        setMeta(res.meta)
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [debouncedSearch, level, featuredFilter, page])

  // Clearing the enrolled set on sign-out / role change is a state adjustment, not an
  // effect — do it during render for the same reason as above.
  const viewerRole = user?.role
  const [seenViewer, setSeenViewer] = useState({ isAuthenticated, viewerRole })
  if (seenViewer.isAuthenticated !== isAuthenticated || seenViewer.viewerRole !== viewerRole) {
    setSeenViewer({ isAuthenticated, viewerRole })
    if (!isAuthenticated || normalizeRole(viewerRole) !== 'student') setEnrolledIds(new Set())
  }

  useEffect(() => {
    if (!isAuthenticated || normalizeRole(user?.role) !== 'student') return
    let alive = true
    void fetchStudentLearningPaths().then((rows) => {
      if (!alive) return
      setEnrolledIds(new Set(rows.map((r) => r.learning_path.id)))
    })
    return () => {
      alive = false
    }
  }, [isAuthenticated, user?.role])

  const levelOptions = useMemo(() => {
    const present = new Set(paths.map((p) => p.level?.toLowerCase()).filter(Boolean))
    const opts = [{ value: 'all', label: 'كل المستويات' }]
    const map: Record<string, string> = {
      beginner: 'مبتدئ',
      intermediate: 'متوسط',
      advanced: 'متقدم',
    }
    for (const key of ['beginner', 'intermediate', 'advanced'] as const) {
      if (present.has(key)) opts.push({ value: key, label: map[key] })
    }
    return opts
  }, [paths])

  const filteredPaths = useMemo(() => {
    return paths.filter((path) => {
      if (priceFilter === 'free') {
        const p = formatPathPrice(path)
        if (!p.hasPrice || !p.isFree) return false
      }
      if (priceFilter === 'paid') {
        const p = formatPathPrice(path)
        if (!p.hasPrice || p.isFree) return false
      }
      if (enrollmentFilter === 'open' && !path.enrollment_open) return false
      if (enrollmentFilter === 'closed' && path.enrollment_open) return false
      return true
    })
  }, [paths, priceFilter, enrollmentFilter])

  const heroStats = useMemo(() => {
    const openCount = paths.filter((p) => p.enrollment_open).length
    const featuredCount = paths.filter((p) => p.is_featured).length
    return { openCount, featuredCount }
  }, [paths])

  const hasActiveFilters =
    level !== 'all' || priceFilter !== 'all' || featuredFilter !== 'all' || enrollmentFilter !== 'all'

  return (
    <main className="overflow-x-hidden bg-paper" dir="rtl">
      <PublicSeo
        title="المسارات التعليمية"
        description="مسارات تعلم متكاملة من EMC — دورات مرتبة، شهادات، وتوجيه مهني بالعربية."
        path="/learning-paths"
      />

      <LearningPathsHero
        onSearch={(q) => {
          setSearch(q)
          setPage(1)
        }}
        totalPaths={meta.total || paths.length}
        openCount={heroStats.openCount}
        featuredCount={heroStats.featuredCount}
      />

      <LearningPathsFilterBar
        activeLevel={level}
        onLevelChange={(v) => {
          setLevel(v)
          setPage(1)
        }}
        levelOptions={levelOptions}
        activePrice={priceFilter}
        onPriceChange={(v) => setPriceFilter(v)}
        activeFeatured={featuredFilter}
        onFeaturedChange={(v) => {
          setFeaturedFilter(v)
          setPage(1)
        }}
        activeEnrollment={enrollmentFilter}
        onEnrollmentChange={setEnrollmentFilter}
        resultCount={filteredPaths.length}
        totalCount={paths.length}
        loadError={loadError}
        apiEmpty={!loading && paths.length === 0}
      />

      {/* ── PATHS — full-width alternating editorial bands ─────────────────── */}
      <section id="paths-catalog">
        {loading ?
          <div aria-busy="true" aria-label="جارٍ تحميل المسارات">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={i % 2 === 1 ? 'bg-brand-50/30' : 'bg-paper'}>
                <div className="mx-auto grid max-w-7xl items-start gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,400px)_1fr] lg:gap-14 lg:px-8 lg:py-16">
                  <Skeleton className="emc-page-clip aspect-[4/3] w-full" />
                  <div>
                    <Skeleton variant="text" className="h-3 w-1/4" />
                    <Skeleton variant="text" className="mt-4 h-8 w-3/5" />
                    <Skeleton variant="text" className="mt-4 h-4 w-4/5" />
                    <div className="mt-8 space-y-4">
                      {Array.from({ length: 3 }).map((_, s) => (
                        <div key={s} className="flex items-center gap-3.5">
                          <Skeleton variant="circular" width={28} height={28} />
                          <Skeleton variant="text" className="h-3 w-1/2" />
                        </div>
                      ))}
                    </div>
                    <div className="mt-8 flex items-end justify-between gap-6">
                      <Skeleton className="h-9 w-24 rounded-lg" />
                      <Skeleton className="h-11 w-40 rounded-xl" />
                    </div>
                  </div>
                </div>
                <div className="emc-hairline" aria-hidden />
              </div>
            ))}
          </div>
        : filteredPaths.length === 0 ?
          <div className="mx-auto flex w-full max-w-xl flex-col items-center px-6 py-24 text-center">
            <Route className="mb-6 h-10 w-10 text-customBlue" aria-hidden />
            <h2 className="font-display text-2xl font-black tracking-tight text-deepBlue">لا توجد مسارات مطابقة</h2>
            <p className="mt-3 max-w-md text-sm leading-7 text-muted-500">
              جرّب تغيير معايير البحث أو تصفح الدورات المتاحة
            </p>
            <div className="mt-8 flex flex-col items-center gap-5 sm:flex-row sm:gap-8">
              <Link
                to="/courses"
                className="inline-flex items-center gap-2 rounded-xl bg-customBlue px-6 py-3 text-sm font-black text-white transition-colors duration-200 hover:bg-brand-600"
              >
                تصفح الدورات
              </Link>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setLevel('all')
                    setPriceFilter('all')
                    setFeaturedFilter('all')
                    setEnrollmentFilter('all')
                    setPage(1)
                  }}
                  className="emc-cta-line text-sm"
                >
                  إعادة تعيين الفلاتر
                </button>
              )}
            </div>
          </div>
        : <>
            <p className="mx-auto max-w-7xl px-4 pb-2 pt-8 text-sm font-semibold text-muted-500 sm:px-6 lg:px-8">
              <span dir="ltr" className="font-black tabular-nums text-deepBlue">
                {String(filteredPaths.length)}
              </span>{' '}
              مسار
              {filteredPaths.length !== paths.length ?
                ` (من ${String(paths.length)} في هذه الصفحة)`
              : ''}
            </p>

            <div>
              {filteredPaths.map((path, i) => (
                <LearningPathJourneyCard
                  key={path.id}
                  path={path}
                  index={i}
                  enrolled={enrolledIds.has(path.id)}
                />
              ))}
            </div>

            {meta.last_page > 1 && (
              <div className="mx-auto flex max-w-7xl items-center justify-center gap-6 px-4 py-10 sm:px-6 lg:px-8">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="text-sm font-black text-customBlue transition-colors duration-200 hover:text-brand-600 disabled:cursor-not-allowed disabled:text-muted-300"
                >
                  السابق
                </button>
                <span dir="ltr" className="text-sm font-semibold tabular-nums text-muted-500">
                  {String(page)} / {String(meta.last_page)}
                </span>
                <button
                  type="button"
                  disabled={page === meta.last_page}
                  onClick={() => setPage((p) => p + 1)}
                  className="text-sm font-black text-customBlue transition-colors duration-200 hover:text-brand-600 disabled:cursor-not-allowed disabled:text-muted-300"
                >
                  التالي
                </button>
              </div>
            )}
          </>
        }
      </section>

      {/* ── Advisor band — full-bleed dawn field, editorial (no rounded box) ── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.5 }}
        className="emc-dawn"
      >
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-4 py-16 text-right text-white sm:px-6 lg:flex-row lg:items-center lg:px-8">
          <div>
            <h2 className="font-display text-3xl font-black tracking-tight sm:text-4xl">غير متأكد من مسارك؟</h2>
            <p className="mt-4 max-w-xl text-lg leading-9 text-ice/85">
              تواصل معنا وسيساعدك أحد مستشارينا في اختيار المسار الأنسب لأهدافك ومستواك الحالي.
            </p>
          </div>
          <Link
            to="/contact"
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-customOrange px-7 py-4 font-black text-white transition duration-200 hover:brightness-[1.03] sm:w-auto"
          >
            تواصل مع مستشار
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </Link>
        </div>
      </motion.section>
    </main>
  )
}
