import { motion } from 'framer-motion'
import { CheckCircle2, Circle } from 'lucide-react'
import { Link } from 'react-router'
import type { LmsModule } from '@/types/platform'

type Props = {
  courseId: number | string
  modules: LmsModule[]
  lessonModuleId?: number
}

export default function ModuleSidebar({ courseId, modules, lessonModuleId }: Props) {
  return (
    <nav className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="mb-3 px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
        مسار الوحدات
      </p>
      <ul className="space-y-1">
        {modules.map((m, i) => {
          const active = lessonModuleId === m.id
          const done = (m.completed_lessons ?? 0) >= m.lessons_count
          return (
            <motion.li key={m.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
              <Link
                to={`/dashboard/courses/${courseId}/modules`}
                className={[
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition',
                  active ? 'bg-deepBlue text-white shadow-md' : 'text-slate-600 hover:bg-slate-50',
                ].join(' ')}
              >
                {done ? (
                  <CheckCircle2 size={18} className={active ? 'text-emerald-200' : 'text-emerald-500'} />
                ) : (
                  <Circle size={18} className={active ? 'text-white/50' : 'text-slate-300'} />
                )}
                <span className="flex-1">
                  {m.title}
                  <span className="mr-2 text-[11px] font-bold opacity-70">
                    ({m.completed_lessons ?? 0}/{m.lessons_count})
                  </span>
                </span>
              </Link>
            </motion.li>
          )
        })}
      </ul>
    </nav>
  )
}
