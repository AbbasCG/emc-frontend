import { useEffect, useMemo, useState } from 'react'
import PublicSeo from '@/components/public/PublicSeo'
import { fetchCourses } from '@/services/coursesApi'
import type { CourseItem, CourseLevel } from '@/services/coursesApi'
import CoursesGrid from '@/pages/Courses/CoursesGrid'
import FilterBar from '@/pages/Courses/FilterBar'
import ProgramsHero from './ProgramsHero'
import ProgramsHelpCTA from './ProgramsHelpCTA'

export default function ProgramsPage() {
  const [allCourses, setAllCourses] = useState<CourseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  // Search with debounce
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Filters
  const [activePrice, setActivePrice] = useState('all')
  const [activeDelivery, setActiveDelivery] = useState('all')
  const [activeLevel, setActiveLevel] = useState<string>('all')
  const [activeAvailability, setActiveAvailability] = useState('all')
  const [activeLanguage, setActiveLanguage] = useState('all')
  const [activeInstructor, setActiveInstructor] = useState('all')
  const [activeCategory, setActiveCategory] = useState('all')
  const [sortBy, setSortBy] = useState('popular')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 280)
    return () => window.clearTimeout(t)
  }, [search])

  useEffect(() => {
    // `loading` already starts as `true`, so this mount-only fetch never has to arm it.
    let alive = true
    fetchCourses()
      .then((res) => {
        if (alive) {
          // Only standalone courses — no workshops
          setAllCourses(res.data.filter((c) => c.catalog_type !== 'workshop'))
        }
      })
      .catch(() => {
        if (alive) {
          setAllCourses([])
          setLoadError(true)
        }
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const deliveryOptions = useMemo(() => {
    const labels = new Map<string, string>()
    for (const c of allCourses) {
      const ar =
        c.delivery_key === 'online'
          ? 'عن بُعد'
          : c.delivery_key === 'offline'
            ? 'حضوري'
            : c.delivery_key === 'hybrid'
              ? 'هجين'
              : c.delivery_label_ar
      labels.set(c.delivery_key, ar)
    }
    const opts = [{ value: 'all', label: 'كل الأنماط' }]
    for (const [k, v] of labels) opts.push({ value: k, label: v })
    return opts
  }, [allCourses])

  const levelOptions = useMemo(() => {
    const present = new Set(allCourses.map((c) => c.level))
    const ar: Record<CourseLevel, string> = {
      beginner: 'مبتدئ',
      intermediate: 'متوسط',
      advanced: 'متقدم',
    }
    const opts = [{ value: 'all', label: 'كل المستويات' }]
    ;(['beginner', 'intermediate', 'advanced'] as const).forEach((lv) => {
      if (present.has(lv)) opts.push({ value: lv, label: ar[lv] })
    })
    return opts
  }, [allCourses])

  const languageOptions = useMemo(() => {
    const langs = new Set<string>()
    for (const c of allCourses) if (c.language) langs.add(c.language)
    if (langs.size === 0) return []
    return [{ value: 'all', label: 'كل اللغات' }, ...[...langs].sort().map((l) => ({ value: l, label: l }))]
  }, [allCourses])

  const instructorOptions = useMemo(() => {
    const names = new Map<string, string>()
    for (const c of allCourses) {
      if (c.trainer.name) names.set(c.trainer.name, c.trainer.name)
    }
    if (names.size <= 1) return []
    return [
      { value: 'all', label: 'كل المدربين' },
      ...[...names.keys()].sort().map((n) => ({ value: n, label: n })),
    ]
  }, [allCourses])

  const categoryOptions = useMemo(() => {
    const cats = new Map<string, string>()
    for (const c of allCourses) cats.set(c.category_key, c.category_label)
    if (cats.size <= 1) return []
    return [
      { value: 'all', label: 'كل التصنيفات' },
      ...[...cats.entries()].sort((a, b) => a[1].localeCompare(b[1], 'ar')).map(([k, v]) => ({ value: k, label: v })),
    ]
  }, [allCourses])

  const filteredCourses = useMemo(() => {
    let result = [...allCourses]

    // Text search
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.short_description?.toLowerCase().includes(q) ||
          c.trainer.name.toLowerCase().includes(q) ||
          c.category_label.toLowerCase().includes(q) ||
          c.tags.some((t) => t.toLowerCase().includes(q)),
      )
    }

    // Price
    if (activePrice === 'free') result = result.filter((c) => c.is_free)
    else if (activePrice === 'paid') result = result.filter((c) => !c.is_free)

    // Delivery
    if (activeDelivery !== 'all') result = result.filter((c) => c.delivery_key === activeDelivery)

    // Level
    if (activeLevel !== 'all') result = result.filter((c) => c.level === activeLevel)

    // Language
    if (activeLanguage !== 'all') result = result.filter((c) => c.language === activeLanguage)

    // Instructor
    if (activeInstructor !== 'all') result = result.filter((c) => c.trainer.name === activeInstructor)

    // Category
    if (activeCategory !== 'all') result = result.filter((c) => c.category_key === activeCategory)

    // Availability
    if (activeAvailability === 'ended') result = result.filter((c) => c.is_ended)
    else if (activeAvailability === 'active') result = result.filter((c) => !c.is_ended)

    // Sort
    switch (sortBy) {
      case 'popular':
        result.sort((a, b) => {
          if (a.is_ended !== b.is_ended) return a.is_ended ? 1 : -1
          return b.registrations_count - a.registrations_count
        })
        break
      case 'newest':
        result.sort((a, b) => b.id - a.id)
        break
      case 'price_low':
        result.sort((a, b) => a.price - b.price)
        break
      case 'price_high':
        result.sort((a, b) => b.price - a.price)
        break
      case 'duration':
        result.sort((a, b) => a.duration_weeks - b.duration_weeks)
        break
      case 'soonest': {
        const ts = (x: CourseItem) =>
          x.start_date ? new Date(x.start_date).getTime() : Number.POSITIVE_INFINITY
        result.sort((a, b) => ts(a) - ts(b))
        break
      }
      case 'name_az':
        result.sort((a, b) => a.title.localeCompare(b.title, 'ar'))
        break
    }

    return result
  }, [
    allCourses,
    debouncedSearch,
    activePrice,
    activeDelivery,
    activeLevel,
    activeLanguage,
    activeInstructor,
    activeCategory,
    activeAvailability,
    sortBy,
  ])

  return (
    <main className="overflow-x-hidden bg-[#f8fafc]" dir="rtl">
      <PublicSeo
        title="الدورات التدريبية"
        description="تصفح جميع الدورات المستقلة المتاحة من EMC بحث وتصفية متقدمة."
        path="/programs"
      />

      <ProgramsHero coursesCount={allCourses.length} />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        activePrice={activePrice}
        onPriceChange={setActivePrice}
        activeDelivery={activeDelivery}
        onDeliveryChange={setActiveDelivery}
        deliveryOptions={deliveryOptions}
        activeLevel={activeLevel}
        onLevelChange={setActiveLevel}
        levelOptions={levelOptions}
        activeLanguage={activeLanguage}
        onLanguageChange={setActiveLanguage}
        languageOptions={languageOptions}
        activeInstructor={activeInstructor}
        onInstructorChange={setActiveInstructor}
        instructorOptions={instructorOptions}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        categoryOptions={categoryOptions}
        activeAvailability={activeAvailability}
        onAvailabilityChange={setActiveAvailability}
        sortBy={sortBy}
        onSortChange={setSortBy}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        resultCount={filteredCourses.length}
        totalCount={allCourses.length}
        apiEmpty={!loading && allCourses.length === 0}
        loadError={loadError}
      />

      <CoursesGrid
        courses={filteredCourses}
        totalFromApi={allCourses.length}
        loading={loading}
        viewMode={viewMode}
        embedded
        sectionId="program-courses"
      />

      <ProgramsHelpCTA />
    </main>
  )
}
