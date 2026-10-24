import { useState } from 'react'
import { Loader2, UsersRound, X } from 'lucide-react'
import type { Ticket, TicketPriority } from '@/types/ticket'
import type { BulkResult } from '@/types/ticketOps'
import AssigneeSearchSelect from '@/components/tickets/AssigneeSearchSelect'
import ConfirmDialog from '@/components/feedback/ConfirmDialog'
import { apiMessage, bulkUpdateTickets } from '@/services/ticketOpsService'
import { useTicketMeta } from '@/hooks/useTicketMeta'
import toast from '@/lib/toast'
import { TICKET_PRIORITIES } from '@/utils/ticketFilters'
import { PRIORITY_LABELS } from './ticketOpsUi'

const MAX_BULK = 50
const FIELD = 'rounded-xl border border-deepBlue/10 bg-white px-3 py-2 text-[13px] font-semibold text-deepBlue outline-none focus:border-customBlue focus:ring-2 focus:ring-customBlue/15'

type Pending = { kind: 'priority'; priority: TicketPriority } | { kind: 'reassign'; assigneeId: number; assigneeName: string }

/**
 * Bulk actions on the explicitly selected tickets: change priority, or hand them to one person.
 * (Approve and reject are deliberately not offered in bulk: each one notifies the ticket's reporter.)
 *
 * Nothing runs without a confirmation that states the count. The server checks every ticket on its
 * own, so the result is reported ticket by ticket: some can succeed while others are refused, and the
 * refused ones keep their selection so they can be reviewed. At most 50 per operation.
 */
export function TicketBulkBar({ selected, onClear, onDone }: { selected: Ticket[]; onClear: () => void; onDone: (ok: number[]) => void }) {
  const [priority, setPriority] = useState<TicketPriority | ''>('')
  const [assignee, setAssignee] = useState('')
  const [pending, setPending] = useState<Pending | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<BulkResult | null>(null)

  const departments = [...new Set(selected.map((t) => t.department_id))]
  const sameDepartment = departments.length === 1
  const { users, usersLoading } = useTicketMeta(sameDepartment ? departments[0] : null)
  const tooMany = selected.length > MAX_BULK
  const canPriority = selected.some((t) => t.capabilities?.change_priority)
  const canReassign = selected.some((t) => t.capabilities?.reassign)

  async function run() {
    if (!pending || busy) return
    setBusy(true)
    try {
      const ids = selected.map((t) => t.id)
      const res = await bulkUpdateTickets(
        pending.kind === 'priority' ? { action: 'priority', ticketIds: ids, priority: pending.priority } : { action: 'reassign', ticketIds: ids, assignedToId: pending.assigneeId },
      )
      setResult(res)
      setPending(null)
      if (res.succeeded > 0) toast.success(`نُفِّذت العملية على ${res.succeeded} من ${res.requested} تذكرة.`)
      else toast.error('لم تُنفَّذ العملية على أي تذكرة.')
      onDone(res.results.filter((r) => r.ok).map((r) => r.id))
    } catch (e) {
      toast.error(apiMessage(e, 'تعذّر تنفيذ العملية.'))
      setPending(null)
    } finally {
      setBusy(false)
    }
  }

  if (selected.length === 0 && !result) return null

  return (
    <section aria-label="إجراءات جماعية" className="sticky bottom-3 z-20 space-y-3 rounded-2xl border border-customBlue/30 bg-white p-3.5 shadow-xl" data-testid="bulk-bar">
      {selected.length > 0 ?
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 text-[13px] font-black text-deepBlue"><UsersRound size={15} aria-hidden="true" /> تم تحديد {selected.length} تذكرة</span>
          <button type="button" onClick={onClear} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-black text-deepBlue/60 hover:bg-slate-100"><X size={12} aria-hidden="true" /> إلغاء التحديد</button>

          {tooMany ? <p role="alert" className="text-[12px] font-bold text-red-600">الحد الأقصى {MAX_BULK} تذكرة في العملية الواحدة.</p> : null}

          <div className="ms-auto flex flex-wrap items-center gap-2">
            {canPriority ?
              <>
                <select value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority | '')} className={FIELD} aria-label="الأولوية الجديدة للمحدد">
                  <option value="">تغيير الأولوية…</option>
                  {TICKET_PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
                </select>
                <button type="button" disabled={!priority || tooMany || busy} onClick={() => priority && setPending({ kind: 'priority', priority })} className="rounded-xl bg-customBlue px-3.5 py-2 text-[12px] font-black text-white disabled:opacity-45">تطبيق الأولوية</button>
              </>
            : null}

            {canReassign ?
              sameDepartment ?
                <>
                  <div className="w-52"><AssigneeSearchSelect value={assignee} onChange={setAssignee} users={users} isLoading={usersLoading} ariaLabel="المكلف الجديد للمحدد" instanceId="ticket-bulk-assignee" placeholder="إسناد إلى…" noOptionsMessage="لا توجد قائمة موظفين متاحة" /></div>
                  <button type="button" disabled={!assignee || tooMany || busy} onClick={() => { const u = users.find((x) => String(x.id) === assignee); if (u) setPending({ kind: 'reassign', assigneeId: u.id, assigneeName: u.name }) }} className="rounded-xl border border-indigo-300 px-3.5 py-2 text-[12px] font-black text-indigo-700 hover:bg-indigo-50 disabled:opacity-45">إسناد</button>
                </>
              : <span className="text-[12px] font-semibold text-deepBlue/50">الإسناد الجماعي لتذاكر إدارة واحدة فقط.</span>
            : null}
          </div>
        </div>
      : null}

      {result ?
        <div role="status" className="rounded-xl bg-slate-50 p-3" data-testid="bulk-result">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[13px] font-black text-deepBlue">نُفِّذت على {result.succeeded} من {result.requested} تذكرة{result.failed > 0 ? ` · ${result.failed} لم تُنفَّذ` : ''}.</p>
            <button type="button" onClick={() => setResult(null)} aria-label="إغلاق نتيجة العملية" className="grid h-7 w-7 place-items-center rounded-lg hover:bg-white"><X size={13} aria-hidden="true" /></button>
          </div>
          {result.failed > 0 ?
            <ul className="mt-2 space-y-1 text-[12px] font-semibold text-red-700">
              {result.results.filter((r) => !r.ok).map((r) => <li key={r.id}>{r.ticketNumber ?? `#${r.id}`}: {r.message}</li>)}
            </ul>
          : null}
        </div>
      : null}

      <ConfirmDialog
        open={pending !== null}
        title={pending?.kind === 'priority' ? 'تغيير أولوية عدة تذاكر' : 'إسناد عدة تذاكر'}
        description={
          pending?.kind === 'priority' ? `ستُغيَّر أولوية ${selected.length} تذكرة إلى «${PRIORITY_LABELS[pending.priority]}» حيث يُسمح لك بذلك. تُسجَّل العملية في سجل كل تذكرة.`
          : pending ? `ستُسند ${selected.length} تذكرة إلى ${pending.assigneeName}، ويُطلب منه قبول كل واحدة. التذاكر غير القابلة لإعادة التوجيه لن تتغير.`
          : ''
        }
        confirmLabel={busy ? 'جارٍ التنفيذ…' : 'تنفيذ'}
        cancelLabel="إلغاء"
        variant="primary"
        onConfirm={() => void run()}
        onCancel={() => setPending(null)}
      />
      {busy ? <Loader2 size={14} className="animate-spin text-customBlue" aria-hidden="true" /> : null}
    </section>
  )
}
