import { motion } from 'framer-motion'
import {
  BookOpen, CheckCircle2, FileText, GraduationCap, Lightbulb, Target, Wrench, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const ICONS = [Target, Zap, BookOpen, CheckCircle2, GraduationCap, Lightbulb, Wrench, FileText]

type Props = { items: string[] }

export default function PremiumLearnGrid({ items }: Props) {
  if (items.length === 0) return null

  return (
    <section aria-label="ماذا ستتعلم" dir="rtl">
      <h2 className="mb-3.5 flex items-center gap-2.5 font-display text-sm font-black tracking-tight text-deepBlue">
        <span className="h-4 w-1 rounded-full bg-customOrange" aria-hidden />
        ماذا ستتعلم
      </h2>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {items.map((item, i) => {
          const Icon = ICONS[i % ICONS.length]
          const isOrange = i % 3 === 1
          return (
            <motion.div
              key={item}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
              className={cn(
                'flex items-start gap-3 rounded-xl border p-3.5 text-right transition-all duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:-translate-y-0.5',
                isOrange
                  ? 'border-customOrange/13 bg-gradient-to-br from-customOrange/[0.06] to-white'
                  : 'border-customBlue/12 bg-gradient-to-br from-customBlue/[0.06] to-white',
              )}
            >
              <div
                className={cn(
                  'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                  isOrange
                    ? 'bg-customOrange/12 text-customOrange'
                    : 'bg-customBlue/10 text-customBlue',
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-[13px] font-semibold leading-[1.65] text-deepBlue">{item}</p>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
