import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import DepartmentSection from '@/components/team/DepartmentSection'
import DepartmentTabs from '@/components/team/DepartmentTabs'
import ExecutiveSection from '@/components/team/ExecutiveSection'
import OrganizationChart from '@/components/team/OrganizationChart'
import TeamEmptyState from '@/components/team/TeamEmptyState'
import TeamErrorState from '@/components/team/TeamErrorState'
import TeamHero from '@/components/team/TeamHero'
import TeamSkeleton from '@/components/team/TeamSkeleton'
import { getTeam, type Department } from '@/services/teamApi'
import { STATIC_TEAM_DATA } from '@/data/teamData'

const EXEC_SLUG = 'executive-leadership'

/** Pure I/O — kept outside the component so the mount effect and the retry button share it
 *  without either having to call a state-mutating callback. */
async function fetchTeamDepartments(): Promise<Department[]> {
  try {
    const data = await getTeam()
    const totalMembers = data.reduce((sum, d) => sum + d.members.length, 0)
    if (import.meta.env.DEV) {
      console.log('TEAM DEPARTMENTS', data)
      console.log('FIRST DEPARTMENT MEMBERS', data[0]?.members)
      console.log('TOTAL MEMBERS FROM API', totalMembers)
    }
    return data.length > 0 && totalMembers > 0 ? data : STATIC_TEAM_DATA
  } catch {
    return STATIC_TEAM_DATA
  }
}

export default function TeamPage() {
  const [departments, setDepartments] = useState<Department[] | undefined>(undefined)
  const [fetchError, setFetchError] = useState(false)
  const [activeSlug, setActiveSlug] = useState<'all' | string>('all')

  /** Imperative retry from the error state — outside any effect, so it may reset to the
   *  loading state synchronously. */
  const loadTeam = useCallback(() => {
    setFetchError(false)
    setDepartments(undefined)
    void fetchTeamDepartments().then(setDepartments)
  }, [])

  useEffect(() => {
    let alive = true
    void (async () => {
      const data = await fetchTeamDepartments()
      if (alive) setDepartments(data)
    })()
    return () => {
      alive = false
    }
  }, [])

  const executiveDept = useMemo(
    () => departments?.find((d) => d.slug === EXEC_SLUG) ?? null,
    [departments],
  )

  const otherDepartments = useMemo(() => departments?.filter((d) => d.slug !== EXEC_SLUG) ?? [], [departments])

  const showOrgChart =
    !!departments?.length &&
    activeSlug === 'all' &&
    departments.some((d) => d.slug !== EXEC_SLUG)

  const showExecutiveBlock =
    (activeSlug === 'all' || activeSlug === EXEC_SLUG) && Boolean(executiveDept)

  const departmentSections: Department[] = useMemo(() => {
    if (!departments?.length) return []
    if (activeSlug === 'all') return otherDepartments
    if (activeSlug === EXEC_SLUG) return []
    return departments.filter((d) => d.slug === activeSlug && d.slug !== EXEC_SLUG)
  }, [activeSlug, departments, otherDepartments])

  const loading = departments === undefined && !fetchError

  return (
    <main className="bg-white">
      <TeamHero />

      <div className="mx-auto max-w-[1540px] px-4 sm:px-6 lg:px-10">
        {loading ? (
          <TeamSkeleton />
        ) : fetchError ? (
          <div className="py-14">
            <TeamErrorState onRetry={loadTeam} />
          </div>
        ) : departments && departments.length > 0 ? (
          <>
            <DepartmentTabs departments={departments} activeSlug={activeSlug} onChange={setActiveSlug} />

            <AnimatePresence mode="wait">
              <motion.div
                key={activeSlug}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.38, ease: [0.22, 0.61, 0.36, 1] }}
                className="py-10"
              >
                {showOrgChart ? <OrganizationChart executive={executiveDept} departments={departments} /> : null}

                {showExecutiveBlock ? <ExecutiveSection department={executiveDept} /> : null}

                <div className="space-y-10">
                  {departmentSections.map((d) => (
                    <DepartmentSection key={d.id} department={d} />
                  ))}
                </div>

                {activeSlug === EXEC_SLUG && !(executiveDept?.members?.length ?? 0) ? (
                  <p className="mt-10 text-center text-sm font-semibold text-foreground/50">لا بطاقات في هذا القسم.</p>
                ) : null}

                {!departmentSections.length && activeSlug !== 'all' && activeSlug !== EXEC_SLUG ? (
                  <p className="py-14 text-center text-sm font-semibold text-foreground/50">لم يتم العثور على هذا القسم.</p>
                ) : null}
              </motion.div>
            </AnimatePresence>
          </>
        ) : (
          <div className="py-14">
            <TeamEmptyState />
          </div>
        )}

        {!loading && departments && departments.length > 0 ? (
          <section className="relative isolate mx-auto mb-20 mt-16 max-w-[1540px] overflow-hidden rounded-[2rem] border border-deepBlue/[0.08] bg-deepBlue px-6 py-14 text-white shadow-emc-xl sm:px-12 lg:mb-28 lg:py-16">
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-brand-gradient opacity-[0.2]" />
            <div aria-hidden className="absolute -left-[22%] top-[-50%] h-[22rem] w-[22rem] rounded-full bg-customOrange/35 blur-3xl" />
            <div
              aria-hidden
              className="absolute inset-0 bg-emc-grid bg-grid-32 opacity-[0.09] [mask-image:radial-gradient(ellipse_at_center,rgba(255,255,255,0.75),transparent_65%)]"
            />
            <div className="relative text-right" dir="rtl">
              <h2 className="font-display text-2xl font-black sm:text-3xl xl:text-[2.4rem]">معًا نبني EMC V3</h2>
              <p className="mt-4 max-w-2xl text-base font-semibold leading-8 text-white/75">
                فريق واحد، رؤية واحدة، ونظام مؤسسي يقود المرحلة القادمة.
              </p>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.99 }} className="mt-8 inline-block">
                <Link
                  to="/courses"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent-gradient px-8 py-4 text-base font-black text-white shadow-emc-glow-accent transition hover:brightness-105"
                >
                  تعرف على برامجنا
                </Link>
              </motion.div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  )
}
