import { lazy, Suspense } from 'react'
import HomeCinematicHero from '../components/home/HomeCinematicHero'
import HomeImpactMetrics from '../components/home/HomeImpactMetrics'
// M10: hidden — partner marquee duplicated HomePartnersSection (kept the grid as the single partners scene)
// import HomeTrustStrip from '../components/home/HomeTrustStrip'
import HomeLearningTracks from '../components/home/HomeLearningTracks'
// DL2.0: restored — the 4-station purchase-story rail (workshop → course → path → certificate)
import HomeLearningJourney from '../components/home/HomeLearningJourney'
// DL2.0: WhyChooseSection + HomeAiSection stay hidden — merged into the compact HomeWhyBand
// import WhyChooseSection from '../components/home/WhyChooseSection'
// import HomeAiSection from '../components/home/HomeAiSection'
import HomeWhyBand from '../components/home/HomeWhyBand'
import HomeTestimonialsCarousel from '../components/home/HomeTestimonialsCarousel'
import HomePartnersSection from '../components/home/HomePartnersSection'
import HomeFaqSection from '../components/home/HomeFaqSection'
import HomeGrandCTA from '../components/home/HomeGrandCTA'
import PublicSeo from '@/components/public/PublicSeo'
import { OrganizationJsonLd } from '@/components/public/JsonLd'

const FeaturedCoursesSection = lazy(() => import('../components/home/FeaturedCoursesSection'))
const HomeEcosystemBento = lazy(() => import('../components/home/HomeEcosystemBento'))

// DL2.0: editorial fallback — hairline-seated row placeholders, no card boxes
function SectionFallback() {
  return (
    <section className="bg-white px-4 py-16 sm:px-6 lg:px-10" aria-hidden>
      <div className="mx-auto max-w-[1540px]">
        <div className="mb-10 h-8 w-48 animate-pulse rounded-lg bg-brand-100" />
        <div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex animate-pulse items-center gap-5 border-b border-line py-6">
              <div className="emc-page-clip-sm aspect-[16/10] w-24 shrink-0 bg-brand-50 sm:w-36" />
              <div className="flex-1 space-y-3">
                <div className="h-4 w-3/5 rounded bg-brand-100/80" />
                <div className="h-3 w-2/5 rounded bg-brand-50" />
              </div>
            </div>
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

      {/* 2. Featured courses from API (light) — editorial rows, real content immediately after the hero */}
      <Suspense fallback={<SectionFallback />}>
        <FeaturedCoursesSection />
      </Suspense>

      {/* 3. Learning journey (light) — the purchase story: ورشة → دورة → مسار → شهادة معتمدة on one rail */}
      <HomeLearningJourney />

      {/* 4. Impact metrics — dark moment #1, one typographic line-up of serif numbers */}
      <HomeImpactMetrics />

      {/* 5. Learning tracks & certificates (light) — tabs kept, items as editorial rows */}
      <HomeLearningTracks />

      {/* 6+7. Dark moment #2 — capability bento then the merged «لماذا EMC» band; the two
          navy scenes are adjacent so they read as a single dark passage */}
      <Suspense fallback={<SectionFallback />}>
        <HomeEcosystemBento />
      </Suspense>
      <HomeWhyBand />

      {/* 8. Testimonials (light) — serif pull-quotes, one highlighted on a paper2 field */}
      <HomeTestimonialsCarousel />

      {/* 9. Partners (light) — plain wordmark row between hairlines */}
      <HomePartnersSection />

      {/* 10. FAQ (light) — sticky intro + hairline-seated accordion rows */}
      <HomeFaqSection />

      {/* 11. Grand CTA — dark finale */}
      <HomeGrandCTA />
    </main>
  )
}
