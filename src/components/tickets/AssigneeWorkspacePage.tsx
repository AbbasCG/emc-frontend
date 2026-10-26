import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ticketService } from '@/services/ticketService';
import { useAuth } from '@/contexts/AuthContext';
import type { Ticket, TicketAttachment, TicketPriority, TicketStatus } from '@/types/ticket';
import TicketStatusBadge from './TicketStatusBadge';
import SlaCountdownTimer from './SlaCountdownTimer';
import { TicketAttachmentCard } from './TicketAttachmentCard';
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
  History,
  ChevronLeft,
  Paperclip,
  User as UserIcon,
  CalendarClock,
  Lock,
  Inbox,
  ListChecks,
  WifiOff,
  Video,
} from 'lucide-react';
import toast from '@/lib/toast';
import { fetchMeetings } from '@/api/meetingsApi';
import type { OpsMeeting } from '@/types/operations';

// Brand V2.2 tokens only (raw hex is lint-forbidden):
//   primary brand-500 · secondary accent-500 (solid; accent-600/800 for text on light)
//   tertiary navy · neutral muted-500 · background slate-50

// ── Types ───────────────────────────────────────────────────────────────────
type ActiveModal =
  | { type: 'reject'; ticketId: number; reason: string }
  | { type: 'resolve'; ticketId: number; summary: string; files: File[]; status: 'RESOLVED' | 'UNRESOLVED'; unresolvedReason: string; internalNote: string }
  | null;

type ListTab = 'active' | 'closed';

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

const PRIORITY_META: Record<TicketPriority, { label: string; className: string }> = {
  LOW:      { label: 'أولوية منخفضة', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  MEDIUM:   { label: 'أولوية متوسطة', className: 'bg-sky-50 text-sky-700 border-sky-200' },
  HIGH:     { label: 'أولوية عالية',  className: 'bg-orange-50 text-orange-700 border-orange-200' },
  CRITICAL: { label: 'أولوية حرجة',   className: 'bg-rose-50 text-rose-700 border-rose-200' },
};

const ACTIVE_STATUSES: TicketStatus[] = ['ASSIGNED', 'IN_PROGRESS'];
const CLOSED_STATUSES: TicketStatus[] = ['RESOLVED', 'UNRESOLVED', 'REJECTED_BY_ASSIGNEE'];

function formatDateTime(str?: string | null): string {
  if (!str) return '';
  const date = new Date(str);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
}

// ── Small presentational pieces ─────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold leading-none text-navy">{value}</p>
        <p className="mt-1 truncate text-[11px] text-muted-500">{label}</p>
      </div>
    </div>
  );
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 text-xs font-bold text-navy">
      <span className="text-brand-500">{icon}</span>
      {children}
    </h3>
  );
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 text-xs">
      <dt className="shrink-0 text-muted-500">{label}</dt>
      <dd className="min-w-0 break-words text-left font-semibold text-navy">
        {value || <span className="font-normal text-slate-300">—</span>}
      </dd>
    </div>
  );
}

