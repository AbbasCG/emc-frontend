import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import PublicSeo from '@/components/public/PublicSeo'
import { fetchPublicProgramsOverview } from '@/api/programsApi'
import { fetchStudentLearningPaths, type LearningPath } from '@/api/learningPathsApi'
import type { CourseItem, WorkshopItem } from '@/services/coursesApi'
import { useAuth } from '@/contexts/AuthContext'
import { normalizeRole } from '@/utils/dashboardAccess'
import CoursesProgramIntro from '@/pages/Courses/CoursesProgramIntro'
import LearningPathsShowcaseSection from '@/pages/Courses/LearningPathsShowcaseSection'
import CoursesGrid from '@/pages/Courses/CoursesGrid'
import WorkshopSpotlight from '@/pages/Courses/WorkshopSpotlight'
import ProgramsHero from './ProgramsHero'
import ProgramsHelpCTA from './ProgramsHelpCTA'

export default function ProgramsPage() {
  const { isAuthenticated, user } = useAuth()
  const [courses, setCourses] = useState<CourseItem[]>([])
  const [workshops, setWorkshops] = useState<WorkshopItem[]>([])
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([])
  const [loading, setLoading] = useState(true)
  const [enrolledPathIds, setEnrolledPathIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    let alive = true
    setLoading(true)
    void fetchPublicProgramsOverview()
      .then((overview) => {
        if (!alive) return
        setCourses(overview.courses)
        setWorkshops(overview.workshops)
        setLearningPaths(overview.learningPaths)
      })
      .catch(() => {
        if (!alive) {
          setCourses([])
          setWorkshops([])
          setLearningPaths([])
        }
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated || normalizeRole(user?.role) !== 'student') {
      setEnrolledPathIds(new Set())
      return
    }
    let alive = true
    void fetchStudentLearningPaths().then((rows) => {
      if (!alive) return
      setEnrolledPathIds(new Set(rows.map((r) => r.learning_path.id)))
    })
    return () => {
      alive = false
    }
  }, [isAuthenticated, user?.role])

  const bentoCategories = useMemo(() => {
    const m = new Map<string, { label: string; count: number }>()
    for (const c of courses) {
      const cur = m.get(c.category_key)
      if (cur) cur.count += 1
      else m.set(c.category_key, { label: c.category_label, count: 1 })
    }
    return Array.from(m.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 9)
  }, [courses])

  const catalogCourses = useMemo(
    () => courses.filter((c) => c.catalog_type === 'course'),
    [courses],
  )

  return (
    <main className="overflow-x-hidden bg-[#f8fafc]" dir="rtl">
      <PublicSeo
        title="البرامج التدريبية"
        description="استكشف دورات EMC ومساراتها الاحترافية وورش العمل — برامج حقيقية من الكتالوج."
        path="/programs"
      />

      <ProgramsHero
        coursesCount={catalogCourses.length}
        pathsCount={learningPaths.length}
        workshopsCount={workshops.length}
      />

      <CoursesProgramIntro derivedCategories={bentoCategories} loading={loading} />

      <LearningPathsShowcaseSection
        paths={learningPaths}
        loading={loading}
        enrolledIds={enrolledPathIds}
      />

      <section id="program-courses" className="scroll-mt-28 bg-white py-10 md:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 flex flex-col gap-4 text-right sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="emc-wing emc-eyebrow mb-3">
                الدورات المتاحة
              </span>
              <h2 className="emc-title-arc font-display text-2xl font-black tracking-tight text-deepBlue md:text-3xl">دورات من الكتالوج</h2>
            </div>
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 self-start rounded-xl border-2 border-deepBlue px-5 py-2.5 text-sm font-bold text-deepBlue shadow-emc transition duration-300 ease-emc hover:bg-deepBlue hover:text-white hover:shadow-emc-md sm:self-auto"
            >
              كتالوج الدورات الكامل
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
        <CoursesGrid
          courses={catalogCourses}
          totalFromApi={catalogCourses.length}
          loading={loading}
          viewMode="grid"
          embedded
        />
      </section>

      <WorkshopSpotlight workshops={workshops} loading={loading} />

      <ProgramsHelpCTA />
    </main>
  )
}
