import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router'
import { ArrowLeft, Sparkles, Compass } from 'lucide-react'
import { EMC_12_THEMES } from './home12ThemesData'

export type { ThemeItem } from './home12ThemesData'

type FilterCategory = 'all' | 'tech' | 'career' | 'impact'

interface FilterOption {
  id: FilterCategory
  label: string
}

const CATEGORIES: FilterOption[] = [
  { id: 'all', label: 'جميع المحاور (12)' },
  { id: 'tech', label: 'الذكاء الاصطناعي والتكنولوجيا' },
  { id: 'career', label: 'المسارات الأكاديمية والمهنية' },
  { id: 'impact', label: 'المجتمع، الشباب والأثر' },
]

function getThemeCategory(id: string): FilterCategory {
  if (['ai', 'innovation', 'academic'].includes(id)) return 'tech'
  if (['career', 'leadership', 'language', 'global'].includes(id)) return 'career'
  return 'impact'
}

export default function Home12ThemesSection() {
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all')

  const filteredThemes = useMemo(() => {
    if (activeCategory === 'all') return EMC_12_THEMES
    return EMC_12_THEMES.filter((theme) => getThemeCategory(theme.id) === activeCategory)
  }, [activeCategory])

  return (
    <section dir="rtl" className="relative overflow-hidden bg-slate-950 py-16 text-white sm:py-24">
      {/* Background Gradients */}
      <div className="pointer-events-none absolute -right-32 -top-32 h-[30rem] w-[30rem] rounded-full bg-customBlue/15 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-[30rem] w-[30rem] rounded-full bg-customOrange/15 blur-[120px]" />
      <div className="pointer-events-none absolute inset-0 bg-emc-grid bg-grid-32 opacity-10" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 backdrop-blur-md">
            <Sparkles className="h-4 w-4 text-customOrange" />
            <span className="text-xs font-black uppercase tracking-widest text-white/90">
              خارطة المنظومة الشاملة
            </span>
          </div>

          <h2 className="mt-4 text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
            المحاور الاثنا عشر <span className="text-customBlue">لمنظومة EMC</span>
          </h2>

          <p className="mt-3 text-sm font-medium leading-relaxed text-slate-300 sm:text-base">
            منظومة متكاملة موزعة على 12 محوراً تخصصياً تنقلك من التأسيس المعرفي إلى التطبيق والتمكين المهني والمجتمعي.
          </p>

          {/* Quick Filter Pills */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {CATEGORIES.map((cat) => {
              const isSelected = activeCategory === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-200 ${
                    isSelected
                      ? 'bg-customBlue text-white shadow-lg shadow-customBlue/30 scale-105'
                      : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Compact Interactive Bento Grid */}
        <motion.div
          layout
          className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          <AnimatePresence>
            {filteredThemes.map((item, idx) => {
              const Icon = item.icon
              const isFeatured = item.id === 'ai' || item.id === 'academic'

              return (
                <motion.div
                  layout
                  key={item.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: idx * 0.03 }}
                  className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md transition-all duration-300 hover:border-white/30 hover:bg-white/[0.08] hover:shadow-2xl hover:-translate-y-1 ${
                    isFeatured ? 'sm:col-span-2 bg-gradient-to-br from-white/[0.07] to-white/[0.02]' : ''
                  }`}
                >
                  {/* Subtle Accent Glow on Hover */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-40"
                    style={{ backgroundColor: item.color }}
                  />

                  {/* Top Bar: Icon + Number Badge */}
                  <div>
                    <div className="flex items-center justify-between">
                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                        style={{ backgroundColor: `${item.color}25`, color: item.color }}
                      >
                        <Icon size={22} />
                      </div>

                      <span className="font-latin text-xs font-black tracking-widest text-slate-500 group-hover:text-slate-300">
                        #{item.num}
                      </span>
                    </div>

                    {/* Titles */}
                    <div className="mt-4">
                      <h3 className="text-base font-black text-white group-hover:text-customBlue transition-colors sm:text-lg">
                        {item.title}
                      </h3>
                      <p className="font-latin text-[11px] font-semibold text-slate-400">
                        {item.subtitle}
                      </p>
                    </div>

                    {/* Concise Punchy Summary */}
                    <p className="mt-2 text-xs leading-relaxed text-slate-300 line-clamp-2">
                      {item.description}
                    </p>
                  </div>

                  {/* Footer Action */}
                  <div className="mt-5 flex items-center justify-between pt-3 border-t border-white/10">
                    <span
                      className="text-[11px] font-bold"
                      style={{ color: item.color }}
                    >
                      برامج نوعية معتمدة
                    </span>

                    <Link
                      to={item.link}
                      className="inline-flex items-center gap-1 text-xs font-bold text-slate-300 transition-colors hover:text-white group-hover:translate-x-[-2px]"
                    >
                      <span>استكشف</span>
                      <ArrowLeft size={13} />
                    </Link>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>

        {/* Bottom Fast Action Band */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-md sm:flex-row sm:text-right">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-customOrange/20 text-customOrange">
              <Compass size={20} />
            </div>
            <div>
              <p className="text-sm font-black text-white">تريد مساراً يجمع بين أكثر من محور؟</p>
              <p className="text-xs text-slate-400">يمكنك استخدام محدد المسار الذكي لتحديد برنامجك الأنسب في 15 ثانية.</p>
            </div>
          </div>

          <a
            href="#path-finder"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-customOrange px-5 py-2.5 text-xs font-black text-white transition hover:bg-customOrange/90 hover:scale-[1.02]"
          >
            <span>جرب محدد المسار الآن</span>
            <ArrowLeft size={14} />
          </a>
        </div>
      </div>
    </section>
  )
}

