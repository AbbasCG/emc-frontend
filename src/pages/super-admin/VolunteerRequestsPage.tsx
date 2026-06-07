import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, ChevronDown, Download, ExternalLink, HeartHandshake, Loader2, Search, UserPlus } from 'lucide-react'
import { promiseToast } from '@/lib/toast'
import toast from '@/lib/toast'
import {
  convertVolunteerToMember,
  fetchVolunteerRequests,
  updateVolunteerRequestStatus,
  type VolunteerRequest,
  type VolunteerRequestStatus,
} from '@/api/volunteerApplicationApi'
import { formatDate } from '@/utils/dateTime'

/* ── Status config ─────────────────────────────────────────────────── */

const STATUS_LABELS: Record<VolunteerRequestStatus, string> = {
  pending: 'قيد المراجعة',
  reviewed: 'تمت المراجعة',
  accepted: 'مقبول',
  rejected: 'مرفوض',
  contacted: 'تم التواصل',
}

const STATUS_COLORS: Record<VolunteerRequestStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  reviewed: 'bg-sky-100 text-sky-800 border-sky-200',
  accepted: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  contacted: 'bg-violet-100 text-violet-800 border-violet-200',
}

const ALL_STATUSES: VolunteerRequestStatus[] = ['pending', 'reviewed', 'accepted', 'rejected', 'contacted']

const DEPARTMENTS = [
  'البرامج والمسارات',
  'التسويق والإعلام',
  'التقنية والدعم الفني',
  'الموارد البشرية',
  'الشراكات والعلاقات العامة',
  'المجتمع والصحة النفسية والوعي',
  'الجودة والحوكمة',
  'المالية',
  'التشغيل والعمليات',
  'غير محدد',
]

/* ── Convert-to-member confirmation modal ─────────────────────────── */

type ConvertModalProps = {
  req: VolunteerRequest
  onClose: () => void
  onConverted: (updated: VolunteerRequest) => void
}

function ConvertToMemberModal({ req, onClose, onConverted }: ConvertModalProps) {
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    try {
      const updated = await convertVolunteerToMember(req.id)
      toast.success('تمت إضافة المتطوع إلى الأعضاء بنجاح')
      onConverted(updated)
    } catch (err: unknown) {
      // 409 Conflict = already converted
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 409 || status === 422) {
        toast.warning('هذا المتطوع مضاف بالفعل إلى الأعضاء')
        onClose()
      } else {
        toast.error('تعذّر تحويل المتطوع. تحقق من الاتصال وأعد المحاولة.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
        className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Accent top bar */}
        <div className="h-1 bg-gradient-to-l from-emerald-500 to-teal-400" />

        <div className="px-7 py-6 text-right">
          {/* Icon */}
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
            <UserPlus size={26} className="text-emerald-600" />
          </div>

          <h2 className="text-[18px] font-black text-deepBlue">تحويل المتطوع إلى عضو</h2>
          <p className="mt-3 text-[14px] font-semibold leading-relaxed text-slate-600">
            تم قبول طلب التطوع.{' '}
            <span className="font-black text-deepBlue">{req.full_name}</span>
            {' '}هل تريد نقل بياناته إلى صفحة الأعضاء ليظهر ضمن الفريق الداخلي؟
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-[14px] font-black text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <UserPlus size={16} />
              )}
              نعم، إضافة إلى الأعضاء
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-full rounded-2xl border border-slate-200 py-3 text-[13px] font-black text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
            >
              لا، لاحقًا
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

/* ── Status badge ──────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: VolunteerRequestStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}

/* ── Detail modal ──────────────────────────────────────────────────── */

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim()) return null
  return (
    <div className="flex flex-col gap-1 py-3 text-right">
      <span className="text-[11px] font-black uppercase tracking-wide text-deepBlue/45">{label}</span>
      <span className="text-[13px] font-semibold text-deepBlue">{value}</span>
    </div>
  )
}

type DetailModalProps = {
  req: VolunteerRequest
  onClose: () => void
  onUpdated: (updated: VolunteerRequest) => void
  onOpenConvert?: (req: VolunteerRequest) => void
}

/** Returns true when the volunteer has already been converted (button should be hidden) */
function isAlreadyConverted(r: VolunteerRequest): boolean {
  return r.can_convert_to_member !== true || r.converted_member_id !== null
}

