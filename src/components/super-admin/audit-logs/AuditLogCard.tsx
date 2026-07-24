import { AnimatePresence, motion } from 'framer-motion'
import { Calendar, ChevronDown, ChevronLeft, Clock, Globe, Monitor } from 'lucide-react'
import { useState } from 'react'
import type { AdminAuditLogEntry } from '@/types/adminAudit'
import { ChangesDiffTable } from './ChangesDiff'
import {
  actorDisplay,
  BADGE_THEME,
  CARD_BORDER,
  fmtDate,
  fmtTime24,
  resolveActionBadge,
} from './formatters'

type Props = {
  entry: AdminAuditLogEntry
  index: number
  onOpenDetail: (entry: AdminAuditLogEntry) => void
}

export default function AuditLogCard({ entry, index, onOpenDetail }: Props) {
  const [expanded, setExpanded] = useState(false)
  const badge = resolveActionBadge(entry)
  const pill = BADGE_THEME[badge.theme] ?? BADGE_THEME.neutral
  const cardBorder = CARD_BORDER[badge.theme] ?? CARD_BORDER.neutral
  const hasChanges =
    (entry.changed_fields && entry.changed_fields.length > 0) ||
    entry.old_values != null ||
    entry.new_values != null

  return (
    <motion.article
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.26, delay: Math.min(index * 0.03, 0.4) }}
      className={`overflow-hidden rounded-2xl border border-slate-100 border-r-4 ${cardBorder} bg-white shadow-emc-xs transition-shadow duration-150 hover:shadow-emc-sm`}
    >
      <div className="flex items-start gap-4 p-5">
        <div className="min-w-0 flex-1 space-y-2 text-right">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-black ring-1 ${pill}`}>{badge.labelAr}</span>
            <span className="text-[14px] font-black text-ink-500">{actorDisplay(entry.actor_name)}</span>
            {entry.actor_role && (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">{entry.actor_role}</span>
            )}
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">{entry.entity_type}</span>
          </div>
          {(entry.description || entry.entity_label) && (
            <p className="text-[13px] font-medium leading-relaxed text-slate-600">{entry.description || entry.entity_label}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-400">
            <span dir="ltr" className="flex items-center gap-1 font-medium"><Calendar size={11} />{fmtDate(entry.created_at)}</span>
            <span dir="ltr" className="flex items-center gap-1 font-mono font-bold text-slate-600"><Clock size={11} />{fmtTime24(entry.created_at)}</span>
            {entry.ip_address && <span dir="ltr" className="flex items-center gap-1 font-mono"><Globe size={11} />{entry.ip_address}</span>}
            {entry.method && <span dir="ltr" className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700">{entry.method}</span>}
            {entry.user_agent_summary && entry.user_agent_summary !== '—' && (
              <span className="flex max-w-[180px] items-center gap-1 truncate"><Monitor size={11} />{entry.user_agent_summary}</span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <button type="button" onClick={() => onOpenDetail(entry)} className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-[12px] font-bold text-ink-500 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600">
            تفاصيل
            <ChevronLeft size={13} />
          </button>
          {hasChanges && (
            <button type="button" onClick={() => setExpanded((v) => !v)} className="flex items-center gap-1 rounded-xl border border-slate-100 px-3.5 py-2 text-[11px] font-bold text-muted-500 transition hover:border-slate-200 hover:bg-slate-50">
              <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}><ChevronDown size={12} /></motion.span>
              التغييرات
            </button>
          )}
        </div>
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-slate-100 bg-slate-50/60">
            <div className="p-5"><ChangesDiffTable entry={entry} /></div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  )
}
