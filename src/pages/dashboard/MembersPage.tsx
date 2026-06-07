import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Award,
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCopy,
  HeartHandshake,
  Link2,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { createUserAccount, fetchMembers, type InternalMember, type MemberType } from '@/api/membersApi'
import { toast } from '@/lib/toast'

/* ══════════════════════════════════════════════════════════════════
   STATIC RECOGNITION DATA  (replace with API later)
══════════════════════════════════════════════════════════════════ */

const RECOGNITION = {
  period: 'مايو 2025',
  topDepartment: {
    name: 'إدارة التقنية والدعم الفني',
    leader: 'المهندس عباس باعلوي',
  },
  topVolunteers: ['الأستاذة أُلفت', 'الأستاذة أمان زيد'],
  departmentStars: [
    { dept: 'إدارة التقنية والدعم الفني', name: 'المهندس عباس باعلوي' },
    { dept: 'إدارة البرامج والمسارات', name: '—' },
    { dept: 'إدارة التسويق والإعلام', name: '—' },
    { dept: 'إدارة الموارد البشرية', name: '—' },
  ],
}

/* ══════════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════════ */

const TYPE_AR: Record<MemberType, string> = {
  volunteer: 'متطوع',
  staff: 'موظف',
  partner: 'شريك',
}

const TYPE_COLORS: Record<MemberType, string> = {
  volunteer: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  staff: 'bg-[#2691C2]/[0.08] text-[#2691C2] border-[#2691C2]/30',
  partner: 'bg-violet-50 text-violet-700 border-violet-200',
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
}

const AVATAR_GRADIENTS: string[] = [
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-violet-500 to-purple-600',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
  'from-indigo-500 to-blue-600',
]

function avatarGradient(id: number): string {
  return AVATAR_GRADIENTS[id % AVATAR_GRADIENTS.length]
}

function formatJoinedAt(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null
  try {
    return new Date(dateStr).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return null
  }
}

/* ══════════════════════════════════════════════════════════════════
   COMPONENTS
══════════════════════════════════════════════════════════════════ */

