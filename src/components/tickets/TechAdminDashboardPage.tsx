import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router';
import { ticketService } from '@/services/ticketService';
import type { TicketFilterParams } from '@/services/ticketService';
import type { Ticket, TicketStatus } from '@/types/ticket';
import TicketStatusBadge from './TicketStatusBadge';
import SlaCountdownTimer from './SlaCountdownTimer';
import { ApproveTicketModal } from '@/components/tickets/modals/ApproveTicketModal';
import { RejectTicketModal } from '@/components/tickets/modals/RejectTicketModal';
import { ReassignTicketModal } from '@/components/tickets/modals/ReassignTicketModal';
import {
  LayoutDashboard,
  RefreshCw,
  CheckCircle2,
  XCircle,
  UserCheck,
  AlertTriangle,
  Filter,
  Search,
  Clock,
  Building2,
  Layers,
  ChevronDown,
  ArrowRight,
  FileBarChart2,
  RotateCcw,
} from 'lucide-react';
import toast from '@/lib/toast';

// ── Types ──────────────────────────────────────────────────────────────────
type ActiveModal =
  | { type: 'approve'; ticketId: number; departmentId: number }
  | { type: 'reject'; ticketId: number }
  | { type: 'reassign'; ticketId: number; departmentId: number; unitId?: number }
  | null;

const CLOSED_STATUSES = ['RESOLVED', 'REJECTED_BY_ADMIN', 'UNRESOLVED'];

const STATUS_FILTER_OPTS = [
  { value: '', label: 'جميع الحالات' },
  { value: 'PENDING_APPROVAL', label: 'معلقة — بانتظار الاعتماد' },
  { value: 'ASSIGNED', label: 'معتمدة — محالة للمكلف' },
  { value: 'IN_PROGRESS', label: 'قيد التنفيذ' },
  { value: 'RESOLVED', label: 'تم الحل' },
  { value: 'UNRESOLVED', label: 'تعذر الحل' },
  { value: 'REJECTED_BY_ADMIN', label: 'مرفوضة إدارياً' },
  { value: 'REJECTED_BY_ASSIGNEE', label: 'اعتذر المكلف' },
];

