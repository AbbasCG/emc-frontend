import { useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Download, FileText, Film, Link2, Loader2, Presentation } from 'lucide-react'
import type { LmsMaterial } from '@/types/lms'
import { downloadMaterial } from '@/api/studentApi'

const iconMap = {
  pdf: FileText,
  video: Film,
  link: Link2,
  slides: Presentation,
  document: BookOpen,
  other: BookOpen,
}

export default function MaterialCard({ material }: { material: LmsMaterial }) {
  const [downloading, setDownloading] = useState(false)
  const Icon = iconMap[material.kind] ?? iconMap.other
  const isLink = material.kind === 'link'
  const hasUrl = Boolean(material.url && String(material.url).trim() !== '')

  async function handleDownload() {
    if (isLink && material.url) {
      window.open(material.url, '_blank', 'noreferrer')
      return
    }
    setDownloading(true)
    try {
      await downloadMaterial(material.id, material.url)
    } finally {
      setDownloading(false)
    }
  }

  const actionVerb =
    isLink ? 'فتح الرابط'
    : ['pdf', 'document', 'slides'].includes(material.kind) ? 'تحميل'
    : material.kind === 'video' ? 'مشاهدة'
    : 'فتح المادة'

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
          <div className="mt-3 flex flex-wrap items-center justify-start gap-2 text-[11px] font-bold text-slate-400">
            {material.size_label && <span>{material.size_label}</span>}
            {material.updated_at && <span>آخر تحديث: {material.updated_at}</span>}
          </div>
        </div>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-customBlue/10 text-customBlue">
          <Icon size={22} />
        </span>
      </div>

      {hasUrl || !isLink ? (
        <button
          type="button"
          disabled={downloading}
          onClick={() => void handleDownload()}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-deepBlue py-2.5 text-xs font-black text-white transition hover:bg-deepBlue/90 disabled:opacity-60"
        >
          {downloading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            !isLink && <Download size={14} />
          )}
          {downloading ? 'جارٍ التحميل...' : actionVerb}
        </button>
      ) : (
        <p className="mt-4 rounded-xl border border-deepBlue/[0.08] bg-deepBlue/[0.03] py-2.5 text-center text-[11px] font-bold text-deepBlue/55">
          لا رابط أو ملف متاح لهذه المادة.
        </p>
      )}
    </motion.div>
  )
}
