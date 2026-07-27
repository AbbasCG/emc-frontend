import { lazy, Suspense } from 'react'
import HomeCinematicHero from '../components/home/HomeCinematicHero'
import HomeImpactMetrics from '../components/home/HomeImpactMetrics'
import HomeTrustStrip from '../components/home/HomeTrustStrip'
import HomeLearningTracks from '../components/home/HomeLearningTracks'
import HomeLearningJourney from '../components/home/HomeLearningJourney'
import WhyChooseSection from '../components/home/WhyChooseSection'
import HomeAiSection from '../components/home/HomeAiSection'
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
      {/* 1. Cinematic dark hero + orbital visual + stat pills */}
      <HomeCinematicHero />

      {/* 2. Featured courses from API — near the top so users see real content immediately */}
      <Suspense fallback={<SectionFallback />}>
        <FeaturedCoursesSection />
      </Suspense>

      {/* 3. Impact metrics — dark strip, animated counters */}
      <HomeImpactMetrics />

      {/* 4. Partner marquee trust strip */}
      <HomeTrustStrip />

      {/* 5. Learning tracks — 5 premium cards, 3-col layout */}
      <HomeLearningTracks />

      {/* 6. Learning journey — Workshop → Course → Track → Outcome */}
      <HomeLearningJourney />

      {/* 7. Platform capabilities bento (dark, glass) */}
      <Suspense fallback={<SectionFallback />}>
        <HomeEcosystemBento />
      </Suspense>

      {/* 8. Why EMC — dark editorial grid */}
      <WhyChooseSection />

      {/* 9. AI & Innovation — near-black, kinetic */}
      <HomeAiSection />

      {/* 10. Testimonials — 2-up on desktop */}
      <HomeTestimonialsCarousel />

      {/* 11. Partners */}
      <HomePartnersSection />

      {/* 12. FAQ — split layout, premium accordion */}
      <HomeFaqSection />

      {/* 13. Final CTA */}
      <HomeGrandCTA />
    </main>
  )
}
