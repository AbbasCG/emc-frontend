import ImpactDashboardCta from '@/components/impact/ImpactDashboardCta'
import ImpactDashboardHero from '@/components/impact/ImpactDashboardHero'
import ImpactOverviewSection from '@/components/impact/ImpactOverviewSection'
import PublicSeo from '@/components/public/PublicSeo'

/**
 * Brand-V3 governance (§7): only founder-confirmed figures may appear publicly
 * (13,000+ beneficiaries · 9,000+ camp registrations · 50+ countries).
 * The audience/program-demand/geographic/activities sections render DEMO datasets
 * from impactDashboard.ts (fictional trainers, attendance, city counts), so they
 * are HIDDEN — not deleted — until real data or founder sign-off arrives.
 * To restore: re-add the ImpactAudience/ProgramDemand/Geographic/Activities
 * imports and their four JSX lines between the overview and the CTA.
 */
export default function Impact() {
  return (
    <main dir="rtl" className="min-h-screen bg-white text-foreground antialiased">
      <PublicSeo
        title="الأثر والإنجازات"
        description="لوحة الأثر والإنجازات: أرقام حقيقية معتمدة تعكس نمو مركز EMC وتأثيره التعليمي والمجتمعي، بشفافية ودون مبالغة في البيانات المعروضة."
        path="/impact"
      />
      <ImpactDashboardHero />
      <ImpactOverviewSection />
      <ImpactDashboardCta />
    </main>
  )
}
