import { motion } from 'framer-motion'
import {
  BookOpen,
  CheckCircle2,
  Globe,
  MessageCircle,
  TrendingUp,
  Users,
} from 'lucide-react'
import { staggerContainer, staggerItem, viewportOnce } from '@/utils/animations'

const features = [
  {
    num: '01',
    icon: BookOpen,
    title: 'محتوى مرتبط بالسوق',
    desc: 'كل برنامج مصمّم بالتعاون مع خبراء القطاع — لا محتوى أكاديمياً منفصلاً عن الواقع.',
  },
  {
    num: '02',
    icon: MessageCircle,
    title: 'إرشاد لا مجرد معلومات',
    desc: 'نرافقك من اليوم الأول بخطة واضحة، ومدرّب متاح، ومجتمع داعم في كل مرحلة.',
  },
  {
    num: '03',
    icon: Globe,
    title: 'مرونة حضورية وعن بُعد',
    desc: 'برامجنا متاحة بالصيغتين — اختر ما يناسب جدولك دون التضحية بجودة التجربة.',
  },
  {
    num: '04',
    icon: Users,
    title: 'مدربون وشركاء معتمدون',
    desc: 'نخبة من المدربين الممارسين ومؤسسات شريكة تضمن مستوى تعليمياً يُحتذى.',
  },
  {
    num: '05',
    icon: CheckCircle2,
    title: 'تسجيل سهل وواضح',
    desc: 'من الاطّلاع على البرنامج إلى التسجيل — عملية مبسّطة تأخذ دقائق لا ساعات.',
  },
  {
    num: '06',
    icon: TrendingUp,
    title: 'منصة تنمو معك',
    desc: 'EMC وجهتك الشاملة — ورشة اليوم تُلهمك مسار الغد وشراكة المستقبل.',
  },
] as const

export default function WhyChooseSection() {
  return (
    <section
      dir="rtl"
      className="emc-depth relative overflow-hidden px-4 py-24 sm:px-6 lg:px-10 lg:py-32"
    >
      {/* Background texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-emc-grid bg-grid-32 opacity-[0.06] [mask-image:radial-gradient(ellipse_at_center,white_30%,transparent_70%)]"
      />
      {/* Ambient glows — sea-only on the depth field */}
      <div aria-hidden className="pointer-events-none absolute -right-40 top-0 h-[28rem] w-[28rem] rounded-full bg-customBlue/[0.08] blur-[100px]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 left-0 h-72 w-72 rounded-full bg-sky/[0.07] blur-[80px]" />

      <div className="relative mx-auto max-w-[1540px]">
        {/* Header — split layout */}
        <div className="mb-16 grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-end">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.55 }}
            className="text-right"
          >
            <span className="emc-eyebrow border-amber/25 bg-amber/10 text-amber">لماذا EMC</span>
            <h2 className="mt-4 font-display text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl xl:text-[2.8rem]">
              ليس مجرّد منصة —<br /> تجربة تعليمية كاملة
            </h2>
            <div
              aria-hidden
              className="mt-6 h-1 w-16 rounded-full bg-customOrange"
            />
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-right text-lg font-semibold leading-9 text-white/55 lg:text-xl"
          >
            اخترنا أن نبني تجربة تنبع من فهم عميق لاحتياجات المتعلّم العربي — نظرية متصلة بسوق العمل، ومجتمع يدفعك للأمام.
          </motion.p>
        </div>

        {/* Feature grid */}
        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          {features.map((f) => {
            const Icon = f.icon
            return (
              <motion.div
                key={f.num}
                variants={staggerItem}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.04] p-7 text-right backdrop-blur-sm transition-all duration-300 hover:border-customBlue/30 hover:bg-white/[0.07]"
              >
                {/* Corner number */}
                <span
                  aria-hidden
                  className="font-latin pointer-events-none absolute left-5 top-5 text-[3.5rem] font-black leading-none text-white/[0.04] transition-colors group-hover:text-white/[0.08]"
                >
                  {f.num}
                </span>
                <div className="relative">
                  <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] text-sky transition-colors group-hover:bg-customBlue/20">
                    <Icon size={22} aria-hidden />
                  </div>
                  <h3 className="text-lg font-black text-white">{f.title}</h3>
                  <p className="mt-2.5 text-sm font-semibold leading-7 text-white/55">{f.desc}</p>
                </div>
                {/* Bottom accent */}
                <div
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-px origin-right scale-x-0 bg-gradient-to-l from-customBlue/60 to-transparent transition-transform duration-500 group-hover:scale-x-100"
                />
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
