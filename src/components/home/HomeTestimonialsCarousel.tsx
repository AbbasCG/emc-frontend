import { motion } from 'framer-motion'

// M10: converted from an auto-advancing 2-up carousel (dots + interval) to a calm,
// static layout. Design Language 2.0: the card frames are gone — quotes are large
// serif pull-quotes with an oversized « glyph in ice and the author in ink-400.
// The ONE highlighted quote keeps its emphasis via a soft paper2 field (borderless).
// Same export name kept so Home.tsx's import stays stable.
const testimonials = [
  {
    quote: 'تجربة تسجيل واضحة، ومحتوى يربط النظرية بتطبيقات السوق فوراً. أنصح الفرق التقنية باعتماده كمسار تطوير منظّمي.',
    name: 'د. لينا المالكي',
    role: 'رئيسة قسم التحول الرقمي',
    org: 'جهة أكاديمية شريكة',
  },
  {
    quote: 'لوحات المتابعة سهّلت علينا قرارات الجودة. نرى الفجوات قبل أن تتحوّل لمشكلة تشغيلية — هذا ما يميّز EMC.',
    name: 'م. كريم عوض',
    role: 'مدير برامج التطوير',
    org: 'قطاع غير ربحي',
  },
  {
    quote: 'انضممت لمسار تحليل البيانات دون خلفية برمجية. بعد ثلاثة أشهر أعمل في فريق BI كامل الوقت. المنهج مُصمَّم بدقة.',
    name: 'ياسر الحربي',
    role: 'محلل بيانات',
    org: 'قطاع الاتصالات',
  },
  // Deliberately unrendered (M10): kept for future rotation without redesign.
  {
    quote: 'الورش المباشرة والتنسيق مع المدربين كانا على مستوى منصات عالمية — مع لمسة عربية احترافية لا توجد في غيره.',
    name: 'سارة بنعلي',
    role: 'مسؤولة التعلّم والتطوير',
    org: 'شركة تقنية رائدة',
  },
] as const

const featured = testimonials[0]
const supporting = [testimonials[1], testimonials[2]] as const

export default function HomeTestimonialsCarousel() {
  return (
    <section dir="rtl" className="relative overflow-hidden bg-accent-50/30 px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
      {/* V3 decorative layer — one fire orb (ember rising from the bottom-left) + ghost numeral */}
      <div
        aria-hidden
        className="animate-soft-float pointer-events-none absolute -bottom-32 -left-32 h-[24rem] w-[24rem] rounded-full bg-customOrange/10 blur-3xl"
        style={{ animationDelay: '1.2s' }}
      />
      <span aria-hidden className="emc-ghost-num absolute -top-5 left-4 text-[7rem] sm:text-[10rem]">
        03
      </span>

      <div className="relative mx-auto max-w-[1540px]">
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
            شهادات من <span className="text-ember">الميدان</span>
          </h2>
        </motion.div>

        {/* Highlighted pull-quote — soft paper2 field, borderless (no frame, no shadow) */}
        <motion.figure
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.55, ease: [0.22, 0.61, 0.36, 1] }}
          className="relative overflow-hidden rounded-[2rem] bg-paper2 px-6 py-12 sm:px-14 sm:py-16"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -top-10 start-2 select-none font-display text-[9rem] font-black leading-none text-ice sm:text-[12rem]"
          >
            «
          </span>
          <blockquote className="relative mx-auto max-w-3xl font-display text-2xl font-black leading-[1.9] text-deepBlue [text-wrap:balance] sm:text-3xl sm:leading-[1.9]">
            {featured.quote}
          </blockquote>
          <figcaption className="relative mx-auto mt-8 max-w-3xl text-sm font-bold text-ink-400">
            {featured.name} — {featured.role} · {featured.org}
          </figcaption>
        </motion.figure>

        {/* Supporting pull-quotes — free-floating, separated by a hairline (no cards) */}
        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_1px_1fr] lg:gap-14">
          {supporting.map((t, i) => (
            <motion.figure
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.5, delay: 0.08 + i * 0.08, ease: [0.22, 0.61, 0.36, 1] }}
              className={`relative ps-2 ${i === 1 ? 'lg:order-3' : ''}`}
            >
              {/* Mobile seam between the two quotes */}
              {i === 1 && <div aria-hidden className="emc-hairline mb-10 lg:hidden" />}
              <span
                aria-hidden
                className="pointer-events-none absolute -top-7 -start-1 select-none font-display text-7xl font-black leading-none text-ice"
              >
                «
              </span>
              <blockquote className="relative font-display text-lg font-black leading-[2] text-deepBlue sm:text-xl">
                {t.quote}
              </blockquote>
              <figcaption className="relative mt-5 text-[13px] font-bold text-ink-400">
                {t.name} — {t.role} · {t.org}
              </figcaption>
            </motion.figure>
          ))}
          {/* Vertical hairline between the two supporting quotes (desktop) */}
          <div aria-hidden className="order-2 hidden w-px self-stretch bg-line lg:block" />
        </div>
      </div>
    </section>
  )
}
