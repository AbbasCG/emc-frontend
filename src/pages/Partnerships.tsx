import { motion } from 'framer-motion'
import {
  BadgeCheck,
  BadgeDollarSign,
  BookMarked,
  Factory,
  HeartHandshake,
  Mic2,
  School,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import SectionHeader from '@/components/sections/SectionHeader'
import { CTASection, PublicPageHero } from '@/components/public'
import { partnershipTypes } from '@/data/publicPages'
import { fadeUp, staggerContainer, staggerItem } from '@/utils/motion'

function TypeIcon({ name }: { name: string }) {
  const map: Record<string, LucideIcon> = {
    School,
    BookMarked,
    Factory,
    Mic2,
    HeartHandshake,
    BadgeDollarSign,
  }
  const Icon = map[name] ?? School
  return <Icon size={22} />
}

export default function Partnerships() {
  return (
    <main className="bg-paper pt-20">
      <PublicPageHero
        eyebrow="نموذج تعاون مسؤول"
        title="الشراكات"
        subtitle="نرحب بالجامعات، المدارس، الشركات، المدربين، المبادرات المجتمعية، والجهات الداعمة — بشروط وضوح وهدف مشترك."
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'الشراكات' },
        ]}
      />

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            align="right"
            title="لماذا تتعاون مع EMC؟"
            description="لأننا نعمل على ربط التعليم الجيد باحتياجات حقيقية: أفراد يبحثون عن مسار، ومؤسسات تبحث عن أثر — ضمن إطار جودة واحترام للمتعلم."
          />
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl bg-white p-8 text-right shadow-emc-lg ring-1 ring-line lg:p-10"
          >
            <p className="text-lg leading-9 text-slate-600">
              نؤمن بأن الشراكة الناجحة تُبنى على أهداف محددة، أدوار واضحة، ومخرجات قابلة للقياس.
              لا نعد بـ«نتائج فورية ضخمة» — بل نلتزم بمهنية في التصميم والتنفيذ والمتابعة.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader title="أنواع الشراكات" />
          <motion.div
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            {partnershipTypes.map((p) => (
              <motion.article
                key={p.title.ar}
                variants={staggerItem}
                whileHover={{ y: -3 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                className="group relative overflow-hidden rounded-3xl bg-white p-7 text-right shadow-emc ring-1 ring-line transition-shadow hover:shadow-emc-md"
              >
                <span aria-hidden className="emc-daylight pointer-events-none absolute inset-x-0 top-0 h-[3px] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-customBlue ring-1 ring-customBlue/15">
                  <TypeIcon name={p.icon} />
                </div>
                <h3 className="text-lg font-black text-deepBlue">{p.title.ar}</h3>
                <p className="mt-3 leading-8 text-slate-600">{p.description.ar}</p>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            title="ماذا يحصل الشركاء؟"
            description="قيمة عملية: وصول لمجتمع متعلم، جودة في التنفيذ، وهوية محتوى واضحة."
          />
          <div className="grid gap-4 md:grid-cols-2">
            {[
              'تصميم مشترك للبرامج وفق احتياجات الجهة والجمهور المستهدف.',
              'تنسيق تشغيلي وإعلامي يحافظ على تجربة احترافية للمشاركين.',
              'إمكانية إبراز الشريك ضمن أطر أخلاقية وشفافة.',
              'مراجعة جودة ومتابعة بعد التنفيذ لتحسين الدورات القادمة.',
            ].map((line, i) => (
              <motion.div
                key={line}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: i * 0.05 }}
                className="flex gap-3 rounded-3xl bg-white p-6 text-right shadow-emc ring-1 ring-line"
              >
                <BadgeCheck className="mt-0.5 h-6 w-6 shrink-0 text-customBlue" />
                <p className="font-semibold leading-8 text-slate-700">{line}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            title="مسار التعاون"
            description="خطوات بسيطة تقلل الالتباس وتسرّع الانطلاق — مع مرونة حسب نوع الشريك."
          />
          <motion.ol
            className="grid gap-4 md:grid-cols-2"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
          >
            {[
              { t: 'تواصل أولي', d: 'نحدد الهدف، الجمهور، والجدول الزمني المتوقع.' },
              { t: 'عرض مقترح', d: 'نقدّم خطة برنامج أو شراكة مع مخرجات ومسؤوليات.' },
              { t: 'اعتماد وتنفيذ', d: 'اعتماد نطاق العمل ثم التشغيل مع متابعة جودة.' },
              { t: 'تقييم وتحسين', d: 'ملاحظات المشاركين والشريك تدخل دورة التحسين.' },
            ].map((step, i) => (
              <motion.li
                key={step.t}
                variants={staggerItem}
                className="rounded-3xl bg-white p-6 text-right shadow-emc ring-1 ring-line"
              >
                <span className="emc-num text-xs font-black tabular-nums text-accent-700">المرحلة {i + 1}</span>
                <p className="mt-2 text-lg font-black text-deepBlue">{step.t}</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">{step.d}</p>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            title="أمثلة لفرص تعاون"
            description="عناوين واقعية يمكن تخصيصها لاحقاً حسب توفر البرامج والجهات."
          />
          <div className="grid gap-4 lg:grid-cols-3">
            {[
              'سلسلة ورش لطلاب الجامعة حول المهارات المهنية ومسار التخصص.',
              'برنامج لغة وتوجيه للموظفين الجدد ضمن شركة أو مؤسسة.',
              'شراكة مجتمعية لدعم فئة محددة عبر منح جزئية أو تطوع خبراء.',
            ].map((ex) => (
              <motion.div
                key={ex}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45 }}
                className="rounded-3xl border border-dashed border-customBlue/25 bg-white/80 p-6 text-right leading-8 text-slate-700 shadow-emc-sm"
              >
                {ex}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-10 sm:px-6 lg:px-8">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-7xl rounded-3xl bg-white p-8 text-right shadow-emc-lg ring-1 ring-line lg:p-10"
        >
          <h2 className="emc-title-arc text-2xl font-black text-deepBlue">كتلة التواصل والشراكة</h2>
          <p className="mt-4 max-w-3xl text-lg leading-9 text-slate-600">
            أرسل لنا فكرة الشراكة، نوع المؤسسة، والفئة المستهدفة. سنرد برسالة توضح إمكانية
            التعاون والخطوة التالية — دون التزام قبل الاتفاق المتبادل.
          </p>
        </motion.div>
      </section>

      <CTASection
        title="ابدأ حوار الشراكة"
        description="تواصل معنا عبر صفحة التواصل، واختر موضوعاً متعلقاً بالشراكات ليتم توجيه رسالتك للفريق المناسب."
        primaryLabel="تواصل معنا"
        primaryHref="/contact"
        secondaryLabel="تقديم ورشة أو برنامج"
        secondaryHref="/submit-workshop"
      />
    </main>
  )
}
