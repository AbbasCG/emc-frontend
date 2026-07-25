import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router'
import { ArrowLeft, Plus } from 'lucide-react'

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

export default function HomeFaqSection() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section
      dir="rtl"
      className="relative overflow-hidden border-y border-deepBlue/[0.06] bg-[#f4f7fb] px-4 py-20 sm:px-6 lg:px-10 lg:py-28"
    >
      {/* Decorative blobs */}
      <div aria-hidden className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-customBlue/[0.07] blur-[80px]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-10 -left-10 h-56 w-56 rounded-full bg-customOrange/[0.06] blur-[60px]" />

      <div className="relative mx-auto max-w-[1540px]">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.5fr] lg:gap-20">

          {/* Left column — section info */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.55 }}
            className="text-right lg:sticky lg:top-28 lg:self-start"
          >
            <span className="emc-eyebrow">أسئلة شائعة</span>
            <h2 className="emc-title-arc mt-4 font-display text-3xl font-black leading-tight tracking-tight text-deepBlue sm:text-4xl xl:text-[2.5rem]">
              كل ما تحتاج<br className="hidden sm:block" />
              معرفته قبل البدء
            </h2>
            <p className="mt-5 text-base font-medium leading-8 text-foreground/60">
              إجابات واضحة عن التسجيل، البرامج، وطبيعة تجربة التعلّم في منظومة EMC.
            </p>

            {/* Trust bullets */}
            <ul className="mt-8 space-y-3.5">
              {[
                'منصة لجميع مستويات الخبرة',
                'دعم مباشر باللغة العربية',
                'شهادات معتمدة قابلة للتحقق',
              ].map((item) => (
                <li key={item} className="flex items-center justify-start gap-3 text-sm font-semibold text-foreground/65">
                  {item}
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-customBlue/15">
                    <span aria-hidden className="h-2 w-2 rounded-full bg-customBlue" />
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-10">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 text-sm font-black text-customBlue underline-offset-4 hover:underline"
              >
                سؤال آخر؟ تواصل معنا
                <ArrowLeft size={15} aria-hidden />
              </Link>
            </div>
          </motion.div>

          {/* Right column — accordion */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="space-y-3"
          >
            {faqs.map((item, i) => {
              const isOpen = open === i
              return (
                <div
                  key={item.q}
                  className={`overflow-hidden rounded-2xl border transition-all duration-300 ${
                    isOpen
                      ? 'border-customBlue/20 bg-white shadow-emc-md'
                      : 'border-deepBlue/[0.06] bg-white/70 shadow-emc-xs hover:border-deepBlue/10 hover:bg-white'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center gap-4 px-6 py-5 text-right"
                    aria-expanded={isOpen}
                  >
                    {/* Number */}
                    <span
                      aria-hidden
                      className={`font-latin shrink-0 text-xs font-black tabular-nums transition-colors ${
                        isOpen ? 'text-customBlue' : 'text-deepBlue/20'
                      }`}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {/* Question */}
                    <span className={`flex-1 text-right text-base font-black leading-relaxed transition-colors ${
                      isOpen ? 'text-customBlue' : 'text-deepBlue'
                    }`}>
                      {item.q}
                    </span>
                    {/* Toggle icon */}
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                        isOpen
                          ? 'rotate-45 border-customBlue/30 bg-customBlue/10 text-customBlue'
                          : 'border-deepBlue/10 bg-transparent text-deepBlue/40'
                      }`}
                      aria-hidden
                    >
                      <Plus size={16} />
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
                        className="overflow-hidden border-t border-customBlue/10"
                      >
                        <p className="px-6 pb-6 pt-4 text-right text-[15px] font-medium leading-8 text-foreground/65">
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
