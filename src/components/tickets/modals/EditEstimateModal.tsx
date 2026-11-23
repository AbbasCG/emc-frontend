import { ticketService } from '@/services/ticketService'
import { TicketEstimateDialog } from '@/components/tickets/modals/TicketEstimateDialog'
import { estimateFromRecord, isLegacyRecord, TICKET_ESTIMATE_NOTE } from '@/lib/taskEstimate'
import toast from '@/lib/toast'

export interface EditEstimateModalProps {
  ticketId: number
  /** What the ticket has now. Missing values stay missing: a legacy ticket opens empty, with a note. */
  current: { task_scope?: string | null; task_points?: number | null; estimated_hours?: number | null }
  /** Whether the ticket requires live deployment (the switch's starting value). */
  requiresDeployment?: boolean
  /** The server's `can_edit_estimate` is false: the switch is shown disabled with the reason. */
  deploymentFrozen?: boolean
  /** Why it is frozen (stage, or the manager is the assignee). */
  deploymentFrozenMessage?: string
  /** Already submitted for review: the flag cannot be switched off any more. */
  deploymentLocked?: boolean
  onClose: () => void
  onSuccess: () => void
}

/**
 * «تعديل النقاط والمدة»: PATCH /v1/tickets/{id}/work-estimate. Offered only when the server says
 * `capabilities.can_edit_estimate`; the server checks it again on save.
 */
export function EditEstimateModal({ ticketId, current, requiresDeployment = false, deploymentFrozen = false, deploymentFrozenMessage, deploymentLocked = false, onClose, onSuccess }: EditEstimateModalProps) {
  const legacy = isLegacyRecord(current)

  return (
    <TicketEstimateDialog
      title="تعديل النقاط والمدة"
      description={`تحدّد حجم العمل المطلوب في هذه التذكرة. ${TICKET_ESTIMATE_NOTE}`}
      initial={estimateFromRecord(current)}
      legacy={legacy}
      submitLabel="حفظ النقاط والمدة"
      clearable
      testId="edit-estimate-modal"
      deployment={{ initial: requiresDeployment, frozen: deploymentFrozen, frozenMessage: deploymentFrozenMessage, locked: deploymentLocked }}
      onSubmit={async (estimate, deploy) => {
        await ticketService.updateWorkEstimate(ticketId, { ...estimate, ...(deploy === undefined ? {} : { requires_deployment: deploy }) })
        toast.success('تم تحديث النقاط والمدة')
        onSuccess()
      }}
      onClose={onClose}
    />
  )
}

export default EditEstimateModal
