import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, BadgeCheck, GraduationCap, Star, Users } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { fadeUp } from '../utils/course'

const stats = [
  { value: '+2000', label: 'متدرب استفاد من برامجنا', icon: Users,         color: 'text-customBlue'  },
  { value: '+100',  label: 'دورة وورشة أُطلقت',        icon: BadgeCheck,    color: 'text-customOrange' },
  { value: '+50',   label: 'مدرب ومستشار معتمد',       icon: GraduationCap, color: 'text-emerald-600' },
  { value: '95%',   label: 'رضا المتدربين عن البرامج', icon: Star,          color: 'text-violet-600'  },
]

const stories = [
  {
    name: 'رنا الخطيب',
    country: 'سوريا → هولندا',
    text: 'بعد التحاقي ببرنامج اللغة الهولندية وورشة التوظيف في EMC، حصلت على أول وظيفة لي في أمستردام خلال أربعة أشهر. كان الدعم الشخصي الفرق الأكبر في تجربتي.',
    program: 'برنامج اللغة الهولندية + التوظيف',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
  },
  {
    name: 'يوسف الأمين',
    country: 'المغرب → بلجيكا',
    text: 'ساعدني فريق EMC في إعداد ملف القبول الجامعي الخاص بي. حصلت على قبول في جامعة بروكسل الحرة بمنحة كاملة. لم أكن لأصل إلى هنا بدون دعمهم.',
    program: 'برنامج القبول الجامعي والمنح',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
  },
  {
    name: 'منال سلطان',
    country: 'العراق → ألمانيا',
    text: 'دورة الذكاء الاصطناعي والبيانات غيّرت مساري المهني بالكامل. انتقلت من مجال مختلف تماماً إلى وظيفة في تحليل البيانات برواتب مجزية.',
    program: 'مسار التقنية والذكاء الاصطناعي',
    image: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=300&q=80',
  },
]

const areas = [
  {
    title: 'الاندماج المجتمعي',
    desc: 'ساعدنا مئات المهاجرين والوافدين على الاندماج في مجتمعاتهم الجديدة من خلال برامج اللغة والثقافة والتوجيه.',
    pct: 88,
  },
  {
    title: 'التوظيف المهني',
    desc: 'أكثر من 70٪ من المتدربين الذين أتموا برامجنا المهنية حصلوا على وظائف أو ترقيات خلال ستة أشهر.',
    pct: 70,
  },
  {
    title: 'القبول الجامعي',
    desc: '9 من كل 10 طلاب عملنا معهم على ملف القبول نجحوا في الالتحاق بجامعاتهم المستهدفة.',
    pct: 90,
  },
]

export default function Impact() {
  return (
    <main className="bg-slate-50 pt-20">
      <PageHeader
        title="الأثر والتأثير"
        subtitle="أرقام وقصص حقيقية تعكس أثر EMC في حياة آلاف المتدربين والطلاب."
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'الأثر' },
        ]}
      />

      {/* Stats */}
      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.label}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="rounded-2xl bg-slate-50 p-7 text-center ring-1 ring-slate-100"
              >
                <Icon size={32} className={`mx-auto mb-3 ${stat.color}`} />
                <strong className={`block text-4xl font-black ${stat.color}`}>{stat.value}</strong>
                <span className="mt-2 block text-sm font-bold text-slate-500">{stat.label}</span>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* Impact areas */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-black text-deepBlue sm:text-4xl">مجالات أثرنا</h2>
            <span className="mx-auto mt-4 block h-1 w-20 rounded-full bg-customOrange" />
          </div>
          <div className="grid gap-7 lg:grid-cols-3">
            {areas.map((area, index) => (
              <motion.div
                key={area.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                className="rounded-2xl bg-white p-7 text-right shadow-xl shadow-slate-200/70 ring-1 ring-slate-100"
              >
                <h3 className="text-xl font-black text-deepBlue">{area.title}</h3>
                <p className="mt-3 leading-8 text-slate-600">{area.desc}</p>
                <div className="mt-5">
                  <div className="mb-1.5 flex justify-between text-xs font-black text-slate-500">
                    <span>معدل النجاح</span>
                    <span className="text-customBlue">{area.pct}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <motion.div
                      className="h-full rounded-full bg-customBlue"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${area.pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, ease: 'easeOut' as const }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-black text-deepBlue sm:text-4xl">قصص نجاح</h2>
            <span className="mx-auto mt-4 block h-1 w-20 rounded-full bg-customOrange" />
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {stories.map((story, index) => (
              <motion.blockquote
                key={story.name}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                className="rounded-2xl bg-slate-50 p-7 text-right ring-1 ring-slate-100"
              >
                <div className="mb-5 flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={16} className="fill-customOrange text-customOrange" />
                  ))}
                </div>
                <p className="leading-8 text-slate-600">"{story.text}"</p>
                <div className="mt-6 flex items-center gap-4">
                  <img
                    src={story.image}
                    alt={story.name}
                    className="h-12 w-12 rounded-full object-cover ring-2 ring-customBlue/20"
                  />
                  <div>
                    <p className="font-black text-deepBlue">{story.name}</p>
                    <p className="text-xs text-slate-400">{story.country}</p>
                    <p className="mt-0.5 text-xs font-bold text-customBlue">{story.program}</p>
                  </div>
                </div>
              </motion.blockquote>
            ))}
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
            <h2 className="text-3xl font-black sm:text-4xl">كن جزءاً من قصص النجاح</h2>
            <p className="mt-4 max-w-xl text-lg leading-9 text-slate-200">
              ابدأ رحلتك مع EMC وأضف قصتك إلى آلاف المتدربين الذين غيّرنا مساراتهم.
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.04 }}>
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 rounded-lg bg-customOrange px-7 py-4 font-extrabold text-white"
            >
              ابدأ رحلتك
              <ArrowLeft size={20} />
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </main>
  )
}
