import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Building2,
  Check,
  ChevronDown,
  Copy,
  Crown,
  Eye,
  EyeOff,
  ImageOff,
  Link2,
  Link2Off,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserPlus,
  UserX,
  Users,
  X,
} from 'lucide-react'
import {
  getAdminTeam,
  createTeamProfile,
  updateTeamProfile,
  deleteTeamProfile,
  uploadTeamProfilePhoto,
  getTeamProfileDetail,
  searchAdminUsers,
  linkUserToTeamProfile,
  unlinkUserFromTeamProfile,
  createAccountForTeamProfile,
  type AdminTeamProfile,
  type CreateAccountResult,
  type CreateTeamProfilePayload,
  type Department,
  type TeamMember,
  type UserSearchResult,
} from '@/services/teamApi'
import { errorToast, successToast } from '@/lib/toast'
import { RowActionsMenu } from '@/pages/super-admin/crud/shared/RowActions'

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
}

/* ── Types ───────────────────────────────────────────────────────────────── */

type FlatRow = {
  key: string
  member: TeamMember
  dept: Department
}

/* ── Avatar component ────────────────────────────────────────────────────── */

function Avatar({
  src,
  name,
  size = 'md',
}: {
  src: string | null | undefined
  name: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const dim = size === 'sm' ? 'h-10 w-10' : size === 'lg' ? 'h-20 w-20' : 'h-14 w-14'
  const textSz = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-xl' : 'text-sm'

  return (
    <div
      className={`relative ${dim} shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-customBlue/10 to-slate-100 ring-2 ring-white shadow`}
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <>
          <div
            className={`flex h-full w-full items-center justify-center font-black text-deepBlue ${textSz}`}
          >
            {initials(name)}
          </div>
          <span className="absolute bottom-0.5 left-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-600/80 shadow">
            <ImageOff size={8} className="text-white" />
          </span>
        </>
      )}
    </div>
  )
}

/* ── Account status badge helper ─────────────────────────────────────────── */

function AccountBadge({ member }: { member: TeamMember }) {
  if (!member.user_id) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[9px] font-black text-slate-500">
        <UserX size={8} /> لا يوجد حساب
      </span>
    )
  }
  if (member.user_is_active === false) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[9px] font-black text-amber-700">
        <AlertTriangle size={8} /> الحساب غير نشط
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[9px] font-black text-emerald-700">
      <UserCheck size={8} /> مرتبط بحساب
    </span>
  )
}

/* ── Stat card ───────────────────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string
  value: number | string
  icon: React.ElementType
  accent: 'blue' | 'orange' | 'navy' | 'green'
}) {
  const colors = {
    blue: 'bg-sky-50 text-customBlue border-sky-100',
    orange: 'bg-orange-50 text-customOrange border-orange-100',
    navy: 'bg-deepBlue/[0.06] text-deepBlue border-deepBlue/10',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm ring-1 ring-deepBlue/[0.04]">
      <div
        className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border ${colors[accent]}`}
      >
        <Icon size={18} />
      </div>
      <p className="text-2xl font-black text-deepBlue tabular-nums">{value}</p>
      <p className="mt-1 text-[12px] font-semibold text-slate-500">{label}</p>
    </div>
  )
}

/* ── Member card ─────────────────────────────────────────────────────────── */

