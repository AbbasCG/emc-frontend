import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Clock, BookOpen, RefreshCw, FileText, Pencil, PlusCircle, ArrowLeft, Route } from "lucide-react";
import { programFinanceApi } from "@/api/programFinanceApi";
import type { FinanceApprovalItem, FinanceApprovalSummary, FinanceChangeSet } from "@/api/programFinanceApi";
import FinanceDate from '@/components/finance/FinanceDate'
import { formatFinanceCurrency } from '@/utils/financeFormatters'
import toast from "react-hot-toast";

type StatusFilter = "pending" | "approved" | "rejected" | "all";
type TypeFilter = "all" | "Course" | "LearningPath";

const STATUS_META = {
  pending:  { label: "بانتظار المراجعة", color: "text-amber-600",   bg: "bg-amber-50 border-amber-200",     icon: Clock },
  approved: { label: "معتمد",            color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle },
  rejected: { label: "مرفوض",            color: "text-red-600",     bg: "bg-red-50 border-red-200",         icon: XCircle },
} as const;

const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
  { key: "all",          label: "الكل" },
  { key: "Course",       label: "الدورات" },
  { key: "LearningPath", label: "المسارات التعليمية" },
];

/** Arabic labels for the finance-relevant fields the backend can send in a diff. */
const FIELD_LABELS: Record<string, string> = {
  price:           "السعر",
  discount_price:  "السعر بعد الخصم",
  currency:        "العملة",
  type:            "نوع الدورة",
  is_paid:         "مدفوعة",
  is_free:         "مجانية",
  pricing_options: "خيارات التسعير",
  course_ids:      "الدورات",
};

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

/**
 * A reviewer approving a change to an already-live program needs to know it IS
 * a change, not a new program — the two need very different scrutiny.
 */
