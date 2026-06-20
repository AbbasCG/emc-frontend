import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Award,
  Building2,
  CalendarDays,
  Check,
  ClipboardCopy,
  Crown,
  Heart,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Star,
  Trophy,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { createUserAccount, fetchMembers, type InternalMember, type MemberType } from '@/api/membersApi'
import { grantRecognition, type GrantRecognitionPayload, type RecognitionTypeName } from '@/api/recognitionApi'
import { toast } from '@/lib/toast'
import { useAuth } from '@/contexts/AuthContext'
import { normalizeRole } from '@/utils/dashboardAccess'

/* ══════════════════════════════════════════════════════════════════
   STATIC RECOGNITION CONFIG  — replace with API (fetchRecognitions)
   once the backend is ready. See src/api/recognitionApi.ts.
══════════════════════════════════════════════════════════════════ */

const RECOGNITION = {
  period: 'مايو 2025',
  month: '2025-05',
  totalCount: 8,
  topDepartment: {
    name: 'إدارة التقنية والدعم الفني',
    leader: 'المهندس عباس باعلوي',
    memberCount: 6,
    reason: 'أعلى معدل إنجاز في مشاريع الدعم الفني خلال الشهر',
  },
  topMembers: [
    { name: 'الأستاذة أُلفت', initials: 'أل', type: 'تكريم فردي' },
    { name: 'الأستاذة أمان زيد', initials: 'أز', type: 'مساهمة مميزة' },
  ],
  departmentRecognitions: [
    { dept: 'إدارة التقنية والدعم الفني', recognitionType: 'أفضل إدارة', member: null, achievement: 'أعلى معدل إنجاز' },
    { dept: 'إدارة البرامج والمسارات', recognitionType: 'تكريم فردي', member: 'الأستاذة أُلفت', achievement: null },
    { dept: 'إدارة الموارد البشرية', recognitionType: 'تكريم فردي', member: 'الأستاذة أمان زيد', achievement: null },
    { dept: 'الإدارة العليا', recognitionType: null, member: null, achievement: null },
    { dept: 'إدارة التسويق والإعلام', recognitionType: null, member: null, achievement: null },
    { dept: 'إدارة الشراكات والعلاقات', recognitionType: null, member: null, achievement: null },
    { dept: 'الإدارة المالية', recognitionType: null, member: null, achievement: null },
    { dept: 'إدارة الجودة والحوكمة', recognitionType: null, member: null, achievement: null },
  ] as { dept: string; recognitionType: string | null; member: string | null; achievement: string | null }[],
} as const

/* ══════════════════════════════════════════════════════════════════
   RECOGNITION TYPE OPTIONS
══════════════════════════════════════════════════════════════════ */

type RecognitionTypeOption = {
  id: RecognitionTypeName
  label: string
  Icon: React.ComponentType<{ className?: string }>
  colorClass: string
  description: string
}

const RECOGNITION_TYPE_OPTIONS: RecognitionTypeOption[] = [
  { id: 'individual',       label: 'تكريم فردي',      Icon: Star,     colorClass: 'text-amber-600 bg-amber-50 border-amber-200',   description: 'تكريم لأداء فردي متميز' },
  { id: 'department',       label: 'تكريم إدارة',     Icon: Building2,colorClass: 'text-[#2691C2] bg-sky-50 border-sky-200',        description: 'تكريم لإدارة بأكملها' },
  { id: 'best_department',  label: 'أفضل إدارة',      Icon: Crown,    colorClass: 'text-amber-700 bg-amber-100 border-amber-300',   description: 'جائزة أفضل إدارة للشهر' },
  { id: 'achievement',      label: 'إنجاز خاص',       Icon: Trophy,   colorClass: 'text-[#EC943C] bg-orange-50 border-orange-200',  description: 'إنجاز أو مشروع متميز' },
  { id: 'contribution',     label: 'مساهمة مميزة',    Icon: Award,    colorClass: 'text-rose-600 bg-rose-50 border-rose-200',       description: 'مساهمة قيمة في المنظمة' },
  { id: 'tech_support',     label: 'دعم فني متميز',   Icon: Shield,   colorClass: 'text-teal-600 bg-teal-50 border-teal-200',       description: 'أداء متميز في الدعم الفني' },
  { id: 'leadership',       label: 'قيادة فريق',      Icon: Users,    colorClass: 'text-violet-600 bg-violet-50 border-violet-200', description: 'قيادة ناجحة لفريق أو مشروع' },
  { id: 'volunteer_award',  label: 'تطوع مميز',       Icon: Heart,    colorClass: 'text-emerald-600 bg-emerald-50 border-emerald-200', description: 'تطوع ومبادرة متميزة' },
]

/* ══════════════════════════════════════════════════════════════════
   HELPERS & CONSTANTS
══════════════════════════════════════════════════════════════════ */

