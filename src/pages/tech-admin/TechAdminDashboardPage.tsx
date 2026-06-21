import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  Bell,
  BookMarked,
  CheckCircle2,
  ClipboardCheck,
  Code2,
  Database,
  FileBarChart,
  GraduationCap,
  Layers,
  Loader2,
  Mail,
  Plug2,
  RefreshCw,
  ScrollText,
  Server,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
  Webhook,
  XCircle,
  Zap,
} from 'lucide-react'
import {
  fetchTechAdminDashboard,
  type TechAdminDashboard,
  type AuditLogEntry,
  type SystemHealth,
} from '@/api/techAdminApi'

// ─── helpers ────────────────────────────────────────────────────────────────

function hourGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'صباح الخير'
  if (h < 18) return 'مساء الخير'
  return 'مساء النور'
}

function timeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'الآن'
    if (mins < 60) return `منذ ${mins} د`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `منذ ${hrs} س`
    return `منذ ${Math.floor(hrs / 24)} ي`
  } catch {
    return '—'
  }
}

// ─── Status badge ────────────────────────────────────────────────────────────

type StatusLevel = 'ok' | 'warning' | 'error' | 'unknown'

function classifyStatus(val: string): StatusLevel {
  if (val === 'ok' || val === 'configured') return 'ok'
  if (val === 'warning' || val === 'log-only' || val === 'degraded') return 'warning'
  if (val === 'error' || val === 'not-configured') return 'error'
  return 'unknown'
}

function StatusDot({ status }: { status: StatusLevel }) {
  const map = {
    ok:      'bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.4)]',
    warning: 'bg-amber-400 shadow-[0_0_6px_2px_rgba(251,191,36,0.4)]',
    error:   'bg-red-400 shadow-[0_0_6px_2px_rgba(248,113,113,0.4)]',
    unknown: 'bg-gray-400',
  }
  return <span className={`inline-block h-2 w-2 rounded-full ${map[status]}`} />
}

function StatusLabel({ val }: { val: string }) {
  const level = classifyStatus(val)
  const labels: Record<string, string> = {
    ok: 'يعمل', configured: 'مُعدَّل', 'log-only': 'سجل فقط',
    degraded: 'منخفض', warning: 'تحذير', error: 'خطأ',
    'not-configured': 'غير مُعدَّل', unknown: 'غير معروف',
  }
  const color: Record<StatusLevel, string> = {
    ok: 'text-emerald-600', warning: 'text-amber-600', error: 'text-red-600', unknown: 'text-gray-500',
  }
  return (
    <span className={`flex items-center gap-1.5 text-[11px] font-bold ${color[level]}`}>
      <StatusDot status={level} />
      {labels[val] ?? val}
    </span>
  )
}

// ─── KPI card ────────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon: Icon, accent = false }: {
  label: string; value: number | string; icon: React.ElementType; accent?: boolean
}) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${accent ? 'border-amber-200 bg-amber-50' : 'border-deepBlue/[0.06] bg-white'}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold text-deepBlue/45">{label}</span>
        <Icon size={14} className={accent ? 'text-amber-500' : 'text-customBlue/50'} />
      </div>
      <p className={`text-xl font-black ${accent ? 'text-amber-800' : 'text-deepBlue'}`}>{value}</p>
    </div>
  )
}

// ─── Quick action ─────────────────────────────────────────────────────────────

