import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Handshake,
  Lock,
  RefreshCw,
  Search,
  Shield,
  TrendingUp,
  UserCheck,
  Users,
  Users2,
  X,
} from 'lucide-react'
import { fetchAdminUsers } from '@/api/adminUsersApi'
import { SUPER_ADMIN_ROLE_CATALOG_ROWS } from '@/pages/super-admin/users/assignableRoles'
import { CAPABILITIES, roleHasCapabilitySlug } from '@/pages/super-admin/users/roleScopeHints'
import { normalizeRole } from '@/utils/dashboardAccess'
import { SaPageRoot } from '@/pages/super-admin/crud/shared/SuperAdminPrimitives'

/* ── Role classification ─────────────────────────────────────────────────── */

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
  system:      { labelAr: 'نظام', cls: 'bg-[#22334A] text-white ring-[#22334A]/30' },
  admin:       { labelAr: 'إدارة', cls: 'bg-[#2691C2]/15 text-[#2691C2] ring-[#2691C2]/30' },
  operational: { labelAr: 'تشغيلي', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  external:    { labelAr: 'خارجي', cls: 'bg-slate-100 text-slate-600 ring-slate-200' },
}

const RISK_META = {
  high:   { labelAr: 'وصول كامل', cls: 'bg-rose-50 text-rose-700 ring-rose-200', icon: AlertTriangle },
  medium: { labelAr: 'بيانات حساسة', cls: 'bg-amber-50 text-amber-700 ring-amber-200', icon: Lock },
  low:    { labelAr: 'مقيَّد', cls: 'bg-slate-50 text-slate-500 ring-slate-200', icon: Shield },
}

const CAP_ICONS: Record<string, React.ElementType> = {
  governance: Shield,
  learning:   BookOpen,
  finance:    DollarSign,
  people:     Users2,
  growth:     TrendingUp,
}

const ROLE_GROUPS_DEF = [
  { id: 'leadership', titleAr: 'القيادة والحوكمة', slugs: ['super_admin', 'executive_admin', 'admin'] },
  { id: 'education',  titleAr: 'التعليم والجودة',  slugs: ['instructor', 'student', 'quality_manager'] },
  { id: 'operations', titleAr: 'التشغيل المؤسسي',  slugs: ['finance_manager', 'hr_manager', 'department_manager'] },
  { id: 'growth',     titleAr: 'النمو والشراكة',    slugs: ['marketing_manager', 'support_agent', 'partner', 'volunteer'] },
] as const

/* ── Small shared components ─────────────────────────────────────────────── */

function Badge({ children, cls }: { children: React.ReactNode; cls: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black ring-1 ${cls}`}>
      {children}
    </span>
  )
}

function KpiTile({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType
  label: string
  value: number | string
  sub?: string
  accent: 'navy' | 'blue' | 'orange' | 'success' | 'warning'
}) {
  const colorMap = {
    navy:    'text-[#22334A] bg-[#22334A]/10 ring-[#22334A]/20',
    blue:    'text-[#2691C2] bg-[#2691C2]/10 ring-[#2691C2]/20',
    orange:  'text-[#EC943C] bg-[#EC943C]/10 ring-[#EC943C]/20',
    success: 'text-emerald-700 bg-emerald-50 ring-emerald-200',
    warning: 'text-amber-700 bg-amber-50 ring-amber-200',
  }
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white px-4 py-4 shadow-sm ring-1 ring-black/[0.04]">
      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 ${colorMap[accent]}`}>
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">{label}</p>
        <p className="mt-1 text-xl font-black tracking-tight text-[#22334A]">{value}</p>
        {sub ? <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-400">{sub}</p> : null}
      </div>
    </div>
  )
}

/* ── Role card ───────────────────────────────────────────────────────────── */

