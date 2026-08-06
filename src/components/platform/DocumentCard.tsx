import { motion } from 'framer-motion'
import { FileText } from 'lucide-react'
import type { PlatformDocument } from '@/types/platform'
import VisibilityBadge from './VisibilityBadge'

type Props = {
  doc: PlatformDocument
}

export default function DocumentCard({ doc }: Props) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-customBlue/25 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F6F8FB] text-customBlue ring-1 ring-slate-100">
          <FileText size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <VisibilityBadge variant="document_visibility" value={doc.visibility} />
            {doc.related_label && (
              <span className="rounded-lg bg-slate-50 px-2 py-0.5 text-[11px] font-black text-slate-500 ring-1 ring-slate-100">
                {doc.related_label}
              </span>
            )}
          </div>
          <h3 className="mt-2 truncate text-sm font-black text-deepBlue">{doc.name}</h3>
          <p className="mt-2 text-[11px] font-bold text-slate-400">
            {doc.size_label ?? '—'} · {doc.updated_at}
          </p>
        </div>
      </div>
    </motion.article>
  )
}
