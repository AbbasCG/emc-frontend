import { motion } from 'framer-motion'
import { BookOpen, Globe, LayoutGrid, TrendingUp } from 'lucide-react'
import { fadeUp } from '../../utils/course'

// أرقام معتمدة (V3) — لا تُعرض أي أرقام أخرى على الواجهات العامّة.
const metrics = [
  {
    icon: TrendingUp,
    value: '+13,000',
    label: 'مستفيد ومستفيدة',
    desc: 'دعم للطلاب والمهنيين في مساراتهم',
    iconColor: 'text-customBlue',
    iconBg: 'bg-sky-50',
    valueColor: 'text-customBlue',
  },
  {
    icon: LayoutGrid,
    value: '+9,000',
    label: 'مسجّل في المخيمات',
    desc: 'ورش ودورات ومسارات',
    iconColor: 'text-customOrange',
    iconBg: 'bg-orange-50',
    valueColor: 'text-customOrange',
  },
  {
    icon: Globe,
    value: '+50',
    label: 'دولة',
    desc: 'توزيع جغرافي واسع للمشاركين',
    iconColor: 'text-customBlue',
    iconBg: 'bg-sky-50',
    valueColor: 'text-customBlue',
  },
  {
    icon: BookOpen,
    value: '∞',
    label: 'إمكانية',
    desc: 'رؤية قابلة للتوسع نحو التأثير العالمي',
    iconColor: 'text-customOrange',
    iconBg: 'bg-orange-50',
    valueColor: 'text-customOrange',
  },
]

export default function ImpactSection() {
  return (
    <section className="bg-slate-50 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-black text-deepBlue sm:text-4xl">أثر EMC</h2>
          <span className="mx-auto mt-4 block h-1 w-20 rounded-full bg-customOrange" />
          <p className="mt-5 text-base leading-8 text-slate-500">
            أرقام حقيقية تعكس مسيرتنا ورؤيتنا في بناء جيل أكثر تأهيلاً ومهارةً.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric, i) => {
            const Icon = metric.icon
            return (
              <motion.div
                key={metric.label}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.48, delay: i * 0.09 }}
                className="rounded-2xl bg-white p-7 text-center shadow-lg shadow-slate-200/60 ring-1 ring-slate-100"
              >
                <div
                  className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${metric.iconBg} ${metric.iconColor}`}
                >
                  <Icon size={28} aria-hidden="true" />
                </div>
                <strong className={`block text-4xl font-black tabular-nums ${metric.valueColor}`} dir="ltr">
                  {metric.value}
                </strong>
                <span className="mt-1 block text-lg font-extrabold text-deepBlue">
                  {metric.label}
                </span>
                <p className="mt-3 text-sm leading-7 text-slate-500">{metric.desc}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