function RoleCard({
  slug,
  labelAr,
  usage,
  onDetail,
}: {
  slug: string
  labelAr: string
  usage: number
  onDetail: () => void
}) {
  const type = classifyRole(slug)
  const risk = riskLevel(slug)
  const typeMeta = TYPE_META[type]
  const riskMeta = RISK_META[risk]
  const RiskIcon = riskMeta.icon
  const capCount = CAPABILITIES.filter((c) => roleHasCapabilitySlug(slug, c.id)).length
  const initial = labelAr.charAt(0) || slug.charAt(0).toUpperCase()
  const isSystem = type === 'system'

  return (
    <button
      type="button"
      onClick={onDetail}
      className="group relative flex w-full flex-col rounded-2xl border border-slate-200 bg-white p-5 text-right shadow-sm transition hover:border-[#2691C2]/30 hover:shadow-md"
    >
      {isSystem && (
        <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-rose-300/70 to-transparent" aria-hidden />
      )}

      {/* Top row */}
      <div className="flex items-start gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-black ${isSystem ? 'bg-[#22334A] text-white' : 'bg-slate-100 text-[#22334A]'}`}>
          {initial}
        </span>
        <div className="min-w-0 flex-1 text-right">
          <p className="truncate font-black text-[#22334A] text-[14px]">{labelAr}</p>
          <code className="mt-0.5 block truncate font-mono text-[11px] text-slate-400">{slug}</code>
        </div>
        <Badge cls={typeMeta.cls}>{typeMeta.labelAr}</Badge>
      </div>

      {/* Stats row */}
      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 text-[11px] font-black text-slate-500">
            <Users className="h-3.5 w-3.5 text-[#2691C2]" aria-hidden />
            {usage} مستخدم
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-black text-slate-500">
            <Shield className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
            {capCount} محاور
          </span>
        </div>
        <Badge cls={riskMeta.cls}>
          <RiskIcon className="h-3 w-3" aria-hidden />
          {riskMeta.labelAr}
        </Badge>
      </div>

      {/* Capability dots */}
      <div className="mt-3 flex gap-1">
        {CAPABILITIES.map((c) => {
          const has = roleHasCapabilitySlug(slug, c.id)
          return (
            <span
              key={c.id}
              title={c.labelAr}
              className={`h-1.5 flex-1 rounded-full transition ${has ? 'bg-[#2691C2]' : 'bg-slate-100'}`}
            />
          )
        })}
      </div>
    </button>
  )
}

/* ── Detail drawer ───────────────────────────────────────────────────────── */

