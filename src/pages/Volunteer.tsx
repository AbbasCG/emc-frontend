import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, Clock, Compass, Heart, Sparkles, Users } from 'lucide-react'
import SectionHeader from '@/components/sections/SectionHeader'
import { CTASection, PublicPageHero, TimelineSteps } from '@/components/public'
import { departments10, volunteerLead } from '@/data/publicPages'
import { fadeUp, staggerContainer, staggerItem } from '@/utils/motion'

const journey = [
  {
    title: 'تقديم اهتمام',
    description: 'أرسل لنا نبذة عن خبرتك ومجالك والوقت المتاح — دون التزام.',
  },
  {
    title: 'مقابلة موجزة',
    description: 'جلسة تعارف قصيرة لتوضيح الأدوار المتاحة وتوقعات الطرفين.',
  },
  {
    title: 'تجربة منضبطة',
    description: 'تبدأ بمهام محددة مع إشراف من إدارة البرامج أو التشغيل.',
  },
  {
    title: 'تقييم وتطوير',
    description: 'ملاحظات دورية لتحسين التجربة وربما الانتقال لدور أوسع.',
  },
]

export default function Volunteer() {
  return (
    <main className="bg-[#f4f7fb] pt-20">
      <PublicPageHero
        eyebrow="انضم إلى الأثر"
        title="التطوع والانضمام لفريق EMC"
        subtitle="فرصة للمساهمة في برامج تعليمية بجودة عالية — مع تعلم عملي وتجربة فريق منضبطة."
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'التطوع' },
        ]}
      />

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            align="right"
            title="لماذا تنضم إلى EMC؟"
            description={volunteerLead.ar}
          />
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5 }}
            className="grid gap-4 md:grid-cols-3"
          >
            {[
              { icon: Heart, t: 'أثر حقيقي', d: 'مساهمة في تجارب تعلم يستفيد منها أفراد من خلفيات متنوعة.' },
              { icon: Compass, t: 'خبرة مهنية', d: 'تعرّف على تنظيم البرامج، التشغيل، والجودة من الداخل.' },
              { icon: Users, t: 'مجتمع داعم', d: 'بيئة عمل تطوعية محترمة بحدود واضحة للوقت والمهام.' },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div key={item.t} className="rounded-3xl bg-white p-7 text-right shadow-md ring-1 ring-slate-100">
                  <Icon className="text-customBlue" size={26} />
                  <h3 className="mt-4 text-lg font-black text-deepBlue">{item.t}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{item.d}</p>
                </div>
              )
            })}
          </motion.div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            title="أدوار ومجالات يمكن المساهمة فيها"
            description="لا نعد بآلاف الساعات «السحرية» — نحدد أدواراً مرتبطة بإداراتنا حسب الحاجة الفعلية للبرامج."
          />
          <motion.div
            className="grid gap-6 md:grid-cols-2"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            {departments10.slice(0, 8).map((dept) => (
              <motion.article
                key={dept.id}
                variants={staggerItem}
                className="rounded-3xl bg-white p-7 text-right shadow-lg ring-1 ring-slate-100"
              >
                <h3 className="text-lg font-black text-deepBlue">{dept.title.ar}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{dept.description.ar}</p>
                <p className="mt-4 text-xs font-bold text-customBlue">
                  أمثلة مساهمة: {dept.responsibilities[0]?.ar}
                </p>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-3xl bg-white p-8 shadow-lg ring-1 ring-slate-100 lg:p-12">
          <SectionHeader title="رحلة المتطوع" description="خطوات واضحة تقلل الالتباس وتبني التزاماً صحيحاً من الطرفين." />
          <TimelineSteps steps={journey} />
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            title="التزام متوقع"
            description="نحترم وقتك؛ لذلك نطلب توقعات واقعية يمكن الالتزام بها."
          />
          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                icon: Clock,
                title: 'وقت محدد أسبوعياً',
                lines: ['غالباً بين 2—6 ساعات حسب الدور والمرحلة.', 'جدولة مسبقة مع مساحة للتعديل المعقول.'],
              },
              {
                icon: Sparkles,
                title: 'انضباط وتواصل',
                lines: ['الالتزام بالمواعيد النهائية المتفق عليها.', 'إبلاغ مبكر عند تعارض لإعادة التنسيق.'],
              },
            ].map((block) => {
              const Icon = block.icon
              return (
                <motion.div
                  key={block.title}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.45 }}
                  className="rounded-3xl bg-white p-7 text-right shadow-md ring-1 ring-slate-100"
                >
                  <Icon className="text-customOrange" size={26} />
                  <h3 className="mt-4 text-lg font-black text-deepBlue">{block.title}</h3>
                  <ul className="mt-3 space-y-2">
                    {block.lines.map((l) => (
                      <li key={l} className="flex items-start gap-2 text-sm font-semibold text-slate-600">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-customBlue" />
                        {l}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            title="مهارات نبحث عنها"
            description="تختلف حسب الدور، لكن هذه أساسيات شائعة تساعدنا على العمل بسلاسة."
          />
          <motion.ul
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
          >
            {[
              'تواصل واضح بالعربية (والإنجليزية ميزة عند الحاجة).',
              'انضباط في المواعيد والوثائق.',
              'احترام خصوصية المشاركين وسياسات المنصة.',
              'خبرة في التدريب، التحرير، التصميم، أو التشغيل — حسب الدور.',
              'رغبة في التعلم والاستفادة من التوجيه.',
              'روح تعاون داخل فريق متنوع.',
            ].map((skill) => (
              <motion.li
                key={skill}
                variants={staggerItem}
                className="rounded-2xl bg-white p-4 text-right text-sm font-semibold leading-7 text-slate-700 shadow-sm ring-1 ring-slate-100"
              >
                {skill}
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </section>

      <section className="px-4 pb-12 sm:px-6 lg:px-8">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-7xl rounded-3xl bg-deepBlue p-8 text-right text-white shadow-2xl lg:p-10"
        >
          <h2 className="text-2xl font-black">هل أنت مستعد للانضمام؟</h2>
          <p className="mt-4 max-w-3xl leading-9 text-slate-200">
            قدّم طلبك عبر النموذج المخصص — أدخل بياناتك، اختر قسمك، وشارك خبرتك. سنراجع طلبك ونتواصل معك قريبًا.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/volunteer/apply"
              className="inline-flex rounded-xl bg-customOrange px-7 py-4 text-sm font-extrabold text-white shadow-lg shadow-orange-900/25 transition hover:brightness-105"
            >
              تقديم طلب
            </Link>
            <Link
              to="/team"
              className="inline-flex rounded-xl border border-white/25 px-7 py-4 text-sm font-extrabold text-white transition hover:bg-white/10"
            >
              التعرف على الفريق
            </Link>
          </div>
        </motion.div>
      </section>

      <CTASection
        title="كن جزءاً من بناء تجربة تعليمية احترافية"
        description="التطوع في EMC يعني مسؤولية وجودة. إذا كان هذا يتماشى مع قيمك، نحن نرحب بتواصلك."
        primaryLabel="تقديم طلب التطوع"
        primaryHref="/volunteer/apply"
        secondaryLabel="الشراكات"
        secondaryHref="/partnerships"
      />
    </main>
  )
}
