import { useState, useEffect, useMemo } from 'react'
import CoursesHero from './CoursesHero'
import FilterBar from './FilterBar'
import CoursesGrid from './CoursesGrid'
import LearningPathsTeaserSection from './LearningPathsTeaserSection'
import WorkshopSpotlight from './WorkshopSpotlight'
import CoursesCTA from './CoursesCTA'
import { fetchCourses, fetchUpcomingWorkshops } from '@/services/coursesApi'
import type { CourseItem, CourseLevel, WorkshopItem } from '@/services/coursesApi'
import { fetchPublicLearningPaths, type LearningPath } from '@/api/learningPathsApi'
import PublicSeo from '@/components/public/PublicSeo'

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseItem[]>([])
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([])
  const [workshops, setWorkshops] = useState<WorkshopItem[]>([])

  const [coursesLoading, setCoursesLoading] = useState(true)
  const [pathsLoading, setPathsLoading] = useState(true)
  const [workshopsLoading, setWorkshopsLoading] = useState(true)

  const [loadError, setLoadError] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [activePrice, setActivePrice] = useState('all')
  const [activeDelivery, setActiveDelivery] = useState('all')
  const [activeLevel, setActiveLevel] = useState<string>('all')
  const [activeProgramType, setActiveProgramType] = useState('all')
  const [activeAvailability, setActiveAvailability] = useState('all')
  const [sortBy, setSortBy] = useState('popular')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    let alive = true

    fetchCourses()
      .then((res) => {
        if (alive) setCourses(res.data)
      })
      .catch(() => {
        if (alive) {
          setCourses([])
          setLoadError(true)
        }
      })
      .finally(() => {
        if (alive) setCoursesLoading(false)
      })

    fetchPublicLearningPaths({ per_page: 3 })
      .then((res) => {
        if (alive) setLearningPaths(res.data)
      })
      .catch(() => {
        if (alive) setLearningPaths([])
      })
      .finally(() => {
        if (alive) setPathsLoading(false)
      })

    fetchUpcomingWorkshops()
      .then((res) => {
        if (alive) setWorkshops(res.data)
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setWorkshopsLoading(false)
      })

    return () => {
      alive = false
    }
  }, [])

  const categoryOptions = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of courses) {
      if (!m.has(c.category_key)) m.set(c.category_key, c.category_label)
    }
    return [{ value: 'all', label: 'الكل' }, ...Array.from(m, ([value, label]) => ({ value, label }))]
  }, [courses])

  const deliveryOptions = useMemo(() => {
    const labels = new Map<string, string>()
    for (const c of courses) {
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
    for (const [k, v] of labels) {
      opts.push({ value: k, label: v })
    }
    return opts
  }, [courses])

  const levelOptions = useMemo(() => {
    const present = new Set(courses.map((c) => c.level))
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
  }, [courses])

  const programTypeOptions = useMemo(() => {
    const hasW = courses.some((c) => c.catalog_type === 'workshop')
    const hasC = courses.some((c) => c.catalog_type === 'course')
    const opts = [{ value: 'all', label: 'كل الأنواع' }]
    if (hasC) opts.push({ value: 'course', label: 'دورات تدريبية' })
    if (hasW) opts.push({ value: 'workshop', label: 'ورش عمل' })
    return opts
  }, [courses])

  const liveStats = useMemo(() => {
    const totalRegs = courses.reduce((s, c) => s + c.registrations_count, 0)
    const instructors = new Set(courses.map((c) => c.trainer.name)).size
    return {
      totalCourses: courses.length,
      totalRegistrations: totalRegs,
      instructors,
      learningPathsCount: learningPaths.length,
    }
  }, [courses, learningPaths.length])

  const filteredCourses = useMemo(() => {
    let result = [...courses]

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.trainer.name.toLowerCase().includes(q) ||
          (c.language && c.language.toLowerCase().includes(q)) ||
          (c.track_name && c.track_name.toLowerCase().includes(q)) ||
          (c.department_name && c.department_name.toLowerCase().includes(q)),
      )
    }

    if (activeCategory !== 'all') {
      result = result.filter((c) => c.category_key === activeCategory)
    }

    switch (activePrice) {
      case 'free':
        result = result.filter((c) => c.is_free)
        break
      case 'paid':
        result = result.filter((c) => !c.is_free)
        break
    }

    if (activeDelivery !== 'all') {
      result = result.filter((c) => c.delivery_key === activeDelivery)
    }

    if (activeLevel !== 'all') {
      result = result.filter((c) => c.level === activeLevel)
    }

    if (activeProgramType !== 'all') {
      result = result.filter((c) => c.catalog_type === activeProgramType)
    }

    if (activeAvailability === 'ended') {
      result = result.filter((c) => c.is_ended)
    } else if (activeAvailability === 'active') {
      result = result.filter((c) => !c.is_ended)
    }

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
        const ts = (x: CourseItem) => (x.start_date ? new Date(x.start_date).getTime() : Number.POSITIVE_INFINITY)
        result.sort((a, b) => ts(a) - ts(b))
        break
      }
    }

    return result
  }, [
    courses,
    searchQuery,
    activeCategory,
    activePrice,
    activeDelivery,
    activeLevel,
    activeProgramType,
    activeAvailability,
    sortBy,
  ])

  return (
    <main className="overflow-x-hidden">
      <PublicSeo
        title="كتالوج الدورات"
        description="تصفّح دورات EMC المتاحة — فلترة، بحث، وورش عمل من الكتالوج الحقيقي."
        path="/courses"
      />
      <CoursesHero
        onSearch={setSearchQuery}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        categoryOptions={categoryOptions}
        stats={liveStats}
      />

      <LearningPathsTeaserSection paths={learningPaths} loading={pathsLoading} />

      <FilterBar
        activePrice={activePrice}
        onPriceChange={setActivePrice}
        activeDelivery={activeDelivery}
        onDeliveryChange={setActiveDelivery}
        deliveryOptions={deliveryOptions}
        activeLevel={activeLevel}
        onLevelChange={setActiveLevel}
        levelOptions={levelOptions}
        activeProgramType={activeProgramType}
        onProgramTypeChange={setActiveProgramType}
        programTypeOptions={programTypeOptions}
        activeAvailability={activeAvailability}
        onAvailabilityChange={setActiveAvailability}
        sortBy={sortBy}
        onSortChange={setSortBy}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        resultCount={filteredCourses.length}
        totalCount={courses.length}
        apiEmpty={!coursesLoading && courses.length === 0}
        loadError={loadError}
      />

      <CoursesGrid
        courses={filteredCourses}
        totalFromApi={courses.length}
        loading={coursesLoading}
        viewMode={viewMode}
      />

      <WorkshopSpotlight workshops={workshops} loading={workshopsLoading} />

      <CoursesCTA />
    </main>
  )
}
