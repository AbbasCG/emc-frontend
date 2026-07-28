import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeft,
  AtSign,
  Bold,
  Building2,
  Calendar,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  Clock,
  Code,
  Copy,
  Hash,
  Image,
  Italic,
  LifeBuoy,
  Link2,
  List,
  Lock,
  Mail,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Phone,
  Printer,
  Quote,
  RefreshCw,
  Search,
  Send,
  Tag,
  Ticket,
  Trash2,
  Underline,
  User,
  UserCheck,
  UserPlus,
  Zap,
  Activity,
  Bell,
  TrendingUp,
} from 'lucide-react'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import { useAuth } from '@/contexts/AuthContext'
import {
  fetchSupportTicket,
  fetchSupportTicketAssignees,
  fetchTicketActivity,
  replySupportTicket,
  updateSupportTicket,
  assignSupportTicket,
  resolveSupportTicket,
  deleteSupportTicket,
} from '@/api/supportApi'
import type {
  AssigneeUser,
  SupportTicketDetail,
  SupportTicketReply,
  SupportTicketStatus,
  TicketActivity,
} from '@/types/operations'
import toast from '@/lib/toast'

/* ─────────────────────────────────────────────────────────────────────────
   Static maps
───────────────────────────────────────────────────────────────────────── */

const STATUS_AR: Record<string, string> = {
  new: 'جديدة',
  in_progress: 'قيد المعالجة',
  waiting_response: 'بانتظار رد',
  resolved: 'محلولة',
  closed: 'مغلقة',
}

const STATUS_DOT: Record<string, string> = {
  new: 'bg-sky-400',
  in_progress: 'bg-amber-400',
  waiting_response: 'bg-purple-400',
  resolved: 'bg-emerald-400',
  closed: 'bg-slate-400',
}

const STATUS_LIGHT: Record<string, string> = {
  new: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  in_progress: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  waiting_response: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
  resolved: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  closed: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
}

const STATUS_HERO: Record<string, string> = {
  new: 'bg-sky-400/20 text-sky-200 ring-1 ring-sky-400/30',
  in_progress: 'bg-amber-400/20 text-amber-200 ring-1 ring-amber-400/30',
  waiting_response: 'bg-purple-400/20 text-purple-200 ring-1 ring-purple-400/30',
  resolved: 'bg-emerald-400/20 text-emerald-200 ring-1 ring-emerald-400/30',
  closed: 'bg-slate-400/20 text-slate-300 ring-1 ring-slate-400/30',
}

const PRIORITY_AR: Record<string, string> = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
  urgent: 'عاجلة',
}

const PRIORITY_DESC: Record<string, string> = {
  low: 'وقت الاستجابة: 72 ساعة',
  medium: 'وقت الاستجابة: 24 ساعة',
  high: 'وقت الاستجابة: 8 ساعات',
  urgent: 'وقت الاستجابة: فوري',
}

const PRIORITY_DOT: Record<string, string> = {
  low: 'bg-slate-400',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
}

const PRIORITY_LIGHT: Record<string, string> = {
  low: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200',
  medium: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  high: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
  urgent: 'bg-red-50 text-red-700 ring-1 ring-red-200',
}

const PRIORITY_HERO: Record<string, string> = {
  low: 'bg-slate-400/20 text-slate-300 ring-1 ring-slate-400/20',
  medium: 'bg-blue-400/20 text-blue-200 ring-1 ring-blue-400/20',
  high: 'bg-orange-400/20 text-orange-200 ring-1 ring-orange-400/20',
  urgent: 'bg-red-400/20 text-red-200 ring-1 ring-red-400/20',
}

const REQUEST_TYPE_AR: Record<string, string> = {
  general: 'استفسار عام',
  partnership: 'شراكة',
  volunteer: 'تطوع',
  technical: 'دعم فني',
}

const ROLE_AR: Record<string, string> = {
  super_admin: 'مدير عام',
  admin: 'مشرف',
  tech_admin: 'مشرف تقني',
  hr_manager: 'موارد بشرية',
  teacher: 'مدرب',
  instructor: 'مدرب',
  volunteer: 'متطوع',
  support_agent: 'وكيل دعم',
  partner: 'شريك',
}

const ACTION_LABEL: Record<string, { ar: string; icon: React.ElementType; color: string }> = {
  'ticket.reply':           { ar: 'تم إضافة رد',          icon: MessageSquare,  color: 'text-blue-500' },
  'ticket.status_changed':  { ar: 'تم تغيير الحالة',       icon: TrendingUp,     color: 'text-purple-500' },
  'ticket.priority_changed':{ ar: 'تم تغيير الأولوية',     icon: Zap,            color: 'text-orange-500' },
  'ticket.assigned':        { ar: 'تم التعيين',             icon: UserPlus,       color: 'text-emerald-500' },
  'ticket.resolved':        { ar: 'تم حل التذكرة',          icon: CheckCircle2,   color: 'text-emerald-500' },
  'ticket.deleted':         { ar: 'تم الحذف',              icon: Trash2,         color: 'text-red-500' },
  'ticket.updated':         { ar: 'تم التحديث',             icon: Activity,       color: 'text-slate-500' },
}

/* ─────────────────────────────────────────────────────────────────────────
   Utilities
───────────────────────────────────────────────────────────────────────── */

function fmtDate(d?: string | null) {
  if (!d) return '—'
  return (
    new Date(d).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' }) +
    ' · ' +
    new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
  )
}

function fmtDateShort(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })
}

function timeAgo(d?: string | null): string {
  if (!d) return ''
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'الآن'
  if (mins < 60) return `منذ ${mins} د`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `منذ ${hours} س`
  return `منذ ${Math.floor(hours / 24)} ي`
}

function getInitials(name: string) {
  const p = name.trim().split(/\s+/)
  return p.length >= 2 ? (p[0]?.[0] ?? '') + (p[p.length - 1]?.[0] ?? '') : name.slice(0, 2)
}

function hashStr(s: string) {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return h
}

/* ─────────────────────────────────────────────────────────────────────────
   Avatar
───────────────────────────────────────────────────────────────────────── */

const GRADS = [
  'from-violet-500 to-purple-700',
  'from-sky-500 to-blue-700',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-pink-500 to-rose-600',
  'from-indigo-500 to-blue-700',
]