const TYPE_AR: Record<MemberType, string> = {
  volunteer: 'عضو',
  staff: 'موظف',
  partner: 'شريك',
}

const TYPE_COLORS: Record<MemberType, { bg: string; text: string; border: string }> = {
  volunteer: { bg: 'bg-[#2691C2]/[0.08]', text: 'text-[#2691C2]', border: 'border-[#2691C2]/30' },
  staff: { bg: 'bg-[#22334A]/[0.06]', text: 'text-[#22334A]', border: 'border-[#22334A]/20' },
  partner: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
}

const STAT_COLORS: Record<MemberType, { accent: string; bg: string }> = {
  volunteer: { accent: '#2691C2', bg: 'rgba(38,145,194,0.08)' },
  staff: { accent: '#22334A', bg: 'rgba(34,51,74,0.06)' },
  partner: { accent: '#EC943C', bg: 'rgba(236,148,60,0.08)' },
}

const AVATAR_GRADIENTS = [
  'from-[#2691C2] to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-violet-500 to-purple-600',
  'from-[#EC943C] to-orange-500',
  'from-rose-500 to-pink-500',
  'from-[#22334A] to-[#2691C2]',
]

/** Roles that can grant recognition to ANY member/department. */
const FULL_GRANT_ROLES = new Set(['super_admin', 'tech_admin', 'admin', 'hr_manager', 'executive_admin', 'community_manager', 'partnerships_manager'])

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
}

function avatarGradient(id: number): string {
  return AVATAR_GRADIENTS[id % AVATAR_GRADIENTS.length]
}

function formatJoinedAt(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null
  try {
    return new Intl.DateTimeFormat('ar-u-nu-latn', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(dateStr))
  } catch {
    return null
  }
}

