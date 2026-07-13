import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Clock, BookOpen, RefreshCw, FileText } from "lucide-react";
import { programFinanceApi } from "@/api/programFinanceApi";
import type { FinanceApprovalItem, FinanceApprovalSummary } from "@/api/programFinanceApi";
import { formatFinanceDateTime } from '@/utils/financeDateFormatters'
import { formatFinanceCurrency } from '@/utils/financeFormatters'
import toast from "react-hot-toast";

type StatusFilter = "pending" | "approved" | "rejected" | "all";

const STATUS_META = {
  pending:  { label: "بانتظار المراجعة", color: "text-amber-600",   bg: "bg-amber-50 border-amber-200",     icon: Clock },
  approved: { label: "معتمد",            color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle },
  rejected: { label: "مرفوض",            color: "text-red-600",     bg: "bg-red-50 border-red-200",         icon: XCircle },
} as const;

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status as keyof typeof STATUS_META];
  if (!meta) return null;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${meta.bg} ${meta.color}`}>
      <Icon className="w-3.5 h-3.5" />
      {meta.label}
    </span>
  );
}

function ApproveModal({ item, onClose, onConfirm }: {
  item: FinanceApprovalItem; onClose: () => void; onConfirm: (note?: string) => void;
}) {
  const [note, setNote] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" dir="rtl">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">اعتماد البرنامج مالياً</h3>
            <p className="text-sm text-gray-500">{item.program?.title}</p>
          </div>
        </div>
        <div className="mb-4 p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-sm text-emerald-700">
          السعر: <strong dir="ltr">{formatFinanceCurrency(item.price_snapshot, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
        </div>
        <textarea value={note} onChange={e => setNote(e.target.value)}
          placeholder="ملاحظة (اختياري)" rows={3}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        <div className="flex gap-2 mt-4">
          <button onClick={() => onConfirm(note || undefined)}
            className="flex-1 bg-emerald-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-emerald-700 transition-colors">
            تأكيد الاعتماد
          </button>
          <button onClick={onClose}
            className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            إلغاء
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function RejectModal({ item, onClose, onConfirm }: {
  item: FinanceApprovalItem; onClose: () => void; onConfirm: (reason: string, note?: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" dir="rtl">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">رفض البرنامج مالياً</h3>
            <p className="text-sm text-gray-500">{item.program?.title}</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">سبب الرفض <span className="text-red-500">*</span></label>
            <textarea value={reason} onChange={e => setReason(e.target.value)}
              placeholder="اكتب سبب الرفض..." rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">ملاحظة إضافية (اختياري)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder="ملاحظة..." rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={() => reason.trim() && onConfirm(reason.trim(), note || undefined)}
            disabled={!reason.trim()}
            className="flex-1 bg-red-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-red-700 disabled:opacity-40 transition-colors">
            تأكيد الرفض
          </button>
          <button onClick={onClose}
            className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            إلغاء
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function ProgramApprovalsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [items, setItems] = useState<FinanceApprovalItem[]>([]);
  const [summary, setSummary] = useState<FinanceApprovalSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [approveItem, setApproveItem] = useState<FinanceApprovalItem | null>(null);
  const [rejectItem, setRejectItem] = useState<FinanceApprovalItem | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await programFinanceApi.list({ status: statusFilter, per_page: 50 });
      setItems(res.data.data);
      setSummary(res.data.summary);
    } catch {
      toast.error("تعذر تحميل البيانات");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { void load(); }, [load]);

  const handleApprove = async (id: number, note?: string) => {
    try {
      await programFinanceApi.approve(id, note);
      toast.success("تم اعتماد البرنامج مالياً");
      setApproveItem(null);
      void load();
    } catch { toast.error("حدث خطأ أثناء الاعتماد"); }
  };

  const handleReject = async (id: number, reason: string, note?: string) => {
    try {
      await programFinanceApi.reject(id, reason, note);
      toast.success("تم رفض البرنامج");
      setRejectItem(null);
      void load();
    } catch { toast.error("حدث خطأ أثناء الرفض"); }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">مراجعة البرامج المدفوعة</h1>
          <p className="text-sm text-gray-500 mt-1">اعتماد أو رفض البرامج المدفوعة قبل نشرها</p>
        </div>
        <button onClick={() => void load()}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          <RefreshCw className="w-4 h-4" /> تحديث
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {([
            { key: "pending"  as const, label: "بانتظار المراجعة", value: summary.pending },
            { key: "approved" as const, label: "معتمدة",            value: summary.approved },
            { key: "rejected" as const, label: "مرفوضة",            value: summary.rejected },
          ]).map(k => (
            <div key={k.key} onClick={() => setStatusFilter(k.key)}
              className={`bg-white rounded-2xl border p-4 shadow-sm cursor-pointer transition-all hover:shadow-md ${statusFilter === k.key ? "ring-2 ring-offset-1 ring-blue-400" : ""}`}>
              <p className="text-2xl font-bold text-gray-900">{k.value}</p>
              <p className="text-sm text-gray-500 mt-1">{k.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        {(["pending", "approved", "rejected", "all"] as StatusFilter[]).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${statusFilter === s ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            {s === "all" ? "الكل" : STATUS_META[s as keyof typeof STATUS_META]?.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-gray-400">جارٍ التحميل...</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
            <FileText className="w-8 h-8" /><p>لا توجد طلبات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">البرنامج</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">النوع</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">السعر</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">المقدِّم</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">تاريخ الإرسال</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">الحالة</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <AnimatePresence>
                  {items.map((item: FinanceApprovalItem) => (
                    <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <BookOpen className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 line-clamp-1">{item.program?.title ?? "—"}</p>
                            {item.rejection_reason && <p className="text-xs text-red-500 mt-0.5 line-clamp-1">{item.rejection_reason}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{item.approvable_type === "Course" ? "دورة" : "مسار تعليمي"}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-700" dir="ltr">
                          {formatFinanceCurrency(item.price_snapshot ?? item.program?.price, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{item.submitter?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs"><FinanceDate value={item.submitted_at} showTime /></td>
                      <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                      <td className="px-4 py-3">
                        {item.status === "pending" && (
                          <div className="flex items-center gap-2">
                            <button onClick={() => setApproveItem(item)} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors">اعتماد</button>
                            <button onClick={() => setRejectItem(item)} className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors">رفض</button>
                          </div>
                        )}
                        {item.status !== "pending" && item.reviewed_at && (
                          <FinanceDate value={item.reviewed_at} showTime />
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {approveItem && (
        <ApproveModal item={approveItem} onClose={() => setApproveItem(null)}
          onConfirm={note => void handleApprove(approveItem.id, note)} />
      )}
      {rejectItem && (
        <RejectModal item={rejectItem} onClose={() => setRejectItem(null)}
          onConfirm={(reason, note) => void handleReject(rejectItem.id, reason, note)} />
      )}
    </div>
  );
}
