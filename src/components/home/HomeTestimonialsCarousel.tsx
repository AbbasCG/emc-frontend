import { motion, AnimatePresence } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react'

const testimonials = [
  {
    quote: 'تجربة تسجيل واضحة، ومحتوى يربط النظرية بتطبيقات السوق فوراً. أنصح الفرق التقنية باعتماده كمسار تطوير منظّمي.',
    name: 'د. لينا المالكي',
    role: 'رئيسة قسم التحول الرقمي',
    org: 'جهة أكاديمية شريكة',
    initial: 'ل',
    color: '#0077B6',
    stars: 5,
  },
  {
    quote: 'لوحات المتابعة سهّلت علينا قرارات الجودة. نرى الفجوات قبل أن تتحوّل لمشكلة تشغيلية — هذا ما يميّز EMC.',
    name: 'م. كريم عوض',
    role: 'مدير برامج التطوير',
    org: 'قطاع غير ربحي',
    initial: 'ك',
    color: '#F28C00',
    stars: 5,
  },
  {
    quote: 'الورش المباشرة والتنسيق مع المدربين كانا على مستوى منصات عالمية — مع لمسة عربية احترافية لا توجد في غيره.',
    name: 'سارة بنعلي',
    role: 'مسؤولة التعلّم والتطوير',
    org: 'شركة تقنية رائدة',
    initial: 'س',
    color: '#0077B6',
    stars: 5,
  },
  {
    quote: 'انضممت لمسار تحليل البيانات دون خلفية برمجية. بعد ثلاثة أشهر أعمل في فريق BI كامل الوقت. المنهج مُصمَّم بدقة.',
    name: 'ياسر الحربي',
    role: 'محلل بيانات',
    org: 'قطاع الاتصالات',
    initial: 'ي',
    color: '#F28C00',
    stars: 5,
  },
] as const

const AUTO_MS = 6500

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-1" aria-label={`تقييم ${count} من 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill={i < count ? '#F28C00' : '#e2e8f0'}
          className="h-4 w-4"
          aria-hidden
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

export default function HomeTestimonialsCarousel() {
  const [active, setActive] = useState(0)
  const len = testimonials.length
  const next = useCallback(() => setActive((i) => (i + 1) % len), [len])
  const prev = useCallback(() => setActive((i) => (i - 1 + len) % len), [len])

  useEffect(() => {
    const id = setInterval(next, AUTO_MS)
    return () => clearInterval(id)
  }, [next])

  return (
    <section dir="rtl" className="bg-white px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
      <div className="mx-auto max-w-[1540px]">
        {/* Header */}
        <div className="mb-12 flex flex-col items-end gap-6 text-right lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="emc-eyebrow">آراء المجتمع</span>
            <h2 className="emc-title-arc mt-4 font-display text-3xl font-black tracking-tight text-deepBlue sm:text-4xl">
              شهادات من الميدان
            </h2>
          </div>
          {/* Prev / next controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prev}
              aria-label="السابق"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-deepBlue/10 bg-white text-deepBlue shadow-emc-xs transition hover:border-customBlue/40 hover:text-customBlue"
            >
              <ChevronRight size={20} aria-hidden />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="التالي"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-deepBlue/10 bg-white text-deepBlue shadow-emc-xs transition hover:border-customBlue/40 hover:text-customBlue"
            >
              <ChevronLeft size={20} aria-hidden />
            </button>
          </div>
        </div>

        {/* Cards — 2 visible on desktop, 1 on mobile */}
        <div className="relative overflow-hidden">
          {/* Desktop: grid of 2 */}
          <div className="hidden gap-5 lg:grid lg:grid-cols-2">
            {[active, (active + 1) % len].map((idx, posIdx) => {
              const t = testimonials[idx]!
              return (
                <motion.article
                  key={`${idx}-${posIdx}`}
                  initial={{ opacity: 0, x: posIdx === 0 ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
                  className="relative flex flex-col rounded-[1.75rem] border border-deepBlue/[0.07] bg-white p-8 shadow-emc ring-1 ring-deepBlue/[0.03]"
                >
                  {/* Colored top bar */}
                  <div
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-1 rounded-t-[1.75rem]"
                    style={{ backgroundColor: t.color }}
                  />
                  <Quote
                    size={28}
                    strokeWidth={1.5}
                    className="mb-5 opacity-20"
                    style={{ color: t.color }}
                    aria-hidden
                  />
                  <StarRating count={t.stars} />
                  <p className="mt-5 flex-1 text-lg font-bold leading-9 text-deepBlue">{t.quote}</p>
                  <div className="mt-8 flex items-center gap-4 border-t border-deepBlue/[0.06] pt-6">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl font-black text-white"
                      style={{ backgroundColor: t.color }}
                      aria-hidden
                    >
                      {t.initial}
                    </div>
                    <div className="text-right">
                      <p className="font-black text-deepBlue">{t.name}</p>
                      <p className="text-xs font-semibold text-foreground/55">{t.role} · {t.org}</p>
                    </div>
                  </div>
                </motion.article>
              )
            })}
          </div>

          {/* Mobile: single card */}
          <div className="lg:hidden">
            <AnimatePresence mode="wait">
              <motion.article
                key={active}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
                className="relative rounded-[1.75rem] border border-deepBlue/[0.07] bg-white p-8 shadow-emc-sm"
              >
                {(() => {
                  const t = testimonials[active]!
                  return (
                    <>
                      <div aria-hidden className="absolute inset-x-0 top-0 h-1 rounded-t-[1.75rem]" style={{ backgroundColor: t.color }} />
                      <Quote size={28} strokeWidth={1.5} className="mb-5 opacity-20" style={{ color: t.color }} aria-hidden />
                      <StarRating count={t.stars} />
                      <p className="mt-5 text-lg font-bold leading-9 text-deepBlue">{t.quote}</p>
                      <div className="mt-8 flex items-center gap-4 border-t border-deepBlue/[0.06] pt-6">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl font-black text-white" style={{ backgroundColor: t.color }} aria-hidden>
                          {t.initial}
                        </div>
                        <div className="text-right">
                          <p className="font-black text-deepBlue">{t.name}</p>
                          <p className="text-xs font-semibold text-foreground/55">{t.role} · {t.org}</p>
                        </div>
                      </div>
                    </>
                  )
                })()}
              </motion.article>
            </AnimatePresence>
          </div>
        </div>

        {/* Dots */}
        <div className="mt-8 flex justify-center gap-2">
          {testimonials.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`انتقال للشهادة ${i + 1}`}
              aria-current={i === active}
              className={[
                'h-2 rounded-full transition-all duration-300',
                i === active ? 'w-8 bg-customBlue' : 'w-2 bg-deepBlue/15 hover:bg-deepBlue/30',
              ].join(' ')}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
