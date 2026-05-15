import { motion } from 'framer-motion'
import {
  BookOpen,
  CheckCircle2,
  Globe,
  MessageCircle,
  TrendingUp,
  Users,
} from 'lucide-react'
import { fadeUp } from '../../utils/course'

const reasons = [
  {
    icon: BookOpen,
    title: 'محتوى عملي مرتبط بسوق العمل',
    desc: 'كل برنامج مصمم ليعكس متطلبات الوظائف والمؤسسات الحقيقية.',
  },
  {
    icon: MessageCircle,
    title: 'إرشاد واضح وليس مجرد معلومات',
    desc: 'نرافقك بخطة واضحة من البداية حتى الوصول لهدفك.',
  },
  {
    icon: Globe,
    title: 'برامج مرنة حضورية وعن بعد',
    desc: 'تعلّم بالطريقة التي تناسبك، في الوقت الذي تختاره.',
  },
  {
    icon: Users,
    title: 'مدربون وشركاء متخصصون',
    desc: 'فريق من المدربين المعتمدين والمؤسسات الشريكة في التعليم.',
  },
  {
    icon: CheckCircle2,
    title: 'تجربة تسجيل سهلة وواضحة',
    desc: 'عملية انضمام مبسطة لتبدأ تعلّمك فور تسجيلك.',
  },
  {
    icon: TrendingUp,
    title: 'قابلية التوسع نحو منصة متكاملة',
    desc: 'نسعى لأن تكون EMC وجهتك الشاملة للتعليم والتطوير.',
  },
]

export default function WhyChooseSection() {
  return (
    <section className="border-y border-deepBlue/[0.05] bg-emcBg px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
      <div className="mx-auto max-w-[1540px]">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <p className="text-xs font-black text-customBlue">عرض قيمة المنصّة</p>
          <h2 className="mt-3 text-3xl font-black text-deepBlue sm:text-4xl">لماذا تختار EMC؟</h2>
          <span className="mx-auto mt-5 block h-1 w-16 rounded-full bg-customOrange" />
          <p className="mt-5 text-base leading-8 text-foreground/70">
            لأن التعليم الجيد يحتاج أكثر من محتوى — يحتاج توجيهاً وشراكة حقيقية.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {reasons.map((reason, i) => {
            const Icon = reason.icon
            return (
              <motion.div
                key={reason.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: i * 0.07 }}
                className="group rounded-[1.35rem] border border-deepBlue/[0.06] bg-white p-7 text-right shadow-emc-sm ring-1 ring-white/80 transition-all duration-300 hover:-translate-y-[2px] hover:shadow-emc-md"
              >
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-customBlue ring-1 ring-customBlue/15 transition-transform group-hover:scale-105">
                  <Icon size={24} aria-hidden="true" />
                </div>
                <h3 className="text-lg font-extrabold text-deepBlue">{reason.title}</h3>
                <p className="mt-2 text-sm leading-7 text-foreground/65">{reason.desc}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
