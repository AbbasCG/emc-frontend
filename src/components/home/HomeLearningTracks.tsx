import { useState } from 'react'
import { Link } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, GraduationCap, Languages, Smile, BadgeCheck, Clock } from 'lucide-react'
import ArrowLeftIcon from '@/components/ui/ArrowLeftIcon'
import {
  PROFESSIONAL_TRACKS,
  ACADEMIC_UNITS,
  LANGUAGE_PROGRAMS,
  CHILDREN_PROGRAMS,
} from '@/data/officialTracks'

// Track data lives in src/data/officialTracks.ts — the single approved catalogue.

// Design Language 2.0 — the tab item card became an editorial row:
// icon · serif name · one-line description · «استكشف» line CTA, all seated
// on the emc-row hairline (hover: paper tint + sliding sky bar). No boxes.
function EditorialRow({
  icon: Icon,
  title,
  titleEn,
  desc,
  duration,
  index,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  title: string
  titleEn?: string
  desc: string
  duration?: string
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.45, delay: index * 0.04, ease: [0.22, 0.61, 0.36, 1] }}
      className="emc-row"
    >
      <Link
        to="/courses"
        className="group flex items-center gap-4 py-5 ps-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-customBlue sm:gap-6 sm:py-6 sm:ps-4"
      >
        <Icon
          size={22}
          className="shrink-0 text-customBlue transition-transform duration-300 group-hover:-translate-y-0.5"
        />
        <div className="min-w-0 flex-1 text-right">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <h3 className="font-display text-lg font-black leading-snug text-deepBlue transition group-hover:text-customBlue sm:text-xl">
              {title}
            </h3>
            {titleEn && <span className="font-latin text-[11px] font-bold text-ink-400">{titleEn}</span>}
          </div>
          <p className="mt-1 line-clamp-2 text-xs font-semibold leading-6 text-ink-400 sm:line-clamp-1 sm:text-sm">
            {desc}
          </p>
        </div>
        {duration && (
          <span className="hidden shrink-0 items-center gap-1.5 text-xs font-bold text-ink-400 lg:flex">
            <Clock size={14} className="text-customBlue" aria-hidden />
            {duration}
          </span>
        )}
        <span className="emc-cta-line shrink-0 text-xs sm:text-sm">
          استكشف
          <ArrowLeftIcon size={14} />
        </span>
      </Link>
    </motion.div>
  )
}

export default function HomeLearningTracks() {
  const [activeTab, setActiveTab] = useState<'professional' | 'academic' | 'languages' | 'children'>('professional')

  return (
    <section
      id="learning-tracks"
      dir="rtl"
      className="relative scroll-mt-24 overflow-hidden bg-brand-50/40 px-4 py-20 sm:px-6 lg:px-10 lg:py-28"
    >
      {/* V3 decorative layer flying-pages texture + ghost numeral (scene signatures, max 2) */}
      <div aria-hidden className="emc-pages-light pointer-events-none absolute inset-0 opacity-[0.05]" />
      <span aria-hidden className="emc-ghost-num absolute -top-5 left-4 text-[7rem] sm:text-[10rem]">
        02
      </span>

      <div className="relative mx-auto max-w-[1540px]">
        {/* Header canonical eyebrow + title-arc language */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
          className="mb-10 text-center"
        >
          <span className="emc-eyebrow">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
            دليل المسارات الرسمي EMC
          </span>
          <h2 className="emc-title-arc is-center mt-4 font-display text-3xl font-black tracking-tight text-deepBlue [text-wrap:balance] sm:text-4xl lg:text-[2.75rem]">
            مسارات التعلّم <span className="text-customBlue">والشهادات المعتمدة</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base font-semibold leading-relaxed text-ink-400">
            تأهيل شامل يمتد من 6 إلى 8 أشهر ينتهي بمشروع وتقييم عملي وشهادة معتمدة رسمياً من EMC.
          </p>
        </motion.div>

        {/* Tab Navigation functional segmented control (kept) */}
        <div className="mb-10 flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-line bg-paper2/80 p-2">
          <button
            type="button"
            onClick={() => setActiveTab('professional')}
            className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-black transition-all ${
              activeTab === 'professional'
                ? 'bg-deepBlue text-white scale-[1.02]'
                : 'text-ink-400 hover:text-deepBlue hover:bg-white/60'
            }`}
          >
            <Brain size={18} />
            <span>المسارات الاحترافية الـ 9</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('academic')}
            className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-black transition-all ${
              activeTab === 'academic'
                ? 'bg-deepBlue text-white scale-[1.02]'
                : 'text-ink-400 hover:text-deepBlue hover:bg-white/60'
            }`}
          >
            <GraduationCap size={18} />
            <span>الوحدات التخصصية الأكاديمية</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('languages')}
            className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-black transition-all ${
              activeTab === 'languages'
                ? 'bg-deepBlue text-white scale-[1.02]'
                : 'text-ink-400 hover:text-deepBlue hover:bg-white/60'
            }`}
          >
            <Languages size={18} />
            <span>معهد اللغات</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('children')}
            className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-black transition-all ${
              activeTab === 'children'
                ? 'bg-deepBlue text-white scale-[1.02]'
                : 'text-ink-400 hover:text-deepBlue hover:bg-white/60'
            }`}
          >
            <Smile size={18} />
            <span>الأطفال وعقول المستقبل</span>
          </button>
        </div>

        {/* Tab Content editorial row lists (Design Language 2.0) */}
        <AnimatePresence mode="wait">
          {activeTab === 'professional' && (
            <motion.div
              key="professional"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <div aria-hidden className="emc-hairline" />
              {PROFESSIONAL_TRACKS.map((track, i) => (
                <EditorialRow
                  key={track.id}
                  icon={track.icon}
                  title={track.title}
                  titleEn={track.titleEn}
                  desc={track.focus}
                  duration={track.duration}
                  index={i}
                />
              ))}
            </motion.div>
          )}

          {activeTab === 'academic' && (
            <motion.div
              key="academic"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <div aria-hidden className="emc-hairline" />
              {ACADEMIC_UNITS.map((unit, i) => (
                <EditorialRow key={unit.title} icon={unit.icon} title={unit.title} desc={unit.desc} index={i} />
              ))}
            </motion.div>
          )}

          {activeTab === 'languages' && (
            <motion.div
              key="languages"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <div aria-hidden className="emc-hairline" />
              {LANGUAGE_PROGRAMS.map((lang, i) => (
                <EditorialRow key={lang.title} icon={lang.icon} title={lang.title} desc={lang.desc} index={i} />
              ))}
            </motion.div>
          )}

          {activeTab === 'children' && (
            <motion.div
              key="children"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <div aria-hidden className="emc-hairline" />
              {CHILDREN_PROGRAMS.map((prog, i) => (
                <EditorialRow key={prog.title} icon={prog.icon} title={prog.title} desc={prog.desc} index={i} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