function AttachmentGrid({ items }: { items: TicketAttachment[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
      {items.map((att) => (
        <TicketAttachmentCard key={att.id} attachment={att} />
      ))}
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────
const AssigneeWorkspacePage: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();

  const [tickets, setTickets]             = useState<Ticket[]>([]);
  const [loading, setLoading]             = useState(true);
  const [loadError, setLoadError]         = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [modal, setModal]                 = useState<ActiveModal>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [internalNote, setInternalNote]   = useState('');
  const [savingNote, setSavingNote]       = useState(false);
  const [tab, setTab]                     = useState<ListTab>('active');
  const [upcomingMeetings, setUpcomingMeetings] = useState<OpsMeeting[]>([]);

  const detailRef = useRef<HTMLDivElement>(null);
  const detailRequest = useRef(0);

  // Load assigned tasks for the current user
  const fetchTasks = useCallback(async () => {
    if (authLoading) return;
    if (!user) {
      // No signed-in user means nothing to load; never leave the spinner up.
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      const res = await ticketService.getTickets({
        assigned_to_id: user.id,
        per_page: 50,
      });
      if (res.success) {
        setTickets(res.data.data ?? []);
      } else {
        setLoadError(true);
      }
    } catch {
      setLoadError(true);
      toast.error('تعذر تحميل مهامك المكلف بها');
    } finally {
      setLoading(false);
    }
  }, [user, authLoading]);

  // Load upcoming meetings where the member is invited
  const fetchMyMeetings = useCallback(async () => {
    if (authLoading || !user) return;
    try {
      const res = await fetchMeetings({ when: 'upcoming', per_page: 5 });
      setUpcomingMeetings(res.rows);
    } catch {
      // Non-critical, ignore
    }
  }, [user, authLoading]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount / user change; the loading flag must reset before the request
  useEffect(() => {
    fetchTasks();
    fetchMyMeetings();
  }, [fetchTasks, fetchMyMeetings]);

  // The list payload has no activity log; the single-ticket payload does.
  // A failed detail fetch keeps the list data on screen instead of blanking it.
  const loadDetail = useCallback(async (ticketId: number) => {
    const request = ++detailRequest.current;
    setDetailLoading(true);
    try {
      const res = await ticketService.getTicket(ticketId);
      if (request !== detailRequest.current) return;
      if (res.success && res.data) {
        setSelectedTicket((prev) => (prev && prev.id === ticketId ? { ...prev, ...res.data } : prev));
      }
    } catch {
      /* list data stays */
    } finally {
      if (request === detailRequest.current) setDetailLoading(false);
    }
  }, []);

  const openTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setInternalNote('');
    loadDetail(ticket.id);

    if (typeof window !== 'undefined' && window.matchMedia?.('(max-width: 1023px)').matches) {
      detailRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    }
  };

  const refreshAfterAction = (ticketId: number) => {
    fetchTasks();
    loadDetail(ticketId);
  };

  // ── Accept task ──────────────────────────────────────────────────────────
  const handleAccept = async (ticketId: number) => {
    setActionLoading(true);
    try {
      await ticketService.acceptTask(ticketId);
      toast.success('تم قبول التكليف — التذكرة الآن قيد تنفيذك');
      refreshAfterAction(ticketId);
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
    const { ticketId } = modal;
    setActionLoading(true);
    try {
      await ticketService.rejectTask(ticketId, modal.reason.trim());
      toast.success('تم تسجيل اعتذارك — أُعيدت التذكرة للقيادة لإعادة التوجيه');
      setModal(null);
      refreshAfterAction(ticketId);
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
      formData.append('resolution_type', status);
      if (status === 'RESOLVED') {
        formData.append('resolution_summary', summary.trim());
        files.forEach((f) => formData.append('proof_files[]', f));
      } else {
        formData.append('unresolved_reason', unresolvedReason.trim());
      }
      await ticketService.completeTask(ticketId, formData);
      toast.success(status === 'RESOLVED' ? 'تم إغلاق التذكرة — أحسنت!' : 'تم رفع تقرير تعذر الحل للإدارة العليا');
      setModal(null);
      refreshAfterAction(ticketId);
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
      loadDetail(ticketId);
    } catch {
      toast.error('تعذر حفظ الملاحظة');
    } finally {
      setSavingNote(false);
    }
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const pendingAccept   = tickets.filter((t) => t.status === 'ASSIGNED').length;
  const inProgress      = tickets.filter((t) => t.status === 'IN_PROGRESS').length;
  const resolvedCount   = tickets.filter((t) => t.status === 'RESOLVED').length;
  const unresolvedCount = tickets.filter((t) => t.status === 'UNRESOLVED').length;

  const activeTasks = tickets.filter((t) => ACTIVE_STATUSES.includes(t.status));
  const closedTasks = tickets.filter((t) => CLOSED_STATUSES.includes(t.status));
  const visibleTasks = tab === 'active' ? activeTasks : closedTasks;

  const ticket = selectedTicket;
  const caps = ticket?.capabilities;
  const canAccept   = !!caps?.accept_task;
  const canReject   = !!caps?.reject_task;
  const canComplete = !!caps?.complete_task;
  const canNote     = !!caps?.add_internal_note;

  const attachments    = ticket?.attachments ?? [];
  const originalFiles  = attachments.filter((a) => a.attachment_context !== 'RESOLUTION_PROOF');
  const proofFiles     = attachments.filter((a) => a.attachment_context === 'RESOLUTION_PROOF');
  const activityLogs   = ticket?.activity_logs ?? [];

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800" dir="rtl">
      <div className="mx-auto max-w-[1500px] space-y-6 px-4 py-8 sm:px-6">

        {/* ── Header ── */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-navy">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
                <UserCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              مساحة العضو المكلف
            </h1>
            <p className="mt-1.5 text-xs text-muted-500">
              مهامك الفنية المعيّنة إليك{user?.name ? ` — ${user.name}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-muted-500">
              إجمالي المهام: <span className="text-navy">{tickets.length}</span>
            </span>
            <button
              type="button"
              onClick={fetchTasks}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              تحديث المهام
            </button>
          </div>
        </header>

        {/* ── Status summary ── */}
        <section aria-label="ملخص الحالات" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="تنتظر قبولك" value={pendingAccept} tone="bg-accent-500/15 text-accent-600" icon={<Clock className="h-5 w-5" aria-hidden="true" />} />
          <StatCard label="قيد التنفيذ" value={inProgress} tone="bg-brand-500/10 text-brand-500" icon={<Flag className="h-5 w-5" aria-hidden="true" />} />
          <StatCard label="تم الحل" value={resolvedCount} tone="bg-emerald-50 text-emerald-600" icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />} />
          <StatCard label="تعذر الحل" value={unresolvedCount} tone="bg-orange-50 text-orange-600" icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />} />
        </section>

        {/* ── Upcoming Meetings Section for Assignee ── */}
        {upcomingMeetings.length > 0 && (
          <section className="rounded-3xl border border-brand-100 bg-brand-50/40 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-black text-navy">
                <Video size={17} className="text-brand-600" />
                اجتماعاتي القادمة المقررة ({upcomingMeetings.length})
              </h3>
              <a
                href="/dashboard/department/meeting-lounge"
                className="text-xs font-black text-brand-600 hover:underline"
              >
                دخول صالة الاجتماعات ←
              </a>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingMeetings.map((m) => (
                <div
                  key={m.id}
                  className="rounded-2xl border border-line bg-white p-4 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div>
                    <h4 className="text-sm font-black text-navy line-clamp-1">{m.title}</h4>
                    <p className="mt-1 text-xs font-semibold text-muted-500 flex items-center gap-1.5">
                      <Clock size={12} />
                      {m.meeting_date} {m.start_time ? `الساعة ${m.start_time}` : ''}
                    </p>
                    {m.department && (
                      <span className="mt-1 inline-block text-[11px] font-bold text-accent-700">
                        {m.department.name}
                      </span>
                    )}
                  </div>

                  <a
                    href="/dashboard/department/meeting-lounge"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-brand-600"
                  >
                    <Video size={13} />
                    حضور في الصالة
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}

        {loading ? (
          <div role="status" className="rounded-3xl border border-slate-200 bg-white p-16 text-center shadow-sm">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            <p className="text-sm text-muted-500">جاري تحميل مهامك...</p>
          </div>
        ) : loadError ? (
          <div className="rounded-3xl border border-rose-200 bg-white p-14 text-center shadow-sm">
            <WifiOff className="mx-auto mb-3 h-10 w-10 text-rose-400" aria-hidden="true" />
            <p className="font-bold text-navy">تعذر تحميل المهام</p>
            <p className="mt-1 text-xs text-muted-500">تحقق من الاتصال ثم أعد المحاولة.</p>
            <button
              type="button"
              onClick={fetchTasks}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2 text-xs font-bold text-white transition hover:bg-brand-600"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              إعادة المحاولة
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] xl:grid-cols-[minmax(280px,340px)_minmax(0,1fr)_300px]">

            {/* ── Task list ── */}
            <aside className="space-y-3 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto lg:pl-1" aria-label="قائمة المهام">
              <div role="tablist" className="flex gap-1 rounded-xl bg-slate-200/60 p-1">
                {([
                  ['active', `المهام النشطة (${activeTasks.length})`],
                  ['closed', `المغلقة (${closedTasks.length})`],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={tab === key}
                    onClick={() => setTab(key)}
                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition ${
                      tab === key ? 'bg-white text-navy shadow-sm' : 'text-muted-500 hover:text-navy'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {visibleTasks.length === 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-400">
                  <Inbox className="mx-auto mb-2 h-10 w-10 text-slate-300" aria-hidden="true" />
                  <p className="text-sm font-semibold">
                    {tab === 'active' ? 'لا مهام نشطة حالياً' : 'لا مهام مغلقة'}
                  </p>
                </div>
              )}

              {visibleTasks.map((item) => {
                const isSelected = selectedTicket?.id === item.id;
                const awaitingAccept = item.status === 'ASSIGNED';
                const isLate = !!item.expected_resolution_time &&
                  new Date() > new Date(item.expected_resolution_time) &&
                  item.status === 'IN_PROGRESS';
                const attachmentCount = item.attachments?.length ?? 0;
                const priority = PRIORITY_META[item.priority];

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openTicket(item)}
                    aria-pressed={isSelected}
                    className={`block w-full space-y-2.5 rounded-2xl border p-4 text-right shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                      isSelected
                        ? 'border-brand-500 bg-brand-500/5 ring-1 ring-brand-500/30'
                        : isLate
                        ? 'border-rose-300 bg-rose-50/40 hover:bg-rose-50'
                        : awaitingAccept
                        ? 'border-accent-500/50 bg-accent-500/5 hover:bg-accent-500/10'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    } ${tab === 'closed' ? 'opacity-80' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-[10px] font-bold text-muted-500">{item.ticket_number}</span>
                      <TicketStatusBadge status={item.status} />
                    </div>

                    <p className="line-clamp-2 break-words text-sm font-bold leading-snug text-navy">{item.title}</p>

                    {item.expected_resolution_time && tab === 'active' && (
                      <SlaCountdownTimer
                        expectedTime={item.expected_resolution_time}
                        status={item.status}
                        showIcon={false}
                        className="text-[11px]"
                      />
                    )}

                    <div className="flex flex-wrap items-center gap-1.5">
                      {priority && (
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${priority.className}`}>
                          {priority.label}
                        </span>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        item.ticket_category === 'OLD_ISSUE'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {item.ticket_category === 'OLD_ISSUE' ? 'مشكلة' : 'مقترح'}
                      </span>
                      {attachmentCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-500">
                          <Paperclip className="h-3 w-3" aria-hidden="true" />
                          {attachmentCount}
                        </span>
                      )}
                      <ChevronLeft className="mr-auto h-4 w-4 text-slate-300" aria-hidden="true" />
                    </div>
                  </button>
                );
              })}
            </aside>

            {/* ── Task detail ── */}
            <div ref={detailRef} className="min-w-0 scroll-mt-4">
              {!ticket ? (
                <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-400 shadow-sm">
                  <ListChecks className="mb-3 h-12 w-12 text-slate-300" aria-hidden="true" />
                  <p className="font-bold text-muted-500">اختر مهمة من القائمة لعرض تفاصيلها والإجراءات المتاحة</p>
                </div>
              ) : (
                <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                  {/* Panel header */}
                  <div className="bg-navy p-6 text-white">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="font-mono text-[11px] text-white/60">{ticket.ticket_number}</span>
                        <h2 className="mt-1 break-words text-xl font-extrabold leading-snug">{ticket.title}</h2>
                      </div>
                      <TicketStatusBadge status={ticket.status} />
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {PRIORITY_META[ticket.priority] && (
                        <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white">
                          {PRIORITY_META[ticket.priority].label}
                        </span>
                      )}
                      <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white">
                        {ticket.ticket_category === 'OLD_ISSUE' ? 'مشكلة قائمة' : 'مقترح جديد'}
                      </span>
                      {ticket.expected_resolution_time && (
                        <SlaCountdownTimer
                          expectedTime={ticket.expected_resolution_time}
                          status={ticket.status}
                          showIcon
                        />
                      )}
                    </div>
                  </div>

                  <div className="space-y-7 p-6">

                    {/* Description */}
                    <section>
                      <SectionTitle icon={<MessageSquare className="h-3.5 w-3.5" />}>وصف المشكلة / المقترح</SectionTitle>
                      <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{ticket.description}</p>
                    </section>

                    {/* Resolution outcome */}
                    {ticket.status === 'RESOLVED' && ticket.resolution_summary && (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                        <p className="mb-1 text-xs font-bold text-emerald-700">ما تم تنفيذه</p>
                        <p className="break-words text-sm text-emerald-900">{ticket.resolution_summary}</p>
                      </div>
                    )}
                    {ticket.status === 'UNRESOLVED' && ticket.unresolved_reason && (
                      <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                        <p className="mb-1 text-xs font-bold text-orange-700">أسباب تعذر الحل</p>
                        <p className="break-words text-sm text-orange-900">{ticket.unresolved_reason}</p>
                      </div>
                    )}

                    {/* Attachments */}
                    <section>
                      <SectionTitle icon={<Paperclip className="h-3.5 w-3.5" />}>
                        المرفقات ({attachments.length})
                      </SectionTitle>

                      {attachments.length === 0 ? (
                        <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-muted-500">
                          لا توجد مرفقات على هذه التذكرة.
                        </p>
                      ) : (
                        <div className="space-y-5">
                          {originalFiles.length > 0 && (
                            <div>
                              {proofFiles.length > 0 && (
                                <p className="mb-2 text-[11px] font-semibold text-muted-500">مرفقات مقدّم الطلب</p>
                              )}
                              <AttachmentGrid items={originalFiles} />
                            </div>
                          )}
                          {proofFiles.length > 0 && (
                            <div>
                              <p className="mb-2 text-[11px] font-semibold text-muted-500">إثباتات الحل</p>
                              <AttachmentGrid items={proofFiles} />
                            </div>
                          )}
                        </div>
                      )}
                    </section>

                    {/* ── Actions (server capabilities) ── */}
                    {(canAccept || canReject) && (
                      <section className="space-y-3 rounded-2xl border border-accent-500/40 bg-accent-500/5 p-5">
                        <p className="text-sm font-bold text-navy">تنتظر قبولك — هل تقبل هذا التكليف؟</p>
                        <div className="flex flex-col gap-3 sm:flex-row">
                          {canAccept && (
                            <button
                              type="button"
                              onClick={() => handleAccept(ticket.id)}
                              disabled={actionLoading}
                              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                            >
                              <ThumbsUp className="h-4 w-4" aria-hidden="true" />
                              قبول التكليف
                            </button>
                          )}
                          {canReject && (
                            <button
                              type="button"
                              onClick={() => setModal({ type: 'reject', ticketId: ticket.id, reason: '' })}
                              disabled={actionLoading}
                              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-60"
                            >
                              <ThumbsDown className="h-4 w-4" aria-hidden="true" />
                              اعتذار / رفض التكليف
                            </button>
                          )}
                        </div>
                      </section>
                    )}

                    {canComplete && (
                      <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                        <p className="text-sm font-bold text-navy">المهمة قيد التنفيذ — أنهِ وأغلق التذكرة</p>
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <button
                            type="button"
                            onClick={() => setModal({
                              type: 'resolve',
                              ticketId: ticket.id,
                              status: 'RESOLVED',
                              summary: '',
                              unresolvedReason: '',
                              internalNote: '',
                              files: [],
                            })}
                            disabled={actionLoading}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                          >
                            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                            تم الحل (Resolved)
                          </button>
                          <button
                            type="button"
                            onClick={() => setModal({
                              type: 'resolve',
                              ticketId: ticket.id,
                              status: 'UNRESOLVED',
                              summary: '',
                              unresolvedReason: '',
                              internalNote: '',
                              files: [],
                            })}
                            disabled={actionLoading}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent-500 py-2.5 text-sm font-bold text-white transition hover:bg-accent-600 disabled:opacity-60"
                          >
                            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                            تعذر الحل
                          </button>
                        </div>
                      </section>
                    )}

                    {!canAccept && !canReject && !canComplete && (
                      <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-muted-500">
                        لا توجد إجراءات متاحة لك على هذه التذكرة في حالتها الحالية.
                      </p>
                    )}

                    {/* ── Internal notes ── */}
                    <section className="border-t border-slate-100 pt-6">
                      <SectionTitle icon={<MessageSquare className="h-3.5 w-3.5" />}>
                        ملاحظات داخلية (لا يراها مقدم الطلب)
                      </SectionTitle>

                      {canNote ? (
                        <>
                          <label htmlFor="workspace-internal-note" className="sr-only">ملاحظة داخلية</label>
                          <textarea
                            id="workspace-internal-note"
                            rows={3}
                            value={internalNote}
                            onChange={(e) => setInternalNote(e.target.value)}
                            placeholder="ملاحظات تشغيلية، متطلبات تقنية، أو سياق إضافي..."
                            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-brand-500"
                          />
                          <div className="mt-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleSaveNote(ticket.id)}
                              disabled={savingNote || !internalNote.trim()}
                              className="rounded-xl bg-navy px-4 py-2 text-xs font-bold text-white transition hover:bg-ink-700 disabled:opacity-50"
                            >
                              {savingNote ? 'جاري الحفظ...' : 'حفظ الملاحظة'}
                            </button>
                          </div>
                        </>
                      ) : (
                        <p className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-xs text-muted-500">
                          <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          إضافة الملاحظات الداخلية متاحة لقيادة الإدارة فقط.
                        </p>
                      )}
                    </section>
                  </div>
                </article>
              )}
            </div>

            {/* ── Side panel ── */}
            {ticket && (
              <aside className="min-w-0 space-y-4 lg:col-span-2 xl:col-span-1" aria-label="تفاصيل التذكرة">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <SectionTitle icon={<UserIcon className="h-3.5 w-3.5" />}>بيانات التذكرة</SectionTitle>
                  <dl className="divide-y divide-slate-100">
                    <InfoRow label="مقدّم الطلب" value={ticket.created_by_name || ticket.creator?.name} />
                    <InfoRow label="الإدارة" value={ticket.department?.name_ar || ticket.department?.name} />
                    <InfoRow label="الوحدة" value={ticket.unit?.name_ar} />
                    <InfoRow label="المكلّف" value={ticket.assignee?.name} />
                    <InfoRow label="تاريخ الإنشاء" value={formatDateTime(ticket.created_at)} />
                    <InfoRow label="موعد الحل المتوقع" value={formatDateTime(ticket.expected_resolution_time)} />
                    <InfoRow label="المرفقات" value={String(attachments.length)} />
                  </dl>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <SectionTitle icon={<History className="h-3.5 w-3.5" />}>سجل الأحداث</SectionTitle>

                  {activityLogs.length === 0 ? (
                    <p className="flex items-center gap-2 text-xs text-muted-500">
                      {detailLoading ? (
                        <>
                          <CalendarClock className="h-3.5 w-3.5 animate-pulse" aria-hidden="true" />
                          جارٍ تحميل السجل…
                        </>
                      ) : (
                        'لا أحداث مسجّلة بعد.'
                      )}
                    </p>
                  ) : (
                    <ol className="relative space-y-4 border-r border-slate-200 pr-5">
                      {activityLogs.map((log, idx) => (
                        <li key={log.id ?? idx} className="relative">
                          <span className="absolute -right-[27px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-brand-500 bg-white">
                            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                          </span>
                          <p className="text-xs font-bold text-navy">{ACTION_LABEL[log.action] ?? log.action}</p>
                          {log.details && <p className="mt-0.5 break-words text-[11px] text-muted-500">{log.details}</p>}
                          <p className="mt-0.5 text-[10px] text-slate-400">
                            {[log.performed_by_name, formatDateTime(log.logged_at)].filter(Boolean).join(' — ')}
                          </p>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </aside>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════ REJECT TASK MODAL ═══════════════ */}
      {modal?.type === 'reject' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="اعتذار عن استلام التكليف"
            className="w-full max-w-md space-y-5 rounded-3xl bg-white p-8 shadow-2xl"
            dir="rtl"
          >
            <h2 className="text-lg font-extrabold text-navy">اعتذار عن استلام التكليف</h2>
            <p className="text-xs leading-relaxed text-muted-500">
              ستُعاد التذكرة لقيادة إدارة التقنية لإعادة التوجيه.
              <strong className="text-rose-600"> مبرر الاعتذار إجباري</strong> ولا يمكن تجاوزه.
            </p>
            <div>
              <label htmlFor="reject-reason" className="mb-1.5 block text-xs font-bold text-slate-700">
                مبررات الاعتذار <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="reject-reason"
                rows={4}
                value={modal.reason}
                onChange={(e) => setModal({ ...modal, reason: e.target.value })}
                placeholder="وضح سبب اعتذارك بشكل مفصل..."
                className={`w-full resize-none rounded-xl border p-3 text-sm outline-none focus:ring-2 ${
                  modal.reason.trim().length === 0 ? 'border-rose-300 focus:ring-rose-400' : 'border-slate-300 focus:ring-brand-500'
                }`}
              />
              {modal.reason.trim().length === 0 && (
                <p className="mt-1 text-[11px] text-rose-500">هذا الحقل إجباري</p>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="flex-1 rounded-xl border py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleRejectTask}
                disabled={actionLoading || !modal.reason.trim()}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-60"
              >
                {actionLoading ? 'جاري التسجيل...' : 'تأكيد الاعتذار'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ RESOLVE / UNRESOLVED MODAL ═══════════════ */}
      {modal?.type === 'resolve' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="إغلاق المهمة"
            className="max-h-[90vh] w-full max-w-lg space-y-5 overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl"
            dir="rtl"
          >
            {/* Toggle: Resolved vs Unresolved */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setModal({ ...modal, status: 'RESOLVED' })}
                className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-bold transition ${
                  modal.status === 'RESOLVED'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                تم الحل (Resolved)
              </button>
              <button
                type="button"
                onClick={() => setModal({ ...modal, status: 'UNRESOLVED' })}
                className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-bold transition ${
                  modal.status === 'UNRESOLVED'
                    ? 'border-accent-500 bg-accent-500/10 text-accent-800'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                تعذر الحل
              </button>
            </div>

            {modal.status === 'RESOLVED' ? (
              <>
                <div>
                  <label htmlFor="resolve-summary" className="mb-1.5 block text-xs font-bold text-slate-700">
                    ما الذي تم بالتفصيل لحل المشكلة؟ <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="resolve-summary"
                    rows={4}
                    value={modal.summary}
                    onChange={(e) => setModal({ ...modal, summary: e.target.value })}
                    placeholder="اشرح الإجراءات التقنية المتخذة والنتيجة التي تحققت..."
                    className={`w-full resize-none rounded-xl border p-3 text-sm outline-none focus:ring-2 ${
                      modal.summary.trim().length === 0 ? 'border-rose-300 focus:ring-rose-400' : 'border-slate-300 focus:ring-brand-500'
                    }`}
                  />
                  {modal.summary.trim().length === 0 && (
                    <p className="mt-1 text-[11px] text-rose-500">يجب ملء هذا الحقل لإغلاق التذكرة كـ تم الحل</p>
                  )}
                </div>
                {/* Proof upload */}
                <div>
                  <span className="mb-1.5 block text-xs font-bold text-slate-700">
                    رفع إثبات الحل (صورة / فيديو — اختياري)
                  </span>
                  <label
                    htmlFor="proof-upload-input"
                    className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-5 text-center transition hover:border-brand-500"
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
                    <UploadCloud className="mx-auto mb-1 h-7 w-7 text-slate-400" aria-hidden="true" />
                    <p className="text-xs text-slate-500">اضغط لرفع صورة أو فيديو إثبات</p>
                  </label>
                  {modal.files.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {modal.files.map((f, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs">
                          <span className="min-w-0 truncate">{f.name}</span>
                          <button
                            type="button"
                            aria-label={`إزالة ${f.name}`}
                            onClick={() => setModal({ ...modal, files: modal.files.filter((_, fi) => fi !== i) })}
                            className="p-0.5 text-rose-500 hover:text-rose-700"
                          >
                            <X className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div>
                <label htmlFor="unresolved-reason" className="mb-1.5 block text-xs font-bold text-slate-700">
                  أسباب تعذر الحل والعوائق الفنية <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="unresolved-reason"
                  rows={4}
                  value={modal.unresolvedReason}
                  onChange={(e) => setModal({ ...modal, unresolvedReason: e.target.value })}
                  placeholder="وضح العوائق الفنية أو الصلاحيات اللازمة أو الجهة الأعلى التي يجب إحالتها..."
                  className={`w-full resize-none rounded-xl border p-3 text-sm outline-none focus:ring-2 ${
                    modal.unresolvedReason.trim().length === 0 ? 'border-rose-300 focus:ring-rose-400' : 'border-slate-300 focus:ring-brand-500'
                  }`}
                />
                {modal.unresolvedReason.trim().length === 0 && (
                  <p className="mt-1 text-[11px] text-rose-500">يجب توثيق أسباب تعذر الحل قبل التصعيد</p>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="flex-1 rounded-xl border py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleComplete}
                disabled={actionLoading}
                className={`flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition disabled:opacity-60 ${
                  modal.status === 'RESOLVED'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-accent-500 hover:bg-accent-600'
                }`}
              >
                {actionLoading ? 'جاري الحفظ...' : modal.status === 'RESOLVED' ? 'تأكيد الإغلاق (تم الحل)' : 'تصعيد تعذر الحل'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssigneeWorkspacePage;
