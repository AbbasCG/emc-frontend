import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  Archive,
  BookOpen,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Film,
  Folder,
  Link2,
  Loader2,
  Presentation,
} from 'lucide-react'
import type { LmsMaterial } from '@/types/lms'
import { downloadMaterial } from '@/api/studentApi'
import { formatLmsDateTime } from '@/components/lms/lmsFormatters'

// ── Icon + badge config per material kind ──────────────────────────────────

type KindMeta = { Icon: typeof FileText; label: string; badge: string; badgeCls: string }

const KIND_META: Record<string, KindMeta> = {
  pdf:                 { Icon: FileText,     label: 'PDF',           badge: 'PDF',      badgeCls: 'bg-red-50 text-red-700 border-red-200' },
  video:               { Icon: Film,         label: 'فيديو',         badge: 'فيديو',    badgeCls: 'bg-blue-50 text-blue-700 border-blue-200' },
  link:                { Icon: Link2,        label: 'رابط',          badge: 'رابط',     badgeCls: 'bg-sky-50 text-sky-700 border-sky-200' },
  slides:              { Icon: Presentation, label: 'عرض',           badge: 'Slides',   badgeCls: 'bg-amber-50 text-amber-700 border-amber-200' },
  document:            { Icon: BookOpen,     label: 'مستند',         badge: 'مستند',    badgeCls: 'bg-slate-50 text-slate-700 border-slate-200' },
  zip:                 { Icon: Archive,      label: 'مشروع ZIP',     badge: 'ZIP',      badgeCls: 'bg-purple-50 text-purple-700 border-purple-200' },
  other:               { Icon: Folder,       label: 'ملف',           badge: 'ملف',      badgeCls: 'bg-purple-50 text-purple-700 border-purple-200' },
}

function meta(kind: string): KindMeta {
  return KIND_META[kind] ?? KIND_META.other
}

// ── Component ──────────────────────────────────────────────────────────────

type DownloadState = 'idle' | 'downloading' | 'success' | 'error'

export default function MaterialCard({ material }: { material: LmsMaterial }) {
  const [dlState, setDlState] = useState<DownloadState>('idle')
  const { Icon, badge, badgeCls } = meta(material.kind)
  const isLink = material.kind === 'link'
  const hasUrl = Boolean(material.url && String(material.url).trim() !== '')
  const updatedLabel = formatLmsDateTime(material.updated_at ?? null)

  async function handleDownload() {
    if (isLink && material.url) {
      window.open(material.url, '_blank', 'noreferrer')
      return
    }
    if (dlState === 'downloading') return
    setDlState('downloading')
    try {
      const fallback = material.original_filename ?? undefined
      await downloadMaterial(material.id, fallback)
      setDlState('success')
      setTimeout(() => setDlState('idle'), 3000)
    } catch {
      setDlState('error')
      setTimeout(() => setDlState('idle'), 4000)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4 rounded-2xl border border-[#22334A]/[0.07] bg-white p-5 shadow-sm transition hover:border-[#2691C2]/25 hover:shadow-md"
    >
      {/* Header: type badge */}
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black ${badgeCls}`}>
          <Icon className="h-3 w-3" aria-hidden />
          {badge}
        </span>
      </div>

      {/* Icon + title */}
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#2691C2]/10 text-[#2691C2]">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-black leading-snug text-[#0F172A]">{material.title}</h3>
          {material.course_name && (
            <p className="mt-0.5 text-[11px] font-semibold text-[#22334A]/50">{material.course_name}</p>
          )}
        </div>
      </div>

      {/* Description */}
      {material.description && (
        <p className="text-[12px] font-medium leading-relaxed text-slate-600">{material.description}</p>
      )}

      {/* Meta row: updated date + size */}
      {(updatedLabel !== '—' || material.size_label) && (
        <div className="flex flex-wrap items-center gap-3">
          {updatedLabel !== '—' && (
            <div className="flex items-center gap-1.5 rounded-xl border border-[#22334A]/[0.07] bg-slate-50/70 px-3 py-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide text-[#22334A]/50">آخر تحديث</p>
                <p className="text-[12px] font-black tabular-nums text-[#22334A]">{updatedLabel}</p>
              </div>
            </div>
          )}
          {material.size_label && (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#22334A]/[0.07] bg-slate-50 px-3 py-2 text-[12px] font-bold text-[#22334A]/70">
              {material.size_label}
            </span>
          )}
        </div>
      )}

      {/* Action button */}
      {hasUrl || !isLink ? (
        <button
          type="button"
          disabled={dlState === 'downloading'}
          onClick={() => void handleDownload()}
          className={`mt-auto inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[12px] font-black text-white shadow-sm transition hover:brightness-105 disabled:opacity-60 ${
            dlState === 'success' ? 'bg-emerald-600'
            : dlState === 'error'   ? 'bg-rose-600'
            : 'bg-[#2691C2]'
          }`}
        >
          {dlState === 'downloading' ? (
            <><Loader2 className="h-4 w-4 animate-spin" aria-hidden />جارٍ التحميل...</>
          ) : dlState === 'success' ? (
            <><CheckCircle2 className="h-4 w-4" aria-hidden />تم بدء التحميل</>
          ) : dlState === 'error' ? (
            <><AlertCircle className="h-4 w-4" aria-hidden />تعذّر تحميل الملف</>
          ) : isLink ? (
            <><ExternalLink className="h-4 w-4" aria-hidden />فتح الرابط</>
          ) : (
            <><Download className="h-4 w-4" aria-hidden />تحميل المادة</>
          )}
        </button>
      ) : (
        <p className="mt-auto rounded-xl border border-[#22334A]/[0.07] bg-slate-50/70 py-2.5 text-center text-[11px] font-bold text-[#22334A]/40">
          لا رابط أو ملف متاح لهذه المادة.
        </p>
      )}
    </motion.div>
  )
}
