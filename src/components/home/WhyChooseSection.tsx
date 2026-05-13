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
    <section className="bg-slate-50 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-black text-deepBlue sm:text-4xl">لماذا تختار EMC؟</h2>
          <span className="mx-auto mt-4 block h-1 w-20 rounded-full bg-customOrange" />
          <p className="mt-5 text-base leading-8 text-slate-500">
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
                className="rounded-2xl bg-white p-7 text-right shadow-lg shadow-slate-200/60 ring-1 ring-slate-100"
              >
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-customBlue">
                  <Icon size={24} aria-hidden="true" />
                </div>
                <h3 className="text-lg font-extrabold text-deepBlue">{reason.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-500">{reason.desc}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
