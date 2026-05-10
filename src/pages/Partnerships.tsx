import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, BadgeCheck, Building2, GraduationCap, Globe, HeartHandshake } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { fadeUp } from '../utils/course'

const partners = [
  {
    name: 'جامعة أمستردام',
    type: 'شريك أكاديمي',
    desc: 'تعاون في برامج القبول الجامعي وتطوير المناهج الأكاديمية لإعداد الطلاب للالتحاق بالجامعات الهولندية.',
    icon: GraduationCap,
    color: 'bg-sky-50 text-customBlue',
  },
  {
    name: 'مؤسسة التكامل الأوروبي',
    type: 'شريك مجتمعي',
    desc: 'شراكة استراتيجية في برامج الاندماج وتقديم الدعم للمهاجرين واللاجئين في مرحلة الاستقرار.',
    icon: HeartHandshake,
    color: 'bg-orange-50 text-customOrange',
  },
  {
    name: 'مركز التطوير المهني الأوروبي',
    type: 'شريك تدريبي',
    desc: 'تطوير مشترك لبرامج التدريب المهني والشهادات الاحترافية المعتمدة في أسواق العمل الأوروبية.',
    icon: Building2,
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    name: 'شبكة التعليم الدولي',
    type: 'شريك دولي',
    desc: 'تعاون دولي لتطوير محتوى تعليمي متعدد اللغات وتبادل أفضل الممارسات في التعليم عن بُعد.',
    icon: Globe,
    color: 'bg-violet-50 text-violet-600',
  },
]

const benefits = [
  { label: 'الوصول إلى شبكة المتدربين',   desc: 'تواصل مع أكثر من 2000 متدرب من خلفيات متنوعة.' },
  { label: 'تطوير مشترك للمحتوى',          desc: 'المشاركة في تصميم برامج تدريبية مبتكرة وفعّالة.' },
  { label: 'الإعلان عن فرص العمل',         desc: 'الوصول المباشر إلى خرّيجي برامجنا المؤهلين.' },
  { label: 'اعتراف دولي بالبرامج المشتركة', desc: 'شهادات مشتركة يعترف بها سوق العمل الأوروبي.' },
]

export default function Partnerships() {
  return (
    <main className="bg-slate-50 pt-20">
      <PageHeader
        title="الشراكات"
        subtitle="نبني شراكات استراتيجية مع مؤسسات أكاديمية ومهنية ومجتمعية لتوسيع أثرنا وخدمة متدربينا."
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'الشراكات' },
        ]}
      />

      {/* Partners grid */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-black text-deepBlue sm:text-4xl">شركاؤنا</h2>
            <span className="mx-auto mt-4 block h-1 w-20 rounded-full bg-customOrange" />
            <p className="mt-5 text-lg leading-9 text-slate-600">
              نتعاون مع مؤسسات رائدة على المستويين المحلي والدولي لضمان جودة برامجنا واعتمادها.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {partners.map((partner, index) => {
              const Icon = partner.icon
              return (
                <motion.article
                  key={partner.name}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.45, delay: index * 0.08 }}
                  className="rounded-2xl bg-white p-7 text-right shadow-xl shadow-slate-200/70 ring-1 ring-slate-100"
                >
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                      {partner.type}
                    </span>
                    <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${partner.color}`}>
                      <Icon size={24} />
                    </div>
                  </div>
                  <h3 className="text-xl font-black text-deepBlue">{partner.name}</h3>
                  <p className="mt-3 leading-8 text-slate-600">{partner.desc}</p>
                </motion.article>
              )
            })}
          </div>
        </div>
      </section>

      {/* Partnership benefits */}
      <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <motion.div
              className="text-right"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl font-black text-deepBlue sm:text-4xl">لماذا الشراكة مع EMC؟</h2>
              <span className="mt-4 block h-1 w-20 rounded-full bg-customOrange" />
              <p className="mt-7 text-lg leading-10 text-slate-600">
                نوفر لشركائنا قناة مباشرة للوصول إلى شريحة واسعة من المتعلمين الطموحين
                والمهنيين المحترفين في قلب أوروبا.
              </p>
              <ul className="mt-8 space-y-5">
                {benefits.map((b) => (
                  <li key={b.label} className="flex items-start gap-4">
                    <BadgeCheck size={22} className="mt-0.5 shrink-0 text-customBlue" />
                    <div>
                      <p className="font-black text-deepBlue">{b.label}</p>
                      <p className="mt-0.5 text-sm text-slate-500">{b.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div
              className="overflow-hidden rounded-2xl shadow-2xl"
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.55 }}
            >
              <img
                src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=85"
                alt="شراكات EMC"
                className="h-[420px] w-full object-cover"
              />
            </motion.div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 rounded-2xl bg-gradient-to-l from-deepBlue via-[#1c4567] to-[#162334] p-8 text-right text-white shadow-2xl sm:p-10 lg:flex-row lg:items-center"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <h2 className="text-3xl font-black sm:text-4xl">انضم إلى شبكة شركائنا</h2>
            <p className="mt-4 max-w-xl text-lg leading-9 text-slate-200">
              مؤسستك مرشحة لتكون شريكنا القادم. تواصل معنا لنستكشف فرص التعاون.
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.04 }}>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-lg bg-customOrange px-7 py-4 font-extrabold text-white"
            >
              تواصل معنا
              <ArrowLeft size={20} />
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </main>
  )
}