// ── Helpers ─────────────────────────────────────────────────────────────────
function formatShortDate(str: string) {
  return new Date(str).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Component ────────────────────────────────────────────────────────────────
const TechAdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [tickets, setTickets]       = useState<Ticket[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading]       = useState(true);

  // Filters live in the URL query string, not local state — so returning
  // here via a ticket's "رجوع" restores the exact same filtered/paged view
  // (Detail passes `state: { from: location.pathname + location.search }`),
  // and a bare refresh doesn't silently reset the table either. Mirrors the
  // established pattern already used by OpsSupportTicketsPage.
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') ?? '';
  const search       = searchParams.get('search') ?? '';
  const delayedOnly  = searchParams.get('delayed') === '1';
  const currentPage  = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);

  const updateParams = useCallback((patch: Record<string, string | null>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === '') next.delete(key);
        else next.set(key, value);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setStatusFilter = (v: string) => updateParams({ status: v, page: null });
  const setSearch = (v: string) => updateParams({ search: v, page: null });
  const setDelayedOnly = (v: boolean) => updateParams({ delayed: v ? '1' : null, page: null });
  const setCurrentPage = (v: number | ((p: number) => number)) => {
    const next = typeof v === 'function' ? v(currentPage) : v;
    updateParams({ page: next > 1 ? String(next) : null });
  };

  // Modal state — the approve/reject/reassign modals own their own unit/user
  // loading now; this page just decides WHICH one is open, for WHICH ticket.
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: TicketFilterParams = {
        per_page: 25,
        page: currentPage,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(delayedOnly ? { delayed_only: true } : {}),
      };
      const res = await ticketService.getTickets(params);
      if (res.success) {
        setTickets(res.data.data ?? []);
        setTotalCount(res.data.total ?? 0);
      }
    } catch {
      toast.error('تعذر تحميل لوحة التحكم');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, delayedOnly, currentPage]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const closeModal = () => setActiveModal(null);
  const handleActionSuccess = () => {
    closeModal();
    fetchData();
  };

  const openTicket = (ticketId: number) => {
    // Carries the exact filtered/paged URL back through Detail's "رجوع".
    navigate(`/dashboard/tickets/${ticketId}`, {
      state: { from: `${location.pathname}${location.search}` },
    });
  };

  const handleRowKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>, ticketId: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      openTicket(ticketId);
    }
  };

  // ── KPI counts — is_delayed is backend-owned (Ticket::getIsDelayedAttribute),
  //    never recomputed here from expected_resolution_time. ──────────────────
  const pendingCount  = tickets.filter((t) => t.status === 'PENDING_APPROVAL').length;
  const activeCount   = tickets.filter((t) => ['ASSIGNED', 'IN_PROGRESS'].includes(t.status)).length;
  const delayedCount  = tickets.filter((t) => t.is_delayed).length;
  const resolvedCount = tickets.filter((t) => t.status === 'RESOLVED').length;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 font-sans text-slate-800" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold mb-1">
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>لوحة التحكم التقنية</span>
              <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
              <span className="text-slate-700">غرفة العمليات — رقابة التذاكر</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">مركز قيادة التذاكر والـ SLA</h1>
            <p className="text-xs text-slate-500 mt-1">مخصص لمدير الإدارة التقنية ونائبه — اعتماد، رفض، إعادة توجيه، ومراقبة التأخيرات</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/dashboard/tickets/new')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-white text-xs font-bold transition"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              إدخال تذكرة جديدة
            </button>
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              تحديث
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'معلقة — تنتظر الاعتماد', value: pendingCount,  icon: <Clock className="w-5 h-5" />,          bg: 'bg-amber-50 border-amber-200',  text: 'text-amber-700' },
            { label: 'نشطة (مُحالة + تُنفَّذ)',  value: activeCount,   icon: <CheckCircle2 className="w-5 h-5" />,   bg: 'bg-blue-50 border-blue-200',    text: 'text-blue-700' },
            { label: 'متأخرة عن موعد الإغلاق',  value: delayedCount,  icon: <AlertTriangle className="w-5 h-5" />,  bg: 'bg-rose-50 border-rose-200',    text: 'text-rose-700' },
            { label: 'مغلقة بنجاح (تم الحل)',   value: resolvedCount, icon: <FileBarChart2 className="w-5 h-5" />, bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
          ].map((kpi, i) => (
            <div key={i} className={`rounded-2xl border p-5 flex items-center gap-4 ${kpi.bg}`}>
              <div className={`${kpi.text} shrink-0`}>{kpi.icon}</div>
              <div>
                <p className={`text-2xl font-extrabold ${kpi.text}`}>{kpi.value}</p>
                <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{kpi.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="بحث بالرقم، العنوان، أو اسم المُدخل..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pr-9 pl-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="rounded-xl border border-slate-200 text-sm px-3 py-2.5 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {STATUS_FILTER_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs font-bold text-rose-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={delayedOnly}
              onChange={(e) => { setDelayedOnly(e.target.checked); setCurrentPage(1); }}
              className="rounded accent-rose-600"
            />
            متأخرة فقط
          </label>
          <span className="text-xs text-slate-400 mr-auto">إجمالي: {totalCount} تذكرة</span>
        </div>

        {/* Ticket Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-16 text-center">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-400 text-sm">جاري تحميل التذاكر...</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-16 text-center text-slate-400">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-bold text-slate-600">لا توجد تذاكر مطابقة للفلتر الحالي</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-5 py-3.5 text-xs font-bold text-slate-500">رقم التذكرة</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-slate-500">العنوان والنوع</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-slate-500">الإدارة</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-slate-500">الحالة</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-slate-500">وقت الإدراج</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-slate-500">الموعد / العداد</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-slate-500">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tickets.map((ticket) => {
                    const delayed = Boolean(ticket.is_delayed);
                    const isClosed = CLOSED_STATUSES.includes(ticket.status);
                    const caps = ticket.capabilities;

                    return (
                      <tr
                        key={ticket.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`فتح التذكرة ${ticket.ticket_number}`}
                        onClick={() => openTicket(ticket.id)}
                        onKeyDown={(e) => handleRowKeyDown(e, ticket.id)}
                        className={`cursor-pointer hover:bg-slate-100 focus:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 transition ${delayed ? 'bg-rose-50/30' : ''}`}
                      >
                        {/* Ticket # — a real link: keyboard/right-click/open-in-new-tab
                            all still work independently of the row's own click handler. */}
                        <td className="px-5 py-4">
                          <Link
                            to={`/dashboard/tickets/${ticket.id}`}
                            state={{ from: `${location.pathname}${location.search}` }}
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-600 hover:text-blue-800 font-mono font-bold text-xs hover:underline"
                          >
                            {ticket.ticket_number}
                          </Link>
                          {delayed && (
                            <span className="block mt-1 text-[10px] font-bold text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded-full w-fit">
                              ⚠️ متأخرة
                            </span>
                          )}
                        </td>

                        {/* Title */}
                        <td className="px-5 py-4 max-w-[220px]">
                          <p className="font-bold text-slate-800 truncate text-xs">{ticket.title}</p>
                          <span className={`text-[10px] font-bold mt-0.5 inline-block px-1.5 py-0.5 rounded-full ${
                            ticket.ticket_category === 'OLD_ISSUE'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {ticket.ticket_category === 'OLD_ISSUE' ? '⚠️ مشكلة' : '💡 مقترح'}
                          </span>
                        </td>

                        {/* Department */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[100px]">{ticket.department?.name_ar ?? '—'}</span>
                          </div>
                          {ticket.unit && (
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                              <Layers className="w-3 h-3 shrink-0" />
                              <span className="truncate max-w-[100px]">{ticket.unit.name_ar}</span>
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <TicketStatusBadge status={ticket.status as TicketStatus} />
                          {ticket.assignee && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                              <UserCheck className="w-3 h-3" />
                              <span>{ticket.assignee.name}</span>
                            </div>
                          )}
                        </td>

                        {/* Created At */}
                        <td className="px-5 py-4 text-[11px] text-slate-500 whitespace-nowrap">
                          {formatShortDate(ticket.created_at)}
                        </td>

                        {/* Deadline / SLA */}
                        <td className="px-5 py-4">
                          {ticket.expected_resolution_time ? (
                            !isClosed ? (
                              <SlaCountdownTimer
                                expectedTime={ticket.expected_resolution_time}
                                status={ticket.status}
                                showIcon={false}
                                className="text-[11px]"
                              />
                            ) : (
                              <span className="text-[10px] text-slate-400">
                                {formatShortDate(ticket.expected_resolution_time)}
                              </span>
                            )
                          ) : (
                            <span className="text-[10px] text-slate-300">—</span>
                          )}
                        </td>

                        {/* Actions — every button gated on the server-computed
                            capability, never on a re-derived status check, and
                            every click stops propagation so it never also
                            triggers the row's own navigation. */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {caps?.approve && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveModal({ type: 'approve', ticketId: ticket.id, departmentId: ticket.department_id });
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                ✅ اعتماد
                              </button>
                            )}
                            {caps?.reject && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveModal({ type: 'reject', ticketId: ticket.id });
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold transition"
                              >
                                <XCircle className="w-3 h-3" />
                                ❌ رفض
                              </button>
                            )}
                            {caps?.reassign && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveModal({
                                    type: 'reassign',
                                    ticketId: ticket.id,
                                    departmentId: ticket.department_id,
                                    unitId: ticket.unit_id ?? undefined,
                                  });
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition"
                              >
                                <RotateCcw className="w-3 h-3" />
                                {ticket.assignee ? '🔄 إعادة توجيه' : '➕ تعيين'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalCount > 25 && (
          <div className="flex justify-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="px-4 py-2 rounded-xl border text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
            >
              السابق
            </button>
            <span className="px-4 py-2 text-sm text-slate-500">صفحة {currentPage}</span>
            <button
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-4 py-2 rounded-xl border text-sm font-bold text-slate-600 hover:bg-slate-100"
            >
              التالي
            </button>
          </div>
        )}
      </div>

      {/* Modals — same shared components TicketDetailPage uses, so both
          surfaces call the exact same backend operation with no drift. */}
      {activeModal?.type === 'approve' && (
        <ApproveTicketModal
          ticketId={activeModal.ticketId}
          departmentId={activeModal.departmentId}
          onClose={closeModal}
          onSuccess={handleActionSuccess}
        />
      )}
      {activeModal?.type === 'reject' && (
        <RejectTicketModal
          ticketId={activeModal.ticketId}
          onClose={closeModal}
          onSuccess={handleActionSuccess}
        />
      )}
      {activeModal?.type === 'reassign' && (
        <ReassignTicketModal
          ticketId={activeModal.ticketId}
          departmentId={activeModal.departmentId}
          currentUnitId={activeModal.unitId}
          onClose={closeModal}
          onSuccess={handleActionSuccess}
        />
      )}
    </div>
  );
};

export default TechAdminDashboardPage;
