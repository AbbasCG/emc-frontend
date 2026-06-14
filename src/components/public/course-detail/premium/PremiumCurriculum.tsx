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
      transition={{ delay: index * 0.045, duration: 0.28 }}
      className="overflow-hidden rounded-xl border border-[#22334A]/8 bg-white shadow-sm transition-all hover:border-[#2691C2]/20 hover:shadow-md"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-right transition-colors hover:bg-[#2691C2]/3"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#2691C2]/14 to-[#2691C2]/5 text-[#2691C2]">
          <BookOpen className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 text-right">
          <p className="truncate text-sm font-black text-[#22334A]">{group.title}</p>
          <p className="text-[10px] font-semibold tabular-nums text-slate-500">
            {formatPublicText(items.length)} عنصر
          </p>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-[#2691C2] transition-transform duration-200',
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
            <div className="border-t border-[#22334A]/6 px-4 py-3.5">
              <ol className="space-y-2">
                {items.map((item, i) => (
                  <li key={item} className="flex items-start gap-2.5 text-right">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2691C2]/8 text-[9px] font-black tabular-nums text-[#2691C2]">
                      {formatPublicText(i + 1)}
                    </span>
                    <p className="text-[12.5px] font-medium leading-[1.55] text-slate-700">{item}</p>
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
      <h2 className="mb-3 flex items-center gap-2.5 text-sm font-black text-[#22334A]">
        <span className="h-4 w-1 rounded-full bg-[#2691C2]" aria-hidden />
        المنهاج
      </h2>
      <div className="space-y-2">
        {nonEmpty.map((g, i) => (
          <AccordionModule key={g.id} group={g} index={i} />
        ))}
      </div>
    </section>
  )
}
