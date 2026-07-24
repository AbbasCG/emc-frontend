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

/** Type-specific primary action label (kind + mime-type fallback for audio). */
function primaryActionLabel(material: LmsMaterial): string {
  const mime = (material.mime_type ?? '').toLowerCase()
  if (mime.startsWith('audio/')) return 'تشغيل'
  switch (material.kind) {
    case 'pdf': return 'معاينة / تحميل'
    case 'video': return 'مشاهدة'
    case 'link': return 'فتح الرابط'
    case 'zip': return 'تحميل الملف'
    case 'slides': return 'معاينة'
    case 'document': return 'معاينة'
    default: return 'تحميل المادة'
  }
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
      className="flex flex-col gap-2.5 rounded-2xl border border-[#0C2A4B]/[0.07] bg-white p-4 shadow-sm transition hover:border-[#0077B6]/25 hover:shadow-md"
    >
      {/* Icon + title + badge */}
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#0077B6]/10 text-[#0077B6]">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="min-w-0 truncate text-[14px] font-black leading-snug text-[#0F172A]" title={material.title}>{material.title}</h3>
            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black ${badgeCls}`}>
              {badge}
            </span>
          </div>
          {material.course_name && (
            <p className="mt-0.5 truncate text-[11px] font-semibold text-[#0C2A4B]/50">{material.course_name}</p>
          )}
        </div>
      </div>

      {/* Description */}
      {material.description && (
        <p className="line-clamp-2 text-[12px] font-medium leading-relaxed text-slate-600">{material.description}</p>
      )}

      {/* Meta row: updated date + size — plain text, not boxed chips */}
      {(updatedLabel !== '—' || material.size_label) && (
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-semibold text-[#0C2A4B]/45">
          {updatedLabel !== '—' && <span className="tabular-nums">{updatedLabel}</span>}
          {updatedLabel !== '—' && material.size_label && <span className="text-[#0C2A4B]/20">·</span>}
          {material.size_label && <span>{material.size_label}</span>}
        </div>
      )}

      {/* Action button */}
      {hasUrl || !isLink ? (
        <button
          type="button"
          disabled={dlState === 'downloading'}
          onClick={() => void handleDownload()}
          className={`mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl py-2 text-[12px] font-black text-white shadow-sm transition hover:brightness-105 disabled:opacity-60 ${
            dlState === 'success' ? 'bg-emerald-600'
            : dlState === 'error'   ? 'bg-rose-600'
            : 'bg-[#0077B6]'
          }`}
        >
          {dlState === 'downloading' ? (
            <><Loader2 className="h-4 w-4 animate-spin" aria-hidden />جارٍ التحميل...</>
          ) : dlState === 'success' ? (
            <><CheckCircle2 className="h-4 w-4" aria-hidden />تم بدء التحميل</>
          ) : dlState === 'error' ? (
            <><AlertCircle className="h-4 w-4" aria-hidden />تعذّر تحميل الملف</>
          ) : isLink ? (
            <><ExternalLink className="h-4 w-4" aria-hidden />{primaryActionLabel(material)}</>
          ) : (
            <><Download className="h-4 w-4" aria-hidden />{primaryActionLabel(material)}</>
          )}
        </button>
      ) : (
        <p className="mt-auto rounded-xl border border-[#0C2A4B]/[0.07] bg-slate-50/70 py-2.5 text-center text-[11px] font-bold text-[#0C2A4B]/40">
          لا رابط أو ملف متاح لهذه المادة.
        </p>
      )}
    </motion.div>
  )
}
