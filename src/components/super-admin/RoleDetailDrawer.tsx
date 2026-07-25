import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import {
  AlertTriangle,
  BookOpen,
  Check,
  DollarSign,
  Lock,
  Shield,
  TrendingUp,
  Users,
  Users2,
} from 'lucide-react'
import { fetchAdminUsers, type AdminManagedUser } from '@/api/adminUsersApi'
import { fetchRolePermissions } from '@/api/rolesPermissionsApi'
import { RolePermissionsMatrix } from '@/components/super-admin/RolePermissionsMatrix'
import { CrudDrawer } from '@/pages/super-admin/crud/shared/CrudDrawer'
import { initialsFromName } from '@/pages/super-admin/crud/shared/initials'
import {
  CAPABILITIES,
  ROLE_CAPABILITY_HINTS_AR,
  roleHasCapabilitySlug,
} from '@/pages/super-admin/users/roleScopeHints'
import { normalizeRole } from '@/utils/dashboardAccess'
import { useAuth } from '@/contexts/AuthContext'

type RoleType = 'system' | 'admin' | 'operational' | 'external'

function classifyRole(slug: string): RoleType {
  if (slug === 'super_admin' || slug === 'executive_admin') return 'system'
  if (slug === 'admin') return 'admin'
  if (slug === 'student' || slug === 'partner' || slug === 'volunteer') return 'external'
  return 'operational'
}

function riskLevel(slug: string): 'high' | 'medium' | 'low' {
  if (slug === 'super_admin' || slug === 'executive_admin') return 'high'
  if (slug === 'admin' || slug === 'finance_manager' || slug === 'hr_manager') return 'medium'
  return 'low'
}

