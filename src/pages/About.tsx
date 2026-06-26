import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Brain,
  Compass,
  Cpu,
  GraduationCap,
  Layers,
  Quote,
  Sparkles,
  Target,
  Users,
} from 'lucide-react'
import SectionHeader from '@/components/sections/SectionHeader'
import {
  CTASection,
  FeatureCard,
  FeatureGrid,
  PageShell,
  ProcessSteps,
  PublicPageHero,
  TimelineSteps,
} from '@/components/public'
import { aboutPlatformLead } from '@/data/publicPages'
import { fadeUp } from '@/utils/animations'

const differentiators = [
  {
    icon: Layers,
    title: 'منظومة وليس كتالوج',
    description: 'نربط بين اللغة، المسار، المهارات، والتمكين الرقمي في تجربة متسلسلة قابلة للقياس.',
    iconClassName: 'bg-sky-50 text-customBlue',
  },
  {
    icon: Users,
    title: 'جمهور واسع باحتياجات حقيقية',
    description: 'طلاب، مهاجرون، مهنيون، وباحثون عن تطوير — نصمم لهم مسارات عملية لا شعارات فارغة.',
    iconClassName: 'bg-orange-50 text-customOrange',
  },
  {
    icon: Brain,
    title: 'ذكاء اصطناعي بمسؤولية',
    description: 'نستخدم الأدوات الرقمية لتسريع التعلم مع ضوابط وضوح وأخلاقيات استخدام.',
    iconClassName: 'bg-sky-50 text-customBlue',
  },
  {
    icon: Target,
    title: 'توجيه عملي',
    description: 'ورش، استشارات، ومتابعة تساعدك على ترجمة التعلم إلى قرارات وخطوات.',
    iconClassName: 'bg-orange-50 text-customOrange',
  },
]

const roadmapMilestones = [
  {
    title: 'توحيد التجربة الرقمية',
    description: 'ربط الكتالوج، التسجيل، والمتابعة في مسار واحد يفهمه المتعلم ويُسهّل على الفريق التشغيلي العمل.',
  },
  {
    title: 'توسيع الشراكات المؤسسية',
    description: 'اتفاقيات واضحة مع جامعات ومؤسسات ومدربين — بمعايير جودة وحوكمة موثّقة.',
  },
  {
    title: 'تقارير أثر دورية',
    description: 'نشر ملخصات أثر واقعية للمجتمع والشركاء، مع احترام خصوصية المشاركين.',
  },
  {
    title: 'تطوير المسارات بين المجالات الاثنا عشر',
    description: 'ربط أقوى بين المجالات والمسارات بحيث يتحرك المتعلم بثقة عبر خطوات متوقعة.',
  },
]

const journeySteps = [
  {
    title: 'استكشاف',
    description: 'تحديد احتياجك عبر البرامج أو التواصل الموجز.',
    icon: Compass,
  },
  {
    title: 'اختيار مسار',
    description: 'دورة، ورشة، أو مسار تعلم يتوافق مع مرحلتك.',
    icon: Layers,
  },
  {
    title: 'تعلم وتطبيق',
    description: 'جلسات عملية وموارد تدعم التطبيق لا الحفظ فقط.',
    icon: Brain,
  },
  {
    title: 'متابعة وتطوير',
    description: 'تغذية راجعة وخطوات تالية ضمن منظومة EMC.',
    icon: Sparkles,
  },
]

