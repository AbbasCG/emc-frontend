import { lazy, Suspense } from 'react'
import HomeCinematicHero from '../components/home/HomeCinematicHero'
import HomeTrustStrip from '../components/home/HomeTrustStrip'
import HomeLearningTracks from '../components/home/HomeLearningTracks'
import HomeEcosystemBento from '../components/home/HomeEcosystemBento'
import WhyChooseSection from '../components/home/WhyChooseSection'
import HomeImpactMetrics from '../components/home/HomeImpactMetrics'
import HomeTestimonialsCarousel from '../components/home/HomeTestimonialsCarousel'
import HomeFaqSection from '../components/home/HomeFaqSection'
import HomeGrandCTA from '../components/home/HomeGrandCTA'

const FeaturedCoursesSection = lazy(() => import('../components/home/FeaturedCoursesSection'))

function CoursesFallback() {
  return (
    <section className="bg-white px-4 py-16 sm:px-6 lg:px-10" aria-hidden>
      <div className="mx-auto max-w-[1540px]">
        <div className="mb-12 h-8 w-48 animate-pulse rounded-lg bg-brand-100" />
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-96 animate-pulse rounded-[1.25rem] bg-brand-50/80 ring-1 ring-deepBlue/[0.04]" />
          ))}
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  return (
    <main className="bg-white">
      <HomeCinematicHero />
      <HomeTrustStrip />
      <HomeLearningTracks />
      <HomeEcosystemBento />
      <WhyChooseSection />
      <Suspense fallback={<CoursesFallback />}>
        <FeaturedCoursesSection />
      </Suspense>
      <HomeImpactMetrics />
      <HomeTestimonialsCarousel />
      <HomeFaqSection />
      <HomeGrandCTA />
    </main>
  )
}
