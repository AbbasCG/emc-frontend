import { useState } from 'react';
import { UploadCloud, X } from 'lucide-react';
import { ticketService } from '@/services/ticketService';
import toast from '@/lib/toast';

export interface CompleteTaskModalProps {
  ticketId: number;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Assignee closes an IN_PROGRESS task as Resolved or Unresolved. Reuses the
 * SAME POST /v1/tickets/{id}/complete-task operation.
 *
 * The proof-file picker's accept="image/*,video/*" is preserved EXACTLY as it
 * already exists elsewhere in the product (AssigneeWorkspacePage) — video is
 * still accepted here by backend validation. This is a pre-existing gap in
 * the ticket attachment hardening work (which only covers the INITIAL
 * submission's attachments.* field, not this endpoint's separate proof_files.*
 * field) and is out of scope for this change; it is not silently widened or
 * narrowed here.
 *
 * The request field is `resolution_type` — matching TicketController::
 * completeTask()'s actual validator exactly.
 */
export function CompleteTaskModal({ ticketId, onClose, onSuccess }: CompleteTaskModalProps) {
  const [status, setStatus] = useState<'RESOLVED' | 'UNRESOLVED'>('RESOLVED');
  const [summary, setSummary] = useState('');
  const [unresolvedReason, setUnresolvedReason] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleComplete = async () => {
    if (status === 'RESOLVED' && !summary.trim()) {
      toast.error('يجب توضيح ما تم بالتفصيل لإغلاق التذكرة كـ «تم الحل»');
      return;
    }
    if (status === 'UNRESOLVED' && !unresolvedReason.trim()) {
      toast.error('يجب توضيح أسباب تعذر الحل والعوائق الفنية');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('resolution_type', status);
      if (status === 'RESOLVED') {
        formData.append('resolution_summary', summary.trim());
        files.forEach((f) => formData.append('proof_files[]', f));
      } else {
        formData.append('unresolved_reason', unresolvedReason.trim());
      }
      await ticketService.completeTask(ticketId, formData);
      toast.success(status === 'RESOLVED' ? 'تم إغلاق التذكرة — أحسنت!' : 'تم رفع تقرير تعذر الحل للإدارة العليا');
      onSuccess();
    } catch {
      toast.error('حدث خطأ أثناء حفظ نتيجة المهمة');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 space-y-5 max-h-[90vh] overflow-y-auto" dir="rtl">
        <h2 className="text-lg font-extrabold text-slate-900">إغلاق المهمة</h2>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setStatus('RESOLVED')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition ${
              status === 'RESOLVED'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            🎯 تم الحل (Resolved)
          </button>
          <button
            type="button"
            onClick={() => setStatus('UNRESOLVED')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition ${
              status === 'UNRESOLVED'
                ? 'border-orange-500 bg-orange-50 text-orange-700'
                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            ⚠️ تعذر الحل
          </button>
        </div>

        {status === 'RESOLVED' ? (
          <>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ما الذي تم بالتفصيل لحل المشكلة؟ <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="اشرح الإجراءات التقنية المتخذة والنتيجة التي تحققت..."
                className={`w-full rounded-xl border p-3 text-sm focus:ring-2 outline-none resize-none ${
                  summary.trim().length === 0 ? 'border-rose-300 focus:ring-rose-400' : 'border-slate-300 focus:ring-blue-500'
                }`}
              />
              {summary.trim().length === 0 && (
                <p className="text-[11px] text-rose-500 mt-1">⚠️ يجب ملء هذا الحقل لإغلاق التذكرة كـ تم الحل</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                رفع إثبات الحل (صورة / فيديو — اختياري)
              </label>
              <div
                className="border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl p-5 text-center cursor-pointer transition"
                onClick={() => document.getElementById('complete-task-proof-input')?.click()}
              >
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  id="complete-task-proof-input"
                  onChange={(e) => {
                    if (e.target.files) {
                      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                    }
                  }}
                />
                <UploadCloud className="w-7 h-7 text-slate-400 mx-auto mb-1" />
                <p className="text-xs text-slate-500">اضغط لرفع صورة أو فيديو إثبات</p>
              </div>
              {files.length > 0 && (
                <div className="mt-2 space-y-1">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg p-2 border border-slate-200">
                      <span className="truncate">{f.name}</span>
                      <button
                        type="button"
                        onClick={() => setFiles((prev) => prev.filter((_, fi) => fi !== i))}
                        className="text-rose-500 hover:text-rose-700 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              أسباب تعذر الحل والعوائق الفنية <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={unresolvedReason}
              onChange={(e) => setUnresolvedReason(e.target.value)}
              placeholder="وضح العوائق الفنية أو الصلاحيات اللازمة أو الجهة الأعلى التي يجب إحالتها..."
              className={`w-full rounded-xl border p-3 text-sm focus:ring-2 outline-none resize-none ${
                unresolvedReason.trim().length === 0 ? 'border-rose-300 focus:ring-rose-400' : 'border-slate-300 focus:ring-blue-500'
              }`}
            />
            {unresolvedReason.trim().length === 0 && (
              <p className="text-[11px] text-rose-500 mt-1">⚠️ يجب توثيق أسباب تعذر الحل قبل التصعيد</p>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleComplete}
            disabled={submitting}
            className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition disabled:opacity-60 ${
              status === 'RESOLVED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-600 hover:bg-orange-700'
            }`}
          >
            {submitting ? 'جارٍ الحفظ...' : status === 'RESOLVED' ? '✅ تأكيد الحل والإغلاق' : '⚠️ تأكيد تعذر الحل'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CompleteTaskModal;