function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-100 ${className}`} />
}

/* ── Password-shown-once modal ─────────────────────────────────── */

function PasswordModal({
  email,
  password,
  onClose,
}: {
  email: string
  password: string
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)

  function copy() {
    void navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-2">
          <div>
            <p className="text-[15px] font-black text-[#22334A]">تم إنشاء الحساب بنجاح</p>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
              احفظ كلمة المرور الآن، لن يتم عرضها مرة أخرى.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Email */}
        <div className="mb-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
          <p className="text-[10px] font-bold text-slate-400">البريد الإلكتروني</p>
          <p className="mt-0.5 text-[13px] font-black text-[#22334A]">{email}</p>
        </div>

        {/* Password */}
        <div className="mb-5 rounded-xl border border-[#2691C2]/30 bg-[#2691C2]/[0.05] px-4 py-3">
          <p className="text-[10px] font-bold text-[#2691C2]">كلمة المرور المؤقتة</p>
          <p className="mt-1 break-all font-mono text-[15px] font-black tracking-wider text-[#22334A]">
            {password}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={copy}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#2691C2] px-4 py-2.5 text-[12px] font-black text-white transition hover:bg-[#1a7aaa]"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
            {copied ? 'تم النسخ' : 'نسخ كلمة المرور'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-[12px] font-bold text-slate-600 transition hover:bg-slate-50"
          >
            تم
          </button>
        </div>
      </motion.div>
    </div>
  )
}

/* ── Member card ───────────────────────────────────────────────── */

function MemberCard({
  member,
  idx,
  onUpdated,
}: {
  member: InternalMember
  idx: number
  onUpdated?: (updated: InternalMember) => void
}) {
  const [creating, setCreating] = useState(false)
  // Drive from has_user_account (backend) or user_id presence — not a sentinel -1
  const [hasAccount, setHasAccount] = useState(
    () => Boolean(member.has_user_account) || member.user_id != null,
  )
  const [modal, setModal] = useState<{ email: string; password: string } | null>(null)

  async function handleCreateAccount() {
    setCreating(true)
    try {
      const result = await createUserAccount(member.id)

      if (result.already_linked) {
        toast.success('هذا العضو لديه حساب مرتبط بالفعل.')
        setHasAccount(true)
        return
      }

      if (result.linked_existing) {
        toast.success('تم ربط العضو بحساب موجود بنجاح.')
        setHasAccount(true)
        const userId = result.user?.id ?? null
        onUpdated?.({ ...member, user_id: userId, has_user_account: true, linked_user: result.user })
        return
      }

      // New account created — show password modal
      if (result.created && result.temporary_password && member.email) {
        setHasAccount(true)
        const userId = result.user?.id ?? null
        onUpdated?.({ ...member, user_id: userId, has_user_account: true, linked_user: result.user })
        setModal({ email: member.email, password: result.temporary_password })
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'تعذّر إنشاء الحساب. حاول مرة أخرى.')
    } finally {
      setCreating(false)
    }
  }

  const joinedLabel = formatJoinedAt(member.joined_at ?? member.created_at)

  return (
    <>
      <AnimatePresence>
        {modal && (
          <PasswordModal
            email={modal.email}
            password={modal.password}
            onClose={() => setModal(null)}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: Math.min(idx * 0.04, 0.4) }}
        className="group relative flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_4px_0_rgba(15,23,42,0.05)] transition hover:border-[#2691C2]/30 hover:shadow-[0_4px_16px_0_rgba(38,145,194,0.08)]"
      >
        {/* New badge */}
        {member.is_new && (
          <span className="absolute -top-2 -start-2 z-10 rounded-xl border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700 shadow-sm">
            عضو جديد
          </span>
        )}

        {/* Avatar + type badge */}
        <div className="flex items-start justify-between gap-2">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${avatarGradient(member.id)} text-[13px] font-black text-white shadow-sm`}
          >
            {member.avatar_url ? (
              <img
                src={member.avatar_url}
                alt={member.name}
                className="h-full w-full rounded-2xl object-cover"
              />
            ) : (
              initials(member.name)
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span
              className={`rounded-xl border px-2.5 py-1 text-[10px] font-bold ${TYPE_COLORS[member.member_type]}`}
            >
              {TYPE_AR[member.member_type]}
            </span>
            {hasAccount && (
              <span className="flex items-center gap-1 rounded-lg border border-[#2691C2]/25 bg-[#2691C2]/[0.07] px-2 py-0.5 text-[10px] font-bold text-[#2691C2]">
                <Link2 className="h-2.5 w-2.5" />
                مرتبط بحساب
              </span>
            )}
          </div>
        </div>

        {/* Name + dept */}
        <div className="flex-1">
          <p className="text-[14px] font-black leading-snug text-[#22334A]">{member.name}</p>
          {member.department && (
            <p className="mt-0.5 text-[11px] font-semibold text-slate-400">{member.department}</p>
          )}
          {member.role_label && (
            <p className="mt-0.5 text-[11px] font-medium text-slate-400">{member.role_label}</p>
          )}
        </div>

        {/* Contact info */}
        {(member.email ?? member.phone) && (
          <div className="space-y-1">
            {member.email && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate font-medium">{member.email}</span>
              </div>
            )}
            {member.phone && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Phone className="h-3 w-3 shrink-0" />
                <span className="font-medium">{member.phone}</span>
              </div>
            )}
          </div>
        )}

        {/* Skills */}
        {member.skills && (
          <p className="line-clamp-1 text-[11px] font-medium text-slate-400">{member.skills}</p>
        )}

        {/* Source badge */}
        {member.volunteer_request_id && (
          <span className="self-start rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
            محوّل من طلب تطوع
          </span>
        )}

        {/* Joined date */}
        {joinedLabel && (
          <p className="text-[10px] font-semibold text-slate-400">انضم: {joinedLabel}</p>
        )}

        {/* Create account — only when not linked and has email */}
        {!hasAccount && member.email && (
          <button
            type="button"
            onClick={handleCreateAccount}
            disabled={creating}
            className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#2691C2]/40 bg-[#2691C2]/[0.04] px-3 py-2 text-[11px] font-bold text-[#2691C2] transition hover:border-[#2691C2]/70 hover:bg-[#2691C2]/[0.08] disabled:opacity-50"
          >
            <UserPlus className="h-3.5 w-3.5" />
            {creating ? 'جاري الإنشاء...' : 'إنشاء حساب'}
          </button>
        )}
      </motion.div>
    </>
  )
}

/* ── Recognition card ──────────────────────────────────────────── */

