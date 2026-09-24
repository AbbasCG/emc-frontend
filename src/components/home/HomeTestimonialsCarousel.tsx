import { motion } from 'framer-motion'
import { BarChart3, MessageSquareText, Route } from 'lucide-react'

const experienceSignals = [
  {
    title: 'مسار واضح قبل التسجيل',
    description: 'تفاصيل المستوى والمدة والتكلفة ومخرجات التعلّم تظهر قبل اتخاذ القرار.',
    icon: Route,
  },
  {
    title: 'تغذية راجعة أثناء التعلّم',
    description: 'تقييمات وملاحظات مرتبطة بالمحتوى تساعد الفريق على تحسين التجربة باستمرار.',
    icon: MessageSquareText,
  },
  {
    title: 'تقدّم يمكن متابعته',
    description: 'لوحة المتعلّم تجمع التسجيلات والإنجاز والخطوة التالية في مكان واحد.',
    icon: BarChart3,
  },
] as const

export default function HomeTestimonialsCarousel() {
  return (
    <section dir="rtl" className="relative overflow-hidden bg-accent-50/30 px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
      <div
        aria-hidden
        className="animate-soft-float pointer-events-none absolute -bottom-32 -left-32 h-[24rem] w-[24rem] rounded-full bg-customOrange/10 blur-3xl"
        style={{ animationDelay: '1.2s' }}
      />
      <span aria-hidden className="emc-ghost-num absolute -top-5 left-4 text-[7rem] sm:text-[10rem]">
        03
      </span>

      <div className="relative mx-auto max-w-[1540px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
          className="max-w-3xl text-right"
        >
          <span className="emc-eyebrow">تجربة يمكن الوثوق بها</span>
          <h2 className="emc-title-arc mt-4 font-display text-3xl font-black tracking-tight text-deepBlue sm:text-4xl">
            قرار تعلّم <span className="text-ember">أوضح</span>، من البداية إلى الإنجاز
          </h2>
          <p className="mt-5 text-base font-semibold leading-8 text-ink-500">
            لا نعتمد على شهادات تسويقية مجهولة؛ نبني التجربة حول معلومات واضحة، متابعة قابلة للقياس،
            وقناة ملاحظات تحسّن كل برنامج.
          </p>
        </motion.div>

        <div className="mt-12 grid border-y border-line lg:grid-cols-3">
          {experienceSignals.map((signal, index) => (
            <motion.article
              key={signal.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 0.61, 0.36, 1] }}
              className={`py-9 text-right lg:px-9 ${
                index > 0 ? 'border-t border-line lg:border-s lg:border-t-0' : ''
              }`}
            >
              <signal.icon className="h-7 w-7 text-customBlue" aria-hidden />
              <h3 className="mt-6 font-display text-xl font-black text-deepBlue">{signal.title}</h3>
              <p className="mt-3 text-sm font-semibold leading-7 text-ink-400">{signal.description}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
