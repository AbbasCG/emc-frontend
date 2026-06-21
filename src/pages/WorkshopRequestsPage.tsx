import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Loader2,
  RefreshCw,
  Search,
  X,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  approveWorkshopRequest,
  fetchAdminWorkshopRequests,
  rejectWorkshopRequest,
  type WorkshopRequestDetail,
  type WorkshopRequestsPage as WRPage,
} from '../api/workshopRequestsApi'
import { useAuth } from '../contexts/AuthContext'
import type { User } from '../types'
import { cn } from '@/lib/utils'

const ROLE_TO_DEPT: Record<string, string> = {
  quality_manager:    'quality_governance',
  finance_manager:    'finance',
  marketing_manager:  'media_marketing',
  executive_admin:    'executive_admin',
  programs_manager:   'programs_tracks',
  operations_manager: 'operations',
}

function getEffectiveDept(user: User | null): string | null {
  if (!user) return null
  const role = user.role ?? ''
  if (ROLE_TO_DEPT[role]) return ROLE_TO_DEPT[role]
  return user.department ?? null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const WORKFLOW_STATUS_META: Record<string, { label: string; color: string }> = {
  pending:        { label: 'قيد الانتظار',  color: 'bg-amber-50 text-amber-700 ring-amber-200/70' },
  in_review:      { label: 'قيد المراجعة',  color: 'bg-blue-50 text-blue-700 ring-blue-200/70' },
  final_approval: { label: 'موافقة نهائية', color: 'bg-purple-50 text-purple-700 ring-purple-200/70' },
  final_approved: { label: 'تمت الموافقة',  color: 'bg-emerald-50 text-emerald-700 ring-emerald-200/70' },
  rejected:       { label: 'مرفوض',         color: 'bg-red-50 text-red-700 ring-red-200/70' },
}

const DEPT_LABELS: Record<string, string> = {
  quality_governance: 'إدارة الجودة والحوكمة',
  programs_tracks:    'إدارة البرامج والمسارات',
  operations:         'إدارة العمليات والتشغيل',
  finance:            'الإدارة المالية',
  media_marketing:    'إدارة الإعلام والتسويق',
  executive_admin:    'الإدارة العليا',
}

const FILTER_OPTIONS = [
  { value: '',               label: 'الكل' },
  { value: 'pending',        label: 'قيد الانتظار' },
  { value: 'in_review',      label: 'قيد المراجعة' },
  { value: 'final_approval', label: 'موافقة نهائية' },
  { value: 'final_approved', label: 'تمت الموافقة' },
  { value: 'rejected',       label: 'مرفوض' },
]

// ── Quick reject modal ────────────────────────────────────────────────────────

function QuickRejectModal({
  req,
  onCancel,
  onConfirm,
}: {
  req: WorkshopRequestDetail
  onCancel: () => void
  onConfirm: (notes: string) => Promise<void>
}) {
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function submit() {
    if (!notes.trim()) { setErr('يرجى كتابة سبب الرفض.'); return }
    setLoading(true); setErr('')
    try { await onConfirm(notes) }
    catch { setErr('حدث خطأ، يرجى المحاولة مرة أخرى.') }
    finally { setLoading(false) }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center bg-[#0F172A]/60 px-4 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.93, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
        className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-[0_28px_80px_-16px_rgba(12, 42, 75,0.35)] ring-1 ring-slate-200/60"
        dir="rtl"
      >
        <div className="flex items-center gap-3 bg-red-50 px-6 py-4">
          <XCircle className="h-5 w-5 shrink-0 text-red-500" />
          <div>
            <p className="text-[14px] font-black text-[#0C2A4B]">رفض الطلب</p>
            <p className="text-[11px] font-semibold text-slate-500">{req.program_name}</p>
          </div>
        </div>
        <div className="px-6 py-5">
          <label className="block text-[13px] font-black text-[#0C2A4B]">سبب الرفض (مطلوب)</label>
          <textarea
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] font-semibold text-slate-700 placeholder:text-slate-400 focus:border-[#0077B6]/50 focus:outline-none focus:ring-2 focus:ring-[#0077B6]/15"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="اكتب سبب الرفض..."
          />
          {err && <p className="mt-1.5 text-[12px] font-bold text-red-600">{err}</p>}
          <div className="mt-4 flex gap-3">
            <button type="button" onClick={onCancel} disabled={loading}
              className="flex-1 rounded-2xl border-2 border-slate-200 bg-white py-2.5 text-[13px] font-black text-slate-600 hover:border-slate-300 disabled:opacity-50">
              إلغاء
            </button>
            <button type="button" onClick={() => void submit()} disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-2xl bg-red-500 py-2.5 text-[13px] font-black text-white shadow-[0_8px_20px_rgba(239,68,68,0.3)] hover:bg-red-600 disabled:opacity-60">
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              تأكيد الرفض
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WorkshopRequestsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [data, setData] = useState<WRPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rejectTarget, setRejectTarget] = useState<WorkshopRequestDetail | null>(null)
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const result = await fetchAdminWorkshopRequests({
        page, per_page: 15,
        ...(filterStatus ? { workflow_status: filterStatus } : {}),
        ...(search ? { search } : {}),
      })
      setData(result)
    } catch {
      setError('تعذّر تحميل الطلبات. يرجى المحاولة مرة أخرى.')
    } finally {
      setLoading(false)
    }
  }, [page, filterStatus, search])

  useEffect(() => { void load() }, [load])

  // Debounce search
  function handleSearchInput(val: string) {
    setSearchInput(val)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setSearch(val.trim())
      setPage(1)
    }, 350)
  }

  async function handleQuickApprove(req: WorkshopRequestDetail) {
    setActionMsg(null)
    try {
      await approveWorkshopRequest(req.id)
      setActionMsg({ type: 'success', text: `تمت الموافقة على "${req.program_name}" وتحويله للمرحلة التالية.` })
      await load()
    } catch {
      setActionMsg({ type: 'error', text: 'فشلت عملية الموافقة. يرجى المحاولة من صفحة التفاصيل.' })
    }
  }

  async function handleQuickReject(req: WorkshopRequestDetail, notes: string) {
    await rejectWorkshopRequest(req.id, notes)
    setRejectTarget(null)
    setActionMsg({ type: 'success', text: `تم رفض "${req.program_name}".` })
    await load()
  }

  const requests = data?.data ?? []
  const deptLabel = DEPT_LABELS[user?.department ?? ''] ?? user?.department ?? user?.role ?? ''
  const isAdmin = ['admin', 'super_admin', 'executive_admin'].includes(user?.role ?? '')

  return (
    <main dir="rtl" className="min-h-screen bg-gradient-to-br from-[#f1f5f9] via-white to-[#0077B6]/[0.05] pb-20 pt-[5.25rem]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="relative overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-l from-[#0C2A4B] via-[#1a2940] to-[#0F172A] px-5 py-7 text-white shadow-[0_24px_60px_-12px_rgba(15,23,42,0.35)] sm:px-8 sm:py-8"
        >
          <div className="pointer-events-none absolute -left-24 top-0 h-48 w-48 rounded-full bg-[#0077B6]/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 end-10 h-40 w-40 rounded-full bg-[#F28C00]/20 blur-3xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-4 text-right">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#F28C00]">إدارة الطلبات</p>
              <h1 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">طلبات البرامج التدريبية</h1>
              <p className="mt-2 text-[14px] font-semibold text-white/80">
                مراجعة وإدارة طلبات الورش عبر مراحل الاعتماد السبع
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {deptLabel && (
                <span className="rounded-2xl border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-black text-white/90">
                  {deptLabel}
                </span>
              )}
              {data && (
                <span className="rounded-2xl bg-[#0077B6]/30 px-3 py-1.5 text-[11px] font-black text-white">
                  {data.total} طلب
                </span>
              )}
              <button
                type="button"
                onClick={() => void load()}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-white/20 bg-white/10 px-3 py-1.5 text-[12px] font-black text-white/90 transition hover:bg-white/20 disabled:opacity-50"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                تحديث
              </button>
            </div>
          </div>
        </motion.div>

        {/* Action feedback */}
        <AnimatePresence>
          {actionMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={cn(
                'mt-4 flex items-center justify-between gap-3 rounded-2xl px-5 py-3 text-[13px] font-bold ring-1',
                actionMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                  : 'bg-red-50 text-red-700 ring-red-200',
              )}
            >
              <span>{actionMsg.text}</span>
              <button type="button" onClick={() => setActionMsg(null)}>
                <X className="h-4 w-4 opacity-60" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search + Filters */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute end-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              dir="rtl"
              placeholder="البحث باسم البرنامج أو مقدم الطلب..."
              value={searchInput}
              onChange={(e) => handleSearchInput(e.target.value)}
              className="w-full rounded-2xl border border-slate-200/80 bg-white py-2.5 pe-10 ps-4 text-[13px] font-semibold text-slate-700 placeholder:text-slate-400 focus:border-[#0077B6]/50 focus:outline-none focus:ring-2 focus:ring-[#0077B6]/15 sm:max-w-sm"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => { setSearchInput(''); setSearch(''); setPage(1) }}
                className="absolute end-9 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Status filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { setPage(1); setFilterStatus(opt.value) }}
                className={cn(
                  'rounded-2xl px-3.5 py-1.5 text-[12px] font-black ring-1 transition',
                  filterStatus === opt.value
                    ? 'bg-[#0077B6] text-white ring-[#0077B6]'
                    : 'bg-white text-slate-600 ring-slate-200 hover:ring-[#0077B6]/35',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.06 }}
          className="mt-5 overflow-hidden rounded-3xl border border-white/70 bg-white/80 shadow-[0_20px_60px_-18px_rgba(12, 42, 75,0.14)] backdrop-blur-md ring-1 ring-slate-200/45"
        >
          {loading && (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-[#0077B6]" />
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center gap-3 py-24 text-center">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <p className="text-[14px] font-bold text-slate-600">{error}</p>
              <button type="button" onClick={() => void load()}
                className="mt-1 rounded-2xl bg-[#0077B6] px-5 py-2 text-[13px] font-black text-white">
                إعادة المحاولة
              </button>
            </div>
          )}

          {!loading && !error && requests.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-24 text-center">
              <ClipboardList className="h-10 w-10 text-slate-300" />
              <p className="text-[14px] font-bold text-slate-500">
                {search ? `لا توجد نتائج لـ "${search}"` : 'لا توجد طلبات مطابقة'}
              </p>
              {search && (
                <button type="button" onClick={() => { setSearchInput(''); setSearch('') }}
                  className="text-[13px] font-bold text-[#0077B6] hover:underline">
                  مسح البحث
                </button>
              )}
            </div>
          )}

          {!loading && !error && requests.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-right">
                <thead>
                  <tr className="border-b border-slate-200/70 bg-slate-50/60 text-[11px] font-black uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 pe-5 ps-4">#</th>
                    <th className="py-3.5 pe-3">البرنامج</th>
                    <th className="py-3.5 pe-3">مقدم الطلب</th>
                    <th className="py-3.5 pe-3">المرحلة الحالية</th>
                    <th className="py-3.5 pe-3">الحالة</th>
                    <th className="py-3.5 pe-3">التاريخ</th>
                    <th className="py-3.5 pe-3 text-center">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {requests.map((req, idx) => {
                      const wfMeta = WORKFLOW_STATUS_META[req.workflow_status] ?? {
                        label: req.workflow_status ?? req.status,
                        color: 'bg-slate-100 text-slate-600 ring-slate-200',
                      }
                      const isFinal = ['final_approved', 'rejected'].includes(req.workflow_status)
                      // Use backend-computed can_act when available; fall back to client-side check
                      const effectiveDept = getEffectiveDept(user)
                      const isCurrentDept = effectiveDept !== null && effectiveDept === req.current_department
                      const isExecStep7 = req.current_step === 7 &&
                        (user?.role === 'executive_admin' || user?.role === 'super_admin')
                      const canQuickAct = !isFinal && !req.is_history_viewer &&
                        (isAdmin || req.can_act === true || isCurrentDept || isExecStep7)
                      const isHistoryViewer = req.is_history_viewer === true && !isFinal

                      return (
                        <motion.tr
                          key={req.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.18, delay: idx * 0.025 }}
                          className="group cursor-pointer border-b border-slate-100 transition-colors hover:bg-[#0077B6]/[0.025]"
                          onClick={() => navigate(`/dashboard/admin/workshop-requests/${req.id}`)}
                        >
                          <td className="py-4 pe-5 ps-4 text-[12px] font-black text-slate-400">
                            {req.id}
                          </td>
                          <td className="py-4 pe-3 max-w-[220px]">
                            <p className="truncate text-[13px] font-black text-[#0C2A4B]">{req.program_name}</p>
                            <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                              خطوة {req.current_step} / 7
                            </p>
                          </td>
                          <td className="py-4 pe-3">
                            <p className="text-[13px] font-semibold text-slate-700">{req.requester_name}</p>
                            <p className="mt-0.5 text-[11px] text-slate-400 truncate max-w-[160px]">{req.requester_email}</p>
                          </td>
                          <td className="py-4 pe-3">
                            <span className="text-[12px] font-bold text-[#0077B6]">
                              {DEPT_LABELS[req.current_department] ?? req.current_department}
                            </span>
                          </td>
                          <td className="py-4 pe-3">
                            <span className={cn('rounded-xl px-2.5 py-1 text-[11px] font-black ring-1', wfMeta.color)}>
                              {wfMeta.label}
                            </span>
                          </td>
                          <td className="py-4 pe-3 text-[12px] font-semibold tabular-nums text-slate-400">
                            {req.created_at
                              ? new Intl.DateTimeFormat('ar', {
                                  year: 'numeric', month: 'short', day: 'numeric', numberingSystem: 'latn',
                                }).format(new Date(req.created_at))
                              : '—'}
                          </td>
                          <td className="py-4 pe-3">
                            <div className="flex items-center justify-center gap-1.5">
                              {canQuickAct && (
                                <>
                                  <button
                                    type="button"
                                    title="موافقة سريعة"
                                    onClick={(e) => { e.stopPropagation(); void handleQuickApprove(req) }}
                                    className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/70 transition hover:bg-emerald-500 hover:text-white hover:ring-emerald-500"
                                  >
                                    <Check className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    title="رفض"
                                    onClick={(e) => { e.stopPropagation(); setActionMsg(null); setRejectTarget(req) }}
                                    className="grid h-8 w-8 place-items-center rounded-xl bg-red-50 text-red-500 ring-1 ring-red-200/70 transition hover:bg-red-500 hover:text-white hover:ring-red-500"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                              {isHistoryViewer && !canQuickAct && (
                                <span
                                  title="تمت مراجعتك لهذا الطلب"
                                  className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500 ring-1 ring-slate-200/80"
                                >
                                  <Clock className="h-3 w-3" />
                                  تمت مراجعتك
                                </span>
                              )}
                              <Link
                                to={`/dashboard/admin/workshop-requests/${req.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="grid h-8 w-8 place-items-center rounded-xl bg-[#0077B6]/10 text-[#0077B6] ring-1 ring-[#0077B6]/20 transition hover:bg-[#0077B6] hover:text-white"
                                title="عرض التفاصيل"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Link>
                            </div>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Pagination */}
        {data && data.last_page > 1 && (
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1 || loading}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-[12px] font-black text-slate-600 transition hover:border-[#0077B6]/30 hover:text-[#0077B6] disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
              السابق
            </button>
            <span className="min-w-[3rem] text-center text-[13px] font-black text-slate-600">
              {page} / {data.last_page}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(p + 1, data.last_page))}
              disabled={page === data.last_page || loading}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-[12px] font-black text-slate-600 transition hover:border-[#0077B6]/30 hover:text-[#0077B6] disabled:opacity-40"
            >
              التالي
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Quick reject modal */}
      <AnimatePresence>
        {rejectTarget && (
          <QuickRejectModal
            key="reject-modal"
            req={rejectTarget}
            onCancel={() => setRejectTarget(null)}
            onConfirm={(notes) => handleQuickReject(rejectTarget, notes)}
          />
        )}
      </AnimatePresence>
    </main>
  )
}