function DetailDrawer({
  slug,
  labelAr,
  usageCounts,
  onClose,
}: {
  slug: string | null
  labelAr: string
  usageCounts: Record<string, number>
  onClose: () => void
}) {
  if (!slug) return null
  const type = classifyRole(slug)
  const risk = riskLevel(slug)
  const typeMeta = TYPE_META[type]
  const riskMeta = RISK_META[risk]
  const RiskIcon = riskMeta.icon
  const usage = usageCounts[slug] ?? 0
  const grantedCaps = CAPABILITIES.filter((c) => roleHasCapabilitySlug(slug, c.id))
  const deniedCaps = CAPABILITIES.filter((c) => !roleHasCapabilitySlug(slug, c.id))
  const isSystem = type === 'system'

  return (
    <>
      <div
        className="fixed inset-0 z-[200] bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside
        dir="rtl"
        className="fixed inset-y-0 start-0 z-[210] flex w-full max-w-md flex-col bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-lg font-black shadow ${isSystem ? 'bg-[#22334A] text-white' : 'bg-[#2691C2]/10 text-[#2691C2]'}`}>
              <Shield className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <h2 className="font-black text-[#22334A]">{labelAr}</h2>
              <code className="text-[11px] text-slate-400">{slug}</code>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-xl border border-slate-200 text-slate-400 hover:text-[#22334A]"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge cls={typeMeta.cls}>{typeMeta.labelAr}</Badge>
            <Badge cls={riskMeta.cls}>
              <RiskIcon className="h-3 w-3" aria-hidden />
              {riskMeta.labelAr}
            </Badge>
            {isSystem && (
              <Badge cls="bg-rose-50 text-rose-700 ring-rose-200">
                <Lock className="h-3 w-3" aria-hidden />
                دور محمي
              </Badge>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-center">
              <p className="text-2xl font-black text-[#22334A]">{usage}</p>
              <p className="mt-0.5 text-[11px] font-black text-slate-400">مستخدم مرتبط</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-center">
              <p className="text-2xl font-black text-[#22334A]">{grantedCaps.length}</p>
              <p className="mt-0.5 text-[11px] font-black text-slate-400">محاور مفتوحة</p>
            </div>
          </div>

          {/* Warning for system roles */}
          {isSystem && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden />
              <p className="text-[12px] font-semibold text-rose-800">
                هذا دور نظام محمي. يُدار من خلال Laravel ولا يمكن حذفه أو تعديله من الواجهة.
              </p>
            </div>
          )}

          {/* Granted capabilities */}
          <div>
            <p className="mb-3 text-[11px] font-black uppercase tracking-widest text-slate-400">الصلاحيات الممنوحة</p>
            {grantedCaps.length > 0 ? (
              <ul className="space-y-2">
                {grantedCaps.map((c) => {
                  const CapIcon = CAP_ICONS[c.id] ?? Shield
                  return (
                    <li key={c.id} className="flex items-center justify-between gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <CapIcon className="h-4 w-4 text-emerald-600" aria-hidden />
                        <span className="text-[13px] font-black text-[#22334A]">{c.labelAr}</span>
                      </div>
                      <Check className="h-4 w-4 text-emerald-600" aria-hidden />
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-center text-[12px] font-semibold text-slate-400">
                لا صلاحيات مسجّلة لهذا الدور
              </p>
            )}
          </div>

          {/* Denied capabilities */}
          {deniedCaps.length > 0 && (
            <div>
              <p className="mb-3 text-[11px] font-black uppercase tracking-widest text-slate-400">محاور غير مفعّلة</p>
              <ul className="space-y-2">
                {deniedCaps.map((c) => {
                  const CapIcon = CAP_ICONS[c.id] ?? Shield
                  return (
                    <li key={c.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <CapIcon className="h-4 w-4 text-slate-300" aria-hidden />
                        <span className="text-[13px] font-semibold text-slate-400">{c.labelAr}</span>
                      </div>
                      <X className="h-4 w-4 text-slate-300" aria-hidden />
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-4 flex gap-2">
          <Link
            to="/dashboard/super-admin/crud/users"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#22334A] px-4 py-2.5 text-[12px] font-black text-white shadow transition hover:opacity-90"
          >
            <Users className="h-4 w-4" aria-hidden />
            إدارة المستخدمين
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-[12px] font-black text-slate-600 transition hover:border-[#22334A]/20"
          >
            إغلاق
          </button>
        </div>
      </aside>
    </>
  )
}

/* ── Capability matrix ───────────────────────────────────────────────────── */

function CapabilityMatrix({ roles, usageCounts, onDetail }: {
  roles: typeof SUPER_ADMIN_ROLE_CATALOG_ROWS
  usageCounts: Record<string, number>
  onDetail: (slug: string) => void
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-[640px] w-full border-collapse text-right text-[12px]">
        <thead>
          <tr className="border-b border-slate-100 bg-[#22334A]/[0.03]">
            <th className="sticky right-0 z-[2] min-w-[160px] bg-white px-4 py-3 text-[11px] font-black text-[#22334A] shadow-[inset_-1px_0_0_#e2e8f0]">
              الدور
            </th>
            {CAPABILITIES.map((c) => {
              const CapIcon = CAP_ICONS[c.id] ?? Shield
              return (
                <th key={c.id} className="min-w-[100px] px-3 py-3 text-center text-[10px] font-black text-slate-500">
                  <div className="flex flex-col items-center gap-1">
                    <CapIcon className="h-4 w-4 text-slate-400" aria-hidden />
                    <span className="leading-snug">{c.labelAr}</span>
                  </div>
                </th>
              )
            })}
            <th className="min-w-[80px] px-3 py-3 text-center text-[10px] font-black text-slate-500">المستخدمون</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((r) => {
            const type = classifyRole(r.slug)
            const risk = riskLevel(r.slug)
            const typeMeta = TYPE_META[type]
            const usage = usageCounts[r.slug] ?? 0
            return (
              <tr
                key={r.slug}
                className="group border-b border-slate-100/70 transition-colors hover:bg-[#2691C2]/[0.03]"
              >
                <td className="sticky right-0 bg-white px-4 py-3 shadow-[inset_-1px_0_0_#e2e8f0] group-hover:bg-[#2691C2]/[0.03]">
                  <button
                    type="button"
                    onClick={() => onDetail(r.slug)}
                    className="block w-full text-right"
                  >
                    <p className="font-black text-[#22334A] hover:text-[#2691C2] transition-colors">{r.labelAr}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <Badge cls={typeMeta.cls}>{typeMeta.labelAr}</Badge>
                      {risk === 'high' && (
                        <span className="text-[10px] font-black text-rose-500">⚠</span>
                      )}
                    </div>
                  </button>
                </td>
                {CAPABILITIES.map((c) => {
                  const ok = roleHasCapabilitySlug(r.slug, c.id)
                  return (
                    <td key={c.id} className="px-3 py-3 text-center align-middle">
                      <span className={`mx-auto grid h-7 w-7 place-items-center rounded-lg ${ok ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                        {ok
                          ? <Check className="h-3.5 w-3.5 text-emerald-600" aria-label="مسموح" />
                          : <X className="h-3.5 w-3.5 text-slate-200" aria-label="غير مسموح" />
                        }
                      </span>
                    </td>
                  )
                })}
                <td className="px-3 py-3 text-center">
                  <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-black tabular-nums ${usage > 0 ? 'bg-[#2691C2]/10 text-[#2691C2]' : 'bg-slate-100 text-slate-400'}`}>
                    {usage}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function RolesPermissionsPage() {
  const matrixRef = useRef<HTMLDivElement>(null)
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | RoleType>('all')
  const [groupFilter, setGroupFilter] = useState<string>('all')
  const [detailSlug, setDetailSlug] = useState<string | null>(null)
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({})
  const [usageLoading, setUsageLoading] = useState(true)
  const [showMatrix, setShowMatrix] = useState(false)

  const loadUsers = useCallback(() => {
    setUsageLoading(true)
    fetchAdminUsers()
      .then((rows) => {
        const counts: Record<string, number> = {}
        rows.forEach((u) => {
          const slug = normalizeRole(u.role ?? null)
          if (!slug) return
          counts[slug] = (counts[slug] ?? 0) + 1
        })
        setUsageCounts(counts)
      })
      .catch(() => { /* silent — matrix still works */ })
      .finally(() => setUsageLoading(false))
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    return SUPER_ADMIN_ROLE_CATALOG_ROWS.filter((r) => {
      if (typeFilter !== 'all' && classifyRole(r.slug) !== typeFilter) return false
      if (groupFilter !== 'all') {
        const grp = ROLE_GROUPS_DEF.find((g) => g.id === groupFilter)
        if (grp && !grp.slugs.includes(r.slug as never)) return false
      }
      if (!t) return true
      return r.slug.includes(t) || r.labelAr.includes(q.trim())
    })
  }, [q, typeFilter, groupFilter])

  const totalRoles = SUPER_ADMIN_ROLE_CATALOG_ROWS.length
  const systemRoles = SUPER_ADMIN_ROLE_CATALOG_ROWS.filter((r) => classifyRole(r.slug) === 'system').length
  const customRoles = totalRoles - systemRoles
  const totalUsers = Object.values(usageCounts).reduce((a, b) => a + b, 0)
  const highRiskAssignments = SUPER_ADMIN_ROLE_CATALOG_ROWS
    .filter((r) => riskLevel(r.slug) === 'high')
    .reduce((sum, r) => sum + (usageCounts[r.slug] ?? 0), 0)

  const detailRole = detailSlug
    ? SUPER_ADMIN_ROLE_CATALOG_ROWS.find((r) => r.slug === detailSlug)
    : undefined

  return (
    <SaPageRoot className="space-y-8 pb-16">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-bl from-[#22334A] to-[#1a2840] px-8 py-10 shadow-xl">
        <div className="pointer-events-none absolute -end-24 -top-24 h-72 w-72 rounded-full bg-[#2691C2]/20 blur-[80px]" aria-hidden />
        <div className="pointer-events-none absolute -start-16 bottom-0 h-48 w-48 rounded-full bg-[#EC943C]/15 blur-[60px]" aria-hidden />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#2691C2]">RBAC · Access Control</p>
            <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">الأدوار والصلاحيات</h1>
            <p className="mt-2 max-w-lg text-[13px] font-semibold leading-relaxed text-white/60">
              إدارة الوصول والصلاحيات وربط الأدوار بالوحدات التشغيلية داخل منصة EMC.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadUsers}
              disabled={usageLoading}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-[12px] font-black text-white backdrop-blur transition hover:bg-white/15 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${usageLoading ? 'animate-spin' : ''}`} aria-hidden />
              تحديث
            </button>
            <button
              type="button"
              onClick={() => { setShowMatrix(true); matrixRef.current?.scrollIntoView({ behavior: 'smooth' }) }}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#2691C2] px-5 py-2.5 text-[12px] font-black text-white shadow-lg transition hover:opacity-90"
            >
              <Handshake className="h-4 w-4" aria-hidden />
              مصفوفة الصلاحيات
            </button>
            <button
              type="button"
              disabled
              title="يُدار من خلال Laravel — قريبًا"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-2.5 text-[12px] font-black text-white/40 cursor-not-allowed"
            >
              إنشاء دور جديد
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI strip ────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiTile icon={Shield} label="إجمالي الأدوار" value={totalRoles} accent="navy" />
        <KpiTile icon={Lock} label="أدوار النظام" value={systemRoles} sub="محمية من Laravel" accent="warning" />
        <KpiTile icon={UserCheck} label="الأدوار المخصصة" value={customRoles} accent="blue" />
        <KpiTile
          icon={Users}
          label="مستخدمون مرتبطون"
          value={usageLoading ? '...' : totalUsers > 0 ? totalUsers : 'غير متوفر'}
          accent="success"
        />
        <KpiTile
          icon={AlertTriangle}
          label="وصول كامل"
          value={usageLoading ? '...' : highRiskAssignments}
          sub="مستخدمون بصلاحية عالية"
          accent="orange"
        />
      </div>

      {/* ── Filter bar ───────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="بحث باسم الدور أو المعرّف (slug)..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pe-4 ps-10 text-[13px] font-semibold text-[#22334A] placeholder:text-slate-400 outline-none ring-[#2691C2]/30 transition focus:ring-2"
          />
          {q ? (
            <button type="button" onClick={() => setQ('')} className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#22334A]">
              <X className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Type filter */}
          {(['all', 'system', 'admin', 'operational', 'external'] as const).map((t) => {
            const labels = { all: 'الجميع', system: 'نظام', admin: 'إدارة', operational: 'تشغيلي', external: 'خارجي' }
            const active = typeFilter === t
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`rounded-xl px-3 py-1.5 text-[12px] font-black transition ring-1 ${active ? 'bg-[#22334A] text-white ring-[#22334A]' : 'bg-white text-slate-500 ring-slate-200 hover:ring-[#2691C2]/40'}`}
              >
                {labels[t]}
              </button>
            )
          })}

          <div className="h-6 w-px bg-slate-200 self-center mx-1" />

          {/* Group filter */}
          {[{ id: 'all', titleAr: 'كل المجموعات' }, ...ROLE_GROUPS_DEF].map((g) => {
            const active = groupFilter === g.id
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setGroupFilter(g.id)}
                className={`rounded-xl px-3 py-1.5 text-[12px] font-black transition ring-1 ${active ? 'bg-[#2691C2] text-white ring-[#2691C2]' : 'bg-white text-slate-500 ring-slate-200 hover:ring-[#2691C2]/40'}`}
              >
                {g.titleAr}
              </button>
            )
          })}

          {!usageLoading && (
            <span className="ms-auto self-center text-[12px] font-black text-slate-400">
              {filtered.length} من {totalRoles}
            </span>
          )}
        </div>
      </div>

      {/* ── Role cards ───────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center">
          <p className="font-black text-[#22334A]">لا توجد أدوار مطابقة</p>
          <p className="mt-1 text-[13px] font-semibold text-slate-400">عدّل البحث أو أزل أحد الفلاتر</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => (
            <RoleCard
              key={r.slug}
              slug={r.slug}
              labelAr={r.labelAr}
              usage={usageCounts[r.slug] ?? 0}
              onDetail={() => setDetailSlug(r.slug)}
            />
          ))}
        </div>
      )}

      {/* ── Groups quick-reference ───────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {ROLE_GROUPS_DEF.map((g) => {
          const groupRoles = SUPER_ADMIN_ROLE_CATALOG_ROWS.filter((r) => g.slugs.includes(r.slug as never))
          const groupUsers = groupRoles.reduce((sum, r) => sum + (usageCounts[r.slug] ?? 0), 0)
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => setGroupFilter(g.id === groupFilter ? 'all' : g.id)}
              className={`rounded-2xl border p-4 text-right transition ${groupFilter === g.id ? 'border-[#2691C2]/30 bg-[#2691C2]/[0.06]' : 'border-slate-200 bg-white hover:border-[#2691C2]/20'}`}
            >
              <p className="text-[11px] font-black text-slate-400">{g.titleAr}</p>
              <p className="mt-1 text-lg font-black text-[#22334A]">{groupRoles.length} أدوار</p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{usageLoading ? '...' : `${groupUsers} مستخدم`}</p>
            </button>
          )
        })}
      </div>

      {/* ── Capability matrix ─────────────────────────────────────────── */}
      <div ref={matrixRef}>
        <button
          type="button"
          onClick={() => setShowMatrix((v) => !v)}
          className="mb-4 flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 text-right shadow-sm transition hover:border-[#2691C2]/30"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#22334A]/[0.06] text-[#22334A]">
              <Handshake className="h-5 w-5" aria-hidden />
            </span>
            <div className="text-right">
              <p className="font-black text-[#22334A]">مصفوفة الصلاحيات</p>
              <p className="text-[11px] font-semibold text-slate-400">{totalRoles} دور × {CAPABILITIES.length} محاور</p>
            </div>
          </div>
          {showMatrix
            ? <ChevronUp className="h-5 w-5 text-slate-400" aria-hidden />
            : <ChevronDown className="h-5 w-5 text-slate-400" aria-hidden />
          }
        </button>

        {showMatrix && (
          <CapabilityMatrix
            roles={filtered.length > 0 ? filtered : SUPER_ADMIN_ROLE_CATALOG_ROWS}
            usageCounts={usageCounts}
            onDetail={(slug) => setDetailSlug(slug)}
          />
        )}
      </div>

      {/* ── Detail drawer ─────────────────────────────────────────────── */}
      {detailSlug && detailRole && (
        <DetailDrawer
          slug={detailSlug}
          labelAr={detailRole.labelAr}
          usageCounts={usageCounts}
          onClose={() => setDetailSlug(null)}
        />
      )}
    </SaPageRoot>
  )
}
