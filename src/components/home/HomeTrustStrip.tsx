import { motion } from 'framer-motion'

const items = [
  'جامعات شريكة',
  'هيئات حكومية',
  'مؤسسات مجتمعية',
  'شركات تقنية رائدة',
  'برامج دولية',
  'مختبرات بحثية',
  'معاهد تدريب معتمدة',
  'منظمات ريادة الأعمال',
] as const

// Duplicate for seamless infinite loop
const allItems = [...items, ...items, ...items]

export default function HomeTrustStrip() {
  return (
    <section
      aria-label="شركاء EMC"
      className="relative overflow-hidden border-y border-deepBlue/[0.08] bg-emcBg/80 py-6"
      dir="rtl"
    >
      {/* Edge fade masks */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-emcBg/80 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-emcBg/80 to-transparent"
      />

      <div className="flex items-center gap-4 px-6">
        <p className="shrink-0 text-xs font-black tracking-widest text-foreground/40 uppercase ml-4">
          شركاؤنا
        </p>
        <div className="relative overflow-hidden flex-1">
          <motion.div
            className="flex w-max gap-8"
            animate={{ x: ['0%', '-33.333%'] }}
            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          >
            {allItems.map((item, i) => (
              <span
                key={i}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-deepBlue/[0.08] bg-white/70 px-4 py-2 text-xs font-black text-foreground/60"
              >
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full bg-customBlue/60"
                />
                {item}
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
