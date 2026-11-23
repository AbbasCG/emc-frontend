import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { CenteredModal } from '@/components/ui/CenteredModal'
import TaskEstimateFields from '@/components/operations/TaskEstimateFields'
import { useEstimateDraft } from '@/hooks/useEstimateDraft'
import { apiMessage } from '@/services/ticketOpsService'
import { emptyEstimate, type EstimateDraft, type EstimatePayload } from '@/lib/taskEstimate'

/**
 * A small dialog that collects the ticket's work estimate (size, points, approximate duration) and hands it to
 * `onSubmit`. One scroll area in the body, header and the action footer always visible, Escape / focus trap from
 * the shared modal. Used wherever only the estimate is missing: «تعديل النقاط والمدة», the quick assign from the
 * suggestions, and the bulk reassign.
 *
 * `onSubmit` does the request. If it throws, a 422 on `task_points / task_scope / estimated_hours` is shown under
 * the matching field and anything else becomes a visible message; the dialog stays open either way.
 */
export function TicketEstimateDialog({
  title,
  description,
  initial,
  legacy = false,
  submitLabel,
  busyLabel = 'جارٍ الحفظ...',
  extra,
  clearable = false,
  testId = 'ticket-estimate-dialog',
  onSubmit,
  onClose,
}: {
  title: string
  description?: ReactNode
  /** Existing values; omit (or pass an empty draft) for a ticket that has none: nothing is invented. */
  initial?: EstimateDraft
  /** The ticket predates the estimate: say why the fields are empty. */
  legacy?: boolean
  submitLabel: string
  busyLabel?: string
  /** Extra read-only context above the fields (who the ticket goes to, how many tickets). */
  extra?: ReactNode
  /** Only the dedicated edit may CLEAR stored hours (sends an explicit null when the field was emptied). */
  clearable?: boolean
  testId?: string
  onSubmit: (estimate: EstimatePayload) => Promise<void>
  onClose: () => void
}) {
  const formId = useId()
  const { draft, setDraft, errors, check, fromServer, payload } = useEstimateDraft(initial ?? emptyEstimate())
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const pristine = JSON.stringify(draft) === JSON.stringify(initial ?? emptyEstimate())

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setFailure(null)
    if (!check(true)) return
    setBusy(true)
    try {
      await onSubmit(payload({ clearHours: clearable && (initial?.duration.trim() ?? '') !== '' }))
    } catch (err) {
      if (!fromServer(err)) setFailure(apiMessage(err, 'تعذّر الحفظ. حاول مرة أخرى.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <CenteredModal
      open
      onClose={onClose}
      size="md"
      testId={testId}
      busy={busy}
      dirty={!pristine}
      title={title}
      subtitle={typeof description === 'string' ? description : undefined}
      footer={(requestClose) => (
        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={requestClose} disabled={busy} className="rounded-xl border px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            إلغاء
          </button>
          <button
            type="submit"
            form={formId}
            disabled={busy}
            className="rounded-xl bg-customBlue px-6 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {busy ? busyLabel : submitLabel}
          </button>
        </div>
      )}
    >
      <form id={formId} onSubmit={submit} noValidate className="space-y-4 text-right">
        {typeof description === 'string' ? null : description}
        {extra}
        <TaskEstimateFields value={draft} onChange={setDraft} errors={errors} idPrefix={formId} legacy={legacy} disabled={busy} />
        {failure ? (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">
            {failure}
          </p>
        ) : null}
      </form>
    </CenteredModal>
  )
}

export default TicketEstimateDialog
