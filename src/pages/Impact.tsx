import ImpactActivitiesSection from '@/components/impact/ImpactActivitiesSection'
import ImpactAudienceSection from '@/components/impact/ImpactAudienceSection'
import ImpactDashboardCta from '@/components/impact/ImpactDashboardCta'
import ImpactDashboardHero from '@/components/impact/ImpactDashboardHero'
import ImpactGeographicSection from '@/components/impact/ImpactGeographicSection'
import ImpactOverviewSection from '@/components/impact/ImpactOverviewSection'
import ImpactProgramDemandSection from '@/components/impact/ImpactProgramDemandSection'

export default function Impact() {
  return (
    <main dir="rtl" className="min-h-screen bg-white text-foreground antialiased">
      <ImpactDashboardHero />
      <ImpactOverviewSection />
      <ImpactAudienceSection />
      <ImpactProgramDemandSection />
      <ImpactGeographicSection />
      <ImpactActivitiesSection />
      <ImpactDashboardCta />
    </main>
  )
}
