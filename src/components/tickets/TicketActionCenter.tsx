import { useEffect, useRef, useState } from 'react';
import { CalendarClock, CheckCircle2, PlayCircle, RotateCcw, ThumbsDown, UserCheck, UserPlus } from 'lucide-react';
import type { Ticket } from '@/types/ticket';
import { ticketService } from '@/services/ticketService';
import { ApproveTicketModal } from '@/components/tickets/modals/ApproveTicketModal';
import { RejectTicketModal } from '@/components/tickets/modals/RejectTicketModal';
import { ReassignTicketModal } from '@/components/tickets/modals/ReassignTicketModal';
import { RejectTaskModal } from '@/components/tickets/modals/RejectTaskModal';
import { CompleteTaskModal } from '@/components/tickets/modals/CompleteTaskModal';
import ConfirmDialog from '@/components/feedback/ConfirmDialog';
import { NestedLayer } from '@/components/ui/NestedLayer';
import { PriorityPill } from '@/components/tickets/ops/TicketBadges';
import { formatDateTime } from '@/components/tickets/ops/ticketOpsUi';
import { cn } from '@/lib/utils';
import toast from '@/lib/toast';

type ModalKind = 'approve' | 'reject' | 'reassign' | 'reject_task' | 'complete_task' | null;

export interface TicketActionCenterProps {
  ticket: Ticket;
  /** Called after any action succeeds — the caller re-fetches the canonical ticket. */
  onChanged: () => void;
  /**
   * Opened from the "ticket assigned to you" email / notification
   * (`?review=assigned`): the card scrolls into view and is highlighted so the
   * assignee lands on accept / decline. Purely presentational — what is shown
   * is still decided by `ticket.capabilities`.
   */
  reviewMode?: boolean;
  /**
   * The signed-in user's id. `accept_task` is also true for global roles on
   * anyone's ticket, so the "assigned to you" panel additionally requires the
   * viewer to be the actual assignee.
   */
  currentUserId?: number | null;
}

/**
 * إجراءات التذكرة — the context-sensitive action area for Ticket Detail.
 *
 * Every button here is gated on `ticket.capabilities`, the server-computed,
 * canonical action set (TicketController::buildCapabilities()) — never on a
 * locally re-derived role/status check. If the backend says an action isn't
 * available, it isn't rendered; if it IS rendered, the same backend guard
 * still re-checks it on submit, so a stale capability snapshot can never
 * grant more than the server actually allows.
 *
 * Every mutation reuses the EXACT SAME ticketService call / modal the Admin
 * table (or, for accept/reject-task/complete-task, the same backend endpoint
 * AssigneeWorkspacePage already calls) uses — no second workflow engine.
 */
