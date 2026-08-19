import { motion } from 'framer-motion'

// Design Language 2.0 — the merged «لماذا EMC» band replacing the hidden
// WhyChooseSection + HomeAiSection: one compact navy field, four reasons as
// large serif statements separated by thin hairlines. Zero cards. Mounted
// directly after the ecosystem bento so the two navy scenes read as a single
// dark passage (keeping the page at two dark moments before the grand CTA).
const reasons = [
  { title: 'منهج يقود للعمق', sub: 'محتوى متسلسل يراكم الفهم بدل أن يبعثره' },
  { title: 'مدربون متخصصون', sub: 'خبرة ميدانية حقيقية خلف كل برنامج' },
  { title: 'منصة LMS + ذكاء اصطناعي', sub: 'متابعة تقدمك لحظة بلحظة بأدوات ذكية' },
  { title: 'شهادات معتمدة', sub: 'اعتماد رسمي قابل للتحقق يوثّق إنجازك' },
] as const

export default function HomeWhyBand() {
  return (
    <section dir="rtl" className="relative overflow-hidden bg-navy px-4 py-20 sm:px-6 lg:px-10 lg:py-24">
      {/* The band's one signature tricolor hairline at the top seam */}
      <div aria-hidden className="emc-tricolor-on-dark absolute inset-x-0 top-0" />

      <div className="relative mx-auto max-w-[1540px]">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
          className="text-right font-display text-2xl font-black text-white sm:text-3xl"
        >
          لماذا EMC
        </motion.h2>

        {/* Four serif statements thin separators, no boxes */}
        <div className="mt-10 grid lg:grid-cols-4">
          {reasons.map((r, i) => (
            <motion.div
              key={r.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 0.61, 0.36, 1] }}
              className={`py-6 text-right lg:py-2 ${
                i > 0
                  ? 'border-t border-white/10 lg:border-s lg:border-t-0 lg:border-white/15 lg:ps-8'
                  : ''
              } ${i < reasons.length - 1 ? 'lg:pe-8' : ''}`}
            >
              <h3 className="font-display text-xl font-black leading-snug text-white sm:text-2xl">
                {r.title}
              </h3>
              <p className="mt-3 text-sm font-semibold leading-7 text-ice/75">{r.sub}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
