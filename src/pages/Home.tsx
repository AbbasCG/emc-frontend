import HeroSection from '../components/home/HeroSection'
import HomePlatformBento from '../components/home/HomePlatformBento'
import VisionMissionSection from '../components/home/VisionMissionSection'
import OffersSection from '../components/home/OffersSection'
import TwelveThemesPreviewSection from '../components/home/TwelveThemesPreviewSection'
import LearningPathsSection from '../components/home/LearningPathsSection'
import FeaturedCoursesSection from '../components/home/FeaturedCoursesSection'
import HomeFeaturedInstructors from '../components/home/HomeFeaturedInstructors'
import WhyChooseSection from '../components/home/WhyChooseSection'
import PartnershipSection from '../components/home/PartnershipSection'
import ImpactSection from '../components/home/ImpactSection'
import HomeStatsBand from '../components/home/HomeStatsBand'
import HomeFaqSection from '../components/home/HomeFaqSection'
import CTASection from '../components/shared/CTASection'

export default function Home() {
  return (
    <main className="bg-emcBg">
      <HeroSection />
      <HomePlatformBento />
      <VisionMissionSection />
      <OffersSection />
      <TwelveThemesPreviewSection />
      <LearningPathsSection />
      <FeaturedCoursesSection />
      <HomeFeaturedInstructors />
      <WhyChooseSection />
      <PartnershipSection />
      <ImpactSection />
      <HomeStatsBand />
      <HomeFaqSection />
      <CTASection
        title="ابدأ رحلتك مع EMC اليوم"
        subtitle="سواء كنت تبحث عن دورة، استشارة، شراكة، أو فرصة للتطوع، نحن هنا لمساعدتك على بناء خطوة أفضل."
        buttonText="التسجيل في البرامج"
        buttonLink="/courses"
        extraLinks={[
          { text: 'التطوع', to: '/volunteer', variant: 'orange' },
          { text: 'شراكة', to: '/partnerships', variant: 'glass' },
          { text: 'تواصل معنا', to: '/contact', variant: 'muted' },
        ]}
      />
    </main>
  )
}
