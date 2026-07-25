import { Link } from 'react-router'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Award,
  BookOpen,
  Check,
  Globe,
  Lightbulb,
  Megaphone,
  Rocket,
  Star,
  Users,
} from 'lucide-react'
import { PublicPageHero } from '@/components/public'
import { fadeUp, staggerContainer, staggerItem } from '@/utils/motion'

const benefits = [
  {
    icon: Award,
    accentBg: 'bg-customBlue/[0.08]',
    accentBorder: 'border-customBlue/20',
    accentIcon: 'text-customBlue',
    accentBar: 'bg-customBlue',
    title: 'شهادة سفير معتمد',
    description: 'احصل على شهادة رسمية معتمدة من EMC تُثري ملفك المهني وتُعزز حضورك الأكاديمي.',
  },
  {
    icon: Megaphone,
    accentBg: 'bg-customOrange/10',
    accentBorder: 'border-customOrange/20',
    accentIcon: 'text-customOrange',
    accentBar: 'bg-customOrange',
    title: 'قيادة مجتمعية حقيقية',
    description: 'كُن الصوت الرسمي للتحول الرقمي في جامعتك، ونظّم فعاليات وورش تُحدث أثراً ملموساً.',
  },
  {
    icon: BookOpen,
    accentBg: 'bg-emerald-50',
    accentBorder: 'border-emerald-100',
    accentIcon: 'text-emerald-600',
    accentBar: 'bg-emerald-500',
    title: 'تدريب متخصص مجاني',
    description: 'وصول كامل لمسارات EMC التدريبية والإرشاد من خبراء الصناعة طوال فترة البرنامج.',
  },
]

const journey = [
  {
    step: '01',
    title: 'تقديم الطلب',
    description: 'أكمل نموذج التقديم الإلكتروني بالتفاصيل المطلوبة. العملية لا تستغرق أكثر من 20 دقيقة.',
  },
  {
    step: '02',
    title: 'مراجعة الفريق',
    description: 'يراجع فريق EMC طلبك خلال 7-10 أيام عمل ويُقيّم مدى التوافق مع متطلبات البرنامج.',
  },
  {
    step: '03',
    title: 'مقابلة الاختيار',
    description: 'نُجري معك مقابلة قصيرة لاستكشاف دوافعك وتطلعاتك القيادية داخل جامعتك.',
  },
  {
    step: '04',
    title: 'التدريب التأهيلي',
    description: 'تشارك في برنامج تأهيل مكثف يُعدّك للعمل كسفير فاعل بأدوات وموارد EMC.',
  },
  {
    step: '05',
    title: 'الإطلاق الرسمي',
    description: 'تُعلن رسمياً سفيراً للتحول الرقمي وتبدأ رحلتك في قيادة مجتمعك الأكاديمي.',
  },
]

const skills = [
  'طالب جامعي نشط في مرحلة البكالوريوس أو الدراسات العليا.',
  'شغف حقيقي بالتكنولوجيا والتحول الرقمي.',
  'مهارات تواصل وقيادة داخل البيئة الجامعية.',
  'إلمام باللغة العربية، والإنجليزية ميزة إضافية.',
  'القدرة على تخصيص 5-8 ساعات شهرياً للبرنامج.',
  'روح المبادرة والتفكير الإبداعي في حل المشكلات.',
]

const roles = [
  { icon: Globe, title: 'التوعية والانتشار', desc: 'نشر ثقافة التحول الرقمي عبر الفعاليات والمبادرات الجامعية.' },
  { icon: Users, title: 'بناء المجتمع', desc: 'تكوين مجموعات طلابية مهتمة بالتقنية وتعزيز التشبيك بينها.' },
  { icon: Lightbulb, title: 'تنظيم الفعاليات', desc: 'ورش عمل ومسابقات وهاكاثونات بالتعاون مع فريق EMC.' },
  { icon: Rocket, title: 'التسويق الرقمي', desc: 'إنتاج محتوى رقمي يعكس رسالة EMC في البيئة الجامعية.' },
  { icon: Star, title: 'التوجيه والإرشاد', desc: 'مساعدة الطلاب على الوصول لبرامج EMC التدريبية والتعليمية.' },
]

