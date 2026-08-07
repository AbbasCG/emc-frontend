import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { EMC_12_THEMES, type ThemeItem } from './home12ThemesData'

// Type-only re-export keeps the public type reachable from this module —
// allowed by react-refresh (type exports don't affect Fast Refresh).
export type { ThemeItem } from './home12ThemesData'

export default function Home12ThemesSection() {
  const [activeTheme, setActiveTheme] = useState<ThemeItem>(EMC_12_THEMES[0])

  return (
    <section dir="rtl" className="relative overflow-hidden bg-slate-900 py-16 text-white sm:py-24">
      {/* Background Gradients & Glows */}
      <div className="pointer-events-none absolute -right-32 -top-32 h-[30rem] w-[30rem] rounded-full bg-customBlue/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-[30rem] w-[30rem] rounded-full bg-customOrange/15 blur-[120px]" />
      <div className="pointer-events-none absolute inset-0 bg-emc-grid bg-grid-32 opacity-10" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 backdrop-blur-md">
            <Sparkles className="h-4 w-4 text-customOrange" />
            <span className="text-xs font-black uppercase tracking-widest text-white/90">
              منظومة EMC التعليمية
            </span>
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
            المحاور الاثنا عشر <span className="text-customBlue">الرئيسية</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm font-medium leading-relaxed text-slate-300 sm:text-base">
            تغطي منظومة EMC اثني عشر محوراً رئيساً متكاملاً لبناء العقول، وتمكين المسارات الأكاديمية والمهنية، وتعزيز الذكاء الاصطناعي والأثر المجتمعي.
          </p>
        </div>

        {/* Featured Showcase Card */}
        <div className="mt-10 overflow-hidden rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-xl sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTheme.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="grid gap-6 lg:grid-cols-12 lg:items-center"
            >
              <div className="lg:col-span-8">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg"
                    style={{ backgroundColor: activeTheme.color }}
                  >
                    <activeTheme.icon size={28} />
                  </div>
                  <div>
                    <span
                      className="text-xs font-black uppercase tracking-widest"
                      style={{ color: activeTheme.color }}
                    >
                      المحور {activeTheme.num} / 12
                    </span>
                    <h3 className="text-xl font-black text-white sm:text-2xl">
                      {activeTheme.title}
                    </h3>
                    <p className="text-xs font-semibold text-slate-400">{activeTheme.subtitle}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-slate-200 sm:text-base">
                  {activeTheme.description}
                </p>
              </div>

              <div className="flex items-center justify-start lg:col-span-4 lg:justify-end">
                <Link
                  to={activeTheme.link}
                  className="inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-black text-white shadow-lg transition-transform duration-200 hover:scale-[1.03]"
                  style={{ backgroundColor: activeTheme.color }}
                >
                  <span>استكشف برامج المحور</span>
                  <ArrowLeft size={16} />
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 12 Themes Interactive Grid */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 sm:gap-4">
          {EMC_12_THEMES.map((item) => {
            const Icon = item.icon
            const isSelected = activeTheme.id === item.id

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTheme(item)}
                className={`group relative flex flex-col items-center rounded-2xl border p-4 text-center transition-all duration-300 ${
                  isSelected
                    ? 'border-white/50 bg-white/15 shadow-xl scale-[1.04] ring-2 ring-white/30'
                    : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                }`}
              >
                <div
                  className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${item.color}25`, color: item.color }}
                >
                  <Icon size={20} />
                </div>
                <span className="text-[10px] font-black text-slate-400">
                  {item.num}
                </span>
                <p className="mt-1 line-clamp-2 text-xs font-black text-white">
                  {item.title}
                </p>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