function Avatar({ name, px = 36, src }: { name: string; px?: number; src?: string | null }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="shrink-0 rounded-full object-cover"
        style={{ width: px, height: px }}
      />
    )
  }
  const g = GRADS[hashStr(name || '?') % GRADS.length]
  return (
    <div
      className={`flex shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br ${g} font-black text-white`}
      style={{ width: px, height: px, fontSize: Math.round(px * 0.36) }}
    >
      {getInitials(name || '؟')}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   CopyButton
───────────────────────────────────────────────────────────────────────── */

function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  async function go(e: React.MouseEvent) {
    e.stopPropagation()
    await navigator.clipboard.writeText(text)
    setDone(true)
    setTimeout(() => setDone(false), 2000)
  }
  return (
    <button
      type="button"
      onClick={(e) => void go(e)}
      title="نسخ"
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-[#2691C2]/40 hover:text-[#2691C2]"
    >
      {done ? <CheckCheck size={11} className="text-emerald-500" /> : <Copy size={11} />}
    </button>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Portal Dropdown — renders to body to avoid z-index issues
───────────────────────────────────────────────────────────────────────── */

interface PortalDropdownProps {
  open: boolean
  triggerRef: React.RefObject<HTMLElement | null>
  onClose: () => void
  children: React.ReactNode
  width?: number
}

function PortalDropdown({ open, triggerRef, onClose, children, width }: PortalDropdownProps) {
  const [pos, setPos] = useState({ top: 0, right: 0, w: 0 })
  const contentRef = useRef<HTMLDivElement>(null)

  const updatePos = useCallback(() => {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 6, right: window.innerWidth - r.right, w: width ?? r.width })
    }
  }, [triggerRef, width])

  useLayoutEffect(() => {
    if (open) updatePos()
  }, [open, updatePos])

  useEffect(() => {
    if (!open) return
    window.addEventListener('scroll', updatePos, true)
    window.addEventListener('resize', updatePos)
    return () => {
      window.removeEventListener('scroll', updatePos, true)
      window.removeEventListener('resize', updatePos)
    }
  }, [open, updatePos])

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      const target = e.target as Node
      const inTrigger = triggerRef.current?.contains(target) ?? false
      const inContent = contentRef.current?.contains(target) ?? false
      if (!inTrigger && !inContent) onClose()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, triggerRef])

  if (!open) return null

  return createPortal(
    <AnimatePresence>
      <motion.div
        ref={contentRef}
        key="portal-dropdown"
        initial={{ opacity: 0, y: -6, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.97 }}
        transition={{ duration: 0.14 }}
        style={{
          position: 'fixed',
          top: pos.top,
          right: pos.right,
          width: pos.w,
          zIndex: 99999,
        }}
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15"
      >
        {children}
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   SidebarCard wrapper
───────────────────────────────────────────────────────────────────────── */

function SCard({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay, ease: [0.22, 0.61, 0.36, 1] }}
      className={`overflow-hidden rounded-[20px] bg-white shadow-[0_1px_16px_rgba(34,51,74,0.07)] ring-1 ring-slate-100 ${className}`}
    >
      {children}
    </motion.div>
  )
}