function RequestTypeBadge({ type, entity }: { type: string; entity: string }) {
  const isUpdate = type === "update";
  const entityLabel = entity === "Course" ? "دورة" : "مسار تعليمي";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
        isUpdate
          ? "bg-violet-50 border-violet-200 text-violet-700"
          : "bg-sky-50 border-sky-200 text-sky-700"
      }`}
    >
      {isUpdate ? <Pencil className="w-3.5 h-3.5" /> : <PlusCircle className="w-3.5 h-3.5" />}
      {isUpdate ? `تعديل ${entityLabel} معتمد` : `إنشاء ${entityLabel}`}
    </span>
  );
}

function formatChangeValue(field: string, value: FinanceChangeSet[string]["from"]): string {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) return value.length ? `${value.length} دورة` : "لا يوجد";
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  if (field === "price" || field === "discount_price") {
    return formatFinanceCurrency(Number(value), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (field === "type") return value === "paid" ? "مدفوعة" : "مجانية";
  return String(value);
}

/**
 * Before/after for every changed field, so Finance approves a specific,
 * visible delta instead of a bare "the program changed".
 */
function ChangesDiff({ changes }: { changes: FinanceChangeSet }) {
  const entries = Object.entries(changes);
  if (!entries.length) return null;

  return (
    <div className="mt-2 space-y-1.5" data-testid="finance-changes-diff">
      {entries.map(([field, change]) => {
        const isCourses = field === "course_ids";
        const before = Array.isArray(change.from) ? change.from : [];
        const after = Array.isArray(change.to) ? change.to : [];
        const added = isCourses ? after.filter((id) => !before.includes(id)) : [];
        const removed = isCourses ? before.filter((id) => !after.includes(id)) : [];

        return (
          <div key={field} className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-medium text-gray-600">{FIELD_LABELS[field] ?? field}</span>
            {isCourses ? (
              <span className="flex flex-wrap items-center gap-1.5">
                {added.length > 0 && (
                  <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-emerald-700">
                    + {added.length} دورة
                  </span>
                )}
                {removed.length > 0 && (
                  <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-red-700">
                    − {removed.length} دورة
                  </span>
                )}
                {added.length === 0 && removed.length === 0 && (
                  <span className="text-gray-400">تغيير في الترتيب</span>
                )}
              </span>
            ) : (
              <span className="flex items-center gap-1.5" dir="ltr">
                <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-gray-500 line-through">
                  {formatChangeValue(field, change.from)}
                </span>
                <ArrowLeft className="w-3 h-3 text-gray-400" />
                <span className="rounded-md bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-800">
                  {formatChangeValue(field, change.to)}
                </span>
              </span>
            )}
          </div>
        );
      })}
    </div>
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

        {/* For an edit, the decision is about the delta — show it at the point
            of approval, not just in the list. */}
        {item.request_type === "update" && item.changes && (
          <div className="mb-4 p-3 bg-violet-50 rounded-xl border border-violet-100">
            <p className="text-xs font-semibold text-violet-800 mb-1.5">التغييرات المطلوب اعتمادها</p>
            <ChangesDiff changes={item.changes} />
          </div>
        )}
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
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [items, setItems] = useState<FinanceApprovalItem[]>([]);
  const [summary, setSummary] = useState<FinanceApprovalSummary | null>(null);
  // Starts loading — the effect below fetches on mount unconditionally.
  const [isLoading, setIsLoading] = useState(true);
  const [approveItem, setApproveItem] = useState<FinanceApprovalItem | null>(null);
  const [rejectItem, setRejectItem] = useState<FinanceApprovalItem | null>(null);

  // Re-arm the loading state during render when the filter changes (react.dev
  // "adjusting state when a prop changes") instead of from the effect below.
  const [seenStatusFilter, setSeenStatusFilter] = useState<StatusFilter>(statusFilter);
  const [seenTypeFilter, setSeenTypeFilter] = useState<TypeFilter>(typeFilter);
  if (seenStatusFilter !== statusFilter || seenTypeFilter !== typeFilter) {
    setSeenStatusFilter(statusFilter);
    setSeenTypeFilter(typeFilter);
    setIsLoading(true);
  }

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await programFinanceApi.list({
          status: statusFilter,
          per_page: 50,
          ...(typeFilter !== "all" ? { approvable_type: typeFilter } : {}),
        });
        if (!alive) return;
        setItems(res.data.data);
        setSummary(res.data.summary);
      } catch {
        if (alive) toast.error("تعذر تحميل البيانات");
      } finally {
        if (alive) setIsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [statusFilter, typeFilter]);

  /** Imperative refresh from an event handler — outside any effect, so the
   *  synchronous loading flip is allowed. */
  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await programFinanceApi.list({
        status: statusFilter,
        per_page: 50,
        ...(typeFilter !== "all" ? { approvable_type: typeFilter } : {}),
      });
      setItems(res.data.data);
      setSummary(res.data.summary);
    } catch {
      toast.error("تعذر تحميل البيانات");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, typeFilter]);

  const handleApprove = async (id: number, note?: string) => {
    try {
      await programFinanceApi.approve(id, note);
      toast.success("تم اعتماد البرنامج مالياً");
      setApproveItem(null);
      void load();
    } catch (e) {
      // 409 = the program was edited again after this request was raised, so
      // the backend refused to let us approve a version we never saw. Reload
      // so the reviewer is looking at the current proposal.
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        toast.error("تم تعديل البرنامج بعد إرسال الطلب. تم تحديث القائمة، يرجى مراجعة النسخة الحالية.");
        setApproveItem(null);
        void load();
        return;
      }
      toast.error("حدث خطأ أثناء الاعتماد");
    }
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

      <div className="flex gap-2 mb-3 flex-wrap">
        {(["pending", "approved", "rejected", "all"] as StatusFilter[]).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${statusFilter === s ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            {s === "all" ? "الكل" : STATUS_META[s as keyof typeof STATUS_META]?.label}
          </button>
        ))}
      </div>

      {/* Entity filter — the list has always mixed courses and paths; the API
          supported filtering by type but the UI never offered it. */}
      <div className="flex gap-2 mb-4 flex-wrap" data-testid="finance-type-filters">
        {TYPE_FILTERS.map(t => (
          <button key={t.key} onClick={() => setTypeFilter(t.key)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${typeFilter === t.key ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
            {t.label}
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
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">نوع الطلب</th>
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
                        <div className="flex items-start gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            {item.approvable_type === "Course"
                              ? <BookOpen className="w-4 h-4 text-blue-600" />
                              : <Route className="w-4 h-4 text-blue-600" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 line-clamp-1">{item.program?.title ?? "—"}</p>
                            {item.rejection_reason && <p className="text-xs text-red-500 mt-0.5 line-clamp-1">{item.rejection_reason}</p>}
                            {item.changes && <ChangesDiff changes={item.changes} />}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{item.approvable_type === "Course" ? "دورة" : "مسار تعليمي"}</td>
                      <td className="px-4 py-3">
                        <RequestTypeBadge type={item.request_type} entity={item.approvable_type} />
                      </td>
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
