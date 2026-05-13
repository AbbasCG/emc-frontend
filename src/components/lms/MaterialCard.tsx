import { motion } from 'framer-motion'
import { BookOpen, FileText, Film, Link2, Presentation } from 'lucide-react'
import type { LmsMaterial } from '@/types/lms'

const iconMap = {
  pdf: FileText,
  video: Film,
  link: Link2,
  slides: Presentation,
  document: BookOpen,
  other: BookOpen,
}

export default function MaterialCard({ material }: { material: LmsMaterial }) {
  const Icon = iconMap[material.kind] ?? iconMap.other

  return (
    <motion.div
      layout
      className="flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-deepBlue/[0.06]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 text-right">
          <h3 className="font-black text-deepBlue">{material.title}</h3>
          {material.course_name && (
            <p className="mt-1 text-xs font-bold text-slate-500">{material.course_name}</p>
          )}
          {material.description && (
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">{material.description}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-end gap-2 text-[11px] font-bold text-slate-400">
            {material.size_label && <span>{material.size_label}</span>}
            {material.updated_at && <span>آخر تحديث: {material.updated_at}</span>}
          </div>
        </div>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-customBlue/10 text-customBlue">
          <Icon size={22} />
        </span>
      </div>
      {material.url && (
        <a
          href={material.url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-deepBlue py-2.5 text-xs font-black text-white transition hover:bg-deepBlue/90"
        >
          فتح المادة
        </a>
      )}
    </motion.div>
  )
}
