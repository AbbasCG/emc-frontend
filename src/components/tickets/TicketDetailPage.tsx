import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ticketService } from '@/services/ticketService';
import { useAuth } from '@/contexts/AuthContext';
import type { Ticket, TicketStatus } from '@/types/ticket';
import SlaCountdownTimer from './SlaCountdownTimer';
import TicketStatusBadge from './TicketStatusBadge';
import {
  ArrowRight,
  User,
  Building2,
  Layers,
  Calendar,
  MessageSquare,
  Download,
  AlertTriangle,
  Image as ImageIcon,
  Film,
  FileText,
  Send,
  History,
  CheckCircle2,
  XCircle,
  Clock,
  Info,
} from 'lucide-react';
import toast from '@/lib/toast';

// ── Helpers ────────────────────────────────────────────────────────────────
function formatArabicDate(dateStr: string) {
  const d = new Date(dateStr);
  return (
    d.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) +
    ' — الساعة ' +
    d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
  );
}

const STATUS_META: Record<string, { label: string; icon: React.ReactNode; bg: string; text: string; border: string }> = {
  PENDING_APPROVAL: {
    label: 'معلقة — قيد مراجعة الإدارة',
    icon: <Clock className="w-5 h-5" />,
    bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300',
  },
  ASSIGNED: {
    label: 'معتمدة — محالة للوحدة التقنية',
    icon: <CheckCircle2 className="w-5 h-5" />,
    bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-300',
  },
  IN_PROGRESS: {
    label: 'قيد المعالجة والإنجاز',
    icon: <Clock className="w-5 h-5" />,
    bg: 'bg-violet-50', text: 'text-violet-800', border: 'border-violet-300',
  },
  RESOLVED: {
    label: 'تم الحل وإغلاق التذكرة ✔',
    icon: <CheckCircle2 className="w-5 h-5" />,
    bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300',
  },
  UNRESOLVED: {
    label: 'تعذر الحل — تم التصعيد للإدارة العليا',
    icon: <AlertTriangle className="w-5 h-5" />,
    bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-300',
  },
  REJECTED_BY_ADMIN: {
    label: 'مرفوضة من الإدارة',
    icon: <XCircle className="w-5 h-5" />,
    bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-300',
  },
  REJECTED_BY_ASSIGNEE: {
    label: 'اعتذر المكلف — بانتظار إعادة التوجيه',
    icon: <XCircle className="w-5 h-5" />,
    bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-300',
  },
};

const ACTION_LABEL: Record<string, string> = {
  SUBMITTED:       'إدخال التذكرة',
  APPROVED:        'اعتماد التذكرة من الإدارة',
  REJECTED:        'رفض التذكرة',
  ACCEPTED:        'قبول التكليف من المكلف',
  REJECTED_TASK:   'اعتذار المكلف عن الاستلام',
  RESOLVED:        'إغلاق: تم الحل',
  MARKED_UNRESOLVED: 'إغلاق: تعذر الحل',
  REASSIGNED:      'إعادة توجيه وتغيير المكلف',
  COMMENT:         'تعقيب / استفسار',
  INTERNAL_NOTE:   'ملاحظة داخلية',
};

function AttachmentFileIcon({ type }: { type: string }) {
  if (type === 'IMAGE') return <ImageIcon className="w-4 h-4 text-blue-500" />;
  if (type === 'VIDEO') return <Film className="w-4 h-4 text-violet-500" />;
  return <FileText className="w-4 h-4 text-amber-500" />;
}

