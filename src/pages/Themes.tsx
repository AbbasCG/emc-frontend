import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Baby,
  Brain,
  Briefcase,
  CheckCircle2,
  Globe2,
  GraduationCap,
  Handshake,
  HeartPulse,
  Languages,
  Lightbulb,
  Map,
  Rocket,
  Wallet,
} from 'lucide-react'
import SectionHeader from '@/components/sections/SectionHeader'
import { CTASection, PublicPageHero } from '@/components/public'
import { themes12 } from '@/data/publicPages'
import { fadeUp, staggerContainer, staggerItem } from '@/utils/motion'

const iconMap = {
  GraduationCap,
  Globe2,
  Languages,
  Brain,
  Briefcase,
  Rocket,
  Lightbulb,
  HeartPulse,
  Wallet,
  Map,
  Baby,
  Handshake,
} as const

export default function Themes() {
  return (
    <main className="bg-[#f4f7fb] pt-20">
      <PublicPageHero
        eyebrow="منظومة المجالات"
        title="المجالات الاثنا عشر"
        subtitle="مجالات EMC الرئيسية تغطي التعلم الأكاديمي والمهني والرقمي والمجتمعي — بربط واضح بين المعرفة والتطبيق."
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'المجالات' },
        ]}
      />

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            align="right"
            eyebrow="نظرة عامة"
            title="كيف تُبنى تجربة EMC"
            description="كل مجال يمثل بوابة تعلم: يمكنك البدء من احتياجك الحالي ثم الانتقال تدريجياً إلى مجالات مكملة مثل اللغة، المهارات، ثم التخصص الرقمي أو الريادي."
          />
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl bg-white p-8 text-right shadow-lg ring-1 ring-slate-100 lg:p-10"
          >
            <p className="text-lg leading-9 text-slate-600">
              لا تعمل المجالات بمعزل عن بعضها: برامج اللغة تدعم المسار الأكاديمي، والمهارات
              المهنية تتكامل مع التعلم الرقمي، والوعي المجتمعي يعزز جودة التجربة الإنسانية
              للمتعلم.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            className="grid gap-6 md:grid-cols-2"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.08 }}
          >
            {themes12.map((theme) => {
              const Icon = iconMap[theme.icon as keyof typeof iconMap] ?? GraduationCap
              return (
                <motion.article
                  key={theme.id}
                  variants={staggerItem}
                  className="flex h-full flex-col rounded-3xl bg-white p-8 text-right shadow-lg ring-1 ring-slate-100"
                >
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-customBlue">
                      <Icon size={28} />
                    </div>
                  </div>
                  <h3 className="text-xl font-black text-deepBlue">{theme.title.ar}</h3>
                  <p className="mt-3 leading-8 text-slate-600">{theme.shortDescription.ar}</p>
                  <ul className="mt-5 space-y-2">
                    {theme.bullets.map((b) => (
                      <li key={b.ar} className="flex items-start gap-2 text-sm font-semibold text-slate-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-customBlue" />
                        <span>{b.ar}</span>
                      </li>
                    ))}
                  </ul>
                </motion.article>
              )
            })}
          </motion.div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            title="ربط المجالات بمسار متكامل"
            description="تبدأ من أساسيات اللغة أو المهارات، ثم تنتقل إلى التخصص أو الريادة، مع دعم مستمر في الوعي المالي والصحة النفسية عند الحاجة."
          />
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
            className="grid gap-4 lg:grid-cols-3"
          >
            {[
              {
                title: 'الأساس',
                body: 'اللغة، المسار الأكاديمي، والوعي المعرفي يشكّلان أرضية قوية للتعلم.',
              },
              {
                title: 'التطبيق',
                body: 'المهارات المهنية، التعلم الميداني، والتمكين الرقمي يحوّلان المعرفة إلى مخرجات.',
              },
              {
                title: 'الاستدامة',
                body: 'الصحة النفسية، الوعي المالي، والشراكات تدعم استمرارية التطوير.',
              },
            ].map((c) => (
              <div
                key={c.title}
                className="rounded-3xl bg-white p-7 text-right shadow-md ring-1 ring-slate-100"
              >
                <h3 className="text-lg font-black text-deepBlue">{c.title}</h3>
                <p className="mt-3 leading-8 text-slate-600">{c.body}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            title="اقتراحات برامج حسب المجال"
            description="عناوين توضيحية يمكن ربطها لاحقاً بكتالوج الدورات الفعلي دون تغيير الواجهة."
          />
          <div className="grid gap-4 md:grid-cols-2">
            {themes12.map((theme, i) => (
              <motion.div
                key={theme.id}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.4, delay: (i % 4) * 0.04 }}
                className="rounded-3xl border border-slate-100 bg-white p-6 text-right shadow-sm"
              >
                <p className="text-sm font-black text-customBlue">{theme.title.ar}</p>
                <ul className="mt-3 space-y-1 text-sm text-slate-600">
                  {theme.suggestedPrograms.map((p) => (
                    <li key={p.ar}>• {p.ar}</li>
                  ))}
                </ul>
                <Link
                  to="/courses"
                  className="mt-4 inline-block text-xs font-bold text-customOrange hover:underline"
                >
                  الانتقال إلى البرامج والدورات
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <CTASection
        title="سجّل في البرنامج المناسب أو اطرح فكرة شراكة"
        description="يمكنك استكشاف الدورات المتاحة حالياً، أو التواصل معنا لتصميم برنامج يخدم فريقك أو مؤسستك."
        primaryLabel="تصفح البرامج والدورات"
        primaryHref="/courses"
        secondaryLabel="شراكة مع EMC"
        secondaryHref="/partnerships"
      />
    </main>
  )
}
