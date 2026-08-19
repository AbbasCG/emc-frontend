import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router'
import { ArrowLeft, ChevronDown } from 'lucide-react'

const faqs = [
  {
    q: 'هل EMC منصة دورات فقط؟',
    a: 'لا. EMC منظومة تشغيل تعليمية متكاملة تجمع بين إدارة البرامج، التسجيل، المسارات التعليمية، شهادات رقمية، وورش مباشرة — مع نظام LMS احترافي مدمج.',
  },
  {
    q: 'كيف يتم التسجيل في دورة مدفوعة؟',
    a: 'تختار الدورة، تكمل بياناتك، وتختار مزود الدفع المناسب. العملية مبسّطة وتأخذ دقائق — وتحصل على تأكيد فوري بعد إتمام الدفع.',
  },
  {
    q: 'هل يمكن للمؤسسات طلب ورشة مخصصة؟',
    a: 'نعم — استخدم نموذج «تقديم ورشة» لإرسال التفاصيل. يتواصل الفريق بعد المراجعة الداخلية لتصميم البرنامج المناسب لمؤسستك.',
  },
  {
    q: 'من يستفيد من برامج EMC؟',
    a: 'طلاب جامعيون، خريجون، محترفون في مسيرة التطوير، رواد أعمال، فرق مؤسسية — أي شخص يريد بناء مهارة حقيقية قابلة للتطبيق.',
  },
  {
    q: 'كيف أنشئ حساباً كطالب؟',
    a: 'من صفحة «إنشاء حساب» أدخل بياناتك ثم انتقل إلى لوحة المتعلّم لمتابعة التسجيلات والجلسات والمواد — كل شيء في مكان واحد.',
  },
] as const

const trustBullets = [
  'منصة لجميع مستويات الخبرة',
  'دعم مباشر باللغة العربية',
  'شهادات معتمدة قابلة للتحقق',
] as const

// Design Language 2.0 — the boxed accordion became question rows on hairline
// seats (emc-row): the answer slides under the seat and the chevron rotates.
// aria-expanded + native button keyboard behavior are unchanged.
export default function HomeFaqSection() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section
      dir="rtl"
      className="relative overflow-hidden border-y border-deepBlue/[0.06] bg-white px-4 py-20 sm:px-6 lg:px-10 lg:py-28"
    >
      {/* Decorative blobs — sea drifting from the top-right, ember pulsing from the bottom-left */}
      <div aria-hidden className="animate-soft-float pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-customBlue/[0.07] blur-[80px]" />
      <div
        aria-hidden
        className="animate-slow-pulse pointer-events-none absolute -bottom-10 -left-10 h-56 w-56 rounded-full bg-customOrange/[0.06] blur-[60px]"
        style={{ animationDelay: '0.9s' }}
      />
      {/* Ghost numeral */}
      <span aria-hidden className="emc-ghost-num absolute -top-5 left-4 text-[7rem] sm:text-[10rem]">
        05
      </span>

      <div className="relative mx-auto max-w-[1540px]">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.5fr] lg:gap-16">

          {/* Left column — section info */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.55 }}
            className="text-right lg:sticky lg:top-28 lg:self-start"
          >
            <span className="emc-eyebrow">أسئلة شائعة</span>
            <h2 className="emc-title-arc mt-4 font-display text-3xl font-black leading-tight tracking-tight text-deepBlue sm:text-4xl xl:text-[2.5rem]">
              {/* explicit space: with the <br> hidden on mobile the two lines
                  used to concatenate into "تحتاجمعرفته" */}
              كل ما تحتاج{' '}
              <br className="hidden sm:block" />
              معرفته قبل البدء
            </h2>
            <p className="mt-5 text-base font-medium leading-8 text-foreground/60">
              إجابات واضحة عن التسجيل، البرامج، وطبيعة تجربة التعلّم في منظومة EMC.
            </p>

            {/* Trust bullets — plain sky dots, no chips */}
            <ul className="mt-8 space-y-3.5">
              {trustBullets.map((item) => (
                <li key={item} className="flex items-center justify-start gap-3 text-sm font-semibold text-foreground/65">
                  <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-customBlue" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-10">
              <Link to="/contact" className="emc-cta-line text-sm">
                سؤال آخر؟ تواصل معنا
                <ArrowLeft size={15} aria-hidden />
              </Link>
            </div>
          </motion.div>

          {/* Right column — editorial accordion */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.55, delay: 0.1 }}
          >
            <div aria-hidden className="emc-hairline" />
            {faqs.map((item, i) => {
              const isOpen = open === i
              return (
                <div key={item.q} className="emc-row">
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center gap-4 py-5 ps-3 text-right focus:outline-none focus-visible:ring-2 focus-visible:ring-customBlue sm:py-6 sm:ps-4"
                    aria-expanded={isOpen}
                  >
                    {/* Number */}
                    <span
                      aria-hidden
                      className={`font-latin shrink-0 text-xs font-black tabular-nums transition-colors ${
                        isOpen ? 'text-customBlue' : 'text-deepBlue/25'
                      }`}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {/* Question */}
                    <span
                      className={`flex-1 text-right font-display text-base font-black leading-relaxed transition-colors sm:text-lg ${
                        isOpen ? 'text-customBlue' : 'text-deepBlue'
                      }`}
                    >
                      {item.q}
                    </span>
                    {/* Chevron — rotates when the answer slides open */}
                    <ChevronDown
                      size={18}
                      aria-hidden
                      className={`shrink-0 transition-transform duration-300 ${
                        isOpen ? 'rotate-180 text-customBlue' : 'text-ink-400'
                      }`}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="pb-6 pe-9 ps-12 text-right text-sm font-medium leading-7 text-foreground/65">
                          {item.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