export default function AmbassadorProgram() {
  return (
    <main className="bg-[#f4f7fb] pt-20">
      <PublicPageHero
        eyebrow="برنامج القيادة الرقمية"
        title="سفراء التحول الرقمي"
        subtitle="انضم لشبكة قادة التحول الرقمي في الجامعات العربية — مبادرة EMC لتمكين الجيل القادم من صنّاع التغيير."
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'انضم إلينا', href: '/volunteer' },
          { label: 'سفراء التحول الرقمي' },
        ]}
        primaryAction={{ label: 'تقديم طلبي الآن', href: '/ambassador/apply' }}
        secondaryAction={{ label: 'تعرف على الفريق', href: '/team' }}
      />

      {/* ── Benefits ── */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-customBlue/[0.08] px-4 py-1.5 text-xs font-black text-customBlue">
            <span className="h-1.5 w-1.5 rounded-full bg-customBlue" />
            لماذا تصبح سفيراً؟
          </div>
          <h2 className="mb-2 mt-4 text-2xl font-black text-deepBlue sm:text-3xl">مزايا البرنامج</h2>
          <p className="mb-10 max-w-2xl text-sm leading-8 text-slate-600">
            أكثر من مجرد لقب — برنامج متكامل يُطور مهاراتك القيادية والرقمية ويفتح أمامك أبواباً مهنية واسعة.
          </p>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="grid gap-6 md:grid-cols-3"
          >
            {benefits.map((item) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={item.title}
                  variants={staggerItem}
                  className="group relative overflow-hidden rounded-3xl bg-white p-8 text-right shadow-[0_4px_24px_-4px_rgba(12,42,75,0.08)] ring-1 ring-slate-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_48px_-12px_rgba(12,42,75,0.14)]"
                >
                  <div className={`absolute inset-x-0 top-0 h-[3px] ${item.accentBar}`} />
                  <div
                    className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl border ${item.accentBg} ${item.accentBorder}`}
                  >
                    <Icon className={item.accentIcon} size={22} />
                  </div>
                  <h3 className="text-lg font-black text-deepBlue">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{item.description}</p>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* ── Roles ── */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-customOrange/10 px-4 py-1.5 text-xs font-black text-customOrange">
            <span className="h-1.5 w-1.5 rounded-full bg-customOrange" />
            ما ستقوم به
          </div>
          <h2 className="mb-2 mt-4 text-2xl font-black text-deepBlue sm:text-3xl">أدوار السفير الرقمي</h2>
          <p className="mb-10 max-w-2xl text-sm leading-8 text-slate-600">
            تتنوع مهام السفير بحسب بيئته الجامعية وإمكاناته، لكنها تلتقي جميعاً في هدف واحد: نشر ثقافة التحول الرقمي.
          </p>

          <motion.div
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            {roles.map((role, i) => {
              const Icon = role.icon
              return (
                <motion.article
                  key={role.title}
                  variants={staggerItem}
                  className="group relative overflow-hidden rounded-2xl bg-white p-6 text-right shadow-sm ring-1 ring-slate-100 transition-all duration-300 hover:shadow-[0_8px_32px_-6px_rgba(12,42,75,0.12)] hover:ring-customBlue/20"
                >
                  <div className="absolute inset-y-0 right-0 w-[3px] rounded-r-2xl bg-gradient-to-b from-customBlue/60 to-customBlue/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="flex items-start gap-4">
                    <span className="emc-num mt-0.5 shrink-0 text-xs font-black text-slate-300">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-customBlue/[0.08]">
                        <Icon className="text-customBlue" size={18} />
                      </div>
                      <h3 className="text-base font-black text-deepBlue">{role.title}</h3>
                      <p className="mt-1.5 text-sm leading-7 text-slate-600">{role.desc}</p>
                    </div>
                  </div>
                </motion.article>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* ── Journey ── */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-deepBlue/[0.07] px-4 py-1.5 text-xs font-black text-deepBlue">
            <span className="h-1.5 w-1.5 rounded-full bg-deepBlue" />
            خطوات الانضمام
          </div>
          <h2 className="mb-2 mt-4 text-2xl font-black text-deepBlue sm:text-3xl">رحلتك نحو السفارة الرقمية</h2>
          <p className="mb-12 max-w-2xl text-sm leading-8 text-slate-600">
            عملية واضحة وشفافة — نحترم وقتك ونبقيك على اطلاع في كل مرحلة.
          </p>

          <div className="relative">
            <div className="absolute right-5 top-12 h-[calc(100%-5rem)] w-px bg-gradient-to-b from-customBlue/40 via-customBlue/15 to-transparent sm:right-6" />
            <div className="grid gap-5">
              {journey.map((step, i) => (
                <motion.div
                  key={step.step}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="flex items-start gap-5 sm:gap-6"
                >
                  <div className="relative shrink-0">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-deepBlue text-white shadow-lg shadow-deepBlue/25 sm:h-12 sm:w-12">
                      <span className="emc-num text-sm font-black">{step.step}</span>
                    </div>
                  </div>
                  <div className="flex-1 rounded-2xl bg-white p-5 text-right shadow-sm ring-1 ring-slate-100 sm:p-6">
                    <h3 className="text-base font-black text-deepBlue">{step.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Requirements ── */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-customBlue/[0.08] px-4 py-1.5 text-xs font-black text-customBlue">
            <span className="h-1.5 w-1.5 rounded-full bg-customBlue" />
            من نبحث عنه
          </div>
          <h2 className="mb-2 mt-4 text-2xl font-black text-deepBlue sm:text-3xl">متطلبات القبول</h2>
          <p className="mb-8 max-w-2xl text-sm leading-8 text-slate-600">
            لا نبحث عن الكمال — نبحث عن الشغف والالتزام والرغبة الحقيقية في إحداث التغيير.
          </p>

          <motion.ul
            className="flex flex-wrap gap-3"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
          >
            {skills.map((skill) => (
              <motion.li
                key={skill}
                variants={staggerItem}
                className="flex items-center gap-2.5 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-100"
              >
                <Check className="h-4 w-4 shrink-0 text-customBlue" />
                {skill}
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.5 }}
          className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-deepBlue text-right text-white shadow-2xl"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_110%_-10%,rgba(0,119,182,0.38),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_-10%_110%,rgba(242,140,0,0.18),transparent_52%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-customBlue/40 to-transparent" />

          <div className="relative px-8 py-12 lg:px-14 lg:py-14">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] px-4 py-1.5 text-xs font-black text-white/90 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-customOrange" />
              التقديم متاح الآن
            </span>
            <h2 className="mt-5 text-2xl font-black sm:text-3xl lg:text-[2.25rem] lg:leading-tight">
              ابدأ رحلتك كسفير للتحول الرقمي
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-9 text-slate-300">
              قدّم طلبك عبر النموذج الإلكتروني — أجب على الأسئلة، ارفع ملفاتك، وسيتواصل معك فريق EMC خلال 10 أيام عمل.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/ambassador/apply"
                className="inline-flex items-center gap-2 rounded-2xl bg-customOrange px-7 py-4 text-sm font-extrabold text-white shadow-lg shadow-orange-900/30 transition hover:brightness-110"
              >
                تقديم طلبي الآن
                <ArrowLeft size={16} />
              </Link>
              <Link
                to="/volunteer"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/[0.08] px-7 py-4 text-sm font-extrabold text-white backdrop-blur-sm transition hover:border-white/40 hover:bg-white/[0.14]"
              >
                برنامج التطوع
              </Link>
            </div>
          </div>
        </motion.div>
      </section>
    </main>
  )
}