export default function About() {
  return (
    <main className="bg-[#f4f7fb] pt-20">
      <PublicPageHero
        variant="split"
        badge="عن EMC"
        title="عن المركز"
        subtitle="منصة تعليمية وتطويرية تبني جسوراً بين المعرفة، المهارة، والفرص — بلغة عربية احترافية ومعايير عالمية."
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'عن EMC' },
        ]}
        primaryAction={{ label: 'استكشف البرامج', href: '/courses' }}
        secondaryAction={{ label: 'تواصل معنا', href: '/contact' }}
        stats={[
          { value: '12', label: 'مجال تعلم ضمن منظومة EMC' },
          { value: 'متنوعة', label: 'برامج وورش وفق الكتالوج' },
          { value: 'شفافية', label: 'أثر وبيانات دون مبالغة' },
        ]}
      />

      {/* من نحن — split band */}
      <section id="about" className="scroll-mt-28 py-16 sm:py-20">
        <PageShell>
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.55 }}
              className="text-right"
            >
              <span className="emc-wing emc-eyebrow mb-4">
                <Sparkles size={15} />
                من نحن
              </span>
              <h2 className="emc-title-arc font-display text-3xl font-black tracking-tight text-deepBlue sm:text-4xl">منصة تمكين عبر التعليم</h2>
              <p className="mt-7 text-lg font-medium leading-10 text-slate-600">{aboutPlatformLead.ar}</p>
              <p className="mt-5 text-base font-medium leading-8 text-slate-600">
                نعمل على دعم الأفراد في مراحل الانتقال — دراسة، عمل، هجرة، أو إعادة ترتيب أولويات
                — عبر برامج ومسارات تُحدَّث باستمرار لتعكس احتياج السوق والمجتمع.
              </p>
            </motion.div>

            <motion.div
              className="rounded-3xl bg-white p-2 shadow-emc-lg ring-1 ring-line"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5 }}
            >
              <div className="rounded-2xl bg-gradient-to-br from-[#f4f7fb] to-white p-6 sm:p-8">
                <p className="text-right text-sm font-black text-customBlue">لمحة سريعة</p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {[
                    { icon: GraduationCap, label: 'مسارات أكاديمية ومهنية', sub: 'تخطيط وتوجيه' },
                    { icon: Cpu, label: 'تمكين رقمي', sub: 'أدوات ومهارات' },
                    { icon: Users, label: 'مجتمع متعلم', sub: 'دعم وشراكات' },
                    { icon: Brain, label: 'تعلم مستمر', sub: 'ورش وبرامج' },
                  ].map((item) => {
                    const Icon = item.icon
                    return (
                      <div
                        key={item.label}
                        className="rounded-2xl border border-slate-100 bg-white p-5 text-right shadow-sm transition hover:border-customBlue/20 hover:shadow-md"
                      >
                        <Icon className="text-customBlue" size={26} />
                        <p className="mt-3 font-black text-deepBlue">{item.label}</p>
                        <p className="mt-1 text-sm font-medium text-slate-500">{item.sub}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        </PageShell>
      </section>

      {/* Process — light break */}
      <section className="border-y border-slate-200/60 bg-white py-16 sm:py-20">
        <PageShell>
          <ProcessSteps
            title="رحلتك مع EMC"
            subtitle="من أول خطوة إلى تطوير مستمر — بإيقاع واضح دون تعقيد."
            steps={journeySteps}
          />
        </PageShell>
      </section>

      {/* الرؤية والرسالة */}
      <section id="vision-mission" className="scroll-mt-28 py-16 sm:py-20">
        <PageShell>
          <SectionHeader
            eyebrow="التوجه المؤسسي"
            title="الرؤية والرسالة"
            subtitle="رؤية واضحة ورسالة عملية: التمكين عبر تعليم جيد، وإرشاد صادق، وتجربة محترمة للمتعلم."
          />
          <div className="grid gap-6 md:grid-cols-2">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.5 }}
              className="relative overflow-hidden rounded-3xl border-t-4 border-customBlue bg-white p-8 text-right shadow-emc-md ring-1 ring-line"
            >
              <div className="pointer-events-none absolute -left-8 top-0 h-32 w-32 rounded-full bg-sky-100/50 blur-2xl" />
              <h3 className="relative text-xl font-black text-deepBlue">الرؤية</h3>
              <p className="relative mt-4 leading-9 text-slate-600">
                أن نكون مرجعاً موثوقاً في بناء المسارات التعليمية والمهنية للأفراد والمؤسسات، مع
                الحفاظ على جودة المحتوى وأثره الإنساني.
              </p>
            </motion.div>
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.5, delay: 0.06 }}
              className="relative overflow-hidden rounded-3xl border-t-4 border-customOrange bg-white p-8 text-right shadow-emc-md ring-1 ring-line"
            >
              <div className="pointer-events-none absolute -left-8 top-0 h-32 w-32 rounded-full bg-orange-100/40 blur-2xl" />
              <h3 className="relative text-xl font-black text-deepBlue">الرسالة</h3>
              <p className="relative mt-4 leading-9 text-slate-600">
                تقديم برامج تدريبية واستشارية ومسارات تعلم تساعد المتعلم على اتخاذ قرارات أوضح،
                وتطوير مهاراته، والاندماج بثقة في بيئات متعددة.
              </p>
            </motion.div>
          </div>
        </PageShell>
      </section>

      {/* خارطة الطريق */}
      <section id="roadmap" className="scroll-mt-28 border-y border-slate-200/60 bg-white py-16 sm:py-20">
        <PageShell>
          <SectionHeader
            align="right"
            className="!mr-0 !max-w-3xl !text-right"
            eyebrow="نحو المستقبل"
            title="خارطة طريق EMC"
            description="مراحل تطوير المنظومة بصدق مهني — نحدّث الأولويات مع تعلّمنا من المجتمع والشركاء."
          />
          <TimelineSteps steps={roadmapMilestones} />
        </PageShell>
      </section>

      {/* رسالة القيادة */}
      <section id="leadership" className="scroll-mt-28 py-16 sm:py-20">
        <PageShell>
          <SectionHeader
            align="right"
            className="!mr-0 !max-w-3xl !text-right"
            eyebrow="من الإدارة"
            title="كلمة للمجتمع التعليمي"
            description="التزام مؤسسي بالجودة والشفافية — دون أسماء وهمية؛ التحديثات البشرية الرسمية تُعلن عبر القنوات المعتمدة."
          />
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.55 }}
            className="emc-depth relative overflow-hidden rounded-3xl p-8 text-right text-white shadow-emc-lg ring-1 ring-white/10 sm:p-10 lg:p-12"
          >
            <div className="pointer-events-none absolute -left-16 top-0 h-48 w-48 rounded-full bg-customOrange/15 blur-3xl" />
            <Quote className="relative text-customOrange" size={36} aria-hidden />
            <blockquote className="relative mt-6 text-lg font-medium leading-10 text-ice/95 sm:text-xl sm:leading-[2.15rem]">
              نؤمن أن التعليم الجيد يبدأ من احترام المتعلم: وضوح في التوقعات، محتوى يُحدَّث، وفريق
              يتحمّل المسؤولية أمام المجتمع. هدفنا ليس «الأكبر بأسرع وقت» — بل بناء مرجعية عربية
              مهنية تدوم.
            </blockquote>
            <footer className="relative mt-8 border-t border-white/15 pt-6 text-sm font-bold text-sky/90">
              الإدارة العليا — Educational Master Central (EMC)
            </footer>
          </motion.div>
        </PageShell>
      </section>

      {/* Feature grid */}
      <section className="py-16 sm:py-20">
        <PageShell>
          <SectionHeader
            align="right"
            className="!mr-0 !max-w-3xl !text-right"
            eyebrow="التميز"
            title="ما الذي يميّز EMC؟"
            subtitle="نميز أنفسنا بالربط بين المحتوى، التوجيه، والشراكات — لا بالوعود السريعة أو الوصف الزائف."
          />
          <FeatureGrid>
            {differentiators.map((item) => (
              <FeatureCard
                key={item.title}
                icon={item.icon}
                title={item.title}
                description={item.description}
                iconClassName={item.iconClassName}
                animation="stagger"
              />
            ))}
          </FeatureGrid>
        </PageShell>
      </section>

      {/* AI / digital — full width band */}
      <section className="bg-white py-16 sm:py-20">
        <PageShell>
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <SectionHeader
              align="right"
              className="!mb-0 !mr-0 !max-w-none !text-right"
              eyebrow="المستقبل الرقمي"
              title="التعليم، الذكاء الاصطناعي، والتحول الرقمي"
              subtitle="نؤمن أن التحول الرقمي فرصة للمتعلم عندما يُقدَّم بلغة مفهومة وبأدوات آمنة."
            />
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.5 }}
              className="rounded-3xl bg-[#f4f7fb] p-6 ring-1 ring-slate-200/80 sm:p-8"
            >
              <ul className="grid gap-3 text-slate-700 sm:grid-cols-2">
                {[
                  'مقدمات عملية في الذكاء الاصطناعي واستخداماته اليومية والمهنية.',
                  'مهارات رقمية تدعم الإنتاجية والتعلم مدى الحياة.',
                  'مبادئ خصوصية وأمان ومسؤولية عند استخدام الأدوات.',
                  'ربط التقنية بأهدافك الأكاديمية أو المهنية لا كغاية بحد ذاتها.',
                ].map((line) => (
                  <li
                    key={line}
                    className="flex gap-3 rounded-2xl bg-white p-4 text-sm font-semibold leading-7 shadow-sm ring-1 ring-slate-100/80"
                  >
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-customOrange" />
                    {line}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </PageShell>
      </section>

      {/* Audience cards */}
      <section className="py-16 sm:py-20">
        <PageShell>
          <SectionHeader
            title="من نخدم؟"
            subtitle="مجتمع متنوع يتقاطع حول هدف واحد: بناء مسار أوضح عبر التعلم الجيد."
          />
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: 'الطلاب والخريجون',
                body: 'تخطيط أكاديمي، لغات، واستعداد للمرحلة التالية.',
              },
              {
                title: 'المهاجرون والوافدون الجدد',
                body: 'دعم لغوي ومهني ومجتمعي يراعي واقع الانتقال.',
              },
              {
                title: 'المهنيون والباحثون عن تطوير',
                body: 'مهارات عملية، ريادة، وتمكين رقمي بمسؤولية.',
              },
              {
                title: 'الأسر والناشئة',
                body: 'برامج مناسبة للأعمار بإشراف وتصميم آمن.',
              },
              {
                title: 'المؤسسات والفرق',
                body: 'ورش وشراكات تدريبية بأهداف محددة.',
              },
              {
                title: 'المدربون والخبراء',
                body: 'شراكات محتوى ضمن معايير الجودة والحوكمة.',
              },
            ].map((card, i) => (
              <motion.div
                key={card.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: i * 0.05 }}
                whileHover={{ y: -3 }}
                className="min-h-[160px] rounded-3xl bg-white p-7 text-right shadow-emc ring-1 ring-line transition-shadow hover:shadow-emc-md"
              >
                <h3 className="text-lg font-black text-deepBlue">{card.title}</h3>
                <p className="mt-3 leading-8 text-slate-600">{card.body}</p>
              </motion.div>
            ))}
          </div>
        </PageShell>
      </section>

      {/* Mid CTA card */}
      <section className="pb-16 sm:pb-20">
        <PageShell>
          <motion.div
            className="flex flex-col items-start justify-between gap-8 rounded-3xl bg-gradient-to-l from-white to-sky-50/40 p-8 text-right shadow-emc-md ring-1 ring-line sm:flex-row sm:items-center sm:p-10"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
          >
            <div>
              <h2 className="text-2xl font-black text-deepBlue sm:text-3xl">جاهز للخطوة التالية؟</h2>
              <p className="mt-3 max-w-xl font-medium leading-9 text-slate-600">
                اختر البرنامج المناسب، أو تواصل معنا لاستشارة موجزة حول مسارك.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Link
                  to="/courses"
                  className="inline-flex items-center gap-2 rounded-xl bg-customOrange px-7 py-4 text-sm font-extrabold text-white shadow-lg"
                >
                  البرامج والدورات
                  <ArrowLeft size={18} />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-7 py-4 text-sm font-extrabold text-deepBlue transition hover:border-customBlue"
                >
                  تواصل معنا
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </PageShell>
      </section>

      <CTASection
        title="انضم إلى مجتمع EMC"
        description="سواء كنت متعلماً، شريكاً، أو متطوعاً — هناك مسار يناسبك ضمن منظومتنا."
        primaryLabel="استكشف المجالات"
        primaryHref="/tracks"
        secondaryLabel="شراكة"
        secondaryHref="/partnerships"
      />
    </main>
  )
}
