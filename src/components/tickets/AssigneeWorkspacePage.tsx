import React, { useState, useEffect, useCallback } from 'react';
import { ticketService } from '@/services/ticketService';
import { useAuth } from '@/contexts/AuthContext';
import type { Ticket, TicketStatus } from '@/types/ticket';
import TicketStatusBadge from './TicketStatusBadge';
import SlaCountdownTimer from './SlaCountdownTimer';
import {
  UserCheck,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Flag,
  MessageSquare,
  UploadCloud,
  X,
  Image as ImageIcon,
  Film,
  FileText,
  Download,
  History,
  ChevronRight,
} from 'lucide-react';
import toast from '@/lib/toast';

// ── Types ───────────────────────────────────────────────────────────────────
type ActiveModal =
  | { type: 'reject'; ticketId: number; reason: string }
  | { type: 'resolve'; ticketId: number; summary: string; files: File[]; status: 'RESOLVED' | 'UNRESOLVED'; unresolvedReason: string; internalNote: string }
  | null;

const ACTION_LABEL: Record<string, string> = {
  SUBMITTED:         'إدخال التذكرة',
  APPROVED:          'اعتمدتها الإدارة',
  ACCEPTED:          'قبلت التكليف',
  REJECTED_TASK:     'اعتذرت عن الاستلام',
  RESOLVED:          'تم الحل والإغلاق',
  MARKED_UNRESOLVED: 'تعذر الحل — تصعيد',
  REASSIGNED:        'إعادة توجيه',
  COMMENT:           'تعقيب',
  INTERNAL_NOTE:     'ملاحظة داخلية',
};

