import { useState } from 'react';
import { CheckCircle2, PlayCircle, RotateCcw, ThumbsDown, UserPlus } from 'lucide-react';
import type { Ticket } from '@/types/ticket';
import { ticketService } from '@/services/ticketService';
import { ApproveTicketModal } from '@/components/tickets/modals/ApproveTicketModal';
import { RejectTicketModal } from '@/components/tickets/modals/RejectTicketModal';
import { ReassignTicketModal } from '@/components/tickets/modals/ReassignTicketModal';
import { RejectTaskModal } from '@/components/tickets/modals/RejectTaskModal';
import { CompleteTaskModal } from '@/components/tickets/modals/CompleteTaskModal';
import ConfirmDialog from '@/components/feedback/ConfirmDialog';
import toast from '@/lib/toast';

type ModalKind = 'approve' | 'reject' | 'reassign' | 'reject_task' | 'complete_task' | null;

export interface TicketActionCenterProps {
  ticket: Ticket;
  /** Called after any action succeeds — the caller re-fetches the canonical ticket. */
  onChanged: () => void;
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
export function TicketActionCenter({ ticket, onChanged }: TicketActionCenterProps) {
  const [modal, setModal] = useState<ModalKind>(null);
  const [acceptConfirmOpen, setAcceptConfirmOpen] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const caps = ticket.capabilities;
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
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3" data-testid="ticket-action-center">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">إجراءات التذكرة</h3>

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
