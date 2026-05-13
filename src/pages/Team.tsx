import { motion } from 'framer-motion'
import {
  Award,
  GraduationCap,
  HeartHandshake,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react'
import SectionHeader from '@/components/sections/SectionHeader'
import { CTASection, IconCard, PublicPageHero } from '@/components/public'
import { departments10 } from '@/data/publicPages'
import { fadeUp, staggerContainer, staggerItem } from '@/utils/motion'

export default function Team() {
  return (
    <main className="bg-[#f4f7fb] pt-20">
      <PublicPageHero
        eyebrow="الفريق والهيكل"
        title="فريق EMC"
        subtitle="نعرض هيكل الفريق بصيغة أدوار ومسؤوليات — دون أسماء شخصية وهمية — لأن التحديثات البشرية تتم عبر القنوات الرسمية."
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'الفريق' },
        ]}
      />

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            align="right"
            title="القيادة والتوجيه"
            description="الإدارة العليا تضع الرؤية والأولويات، وتتابع الالتزام بالجودة والحوكمة عبر الإدارات."
          />
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl bg-white p-8 text-right shadow-xl ring-1 ring-slate-100 lg:p-10"
          >
            <div className="flex flex-wrap items-center gap-3 text-customBlue">
              <Award size={28} />
              <h3 className="text-xl font-black text-deepBlue">ملخص دور القيادة</h3>
            </div>
            <ul className="mt-6 grid gap-3 text-slate-600 sm:grid-cols-2">
              {[
                'اعتماد الاستراتيجية وخارطة البرامج السنوية.',
                'تمثيل المنصة أمام الشركاء الرئيسيين.',
                'ضمان توافق الرسالة مع مخرجات البرامج.',
                'الإشراف على مؤشرات الجودة والمخاطر.',
              ].map((line) => (
                <li key={line} className="flex gap-2 text-sm font-semibold leading-7">
                  <span className="text-customOrange">•</span>
                  {line}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            title="رؤوس الإدارات والمسؤوليات الوظيفية"
            description="كل إدارة لها مسؤوليات محددة في publicPages — وهنا نلخصها كبطاقات أدوار."
          />
          <motion.div
            className="grid gap-6 md:grid-cols-2"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.08 }}
          >
            {departments10.map((d) => (
              <motion.div key={d.id} variants={staggerItem}>
                <IconCard
                  icon={Users}
                  title={d.title.ar}
                  iconWrapClass="bg-sky-50 text-customBlue"
                >
                  <p>{d.description.ar}</p>
                  <p className="mt-3 text-xs font-bold text-slate-500">
                    أبرز مسؤولية: {d.responsibilities[0]?.ar}
                  </p>
                </IconCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            title="المدربون والمرشدون"
            description="شبكة مدربين ومرشدين يتم اختيارهم وفق معايير مهنية — وتتنوع تخصصاتهم مع مجالات الاثنا عشر."
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5 }}
              className="rounded-3xl bg-white p-8 text-right shadow-lg ring-1 ring-slate-100"
            >
              <GraduationCap className="text-customOrange" size={32} />
              <h3 className="mt-4 text-xl font-black text-deepBlue">معايير عامة للمدربين</h3>
              <ul className="mt-4 space-y-2 text-sm font-semibold leading-7 text-slate-600">
                {[
                  'خبرة تطبيقية في المجال الذي يتم تدريسه.',
                  'الالتزام بخطة البرنامج ومخرجات التعلم.',
                  'احترام سياسات الخصوصية والسلامة.',
                  'استعداد للتقييم وبناء التحسين المستمر.',
                ].map((x) => (
                  <li key={x}>— {x}</li>
                ))}
              </ul>
            </motion.div>
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: 0.06 }}
              className="rounded-3xl bg-white p-8 text-right shadow-lg ring-1 ring-slate-100"
            >
              <HeartHandshake className="text-customBlue" size={32} />
              <h3 className="mt-4 text-xl font-black text-deepBlue">المرشدون</h3>
              <p className="mt-3 text-sm leading-8 text-slate-600">
                يقدّم المرشدون دعماً موجهاً للأفراد في مراحل محددة (أكاديمية أو مهنية)، ضمن
                إطار زمني متفق عليه وبضوابط خصوصية.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            title="المتطوعون والمساهمون"
            description="مساحة للمساهمين الذين يدعمون البرامج بوقت محدود — بإشراف إدارة التشغيل أو البرامج."
          />
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl border border-dashed border-customBlue/30 bg-white p-8 text-right shadow-sm lg:p-10"
          >
            <p className="text-lg leading-9 text-slate-600">
              نحدّث أدوار المتطوعين وفق احتياج البرامج الموسمية. للانضمام، راجع صفحة التطوع ثم
              أرسل طلباً عبر التواصل مع ذكر المجال الذي ترغب بالمساهمة فيه.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader title="قيم الفريق" description="قيم نعمل بها داخلياً ومع المجتمع." />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Shield, t: 'احترام المتعلم', d: 'خصوصية، تمكين، وعدم إذلال.' },
              { icon: Sparkles, t: 'جودة المحتوى', d: 'دقة، وضوح، وتحديث مستمر.' },
              { icon: HeartHandshake, t: 'شراكة نزيهة', d: 'شفافية في التوقعات والنتائج.' },
              { icon: Award, t: 'مساءلة مهنية', d: 'قرارات مبررة وقابلة للمراجعة.' },
            ].map((v, i) => {
              const Icon = v.icon
              return (
                <motion.div
                  key={v.t}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="rounded-3xl bg-white p-6 text-right shadow-md ring-1 ring-slate-100"
                >
                  <Icon className="text-customBlue" size={24} />
                  <h3 className="mt-3 font-black text-deepBlue">{v.t}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{v.d}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      <CTASection
        title="هل ترغب بالانضمام كمدرب أو متطوع؟"
        description="تواصل معنا عبر صفحة التطوع أو التواصل، واذكر مجال خبرتك والوقت المتاح."
        primaryLabel="صفحة التطوع"
        primaryHref="/volunteer"
        secondaryLabel="تواصل معنا"
        secondaryHref="/contact"
      />
    </main>
  )
}
