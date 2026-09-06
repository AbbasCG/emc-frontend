import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { fetchAdminAuditLogDetail } from '@/api/adminAuditLogsApi'
import type { AdminAuditLogEntry } from '@/types/adminAudit'
import { CrudDrawer } from '@/pages/super-admin/crud/shared/CrudDrawer'
import { ChangesAccordion } from './ChangesDiff'
import {
  actorDisplay,
  BADGE_THEME,
  fmtDate,
  fmtTime24,
  parseUserAgent,
  renderValue,
  resolveActionBadge,
} from './formatters'

export default function AuditLogDetailDrawer({
  entry,
  onClose,
}: {
  entry: AdminAuditLogEntry | null
  onClose: () => void
}) {
  const [detail, setDetail] = useState<AdminAuditLogEntry | null>(entry)
  const [loading, setLoading] = useState(entry != null)

  // Swap in the row snapshot during render when the drawer points at another entry
  // (react.dev "adjusting state when a prop changes"), so the previous entry's detail
  // never paints for one frame while the full record loads.
  const [seenEntry, setSeenEntry] = useState(entry)
  if (seenEntry !== entry) {
    setSeenEntry(entry)
    setDetail(entry)
    if (entry) setLoading(true)
  }

  useEffect(() => {
    if (!entry) return
    void fetchAdminAuditLogDetail(entry.id)
      .then((row) => { if (row) setDetail(row) })
      .finally(() => setLoading(false))
  }, [entry])

  const d = detail
  const dBadge = d ? resolveActionBadge(d) : null
  const dPill = dBadge ? (BADGE_THEME[dBadge.theme] ?? BADGE_THEME.neutral) : ''
  const ua = parseUserAgent(d?.user_agent ?? d?.user_agent_summary)

  return (
    <CrudDrawer
      open={entry != null}
      onClose={onClose}
      title="تفاصيل الحدث"
      subtitle={d ? `${fmtDate(d.created_at)} · ${fmtTime24(d.created_at)}` : ''}
      widthClassName="max-w-lg sm:max-w-2xl"
    >
      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}
      {d && !loading && (
        <div dir="rtl" className="space-y-5 text-right">
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-muted-400">المستخدم</p>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-sm font-black text-white shadow-emc-sm">
                {actorDisplay(d.actor_name).charAt(0)}
              </div>
              <div>
                <p className="font-black text-ink-500">{actorDisplay(d.actor_name)}</p>
                <p className="text-[12px] font-medium text-muted-500">{d.actor_role || 'غير محدد'}</p>
                {d.user?.email && <p dir="ltr" className="mt-0.5 font-mono text-[11px] text-muted-400">{d.user.email}</p>}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-muted-400">تفاصيل الحدث</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="mb-1 text-[10px] text-muted-400">الإجراء</p>
                {dBadge && <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ring-1 ${dPill}`}>{dBadge.labelAr}</span>}
              </div>
              <div>
                <p className="mb-1 text-[10px] text-muted-400">نوع الكيان</p>
                <p className="font-bold text-ink-500">{d.entity_type}</p>
                {d.entity_id && <p className="text-[11px] text-muted-400">#{d.entity_id}</p>}
              </div>
              <div>
                <p className="mb-1 text-[10px] text-muted-400">التاريخ</p>
                <p dir="ltr" className="font-latin font-bold text-ink-500">{fmtDate(d.created_at)}</p>
              </div>
              <div>
                <p className="mb-1 text-[10px] text-muted-400">الوقت / المنطقة</p>
                <p dir="ltr" className="font-mono font-bold text-ink-500">{fmtTime24(d.created_at)}</p>
                <p className="text-[10px] text-muted-400">{Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
              </div>
            </div>
            {(d.description || d.entity_label) && (
              <div className="mt-3 border-t border-slate-200 pt-3">
                <p className="mb-1 text-[10px] text-muted-400">الوصف</p>
                <p className="text-[13px] font-medium leading-relaxed text-slate-700">{d.description || d.entity_label}</p>
              </div>
            )}
            {d.route && (
              <div className="mt-3 border-t border-slate-200 pt-3">
                <p className="mb-1.5 text-[10px] text-muted-400">المسار</p>
                <code dir="ltr" className="block rounded-xl bg-slate-900 px-3 py-2.5 text-[11px] font-mono text-slate-200">
                  {d.method && <span className="mr-2 font-bold text-brand-400">{d.method}</span>}
                  {d.route}
                </code>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <InfoCell label="عنوان IP" value={d.ip_address ?? '—'} mono />
            <InfoCell label="المتصفح" value={ua.browser} />
            <InfoCell label="نظام التشغيل" value={ua.os} />
            <InfoCell label="الدولة" value="—" />
          </div>

          {d.user_agent && (
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-muted-400">User Agent</p>
              <p dir="ltr" className="break-all text-[11px] font-medium leading-relaxed text-slate-700">{d.user_agent}</p>
            </div>
          )}

          {d.metadata != null && (
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-muted-400">JSON Payload</p>
              <pre dir="ltr" className="max-h-48 overflow-auto rounded-xl bg-slate-900 p-3 text-[10px] text-slate-200">{renderValue(d.metadata)}</pre>
            </div>
          )}

          <ChangesAccordion entry={d} />
        </div>
      )}
    </CrudDrawer>
  )
}

function InfoCell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-muted-400">{label}</p>
      <p dir={mono ? 'ltr' : 'rtl'} className={`text-[13px] font-bold text-ink-500 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  )
}
