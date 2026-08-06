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
      <h2 className="mb-3 flex items-center gap-2.5 text-sm font-black text-[#22334A]">
        <span className="h-4 w-1 rounded-full bg-[#EC943C]" aria-hidden />
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
              transition={{ delay: i * 0.04, duration: 0.28 }}
              className={cn(
                'flex items-start gap-3 rounded-xl border p-3.5 text-right transition-all hover:-translate-y-0.5 hover:shadow-md',
                isOrange
                  ? 'border-[#EC943C]/13 bg-gradient-to-br from-[#EC943C]/6 to-white'
                  : 'border-[#2691C2]/12 bg-gradient-to-br from-[#2691C2]/6 to-white',
              )}
            >
              <div
                className={cn(
                  'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                  isOrange
                    ? 'bg-[#EC943C]/12 text-[#EC943C]'
                    : 'bg-[#2691C2]/10 text-[#2691C2]',
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-[13px] font-semibold leading-[1.6] text-[#22334A]">{item}</p>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