// ── Component ───────────────────────────────────────────────────────────────
const TicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const fetchTicket = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await ticketService.getTicket(id);
      if (res.success && res.data) setTicket(res.data);
      else toast.error(res.message || 'تعذر تحميل التذكرة');
    } catch {
      toast.error('حدث خطأ أثناء جلب تفاصيل التذكرة');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchTicket(); }, [fetchTicket]);

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !ticket) return;
    setSubmittingComment(true);
    try {
      await ticketService.addComment(ticket.id, comment.trim());
      toast.success('تم إرسال التعقيب بنجاح');
      setComment('');
      fetchTicket();
    } catch {
      toast.error('تعذر إرسال التعقيب');
    } finally {
      setSubmittingComment(false);
    }
  };

  // ── Loading & Empty states ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6" dir="rtl">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-sm font-semibold">جاري تحميل تفاصيل البلاغ...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6" dir="rtl">
        <div className="text-center space-y-4 max-w-md bg-white p-10 rounded-3xl shadow-sm border border-slate-200">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">التذكرة غير موجودة</h2>
          <p className="text-sm text-slate-500">لم يُعثر على التذكرة المطلوبة.</p>
          <button
            onClick={() => navigate('/dashboard/tickets/new')}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition"
          >
            تقديم تذكرة جديدة
          </button>
        </div>
      </div>
    );
  }

  const statusMeta = STATUS_META[ticket.status as TicketStatus] ?? STATUS_META['PENDING_APPROVAL'];
  const isActive = !['RESOLVED', 'REJECTED_BY_ADMIN', 'UNRESOLVED'].includes(ticket.status);
  const initialAttachments = (ticket.attachments ?? []).filter((a) => a.attachment_context === 'INITIAL_SUBMISSION');
  const activityLogs = ticket.activity_logs ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-10 px-4 sm:px-6 lg:px-8 font-sans text-slate-800" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── Nav ── */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard/tickets/new')}
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 text-xs font-bold transition"
          >
            <ArrowRight className="w-4 h-4" />
            تقديم تذكرة جديدة
          </button>
          <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg">
            {ticket.ticket_number}
          </span>
        </div>

        {/* ── Status Banner ── */}
        <div className={`rounded-2xl border ${statusMeta.border} ${statusMeta.bg} p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4`}>
          <div className={`flex items-center gap-3 ${statusMeta.text}`}>
            {statusMeta.icon}
            <div>
              <p className="font-extrabold text-base">{statusMeta.label}</p>
              {ticket.status === 'REJECTED_BY_ADMIN' && ticket.admin_rejection_reason && (
                <p className="text-xs mt-0.5 opacity-80">سبب الرفض: {ticket.admin_rejection_reason}</p>
              )}
              {ticket.status === 'UNRESOLVED' && ticket.unresolved_reason && (
                <p className="text-xs mt-0.5 opacity-80">سبب تعذر الحل: {ticket.unresolved_reason}</p>
              )}
            </div>
          </div>
          {/* Live SLA countdown — visible after approval */}
          {ticket.expected_resolution_time && isActive && (
            <SlaCountdownTimer
              expectedTime={ticket.expected_resolution_time}
              status={ticket.status}
              showIcon
              className="shrink-0"
            />
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left Column: Details ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Ticket Content */}
            <div className="bg-white rounded-3xl border border-slate-200 p-7 shadow-sm space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      ticket.ticket_category === 'OLD_ISSUE'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {ticket.ticket_category === 'OLD_ISSUE' ? '⚠️ مشكلة قائمة' : '💡 مقترح تطويري'}
                    </span>
                    <TicketStatusBadge status={ticket.status as TicketStatus} />
                  </div>
                  <h1 className="text-2xl font-extrabold text-slate-900 leading-tight">{ticket.title}</h1>
                </div>
              </div>

              <p className="text-slate-600 text-sm leading-7 whitespace-pre-wrap">{ticket.description}</p>

              {/* Resolution summary (if resolved) */}
              {ticket.status === 'RESOLVED' && ticket.resolution_summary && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                  <p className="text-xs font-bold text-emerald-700 mb-1">📋 ما تم لحل المشكلة:</p>
                  <p className="text-sm text-emerald-900 leading-relaxed">{ticket.resolution_summary}</p>
                </div>
              )}
            </div>

            {/* Attachments */}
            {initialAttachments.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-200 p-7 shadow-sm">
                <h3 className="text-sm font-bold text-slate-700 mb-4">📎 المرفقات الأصلية ({initialAttachments.length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {initialAttachments.map((att) => (
                    <a
                      key={att.id}
                      href={att.preview_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition group"
                    >
                      <AttachmentFileIcon type={att.file_type} />
                      <span className="text-xs font-medium text-slate-700 truncate flex-1">{att.file_name}</span>
                      <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0 transition" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Comment / Follow-up Box */}
            <div className="bg-white rounded-3xl border border-slate-200 p-7 shadow-sm">
              <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-500" />
                إضافة تعقيب / استفسار
              </h3>
              <form onSubmit={handleComment} className="space-y-3">
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="اكتب تعقيبك أو استفسارك وسيظهر لفريق الدعم التقني..."
                  className="w-full rounded-xl border border-slate-200 p-4 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-slate-50"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingComment || !comment.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    💬 إرسال التعقيب
                  </button>
                </div>
              </form>
            </div>

            {/* Activity Timeline */}
            {activityLogs.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-200 p-7 shadow-sm">
                <h3 className="text-sm font-bold text-slate-700 mb-5 flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-500" />
                  سجل أحداث التذكرة
                </h3>
                <ol className="relative border-r border-slate-200 space-y-5 pr-5">
                  {activityLogs.map((log, idx) => (
                    <li key={idx} className="relative">
                      <div className="absolute -right-2.5 top-0 w-5 h-5 rounded-full bg-white border-2 border-blue-400 flex items-center justify-center">
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                      </div>
                      <div className="mr-3">
                        <p className="text-xs font-bold text-slate-800">
                          {ACTION_LABEL[log.action] ?? log.action}
                        </p>
                        {log.details && (
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{log.details}</p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-1">
                          بواسطة: {log.performed_by_name} — {log.logged_at ? formatArabicDate(log.logged_at) : ''}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          {/* ── Right Column: Meta Info ── */}
          <div className="space-y-5">

            {/* Submitter Info */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">معلومات المُدخل</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                  {(ticket.created_by_name || user?.name || 'م')[0]}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{ticket.created_by_name || user?.name}</p>
                  {ticket.created_by_email && (
                    <p className="text-[11px] text-slate-400">{ticket.created_by_email}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{formatArabicDate(ticket.created_at)}</span>
              </div>
            </div>

            {/* Routing Info */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">مسار الإدراج</h3>
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-slate-700 font-medium">{ticket.department?.name_ar ?? '—'}</span>
              </div>
              {ticket.unit && (
                <div className="flex items-center gap-2 text-sm">
                  <Layers className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-slate-700 font-medium">{ticket.unit.name_ar}</span>
                </div>
              )}
              {ticket.assignee && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-slate-700 font-medium">المكلف: {ticket.assignee.name}</span>
                </div>
              )}
            </div>

            {/* SLA Info */}
            {ticket.expected_resolution_time && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  الجدول الزمني للحل
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  <span>الموعد النهائي: {formatArabicDate(ticket.expected_resolution_time)}</span>
                </div>
                {isActive && (
                  <SlaCountdownTimer
                    expectedTime={ticket.expected_resolution_time}
                    status={ticket.status}
                    showIcon
                  />
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketDetailPage;
