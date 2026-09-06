import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CurriculumGroup } from '@/components/public/detail/PublicCurriculumSection'
import { formatPublicText } from '@/utils/publicDetailFormat'

function AccordionModule({ group, index }: { group: CurriculumGroup; index: number }) {
  const items = group.items.filter((x) => x.trim())
  const [open, setOpen] = useState(false)
  if (items.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.045, duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
      className="overflow-hidden rounded-xl border border-line bg-white transition-all duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:border-customBlue/25"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-right transition-colors hover:bg-customBlue/[0.03]"
      >
        <div className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-customBlue/[0.08] text-customBlue transition-colors duration-200',
          open && 'bg-customBlue text-white',
        )}>
          <BookOpen className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 text-right">
          <p className="truncate text-sm font-black text-deepBlue">{group.title}</p>
          <p className="font-latin text-[10px] font-semibold tabular-nums text-muted-500">
            {formatPublicText(items.length)} عنصر
          </p>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-customBlue transition-transform duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)]',
            open && 'rotate-180',
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <div className="border-t border-line px-4 py-3.5">
              <ol className="space-y-2">
                {items.map((item, i) => (
                  <li key={item} className="flex items-start gap-2.5 text-right">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-customBlue/[0.08] font-latin text-[9px] font-black tabular-nums text-customBlue">
                      {formatPublicText(i + 1)}
                    </span>
                    <p className="text-[12.5px] font-medium leading-[1.6] text-foreground">{item}</p>
                  </li>
                ))}
              </ol>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

type Props = { groups: CurriculumGroup[] }

export default function PremiumCurriculum({ groups }: Props) {
  const nonEmpty = groups.filter((g) => g.items.some((x) => x.trim()))
  if (nonEmpty.length === 0) return null

  return (
    <section aria-label="المنهاج" dir="rtl">
      <div className="mb-3.5 flex items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2.5 font-display text-sm font-black tracking-tight text-deepBlue">
          <span className="h-4 w-1 rounded-full bg-customBlue" aria-hidden />
          المنهاج
        </h2>
        <span className="font-latin text-[10px] font-black tabular-nums text-muted-400">
          {formatPublicText(nonEmpty.length)} وحدة
        </span>
      </div>
      <div className="space-y-2">
        {nonEmpty.map((g, i) => (
          <AccordionModule key={g.id} group={g} index={i} />
        ))}
      </div>
    </section>
  )
}