const TYPE_META: Record<RoleType, { labelAr: string; cls: string }> = {
  system:      { labelAr: 'نظام', cls: 'bg-[#0C2A4B] text-white ring-[#0C2A4B]/30' },
  admin:       { labelAr: 'إدارة', cls: 'bg-[#0077B6]/15 text-[#0077B6] ring-[#0077B6]/30' },
  operational: { labelAr: 'تشغيلي', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  external:    { labelAr: 'خارجي', cls: 'bg-slate-100 text-slate-600 ring-slate-200' },
}

const RISK_META = {
  high:   { labelAr: 'وصول كامل', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
  medium: { labelAr: 'بيانات حساسة', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  low:    { labelAr: 'مقيَّد', cls: 'bg-slate-50 text-slate-500 ring-slate-200' },
}

const CAP_ICONS: Record<string, React.ElementType> = {
  governance: Shield,
  learning:   BookOpen,
  finance:    DollarSign,
  people:     Users2,
  growth:     TrendingUp,
}

const TABS = [
  { id: 'overview', label: 'نظرة عامة' },
  { id: 'permissions', label: 'الصلاحيات' },
  { id: 'users', label: 'المستخدمون' },
] as const

type TabId = (typeof TABS)[number]['id']

function Badge({ children, cls }: { children: React.ReactNode; cls: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black ring-1 ${cls}`}>
      {children}
    </span>
  )
}

function canEditRolePermissions(viewerRole: string | null | undefined, targetSlug: string): boolean {
  const viewer = normalizeRole(viewerRole)
  if (viewer !== 'super_admin' && viewer !== 'admin') return false
  if (classifyRole(targetSlug) === 'system') return false
  return true
}

type Props = {
  open: boolean
  slug: string
  labelAr: string
  usageCount: number
  onClose: () => void
}

export function RoleDetailDrawer({ open, slug, labelAr, usageCount, onClose }: Props) {
  const { user } = useAuth()
  const [tab, setTab] = useState<TabId>('overview')
  const [grantedCount, setGrantedCount] = useState(0)
  const [roleUsers, setRoleUsers] = useState<AdminManagedUser[]>([])
  // Starts loading when the drawer mounts already open — the effect below no longer
  // flips it synchronously.
  const [usersLoading, setUsersLoading] = useState(open)

  const type = classifyRole(slug)
  const risk = riskLevel(slug)
  const typeMeta = TYPE_META[type]
  const riskMeta = RISK_META[risk]
  const isSystem = type === 'system'
  const canEdit = canEditRolePermissions(user?.role, slug)

  const grantedCaps = useMemo(
    () => CAPABILITIES.filter((c) => roleHasCapabilitySlug(slug, c.id)),
    [slug],
  )

  // Re-arm the drawer during render when it opens or switches role (react.dev
  // "adjusting state when a prop changes") instead of one commit later.
  const [seenRole, setSeenRole] = useState({ open, slug })
  if (seenRole.open !== open || seenRole.slug !== slug) {
    setSeenRole({ open, slug })
    if (open) {
      setTab('overview')
      setUsersLoading(true)
    }
  }

  useEffect(() => {
    if (!open) return
    let alive = true
    void (async () => {
      try {
        const rows = await fetchAdminUsers()
        if (alive) setRoleUsers(rows.filter((u) => normalizeRole(u.role ?? null) === slug))
      } catch {
        if (alive) setRoleUsers([])
      } finally {
        if (alive) setUsersLoading(false)
      }
    })()
    fetchRolePermissions(slug)
      .then((keys) => { if (alive) setGrantedCount(keys.length) })
      .catch(() => { if (alive) setGrantedCount(0) })
    return () => {
      alive = false
    }
  }, [open, slug])

  const statusLabel = isSystem ? 'محمي — نظام' : 'نشط'

  return (
    <CrudDrawer
      open={open}
      title={labelAr}
      subtitle={slug}
      onClose={onClose}
      widthClassName="max-w-xl sm:max-w-2xl"
      footerSlot={
        <div className="flex gap-2">
          <Link
            to="/dashboard/super-admin/crud/users"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0C2A4B] px-4 py-2.5 text-[12px] font-black text-white transition hover:opacity-90"
          >
            <Users className="h-4 w-4" aria-hidden />
            إدارة المستخدمين
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-[12px] font-black text-slate-600 transition hover:border-[#0C2A4B]/20"
          >
            إغلاق
          </button>
        </div>
      }
    >
      {/* Header meta */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge cls={typeMeta.cls}>{typeMeta.labelAr}</Badge>
        <Badge cls={riskMeta.cls}>{riskMeta.labelAr}</Badge>
        <Badge cls="bg-slate-100 text-slate-600 ring-slate-200">{statusLabel}</Badge>
        {isSystem && (
          <Badge cls="bg-rose-50 text-rose-700 ring-rose-200">
            <Lock className="h-3 w-3" aria-hidden />
            دور محمي
          </Badge>
        )}
      </div>

      <div className="mb-5 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-center">
          <p className="text-lg font-black tabular-nums text-[#0C2A4B]">{usageCount}</p>
          <p className="text-[10px] font-black text-slate-400">مستخدم مرتبط</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-center">
          <p className="text-lg font-black tabular-nums text-[#0C2A4B]">{grantedCount}</p>
          <p className="text-[10px] font-black text-slate-400">صلاحية ممنوحة</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-center">
          <p className="text-lg font-black tabular-nums text-[#0C2A4B]">{grantedCaps.length}</p>
          <p className="text-[10px] font-black text-slate-400">محور عام</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-xl border border-slate-200 bg-slate-50/80 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg px-3 py-2 text-[12px] font-black transition ${
              tab === t.id
                ? 'bg-white text-[#0C2A4B] shadow-sm ring-1 ring-slate-200'
                : 'text-slate-500 hover:text-[#0C2A4B]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-5">
          {isSystem && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden />
              <p className="text-[12px] font-semibold text-rose-800">
                دور نظام محمي — الصلاحيات التفصيلية للعرض فقط ولا يمكن تعديلها من الواجهة.
              </p>
            </div>
          )}

          <div>
            <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-slate-400">محاور الوصول العامة</p>
            <ul className="space-y-2">
              {grantedCaps.map((c) => {
                const CapIcon = CAP_ICONS[c.id] ?? Shield
                return (
                  <li
                    key={c.id}
                    className="flex items-start justify-between gap-2 rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-2.5"
                  >
                    <div className="flex items-start gap-2">
                      <CapIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                      <div>
                        <span className="text-[13px] font-black text-[#0C2A4B]">{c.labelAr}</span>
                        <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{ROLE_CAPABILITY_HINTS_AR[c.id]}</p>
                      </div>
                    </div>
                    <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                  </li>
                )
              })}
            </ul>
          </div>

          <p className="text-[12px] font-semibold leading-relaxed text-slate-500">
            انتقل إلى تبويب <strong className="text-[#0C2A4B]">الصلاحيات</strong> لإدارة الصلاحيات التفصيلية (عرض، إنشاء، موافقة، حذف، …) لكل موديول.
          </p>
        </div>
      )}

      {tab === 'permissions' && (
        <RolePermissionsMatrix
          roleSlug={slug}
          canEdit={canEdit}
          open={open}
          onGrantedCountChange={setGrantedCount}
        />
      )}

      {tab === 'users' && (
        <div className="space-y-3">
          {usersLoading ? (
            <p className="py-8 text-center text-[13px] font-semibold text-slate-400">جارٍ تحميل المستخدمين…</p>
          ) : roleUsers.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-[13px] font-semibold text-slate-400">
              لا يوجد مستخدمون مرتبطون بهذا الدور حالياً
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
              {roleUsers.map((u) => (
                <li key={u.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0077B6]/10 text-[12px] font-black text-[#0077B6]">
                    {initialsFromName(u.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-black text-[#0C2A4B]">{u.name}</p>
                    <p className="truncate text-[11px] font-semibold text-slate-500" dir="ltr">{u.email}</p>
                  </div>
                  {u.is_active === false || u.status === 'inactive' ? (
                    <Badge cls="bg-slate-100 text-slate-500 ring-slate-200">غير نشط</Badge>
                  ) : (
                    <Badge cls="bg-emerald-50 text-emerald-700 ring-emerald-200">نشط</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </CrudDrawer>
  )
}
