import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { ticketService } from '@/services/ticketService';
import type { TicketFilterParams } from '@/services/ticketService';
import type { Ticket, TicketStatus, DepartmentalUnit, TicketUser } from '@/types/ticket';
import TicketStatusBadge from './TicketStatusBadge';
import SlaCountdownTimer from './SlaCountdownTimer';
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
interface ApproveModalState {
  ticketId: number;
  unitId: string;
  assignedToId: string;
  slaHours: string;
  notes: string;
}

interface RejectModalState {
  ticketId: number;
  reason: string;
}

interface ReassignModalState {
  ticketId: number;
  assignedToId: string;
  unitId: string;
  reason: string;
}

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

const SLA_HOUR_OPTIONS = [
  { value: '4',   label: '4 ساعات' },
  { value: '8',   label: '8 ساعات (يوم عمل)' },
  { value: '24',  label: '24 ساعة' },
  { value: '48',  label: '48 ساعة (يومان)' },
  { value: '72',  label: '72 ساعة (3 أيام)' },
  { value: '120', label: '5 أيام عمل' },
  { value: '168', label: 'أسبوع كامل' },
];

// ── Helpers ─────────────────────────────────────────────────────────────────
function isDelayed(ticket: Ticket): boolean {
  if (!ticket.expected_resolution_time) return false;
  if (CLOSED_STATUSES.includes(ticket.status)) return false;
  return new Date() > new Date(ticket.expected_resolution_time);
}

