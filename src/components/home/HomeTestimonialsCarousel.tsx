import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, Quote } from 'lucide-react'

const quotes = [
  {
    quote:
      'تجربة تسجيل واضحة، ومحتوى يربط النظرية بتطبيقات السوق فوراً. أنصح الفرق التقنية باعتماده كمسار تطوير منظومي.',
    name: 'د. لينا المالكي',
    role: 'رئيسة قسم التحول الرقمي — جهة أكاديمية شريكة',
  },
  {
    quote:
      'لوحات المتابعة سهّرت علينا قرارات الجودة. نرى الفجوات قبل أن تتحول لمشكلة تشغيلية.',
    name: 'م. كريم عوض',
    role: 'مدير برامج — قطاع غير ربحي',
  },
  {
    quote:
      'الورش المباشرة والتنسيق مع المدربين كانا على مستوى منصات عالمية، مع لمسة عربية احترافية.',
    name: 'سارة بنعلي',
    role: 'مسؤولة تعلّم وتطوير — شركة تقنية',
  },
] as const

const AUTO_MS = 7200

export default function HomeTestimonialsCarousel() {
  const [index, setIndex] = useState(0)
  const len = quotes.length

  const next = useCallback(() => setIndex((i) => (i + 1) % len), [len])
  const prev = useCallback(() => setIndex((i) => (i - 1 + len) % len), [len])

  useEffect(() => {
    const id = window.setInterval(next, AUTO_MS)
    return () => window.clearInterval(id)
  }, [next])

  const active = quotes[index]!

  return (
    <section className="bg-emcBg px-4 py-16 sm:px-6 lg:px-10 lg:py-24" dir="rtl">
      <div className="mx-auto max-w-[1540px]">
        <div className="mb-10 flex flex-col gap-6 text-right lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black text-customBlue">قصص من الميدان</p>
            <h2 className="mt-3 font-display text-3xl font-black text-deepBlue sm:text-4xl">شهادات من الميدان</h2>
            <p className="mt-4 max-w-xl text-base font-semibold leading-8 text-foreground/70">
              ملاحظات من شركاء تشغيل وقادة جودة — صياغة احترافية تعكس طبيعة العمل المؤسسي.
            </p>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={prev}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-deepBlue/[0.1] bg-white text-deepBlue shadow-emc-xs transition hover:border-customBlue/35"
              aria-label="السابق"
            >
              <ChevronRight size={20} className="rotate-180" aria-hidden />
            </button>
            <button
              type="button"
              onClick={next}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-deepBlue/[0.1] bg-white text-deepBlue shadow-emc-xs transition hover:border-customBlue/35"
              aria-label="التالي"
            >
              <ChevronRight size={20} aria-hidden />
            </button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[1.75rem] border border-deepBlue/[0.07] bg-white p-8 shadow-emc-lg ring-1 ring-white sm:p-12">
          <div
            aria-hidden
            className="pointer-events-none absolute -left-24 top-0 h-48 w-48 rounded-full bg-customBlue/10 blur-3xl"
          />
          <Quote className="relative text-customOrange/80" size={36} strokeWidth={1.75} aria-hidden />

          <div className="relative mt-6 min-h-[11rem]">
            <AnimatePresence mode="wait">
              <motion.div
                key={active.name}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
                className="text-right"
              >
                <p className="text-xl font-bold leading-9 text-deepBlue sm:text-2xl sm:leading-[2.15rem]">{active.quote}</p>
                <div className="mt-8 border-t border-deepBlue/[0.06] pt-6">
                  <p className="text-base font-black text-deepBlue">{active.name}</p>
                  <p className="mt-1 text-sm font-semibold text-foreground/60">{active.role}</p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="relative mt-10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-2">
              {quotes.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={[
                    'h-2 rounded-full transition-all duration-300',
                    i === index ? 'w-8 bg-customBlue' : 'w-2 bg-deepBlue/15 hover:bg-deepBlue/25',
                  ].join(' ')}
                  aria-label={`انتقال إلى الشهادة ${i + 1}`}
                  aria-current={i === index ? 'true' : undefined}
                />
              ))}
            </div>
            <Link to="/partnerships" className="text-sm font-black text-customBlue transition hover:text-deepBlue">
              عرض نموذج الشراكة
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
