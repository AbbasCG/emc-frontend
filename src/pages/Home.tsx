import { lazy, Suspense } from 'react'
import HomeCinematicHero from '../components/home/HomeCinematicHero'
import HomeImpactMetrics from '../components/home/HomeImpactMetrics'
// M10: hidden — partner marquee duplicated HomePartnersSection (kept the grid as the single partners scene)
// import HomeTrustStrip from '../components/home/HomeTrustStrip'
import HomeLearningTracks from '../components/home/HomeLearningTracks'
// M10: hidden — 4-step journey strip; the narrative is carried by the tracks tabs (duration → certificate)
// import HomeLearningJourney from '../components/home/HomeLearningJourney'
// M10: hidden — dark editorial grid overlapping the kept EcosystemBento capability moment
// import WhyChooseSection from '../components/home/WhyChooseSection'
// M10: hidden — second dark capability section duplicating EcosystemBento (bento kept as the stronger one)
// import HomeAiSection from '../components/home/HomeAiSection'
import HomeTestimonialsCarousel from '../components/home/HomeTestimonialsCarousel'
import HomePartnersSection from '../components/home/HomePartnersSection'
import HomeFaqSection from '../components/home/HomeFaqSection'
import HomeGrandCTA from '../components/home/HomeGrandCTA'
import PublicSeo from '@/components/public/PublicSeo'
import { OrganizationJsonLd } from '@/components/public/JsonLd'

const FeaturedCoursesSection = lazy(() => import('../components/home/FeaturedCoursesSection'))
const HomeEcosystemBento = lazy(() => import('../components/home/HomeEcosystemBento'))

function SectionFallback() {
  return (
    <section className="bg-white px-4 py-16 sm:px-6 lg:px-10" aria-hidden>
      <div className="mx-auto max-w-[1540px]">
        <div className="mb-12 h-8 w-48 animate-pulse rounded-lg bg-brand-100" />
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-80 animate-pulse rounded-[1.25rem] bg-brand-50/80 ring-1 ring-deepBlue/[0.04]" />
          ))}
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  return (
    <main className="bg-white">
      <PublicSeo
        title="EMC — منصة التعليم والتطوير"
        description="منصة EMC التعليمية العربية—الهولندية: دورات، ورش، مسارات تعلم، شراكات، وتطوير مهني بمعايير احترافية."
        path="/"
      />
      <OrganizationJsonLd />
      {/* 1. Cinematic dark hero — headline + the team's 12-themes orbit («منظومة EMC») + stat pills */}
      <HomeCinematicHero />

      {/* 2. Featured courses from API (light) — real content immediately after the hero */}
      <Suspense fallback={<SectionFallback />}>
        <FeaturedCoursesSection />
      </Suspense>

      {/* 3. Impact metrics — dark interlude #1, animated counters */}
      <HomeImpactMetrics />

      {/* 4. Learning tracks & certificates (light) — tabs: 9 professional tracks / academic / languages / children */}
      <HomeLearningTracks />

      {/* 5. Platform capabilities bento — the ONE dark capability moment */}
      <Suspense fallback={<SectionFallback />}>
        <HomeEcosystemBento />
      </Suspense>

      {/* 6. Testimonials (light) — highlighted quote + 2-up supporting cards */}
      <HomeTestimonialsCarousel />

      {/* 7. Partners (light) — the single partners scene */}
      <HomePartnersSection />

      {/* 8. FAQ (light) — compact two-column: sticky intro + accordion */}
      <HomeFaqSection />

      {/* 9. Grand CTA — dark gradient finale */}
      <HomeGrandCTA />
    </main>
  )
}
