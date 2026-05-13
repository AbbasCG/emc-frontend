import { useState, useEffect, useMemo } from 'react'
import CoursesHero from './CoursesHero'
import FilterBar from './FilterBar'
import TracksSection from './TracksSection'
import CoursesGrid from './CoursesGrid'
import CoursesProgramIntro from './CoursesProgramIntro'
import CoursesRegistrationSection from './CoursesRegistrationSection'
import CoursesPricingSection from './CoursesPricingSection'
import WorkshopSpotlight from './WorkshopSpotlight'
import CoursesCTA from './CoursesCTA'
import {
  fetchCourses,
  fetchTracks,
  fetchUpcomingWorkshops,
} from '@/services/coursesApi'
import type { CourseItem, TrackItem, WorkshopItem } from '@/services/coursesApi'

export default function CoursesPage() {
  const [courses, setCourses]         = useState<CourseItem[]>([])
  const [tracks, setTracks]           = useState<TrackItem[]>([])
  const [workshops, setWorkshops]     = useState<WorkshopItem[]>([])

  const [coursesLoading, setCoursesLoading]     = useState(true)
  const [tracksLoading, setTracksLoading]       = useState(true)
  const [workshopsLoading, setWorkshopsLoading] = useState(true)

  const [searchQuery, setSearchQuery]     = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [activeFilter, setActiveFilter]   = useState('all')
  const [sortBy, setSortBy]               = useState('popular')
  const [viewMode, setViewMode]           = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    let alive = true

    fetchCourses()
      .then(res => { if (alive) setCourses(res.data) })
      .catch(() => { /* API unavailable — mock data fallback handles this */ })
      .finally(() => { if (alive) setCoursesLoading(false) })

    fetchTracks()
      .then(res => { if (alive) setTracks(res.data) })
      .catch(() => {})
      .finally(() => { if (alive) setTracksLoading(false) })

    fetchUpcomingWorkshops()
      .then(res => { if (alive) setWorkshops(res.data) })
      .catch(() => {})
      .finally(() => { if (alive) setWorkshopsLoading(false) })

    return () => { alive = false }
  }, [])

  const filteredCourses = useMemo(() => {
    let result = [...courses]

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.tags.some(t => t.toLowerCase().includes(q))
      )
    }

    // Category
    if (activeCategory !== 'all') {
      result = result.filter(c => c.category === activeCategory)
    }

    // Access-type filter
    switch (activeFilter) {
      case 'free':     result = result.filter(c => c.is_free); break
      case 'paid':     result = result.filter(c => !c.is_free); break
      case 'new':      result = result.filter(c => c.id > 8); break
      case 'upcoming': result = result.filter(c => c.status === 'upcoming'); break
      case 'live':     result = result.filter(c => c.status === 'active'); break
    }

    // Sort
    switch (sortBy) {
      case 'popular':    result.sort((a, b) => b.enrolled_count - a.enrolled_count); break
      case 'newest':     result.sort((a, b) => b.id - a.id); break
      case 'price_low':  result.sort((a, b) => a.price - b.price); break
      case 'price_high': result.sort((a, b) => b.price - a.price); break
      case 'duration':   result.sort((a, b) => a.duration_weeks - b.duration_weeks); break
    }

    return result
  }, [courses, searchQuery, activeCategory, activeFilter, sortBy])

  return (
    <main className="overflow-x-hidden">
      <CoursesHero
        onSearch={setSearchQuery}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      <CoursesProgramIntro />

      <FilterBar
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        resultCount={filteredCourses.length}
        totalCount={courses.length}
      />

      <TracksSection tracks={tracks} loading={tracksLoading} />

      <CoursesGrid
        courses={filteredCourses}
        totalFromApi={courses.length}
        loading={coursesLoading}
        viewMode={viewMode}
      />

      <CoursesRegistrationSection />

      <CoursesPricingSection />

      <WorkshopSpotlight workshops={workshops} loading={workshopsLoading} />

      <CoursesCTA />
    </main>
  )
}