export function TicketActionCenter({ ticket, onChanged, reviewMode = false, currentUserId = null }: TicketActionCenterProps) {
  const [modal, setModal] = useState<ModalKind>(null);
  const [acceptConfirmOpen, setAcceptConfirmOpen] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const caps = ticket.capabilities;
  // The assignee still has to answer: accept, or decline with a reason.
  const assigneeId = ticket.assignee?.id ?? ticket.assigned_to_id ?? null;
  const awaitingAssigneeReply =
    Boolean(caps?.accept_task) && currentUserId != null && assigneeId != null && Number(assigneeId) === Number(currentUserId);
  const highlight = reviewMode && awaitingAssigneeReply;

  useEffect(() => {
    if (highlight) cardRef.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  }, [highlight]);
  if (!caps) return null;

  const close = () => setModal(null);
  const handleSuccess = () => {
    close();
    onChanged();
  };

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await ticketService.acceptTask(ticket.id);
      toast.success('تم قبول التكليف — التذكرة الآن قيد تنفيذك');
      setAcceptConfirmOpen(false);
      onChanged();
    } catch {
      toast.error('حدث خطأ أثناء قبول التكليف');
    } finally {
      setAccepting(false);
    }
  };

  const hasAnyActionCapability =
    caps.approve || caps.reject || caps.reassign || caps.accept_task || caps.reject_task || caps.complete_task;

  if (!hasAnyActionCapability) return null;

  // "تعيين" the first time (no assignee yet) vs "إعادة التوجيه" once one
  // exists — one capability (`reassign`), two labels, purely presentational.
  const reassignLabel = ticket.assignee ? 'إعادة التوجيه' : 'تعيين عضو';
  const reassignIcon = ticket.assignee ? <RotateCcw className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />;

  return (
    <div
      ref={cardRef}
      className={cn(
        'bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 scroll-mt-6',
        highlight && 'border-blue-300 ring-2 ring-blue-200',
      )}
      data-testid="ticket-action-center"
      data-review-mode={highlight ? 'true' : undefined}
    >
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">إجراءات التذكرة</h3>

      {awaitingAssigneeReply && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 space-y-2" data-testid="assignment-review-panel">
          <div className="flex items-start gap-2.5 text-blue-900">
            <UserCheck className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1 min-w-0">
              <p className="text-sm font-extrabold">أُسندت إليك هذه التذكرة وهي بانتظار ردّك</p>
              <p className="text-xs leading-6 text-blue-800">
                راجع الوصف والمرفقات أدناه، ثم اضغط «بدء المعالجة» إن كانت ضمن اختصاصك،
                أو «اعتذار عن الاستلام» مع ذكر السبب ليُعاد توجيهها.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pr-7">
            <PriorityPill priority={ticket.priority} />
            {ticket.expected_resolution_time && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800">
                <CalendarClock className="w-3.5 h-3.5" aria-hidden="true" />
                الموعد النهائي: {formatDateTime(ticket.expected_resolution_time)}
              </span>
            )}
          </div>
        </div>
      )}

      {ticket.status === 'PENDING_APPROVAL' && (caps.approve || caps.reject) && (
        <p className="text-xs text-slate-500">تحتاج هذه التذكرة إلى قرار قبل بدء المعالجة.</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {caps.approve && (
          <button
            type="button"
            onClick={() => setModal('approve')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition"
          >
            <CheckCircle2 className="w-4 h-4" />
            اعتماد
          </button>
        )}

        {caps.accept_task && (
          <button
            type="button"
            onClick={() => setAcceptConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition"
          >
            <PlayCircle className="w-4 h-4" />
            بدء المعالجة
          </button>
        )}

        {caps.complete_task && (
          <button
            type="button"
            onClick={() => setModal('complete_task')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition"
          >
            <CheckCircle2 className="w-4 h-4" />
            تم الحل
          </button>
        )}

        {caps.reassign && (
          <button
            type="button"
            onClick={() => setModal('reassign')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-indigo-300 text-indigo-700 hover:bg-indigo-50 text-xs font-bold transition"
          >
            {reassignIcon}
            {reassignLabel}
          </button>
        )}

        {caps.reject_task && (
          <button
            type="button"
            onClick={() => setModal('reject_task')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-bold transition"
          >
            <ThumbsDown className="w-4 h-4" />
            اعتذار عن الاستلام
          </button>
        )}

        {caps.reject && (
          <button
            type="button"
            onClick={() => setModal('reject')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-rose-300 text-rose-600 hover:bg-rose-50 text-xs font-bold transition"
          >
            رفض
          </button>
        )}
      </div>

      {modal !== null ?
      <NestedLayer>
      {modal === 'approve' && (
        <ApproveTicketModal
          ticketId={ticket.id}
          departmentId={ticket.department_id}
          onClose={close}
          onSuccess={handleSuccess}
        />
      )}
      {modal === 'reject' && (
        <RejectTicketModal ticketId={ticket.id} onClose={close} onSuccess={handleSuccess} />
      )}
      {modal === 'reassign' && (
        <ReassignTicketModal
          ticketId={ticket.id}
          departmentId={ticket.department_id}
          currentUnitId={ticket.unit_id}
          onClose={close}
          onSuccess={handleSuccess}
        />
      )}
      {modal === 'reject_task' && (
        <RejectTaskModal ticketId={ticket.id} onClose={close} onSuccess={handleSuccess} />
      )}
      {modal === 'complete_task' && (
        <CompleteTaskModal ticketId={ticket.id} onClose={close} onSuccess={handleSuccess} />
      )}
      </NestedLayer>
      : null}

      <ConfirmDialog
        open={acceptConfirmOpen}
        title="بدء معالجة التذكرة"
        description="سيتم قبول التكليف وبدء عداد التنفيذ. هل تريد المتابعة؟"
        confirmLabel={accepting ? 'جارٍ البدء...' : 'بدء المعالجة'}
        cancelLabel="إلغاء"
        variant="primary"
        onConfirm={handleAccept}
        onCancel={() => setAcceptConfirmOpen(false)}
      />
    </div>
  );
}

export default TicketActionCenter;
