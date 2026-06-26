import { motion } from 'framer-motion'
import SectionHeader from '@/components/sections/SectionHeader'
import DepartmentsBentoMetrics from '@/components/departments/DepartmentsBentoMetrics'
import DepartmentsFaqAccordion from '@/components/departments/DepartmentsFaqAccordion'
import DepartmentsLayerTabs from '@/components/departments/DepartmentsLayerTabs'
import DepartmentsOrgEcosystem from '@/components/departments/DepartmentsOrgEcosystem'
import DepartmentsTimelineStrip from '@/components/departments/DepartmentsTimelineStrip'
import { CTASection, PublicPageHero } from '@/components/public'
import { fadeUp, staggerContainer, staggerItem } from '@/utils/motion'

const flowPhases = [
  {
    title: 'تصميم واعتماد',
    body: 'إدارة البرامج تبني المسار، والجودة تضمن الالتزام بالمعايير قبل الإطلاق.',
    tone: 'blue' as const,
  },
  {
    title: 'تنفيذ وتجربة',
    body: 'التشغيل يدير الجداول والخدمات، والتسويق يوصل الرسالة بشفافية.',
    tone: 'orange' as const,
  },
  {
    title: 'استدامة وتطوير',
    body: 'المالية والموارد البشرية تدعمان الاستمرارية، والتقنية تحافظ على الأمان.',
    tone: 'navy' as const,
  },
]

export default function Departments() {
  return (
    <main className="bg-emcBg pt-20">
      <PublicPageHero
        eyebrow="الهيكل المؤسسي"
        title="إدارات EMC"
        subtitle="هيكل إداري يضمن جودة البرامج، سلاسة التشغيل، واستدامة الشراكات — مع حوكمة واضحة ومساءلة مهنية."
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'الإدارات' },
        ]}
      />

      <section className="px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            align="right"
            className="!mr-0 !max-w-3xl !text-right"
            eyebrow="لماذا نحتاج إدارات متخصصة؟"
            title="تنظيم يخدم جودة التعلم"
            description="البرامج التعليمية تحتاج تخطيطاً، تشغيلاً، تقنية، وشراكات — وكل ذلك يتطلب فرقاً متخصصة تتعاون تحت رؤية موحدة."
          />
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-3xl bg-white p-8 text-right shadow-emc-md ring-1 ring-line sm:p-10 lg:p-12"
          >
            <div className="pointer-events-none absolute -left-24 top-0 h-56 w-56 rounded-full bg-customBlue/[0.07] blur-3xl" />
            <div className="pointer-events-none absolute -right-16 bottom-0 h-48 w-48 rounded-full bg-customOrange/[0.08] blur-3xl" />
            <p className="relative text-lg font-medium leading-9 text-deepBlue/75">
              تقسيم العمل إلى إدارات لا يعني التعقيد — بل يعني أن كل قرار مرتبط بمسؤولية واضحة: من تصميم البرنامج إلى تجربة
              المشارك، ومن الاتصال المؤسسي إلى الجودة والامتثال.
            </p>
          </motion.div>
        </div>
      </section>

      <DepartmentsBentoMetrics />

      <DepartmentsOrgEcosystem />

      <DepartmentsLayerTabs />

      <section className="border-t border-deepBlue/[0.06] bg-white px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            align="right"
            className="!mr-0 !max-w-3xl !text-right"
            title="كيف تعمل الإدارات معاً؟"
            description="نموذج تعاون مؤسسي: البرامج تصمم المحتوى، التشغيل ينفّذ، التقنية تدعم، والجودة تراجع — والشراكات توسّع الأثر."
          />
          <motion.div
            className="mt-10 grid gap-5 lg:grid-cols-3"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.12 }}
          >
            {flowPhases.map((b, i) => {
              const border =
                b.tone === 'blue'
                  ? 'border-t-4 border-customBlue'
                  : b.tone === 'orange'
                    ? 'border-t-4 border-customOrange'
                    : 'border-t-4 border-deepBlue'
              const badge =
                b.tone === 'blue'
                  ? 'bg-customBlue/[0.08] text-customBlue ring-customBlue/15'
                  : b.tone === 'orange'
                    ? 'bg-customOrange/[0.1] text-deepBlue ring-customOrange/25'
                    : 'bg-deepBlue/[0.06] text-deepBlue ring-deepBlue/15'
              return (
                <motion.div
                  key={b.title}
                  variants={staggerItem}
                  className={[
                    'relative overflow-hidden rounded-3xl border border-deepBlue/10 bg-emcBg p-7 text-right shadow-emc transition-shadow hover:shadow-emc-md',
                    border,
                  ].join(' ')}
                >
                  <span className={['inline-flex rounded-full px-3 py-1 text-[10px] font-black ring-1', badge].join(' ')}>
                    المرحلة {i + 1}
                  </span>
                  <h3 className="mt-4 text-lg font-black text-deepBlue">{b.title}</h3>
                  <p className="mt-3 leading-8 text-deepBlue/70">{b.body}</p>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      <DepartmentsTimelineStrip />

      <section id="governance" className="scroll-mt-28 px-4 pb-12 pt-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            align="right"
            className="!mr-0 !max-w-3xl !text-right"
            title="الحوكمة والجودة"
            description="إدارة الجودة والحوكمة ليست شعاراً — بل آلية لمراجعة السياسات، إدارة المخاطر، وتحسين التجربة بناءً على ملاحظات المشاركين والشركاء."
          />
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5 }}
            className="emc-depth relative overflow-hidden rounded-3xl p-8 text-right text-white shadow-emc-lg ring-1 ring-white/10 lg:p-10"
          >
            <div className="pointer-events-none absolute left-0 top-0 h-40 w-40 rounded-full bg-customBlue/15 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 right-0 h-36 w-36 rounded-full bg-customOrange/10 blur-3xl" />
            <ul className="relative grid gap-3 text-sm font-semibold leading-8 text-white/90 sm:grid-cols-2">
              {[
                'سياسات واضحة للخصوصية والسلامة والشكاوى.',
                'مراجعة دورية لجودة المحتوى وتجربة التعلم.',
                'توثيق الإجراءات لضمان الاستمرارية حتى مع تغير الفريق.',
                'شفافية في التعامل مع الشركاء والرعاة ضمن أطر أخلاقية.',
              ].map((line) => (
                <li key={line} className="flex gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <span className="text-customOrange">•</span>
                  {line}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      <DepartmentsFaqAccordion />

      <CTASection
        title="انضم إلى فريق EMC"
        description="إذا كنت تمتلك خبرة في التدريب، التشغيل، التقنية، أو التسويق — يمكن أن يكون لك دور ضمن إحدى الإدارات."
        primaryLabel="صفحة التطوع والانضمام"
        primaryHref="/volunteer"
        secondaryLabel="تواصل بشأن وظيفة/تعاون"
        secondaryHref="/contact"
      />
    </main>
  )
}
