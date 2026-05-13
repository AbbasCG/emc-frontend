import { motion } from 'framer-motion'
import { BookMarked } from 'lucide-react'
import type { KnowledgeCategory } from '@/types/platform'

type Props = {
  categories: KnowledgeCategory[]
  active?: string | null
  onSelect?: (slug: string | null) => void
}

export default function KnowledgeSidebar({ categories, active, onSelect }: Props) {
  return (
    <aside className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm shadow-slate-100/80">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-deepBlue text-white">
          <BookMarked size={18} />
        </span>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">التصفية</p>
          <p className="text-sm font-black text-deepBlue">الفئات</p>
        </div>
      </div>
      <nav className="space-y-1">
        <button
          type="button"
          onClick={() => onSelect?.(null)}
          className={[
            'flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-bold transition',
            !active ? 'bg-customBlue text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50',
          ].join(' ')}
        >
          كل المقالات
        </button>
        {categories.map((c, i) => {
          const sel = active === c.slug || active === c.id
          return (
            <motion.button
              key={c.id}
              type="button"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => onSelect?.(c.slug)}
              className={[
                'flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-bold transition',
                sel ? 'bg-deepBlue text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50',
              ].join(' ')}
            >
              <span className="flex-1 text-right">{c.title}</span>
            </motion.button>
          )
        })}
      </nav>
    </aside>
  )
}