function formatShortDate(str: string) {
  return new Date(str).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Component ────────────────────────────────────────────────────────────────
const TechAdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const [tickets, setTickets]       = useState<Ticket[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [units, setUnits]           = useState<DepartmentalUnit[]>([]);
  const [users, setUsers]           = useState<TicketUser[]>([]);
  const [loading, setLoading]       = useState(true);

  // Filters
  const [statusFilter, setStatusFilter]   = useState('');
  const [search, setSearch]               = useState('');
  const [delayedOnly, setDelayedOnly]     = useState(false);
  const [currentPage, setCurrentPage]     = useState(1);

  // Modals
  const [approveModal, setApproveModal]   = useState<ApproveModalState | null>(null);
  const [rejectModal, setRejectModal]     = useState<RejectModalState | null>(null);
  const [reassignModal, setReassignModal] = useState<ReassignModalState | null>(null);

  // Submission loading
  const [actionLoading, setActionLoading] = useState(false);

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
      const [res, meta] = await Promise.all([
        ticketService.getTickets(params),
        ticketService.getMeta(),
      ]);
      if (res.success) {
        setTickets(res.data.data ?? []);
        setTotalCount(res.data.total ?? 0);
      }
      setUnits(meta.tech_units ?? []);
      setUsers(meta.users ?? []);
    } catch {
      toast.error('تعذر تحميل لوحة التحكم');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, delayedOnly, currentPage]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── KPI counts ────────────────────────────────────────────────────────
  const pendingCount  = tickets.filter((t) => t.status === 'PENDING_APPROVAL').length;
  const activeCount   = tickets.filter((t) => ['ASSIGNED', 'IN_PROGRESS'].includes(t.status)).length;
  const delayedCount  = tickets.filter(isDelayed).length;
  const resolvedCount = tickets.filter((t) => t.status === 'RESOLVED').length;

  // ── Actions ────────────────────────────────────────────────────────────
  const handleApprove = async () => {
    if (!approveModal) return;
    if (!approveModal.assignedToId || !approveModal.unitId || !approveModal.slaHours) {
      toast.error('يجب تحديد الوحدة التقنية والمكلف ومدة الـ SLA');
      return;
    }
    setActionLoading(true);
    try {
      await ticketService.approveTicket(approveModal.ticketId, {
        unit_id:        Number(approveModal.unitId),
        assigned_to_id: Number(approveModal.assignedToId),
        sla_hours:      Number(approveModal.slaHours),
        internal_notes: approveModal.notes,
      });
      toast.success('تم اعتماد التذكرة وإحالتها للمكلف');
      setApproveModal(null);
      fetchData();
    } catch {
      toast.error('حدث خطأ أثناء الاعتماد');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    if (!rejectModal.reason.trim()) {
      toast.error('سبب الرفض إجباري ولا يمكن تجاوزه');
      return;
    }
    setActionLoading(true);
    try {
      await ticketService.rejectByAdmin(rejectModal.ticketId, rejectModal.reason.trim());
      toast.success('تم رفض التذكرة وإشعار المُدخل بالسبب');
      setRejectModal(null);
      fetchData();
    } catch {
      toast.error('حدث خطأ أثناء الرفض');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReassign = async () => {
    if (!reassignModal) return;
    if (!reassignModal.assignedToId) {
      toast.error('يجب اختيار المكلف الجديد');
      return;
    }
    setActionLoading(true);
    try {
      await ticketService.reassign(reassignModal.ticketId, {
        assigned_to_id: Number(reassignModal.assignedToId),
        unit_id:         reassignModal.unitId ? Number(reassignModal.unitId) : undefined,
        reason:          reassignModal.reason,
      });
      toast.success('تمت إعادة التوجيه وتغيير المكلف');
      setReassignModal(null);
      fetchData();
    } catch {
      toast.error('حدث خطأ أثناء إعادة التوجيه');
    } finally {
      setActionLoading(false);
    }
  };

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
              onClick={() => navigate('/tickets/new')}
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
                    const delayed = isDelayed(ticket);
                    const isClosed = CLOSED_STATUSES.includes(ticket.status);

                    return (
                      <tr
                        key={ticket.id}
                        className={`hover:bg-slate-50 transition ${delayed ? 'bg-rose-50/30' : ''}`}
                      >
                        {/* Ticket # */}
                        <td className="px-5 py-4">
                          <button
                            onClick={() => navigate(`/tickets/${ticket.id}`)}
                            className="text-blue-600 hover:text-blue-800 font-mono font-bold text-xs hover:underline"
                          >
                            {ticket.ticket_number}
                          </button>
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

                        {/* Actions */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {ticket.status === 'PENDING_APPROVAL' && (
                              <>
                                <button
                                  onClick={() => setApproveModal({
                                    ticketId: ticket.id,
                                    unitId: '',
                                    assignedToId: '',
                                    slaHours: '24',
                                    notes: '',
                                  })}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  ✅ اعتماد
                                </button>
                                <button
                                  onClick={() => setRejectModal({ ticketId: ticket.id, reason: '' })}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold transition"
                                >
                                  <XCircle className="w-3 h-3" />
                                  ❌ رفض
                                </button>
                              </>
                            )}
                            {['ASSIGNED', 'IN_PROGRESS', 'REJECTED_BY_ASSIGNEE'].includes(ticket.status) && (
                              <button
                                onClick={() => setReassignModal({
                                  ticketId: ticket.id,
                                  assignedToId: '',
                                  unitId: ticket.unit_id ? String(ticket.unit_id) : '',
                                  reason: '',
                                })}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition"
                              >
                                <RotateCcw className="w-3 h-3" />
                                🔄 إعادة توجيه
                              </button>
                            )}
                            <button
                              onClick={() => navigate(`/tickets/${ticket.id}`)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 text-[11px] font-bold transition"
                            >
                              عرض
                            </button>
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

      {/* ═══════════════════ APPROVE MODAL ═══════════════════ */}
      {approveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 space-y-5" dir="rtl">
            <h2 className="text-lg font-extrabold text-slate-900">✅ اعتماد التذكرة وتحديد التكليف</h2>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                الوحدة التقنية المستهدفة <span className="text-rose-500">*</span>
              </label>
              <select
                value={approveModal.unitId}
                onChange={(e) => setApproveModal({ ...approveModal, unitId: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">-- اختر الوحدة التقنية (من الوحدات الثماني) --</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>{u.name_ar}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                الموظف المكلف بالإنجاز <span className="text-rose-500">*</span>
              </label>
              <select
                value={approveModal.assignedToId}
                onChange={(e) => setApproveModal({ ...approveModal, assignedToId: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">-- اختر المكلف --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                مدة الـ SLA المسموح بها <span className="text-rose-500">*</span>
              </label>
              <select
                value={approveModal.slaHours}
                onChange={(e) => setApproveModal({ ...approveModal, slaHours: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {SLA_HOUR_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">ملاحظات داخلية (اختياري)</label>
              <textarea
                rows={2}
                value={approveModal.notes}
                onChange={(e) => setApproveModal({ ...approveModal, notes: e.target.value })}
                placeholder="توجيهات للمكلف أو السياق الإضافي..."
                className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setApproveModal(null)}
                className="px-5 py-2.5 rounded-xl border text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition disabled:opacity-60"
              >
                {actionLoading ? 'جاري الاعتماد...' : '✅ تأكيد الاعتماد والإحالة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ REJECT MODAL ═══════════════════ */}
      {rejectModal && (
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
                value={rejectModal.reason}
                onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                placeholder="اكتب سبباً واضحاً ومفصلاً للرفض..."
                className={`w-full rounded-xl border p-3 text-sm focus:ring-2 outline-none resize-none ${
                  rejectModal.reason.trim().length === 0
                    ? 'border-rose-300 focus:ring-rose-400'
                    : 'border-slate-300 focus:ring-blue-500'
                }`}
              />
              {rejectModal.reason.trim().length === 0 && (
                <p className="text-[11px] text-rose-500 mt-1">⚠️ لا يمكن حفظ الرفض بدون سبب</p>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setRejectModal(null)}
                className="px-5 py-2.5 rounded-xl border text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectModal.reason.trim()}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold transition disabled:opacity-60"
              >
                {actionLoading ? 'جاري الرفض...' : '❌ تأكيد الرفض'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ REASSIGN MODAL ═══════════════════ */}
      {reassignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-5" dir="rtl">
            <h2 className="text-lg font-extrabold text-slate-900">🔄 إعادة التوجيه وتغيير المكلف</h2>
            <p className="text-xs text-slate-500">ستُعاد التذكرة لحالة (معتمدة) وتُحال للمكلف الجديد.</p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">المكلف الجديد <span className="text-rose-500">*</span></label>
              <select
                value={reassignModal.assignedToId}
                onChange={(e) => setReassignModal({ ...reassignModal, assignedToId: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">-- اختر المكلف الجديد --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">الوحدة التقنية (اختياري)</label>
              <select
                value={reassignModal.unitId}
                onChange={(e) => setReassignModal({ ...reassignModal, unitId: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">— إبقاء الوحدة الحالية —</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>{u.name_ar}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">سبب إعادة التوجيه (اختياري)</label>
              <input
                type="text"
                value={reassignModal.reason}
                onChange={(e) => setReassignModal({ ...reassignModal, reason: e.target.value })}
                placeholder="مثال: اعتذار المكلف الأول، تغيير في النطاق..."
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setReassignModal(null)}
                className="px-5 py-2.5 rounded-xl border text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleReassign}
                disabled={actionLoading || !reassignModal.assignedToId}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition disabled:opacity-60"
              >
                {actionLoading ? 'جاري الحفظ...' : '🔄 تأكيد إعادة التوجيه'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechAdminDashboardPage;