function SCardHeader({ icon: Icon, title, color = 'text-slate-500', bg = 'bg-slate-100' }: {
  icon: React.ElementType; title: string; color?: string; bg?: string
}) {
  return (
    <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
      <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${bg}`}>
        <Icon size={13} className={color} />
      </div>
      <h3 className="text-[13px] font-black text-slate-800">{title}</h3>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Left column card wrapper
───────────────────────────────────────────────────────────────────────── */

function MCard({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, delay, ease: [0.22, 0.61, 0.36, 1] }}
      className="overflow-hidden rounded-[20px] bg-white shadow-[0_1px_16px_rgba(34,51,74,0.07)] ring-1 ring-slate-100"
    >
      {children}
    </motion.div>
  )
}

function MCardHeader({ icon: Icon, title, badge }: { icon: React.ElementType; title: string; badge?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100">
          <Icon size={14} className="text-slate-500" />
        </div>
        <h2 className="text-[15px] font-black text-slate-800">{title}</h2>
      </div>
      {badge && (
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500">{badge}</span>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Delete modal
───────────────────────────────────────────────────────────────────────── */

function DeleteModal({
  subject,
  onConfirm,
  onCancel,
  loading,
}: {
  subject: string
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, y: 16, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 16, opacity: 0 }}
        transition={{ duration: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
        className="w-full max-w-[400px] overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 bg-gradient-to-r from-red-500 to-rose-400" />
        <div className="p-7">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
            <AlertTriangle size={22} className="text-red-500" />
          </div>
          <h2 className="mb-1.5 text-[17px] font-black text-slate-900">حذف التذكرة</h2>
          <p className="mb-5 text-[13px] text-slate-500">هل أنت متأكد؟ لا يمكن التراجع عن هذه العملية.</p>
          <div className="mb-6 truncate rounded-xl bg-slate-50 px-4 py-2.5 font-mono text-[12px] font-bold text-slate-700">
            {subject}
          </div>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-[13px] font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-2.5 text-[13px] font-black text-white transition hover:bg-red-600 disabled:opacity-50"
            >
              {loading ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
              {loading ? 'جارٍ الحذف...' : 'حذف'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Sidebar: Assignment card
───────────────────────────────────────────────────────────────────────── */

function AssignmentCard({
  currentAssignee,
  onAssign,
}: {
  currentAssignee?: { id: number; name: string; email?: string; role?: string; department?: string; avatar?: string | null } | null
  onAssign: (user: AssigneeUser) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [list, setList] = useState<AssigneeUser[] | null>(null)
  const [loadingList, setLoadingList] = useState(false)
  const [assigningId, setAssigningId] = useState<number | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  async function load() {
    if (list) return
    setLoadingList(true)
    try { setList(await fetchSupportTicketAssignees()) }
    catch { toast.error('تعذّر تحميل القائمة') }
    finally { setLoadingList(false) }
  }

  function openPanel() { setOpen(true); void load() }

  async function pick(u: AssigneeUser) {
    if (assigningId) return
    setAssigningId(u.id)
    try { await onAssign(u); setOpen(false) }
    finally { setAssigningId(null) }
  }

  // Group by department
  const filtered = (list ?? []).filter((u) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      u.name.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.department?.toLowerCase().includes(q)
    )
  })

  const groups: Record<string, AssigneeUser[]> = {}
  for (const u of filtered) {
    const dept = u.department || 'غير محدد'
    ;(groups[dept] ??= []).push(u)
  }

  return (
    <SCard delay={0.06}>
      <SCardHeader icon={UserPlus} title="تعيين التذكرة" color="text-[#2691C2]" bg="bg-[#2691C2]/10" />
      <div className="p-4">
        {/* Trigger */}
        <div
          ref={triggerRef}
          onClick={openPanel}
          className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition select-none ${
            open ? 'border-[#2691C2]/50 ring-2 ring-[#2691C2]/15' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          {currentAssignee ? (
            <>
              <Avatar name={currentAssignee.name} px={32} src={currentAssignee.avatar} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-black text-slate-800">{currentAssignee.name}</p>
                <p className="truncate text-[11px] text-slate-400">
                  {currentAssignee.role ? (ROLE_AR[currentAssignee.role] ?? currentAssignee.role) : ''}
                  {currentAssignee.department ? ` · ${currentAssignee.department}` : ''}
                </p>
              </div>
              <CheckCircle2 size={15} className="shrink-0 text-emerald-500" />
            </>
          ) : (
            <>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                <UserCheck size={13} className="text-slate-400" />
              </div>
              <p className="flex-1 text-[13px] font-medium text-slate-400">اختر مسؤولاً...</p>
            </>
          )}
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }}>
            <ChevronDown size={14} className="shrink-0 text-slate-400" />
          </motion.div>
        </div>

        {/* Portal dropdown */}
        <PortalDropdown
          open={open}
          triggerRef={triggerRef as React.RefObject<HTMLElement | null>}
          onClose={() => setOpen(false)}
        >
          {/* Search */}
          <div className="border-b border-slate-100 p-3">
            <div className="relative">
              <Search size={12} className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث بالاسم أو القسم..."
                className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 pe-8 ps-3 text-[12px] font-medium placeholder:text-slate-400 focus:border-[#2691C2]/40 focus:outline-none"
              />
            </div>
          </div>

          {/* List */}
          <div className="max-h-[300px] overflow-y-auto">
            {loadingList ? (
              <div className="space-y-2 p-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex animate-pulse items-center gap-2.5 rounded-xl bg-slate-50 p-2.5">
                    <div className="h-8 w-8 rounded-full bg-slate-200" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-24 rounded bg-slate-200" />
                      <div className="h-2 w-16 rounded bg-slate-200" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-6 text-center text-[12px] text-slate-400">لا توجد نتائج</p>
            ) : (
              Object.entries(groups).map(([dept, users]) => (
                <div key={dept}>
                  <div className="sticky top-0 bg-slate-50 px-3 py-1.5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {dept}
                    </p>
                  </div>
                  {users.map((u) => {
                    const isCurrent = currentAssignee?.id === u.id
                    const isAssigning = assigningId === u.id
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => void pick(u)}
                        disabled={!!assigningId}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-start transition hover:bg-slate-50 ${isCurrent ? 'bg-emerald-50' : ''}`}
                      >
                        <Avatar name={u.name} px={30} src={u.avatar} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-bold text-slate-800">{u.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {u.role ? (ROLE_AR[u.role] ?? u.role) : ''}
                            {u.active_tickets ? ` · ${u.active_tickets} تذكرة نشطة` : ''}
                          </p>
                        </div>
                        {isAssigning ? (
                          <RefreshCw size={12} className="animate-spin text-[#2691C2]" />
                        ) : isCurrent ? (
                          <Check size={12} className="text-emerald-500" />
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        </PortalDropdown>
      </div>
    </SCard>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Sidebar: Priority card
───────────────────────────────────────────────────────────────────────── */

function PriorityCard({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)

  const dot = PRIORITY_DOT[value] ?? 'bg-slate-400'
  const light = PRIORITY_LIGHT[value] ?? 'bg-slate-50 text-slate-600 ring-1 ring-slate-200'

  async function pick(v: string) {
    setOpen(false)
    setSaving(true)
    try { await onChange(v) } finally { setSaving(false) }
  }

  return (
    <SCard delay={0.10}>
      <SCardHeader icon={Zap} title="الأولوية" color="text-orange-500" bg="bg-orange-50" />
      <div className="p-4">
        <div
          ref={triggerRef}
          onClick={() => setOpen((v) => !v)}
          className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition select-none ${
            open ? 'border-orange-300/60 ring-2 ring-orange-100' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
          <div className="flex-1">
            <p className="text-[13px] font-black text-slate-800">{PRIORITY_AR[value] ?? value}</p>
            <p className="text-[10px] text-slate-400">{PRIORITY_DESC[value] ?? ''}</p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${light}`}>
            {PRIORITY_AR[value] ?? value}
          </span>
          {saving ? (
            <RefreshCw size={13} className="animate-spin text-orange-500" />
          ) : (
            <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }}>
              <ChevronDown size={13} className="text-slate-400" />
            </motion.div>
          )}
        </div>

        <PortalDropdown
          open={open}
          triggerRef={triggerRef as React.RefObject<HTMLElement | null>}
          onClose={() => setOpen(false)}
        >
          {Object.entries(PRIORITY_AR).map(([k, lbl]) => (
            <button
              key={k}
              type="button"
              onClick={() => void pick(k)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-start transition hover:bg-slate-50 ${k === value ? 'bg-orange-50' : ''}`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${PRIORITY_DOT[k] ?? 'bg-slate-400'}`} />
              <div className="flex-1">
                <p className="text-[13px] font-bold text-slate-800">{lbl}</p>
                <p className="text-[10px] text-slate-400">{PRIORITY_DESC[k] ?? ''}</p>
              </div>
              {k === value && <Check size={12} className="text-orange-500" />}
            </button>
          ))}
        </PortalDropdown>
      </div>
    </SCard>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Sidebar: Status card
───────────────────────────────────────────────────────────────────────── */

function StatusCard({ value, onChange }: { value: SupportTicketStatus; onChange: (v: SupportTicketStatus) => void }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)

  const dot = STATUS_DOT[value] ?? 'bg-slate-400'
  const light = STATUS_LIGHT[value] ?? 'bg-slate-50 text-slate-600 ring-1 ring-slate-200'

  async function pick(v: SupportTicketStatus) {
    setOpen(false)
    setSaving(true)
    try { await onChange(v) } finally { setSaving(false) }
  }

  return (
    <SCard delay={0.13}>
      <SCardHeader icon={TrendingUp} title="الحالة" color="text-purple-500" bg="bg-purple-50" />
      <div className="p-4">
        <div
          ref={triggerRef}
          onClick={() => setOpen((v) => !v)}
          className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition select-none ${
            open ? 'border-purple-300/60 ring-2 ring-purple-100' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
          <p className="flex-1 text-[13px] font-black text-slate-800">{STATUS_AR[value] ?? value}</p>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${light}`}>
            {STATUS_AR[value] ?? value}
          </span>
          {saving ? (
            <RefreshCw size={13} className="animate-spin text-purple-500" />
          ) : (
            <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }}>
              <ChevronDown size={13} className="text-slate-400" />
            </motion.div>
          )}
        </div>

        <PortalDropdown
          open={open}
          triggerRef={triggerRef as React.RefObject<HTMLElement | null>}
          onClose={() => setOpen(false)}
        >
          {(Object.keys(STATUS_AR) as SupportTicketStatus[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => void pick(k)}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-start transition hover:bg-slate-50 ${k === value ? 'bg-purple-50' : ''}`}
            >
              <span className={`h-2 w-2 rounded-full ${STATUS_DOT[k] ?? 'bg-slate-400'}`} />
              <p className="flex-1 text-[13px] font-medium text-slate-700">{STATUS_AR[k]}</p>
              {k === value && <Check size={12} className="text-purple-500" />}
            </button>
          ))}
        </PortalDropdown>
      </div>
    </SCard>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Sidebar: Applicant card
───────────────────────────────────────────────────────────────────────── */

function ApplicantCard({
  name,
  email,
  phone,
}: {
  name: string
  email?: string | null
  phone?: string | null
}) {
  return (
    <SCard delay={0.16}>
      <SCardHeader icon={User} title="مقدم الطلب" color="text-[#2691C2]" bg="bg-[#2691C2]/10" />
      <div className="p-4 space-y-4">
        {/* Avatar + name */}
        <div className="flex items-center gap-3">
          <Avatar name={name || '؟'} px={42} />
          <div>
            <p className="text-[14px] font-black text-slate-800">{name || '—'}</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
              <Tag size={8} />
              نموذج التواصل
            </span>
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-2">
          {email && (
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5">
              <Mail size={13} className="shrink-0 text-slate-400" />
              <a
                href={`mailto:${email}`}
                className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[#2691C2] hover:underline"
              >
                {email}
              </a>
              <CopyBtn text={email} />
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5">
              <Phone size={13} className="shrink-0 text-slate-400" />
              <a
                href={`tel:${phone}`}
                className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[#2691C2] hover:underline"
              >
                {phone}
              </a>
              <CopyBtn text={phone} />
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {email && (
            <a
              href={`mailto:${email}`}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#2691C2]/8 py-2.5 text-[12px] font-bold text-[#2691C2] transition hover:bg-[#2691C2]/15"
            >
              <Mail size={12} />
              مراسلة
            </a>
          )}
          {phone && (
            <a
              href={`tel:${phone}`}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-50 py-2.5 text-[12px] font-bold text-emerald-700 transition hover:bg-emerald-100"
            >
              <Phone size={12} />
              اتصال
            </a>
          )}
        </div>
      </div>
    </SCard>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Sidebar: Ticket details
───────────────────────────────────────────────────────────────────────── */

function DetailsRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <span className="shrink-0 text-[11px] font-bold text-slate-400">{label}</span>
      <span className="text-end text-[12px] font-semibold text-slate-700">{children}</span>
    </div>
  )
}

function TicketDetailsCard({
  ticket,
  ticketNum,
  reqType,
}: {
  ticket: SupportTicketDetail
  ticketNum: string
  reqType: string | null
}) {
  return (
    <SCard delay={0.19}>
      <SCardHeader icon={Hash} title="تفاصيل التذكرة" />
      <div className="divide-y divide-slate-100 px-5">
        <DetailsRow label="الرقم">
          <span className="font-mono text-[11px]">{ticketNum}</span>
        </DetailsRow>
        <DetailsRow label="الحالة">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${STATUS_LIGHT[ticket.status] ?? ''}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[ticket.status] ?? ''}`} />
            {STATUS_AR[ticket.status] ?? ticket.status}
          </span>
        </DetailsRow>
        {ticket.priority && (
          <DetailsRow label="الأولوية">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${PRIORITY_LIGHT[ticket.priority] ?? ''}`}>
              {PRIORITY_AR[ticket.priority] ?? ticket.priority}
            </span>
          </DetailsRow>
        )}
        {reqType && <DetailsRow label="النوع">{reqType}</DetailsRow>}
        {ticket.assigned_to && (
          <DetailsRow label="المسؤول">
            <div className="flex items-center gap-1.5">
              <Avatar name={ticket.assigned_to.name} px={18} />
              <span>{ticket.assigned_to.name}</span>
            </div>
          </DetailsRow>
        )}
        {ticket.assigned_to?.department && (
          <DetailsRow label="القسم">
            <span className="flex items-center gap-1">
              <Building2 size={10} className="text-slate-400" />
              {ticket.assigned_to.department}
            </span>
          </DetailsRow>
        )}
        {ticket.created_at && <DetailsRow label="الإنشاء">{fmtDateShort(ticket.created_at)}</DetailsRow>}
        {ticket.updated_at && <DetailsRow label="التحديث">{fmtDateShort(ticket.updated_at)}</DetailsRow>}
        {ticket.resolved_at && (
          <DetailsRow label="الحل">
            <span className="text-emerald-600">{fmtDateShort(ticket.resolved_at)}</span>
          </DetailsRow>
        )}
        {ticket.replies_count !== undefined && (
          <DetailsRow label="الردود">{String(ticket.replies_count)}</DetailsRow>
        )}
      </div>
    </SCard>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Sidebar: Attachments card (placeholder — no attachment system yet)
───────────────────────────────────────────────────────────────────────── */

function AttachmentsCard() {
  return (
    <SCard delay={0.22}>
      <SCardHeader icon={Paperclip} title="المرفقات" />
      <div className="px-5 py-5 text-center">
        <div className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
          <Paperclip size={16} className="text-slate-300" />
        </div>
        <p className="text-[12px] font-medium text-slate-400">لا توجد مرفقات</p>
      </div>
    </SCard>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Sidebar: Activity log
───────────────────────────────────────────────────────────────────────── */

function ActivityLogCard({ ticketId }: { ticketId: number }) {
  const [log, setLog] = useState<TicketActivity[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchTicketActivity(ticketId)
      .then(setLog)
      .catch(() => setLog([]))
      .finally(() => setLoading(false))
  }, [ticketId])

  return (
    <SCard delay={0.25}>
      <SCardHeader icon={Activity} title="سجل النشاط" color="text-slate-500" bg="bg-slate-100" />
      <div className="px-4 py-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex animate-pulse items-start gap-2.5">
                <div className="mt-1 h-6 w-6 rounded-full bg-slate-100" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-3/4 rounded bg-slate-100" />
                  <div className="h-2.5 w-1/2 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : !log || log.length === 0 ? (
          <p className="py-3 text-center text-[12px] text-slate-400">لا يوجد نشاط بعد</p>
        ) : (
          <div className="relative space-y-4 before:absolute before:start-[11px] before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-slate-100">
            {log.map((entry, i) => {
              const meta = ACTION_LABEL[entry.action]
              const Icon = meta?.icon ?? Bell
              const color = meta?.color ?? 'text-slate-400'
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="relative flex items-start gap-2.5 ps-2"
                >
                  {/* Icon dot */}
                  <div className={`relative z-10 flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-slate-200`}>
                    <Icon size={10} className={color} />
                  </div>

                  <div className="min-w-0 flex-1 pb-1">
                    <p className="text-[12px] font-bold text-slate-700">
                      {meta?.ar ?? entry.action}
                    </p>
                    {entry.user && (
                      <p className="text-[10px] text-slate-400">
                        بواسطة {entry.user.name}
                      </p>
                    )}
                    <p className="mt-0.5 text-[10px] text-slate-300">{timeAgo(entry.created_at)}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </SCard>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Reply card
───────────────────────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────────────────────
   Chat helpers
───────────────────────────────────────────────────────────────────────── */

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'اليوم'
  if (d.toDateString() === yesterday.toDateString()) return 'أمس'
  return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-4">
      <div className="h-px flex-1 bg-slate-100" />
      <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-400">{label}</span>
      <div className="h-px flex-1 bg-slate-100" />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Thread card — professional email-reply style
───────────────────────────────────────────────────────────────────────── */

function ThreadCard({
  r,
  isMe,
  isNew = false,
  submitterEmail,
}: {
  r: SupportTicketReply
  isMe: boolean
  isNew?: boolean
  submitterEmail?: string | null
}) {
  const isInternal = Boolean(r.internal)

  /* Internal note — full-width amber card, no left/right alignment */
  if (isInternal) {
    return (
      <motion.div
        initial={isNew ? { opacity: 0, y: 8 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="flex justify-start"
      >
        <div className="w-full max-w-[82%] overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/70 shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-amber-200/60 bg-amber-100/50 px-5 py-3">
            <Lock size={12} className="shrink-0 text-amber-600" />
            <span className="text-[11px] font-black text-amber-700">ملاحظة داخلية</span>
            <span className="ms-auto text-[10px] text-amber-500">{fmtDate(r.created_at)}</span>
          </div>
          <div className="flex items-start gap-3.5 p-5">
            <Avatar name={r.author_name || '؟'} px={36} />
            <div className="min-w-0 flex-1">
              <p className="mb-2 text-[12px] font-black text-amber-800">{r.author_name}</p>
              <p className="text-[13px] leading-relaxed text-amber-900/80 whitespace-pre-wrap">{r.body}</p>
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  /* Outgoing (me) — right-aligned, EMC blue accent */
  if (isMe) {
    return (
      <motion.div
        initial={isNew ? { opacity: 0, y: 8 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="flex justify-start"
      >
        <div className="w-full max-w-[75%] overflow-hidden rounded-2xl border border-[#2691C2]/30 bg-white shadow-sm">
          {/* Blue accent bar */}
          <div className="h-[3px] bg-[#2691C2]" />
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3.5">
            <div className="flex-1">
              <p className="text-[13px] font-black text-slate-800">أنت</p>
              <p className="text-[11px] text-slate-400">فريق الدعم · {timeAgo(r.created_at)}</p>
            </div>
            <Avatar name={r.author_name || '؟'} px={36} />
          </div>
          {/* Body */}
          <div className="px-5 py-4">
            <p className="text-[13px] font-medium leading-[1.9] text-slate-700 whitespace-pre-wrap">{r.body}</p>
          </div>
          {/* Footer */}
          <div className="flex items-center justify-end gap-1.5 border-t border-slate-100 px-5 py-2.5">
            <span className="text-[10px] text-slate-400">{fmtDate(r.created_at)}</span>
            <CheckCheck size={12} className="text-[#2691C2]/60" />
          </div>
        </div>
      </motion.div>
    )
  }

  /* Incoming (requester / other staff) — left-aligned, neutral */
  return (
    <motion.div
      initial={isNew ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="flex justify-end"
    >
      <div className="w-full max-w-[75%] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Neutral accent bar */}
        <div className="h-[3px] bg-slate-300" />
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3.5">
          <Avatar name={r.author_name || '؟'} px={36} />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-black text-slate-800">{r.author_name}</p>
            <p className="truncate text-[11px] text-slate-400">
              {submitterEmail ? submitterEmail : 'مقدم الطلب'}
              {' · '}
              {timeAgo(r.created_at)}
            </p>
          </div>
        </div>
        {/* Body */}
        <div className="px-5 py-4">
          <p className="text-[13px] font-medium leading-[1.9] text-slate-700 whitespace-pre-wrap">{r.body}</p>
        </div>
        {/* Footer */}
        <div className="flex items-center border-t border-slate-100 px-5 py-2.5">
          <span className="text-[10px] text-slate-400">{fmtDate(r.created_at)}</span>
        </div>
      </div>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Main page
───────────────────────────────────────────────────────────────────────── */

export default function OpsSupportTicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  // Prefer the exact list URL (page/search/filters) the user came from —
  // passed via navigate() state when opening a ticket from the list — so
  // Back restores it exactly. Falls back to the bare namespace path for
  // direct links / bookmarks that never carried that state.
  const listPath = (location.state as { from?: string } | null)?.from
    ?? (location.pathname.startsWith('/dashboard/support')
      ? '/dashboard/support'
      : '/dashboard/admin/support-tickets')

  const tid = id ? Number(id) : NaN
  const [ticket, setTicket] = useState<SupportTicketDetail | null>(null)
  const [reply, setReply] = useState('')
  const [internal, setInternal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const replyFormRef = useRef<HTMLDivElement>(null)
  const statusCardRef = useRef<HTMLDivElement>(null)
  const moreMenuTriggerRef = useRef<HTMLDivElement>(null)

  const loadTicket = useCallback(async () => {
    if (!Number.isFinite(tid)) return
    setLoadError(null)
    setLoading(true)
    try { setTicket(await fetchSupportTicket(tid)) }
    catch { setLoadError('تعذّر تحميل التذكرة. تحقق من الاتصال وأعد المحاولة.') }
    finally { setLoading(false) }
  }, [tid])

  useEffect(() => { void loadTicket() }, [loadTicket])

  /*
   * Reset the page's own scroll position whenever a (possibly different)
   * ticket is opened — covers both a fresh navigation into this page and
   * opening another ticket from inside it (the route's `:id` param changes,
   * but this page instance can stay mounted across that transition).
   * The app-wide <ScrollToTop /> already does this on pathname change, but
   * it fires once, immediately on navigation, before the ticket has loaded —
   * see the note below on why an uncontained inner scroll used to undo it.
   */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [tid])

  /*
   * Scroll to the latest message when replies load or a new one is added —
   * contained to the conversation panel itself via its own scrollTop, never
   * `scrollIntoView()`. `scrollIntoView` walks up every scrollable ancestor
   * to bring its target into view, including the window — since the chat
   * panel sits far down a very tall page, that dragged the entire page
   * scroll position down every time ticket data finished loading, exactly
   * the "page opens already scrolled down" bug: the window correctly reset
   * to the top on navigation, then this effect silently scrolled it back
   * down once the ticket (and its replies) arrived a moment later.
   */
  const repliesLength = ticket?.replies?.length ?? 0
  useEffect(() => {
    const el = chatScrollRef.current
    if (!loading && el) {
      el.scrollTo({ top: el.scrollHeight, behavior: repliesLength > 1 ? 'smooth' : 'instant' })
    }
  }, [repliesLength, loading])

  function scrollToReply() {
    replyFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function scrollToStatus() {
    statusCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  async function handleRefresh() {
    if (!Number.isFinite(tid) || refreshing) return
    setRefreshing(true)
    try { setTicket(await fetchSupportTicket(tid)) }
    catch { toast.error('تعذّر التحديث') }
    finally { setRefreshing(false) }
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault()
    if (!ticket || !reply.trim()) return
    setBusy(true)
    try {
      const result = await replySupportTicket(ticket.id, { message: reply.trim(), is_internal_note: internal })
      setReply('')
      setInternal(false)
      setTicket(await fetchSupportTicket(ticket.id))
      if (result.email_warning) {
        toast.error(result.email_warning)
      } else if (!internal && result.email_queued) {
        toast.success('تم إرسال الرد وإرسال البريد الإلكتروني للعميل')
      } else {
        toast.success('تم إرسال الرد')
      }
    } catch { toast.error('فشل إرسال الرد') }
    finally { setBusy(false) }
  }

  async function patchStatus(status: SupportTicketStatus) {
    if (!ticket) return
    const prev = ticket.status
    setTicket({ ...ticket, status })
    try { await updateSupportTicket(ticket.id, { status }); toast.success('تم تحديث الحالة') }
    catch { toast.error('فشل التحديث'); setTicket({ ...ticket, status: prev }) }
  }

  async function patchPriority(priority: string) {
    if (!ticket) return
    const prev = ticket.priority
    setTicket({ ...ticket, priority })
    try { await updateSupportTicket(ticket.id, { priority }); toast.success('تم تحديث الأولوية') }
    catch { toast.error('فشل التحديث'); setTicket({ ...ticket, priority: prev }) }
  }

  async function handleAssign(assignee: AssigneeUser) {
    if (!ticket) return
    await assignSupportTicket(ticket.id, assignee.id)
    setTicket({
      ...ticket,
      assigned_to: {
        id: assignee.id,
        name: assignee.name,
        email: assignee.email ?? undefined,
        role: assignee.role ?? undefined,
        department: assignee.department ?? undefined,
        avatar: assignee.avatar ?? null,
      },
      status: ticket.status === 'new' ? 'in_progress' : ticket.status,
    })
    toast.success(`تم التعيين إلى ${assignee.name}`)
  }

  async function handleResolve() {
    if (!ticket || resolving) return
    setResolving(true)
    try {
      await resolveSupportTicket(ticket.id)
      setTicket({ ...ticket, status: 'resolved' })
      toast.success('تم حل التذكرة')
    } catch { toast.error('فشل تحديث الحالة') }
    finally { setResolving(false) }
  }

  async function handleDelete() {
    if (!ticket || deleting) return
    setDeleting(true)
    try {
      await deleteSupportTicket(ticket.id)
      toast.success('تم حذف التذكرة')
      navigate(listPath)
    } catch {
      toast.error('فشل حذف التذكرة')
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  /* ── Guards ─────────────────────────────────────────────────────────── */
  if (!Number.isFinite(tid)) return <p className="text-center font-black text-[#22334A]">معرف غير صالح</p>
  if (loading) return <OpsPageSkeleton />
  if (loadError) {
    return (
      <div dir="rtl" className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
        <p className="font-black text-rose-800">{loadError}</p>
        <button type="button" onClick={() => void loadTicket()} className="mt-5 rounded-xl bg-[#22334A] px-6 py-2.5 text-sm font-black text-white">
          إعادة المحاولة
        </button>
      </div>
    )
  }
  if (!ticket) return <OpsPageSkeleton />

  const isResolved = ticket.status === 'resolved' || ticket.status === 'closed'
  const replies = ticket.replies ?? []
  const submitter = ticket.full_name ?? ticket.name ?? ''
  const ticketNum = ticket.ticket_number ?? `#${String(ticket.id).padStart(5, '0')}`
  const reqType = ticket.request_type ? (REQUEST_TYPE_AR[ticket.request_type] ?? ticket.request_type) : null

  return (
    <>
      <motion.div
        dir="rtl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="min-h-screen bg-[#F0F4F8]"
      >
        {/* ── STICKY COMPACT HEADER — back button, ticket #, status/priority badges, always visible while scrolling ── */}
        <div className="sticky top-0 z-20 border-b border-slate-200/70 bg-[#F0F4F8]/90 backdrop-blur-sm">
          <div className="mx-auto flex max-w-[1700px] items-center gap-2.5 px-3 py-2.5 sm:px-6 sm:py-3 lg:px-8">
            <Link
              to={listPath}
              aria-label="العودة إلى قائمة التذاكر"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-[#2691C2]/40 hover:text-[#2691C2] sm:h-9 sm:w-9"
            >
              <ArrowLeft size={15} />
            </Link>
            <span className="shrink-0 truncate font-mono text-[12px] font-bold text-slate-500">{ticketNum}</span>
            <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${STATUS_LIGHT[ticket.status] ?? ''}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[ticket.status] ?? ''}`} />
              {STATUS_AR[ticket.status] ?? ticket.status}
            </span>
            {ticket.priority && (
              <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[10px] font-bold ${PRIORITY_LIGHT[ticket.priority] ?? ''}`}>
                {PRIORITY_AR[ticket.priority] ?? ticket.priority}
              </span>
            )}
            <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-slate-400 max-sm:hidden">
              {ticket.subject}
            </span>
          </div>
        </div>

        <div className="mx-auto max-w-[1700px] space-y-4 px-3 py-4 pb-24 sm:space-y-6 sm:px-6 sm:py-6 lg:px-8">

          {/* ══ HERO ════════════════════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
            className="relative overflow-hidden rounded-[24px] p-4 text-white shadow-2xl sm:rounded-[28px] sm:p-7 lg:p-8"
            style={{ background: 'linear-gradient(145deg, #22334A 0%, #172235 100%)' }}
          >
            {/* Glow orb */}
            <div className="pointer-events-none absolute -top-16 end-12 h-56 w-56 rounded-full bg-[#2691C2]/12 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-8 start-8 h-40 w-40 rounded-full bg-[#EC943C]/8 blur-2xl" />

            {/* Two-column hero layout */}
            <div className="relative flex flex-wrap items-start justify-between gap-6 lg:flex-nowrap">

              {/* CENTER: Title + meta */}
              <div className="min-w-0 flex-1">
                {/* Ticket number */}
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/10">
                    <Ticket size={11} className="text-white/40" />
                  </div>
                  <span className="font-mono text-[11px] font-bold tracking-widest text-white/35">
                    {ticketNum}
                  </span>
                </div>

                {/* Title */}
                <h1 className="mb-4 text-[22px] font-black leading-tight tracking-tight sm:text-[26px]">
                  {ticket.subject}
                </h1>

                {/* Info strip */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-white/50">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${STATUS_HERO[ticket.status] ?? 'bg-white/10 text-white/70'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[ticket.status] ?? ''}`} />
                    {STATUS_AR[ticket.status] ?? ticket.status}
                  </span>
                  {ticket.priority && (
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold ${PRIORITY_HERO[ticket.priority] ?? 'bg-white/10 text-white/70'}`}>
                      {PRIORITY_AR[ticket.priority] ?? ticket.priority}
                    </span>
                  )}
                  {reqType && (
                    <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-white/60 ring-1 ring-white/10">
                      {reqType}
                    </span>
                  )}
                  {submitter && (
                    <span className="flex min-w-0 items-center gap-1">
                      <User size={11} className="shrink-0 text-white/30" />
                      <span className="truncate text-white/60">{submitter}</span>
                    </span>
                  )}
                  {ticket.assigned_to && (
                    <span className="flex items-center gap-1.5">
                      <Avatar name={ticket.assigned_to.name} px={18} />
                      <span className="text-white/60">{ticket.assigned_to.name}</span>
                    </span>
                  )}
                  {ticket.created_at && (
                    <span className="flex items-center gap-1">
                      <Clock size={11} className="text-white/30" />
                      {fmtDate(ticket.created_at)}
                    </span>
                  )}
                  {replies.length > 0 && (
                    <span className="flex items-center gap-1">
                      <MessageSquare size={11} className="text-white/30" />
                      {replies.length} ردود
                    </span>
                  )}
                </div>
              </div>

              {/* RIGHT: Icon */}
              <div className="shrink-0">
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[#2691C2]/20 ring-1 ring-white/10"
                >
                  <LifeBuoy size={38} className="text-[#2691C2]" />
                </motion.div>
              </div>
            </div>

            {/* Action bar — primary actions (Reply / Change Status / Resolve) always
                reachable and full-width on mobile; secondary/destructive actions
                (Refresh, Copy Link, Print, Delete) collapse into a "More" menu so
                they don't compete for thumb reach on a small screen. */}
            <div className="mt-5 flex flex-wrap items-stretch gap-2 border-t border-white/[0.06] pt-4">
              <motion.button
                type="button"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.96 }}
                onClick={scrollToReply}
                className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#2691C2]/25 px-4 text-[13px] font-bold text-white ring-1 ring-[#2691C2]/40 transition hover:bg-[#2691C2]/35 sm:flex-none"
              >
                <Send size={13} />
                رد
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.96 }}
                onClick={scrollToStatus}
                className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/10 px-4 text-[13px] font-bold text-white/80 ring-1 ring-white/10 transition hover:bg-white/15 sm:flex-none"
              >
                <TrendingUp size={13} />
                تغيير الحالة
              </motion.button>

              {!isResolved && (
                <motion.button
                  type="button"
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => void handleResolve()}
                  disabled={resolving}
                  className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500/20 px-4 text-[13px] font-bold text-emerald-300 ring-1 ring-emerald-400/30 transition hover:bg-emerald-500/30 disabled:opacity-50 sm:flex-none"
                >
                  <CheckCircle2 size={13} className={resolving ? 'animate-spin' : ''} />
                  {resolving ? 'جارٍ...' : 'حل التذكرة'}
                </motion.button>
              )}

              {/* More menu — Refresh / Copy Link / Print / Delete */}
              <div ref={moreMenuTriggerRef} className="relative">
                <motion.button
                  type="button"
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setMoreMenuOpen((v) => !v)}
                  aria-label="المزيد من الإجراءات"
                  aria-expanded={moreMenuOpen}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white/80 ring-1 ring-white/10 transition hover:bg-white/15"
                >
                  <MoreVertical size={15} />
                </motion.button>
              </div>

              <PortalDropdown
                open={moreMenuOpen}
                triggerRef={moreMenuTriggerRef as React.RefObject<HTMLElement | null>}
                onClose={() => setMoreMenuOpen(false)}
                width={200}
              >
                <button
                  type="button"
                  onClick={() => { setMoreMenuOpen(false); void handleRefresh() }}
                  disabled={refreshing}
                  className="flex h-11 w-full items-center gap-2.5 px-4 text-start text-[13px] font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                  تحديث
                </button>
                <button
                  type="button"
                  onClick={() => { setMoreMenuOpen(false); void (async () => { await navigator.clipboard.writeText(window.location.href); toast.success('تم نسخ الرابط') })() }}
                  className="flex h-11 w-full items-center gap-2.5 px-4 text-start text-[13px] font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  <Copy size={14} />
                  نسخ الرابط
                </button>
                <button
                  type="button"
                  onClick={() => { setMoreMenuOpen(false); window.print() }}
                  className="flex h-11 w-full items-center gap-2.5 px-4 text-start text-[13px] font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  <Printer size={14} />
                  طباعة
                </button>
                <div className="my-1 h-px bg-slate-100" />
                <button
                  type="button"
                  onClick={() => { setMoreMenuOpen(false); setShowDeleteModal(true) }}
                  className="flex h-11 w-full items-center gap-2.5 px-4 text-start text-[13px] font-bold text-red-600 transition hover:bg-red-50"
                >
                  <Trash2 size={14} />
                  حذف
                </button>
              </PortalDropdown>
            </div>

            {/* Bottom dates strip */}
            <div className="mt-4 flex flex-wrap items-center gap-5 text-[11px] text-white/30">
              {ticket.created_at && (
                <span className="flex items-center gap-1.5">
                  <Calendar size={10} className="text-white/20" />
                  أُنشئ: {fmtDate(ticket.created_at)}
                </span>
              )}
              {ticket.updated_at && (
                <span className="flex items-center gap-1.5">
                  <RefreshCw size={10} className="text-white/20" />
                  آخر تحديث: {fmtDate(ticket.updated_at)}
                </span>
              )}
              {ticket.resolved_at && (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={10} className="text-emerald-400/50" />
                  حُل: {fmtDate(ticket.resolved_at)}
                </span>
              )}
            </div>
          </motion.div>

          {/* ══ TWO COLUMN LAYOUT ══════════════════════════════════════════
              `order` puts the conversation first on mobile (no large empty
              sidebar stack before it) while preserving the existing RTL
              desktop grid — right column (sidebar) first, left column
              (conversation) second — via DOM order at xl and above. ── */}
          <div dir="rtl" className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[340px_1fr]">

            {/* ── RIGHT: Sidebar (xl: first in DOM → right column in RTL) ──── */}
            <div className="order-2 space-y-4 sm:space-y-5 xl:order-1">
              <AssignmentCard currentAssignee={ticket.assigned_to} onAssign={handleAssign} />
              <PriorityCard value={ticket.priority ?? 'medium'} onChange={patchPriority} />
              <div ref={statusCardRef}>
                <StatusCard value={ticket.status} onChange={patchStatus} />
              </div>
              <ApplicantCard name={submitter} email={ticket.email} phone={ticket.phone} />
              <AttachmentsCard />
              <TicketDetailsCard ticket={ticket} ticketNum={ticketNum} reqType={reqType} />
              <ActivityLogCard ticketId={ticket.id} />
            </div>

            {/* ── LEFT: Main content (xl: second in DOM → left column in RTL) ── */}
            <div className="order-1 min-w-0 space-y-4 sm:space-y-5 xl:order-2">

              {/* Conversation — original message + all replies, oldest→newest */}
              <MCard delay={0.08}>
                <MCardHeader
                  icon={MessageSquare}
                  title="المحادثة"
                  badge={`${replies.length + (ticket.message ? 1 : 0)} رسائل`}
                />
                <div
                  ref={chatScrollRef}
                  className="flex h-[70vh] max-h-[420px] flex-col gap-4 overflow-y-auto px-4 py-4 sm:h-[560px] sm:max-h-none sm:px-5 sm:py-5"
                  style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}
                >
                  {(() => {
                    const currentUserId = user?.id
                    const currentUserName = (user?.name ?? '').trim()
                    const nodes: React.ReactNode[] = []
                    let lastDayLabel = ''

                    /* Build unified message list: original contact message first */
                    type ThreadEntry = SupportTicketReply & { _synthetic?: boolean }
                    const allMsgs: ThreadEntry[] = []
                    if (ticket.message) {
                      allMsgs.push({
                        id: -1,
                        author_name: submitter,
                        body: ticket.message,
                        internal: false,
                        created_at: ticket.created_at ?? new Date().toISOString(),
                        user_id: null,
                        _synthetic: true,
                      })
                    }
                    allMsgs.push(...replies)

                    if (allMsgs.length === 0) {
                      return (
                        <div className="flex flex-1 flex-col items-center justify-center">
                          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                            <MessageSquare size={26} className="text-slate-300" />
                          </div>
                          <p className="text-[14px] font-bold text-slate-400">لا توجد رسائل بعد</p>
                        </div>
                      )
                    }

                    for (const msg of allMsgs) {
                      const dayLabel = getDayLabel(msg.created_at)
                      if (dayLabel !== lastDayLabel) {
                        nodes.push(<DateSeparator key={`sep-${msg.id}-${dayLabel}`} label={dayLabel} />)
                        lastDayLabel = dayLabel
                      }

                      /* Detect outgoing: ID match takes priority, then name match */
                      const isMe = !msg._synthetic && (
                        (currentUserId != null && (
                          msg.user_id === currentUserId ||
                          msg.sender_id === currentUserId ||
                          msg.author_id === currentUserId
                        )) ||
                        (currentUserName !== '' && msg.author_name.trim() === currentUserName)
                      )

                      nodes.push(
                        <ThreadCard
                          key={msg.id}
                          r={msg}
                          isMe={isMe}
                          submitterEmail={ticket.email}
                        />,
                      )
                    }

                    nodes.push(<div key="chat-end" ref={chatEndRef} className="h-1 shrink-0" />)
                    return nodes
                  })()}
                </div>
              </MCard>

              {/* Reply editor */}
              <div ref={replyFormRef}>
              <MCard delay={0.18}>
                <MCardHeader icon={Send} title="رد جديد" />
                <div className="p-4 sm:p-6">
                  <form onSubmit={(e) => { void sendReply(e) }} className="space-y-3">
                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center gap-0.5 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5">
                      {[Bold, Italic, Underline, Link2, Image, Paperclip, List, Quote, Code, AtSign].map((Icon, i) => (
                        <button
                          key={i}
                          type="button"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-600 hover:shadow-sm"
                        >
                          <Icon size={13} />
                        </button>
                      ))}
                      <div className="mx-1 h-5 w-px bg-slate-200" />
                      <span className="ms-auto text-[10px] font-medium text-slate-400">
                        Ctrl + Enter للإرسال
                      </span>
                    </div>

                    {/* Textarea */}
                    <div
                      className={`overflow-hidden rounded-2xl border transition-all ${
                        internal
                          ? 'border-amber-300/60 bg-amber-50/30 focus-within:ring-2 focus-within:ring-amber-200'
                          : 'border-slate-200 bg-white focus-within:border-[#2691C2]/40 focus-within:ring-2 focus-within:ring-[#2691C2]/15'
                      }`}
                    >
                      <textarea
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        onKeyDown={(e) => {
                          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                            e.preventDefault()
                            void sendReply(e as unknown as React.FormEvent)
                          }
                        }}
                        rows={5}
                        className="w-full resize-none bg-transparent px-5 py-4 text-[14px] leading-relaxed text-slate-800 placeholder:text-slate-400 focus:outline-none"
                        placeholder={internal ? 'ملاحظة داخلية — لن يراها مقدم الطلب...' : 'اكتب ردك هنا...'}
                      />
                    </div>

                    {/* Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-4">
                        {/* Toggle */}
                        <label className="flex min-h-11 cursor-pointer select-none items-center gap-2.5">
                          <div
                            role="checkbox"
                            aria-checked={internal}
                            tabIndex={0}
                            onClick={() => setInternal((v) => !v)}
                            onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') setInternal((v) => !v) }}
                            className={`relative flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${internal ? 'bg-amber-400' : 'bg-slate-200'}`}
                          >
                            <motion.span
                              layout
                              className="absolute h-4 w-4 rounded-full bg-white shadow"
                              style={{ left: internal ? '18px' : '2px' }}
                              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                            />
                          </div>
                          <Lock size={11} className={internal ? 'text-amber-500' : 'text-slate-400'} />
                          <span className={`text-[12px] font-bold ${internal ? 'text-amber-600' : 'text-slate-500'}`}>
                            ملاحظة داخلية
                          </span>
                        </label>
                        <span className="text-[11px] text-slate-400">{reply.length} حرف</span>
                      </div>
                      <motion.button
                        type="submit"
                        disabled={busy || !reply.trim()}
                        whileHover={{ y: -2 }}
                        whileTap={{ y: 0 }}
                        className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#2691C2] px-7 text-[13px] font-black text-white shadow-md shadow-[#2691C2]/20 transition hover:bg-[#1e7aa8] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                      >
                        {busy ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                        {busy ? 'جارٍ الإرسال...' : 'إرسال الرد'}
                      </motion.button>
                    </div>
                  </form>
                </div>
              </MCard>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Delete modal */}
      {showDeleteModal && ticket && (
        <DeleteModal
          subject={ticket.subject}
          onConfirm={() => void handleDelete()}
          onCancel={() => { if (!deleting) setShowDeleteModal(false) }}
          loading={deleting}
        />
      )}
    </>
  )
}