function MemberCard({
  member,
  dept,
  onDetail,
  onEdit,
  onDelete,
  onPhotoUpload,
  onManageAccount,
}: {
  member: TeamMember
  dept: Department
  onDetail: () => void
  onEdit: () => void
  onDelete: () => void
  onPhotoUpload: (file: File) => void
  onManageAccount: () => void
}) {
  const photoInputRef = useRef<HTMLInputElement>(null)
  const src = member.image

  const isPublic = member.is_active !== false

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="relative rounded-2xl border border-slate-100 bg-white p-4 shadow-sm ring-1 ring-deepBlue/[0.04] transition hover:shadow-md"
      dir="rtl"
    >
      {/* Public/private badge */}
      <span
        className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black ${
          isPublic
            ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border border-slate-200 bg-slate-100 text-slate-500'
        }`}
      >
        {isPublic ? <Eye size={8} /> : <EyeOff size={8} />}
        {isPublic ? 'عام' : 'داخلي'}
      </span>

      {/* Avatar + name row */}
      <div className="mt-4 flex items-start gap-3">
        <Avatar src={src} name={member.name_ar} size="md" />

        <div className="min-w-0 flex-1 text-right">
          <p className="truncate font-black leading-snug text-deepBlue">{member.name_ar}</p>
          {member.name_en && (
            <p className="mt-0.5 truncate text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {member.name_en}
            </p>
          )}
          <p className="mt-1 line-clamp-2 text-[12px] font-semibold leading-relaxed text-slate-600">
            {member.position_ar}
          </p>
        </div>

        {/* Actions */}
        <div className="relative shrink-0">
          <RowActionsMenu
            ariaLabel={`خيارات ${member.name_ar}`}
            actions={[
              { key: 'detail', label: 'عرض التفاصيل', onClick: onDetail },
              { key: 'edit', label: 'تعديل', onClick: onEdit },
              { key: 'account', label: 'إدارة الحساب', onClick: onManageAccount },
              {
                key: 'photo',
                label: member.image ? 'تغيير الصورة' : 'إضافة صورة',
                onClick: () => photoInputRef.current?.click(),
              },
              { key: 'delete', label: 'حذف', onClick: onDelete, destructive: true },
            ]}
          />
        </div>
      </div>

      {/* Hidden file input for photo upload */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onPhotoUpload(file)
          e.target.value = ''
        }}
      />

      {/* Badges */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {member.is_leader && (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-black text-amber-800">
            <Crown size={9} /> قائد
          </span>
        )}
        {member.is_executive && (
          <span className="inline-flex items-center gap-1 rounded-full border border-customBlue/20 bg-customBlue/[0.07] px-2.5 py-0.5 text-[10px] font-black text-customBlue">
            <Shield size={9} /> تنفيذي
          </span>
        )}
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600">
          <Building2 size={9} /> {dept.name_ar}
        </span>
        <AccountBadge member={member} />
      </div>
    </motion.article>
  )
}

/* ── Department section ──────────────────────────────────────────────────── */

function DeptSection({
  dept,
  rows,
  onDetail,
  onEdit,
  onDelete,
  onPhotoUpload,
  onManageAccount,
}: {
  dept: Department
  rows: FlatRow[]
  onDetail: (r: FlatRow) => void
  onEdit: (r: FlatRow) => void
  onDelete: (r: FlatRow) => void
  onPhotoUpload: (r: FlatRow, file: File) => void
  onManageAccount: (r: FlatRow) => void
}) {
  const leaders = dept.members.filter((m) => m.is_leader).length
  const publicCount = dept.members.filter((m) => m.is_active !== false).length

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-lg ring-1 ring-deepBlue/[0.04]"
      dir="rtl"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 text-right">
        <div>
          <h2 className="text-lg font-black text-deepBlue">{dept.name_ar}</h2>
          {dept.name_en && (
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {dept.name_en}
            </p>
          )}
          {dept.description_ar?.trim() && (
            <p className="mt-2 line-clamp-2 max-w-2xl text-[12px] font-semibold leading-relaxed text-slate-500">
              {dept.description_ar}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-black text-deepBlue">
            <Users size={12} /> {dept.members.length} عضو
          </span>
          {leaders > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-black text-amber-800">
              <Crown size={12} /> {leaders} قائد
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-black text-emerald-700">
            <Eye size={12} /> {publicCount} عام
          </span>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="px-6 py-8 text-center text-[13px] font-semibold text-slate-400">
          لا يوجد أعضاء مطابقون في هذا القسم.
        </div>
      ) : (
        <div className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((r, i) => (
            <motion.div
              key={r.key}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
            >
              <MemberCard
                member={r.member}
                dept={r.dept}
                onDetail={() => onDetail(r)}
                onEdit={() => onEdit(r)}
                onDelete={() => onDelete(r)}
                onPhotoUpload={(file) => onPhotoUpload(r, file)}
                onManageAccount={() => onManageAccount(r)}
              />
            </motion.div>
          ))}
        </div>
      )}
    </motion.section>
  )
}

/* ── Detail drawer ───────────────────────────────────────────────────────── */

function DetailDrawer({ row, onClose }: { row: FlatRow | null; onClose: () => void }) {
  const src = row?.member.image ?? null
  const isPublic = row?.member.is_active !== false

  return (
    <AnimatePresence>
      {row && (
        <>
          <motion.button
            type="button"
            aria-label="إغلاق"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-slate-100 bg-white shadow-2xl"
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <p className="font-black text-deepBlue">بطاقة العضو</p>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-6">
              <div className="flex flex-col items-center gap-3 text-center">
                <Avatar src={src} name={row.member.name_ar} size="lg" />
                <div>
                  <p className="text-lg font-black text-deepBlue">{row.member.name_ar}</p>
                  {row.member.name_en && (
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      {row.member.name_en}
                    </p>
                  )}
                  <p className="mt-1 text-[13px] font-semibold text-slate-600">
                    {row.member.position_ar}
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {row.member.is_leader && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-black text-amber-800">
                      <Crown size={9} /> قائد
                    </span>
                  )}
                  {row.member.is_executive && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-customBlue/20 bg-customBlue/[0.07] px-2.5 py-0.5 text-[10px] font-black text-customBlue">
                      <Shield size={9} /> تنفيذي
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-black ${
                      isPublic
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-slate-100 text-slate-500'
                    }`}
                  >
                    {isPublic ? <Eye size={9} /> : <EyeOff size={9} />}
                    {isPublic ? 'ظاهر على الموقع' : 'داخلي فقط'}
                  </span>
                  <AccountBadge member={row.member} />
                </div>
              </div>

              {row.member.bio_ar && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-right">
                  <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">نبذة</p>
                  <p className="mt-1 text-[13px] font-semibold leading-relaxed text-slate-700">
                    {row.member.bio_ar}
                  </p>
                </div>
              )}

              <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-right">
                {[
                  { label: 'الإدارة', value: row.dept.name_ar },
                  { label: 'رقم العضو', value: `#${row.member.id}` },
                  ...(row.member.role_key ? [{ label: 'مفتاح الدور', value: row.member.role_key }] : []),
                  {
                    label: 'الصورة',
                    value: row.member.image
                      ? 'صورة مخصصة'
                      : row.member.user_avatar_url
                      ? 'صورة الحساب'
                      : 'لا توجد صورة',
                  },
                  ...(row.member.user_id
                    ? [{ label: 'مرتبط بمستخدم', value: `#${row.member.user_id}` }]
                    : []),
                  ...(row.member.user_name
                    ? [{ label: 'اسم المستخدم', value: row.member.user_name }]
                    : []),
                  ...(row.member.user_email
                    ? [{ label: 'بريد المستخدم', value: row.member.user_email }]
                    : []),
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-start justify-between gap-3">
                    <span className="shrink-0 text-[11px] font-black uppercase tracking-wide text-slate-400">
                      {label}
                    </span>
                    <span className="text-right text-[13px] font-semibold text-deepBlue">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 p-4">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl border border-slate-200 py-2.5 text-[12px] font-black text-deepBlue hover:bg-slate-50"
              >
                إغلاق
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

/* ── User Account Modal ──────────────────────────────────────────────────── */

type AccountView = 'status' | 'search' | 'created'

function UserAccountModal({
  profile,
  onClose,
  onUpdated,
}: {
  profile: AdminTeamProfile
  onClose: () => void
  onUpdated: (p: AdminTeamProfile) => void
}) {
  const [view, setView] = useState<AccountView>('status')
  const [searchQ, setSearchQ] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<UserSearchResult[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [linking, setLinking] = useState(false)
  const [unlinking, setUnlinking] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createResult, setCreateResult] = useState<CreateAccountResult | null>(null)
  const [copied, setCopied] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* Debounced search */
  useEffect(() => {
    if (!searchQ.trim()) {
      setResults([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await searchAdminUsers(searchQ.trim())
        setResults(res)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 350)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchQ])

  async function handleLink() {
    if (!selectedUserId) return
    setLinking(true)
    try {
      const updated = await linkUserToTeamProfile(profile.id, selectedUserId)
      successToast('تم ربط الحساب بنجاح.')
      onUpdated(updated)
      onClose()
    } catch {
      errorToast('تعذّر ربط الحساب. يرجى المحاولة مجدداً.')
    } finally {
      setLinking(false)
    }
  }

  async function handleUnlink() {
    setUnlinking(true)
    try {
      const updated = await unlinkUserFromTeamProfile(profile.id)
      successToast('تم فك ربط الحساب بنجاح.')
      onUpdated(updated)
      onClose()
    } catch {
      errorToast('تعذّر فك ربط الحساب.')
    } finally {
      setUnlinking(false)
    }
  }

  async function handleCreateAccount() {
    setCreating(true)
    try {
      const result = await createAccountForTeamProfile(profile.id)
      setCreateResult(result)
      if (result.created) {
        setView('created')
        // Refresh the profile in parent with updated user_id
        const updated = await getTeamProfileDetail(profile.id)
        onUpdated(updated)
      } else if (result.already_linked) {
        successToast('هذا العضو لديه حساب مرتبط بالفعل.')
        onClose()
      } else if (result.linked_existing) {
        successToast('تم ربط الحساب الموجود بنجاح.')
        const updated = await getTeamProfileDetail(profile.id)
        onUpdated(updated)
        onClose()
      }
    } catch {
      errorToast('تعذّر إنشاء الحساب. يرجى المحاولة مجدداً.')
    } finally {
      setCreating(false)
    }
  }

  async function copyPassword() {
    const pw = createResult?.temporary_password
    if (!pw) return
    try {
      await navigator.clipboard.writeText(pw)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  const hasAccount = !!profile.user_id
  const userIsActive = profile.user?.is_active !== false

  return (
    <>
      <motion.button
        type="button"
        aria-label="إغلاق"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-x-4 top-8 z-50 mx-auto max-w-md overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[440px]"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <UserCheck size={18} className="text-customBlue" />
            <p className="font-black text-deepBlue">إدارة الحساب</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto">
          {/* Member identity */}
          <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4 text-right">
            <Avatar
              src={profile.resolved_photo_url ?? profile.image ?? profile.user_avatar_url}
              name={profile.name_ar}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-black text-deepBlue">{profile.name_ar}</p>
              <p className="mt-0.5 truncate text-[12px] font-semibold text-slate-500">
                {profile.position_ar}
              </p>
            </div>
          </div>

          {/* ── View: status ──────────────────────────────────────────────── */}
          {view === 'status' && (
            <div className="space-y-4 p-6">
              {/* Current status */}
              {hasAccount ? (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-right">
                  <p className="mb-3 text-[11px] font-black uppercase tracking-wide text-slate-400">
                    حساب المستخدم المرتبط
                  </p>
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={profile.user?.avatar_url ?? null}
                      name={profile.user?.name ?? profile.name_ar}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-black text-deepBlue">
                        {profile.user?.name ?? '—'}
                      </p>
                      <p className="mt-0.5 truncate text-[12px] font-semibold text-slate-500">
                        {profile.user?.email ?? '—'}
                      </p>
                    </div>
                    {userIsActive ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[9px] font-black text-emerald-700">
                        <UserCheck size={8} /> نشط
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[9px] font-black text-amber-700">
                        <AlertTriangle size={8} /> غير نشط
                      </span>
                    )}
                  </div>
                  {profile.user?.role && (
                    <p className="mt-3 text-[12px] font-semibold text-slate-500">
                      الدور:{' '}
                      <span className="font-black text-deepBlue">{profile.user.role}</span>
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center">
                  <UserX size={28} className="mx-auto text-slate-300" />
                  <p className="mt-3 font-black text-deepBlue">لا يوجد حساب مرتبط</p>
                  <p className="mt-1 text-[12px] font-semibold text-slate-400">
                    {profile.email
                      ? `سيتم استخدام: ${profile.email}`
                      : 'أضف بريداً إلكترونياً للعضو أولاً لإنشاء حساب.'}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2">
                {!hasAccount && (
                  <>
                    <button
                      type="button"
                      onClick={() => setView('search')}
                      className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-[12px] font-black text-deepBlue hover:bg-slate-50"
                    >
                      <Link2 size={13} /> ربط بحساب موجود
                    </button>
                    <button
                      type="button"
                      disabled={creating || !profile.email}
                      onClick={() => void handleCreateAccount()}
                      className="flex items-center justify-center gap-2 rounded-xl bg-customBlue py-2.5 text-[12px] font-black text-white shadow hover:bg-customBlue/90 disabled:opacity-50"
                    >
                      {creating ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <UserPlus size={13} />
                      )}
                      {profile.email ? 'إنشاء حساب مستخدم' : 'أضف بريداً إلكترونياً أولاً'}
                    </button>
                  </>
                )}
                {hasAccount && (
                  <button
                    type="button"
                    disabled={unlinking}
                    onClick={() => void handleUnlink()}
                    className="flex items-center justify-center gap-2 rounded-xl border border-rose-200 py-2.5 text-[12px] font-black text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                  >
                    {unlinking ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Link2Off size={13} />
                    )}
                    فك ربط الحساب
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── View: search ──────────────────────────────────────────────── */}
          {view === 'search' && (
            <div className="space-y-4 p-6">
              <button
                type="button"
                onClick={() => { setView('status'); setSearchQ(''); setResults([]) }}
                className="flex items-center gap-1.5 text-[12px] font-black text-slate-500 hover:text-deepBlue"
              >
                ← رجوع
              </button>

              <div className="relative">
                <Search
                  size={14}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  autoFocus
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="ابحث بالاسم أو البريد الإلكتروني..."
                  dir="rtl"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pr-9 pl-3 text-sm font-semibold text-deepBlue outline-none placeholder:text-slate-400 focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
                {searching && (
                  <Loader2
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 animate-spin text-customBlue"
                  />
                )}
              </div>

              {results.length > 0 && (
                <div className="space-y-1 rounded-2xl border border-slate-100 bg-slate-50 p-2">
                  {results.map((u) => (
                    <label
                      key={u.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition ${
                        selectedUserId === u.id ? 'bg-customBlue/[0.07]' : 'hover:bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="user-select"
                        value={u.id}
                        checked={selectedUserId === u.id}
                        onChange={() => setSelectedUserId(u.id)}
                        className="accent-customBlue"
                      />
                      <Avatar src={u.avatar_url} name={u.name} size="sm" />
                      <div className="min-w-0 flex-1 text-right">
                        <p className="truncate text-[13px] font-black text-deepBlue">{u.name}</p>
                        <p className="truncate text-[11px] font-semibold text-slate-500">{u.email}</p>
                      </div>
                      {!u.is_active && (
                        <span className="shrink-0 text-[9px] font-black text-amber-600">غير نشط</span>
                      )}
                    </label>
                  ))}
                </div>
              )}

              {searchQ.trim() && !searching && results.length === 0 && (
                <p className="py-4 text-center text-[12px] font-semibold text-slate-400">
                  لا توجد نتائج مطابقة
                </p>
              )}

              <button
                type="button"
                disabled={!selectedUserId || linking}
                onClick={() => void handleLink()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-customBlue py-2.5 text-[12px] font-black text-white shadow hover:bg-customBlue/90 disabled:opacity-50"
              >
                {linking ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />}
                ربط الحساب المحدد
              </button>
            </div>
          )}

          {/* ── View: created ─────────────────────────────────────────────── */}
          {view === 'created' && createResult && (
            <div className="space-y-4 p-6 text-right">
              <div className="flex flex-col items-center gap-2 py-2 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
                  <UserCheck size={28} className="text-emerald-600" />
                </div>
                <p className="text-lg font-black text-deepBlue">تم إنشاء الحساب بنجاح</p>
                <p className="text-[12px] font-semibold text-slate-500">
                  {createResult.user?.name} — {createResult.user?.email}
                </p>
              </div>

              {createResult.temporary_password && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-amber-700">
                    كلمة المرور المؤقتة — تظهر مرة واحدة فقط
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-xl border border-amber-200 bg-white px-3 py-2 text-[14px] font-black tracking-wider text-deepBlue">
                      {createResult.temporary_password}
                    </code>
                    <button
                      type="button"
                      onClick={() => void copyPassword()}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-white text-amber-700 transition hover:bg-amber-100"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] font-semibold text-amber-600">
                    يجب على المستخدم تغيير كلمة المرور عند أول تسجيل دخول.
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl bg-deepBlue py-2.5 text-[12px] font-black text-white shadow hover:bg-deepBlue/90"
              >
                تم
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </>
  )
}

/* ── Create/Edit modal ───────────────────────────────────────────────────── */

const EMPTY_FORM: CreateTeamProfilePayload = {
  name_ar: '',
  name_en: '',
  position_ar: '',
  position_en: '',
  department_id: null,
  bio_ar: '',
  is_leader: false,
  is_executive: false,
  is_active: true,
  sort_order: 0,
  email: '',
  phone: '',
}

function ProfileModal({
  mode,
  profile,
  departments,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit'
  profile: AdminTeamProfile | null
  departments: Department[]
  onClose: () => void
  onSaved: (p: AdminTeamProfile) => void
}) {
  const [form, setForm] = useState<CreateTeamProfilePayload>(() =>
    profile
      ? {
          name_ar: profile.name_ar,
          name_en: profile.name_en ?? '',
          position_ar: profile.position_ar,
          position_en: profile.position_en ?? '',
          department_id: profile.department?.id ?? null,
          bio_ar: profile.bio_ar ?? '',
          is_leader: profile.is_leader,
          is_executive: profile.is_executive,
          is_active: profile.is_active,
          sort_order: profile.sort_order,
          email: profile.email ?? '',
          phone: profile.phone ?? '',
        }
      : { ...EMPTY_FORM },
  )
  const [saving, setSaving] = useState(false)

  function set<K extends keyof CreateTeamProfilePayload>(k: K, v: CreateTeamProfilePayload[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: CreateTeamProfilePayload = {
        ...form,
        name_en: form.name_en || null,
        position_en: form.position_en || null,
        bio_ar: form.bio_ar || null,
        email: form.email || null,
        phone: form.phone || null,
        department_id: form.department_id || null,
        sort_order: form.sort_order ?? 0,
      }

      const saved =
        mode === 'create'
          ? await createTeamProfile(payload)
          : await updateTeamProfile(profile!.id, payload)

      successToast(mode === 'create' ? 'تم إضافة العضو بنجاح.' : 'تم تحديث بيانات العضو.')
      onSaved(saved)
    } catch {
      errorToast('حدث خطأ أثناء الحفظ. يرجى المحاولة مجدداً.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <motion.button
        type="button"
        aria-label="إغلاق"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-x-4 top-6 z-50 mx-auto max-w-xl overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[560px]"
        dir="rtl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <p className="font-black text-deepBlue">
            {mode === 'create' ? 'إضافة عضو جديد' : 'تعديل بيانات العضو'}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="max-h-[80vh] overflow-y-auto">
          <div className="space-y-4 p-6">
            {/* Names */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">
                  الاسم (عربي) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.name_ar}
                  onChange={(e) => set('name_ar', e.target.value)}
                  dir="rtl"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-deepBlue outline-none focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">
                  الاسم (إنجليزي)
                </label>
                <input
                  type="text"
                  value={form.name_en ?? ''}
                  onChange={(e) => set('name_en', e.target.value)}
                  dir="ltr"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-deepBlue outline-none focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </div>
            </div>

            {/* Positions */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">
                  المنصب (عربي) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.position_ar}
                  onChange={(e) => set('position_ar', e.target.value)}
                  dir="rtl"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-deepBlue outline-none focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">
                  المنصب (إنجليزي)
                </label>
                <input
                  type="text"
                  value={form.position_en ?? ''}
                  onChange={(e) => set('position_en', e.target.value)}
                  dir="ltr"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-deepBlue outline-none focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </div>
            </div>

            {/* Department */}
            <div>
              <label className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">
                الإدارة
              </label>
              <div className="relative">
                <select
                  value={form.department_id ?? ''}
                  onChange={(e) =>
                    set('department_id', e.target.value ? Number(e.target.value) : null)
                  }
                  dir="rtl"
                  className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pr-3 pl-8 text-sm font-semibold text-deepBlue outline-none focus:border-customBlue"
                >
                  <option value="">— اختر الإدارة —</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name_ar}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">
                نبذة تعريفية (عربي)
              </label>
              <textarea
                rows={3}
                value={form.bio_ar ?? ''}
                onChange={(e) => set('bio_ar', e.target.value)}
                dir="rtl"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-deepBlue outline-none focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-sky-100"
              />
            </div>

            {/* Contact */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  value={form.email ?? ''}
                  onChange={(e) => set('email', e.target.value)}
                  dir="ltr"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-deepBlue outline-none focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">
                  رقم الجوال
                </label>
                <input
                  type="text"
                  value={form.phone ?? ''}
                  onChange={(e) => set('phone', e.target.value)}
                  dir="ltr"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-deepBlue outline-none focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </div>
            </div>

            {/* Sort order */}
            <div className="w-36">
              <label className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">
                ترتيب العرض
              </label>
              <input
                type="number"
                min={0}
                value={form.sort_order ?? 0}
                onChange={(e) => set('sort_order', Number(e.target.value))}
                dir="ltr"
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-deepBlue outline-none focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-sky-100"
              />
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              {(
                [
                  { key: 'is_active', label: 'ظاهر على الموقع (عام)', color: 'emerald' },
                  { key: 'is_leader', label: 'قائد إدارة', color: 'amber' },
                  { key: 'is_executive', label: 'تنفيذي', color: 'sky' },
                ] as const
              ).map(({ key, label, color }) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-2 text-[12px] font-semibold text-slate-700 select-none"
                >
                  <input
                    type="checkbox"
                    checked={!!form[key]}
                    onChange={(e) => set(key, e.target.checked)}
                    className={`h-4 w-4 rounded border-slate-300 accent-${color}-600`}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-[12px] font-black text-deepBlue hover:bg-slate-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-deepBlue px-6 py-2.5 text-[12px] font-black text-white shadow transition hover:bg-deepBlue/90 disabled:opacity-60"
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              {mode === 'create' ? 'إضافة' : 'حفظ التعديلات'}
            </button>
          </div>
        </form>
      </motion.div>
    </>
  )
}

/* ── Delete confirmation ─────────────────────────────────────────────────── */

function DeleteConfirm({
  row,
  onClose,
  onDeleted,
}: {
  row: FlatRow
  onClose: () => void
  onDeleted: (id: number) => void
}) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteTeamProfile(row.member.id)
      successToast('تم حذف العضو بنجاح.')
      onDeleted(row.member.id)
    } catch {
      errorToast('تعذّر حذف العضو. يرجى المحاولة مجدداً.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <motion.button
        type="button"
        aria-label="إغلاق"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="fixed left-1/2 top-1/3 z-50 w-[90vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-slate-100 bg-white p-8 shadow-2xl text-center"
        dir="rtl"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50">
          <Trash2 size={24} className="text-rose-600" />
        </div>
        <p className="text-lg font-black text-deepBlue">حذف العضو</p>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          هل أنت متأكد من حذف{' '}
          <span className="font-black text-deepBlue">{row.member.name_ar}</span>؟ لا يمكن التراجع
          عن هذه الخطوة.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-[12px] font-black text-deepBlue hover:bg-slate-50 disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={deleting}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 py-2.5 text-[12px] font-black text-white shadow hover:bg-rose-700 disabled:opacity-60"
          >
            {deleting && <Loader2 size={13} className="animate-spin" />}
            حذف
          </button>
        </div>
      </motion.div>
    </>
  )
}

/* ── Main page ───────────────────────────────────────────────────────────── */

export default function TeamManagementPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [depts, setDepts] = useState<Department[]>([])
  const [q, setQ] = useState('')
  const [deptFilter, setDeptFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState<'all' | 'leaders' | 'exec' | 'public' | 'internal'>('all')

  const [detail, setDetail] = useState<FlatRow | null>(null)
  const [modalMode, setModalMode] = useState<'none' | 'create' | 'edit'>('none')
  const [editProfile, setEditProfile] = useState<AdminTeamProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<FlatRow | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)

  // Account management state
  const [accountProfile, setAccountProfile] = useState<AdminTeamProfile | null>(null)
  const [accountLoading, setAccountLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAdminTeam()
      setDepts(data)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'تعذّر تحميل بيانات الفريق'
      setError(msg)
      errorToast('تعذّر تحميل بيانات الفريق. تحقق من الاتصال وأعد المحاولة.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  /* Flattened rows */
  const allRows = useMemo<FlatRow[]>(() => {
    const out: FlatRow[] = []
    for (const d of depts) {
      for (const m of d.members) {
        out.push({ key: `${d.id}-${m.id}`, member: m, dept: d })
      }
    }
    return out
  }, [depts])

  const filteredRows = useMemo(() => {
    const t = q.trim().toLowerCase()
    return allRows.filter((r) => {
      if (deptFilter !== 'all' && String(r.dept.id) !== deptFilter) return false
      if (roleFilter === 'leaders' && !r.member.is_leader) return false
      if (roleFilter === 'exec' && !r.member.is_executive) return false
      if (roleFilter === 'public' && r.member.is_active === false) return false
      if (roleFilter === 'internal' && r.member.is_active !== false) return false
      if (t) {
        const hay =
          `${r.member.name_ar} ${r.member.name_en ?? ''} ${r.member.position_ar} ${r.dept.name_ar}`.toLowerCase()
        if (!hay.includes(t)) return false
      }
      return true
    })
  }, [allRows, q, deptFilter, roleFilter])

  const totalMembers = allRows.length
  const totalDepts = depts.length
  const totalLeaders = allRows.filter((r) => r.member.is_leader).length
  const totalPublic = allRows.filter((r) => r.member.is_active !== false).length

  const visibleDepts = useMemo(
    () => depts.filter((d) => deptFilter === 'all' || String(d.id) === deptFilter),
    [depts, deptFilter],
  )

  /* Open edit modal */
  async function openEdit(row: FlatRow) {
    setLoadingProfile(true)
    try {
      const full = await getTeamProfileDetail(row.member.id)
      setEditProfile(full)
      setModalMode('edit')
    } catch {
      errorToast('تعذّر تحميل بيانات العضو.')
    } finally {
      setLoadingProfile(false)
    }
  }

  function openCreate() {
    setEditProfile(null)
    setModalMode('create')
  }

  /* Open account management modal */
  async function openAccountModal(row: FlatRow) {
    setAccountLoading(true)
    try {
      const full = await getTeamProfileDetail(row.member.id)
      setAccountProfile(full)
    } catch {
      errorToast('تعذّر تحميل بيانات العضو.')
    } finally {
      setAccountLoading(false)
    }
  }

  /* Apply updated profile from account modal to local state */
  function handleAccountUpdated(updated: AdminTeamProfile) {
    setAccountProfile(updated)
    // Patch the member in depts state without a full reload
    setDepts((prev) =>
      prev.map((d) => ({
        ...d,
        members: d.members.map((m) =>
          m.id === updated.id
            ? {
                ...m,
                user_id: updated.user_id,
                image: updated.resolved_photo_url ?? updated.image,
                user_avatar_url: updated.user_avatar_url,
                resolved_photo_url: updated.resolved_photo_url,
                user_is_active: updated.user?.is_active ?? null,
                user_name: updated.user?.name ?? null,
                user_email: updated.user?.email ?? null,
                user_role: updated.user?.role ?? null,
              }
            : m,
        ),
      })),
    )
  }

  async function handlePhotoUpload(row: FlatRow, file: File) {
    setPhotoUploading(true)
    try {
      const updated = await uploadTeamProfilePhoto(row.member.id, file)
      setDepts((prev) =>
        prev.map((d) => ({
          ...d,
          members: d.members.map((m) =>
            m.id === row.member.id
              ? { ...m, image: updated.resolved_photo_url ?? updated.image }
              : m,
          ),
        })),
      )
      successToast('تم رفع الصورة بنجاح.')
    } catch {
      errorToast('تعذّر رفع الصورة.')
    } finally {
      setPhotoUploading(false)
    }
  }

  function handleSaved(_saved: AdminTeamProfile) {
    setModalMode('none')
    setEditProfile(null)
    void load()
  }

  function handleDeleted(id: number) {
    setDeleteTarget(null)
    setDepts((prev) =>
      prev.map((d) => ({ ...d, members: d.members.filter((m) => m.id !== id) })),
    )
  }

  return (
    <div className="space-y-6 pb-14" dir="rtl">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <header className="overflow-hidden rounded-[1.75rem] bg-gradient-to-bl from-[#0C2A4B] via-[#1c3a56] to-[#162334] p-8 text-right text-white shadow-2xl lg:p-10">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur-sm">
              <Users size={14} className="text-sky-300" />
              <span className="text-[11px] font-black uppercase tracking-widest text-white/75">
                الفريق الإداري
              </span>
            </div>
            <h1 className="text-2xl font-black leading-snug lg:text-3xl">
              الفريق الإداري
              <span className="mx-2 text-white/40">—</span>
              <span className="text-customBlue/90">إدارات EMC</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-8 text-white/65">
              إدارة أعضاء فريق EMC، تعيين الإدارات، التحكم في الظهور العام، ورفع الصور.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-[12px] font-black text-white backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              تحديث
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-customBlue px-5 py-2.5 text-[12px] font-black text-white shadow-lg transition hover:bg-customBlue/90"
            >
              <Plus size={14} />
              إضافة عضو
            </button>
            <Link
              to="/dashboard/super-admin/crud/departments"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-[12px] font-black text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              <Building2 size={14} />
              الإدارات
            </Link>
          </div>
        </div>

        {!loading && totalMembers > 0 && (
          <div className="mt-6 flex flex-wrap gap-4 border-t border-white/10 pt-5">
            {[
              { label: 'عضو', value: totalMembers },
              { label: 'إدارة', value: totalDepts },
              { label: 'قائد', value: totalLeaders },
              { label: 'ظاهر للعموم', value: totalPublic },
            ].map(({ label, value }) => (
              <div key={label} className="text-right">
                <p className="text-2xl font-black text-white tabular-nums">{value}</p>
                <p className="text-[11px] font-semibold text-white/50">{label}</p>
              </div>
            ))}
          </div>
        )}
      </header>

      {/* ── Stats cards ───────────────────────────────────────────────────── */}
      {!loading && totalMembers > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="إجمالي الأعضاء" value={totalMembers} icon={Users} accent="blue" />
          <StatCard label="عدد الإدارات" value={totalDepts} icon={Building2} accent="navy" />
          <StatCard label="القيادات" value={totalLeaders} icon={Crown} accent="orange" />
          <StatCard label="ظاهرون للعموم" value={totalPublic} icon={Eye} accent="green" />
        </div>
      )}

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      {!loading && totalMembers > 0 && (
        <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm ring-1 ring-deepBlue/[0.04]">
          <div className="relative flex-1 min-w-[180px]">
            <Search
              size={15}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="بحث بالاسم أو المنصب..."
              dir="rtl"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pr-9 pl-3 text-sm font-semibold text-deepBlue outline-none placeholder:text-slate-400 focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-sky-100"
            />
          </div>

          <div className="relative">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              dir="rtl"
              className="h-10 appearance-none rounded-xl border border-slate-200 bg-slate-50 pr-3 pl-8 text-sm font-semibold text-deepBlue outline-none focus:border-customBlue"
            >
              <option value="all">كل الإدارات</option>
              {depts.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  {d.name_ar}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>

          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
              dir="rtl"
              className="h-10 appearance-none rounded-xl border border-slate-200 bg-slate-50 pr-3 pl-8 text-sm font-semibold text-deepBlue outline-none focus:border-customBlue"
            >
              <option value="all">جميع الأعضاء</option>
              <option value="public">ظاهر للعموم</option>
              <option value="internal">داخلي فقط</option>
              <option value="leaders">القيادات فقط</option>
              <option value="exec">التنفيذيون فقط</option>
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>

          {(q || deptFilter !== 'all' || roleFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setQ('')
                setDeptFilter('all')
                setRoleFilter('all')
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-black text-slate-500 hover:bg-slate-50"
            >
              <X size={13} /> مسح الفلاتر
            </button>
          )}

          <p className="mr-auto self-center text-[12px] font-semibold text-slate-400">
            {filteredRows.length} نتيجة
          </p>
        </div>
      )}

      {/* ── Photo uploading indicator ──────────────────────────────────────── */}
      {photoUploading && (
        <div className="flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-700">
          <Loader2 size={15} className="animate-spin" /> جارٍ رفع الصورة...
        </div>
      )}

      {/* ── Loading skeleton ───────────────────────────────────────────────── */}
      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={String(i)} className="h-64 animate-pulse rounded-3xl bg-slate-100" />
          ))}
        </div>
      )}

      {/* ── Error state ───────────────────────────────────────────────────── */}
      {!loading && error && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center">
          <p className="text-lg font-black text-rose-800">تعذّر تحميل بيانات الفريق</p>
          <p className="mt-2 text-sm font-semibold text-rose-600">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-5 rounded-xl bg-deepBlue px-6 py-2.5 text-sm font-black text-white shadow transition hover:bg-deepBlue/90"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {!loading && !error && totalMembers === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-24 text-center shadow-sm">
          <Users className="mx-auto h-14 w-14 text-slate-300" />
          <p className="mt-5 text-xl font-black text-deepBlue">لا يوجد أعضاء في الفريق حتى الآن</p>
          <p className="mt-2 text-sm font-semibold text-slate-400">
            لم تُرجع نقطة API أي بيانات. أضف أعضاء جدد أو تحقق من الإعدادات في الخلفية.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-deepBlue px-6 py-2.5 text-sm font-black text-white shadow transition hover:bg-deepBlue/90"
          >
            <Plus size={14} /> إضافة أول عضو
          </button>
        </div>
      )}

      {/* ── Department sections ────────────────────────────────────────────── */}
      {!loading && !error && totalMembers > 0 && (
        <div className="space-y-5">
          <AnimatePresence mode="popLayout">
            {visibleDepts.map((dept) => {
              const deptRows = filteredRows.filter((r) => r.dept.id === dept.id)
              if (deptFilter === 'all' && deptRows.length === 0) return null
              return (
                <DeptSection
                  key={dept.id}
                  dept={dept}
                  rows={deptRows}
                  onDetail={setDetail}
                  onEdit={(r) => void openEdit(r)}
                  onDelete={setDeleteTarget}
                  onPhotoUpload={(r, file) => void handlePhotoUpload(r, file)}
                  onManageAccount={(r) => void openAccountModal(r)}
                />
              )
            })}
          </AnimatePresence>

          {filteredRows.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
              <Search className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-4 font-black text-deepBlue">لا نتائج تطابق البحث الحالي</p>
              <p className="mt-1 text-sm font-semibold text-slate-400">
                حاول تغيير كلمة البحث أو الفلتر.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Loading profile spinner ────────────────────────────────────────── */}
      {(loadingProfile || accountLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
          <div className="rounded-2xl bg-white p-6 shadow-xl">
            <Loader2 size={28} className="mx-auto animate-spin text-customBlue" />
            <p className="mt-3 text-sm font-semibold text-slate-600">جارٍ تحميل البيانات...</p>
          </div>
        </div>
      )}

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {(modalMode === 'create' || modalMode === 'edit') && !loadingProfile && (
          <ProfileModal
            key="profile-modal"
            mode={modalMode}
            profile={editProfile}
            departments={depts}
            onClose={() => {
              setModalMode('none')
              setEditProfile(null)
            }}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <DeleteConfirm
            key="delete-confirm"
            row={deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onDeleted={handleDeleted}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {accountProfile && !accountLoading && (
          <UserAccountModal
            key="account-modal"
            profile={accountProfile}
            onClose={() => setAccountProfile(null)}
            onUpdated={handleAccountUpdated}
          />
        )}
      </AnimatePresence>

      {/* ── Detail drawer ──────────────────────────────────────────────────── */}
      <DetailDrawer row={detail} onClose={() => setDetail(null)} />
    </div>
  )
}
