import { useState } from 'react'
import { Loader2, UserCheck } from 'lucide-react'
import { ticketService } from '@/services/ticketService'
import { apiMessage, fetchAssignmentSuggestions } from '@/services/ticketOpsService'
import { useAbortableResource } from '@/hooks/useAbortableResource'
import ConfirmDialog from '@/components/feedback/ConfirmDialog'
import { useModalGuard } from '@/components/ui/modalGuard'
import toast from '@/lib/toast'
import { cn } from '@/lib/utils'

/**
 * Who could take this ticket, least loaded first. Advisory: the order is the number of open tickets
 * each eligible person already holds (nothing about availability or skills is known, so none is
 * claimed). Assigning is a separate, confirmed action that goes through the ordinary reassign
 * endpoint, which re-checks eligibility.
 */
/** Only what the suggestions depend on, so the panel can start loading from a list row, before the full ticket arrives. */
export interface AssignmentTarget {
  id: number
  assigned_to_id?: number | null
  status: string
}

export function TicketAssignmentPanel({ ticket, canAssign, onChanged }: { ticket: AssignmentTarget; canAssign: boolean; onChanged: () => void }) {
  const { data, loading, error } = useAbortableResource((signal) => fetchAssignmentSuggestions(ticket.id, { signal }), `suggest:${ticket.id}:${ticket.assigned_to_id ?? 0}:${ticket.status}`)
  const [pick, setPick] = useState<{ id: number; name: string } | null>(null)
  const [busy, setBusy] = useState(false)
  useModalGuard('assignment', { busy })

  async function assign() {
    if (!pick || busy) return
    setBusy(true)
    try {
      await ticketService.reassign(ticket.id, { assigned_to_id: pick.id })
      toast.success(`أُسندت التذكرة إلى ${pick.name}. سيُطلب منه قبول المهمة.`)
      setPick(null)
      onChanged()
    } catch (e) {
      toast.error(apiMessage(e, 'تعذّر إسناد التذكرة.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-label="اقتراحات التكليف" className="space-y-2.5 rounded-2xl border border-deepBlue/[0.07] bg-white p-3.5">
      <h4 className="text-[12px] font-black text-deepBlue">اقتراحات التكليف</h4>

      {loading && !data ?
        <div className="space-y-1.5" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="h-9 animate-pulse rounded-lg bg-deepBlue/[0.06]" />)}</div>
      : error ?
        <p role="alert" className="text-[12px] font-bold text-red-600">تعذّر تحميل الاقتراحات.</p>
      : data && data.candidates.length === 0 ?
        <p className="text-[12px] font-semibold text-deepBlue/55">{data.message ?? 'لا يوجد موظفون مؤهلون.'}</p>
      : data ?
        <>
          <ul className="space-y-1.5">
            {data.candidates.map((c) => (
              <li key={c.id} className={cn('flex items-center gap-2 rounded-xl border px-3 py-2', c.recommended ? 'border-customBlue/40 bg-customBlue/[0.05]' : 'border-deepBlue/[0.07]')} data-testid="assignment-candidate">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-black text-deepBlue">
                    {c.name}
                    {c.isCurrent ? <span className="ms-1.5 text-[10px] font-bold text-deepBlue/50">(المكلف الحالي)</span> : null}
                  </p>
                  <p className="text-[11px] font-semibold text-deepBlue/50">
                    {c.openTickets === 0 ? 'لا تذاكر مفتوحة' : `${c.openTickets} تذكرة مفتوحة`}
                    {c.recommended ? <span className="ms-1.5 font-black text-customBlue">· الأقل عبئًا</span> : null}
                  </p>
                </div>
                {canAssign && !c.isCurrent ?
                  <button type="button" onClick={() => setPick({ id: c.id, name: c.name })} aria-label={`إسناد التذكرة إلى ${c.name}`} className="inline-flex items-center gap-1 rounded-lg border border-indigo-300 px-2.5 py-1.5 text-[11px] font-black text-indigo-700 hover:bg-indigo-50">
                    <UserCheck size={12} aria-hidden="true" /> إسناد
                  </button>
                : null}
              </li>
            ))}
          </ul>
          <p className="text-[11px] font-semibold leading-relaxed text-deepBlue/45">{data.basis}</p>
          {!canAssign ? <p className="text-[11px] font-semibold text-deepBlue/45">يُحدَّد المكلف عند اعتماد التذكرة.</p> : null}
        </>
      : null}

      <ConfirmDialog
        open={pick !== null}
        title="إسناد التذكرة"
        description={pick ? `سيُسنَد التذكرة إلى ${pick.name} ويُطلب منه قبول المهمة. هل تريد المتابعة؟` : ''}
        confirmLabel={busy ? 'جارٍ الإسناد…' : 'إسناد'}
        cancelLabel="إلغاء"
        variant="primary"
        onConfirm={() => void assign()}
        onCancel={() => setPick(null)}
      />
      {busy ? <Loader2 size={14} className="animate-spin text-customBlue" aria-hidden="true" /> : null}
    </section>
  )
}
