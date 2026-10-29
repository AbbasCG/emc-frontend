import { memo, useState } from 'react'
import { Link } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot,
  ArrowLeft,
  Compass,
  Star,
  Layers,
  ChevronDown,
} from 'lucide-react'
import { staggerContainer, staggerItem } from '@/utils/animations'

import { THEMES_BENTO_DATA } from '@/data/themesBentoData'

function HomeThemesBento() {
  const [showAllThemes, setShowAllThemes] = useState(false)
  const aiTheme = THEMES_BENTO_DATA[0]
  const mediumThemes = THEMES_BENTO_DATA.slice(1, 5)
  const compactThemes = THEMES_BENTO_DATA.slice(5)

  return (
    <section
      id="themes-bento"
      dir="rtl"
      className="relative overflow-hidden bg-paper py-20 sm:py-28 border-y border-slate-200/70"
    >
      {/* Background Subtle Grid Texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:linear-gradient(to_right,#0C2A4B_1px,transparent_1px),linear-gradient(to_bottom,#0C2A4B_1px,transparent_1px)] [background-size:40px_40px]"
      />

      <div className="relative mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        {/* Section Header: 60-30-10 adherence */}
        <div className="mx-auto max-w-3xl text-center mb-14 sm:mb-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-deepBlue/15 bg-deepBlue/5 px-4 py-1.5 text-xs font-black text-deepBlue mb-4">
            <Compass size={14} className="text-customOrange" />
            <span>خارطة المعرفة المؤسسية</span>
          </div>

          <h2 className="font-display text-2xl font-black tracking-tight text-deepBlue sm:text-4xl lg:text-5xl">
            ١٢ مجالاً ومحوراً معرفياً <span className="text-customBlue">تصنع أثرك المهني</span>
          </h2>

          <p className="mt-4 text-sm font-semibold leading-relaxed text-ink-400 sm:text-base">
            تمت هندسة المنظومة المعرفية في مركز EMC وفق فلسفة التدرج من الأساس الأكاديمي حتى التمكين التقني والقيادي المتقدم.
            استكشف هذه المجالات وتعرّف على تفاصيل برامجها.
          </p>
        </div>

        {/* Bento Grid Container */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
        >
          {/* 1. Large Hero Bento Card: AI & Digital (Spans 2 cols, 2 rows on desktop) */}
          <motion.div
            variants={staggerItem}
            className="md:col-span-2 lg:col-span-2 lg:row-span-2 group relative overflow-hidden rounded-3xl border-2 border-deepBlue/15 bg-gradient-to-br from-deepBlue via-primary-700 to-primary-900 p-7 sm:p-9 text-white shadow-xl flex flex-col justify-between transition-all duration-300 hover:border-customOrange hover:shadow-2xl hover:shadow-customOrange/10"
          >
            {/* Ambient Corner Glow */}
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-customOrange/20 blur-3xl transition-opacity duration-500 group-hover:opacity-100 opacity-60"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-customBlue/20 blur-3xl"
            />

            {/* Top Bar inside Card */}
            <div>
              <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-2">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md text-customOrange border border-white/15">
                    <Bot size={26} />
                  </span>
                  <div>
                    <span className="text-[11px] font-black tracking-widest text-customOrange uppercase">
                      المحور {aiTheme.num}
                    </span>
                    <p className="text-xs text-white/70">{aiTheme.tag}</p>
                  </div>
                </div>

                {/* Most Demanded Badge */}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-customOrange px-3.5 py-1 text-xs font-black text-white shadow-lg shadow-customOrange/30">
                  <Star size={12} className="fill-white" />
                  <span>{aiTheme.badge}</span>
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="font-display text-2xl sm:text-3xl font-black leading-snug text-white mb-3">
                {aiTheme.title}
              </h3>

              <p className="text-sm sm:text-base leading-relaxed text-white/80 font-medium max-w-xl">
                {aiTheme.desc}
              </p>

              {/* Micro-Pills: Hands-on applications */}
              <div className="mt-6 flex flex-wrap gap-2 text-xs font-bold text-white/90">
                <span className="rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm border border-white/10">
                  ⚡ هندسة الأوامر (Prompt Engineering)
                </span>
                <span className="rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm border border-white/10">
                  🤖 عملاء الذكاء الاصطناعي (AI Agents)
                </span>
                <span className="rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm border border-white/10">
                  📊 أتمتة الأعمال وتحليل البيانات
                </span>
              </div>
            </div>

            {/* Bottom Meta & Action */}
            <div className="mt-8 pt-6 border-t border-white/15 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-bold text-white/90">{aiTheme.stat}</span>
              </div>

              <Link
                to={aiTheme.link}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-customOrange px-5 py-3 text-xs sm:text-sm font-black text-white shadow-md shadow-customOrange/30 transition-all duration-200 hover:bg-customOrange/90 hover:scale-[1.02]"
              >
                <span>استكشف برامج المحور</span>
                <ArrowLeft size={16} />
              </Link>
            </div>
          </motion.div>

          {/* 2. Medium Cards (4 themes) */}
          {mediumThemes.map((theme) => {
            const Icon = theme.icon
            return (
              <motion.div
                key={theme.id}
                variants={staggerItem}
                className="group relative flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:border-deepBlue/40 hover:shadow-lg hover:-translate-y-1"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-deepBlue/5 text-deepBlue border border-deepBlue/10 transition group-hover:bg-deepBlue group-hover:text-white">
                      <Icon size={22} />
                    </span>
                    <span className="font-latin text-xs font-bold text-slate-400">
                      #{theme.num}
                    </span>
                  </div>

                  {theme.badge && (
                    <span className="inline-block rounded-md bg-emerald-50 px-2.5 py-0.5 text-[11px] font-black text-emerald-800 border border-emerald-200 mb-2">
                      {theme.badge}
                    </span>
                  )}

                  <h3 className="font-display text-lg font-black text-deepBlue leading-snug mb-2 group-hover:text-customBlue transition">
                    {theme.title}
                  </h3>

                  <p className="text-xs sm:text-[13px] leading-relaxed text-slate-600 line-clamp-3">
                    {theme.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500">{theme.stat}</span>
                  <Link
                    to={theme.link}
                    className="inline-flex items-center gap-1 text-xs font-black text-deepBlue hover:text-customOrange transition"
                  >
                    <span>التفاصيل</span>
                    <ArrowLeft size={13} />
                  </Link>
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        {/* 3. Expandable Section Toggle Button */}
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => setShowAllThemes((prev) => !prev)}
            aria-expanded={showAllThemes}
            className="inline-flex items-center gap-2.5 rounded-2xl border-2 border-deepBlue/15 bg-white px-7 py-3.5 text-xs sm:text-sm font-black text-deepBlue shadow-sm transition hover:border-customOrange hover:text-customOrange hover:shadow-md active:scale-[0.99]"
          >
            <Compass size={16} className="text-customOrange shrink-0" />
            <span>
              {showAllThemes
                ? 'إخفاء باقي المحاور (عرض الـ ٥ محاور الأساسية)'
                : 'عرض باقي المحاور المعرفية (١٢ محوراً متكاملاً)'}
            </span>
            <ChevronDown
              size={16}
              className={`transition-transform duration-300 text-slate-400 ${
                showAllThemes ? 'rotate-180 text-customOrange' : ''
              }`}
            />
          </button>
        </div>

        {/* 4. Compact Interactive Cards (7 remaining themes) */}
        <AnimatePresence>
          {showAllThemes && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="mt-6 overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 pt-2 pb-1">
                {compactThemes.map((theme) => {
                  const Icon = theme.icon
                  return (
                    <motion.div
                      key={theme.id}
                      variants={staggerItem}
                      className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-paper p-5 transition-all duration-200 hover:bg-white hover:border-customBlue/30 hover:shadow-md"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition group-hover:bg-customBlue/10 group-hover:text-customBlue">
                            <Icon size={18} />
                          </span>
                          <span className="text-[10px] font-black uppercase text-slate-400">{theme.tag}</span>
                        </div>

                        <h4 className="font-display text-sm font-black text-deepBlue leading-snug mb-1.5 group-hover:text-customBlue transition">
                          {theme.title}
                        </h4>

                        <p className="text-[11px] leading-relaxed text-slate-500 line-clamp-2">
                          {theme.desc}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-400">محور #{theme.num}</span>
                        <Link
                          to={theme.link}
                          className="font-black text-customBlue hover:text-customOrange inline-flex items-center gap-1 transition"
                        >
                          <span>استعراض</span>
                          <ArrowLeft size={11} />
                        </Link>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Explorer Action Band */}
        <div className="mt-14 text-center">
          <Link
            to="/tracks"
            className="inline-flex items-center gap-2.5 rounded-2xl border border-deepBlue/20 bg-white px-7 py-4 text-sm font-black text-deepBlue shadow-sm transition hover:border-customOrange hover:text-customOrange hover:shadow-md"
          >
            <Layers size={17} className="text-customOrange" />
            <span>استعراض كافة المجالات والمحاور المعرفية الـ ١٢ بالتفصيل</span>
            <ArrowLeft size={16} />
          </Link>
        </div>
      </div>
    </section>
  )
}

export default memo(HomeThemesBento)
