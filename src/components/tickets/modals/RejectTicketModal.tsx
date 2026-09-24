import { useState } from 'react';
import { ticketService } from '@/services/ticketService';
import toast from '@/lib/toast';

export interface RejectTicketModalProps {
  ticketId: number;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Admin rejection of a PENDING_APPROVAL ticket. Reuses the SAME
 * POST /v1/tickets/{id}/reject operation the Admin table has always used —
 * the mandatory reason requirement is a backend rule (min 5 characters),
 * preserved here exactly, not merely mirrored in the UI.
 *
 * Shared between TechAdminDashboardPage and TicketDetailPage.
 */
export function RejectTicketModal({ ticketId, onClose, onSuccess }: RejectTicketModalProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleReject = async () => {
    if (!reason.trim()) {
      toast.error('سبب الرفض إجباري ولا يمكن تجاوزه');
      return;
    }
    setSubmitting(true);
    try {
      await ticketService.rejectByAdmin(ticketId, reason.trim());
      toast.success('تم رفض التذكرة وإشعار المُدخل بالسبب');
      onSuccess();
    } catch {
      toast.error('حدث خطأ أثناء الرفض');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-5" dir="rtl">
        <h2 className="text-lg font-extrabold text-slate-900">❌ رفض التذكرة الإداري</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          سيتم إشعار مُدخل الطلب بقرار الرفض وسببه فوراً. <strong className="text-rose-600">سبب الرفض إجباري</strong> ولا يمكن الإغلاق بدونه.
        </p>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            سبب الرفض الإداري <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="اكتب سبباً واضحاً ومفصلاً للرفض..."
            className={`w-full rounded-xl border p-3 text-sm focus:ring-2 outline-none resize-none ${
              reason.trim().length === 0
                ? 'border-rose-300 focus:ring-rose-400'
                : 'border-slate-300 focus:ring-blue-500'
            }`}
          />
          {reason.trim().length === 0 && (
            <p className="text-[11px] text-rose-500 mt-1">⚠️ لا يمكن حفظ الرفض بدون سبب</p>
          )}
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleReject}
            disabled={submitting || !reason.trim()}
            className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold transition disabled:opacity-60"
          >
            {submitting ? 'جاري الرفض...' : '❌ تأكيد الرفض'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RejectTicketModal;
