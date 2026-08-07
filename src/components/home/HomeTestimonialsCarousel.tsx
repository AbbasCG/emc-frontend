import { motion } from 'framer-motion'
import { Quote } from 'lucide-react'

// M10: converted from an auto-advancing 2-up carousel (dots + interval) to a calm,
// static layout — one highlighted quote on navy + two supporting cards. Same export
// name kept so Home.tsx's import stays stable.
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
    quote: 'انضممت لمسار تحليل البيانات دون خلفية برمجية. بعد ثلاثة أشهر أعمل في فريق BI كامل الوقت. المنهج مُصمَّم بدقة.',
    name: 'ياسر الحربي',
    role: 'محلل بيانات',
    org: 'قطاع الاتصالات',
    initial: 'ي',
    color: '#0077B6',
    stars: 5,
  },
  // Deliberately unrendered (M10): kept for future rotation without redesign.
  {
    quote: 'الورش المباشرة والتنسيق مع المدربين كانا على مستوى منصات عالمية — مع لمسة عربية احترافية لا توجد في غيره.',
    name: 'سارة بنعلي',
    role: 'مسؤولة التعلّم والتطوير',
    org: 'شركة تقنية رائدة',
    initial: 'س',
    color: '#F28C00',
    stars: 5,
  },
] as const

function StarRating({ count, dim = false }: { count: number; dim?: boolean }) {
  return (
    <div className="flex gap-1" aria-label={`تقييم ${count} من 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill={i < count ? '#F28C00' : dim ? 'rgba(255,255,255,0.2)' : '#e2e8f0'}
          className="h-4 w-4"
          aria-hidden
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

const featured = testimonials[0]
const supporting = [testimonials[1], testimonials[2]] as const

export default function HomeTestimonialsCarousel() {
  return (
    <section dir="rtl" className="bg-white px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
      <div className="mx-auto max-w-[1540px]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
          className="mb-12 text-right"
        >
          <span className="emc-eyebrow">آراء المجتمع</span>
          <h2 className="emc-title-arc mt-4 font-display text-3xl font-black tracking-tight text-deepBlue sm:text-4xl">
            شهادات من الميدان
          </h2>
        </motion.div>

        {/* One highlighted quote + two supporting cards */}
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Highlighted quote — navy card */}
          <motion.article
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.55, ease: [0.22, 0.61, 0.36, 1] }}
            className="relative flex flex-col overflow-hidden rounded-[1.75rem] bg-deepBlue p-8 text-white shadow-emc-md sm:p-10"
          >
            {/* Flying-pages texture, whisper-quiet */}
            <div aria-hidden className="emc-pages-gold pointer-events-none absolute inset-0 opacity-[0.04]" />
            <div aria-hidden className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-customBlue/25 blur-[70px]" />

            <Quote size={34} strokeWidth={1.5} className="relative mb-6 text-sky/40" aria-hidden />
            <StarRating count={featured.stars} dim />
            <p className="relative mt-6 flex-1 text-xl font-bold leading-[2.2] [text-wrap:balance] sm:text-2xl sm:leading-[2.1]">
              {featured.quote}
            </p>
            <div className="relative mt-10 flex items-center gap-4 border-t border-white/10 pt-6">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl font-black text-white"
                style={{ backgroundColor: featured.color }}
                aria-hidden
              >
                {featured.initial}
              </div>
              <div className="text-right">
                <p className="font-black text-white">{featured.name}</p>
                <p className="text-xs font-semibold text-white/55">{featured.role} · {featured.org}</p>
              </div>
            </div>
          </motion.article>

          {/* Supporting quotes — two stacked cards */}
          <div className="flex flex-col gap-5">
            {supporting.map((t, i) => (
              <motion.article
                key={t.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.5, delay: 0.08 + i * 0.08, ease: [0.22, 0.61, 0.36, 1] }}
                className="relative flex flex-1 flex-col rounded-[1.5rem] border border-deepBlue/[0.07] bg-white p-7 shadow-emc ring-1 ring-deepBlue/[0.03] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#FBFAF7] hover:shadow-emc-md"
              >
                <div
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-1 rounded-t-[1.5rem]"
                  style={{ backgroundColor: t.color }}
                />
                <StarRating count={t.stars} />
                <p className="mt-4 flex-1 text-base font-bold leading-8 text-deepBlue">{t.quote}</p>
                <div className="mt-6 flex items-center gap-3 border-t border-deepBlue/[0.06] pt-5">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-black text-white"
                    style={{ backgroundColor: t.color }}
                    aria-hidden
                  >
                    {t.initial}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-deepBlue">{t.name}</p>
                    <p className="text-[11px] font-semibold text-foreground/55">{t.role} · {t.org}</p>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