function QuickAction({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
  return (
    <Link
      to={href}
      className="flex items-center gap-3 rounded-xl border border-deepBlue/[0.07] bg-white px-4 py-3 text-[12px] font-black text-deepBlue shadow-sm transition hover:border-customBlue/35 hover:bg-customBlue/[0.04] hover:shadow-md"
    >
      <Icon size={15} className="shrink-0 text-customBlue" aria-hidden />
      {label}
    </Link>
  )
}

// ─── System health row ────────────────────────────────────────────────────────

const SYSTEM_LABELS: Record<keyof SystemHealth, { label: string; icon: React.ElementType }> = {
  api:      { label: 'واجهة API',    icon: Zap      },
  database: { label: 'قاعدة البيانات', icon: Database },
  cache:    { label: 'الكاش / Redis', icon: Activity },
  queue:    { label: 'قائمة المهام', icon: Server   },
  storage:  { label: 'التخزين',      icon: Server   },
  mail:     { label: 'البريد الإلكتروني', icon: Mail },
}

function SystemHealthCard({ system }: { system: SystemHealth }) {
  const allOk = Object.values(system).every((v) => classifyStatus(v) === 'ok')
  const hasError = Object.values(system).some((v) => classifyStatus(v) === 'error')

  return (
    <section className="rounded-2xl border border-deepBlue/[0.06] bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-black text-deepBlue">
          <Server size={15} className="text-customBlue" /> صحة النظام
        </h2>
        {allOk
          ? <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-700"><CheckCircle2 size={11} /> جميع الخدمات تعمل</span>
          : hasError
          ? <span className="flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-black text-red-700"><XCircle size={11} /> يوجد خلل</span>
          : <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black text-amber-700"><AlertTriangle size={11} /> تحذيرات</span>
        }
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {(Object.entries(system) as [keyof SystemHealth, string][]).map(([key, val]) => {
          const { label, icon: Icon } = SYSTEM_LABELS[key] ?? { label: key, icon: Server }
          return (
            <div key={key} className="flex items-center justify-between rounded-xl border border-deepBlue/[0.05] bg-deepBlue/[0.02] px-3 py-2.5">
              <span className="flex items-center gap-2 text-[11px] font-semibold text-deepBlue/70">
                <Icon size={13} className="text-deepBlue/40" />
                {label}
              </span>
              <StatusLabel val={val} />
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-deepBlue/[0.06] ${className}`} />
}

// ─── Audit log row ────────────────────────────────────────────────────────────

const ACTION_COLORS: Record<string, string> = {
  created:     'bg-blue-100 text-blue-700',
  updated:     'bg-amber-100 text-amber-700',
  deleted:     'bg-red-100 text-red-700',
  restored:    'bg-teal-100 text-teal-700',
  role_changed:'bg-purple-100 text-purple-700',
  LOGIN:       'bg-green-100 text-green-700',
  LOGOUT:      'bg-gray-100 text-gray-700',
}

function ActionPill({ action, meta }: { action: string; meta: { label: string } }) {
  const cls = ACTION_COLORS[action] ?? 'bg-gray-100 text-gray-600'
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${cls}`}>
      {meta.label || action}
    </span>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TechAdminDashboardPage() {
  const [data, setData] = useState<TechAdminDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setData(await fetchTechAdminDashboard())
    } catch {
      setError('تعذّر تحميل بيانات اللوحة. تأكد من الاتصال وأعد المحاولة.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const counts  = data?.counts
  const security = data?.security

  return (
    <div dir="rtl" className="space-y-7 text-right">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-[#0F2744] to-[#0E5A8A] p-6 shadow-lg">
        <div aria-hidden className="pointer-events-none absolute -top-10 -left-10 h-48 w-48 rounded-full bg-customBlue/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute bottom-0 right-0 h-32 w-32 rounded-full bg-customOrange/10 blur-2xl" />
        <div className="relative">
          <p className="mb-1 text-[11px] font-bold text-white/50">{hourGreeting()}</p>
          <h1 className="mb-1 text-xl font-black text-white">لوحة مدير التقنية</h1>
          <p className="mb-5 text-[12px] text-white/60">مركز التحكم التقني — مراقبة المنصة، الصلاحيات، التكاملات، وسجلات النظام.</p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'المستخدمون',         href: '/dashboard/super-admin/crud/users'      },
              { label: 'الأدوار والصلاحيات',  href: '/dashboard/super-admin/crud/roles'      },
              { label: 'سجل التدقيق',         href: '/dashboard/admin/audit-logs'            },
              { label: 'المسارات التعليمية',  href: '/dashboard/tech-admin/learning-paths'   },
              { label: 'التكاملات',           href: '/dashboard/admin/integrations'          },
            ].map((a) => (
              <Link
                key={a.href}
                to={a.href}
                className="rounded-xl border border-white/[0.14] bg-white/[0.09] px-3.5 py-1.5 text-[11px] font-black text-white backdrop-blur-sm transition hover:border-white/[0.3] hover:bg-white/[0.18]"
              >
                {a.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Error state ── */}
      {error && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-red-200 bg-red-50 p-10 text-center">
          <AlertTriangle size={28} className="text-red-400" />
          <p className="text-sm font-semibold text-red-700">{error}</p>
          <button onClick={load} className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2 text-[12px] font-black text-white hover:bg-red-700">
            <RefreshCw size={13} /> إعادة المحاولة
          </button>
        </div>
      )}

      {/* ── System health ── */}
      {loading ? (
        <div className="rounded-2xl border border-deepBlue/[0.06] bg-white p-6 shadow-sm">
          <Sk className="mb-4 h-4 w-32" />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Sk key={i} className="h-10" />)}
          </div>
        </div>
      ) : !error && data ? (
        <SystemHealthCard system={data.system} />
      ) : null}

      {/* ── Security center ── */}
      {!loading && !error && security && (
        <section className="rounded-2xl border border-deepBlue/[0.06] bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-deepBlue">
            <ShieldCheck size={15} className="text-customBlue" /> مركز الأمن
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard label="تسجيلات دخول فاشلة اليوم" value={security.failed_logins_today} icon={AlertTriangle}
              accent={security.failed_logins_today > 0} />
            <KpiCard label="مستخدمون بصلاحية كاملة"  value={security.full_access_users}   icon={ShieldCheck} />
            <KpiCard label="سجلات تدقيق اليوم"        value={counts?.audit_logs_today ?? 0} icon={ScrollText}  />
          </div>
        </section>
      )}

      {/* ── Platform overview KPIs ── */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-deepBlue/[0.06] bg-white p-4 shadow-sm">
              <Sk className="mb-2 h-3 w-20" /><Sk className="h-6 w-12" />
            </div>
          ))}
        </div>
      ) : !error && counts ? (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-deepBlue">
            <BarChart3 size={14} className="text-customBlue" /> نظرة عامة على المنصة
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="إجمالي المستخدمين"     value={counts.users}           icon={Users}         />
            <KpiCard label="المستخدمون النشطون"     value={counts.active_users}    icon={Users}         />
            <KpiCard label="الأدوار"                value={counts.roles}           icon={ShieldCheck}   />
            <KpiCard label="الصلاحيات"              value={counts.permissions}     icon={ShieldCheck}   />
            <KpiCard label="الدورات"                value={counts.courses}         icon={BookMarked}    />
            <KpiCard label="المسارات التعليمية"     value={counts.learning_paths}  icon={Layers}        />
            <KpiCard label="التسجيلات"              value={counts.registrations}   icon={GraduationCap} />
            <KpiCard label="الملفات المرفوعة"       value={counts.uploads}         icon={ScrollText}    />
          </div>
        </section>
      ) : null}

      {/* ── Quick actions ── */}
      <section className="rounded-2xl border border-deepBlue/[0.06] bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-deepBlue">
          <Zap size={14} className="text-customBlue" /> إجراءات تقنية سريعة
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <QuickAction href="/dashboard/super-admin/crud/users"      label="إدارة المستخدمين"     icon={Users}        />
          <QuickAction href="/dashboard/super-admin/crud/roles"      label="الأدوار والصلاحيات"   icon={ShieldCheck}  />
          <QuickAction href="/dashboard/admin/audit-logs"            label="سجل التدقيق"          icon={ScrollText}   />
          <QuickAction href="/dashboard/super-admin/email-settings"  label="إعدادات البريد"       icon={Mail}         />
          <QuickAction href="/dashboard/super-admin/email-logs"      label="سجلات البريد"         icon={Mail}         />
          <QuickAction href="/dashboard/admin/integrations"          label="التكاملات"            icon={Plug2}        />
          <QuickAction href="/dashboard/admin/webhooks"              label="الويبهوكس"            icon={Webhook}      />
          <QuickAction href="/dashboard/admin/developer/api-tokens"  label="API Tokens"           icon={Code2}        />
          <QuickAction href="/documents"                             label="الملفات"              icon={ScrollText}   />
          <QuickAction href="/dashboard/tech-admin/learning-paths"   label="المسارات التعليمية"  icon={Layers}       />
          <QuickAction href="/dashboard/admin/reports"               label="التقارير"             icon={FileBarChart} />
          <QuickAction href="/dashboard/admin/kpi"                   label="مؤشرات الأداء"       icon={BarChart3}    />
          <QuickAction href="/dashboard/admin/finance"               label="المالية"              icon={Wallet}       />
          <QuickAction href="/dashboard/admin/quality"               label="الجودة والحوكمة"     icon={ClipboardCheck}/>
          <QuickAction href="/dashboard/settings/notifications"      label="الإعدادات"            icon={Settings}     />
          <QuickAction href="/dashboard/admin/certificates"          label="الشهادات"             icon={Award}        />
          <QuickAction href="/dashboard/notifications"               label="الإشعارات"            icon={Bell}         />
        </div>
      </section>

      {/* ── Recent audit logs ── */}
      {!loading && !error && data && (
        <section className="rounded-2xl border border-deepBlue/[0.06] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-black text-deepBlue">
              <Activity size={15} className="text-customBlue" /> آخر النشاطات
            </h2>
            <Link to="/dashboard/admin/audit-logs" className="text-[11px] font-bold text-customBlue hover:underline">
              عرض الكل ←
            </Link>
          </div>
          {data.recent_audit_logs.length === 0 ? (
            <p className="py-6 text-center text-sm text-deepBlue/40">لا توجد سجلات بعد.</p>
          ) : (
            <div className="divide-y divide-deepBlue/[0.04]">
              {data.recent_audit_logs.map((log: AuditLogEntry) => (
                <div key={log.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <ActionPill action={log.action} meta={log.action_meta} />
                      {log.entity_type && (
                        <span className="text-[11px] font-semibold text-deepBlue/60">{log.entity_type}</span>
                      )}
                      {log.entity_name && (
                        <span className="truncate text-[11px] font-bold text-deepBlue">{log.entity_name}</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[10px] text-deepBlue/45">
                      {log.actor ?? 'مجهول'}
                      {log.actor_role ? ` · ${log.actor_role}` : ''}
                      {log.method ? ` · ${log.method}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] text-deepBlue/40">{timeAgo(log.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {loading && !error && (
        <div className="flex items-center justify-center py-4 text-deepBlue/40">
          <Loader2 size={18} className="animate-spin" />
        </div>
      )}
    </div>
  )
}
