import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  MoreVertical, Pencil, Copy, Archive, Play, Pause, RotateCcw, Trash2, BarChart3,
} from 'lucide-react'
import type { InstructorQuizSummary } from '@/api/courseQuizApi'

export type QuizAction = 'edit' | 'publish' | 'close' | 'reopen' | 'archive' | 'duplicate' | 'delete' | 'results'

export default function QuizActionsMenu({ quiz, onAction }: {
  quiz: InstructorQuizSummary
  onAction: (action: QuizAction) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  function run(action: QuizAction) {
    setOpen(false)
    onAction(action)
  }

  const items: { action: QuizAction; label: string; icon: typeof Pencil; danger?: boolean; show: boolean }[] = [
    { action: 'edit', label: 'تعديل', icon: Pencil, show: true },
    { action: 'results', label: 'عرض النتائج', icon: BarChart3, show: true },
    { action: 'publish', label: 'نشر', icon: Play, show: quiz.status === 'draft' },
    { action: 'close', label: 'إيقاف (Unpublish)', icon: Pause, show: quiz.status === 'active' || quiz.status === 'scheduled' },
    { action: 'reopen', label: 'إعادة فتح', icon: RotateCcw, show: quiz.status === 'closed' },
    { action: 'duplicate', label: 'نسخ', icon: Copy, show: true },
    { action: 'archive', label: 'أرشفة', icon: Archive, show: quiz.status !== 'archived' },
    { action: 'delete', label: 'حذف', icon: Trash2, danger: true, show: quiz.completed_students_count === 0 },
  ]

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="إجراءات الاختبار"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-deepBlue"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            role="menu"
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className="absolute left-0 z-40 mt-1.5 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-lg"
          >
            {items.filter((i) => i.show).map(({ action, label, icon: Icon, danger }) => (
              <li key={action}>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => run(action)}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-right text-[12px] font-bold transition ${
                    danger ? 'text-red-600 hover:bg-red-50' : 'text-deepBlue/80 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" /> {label}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
