import { motion } from 'framer-motion'
import type { QuizQuestion } from '@/types/platform'

type Props = {
  index: number
  total: number
  question: QuizQuestion
  selected: number | null
  onSelect: (choiceIndex: number) => void
}

export default function QuizCard({ index, total, question, selected, onSelect }: Props) {
  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
          سؤال {index + 1} من {total}
        </p>
        <span className="rounded-lg bg-[#F6F8FB] px-2 py-1 text-[11px] font-black text-deepBlue ring-1 ring-slate-100">
          اختيار من متعدد
        </span>
      </div>
      <h3 className="text-lg font-black leading-8 text-deepBlue">{question.prompt}</h3>
      <ul className="mt-5 space-y-2">
        {question.choices.map((c, i) => {
          const active = selected === i
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => onSelect(i)}
                className={[
                  'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-right text-sm font-bold transition',
                  active
                    ? 'border-customBlue bg-sky-50 text-deepBlue shadow-sm'
                    : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200',
                ].join(' ')}
              >
                <span
                  className={[
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black ring-1 ring-inset',
                    active ? 'bg-customBlue text-white ring-customBlue' : 'bg-slate-50 text-slate-500 ring-slate-100',
                  ].join(' ')}
                >
                  {i + 1}
                </span>
                <span className="flex-1">{c}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </motion.section>
  )
}
