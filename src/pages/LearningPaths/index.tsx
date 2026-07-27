import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { ChevronLeft, Route } from 'lucide-react'
import PublicSeo from '@/components/public/PublicSeo'
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

  return (
    <main className="overflow-x-hidden bg-slate-50" dir="rtl">
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

      <section id="paths-catalog" className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {loading ?
            <div className="space-y-6" aria-busy="true" aria-label="جارٍ تحميل المسارات">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                  <div className="h-5 w-1/3 animate-pulse rounded bg-slate-100" />
                  <div className="mt-4 h-3 w-full animate-pulse rounded bg-slate-100" />
                  <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-slate-100" />
                  <div className="mt-6 flex gap-3">
                    <div className="h-9 w-28 animate-pulse rounded-xl bg-slate-100" />
                    <div className="h-9 w-20 animate-pulse rounded-xl bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          : filteredPaths.length === 0 ?
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white py-20 text-center">
              <Route className="mb-4 h-12 w-12 text-slate-300" aria-hidden />
              <p className="text-lg font-black text-slate-600">لا توجد مسارات مطابقة</p>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                جرّب تغيير معايير البحث أو تصفح الدورات المتاحة
              </p>
              <Link
                to="/courses"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-customBlue px-6 py-3 text-sm font-black text-white"
              >
                تصفح الدورات
              </Link>
            </div>
          : <>
              <p className="mb-6 text-sm font-semibold text-slate-500">
                {String(filteredPaths.length)} مسار
                {filteredPaths.length !== paths.length ?
                  ` (من ${String(paths.length)} في هذه الصفحة)`
                : ''}
              </p>
              <div className="space-y-6">
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
                <div className="mt-10 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-customBlue hover:text-customBlue disabled:opacity-40"
                  >
                    السابق
                  </button>
                  <span className="text-sm text-slate-500">
                    {String(page)} / {String(meta.last_page)}
                  </span>
                  <button
                    type="button"
                    disabled={page === meta.last_page}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-customBlue hover:text-customBlue disabled:opacity-40"
                  >
                    التالي
                  </button>
                </div>
              )}
            </>
          }
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 rounded-2xl bg-gradient-to-l from-deepBlue via-[#1c4567] to-[#162334] p-8 text-right text-white shadow-2xl sm:p-10 lg:flex-row lg:items-center"
        >
          <div>
            <h2 className="text-3xl font-black sm:text-4xl">غير متأكد من مسارك؟</h2>
            <p className="mt-4 max-w-xl text-lg leading-9 text-slate-300">
              تواصل معنا وسيساعدك أحد مستشارينا في اختيار المسار الأنسب لأهدافك ومستواك الحالي.
            </p>
          </div>
          <Link
            to="/contact"
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-customOrange px-7 py-4 font-black text-white transition hover:bg-[#d4832e] sm:w-auto"
          >
            تواصل مع مستشار
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </Link>
        </motion.div>
      </section>
    </main>
  )
}
