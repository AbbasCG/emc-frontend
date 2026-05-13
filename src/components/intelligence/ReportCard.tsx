import { motion } from 'framer-motion'
import { FileBarChart } from 'lucide-react'
import type { ReportRecord } from '@/types/intelligence'

const TYPE_AR: Record<string, string> = {
  program: 'تقرير برنامج',
  course: 'تقرير دورة',
  workshop: 'تقرير ورشة',
  finance: 'تقرير مالي',
  quality: 'تقرير جودة',
  management: 'تقرير إدارة',
  partnership: 'تقرير شراكة',
  hr: 'تقرير موارد بشرية',
}

export default function ReportCard({ r }: { r: ReportRecord }) {
  return (
    <motion.article
      layout
      whileHover={{ y: -3 }}
      className="rounded-2xl bg-white p-5 text-right shadow-lg ring-1 ring-deepBlue/[0.06]"
    >
      <div className="flex items-start justify-between gap-3">
        <FileBarChart className="shrink-0 text-customOrange" size={22} />
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-black uppercase tracking-wide text-customBlue">{TYPE_AR[r.report_type] ?? r.report_type}</span>
          <h3 className="mt-2 text-sm font-black text-deepBlue">{r.title}</h3>
          <p className="mt-2 text-[11px] font-bold text-slate-500">{r.related_label ?? '—'}</p>
          <p className="mt-3 text-xs font-semibold leading-relaxed text-slate-600">{r.preview_summary}</p>
          <p className="mt-4 text-[10px] font-bold text-slate-400">{r.created_at}</p>
        </div>
      </div>
    </motion.article>
  )
}
