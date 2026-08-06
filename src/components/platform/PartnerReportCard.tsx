import { motion } from 'framer-motion'
import { FileBarChart } from 'lucide-react'

type Props = {
  title: string
  at: string
  onOpen?: () => void
}

export default function PartnerReportCard({ title, at, onOpen }: Props) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={onOpen}
      className="flex w-full items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 text-right shadow-sm transition hover:border-customOrange/40 hover:shadow-md"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-customOrange/15 text-customOrange">
        <FileBarChart size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-deepBlue">{title}</p>
        <p className="mt-1 text-xs font-bold text-slate-400">{at}</p>
      </div>
    </motion.button>
  )
}