function RecognitionCard() {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="overflow-hidden rounded-2xl border border-amber-200/70 bg-gradient-to-l from-amber-50 to-yellow-50 shadow-sm"
      dir="rtl"
    >
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-4 px-6 py-4 text-right transition hover:bg-amber-50/60"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
          <Award className="h-5 w-5 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-black text-[#22334A]">
            تكريم شهر {RECOGNITION.period} — مركز EMC
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-amber-700">
            الأعضاء المتميزون هذا الشهر
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-amber-500" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-amber-500" />
        )}
      </button>

      {/* Body — collapsible */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-amber-200/60 px-6 pb-5 pt-4">
              {/* Best department */}
              <div className="flex items-start gap-3 rounded-xl border border-amber-200/50 bg-white/60 px-4 py-3">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div>
                  <p className="text-[11px] font-semibold text-amber-600">
                    أفضل إدارة خلال شهر {RECOGNITION.period}
                  </p>
                  <p className="mt-0.5 text-[13px] font-black text-[#22334A]">
                    {RECOGNITION.topDepartment.name}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-500">
                    بقيادة: {RECOGNITION.topDepartment.leader}
                  </p>
                </div>
              </div>

              {/* Best volunteers */}
              <div className="flex items-start gap-3 rounded-xl border border-amber-200/50 bg-white/60 px-4 py-3">
                <Star className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div>
                  <p className="text-[11px] font-semibold text-amber-600">أفضل المتطوعين</p>
                  <p className="mt-0.5 text-[13px] font-black text-[#22334A]">
                    {RECOGNITION.topVolunteers.join('، ')}
                  </p>
                </div>
              </div>

              {/* Department stars */}
              <div className="rounded-xl border border-amber-200/50 bg-white/60 px-4 py-3">
                <p className="mb-2 text-[11px] font-semibold text-amber-600">
                  أبرز المتطوعين حسب الإدارات
                </p>
                <div className="space-y-1.5">
                  {RECOGNITION.departmentStars.map((row) => (
                    <div
                      key={row.dept}
                      className="flex items-center justify-between gap-2 text-[12px]"
                    >
                      <span className="font-semibold text-slate-500">{row.dept}</span>
                      <span className="font-black text-[#22334A]">{row.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Group section header ──────────────────────────────────────── */

function GroupHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-500">
        {label}
        <span className="mr-1.5 font-mono tabular-nums text-slate-400">({count})</span>
      </span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   VIEW TYPES
══════════════════════════════════════════════════════════════════ */

type ViewMode = 'all' | 'new' | 'by_dept' | 'by_type'

const VIEW_TABS: { mode: ViewMode; label: string }[] = [
  { mode: 'all', label: 'جميع الأعضاء' },
  { mode: 'new', label: 'الأعضاء الجدد' },
  { mode: 'by_dept', label: 'حسب الإدارة' },
  { mode: 'by_type', label: 'حسب النوع' },
]

/* ══════════════════════════════════════════════════════════════════
   PAGE COMPONENT
══════════════════════════════════════════════════════════════════ */

export default function MembersPage() {
  const [members, setMembers] = useState<InternalMember[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [search, setSearch] = useState('')
  const [refreshTs, setRefreshTs] = useState(new Date())

  async function load() {
    setLoading(true)
    const data = await fetchMembers()
    setMembers(data)
    setRefreshTs(new Date())
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  function handleMemberUpdated(updated: InternalMember) {
    setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
  }

  /* ── filtered + grouped ─────────────────────────────────────────── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = members
    if (viewMode === 'new') list = members.filter((m) => m.is_new)
    if (q) {
      list = list.filter((m) =>
        `${m.name} ${m.email ?? ''} ${m.department ?? ''} ${m.skills ?? ''}`.toLowerCase().includes(q),
      )
    }
    return list
  }, [members, viewMode, search])

  /* Grouped views */
  const byDept = useMemo(() => {
    if (viewMode !== 'by_dept') return null
    const map = new Map<string, InternalMember[]>()
    filtered.forEach((m) => {
      const key = m.department || 'غير محدد'
      const arr = map.get(key) ?? []
      arr.push(m)
      map.set(key, arr)
    })
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ar'))
  }, [filtered, viewMode])

  const byType = useMemo(() => {
    if (viewMode !== 'by_type') return null
    const order: MemberType[] = ['staff', 'volunteer', 'partner']
    const map = new Map<MemberType, InternalMember[]>()
    order.forEach((t) => map.set(t, []))
    filtered.forEach((m) => {
      const arr = map.get(m.member_type) ?? []
      arr.push(m)
      map.set(m.member_type, arr)
    })
    return order.map((t) => [t, map.get(t) ?? []] as [MemberType, InternalMember[]]).filter(([, arr]) => arr.length > 0)
  }, [filtered, viewMode])

  const newCount = members.filter((m) => m.is_new).length

  // suppress unused warning — refreshTs is intentionally tracked for future use
  void refreshTs

  return (
    <div className="space-y-5 pb-8" dir="rtl">
      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-1">
        <div>
          <h1 className="text-[18px] font-black text-[#22334A]">الأعضاء</h1>
          <p className="mt-0.5 text-[11px] font-medium text-slate-400">
            الفريق الداخلي — الأعضاء المحوّلون والموظفون والشركاء
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {newCount > 0 && (
            <span className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-black text-amber-700">
              <Sparkles className="h-3.5 w-3.5" />
              {newCount} عضو جديد
            </span>
          )}
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>
      </div>

      {/* ── Recognition card ──────────────────────────────────────── */}
      <RecognitionCard />

      {/* ── Stats bar ────────────────────────────────────────────── */}
      {!loading && members.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              { type: 'staff' as MemberType, icon: Users, color: '#2691C2' },
              { type: 'volunteer' as MemberType, icon: HeartHandshake, color: '#10b981' },
              { type: 'partner' as MemberType, icon: Award, color: '#7c3aed' },
            ] as const
          ).map(({ type, icon: Icon, color }) => {
            const count = members.filter((m) => m.member_type === type).length
            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setViewMode('by_type')
                  setSearch('')
                }}
                className="flex flex-col gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm transition hover:border-[#2691C2]/30"
              >
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-lg"
                  style={{ background: `${color}16` }}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color }} />
                </div>
                <p className="font-mono text-[20px] font-black tabular-nums" style={{ color }}>
                  {count}
                </p>
                <p className="text-[11px] font-semibold text-slate-500">{TYPE_AR[type]}</p>
              </button>
            )
          })}
        </div>
      )}

      {/* ── View tabs ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {VIEW_TABS.map(({ mode, label }) => {
          const active = viewMode === mode
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`rounded-xl px-4 py-2 text-[12px] font-black transition ${
                active
                  ? 'bg-[#22334A] text-white shadow-md'
                  : 'border border-slate-200 bg-white text-[#22334A]/60 hover:text-[#22334A]'
              }`}
            >
              {label}
              {mode === 'new' && newCount > 0 && (
                <span
                  className={`mr-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-black tabular-nums ${
                    active ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {newCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Search ────────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالاسم أو الإدارة أو المهارات..."
          dir="rtl"
          className="h-11 w-full rounded-2xl border border-slate-200 bg-white pr-10 pl-4 text-sm font-semibold text-[#22334A] outline-none placeholder:text-slate-400 focus:border-[#2691C2] focus:ring-4 focus:ring-sky-100"
        />
      </div>

      {/* ── Content ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Sk key={i} className="h-52" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-20 text-center">
          <Users className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-4 font-black text-[#22334A]">
            {members.length === 0 ? 'لا توجد بيانات كافية بعد' : 'لا نتائج تطابق البحث'}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-400">
            {members.length === 0
              ? 'قبل طلبات التطوع وحوّل المتطوعين إلى أعضاء لتظهر هنا'
              : 'جرّب تغيير الفلتر أو مصطلح البحث'}
          </p>
        </div>
      ) : viewMode === 'by_dept' && byDept ? (
        <div className="space-y-8">
          {byDept.map(([dept, deptMembers]) => (
            <div key={dept}>
              <GroupHeader label={dept} count={deptMembers.length} />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {deptMembers.map((m, idx) => (
                  <MemberCard key={m.id} member={m} idx={idx} onUpdated={handleMemberUpdated} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === 'by_type' && byType ? (
        <div className="space-y-8">
          {byType.map(([type, typeMembers]) => (
            <div key={type}>
              <GroupHeader label={TYPE_AR[type]} count={typeMembers.length} />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {typeMembers.map((m, idx) => (
                  <MemberCard key={m.id} member={m} idx={idx} onUpdated={handleMemberUpdated} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((m, idx) => (
            <MemberCard key={m.id} member={m} idx={idx} onUpdated={handleMemberUpdated} />
          ))}
        </div>
      )}

      {/* Footer count */}
      {!loading && filtered.length > 0 && (
        <p className="text-center font-mono text-[11px] font-semibold text-slate-400">
          {filtered.length} عضو
        </p>
      )}
    </div>
  )
}