function DetailModal({ req, onClose, onUpdated, onOpenConvert }: DetailModalProps) {
  const [pendingStatus, setPendingStatus] = useState<VolunteerRequestStatus>(req.status)
  const [adminNotes, setAdminNotes] = useState(req.admin_notes ?? '')
  const [saving, setSaving] = useState(false)
  const [converting, setConverting] = useState(false)
  // Track conversion locally so the badge appears immediately after convert inside modal
  const [localConverted, setLocalConverted] = useState(() => isAlreadyConverted(req))

  const isDirty = pendingStatus !== req.status || adminNotes !== (req.admin_notes ?? '')

  async function handleSave() {
    setSaving(true)
    try {
      const updated = await promiseToast(
        updateVolunteerRequestStatus(req.id, pendingStatus, adminNotes || undefined),
        {
          loading: 'جاري تحديث الحالة...',
          success: 'تم تحديث حالة الطلب بنجاح',
          error: 'تعذّر تحديث الحالة. تحقق من الاتصال وأعد المحاولة.',
        },
      )
      onUpdated(updated)
      onClose()
    } catch {
      /* promiseToast handles error display */
    } finally {
      setSaving(false)
    }
  }

  async function handleConvertInline() {
    if (localConverted) {
      toast.warning('هذا المتطوع مضاف بالفعل إلى الأعضاء')
      return
    }
    setConverting(true)
    try {
      const updated = await convertVolunteerToMember(req.id)
      toast.success('تمت إضافة المتطوع إلى الأعضاء بنجاح')
      setLocalConverted(true)
      onUpdated(updated)
    } catch (err: unknown) {
      const errObj = err as { response?: { status?: number; data?: { message?: string } } }
      const status = errObj?.response?.status
      const msg = errObj?.response?.data?.message
      if (import.meta.env.DEV) {
        console.log('[convert] error.response.data:', errObj?.response?.data)
      }
      if (status === 409 || status === 422) {
        toast.warning(msg ?? 'هذا المتطوع مضاف بالفعل إلى الأعضاء')
        setLocalConverted(true)
      } else {
        toast.error(msg ?? 'تعذّر تحويل المتطوع. تحقق من الاتصال وأعد المحاولة.')
      }
    } finally {
      setConverting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
        className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-7 py-5">
          <div>
            <h2 className="text-lg font-black text-deepBlue">{req.full_name}</h2>
            <p className="text-[12px] font-semibold text-deepBlue/55">{req.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={req.status} />
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-[11px] font-black text-slate-500 hover:bg-slate-50"
            >
              إغلاق
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[65vh] divide-y divide-slate-100 overflow-y-auto px-7">
          <div className="grid grid-cols-2 gap-x-8">
            <DetailRow label="الجوال" value={req.phone} />
            <DetailRow label="الدولة" value={req.country} />
            <DetailRow label="المدينة" value={req.city} />
            <DetailRow label="الجنس" value={req.gender === 'male' ? 'ذكر' : req.gender === 'female' ? 'أنثى' : req.gender} />
            <DetailRow label="القسم المرغوب" value={req.desired_department} />
            <DetailRow label="مستوى الخبرة" value={req.experience_level} />
            <DetailRow label="التوفر" value={req.availability} />
            <DetailRow label="تاريخ التقديم" value={req.created_at ? formatDate(req.created_at) : null} />
          </div>
          <div className="py-3">
            <DetailRow label="المهارات" value={req.skills} />
            <DetailRow label="دافع التطوع" value={req.motivation} />
            <DetailRow label="خبرة سابقة" value={req.previous_experience} />
            <DetailRow label="ملاحظات المتقدم" value={req.notes} />
          </div>

          {/* CV download */}
          {req.cv_file_url && (
            <div className="py-4">
              <a
                href={req.cv_file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-customBlue/25 bg-customBlue/[0.06] px-4 py-2.5 text-[12px] font-black text-customBlue transition hover:bg-customBlue/[0.14]"
              >
                <Download size={14} />
                تحميل السيرة الذاتية
              </a>
            </div>
          )}

          {/* Admin actions */}
          <div className="space-y-4 py-5">
            <p className="text-[11px] font-black uppercase tracking-wide text-deepBlue/45">إجراءات الإدارة</p>

            <div className="relative">
              <select
                value={pendingStatus}
                onChange={(e) => setPendingStatus(e.target.value as VolunteerRequestStatus)}
                dir="rtl"
                className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pr-4 pl-10 text-sm font-semibold text-deepBlue outline-none focus:border-customBlue focus:ring-4 focus:ring-sky-100"
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="ملاحظات إدارية (اختياري)"
              dir="rtl"
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-deepBlue outline-none placeholder:text-slate-400 focus:border-customBlue focus:ring-4 focus:ring-sky-100"
            />

            {req.admin_notes && adminNotes === req.admin_notes && (
              <p className="text-[11px] font-semibold text-slate-400">الملاحظات الحالية: {req.admin_notes}</p>
            )}
          </div>
        </div>

        {/* Convert to member — only when status is accepted */}
        {req.status === 'accepted' && (
          <div className="border-t border-slate-100 px-7 py-4">
            {localConverted ? (
              /* ── Already converted badge ── */
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-black text-emerald-800">تمت إضافته إلى الأعضاء</p>
                </div>
                <Link
                  to="/dashboard/members"
                  onClick={onClose}
                  className="shrink-0 rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-[11px] font-black text-emerald-700 transition hover:bg-emerald-50"
                >
                  عرض العضو
                </Link>
              </div>
            ) : (
              /* ── Convert button ── */
              <div className="flex items-center gap-3">
                <p className="flex-1 min-w-0 text-[12px] font-semibold text-slate-500">
                  هل تريد إضافة هذا المتطوع إلى صفحة الأعضاء الداخليين؟
                </p>
                <button
                  type="button"
                  onClick={
                    onOpenConvert
                      ? () => { onClose(); onOpenConvert(req) }
                      : () => void handleConvertInline()
                  }
                  disabled={converting}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-[12px] font-black text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {converting ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <UserPlus size={13} />
                  )}
                  إضافة إلى الأعضاء
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-7 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-[12px] font-black text-slate-500 hover:bg-slate-50"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!isDirty || saving}
            className="inline-flex items-center gap-2 rounded-xl bg-deepBlue px-6 py-2.5 text-[12px] font-black text-white shadow transition hover:bg-deepBlue/90 disabled:opacity-40"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            حفظ التغييرات
          </button>
        </div>
      </motion.div>
    </div>
  )
}

/* ── Main page ─────────────────────────────────────────────────────── */

export default function VolunteerRequestsPage() {
  const { id: routeId } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [items, setItems] = useState<VolunteerRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<VolunteerRequestStatus | 'all'>('all')
  const [filterDept, setFilterDept] = useState<string>(() => searchParams.get('department') ?? 'all')
  const [selected, setSelected] = useState<VolunteerRequest | null>(null)
  const [convertTarget, setConvertTarget] = useState<VolunteerRequest | null>(null)

  async function load() {
    setLoadError(null)
    setLoading(true)
    try {
      const data = await fetchVolunteerRequests()
      setItems(data)
      if (routeId) {
        const match = data.find((r) => String(r.id) === routeId)
        if (match) setSelected(match)
      }
    } catch {
      setLoadError('تعذّر تحميل قائمة طلبات التطوع. تحقق من الاتصال وأعد المحاولة.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  function handleUpdated(updated: VolunteerRequest) {
    setItems((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
    // Show convert modal after saving if just became 'accepted' and not yet converted
    const alreadyConverted = isAlreadyConverted(updated)
    if (updated.status === 'accepted' && !alreadyConverted) {
      setConvertTarget(updated)
    }
  }

  function handleConverted(updated: VolunteerRequest) {
    // Replace the item in the list with the full updated record from API
    setItems((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
    setConvertTarget(null)
  }

  function handleClose() {
    setSelected(null)
    if (routeId) navigate('/dashboard/super-admin/volunteer-requests', { replace: true })
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((r) => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false
      if (filterDept !== 'all' && r.desired_department !== filterDept) return false
      if (q) {
        const hay = `${r.full_name} ${r.email} ${r.phone ?? ''} ${r.city ?? ''} ${r.desired_department ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [items, filterStatus, filterDept, search])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length }
    for (const s of ALL_STATUSES) c[s] = items.filter((r) => r.status === s).length
    return c
  }, [items])

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <header className="rounded-[1.35rem] bg-white p-8 text-right shadow-lg ring-1 ring-deepBlue/[0.06]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-deepBlue/[0.08] bg-deepBlue/[0.04] px-3 py-1.5">
              <HeartHandshake size={16} className="text-customBlue" />
              <span className="text-[11px] font-black uppercase tracking-wide text-deepBlue/70">طلبات التطوع</span>
            </div>
            <h1 className="text-2xl font-black text-deepBlue">إدارة طلبات التطوع</h1>
            <p className="mt-1.5 text-sm font-semibold text-slate-500">
              {items.length} طلب مستلم
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[12px] font-black text-deepBlue transition hover:bg-slate-50"
          >
            تحديث
          </button>
        </div>
      </header>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {(['all', ...ALL_STATUSES] as const).map((s) => {
          const active = filterStatus === s
          return (
            <button
              key={s}
              type="button"
              onClick={() => setFilterStatus(s)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-black transition ${
                active
                  ? 'bg-deepBlue text-white shadow-md shadow-deepBlue/20'
                  : 'border border-slate-200 bg-white text-deepBlue/65 hover:text-deepBlue'
              }`}
            >
              {s === 'all' ? 'الكل' : STATUS_LABELS[s]}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black tabular-nums ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {counts[s] ?? 0}
              </span>
            </button>
          )
        })}
      </div>

      {/* Search + Department filter */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو البريد أو المدينة..."
            dir="rtl"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-10 pl-4 text-sm font-semibold text-deepBlue outline-none placeholder:text-slate-400 focus:border-customBlue focus:ring-4 focus:ring-sky-100"
          />
        </div>
        <div className="relative">
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            dir="rtl"
            className="h-11 appearance-none rounded-xl border border-slate-200 bg-white pr-4 pl-10 text-sm font-semibold text-deepBlue outline-none focus:border-customBlue"
          >
            <option value="all">كل الأقسام</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <ChevronDown size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {/* Error */}
      {loadError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="font-black text-rose-800">{loadError}</p>
          <button type="button" onClick={() => void load()} className="mt-4 rounded-xl bg-deepBlue px-6 py-2.5 text-sm font-black text-white">
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={String(i)} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-20 text-center">
          <HeartHandshake className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-4 font-black text-deepBlue">لا توجد طلبات</p>
          <p className="mt-1 text-sm font-semibold text-slate-400">
            {search || filterStatus !== 'all' || filterDept !== 'all' ? 'لا نتائج تطابق الفلتر الحالي.' : 'لم يتم استلام أي طلبات تطوع بعد.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-deepBlue/[0.06] bg-white shadow-lg ring-1 ring-deepBlue/[0.04]">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  {['#', 'الاسم', 'البريد الإلكتروني', 'الجوال', 'القسم', 'التوفر', 'الحالة', 'تاريخ التقديم', ''].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-right text-[11px] font-black uppercase tracking-wide text-deepBlue/50">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r, idx) => (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: Math.min(idx * 0.04, 0.35) }}
                    className="transition-colors hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-4 text-[12px] font-black text-deepBlue/40 tabular-nums">{r.id}</td>
                    <td className="px-5 py-4 text-[13px] font-black text-deepBlue">{r.full_name}</td>
                    <td className="px-5 py-4 text-[12px] font-semibold text-slate-600" dir="ltr">{r.email}</td>
                    <td className="px-5 py-4 text-[12px] font-semibold text-slate-600" dir="ltr">{r.phone ?? '—'}</td>
                    <td className="px-5 py-4 text-[12px] font-semibold text-slate-700">{r.desired_department ?? '—'}</td>
                    <td className="px-5 py-4 text-[12px] font-semibold text-slate-600">{r.availability ?? '—'}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-5 py-4 text-[12px] font-semibold text-slate-500 tabular-nums" dir="ltr">
                      {r.created_at ? formatDate(r.created_at) : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => setSelected(r)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-customBlue/20 bg-customBlue/[0.06] px-3 py-1.5 text-[11px] font-black text-customBlue transition hover:bg-customBlue/[0.12]"
                      >
                        <ExternalLink size={12} />
                        تفاصيل
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail modal */}
      <AnimatePresence>
        {selected && (
          <DetailModal
            req={selected}
            onClose={handleClose}
            onUpdated={handleUpdated}
            onOpenConvert={(req) => setConvertTarget(req)}
          />
        )}
      </AnimatePresence>

      {/* Convert-to-member confirmation modal */}
      <AnimatePresence>
        {convertTarget && (
          <ConvertToMemberModal
            req={convertTarget}
            onClose={() => setConvertTarget(null)}
            onConverted={handleConverted}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