function formatDate(str: string) {
  return new Date(str).toLocaleDateString('ar-SA', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function FileTypeIcon({ type }: { type: string }) {
  if (type === 'IMAGE') return <ImageIcon className="w-4 h-4 text-blue-500" />;
  if (type === 'VIDEO') return <Film className="w-4 h-4 text-violet-500" />;
  return <FileText className="w-4 h-4 text-amber-500" />;
}

// ── Component ────────────────────────────────────────────────────────────────
const AssigneeWorkspacePage: React.FC = () => {
  const { user } = useAuth();

  const [tickets, setTickets]             = useState<Ticket[]>([]);
  const [loading, setLoading]             = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [modal, setModal]                 = useState<ActiveModal>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [internalNote, setInternalNote]   = useState('');
  const [savingNote, setSavingNote]       = useState(false);

  // Load assigned tasks for the current user
  const fetchTasks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await ticketService.getTickets({
        assigned_to_id: user.id,
        per_page: 50,
      });
      if (res.success) {
        setTickets(res.data.data ?? []);
      }
    } catch {
      toast.error('تعذر تحميل مهامك المكلف بها');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const openTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setInternalNote('');
  };

  // ── Accept task ──────────────────────────────────────────────────────────
  const handleAccept = async (ticketId: number) => {
    setActionLoading(true);
    try {
      await ticketService.acceptTask(ticketId);
      toast.success('تم قبول التكليف — التذكرة الآن قيد تنفيذك');
      fetchTasks();
      setSelectedTicket(null);
    } catch {
      toast.error('حدث خطأ أثناء قبول التكليف');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Reject task ──────────────────────────────────────────────────────────
  const handleRejectTask = async () => {
    if (modal?.type !== 'reject') return;
    if (!modal.reason.trim()) {
      toast.error('مبرر الاعتذار إجباري ولا يمكن تجاوزه');
      return;
    }
    setActionLoading(true);
    try {
      await ticketService.rejectTask(modal.ticketId, modal.reason.trim());
      toast.success('تم تسجيل اعتذارك — أُعيدت التذكرة للقيادة لإعادة التوجيه');
      setModal(null);
      fetchTasks();
      setSelectedTicket(null);
    } catch {
      toast.error('حدث خطأ أثناء تسجيل الاعتذار');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Complete task (Resolved / Unresolved) ─────────────────────────────────
  const handleComplete = async () => {
    if (modal?.type !== 'resolve') return;
    const { ticketId, status, summary, unresolvedReason, files } = modal;

    if (status === 'RESOLVED' && !summary.trim()) {
      toast.error('يجب توضيح ما تم بالتفصيل لإغلاق التذكرة كـ «تم الحل»');
      return;
    }
    if (status === 'UNRESOLVED' && !unresolvedReason.trim()) {
      toast.error('يجب توضيح أسباب تعذر الحل والعوائق الفنية');
      return;
    }

    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append('completion_status', status);
      if (status === 'RESOLVED') {
        formData.append('resolution_summary', summary.trim());
        files.forEach((f) => formData.append('proof_files[]', f));
      } else {
        formData.append('unresolved_reason', unresolvedReason.trim());
      }
      await ticketService.completeTask(ticketId, formData);
      toast.success(status === 'RESOLVED' ? 'تم إغلاق التذكرة — أحسنت!' : 'تم رفع تقرير تعذر الحل للإدارة العليا');
      setModal(null);
      fetchTasks();
      setSelectedTicket(null);
    } catch {
      toast.error('حدث خطأ أثناء حفظ نتيجة المهمة');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Internal note ─────────────────────────────────────────────────────────
  const handleSaveNote = async (ticketId: number) => {
    if (!internalNote.trim()) return;
    setSavingNote(true);
    try {
      await ticketService.addComment(ticketId, internalNote.trim(), true);
      toast.success('تم حفظ الملاحظة الداخلية');
      setInternalNote('');
    } catch {
      toast.error('تعذر حفظ الملاحظة');
    } finally {
      setSavingNote(false);
    }
  };

  // ── Derived stats ─────────────────────────────────────────────────────────
  const pendingAccept = tickets.filter((t) => t.status === 'ASSIGNED').length;
  const inProgress    = tickets.filter((t) => t.status === 'IN_PROGRESS').length;
  const closedCount   = tickets.filter((t) => ['RESOLVED', 'UNRESOLVED'].includes(t.status)).length;

  const activeTasks   = tickets.filter((t) => ['ASSIGNED', 'IN_PROGRESS'].includes(t.status));
  const closedTasks   = tickets.filter((t) => ['RESOLVED', 'UNRESOLVED', 'REJECTED_BY_ASSIGNEE'].includes(t.status));

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800" dir="rtl">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-blue-600" />
              مساحة العضو المكلف
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              مهامك الفنية المعيّنة إليك — {user?.name}
            </p>
          </div>
          <button
            onClick={fetchTasks}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            تحديث المهام
          </button>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'تنتظر قبولك',    value: pendingAccept, bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: <Clock className="w-5 h-5" /> },
            { label: 'قيد التنفيذ',     value: inProgress,   bg: 'bg-violet-50 border-violet-200', text: 'text-violet-700', icon: <Flag className="w-5 h-5" /> },
            { label: 'مُغلقة',          value: closedCount,  bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: <CheckCircle2 className="w-5 h-5" /> },
          ].map((s, i) => (
            <div key={i} className={`rounded-2xl border p-4 flex items-center gap-3 ${s.bg}`}>
              <span className={s.text}>{s.icon}</span>
              <div>
                <p className={`text-2xl font-extrabold ${s.text}`}>{s.value}</p>
                <p className="text-[11px] text-slate-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-slate-200">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400 text-sm">جاري تحميل مهامك...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Task List ── */}
            <div className="lg:col-span-1 space-y-4">
              <h2 className="text-sm font-bold text-slate-700">
                المهام النشطة ({activeTasks.length})
              </h2>

              {activeTasks.length === 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-semibold">لا مهام نشطة حالياً</p>
                </div>
              )}

              {activeTasks.map((ticket) => {
                const isSelected = selectedTicket?.id === ticket.id;
                const awaitingAccept = ticket.status === 'ASSIGNED';
                const isLate = ticket.expected_resolution_time &&
                  new Date() > new Date(ticket.expected_resolution_time) &&
                  ticket.status === 'IN_PROGRESS';

                return (
                  <div
                    key={ticket.id}
                    onClick={() => openTicket(ticket)}
                    className={`rounded-2xl border p-4 cursor-pointer transition space-y-2 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : isLate
                        ? 'border-rose-300 bg-rose-50/30 hover:bg-rose-50/60'
                        : awaitingAccept
                        ? 'border-amber-300 bg-amber-50/30 hover:bg-amber-50/60'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-[10px] font-bold text-slate-400">{ticket.ticket_number}</span>
                      <TicketStatusBadge status={ticket.status as TicketStatus} />
                    </div>
                    <p className="text-sm font-bold text-slate-800 leading-snug line-clamp-2">{ticket.title}</p>
                    {ticket.expected_resolution_time && (
                      <SlaCountdownTimer
                        expectedTime={ticket.expected_resolution_time}
                        status={ticket.status}
                        showIcon={false}
                        className="text-[11px]"
                      />
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        ticket.ticket_category === 'OLD_ISSUE'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {ticket.ticket_category === 'OLD_ISSUE' ? '⚠️ مشكلة' : '💡 مقترح'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </div>
                  </div>
                );
              })}

              {/* Closed tasks */}
              {closedTasks.length > 0 && (
                <>
                  <h2 className="text-sm font-bold text-slate-500 mt-6">المهام المغلقة ({closedTasks.length})</h2>
                  {closedTasks.map((ticket) => (
                    <div
                      key={ticket.id}
                      onClick={() => openTicket(ticket)}
                      className="rounded-2xl border border-slate-100 bg-white p-4 cursor-pointer hover:bg-slate-50 transition space-y-1 opacity-70"
                    >
                      <span className="font-mono text-[10px] text-slate-400">{ticket.ticket_number}</span>
                      <p className="text-xs font-bold text-slate-700 line-clamp-1">{ticket.title}</p>
                      <TicketStatusBadge status={ticket.status as TicketStatus} />
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* ── Task Detail Panel ── */}
            <div className="lg:col-span-2">
              {!selectedTicket ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center text-slate-400 h-full flex flex-col items-center justify-center">
                  <UserCheck className="w-12 h-12 mb-3 text-slate-300" />
                  <p className="font-bold text-slate-500">اختر مهمة من القائمة لعرض تفاصيلها والإجراءات المتاحة</p>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Panel Header */}
                  <div className="bg-gradient-to-r from-slate-900 to-indigo-900 p-6 text-white">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-mono text-slate-400">{selectedTicket.ticket_number}</span>
                        <h2 className="text-xl font-extrabold mt-1">{selectedTicket.title}</h2>
                      </div>
                      <TicketStatusBadge status={selectedTicket.status as TicketStatus} />
                    </div>
                    {selectedTicket.expected_resolution_time && (
                      <div className="mt-3">
                        <SlaCountdownTimer
                          expectedTime={selectedTicket.expected_resolution_time}
                          status={selectedTicket.status}
                          showIcon
                        />
                      </div>
                    )}
                  </div>

                  <div className="p-6 space-y-6">

                    {/* Description */}
                    <div>
                      <p className="text-xs font-bold text-slate-500 mb-1.5">وصف المشكلة / المقترح:</p>
                      <p className="text-sm text-slate-700 leading-7 whitespace-pre-wrap">{selectedTicket.description}</p>
                    </div>

                    {/* Resolution summary (if resolved) */}
                    {selectedTicket.status === 'RESOLVED' && selectedTicket.resolution_summary && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                        <p className="text-xs font-bold text-emerald-700 mb-1">📋 ما تم تنفيذه:</p>
                        <p className="text-sm text-emerald-900">{selectedTicket.resolution_summary}</p>
                      </div>
                    )}

                    {/* Attachments */}
                    {(selectedTicket.attachments ?? []).length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-slate-500 mb-2">📎 المرفقات ({selectedTicket.attachments!.length}):</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {selectedTicket.attachments!.map((att) => (
                            <a
                              key={att.id}
                              href={att.preview_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition group text-xs"
                            >
                              <FileTypeIcon type={att.file_type} />
                              <span className="truncate flex-1 font-medium text-slate-700">{att.file_name}</span>
                              <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── Action Buttons (RBAC by status) ── */}
                    {selectedTicket.status === 'ASSIGNED' && (
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
                        <p className="text-sm font-bold text-amber-800">⏳ تنتظر قبولك — هل تقبل هذا التكليف؟</p>
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleAccept(selectedTicket.id)}
                            disabled={actionLoading}
                            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition disabled:opacity-60"
                          >
                            <ThumbsUp className="w-4 h-4" />
                            👍 قبول التكليف
                          </button>
                          <button
                            onClick={() => setModal({ type: 'reject', ticketId: selectedTicket.id, reason: '' })}
                            disabled={actionLoading}
                            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold transition disabled:opacity-60"
                          >
                            <ThumbsDown className="w-4 h-4" />
                            🚫 اعتذار / رفض التكليف
                          </button>
                        </div>
                      </div>
                    )}

                    {selectedTicket.status === 'IN_PROGRESS' && (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                        <p className="text-sm font-bold text-slate-700">📌 المهمة قيد التنفيذ — أنهِ وأغلق التذكرة:</p>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setModal({
                              type: 'resolve',
                              ticketId: selectedTicket.id,
                              status: 'RESOLVED',
                              summary: '',
                              unresolvedReason: '',
                              internalNote: '',
                              files: [],
                            })}
                            disabled={actionLoading}
                            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition disabled:opacity-60"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            🎯 تم الحل (Resolved)
                          </button>
                          <button
                            onClick={() => setModal({
                              type: 'resolve',
                              ticketId: selectedTicket.id,
                              status: 'UNRESOLVED',
                              summary: '',
                              unresolvedReason: '',
                              internalNote: '',
                              files: [],
                            })}
                            disabled={actionLoading}
                            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition disabled:opacity-60"
                          >
                            <AlertTriangle className="w-4 h-4" />
                            ⚠️ تعذر الحل
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Internal Notes (always visible) */}
                    <div className="border-t border-slate-100 pt-5">
                      <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" />
                        📝 حفظ ملاحظات داخلية (لا يراها مقدم الطلب)
                      </p>
                      <textarea
                        rows={2}
                        value={internalNote}
                        onChange={(e) => setInternalNote(e.target.value)}
                        placeholder="ملاحظات تشغيلية، متطلبات تقنية، أو سياق إضافي..."
                        className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-slate-50"
                      />
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={() => handleSaveNote(selectedTicket.id)}
                          disabled={savingNote || !internalNote.trim()}
                          className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold transition disabled:opacity-50"
                        >
                          {savingNote ? 'جاري الحفظ...' : '📝 حفظ الملاحظة'}
                        </button>
                      </div>
                    </div>

                    {/* Activity Logs */}
                    {(selectedTicket.activity_logs ?? []).length > 0 && (
                      <div className="border-t border-slate-100 pt-5">
                        <p className="text-xs font-bold text-slate-500 mb-4 flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5" />
                          سجل الأحداث
                        </p>
                        <ol className="relative border-r border-slate-200 space-y-4 pr-5">
                          {(selectedTicket.activity_logs ?? []).map((log, idx) => (
                            <li key={idx} className="relative">
                              <div className="absolute -right-2.5 top-0 w-5 h-5 rounded-full bg-white border-2 border-blue-300 flex items-center justify-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                              </div>
                              <div className="mr-3">
                                <p className="text-xs font-bold text-slate-700">{ACTION_LABEL[log.action] ?? log.action}</p>
                                {log.details && <p className="text-[11px] text-slate-500 mt-0.5">{log.details}</p>}
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {log.performed_by_name} — {log.logged_at ? formatDate(log.logged_at) : ''}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════ REJECT TASK MODAL ═══════════════ */}
      {modal?.type === 'reject' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-5" dir="rtl">
            <h2 className="text-lg font-extrabold text-slate-900">🚫 اعتذار عن استلام التكليف</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              ستُعاد التذكرة لقيادة إدارة التقنية لإعادة التوجيه.
              <strong className="text-rose-600"> مبرر الاعتذار إجباري</strong> ولا يمكن تجاوزه.
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                مبررات الاعتذار <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                value={modal.reason}
                onChange={(e) => setModal({ ...modal, reason: e.target.value })}
                placeholder="وضح سبب اعتذارك بشكل مفصل..."
                className={`w-full rounded-xl border p-3 text-sm focus:ring-2 outline-none resize-none ${
                  modal.reason.trim().length === 0 ? 'border-rose-300 focus:ring-rose-400' : 'border-slate-300 focus:ring-blue-500'
                }`}
              />
              {modal.reason.trim().length === 0 && (
                <p className="text-[11px] text-rose-500 mt-1">⚠️ هذا الحقل إجباري</p>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl border text-sm font-bold text-slate-600 hover:bg-slate-50">
                إلغاء
              </button>
              <button
                onClick={handleRejectTask}
                disabled={actionLoading || !modal.reason.trim()}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold transition disabled:opacity-60"
              >
                {actionLoading ? 'جاري التسجيل...' : 'تأكيد الاعتذار'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ RESOLVE / UNRESOLVED MODAL ═══════════════ */}
      {modal?.type === 'resolve' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 space-y-5 max-h-[90vh] overflow-y-auto" dir="rtl">

            {/* Toggle: Resolved vs Unresolved */}
            <div className="flex gap-2">
              <button
                onClick={() => setModal({ ...modal, status: 'RESOLVED' })}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition ${
                  modal.status === 'RESOLVED'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                🎯 تم الحل (Resolved)
              </button>
              <button
                onClick={() => setModal({ ...modal, status: 'UNRESOLVED' })}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition ${
                  modal.status === 'UNRESOLVED'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                ⚠️ تعذر الحل
              </button>
            </div>

            {modal.status === 'RESOLVED' ? (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ما الذي تم بالتفصيل لحل المشكلة؟ <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={modal.summary}
                    onChange={(e) => setModal({ ...modal, summary: e.target.value })}
                    placeholder="اشرح الإجراءات التقنية المتخذة والنتيجة التي تحققت..."
                    className={`w-full rounded-xl border p-3 text-sm focus:ring-2 outline-none resize-none ${
                      modal.summary.trim().length === 0 ? 'border-rose-300 focus:ring-rose-400' : 'border-slate-300 focus:ring-blue-500'
                    }`}
                  />
                  {modal.summary.trim().length === 0 && (
                    <p className="text-[11px] text-rose-500 mt-1">⚠️ يجب ملء هذا الحقل لإغلاق التذكرة كـ تم الحل</p>
                  )}
                </div>
                {/* Proof Upload */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    رفع إثبات الحل (صورة / فيديو — اختياري)
                  </label>
                  <div
                    className="border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl p-5 text-center cursor-pointer transition"
                    onClick={() => document.getElementById('proof-upload-input')?.click()}
                  >
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      className="hidden"
                      id="proof-upload-input"
                      onChange={(e) => {
                        if (e.target.files && modal.type === 'resolve') {
                          setModal({ ...modal, files: [...modal.files, ...Array.from(e.target.files)] });
                        }
                      }}
                    />
                    <UploadCloud className="w-7 h-7 text-slate-400 mx-auto mb-1" />
                    <p className="text-xs text-slate-500">اضغط لرفع صورة أو فيديو إثبات</p>
                  </div>
                  {modal.files.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {modal.files.map((f, i) => (
                        <div key={i} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg p-2 border border-slate-200">
                          <span className="truncate">{f.name}</span>
                          <button
                            onClick={() => setModal({ ...modal, files: modal.files.filter((_, fi) => fi !== i) })}
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
                  value={modal.unresolvedReason}
                  onChange={(e) => setModal({ ...modal, unresolvedReason: e.target.value })}
                  placeholder="وضح العوائق الفنية أو الصلاحيات اللازمة أو الجهة الأعلى التي يجب إحالتها..."
                  className={`w-full rounded-xl border p-3 text-sm focus:ring-2 outline-none resize-none ${
                    modal.unresolvedReason.trim().length === 0 ? 'border-rose-300 focus:ring-rose-400' : 'border-slate-300 focus:ring-blue-500'
                  }`}
                />
                {modal.unresolvedReason.trim().length === 0 && (
                  <p className="text-[11px] text-rose-500 mt-1">⚠️ يجب توثيق أسباب تعذر الحل قبل التصعيد</p>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl border text-sm font-bold text-slate-600 hover:bg-slate-50">
                إلغاء
              </button>
              <button
                onClick={handleComplete}
                disabled={actionLoading}
                className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition disabled:opacity-60 ${
                  modal.status === 'RESOLVED'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-orange-500 hover:bg-orange-600'
                }`}
              >
                {actionLoading ? 'جاري الحفظ...' : modal.status === 'RESOLVED' ? '🎯 تأكيد الإغلاق (تم الحل)' : '⚠️ تصعيد تعذر الحل'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AssigneeWorkspacePage;