function currentMonthValue(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

type RecognitionBadge = {
  label: string
  icon: 'crown' | 'star' | 'trophy' | 'award'
  tooltip: string
}

function getMemberBadges(member: InternalMember): RecognitionBadge[] {
  const badges: RecognitionBadge[] = []

  // Department-level: every active member in the awarded department gets the badge
  if (
    member.department &&
    member.department.trim() === RECOGNITION.topDepartment.name.trim()
  ) {
    badges.push({
      label: 'أفضل إدارة',
      icon: 'crown',
      tooltip: 'عضو في الإدارة المكرّمة لهذا الشهر',
    })
  }

  // Individual top-member recognition
  const nameWords = (n: string) => n.trim().split(/\s+/).filter((w) => w.length > 1)
  const nameMatches = (a: string, b: string) => {
    const aw = nameWords(a)
    const bw = nameWords(b)
    return a.includes(b) || b.includes(a) || aw.some((w) => bw.includes(w))
  }

  const isTopMember = RECOGNITION.topMembers.some((tm) => nameMatches(member.name, tm.name))
  if (isTopMember) {
    badges.push({
      label: 'عضو مكرّم',
      icon: 'star',
      tooltip: `تكريم ${RECOGNITION.period} — تكريم فردي`,
    })
  }

  return badges
}

/* ══════════════════════════════════════════════════════════════════
   SKELETON
══════════════════════════════════════════════════════════════════ */

function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-100 ${className}`} />
}

/* ══════════════════════════════════════════════════════════════════
   PASSWORD MODAL
══════════════════════════════════════════════════════════════════ */

function PasswordModal({ email, password, onClose }: { email: string; password: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    void navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 10 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-2">
          <div>
            <p className="text-[15px] font-black text-[#22334A]">تم إنشاء الحساب بنجاح</p>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
              احفظ كلمة المرور الآن، لن يتم عرضها مرة أخرى.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mb-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
          <p className="text-[10px] font-bold text-slate-400">البريد الإلكتروني</p>
          <p className="mt-0.5 text-[13px] font-black text-[#22334A]">{email}</p>
        </div>
        <div className="mb-5 rounded-xl border border-[#2691C2]/30 bg-[#2691C2]/[0.05] px-4 py-3">
          <p className="text-[10px] font-bold text-[#2691C2]">كلمة المرور المؤقتة</p>
          <p className="mt-1 break-all font-mono text-[15px] font-black tracking-wider text-[#22334A]">{password}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={copy}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#2691C2] px-4 py-2.5 text-[12px] font-black text-white transition hover:bg-[#1a7aaa]"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
            {copied ? 'تم النسخ' : 'نسخ كلمة المرور'}
          </button>
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-[12px] font-bold text-slate-600 transition hover:bg-slate-50">
            تم
          </button>
        </div>
      </motion.div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   GRANT RECOGNITION MODAL
══════════════════════════════════════════════════════════════════ */

type RecipientType = 'member' | 'department' | 'team'

function GrantRecognitionModal({
  members,
  onClose,
  restrictDepartment = null,
}: {
  members: InternalMember[]
  onClose: () => void
  /** When set, the grant is locked to this single department (Dept. Manager scope). */
  restrictDepartment?: string | null
}) {
  /* Dept. Managers may only target individual members within their own department. */
  const eligibleMembers = useMemo(
    () =>
      restrictDepartment
        ? members.filter((m) => (m.department?.trim() ?? '') === restrictDepartment)
        : members,
    [members, restrictDepartment],
  )

  const [recipientType, setRecipientType] = useState<RecipientType>('member')
  const [recipientId, setRecipientId] = useState('')
  const [recognitionType, setRecognitionType] = useState<RecognitionTypeName | ''>('')
  const [month, setMonth] = useState(currentMonthValue())
  const [reason, setReason] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'internal'>('public')
  const [submitting, setSubmitting] = useState(false)

  const departments = useMemo(
    () =>
      restrictDepartment
        ? [restrictDepartment]
        : [...new Set(members.map((m) => m.department).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'ar')),
    [members, restrictDepartment],
  )

  const selectedType = RECOGNITION_TYPE_OPTIONS.find((t) => t.id === recognitionType)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!recipientId || !recognitionType) {
      toast.error('يرجى اختيار المستلم ونوع التكريم.')
      return
    }
    /* Defence-in-depth: never let a scoped grant target a member outside the allowed department.
       The backend MUST enforce this too — frontend hiding is not a security boundary. */
    if (restrictDepartment && recipientType === 'member') {
      const target = eligibleMembers.find((m) => String(m.id) === recipientId)
      if (!target) {
        toast.error('يمكنك منح التكريم لأعضاء إدارتك فقط.')
        return
      }
    }
    setSubmitting(true)
    try {
      const payload: GrantRecognitionPayload = {
        recipient_type: recipientType,
        recipient_id: recipientId,
        recognition_type: recognitionType as RecognitionTypeName,
        month,
        title: selectedType?.label ?? recognitionType,
        reason: reason.trim() || undefined,
        visibility,
      }
      await grantRecognition(payload)
      toast.success('تم منح التكريم بنجاح.')
      onClose()
    } catch {
      toast.warning(
        'هذه الميزة تحتاج ربط بـ API الخادم. راجع src/api/recognitionApi.ts للعقد المطلوب.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -16 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        className="my-8 w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EC943C]/10">
              <Sparkles className="h-4.5 w-4.5 text-[#EC943C]" />
            </div>
            <div>
              <p className="text-[15px] font-black text-[#22334A]">منح تكريم جديد</p>
              <p className="text-[10px] font-semibold text-slate-400">مركز EMC — {RECOGNITION.period}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-5 p-6">
          {restrictDepartment && (
            <div className="rounded-xl border border-[#2691C2]/20 bg-[#2691C2]/[0.05] px-3.5 py-2.5 text-[11px] font-bold text-[#2691C2]">
              يمكنك منح التكريم لأعضاء إدارتك فقط — {restrictDepartment}
            </div>
          )}
          {/* Recipient type */}
          <div>
            <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">
              نوع المستلم
            </label>
            <div className={`grid gap-2 ${restrictDepartment ? 'grid-cols-1' : 'grid-cols-3'}`}>
              {(
                (restrictDepartment
                  ? [{ val: 'member', label: 'عضو', Icon: Users }]
                  : [
                      { val: 'member',     label: 'عضو',   Icon: Users },
                      { val: 'department', label: 'إدارة', Icon: Building2 },
                      { val: 'team',       label: 'فريق',  Icon: Users },
                    ]) as { val: RecipientType; label: string; Icon: React.ComponentType<{ className?: string }> }[]
              ).map(({ val, label, Icon }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => { setRecipientType(val); setRecipientId('') }}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 text-[11px] font-bold transition ${
                    recipientType === val
                      ? 'border-[#2691C2] bg-[#2691C2]/[0.06] text-[#2691C2]'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Recipient selector */}
          <div>
            <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">
              {recipientType === 'member' ? 'اختر العضو' : recipientType === 'department' ? 'اختر الإدارة' : 'اختر الفريق'}
            </label>
            <div className="relative">
              <select
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                required
                className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pe-10 ps-3 text-[13px] font-semibold text-[#22334A] outline-none focus:border-[#2691C2] focus:ring-3 focus:ring-sky-100"
              >
                <option value="">— اختر —</option>
                {recipientType === 'member' &&
                  eligibleMembers.map((m) => (
                    <option key={m.id} value={String(m.id)}>
                      {m.name}{m.department ? ` · ${m.department}` : ''}
                    </option>
                  ))}
                {recipientType === 'department' &&
                  departments.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                {recipientType === 'team' && (
                  <option value="main_team">الفريق الرئيسي</option>
                )}
              </select>
              <Building2 className="pointer-events-none absolute end-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>
            {recipientType === 'department' && recipientId && (
              <p className="mt-1.5 text-[10px] font-semibold text-[#2691C2]">
                سيحصل جميع الأعضاء النشطين في هذه الإدارة على شارة التكريم تلقائياً.
              </p>
            )}
          </div>

          {/* Recognition type grid */}
          <div>
            <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">
              نوع التكريم
            </label>
            <div className="grid grid-cols-2 gap-2">
              {RECOGNITION_TYPE_OPTIONS.map((opt) => {
                const active = recognitionType === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRecognitionType(opt.id)}
                    className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-right transition ${
                      active
                        ? `${opt.colorClass} shadow-sm`
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <opt.Icon className={`h-3.5 w-3.5 shrink-0 ${active ? '' : 'text-slate-400'}`} />
                    <span className="text-[11px] font-bold">{opt.label}</span>
                  </button>
                )
              })}
            </div>
            {selectedType && (
              <p className="mt-1.5 text-[10px] font-semibold text-slate-400">{selectedType.description}</p>
            )}
          </div>

          {/* Month + visibility row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">
                الشهر
              </label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                required
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[13px] font-semibold text-[#22334A] outline-none focus:border-[#2691C2] focus:ring-3 focus:ring-sky-100"
              />
            </div>
            <div>
              <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">
                الظهور
              </label>
              <div className="flex h-10 overflow-hidden rounded-xl border border-slate-200">
                {(
                  [
                    { val: 'public' as const, label: 'عام' },
                    { val: 'internal' as const, label: 'داخلي' },
                  ]
                ).map(({ val, label }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setVisibility(val)}
                    className={`flex flex-1 items-center justify-center text-[11px] font-bold transition ${
                      visibility === val
                        ? 'bg-[#22334A] text-white'
                        : 'bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">
              سبب التكريم <span className="font-semibold normal-case text-slate-400">(اختياري)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="أضف ملاحظة أو وصفاً مختصراً لسبب التكريم..."
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] font-semibold text-[#22334A] outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-[#2691C2] focus:ring-3 focus:ring-sky-100"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 border-t border-slate-100 pt-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#EC943C] px-4 py-2.5 text-[13px] font-black text-white transition hover:bg-[#d4833a] disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  جاري المنح...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  منح التكريم
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-[12px] font-bold text-slate-600 transition hover:bg-slate-50"
            >
              إلغاء
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   RECOGNITION STRIP (compact banner)
══════════════════════════════════════════════════════════════════ */

function RecognitionStrip({
  canGrant,
  onGrant,
  scopeDepartment,
}: {
  canGrant: boolean
  onGrant: () => void
  /** When set, grants are limited to this department (Dept. Manager scope). */
  scopeDepartment?: string | null
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#22334A]/12 bg-white px-5 py-3.5 shadow-sm">
      {/* Left: title + month */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50">
          <Crown className="h-4 w-4 text-amber-600" />
        </div>
        <div>
          <p className="text-[13px] font-black text-[#22334A]">
            تكريم شهر {RECOGNITION.period}
          </p>
          <p className="text-[10px] font-semibold text-slate-400">مركز EMC — الأعضاء المتميزون</p>
        </div>
      </div>

      {/* Stats chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-[#22334A]">
          <Sparkles className="h-3 w-3 text-amber-500" />
          {RECOGNITION.totalCount} تكريم
        </span>

        {RECOGNITION.topDepartment && (
          <span className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
            <Building2 className="h-3 w-3" />
            <span className="max-w-[120px] truncate">{RECOGNITION.topDepartment.name}</span>
          </span>
        )}

        {RECOGNITION.topMembers[0] && (
          <span className="flex items-center gap-1.5 rounded-lg border border-[#2691C2]/25 bg-[#2691C2]/[0.06] px-2.5 py-1 text-[11px] font-bold text-[#2691C2]">
            <Star className="h-3 w-3" />
            <span className="max-w-[110px] truncate">{RECOGNITION.topMembers[0].name}</span>
          </span>
        )}

        {canGrant && (
          <div className="flex flex-col items-end gap-1">
            <button
              type="button"
              onClick={onGrant}
              className="flex items-center gap-1.5 rounded-xl bg-[#EC943C] px-3.5 py-1.5 text-[12px] font-black text-white transition hover:bg-[#d4833a] active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              منح تكريم
            </button>
            {scopeDepartment && (
              <span className="text-[10px] font-semibold text-slate-400">
                يمكنك منح التكريم لأعضاء إدارتك فقط
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   RECOGNITION SECTION (3 cards)
══════════════════════════════════════════════════════════════════ */

function RecognitionSection({ members }: { members: InternalMember[] }) {
  // How many members are in the top dept
  const topDeptMemberCount = useMemo(
    () =>
      RECOGNITION.topDepartment
        ? members.filter((m) => m.department?.trim() === RECOGNITION.topDepartment.name.trim()).length
        : 0,
    [members],
  )

  return (
    <div className="grid gap-4 lg:grid-cols-3" dir="rtl">
      {/* Card 1 — Best Department (compact, no big yellow) */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
        className="flex flex-col gap-3 rounded-2xl border border-[#22334A]/15 bg-white p-5 shadow-sm"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
              <Crown className="h-4 w-4 text-amber-600" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600">أفضل إدارة</span>
          </div>
          <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700">
            {RECOGNITION.period}
          </span>
        </div>

        <div>
          <p className="text-[15px] font-black leading-snug text-[#22334A]">
            {RECOGNITION.topDepartment.name}
          </p>
          {RECOGNITION.topDepartment.reason && (
            <p className="mt-1 text-[11px] font-semibold text-slate-500">
              {RECOGNITION.topDepartment.reason}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#22334A] to-[#2691C2] text-[11px] font-black text-white`}>
            {initials(RECOGNITION.topDepartment.leader)}
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-semibold text-slate-400">بقيادة</p>
            <p className="truncate text-[12px] font-black text-[#22334A]">
              {RECOGNITION.topDepartment.leader}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <Users className="h-3.5 w-3.5 text-slate-400" />
            <span>
              {topDeptMemberCount > 0 ? topDeptMemberCount : RECOGNITION.topDepartment.memberCount} عضو يحملون الشارة
            </span>
          </div>
          <span className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-600">
            <Trophy className="h-2.5 w-2.5" />
            فائزة
          </span>
        </div>
      </motion.div>

      {/* Card 2 — Top Members */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.1 }}
        className="flex flex-col gap-3 rounded-2xl border border-[#2691C2]/15 bg-white p-5 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2691C2]/10">
            <Star className="h-4 w-4 text-[#2691C2]" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider text-[#2691C2]">أبرز الأعضاء</span>
        </div>

        <div className="flex-1 space-y-2">
          {RECOGNITION.topMembers.map((tm, i) => (
            <div
              key={tm.name}
              className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5"
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${i === 0 ? 'from-amber-400 to-orange-400' : 'from-[#2691C2] to-cyan-500'} text-[12px] font-black text-white`}
              >
                {tm.initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-[12px] font-black text-[#22334A]">{tm.name}</p>
                <span className="inline-flex items-center gap-0.5 rounded-md bg-[#2691C2]/[0.08] px-1.5 py-0.5 text-[9px] font-bold text-[#2691C2]">
                  {tm.type}
                </span>
              </div>
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[9px] font-black text-amber-700">
                #{i + 1}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border border-[#2691C2]/15 bg-[#2691C2]/[0.04] px-3 py-2 text-[10px] font-semibold text-[#2691C2]">
          <Award className="h-3 w-3" />
          تكريمات فردية لشهر {RECOGNITION.period}
        </div>
      </motion.div>

      {/* Card 3 — Department Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.15 }}
        className="flex flex-col gap-3 rounded-2xl border border-[#EC943C]/15 bg-white p-5 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EC943C]/10">
            <Building2 className="h-4 w-4 text-[#EC943C]" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider text-[#EC943C]">أبرز الإدارات</span>
        </div>

        <div className="flex-1 space-y-1.5 overflow-y-auto">
          {RECOGNITION.departmentRecognitions.map((row) => {
            const hasRecognition = row.recognitionType !== null
            return (
              <div
                key={row.dept}
                className={`flex items-start justify-between gap-2 rounded-xl px-3 py-2 text-[11px] transition ${
                  hasRecognition
                    ? 'border border-amber-100 bg-amber-50/50'
                    : 'border border-slate-100 bg-slate-50/50'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-[11px] font-bold ${hasRecognition ? 'text-[#22334A]' : 'text-slate-400'}`}>
                    {row.dept}
                  </p>
                  {row.recognitionType && (
                    <p className="text-[9px] font-semibold text-amber-600">{row.recognitionType}</p>
                  )}
                  {row.achievement && (
                    <p className="text-[9px] font-semibold text-slate-500">{row.achievement}</p>
                  )}
                </div>
                {row.member ? (
                  <p className="shrink-0 max-w-[100px] truncate text-[10px] font-black text-[#22334A]">{row.member}</p>
                ) : hasRecognition ? (
                  <span className="shrink-0 flex items-center gap-0.5 rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                    <Crown className="h-2.5 w-2.5" />
                    إدارة
                  </span>
                ) : (
                  <span className="shrink-0 text-[9px] italic text-slate-300">—</span>
                )}
              </div>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   RECOGNITION BADGE COMPONENT
══════════════════════════════════════════════════════════════════ */

function RecognitionBadgeChip({ badge }: { badge: RecognitionBadge }) {
  return (
    <span
      title={badge.tooltip}
      className={`flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-bold ${
        badge.icon === 'crown'
          ? 'border-amber-200 bg-amber-50 text-amber-700'
          : badge.icon === 'star'
            ? 'border-[#2691C2]/25 bg-[#2691C2]/[0.08] text-[#2691C2]'
            : 'border-slate-200 bg-slate-50 text-slate-600'
      }`}
    >
      {badge.icon === 'crown'  && <Crown  className="h-2.5 w-2.5" />}
      {badge.icon === 'star'   && <Star   className="h-2.5 w-2.5" />}
      {badge.icon === 'trophy' && <Trophy className="h-2.5 w-2.5" />}
      {badge.icon === 'award'  && <Award  className="h-2.5 w-2.5" />}
      {badge.label}
    </span>
  )
}

/* ══════════════════════════════════════════════════════════════════
   MEMBER CARD
══════════════════════════════════════════════════════════════════ */

function MemberCard({ member, idx, onUpdated, canManage }: { member: InternalMember; idx: number; onUpdated?: (updated: InternalMember) => void; canManage?: boolean }) {
  const [creating, setCreating] = useState(false)
  const [hasAccount, setHasAccount] = useState(() => Boolean(member.has_user_account) || member.user_id != null)
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
        onUpdated?.({ ...member, user_id: result.user?.id ?? null, has_user_account: true, linked_user: result.user })
        return
      }
      if (result.created && result.temporary_password && member.email) {
        setHasAccount(true)
        onUpdated?.({ ...member, user_id: result.user?.id ?? null, has_user_account: true, linked_user: result.user })
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
  const badges = getMemberBadges(member)
  const typeStyle = TYPE_COLORS[member.member_type]
  // Don't show role_label if it's just the same as the type name (e.g. "موظف" = "staff")
  const showRoleLabel = member.role_label && member.role_label.trim() !== TYPE_AR[member.member_type]

  return (
    <>
      <AnimatePresence>
        {modal && <PasswordModal email={modal.email} password={modal.password} onClose={() => setModal(null)} />}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: Math.min(idx * 0.04, 0.4) }}
        whileHover={{ y: -2, transition: { duration: 0.15 } }}
        className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_8px_0_rgba(15,23,42,0.06)] transition-shadow hover:border-[#2691C2]/30 hover:shadow-[0_8px_24px_0_rgba(38,145,194,0.12)]"
      >
        {/* Color accent bar */}
        <div className={`h-[3px] w-full bg-gradient-to-l ${avatarGradient(member.id)}`} aria-hidden />

        {/* New badge */}
        {member.is_new && (
          <span className="absolute top-3 start-3 z-10 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 shadow-sm">
            جديد
          </span>
        )}

        <div className="flex flex-col gap-3 p-4">
          {/* Header: Avatar + Name + Type badge */}
          <div className="flex items-start gap-3">
            <div className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${avatarGradient(member.id)} text-[14px] font-black text-white shadow-sm`}>
              {member.avatar_url ? (
                <img src={member.avatar_url} alt={member.name} className="h-full w-full rounded-2xl object-cover" />
              ) : (
                initials(member.name)
              )}
              {hasAccount && (
                <span className="absolute -bottom-1 -end-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-[#2691C2]">
                  <Check className="h-2 w-2 text-white" />
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-1">
                <p className="line-clamp-2 text-[14px] font-black leading-tight text-[#22334A]">
                  {member.name}
                </p>
                <span className={`shrink-0 rounded-lg border px-2 py-0.5 text-[10px] font-bold ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}>
                  {TYPE_AR[member.member_type]}
                </span>
              </div>
              {member.department && (
                <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                  <Building2 className="h-3 w-3 shrink-0" />
                  <span className="truncate font-semibold">{member.department}</span>
                </div>
              )}
              {showRoleLabel && (
                <p className="mt-0.5 line-clamp-1 text-[11px] font-medium text-slate-400">{member.role_label}</p>
              )}
            </div>
          </div>

          {/* Recognition badges */}
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {badges.map((badge) => (
                <RecognitionBadgeChip key={badge.label} badge={badge} />
              ))}
            </div>
          )}

          {/* Contact */}
          {(member.email ?? member.phone) && (
            <div className="space-y-1 rounded-xl bg-slate-50/80 p-2.5">
              {member.email && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Mail className="h-3 w-3 shrink-0 text-slate-400" />
                  <span className="truncate font-medium">{member.email}</span>
                </div>
              )}
              {member.phone && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Phone className="h-3 w-3 shrink-0 text-slate-400" />
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
            <span className="self-start rounded-lg border border-[#2691C2]/20 bg-[#2691C2]/[0.06] px-2 py-0.5 text-[10px] font-bold text-[#2691C2]">
              منضم عبر طلب عضوية
            </span>
          )}

          {/* Footer */}
          <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
            {joinedLabel ? (
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                <CalendarDays className="h-3 w-3 shrink-0" />
                <span>{joinedLabel}</span>
              </div>
            ) : (
              <span />
            )}
          </div>

          {/* Create account — management action, restricted to authorized roles */}
          {!hasAccount && member.email && canManage && (
            <button
              type="button"
              onClick={handleCreateAccount}
              disabled={creating}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#2691C2]/40 bg-[#2691C2]/[0.04] px-3 py-2 text-[11px] font-bold text-[#2691C2] transition hover:border-[#2691C2]/70 hover:bg-[#2691C2]/[0.08] disabled:opacity-50"
            >
              <UserPlus className="h-3.5 w-3.5" />
              {creating ? 'جاري الإنشاء...' : 'إنشاء حساب'}
            </button>
          )}
        </div>
      </motion.div>
    </>
  )
}

/* ══════════════════════════════════════════════════════════════════
   GROUP HEADER
══════════════════════════════════════════════════════════════════ */

function GroupHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="h-px flex-1 bg-gradient-to-l from-slate-200 to-transparent" />
      <span className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-[12px] font-black text-[#22334A] shadow-sm">
        {label}
        <span className="mr-1.5 rounded-lg bg-[#2691C2]/[0.08] px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-[#2691C2]">
          {count}
        </span>
      </span>
      <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   VIEW TYPES
══════════════════════════════════════════════════════════════════ */

type ViewMode = 'all' | 'new' | 'by_dept' | 'by_type'

const VIEW_TABS: { mode: ViewMode; label: string }[] = [
  { mode: 'all',     label: 'جميع الأعضاء' },
  { mode: 'new',     label: 'الأعضاء الجدد' },
  { mode: 'by_dept', label: 'حسب الإدارة' },
  { mode: 'by_type', label: 'حسب النوع' },
]

/* ══════════════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════════════ */

export default function MembersPage() {
  const { user } = useAuth()
  const role = normalizeRole(user?.role) ?? ''
  const userDepartment = user?.department?.trim() || null

  const [members, setMembers] = useState<InternalMember[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [search, setSearch] = useState('')
  const [showGrantModal, setShowGrantModal] = useState(false)
  const [refreshTs, setRefreshTs] = useState(new Date())

  /* Members in the current user's own department (used for Dept. Manager grant scope). */
  const ownDeptMembers = useMemo(
    () =>
      userDepartment
        ? members.filter((m) => (m.department?.trim() ?? '') === userDepartment)
        : [],
    [members, userDepartment],
  )

  /* Recognition grant permissions:
     - Full-scope roles can grant to anyone.
     - Dept. Manager can grant ONLY to members in their own department (and only if any exist). */
  const isFullGrantRole = FULL_GRANT_ROLES.has(role)
  const isDeptManager = role === 'department_manager'
  const canGrant = isFullGrantRole || (isDeptManager && ownDeptMembers.length > 0)
  const grantScopeDepartment = isFullGrantRole ? null : isDeptManager ? userDepartment : null
  const canManage = isFullGrantRole || isDeptManager

  async function load() {
    setLoading(true)
    setLoadError(false)
    try {
      const data = await fetchMembers()
      setMembers(data)
    } catch {
      setMembers([])
      setLoadError(true)
    } finally {
      setRefreshTs(new Date())
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  function handleMemberUpdated(updated: InternalMember) {
    setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
  }

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
    return order
      .map((t) => [t, map.get(t) ?? []] as [MemberType, InternalMember[]])
      .filter(([, arr]) => arr.length > 0)
  }, [filtered, viewMode])

  const newCount = members.filter((m) => m.is_new).length

  void refreshTs

  return (
    <div className="space-y-5 pb-8" dir="rtl">
      {/* Grant Recognition Modal */}
      <AnimatePresence>
        {showGrantModal && (
          <GrantRecognitionModal
            members={members}
            restrictDepartment={grantScopeDepartment}
            onClose={() => setShowGrantModal(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Page header ──────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-[#22334A]/10 bg-gradient-to-l from-[#22334A] via-[#2a3f5a] to-[#2691C2]/70 p-6 text-white shadow-lg">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-10 -end-10 h-36 w-36 rounded-full bg-white/5" />
          <div className="absolute -bottom-6 start-16 h-24 w-24 rounded-full bg-white/5" />
          <div className="absolute top-1/2 end-1/3 h-16 w-16 -translate-y-1/2 rounded-full bg-[#2691C2]/20" />
        </div>
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <Users className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-[22px] font-black text-white">الأعضاء</h1>
            </div>
            <p className="mt-1.5 text-[12px] font-medium text-white/60">
              الفريق الداخلي — الأعضاء المحوّلون والموظفون والشركاء
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!loading && members.length > 0 && (
              <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                <span className="font-mono text-[20px] font-black tabular-nums text-white">
                  {members.length}
                </span>
                <span className="text-[11px] font-semibold text-white/70">عضو</span>
              </div>
            )}
            {newCount > 0 && (
              <div className="flex items-center gap-1.5 rounded-xl border border-emerald-300/30 bg-emerald-400/20 px-3 py-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
                <span className="text-[11px] font-black text-emerald-300">{newCount} جديد</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-[12px] font-bold text-white/80 backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-40"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </button>
          </div>
        </div>
      </div>

      {/* ── Compact recognition strip ────────────────────────────── */}
      <RecognitionStrip
        canGrant={canGrant}
        onGrant={() => setShowGrantModal(true)}
        scopeDepartment={grantScopeDepartment}
      />

      {/* ── Recognition cards ────────────────────────────────────── */}
      <RecognitionSection members={members} />

      {/* ── Stats bar ────────────────────────────────────────────── */}
      {!loading && members.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {(['staff', 'volunteer', 'partner'] as MemberType[]).map((type) => {
            const count = members.filter((m) => m.member_type === type).length
            const { accent, bg } = STAT_COLORS[type]
            return (
              <button
                key={type}
                type="button"
                onClick={() => { setViewMode('by_type'); setSearch('') }}
                className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-right shadow-sm transition hover:border-[#2691C2]/30 hover:shadow-md"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: bg }}>
                  <Users className="h-4 w-4" style={{ color: accent }} />
                </div>
                <p className="font-mono text-[22px] font-black tabular-nums" style={{ color: accent }}>
                  {count}
                </p>
                <p className="text-[11px] font-bold text-slate-500">{TYPE_AR[type]}</p>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Filters ──────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-1">
          {VIEW_TABS.map(({ mode, label }) => {
            const active = viewMode === mode
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`relative flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-bold transition-all ${
                  active
                    ? 'bg-[#22334A] text-white shadow-md'
                    : 'text-slate-500 hover:bg-white hover:text-[#22334A]'
                }`}
              >
                {label}
                {mode === 'new' && newCount > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black tabular-nums ${active ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                    {newCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الإدارة أو المهارات..."
            dir="rtl"
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white pr-11 pl-4 text-sm font-semibold text-[#22334A] outline-none placeholder:text-slate-400 focus:border-[#2691C2] focus:ring-4 focus:ring-sky-100"
          />
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Sk key={i} className="h-60" />)}
        </div>
      ) : loadError ? (
        <div className="rounded-3xl border border-dashed border-rose-200 bg-rose-50/40 py-20 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100">
            <Users className="h-8 w-8 text-rose-400" />
          </div>
          <p className="mt-4 text-[15px] font-black text-[#22334A]">تعذّر تحميل قائمة الأعضاء</p>
          <p className="mt-1 text-[12px] font-semibold text-slate-400">
            قد لا تملك صلاحية الوصول، أو حدث خطأ في الخادم.
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="mx-auto mt-4 flex items-center gap-1.5 rounded-xl bg-[#2691C2] px-5 py-2.5 text-[12px] font-black text-white transition hover:bg-[#1a7aaa]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            إعادة المحاولة
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-20 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <Users className="h-8 w-8 text-slate-300" />
          </div>
          <p className="mt-4 text-[15px] font-black text-[#22334A]">
            {members.length === 0 ? 'لا توجد بيانات بعد' : 'لا نتائج تطابق البحث'}
          </p>
          <p className="mt-1 text-[12px] font-semibold text-slate-400">
            {members.length === 0
              ? 'أضف الأعضاء وحوّل طلبات الانتساب لتظهر هنا'
              : 'جرّب تغيير الفلتر أو مصطلح البحث'}
          </p>
        </div>
      ) : viewMode === 'by_dept' && byDept ? (
        <div className="space-y-8">
          {byDept.map(([dept, deptMembers]) => (
            <div key={dept}>
              <GroupHeader label={dept} count={deptMembers.length} />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {deptMembers.map((m, idx) => <MemberCard key={m.id} member={m} idx={idx} onUpdated={handleMemberUpdated} canManage={canManage} />)}
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
                {typeMembers.map((m, idx) => <MemberCard key={m.id} member={m} idx={idx} onUpdated={handleMemberUpdated} canManage={canManage} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((m, idx) => <MemberCard key={m.id} member={m} idx={idx} onUpdated={handleMemberUpdated} canManage={canManage} />)}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <p className="text-center font-mono text-[11px] font-semibold text-slate-400">
          {filtered.length} من الأعضاء
        </p>
      )}
    </div>
  )
}
