import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  CalendarClock,
  ChevronLeft,
  GraduationCap,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  Settings,
  UserCog,
  Users,
  Wallet,
  WifiOff,
} from 'lucide-react'
import {
  classifyAdminDashboardError,
  fetchAdminDashboard,
  type AdminDashboardErrorKind,
} from '../api/adminApi'
import { useAuth } from '../contexts/AuthContext'
import type { AdminDashboardData, RecentRegistration } from '../types'
import {
  DashboardSection,
  DataTable,
  type DataTableColumn,
  QuickActionCard,
} from '../components/dashboard'
import {
  DashboardPageShell,
  EmcButton,
  Eyebrow,
  SectionHeading,
  StatTile,
  Surface,
} from '../components/ui'

// ─────────────────────────────────────────────────────────────────────────────
// Empty defaults — used only as the *initial* shape, never to deceive the user.
// All counters render zero until the real API responds.
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY: AdminDashboardData = {
  stats: {
    total_users: 0,
    active_courses: 0,
    total_enrollments: 0,
    total_programs: 0,
    active_workshops: 0,
    tracks_count: 0,
    instructors_count: 0,
    departments_count: 0,
    pending_payments: 0,
    workshop_requests: 0,
  },
  recent_registrations: [],
}

// Dev-only deterministic demo, used ONLY when `VITE_USE_DEMO_DATA=true` is set.
// Never rendered in production, never used to hide real errors.
const DEMO: AdminDashboardData = {
  stats: {
    total_users: 312,
    active_courses: 9,
    total_enrollments: 184,
    total_programs: 5,
    active_workshops: 6,
    tracks_count: 12,
    instructors_count: 18,
    departments_count: 4,
    pending_payments: 7,
    workshop_requests: 3,
  },
  recent_registrations: [
    { id: 1, student_name: 'محمد عبد الله', course_name: 'أساسيات اللغة الهولندية', enrolled_at: '2026-05-08', status: 'active'    },
    { id: 2, student_name: 'فاطمة الزهراء', course_name: 'مهارات التواصل المهني',  enrolled_at: '2026-05-07', status: 'pending'   },
    { id: 3, student_name: 'أحمد علي',       course_name: 'التدريب المهني التقني',  enrolled_at: '2026-05-06', status: 'active'    },
    { id: 4, student_name: 'نور محمد',       course_name: 'تطوير المهارات القيادية',enrolled_at: '2026-05-05', status: 'active'    },
    { id: 5, student_name: 'عمر خالد',       course_name: 'أساسيات اللغة الهولندية', enrolled_at: '2026-05-04', status: 'completed' },
  ],
}

const DEMO_ENABLED =
  import.meta.env.DEV && String(import.meta.env.VITE_USE_DEMO_DATA ?? '').toLowerCase() === 'true'

// ─────────────────────────────────────────────────────────────────────────────
// Table column helpers
// ─────────────────────────────────────────────────────────────────────────────

const formatDate = (iso: string) => {
  try {
    return new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'short', year: 'numeric' }).format(
      new Date(iso),
    )
  } catch {
    return iso
  }
}

const statusBadge = (status: string) => {
  const map: Record<string, { label: string; cls: string }> = {
    active:    { label: 'نشط',   cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
    pending:   { label: 'معلق',  cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
    completed: { label: 'مكتمل', cls: 'bg-slate-100 text-slate-600 ring-slate-200' },
  }
  const entry = map[status] ?? { label: status, cls: 'bg-slate-100 text-slate-600 ring-slate-200' }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${entry.cls}`}>
      {entry.label}
    </span>
  )
}

const registrationColumns: DataTableColumn<RecentRegistration>[] = [
  { key: 'student_name', header: 'الطالب' },
  { key: 'course_name',  header: 'الدورة'  },
  { key: 'enrolled_at',  header: 'تاريخ التسجيل', render: (row) => formatDate(row.enrolled_at) },
  { key: 'status',       header: 'الحالة',         width: '120px', render: (row) => statusBadge(row.status) },
]

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<AdminDashboardData>(EMPTY)
  const [isLoading, setIsLoading] = useState(true)
  const [errorKind, setErrorKind] = useState<AdminDashboardErrorKind | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [showingDemo, setShowingDemo] = useState(false)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'صباح الخير' : hour < 18 ? 'مساء الخير' : 'مساء النور'

  const retry = useCallback(() => setReloadKey((k) => k + 1), [])

  // Re-arm the loading/error state during render when a retry bumps the key (react.dev
  // "adjusting state when a prop changes"). On mount the effect only re-set the initial
  // values, so seeding `seen` with the current key keeps behaviour identical.
  const [seenReloadKey, setSeenReloadKey] = useState(reloadKey)
  if (seenReloadKey !== reloadKey) {
    setSeenReloadKey(reloadKey)
    setIsLoading(true)
    setErrorKind(null)
    setErrorMessage(null)
    setShowingDemo(false)
  }

  useEffect(() => {
    let cancelled = false

    fetchAdminDashboard()
      .then((remote) => {
        if (cancelled) return
        setData({
          stats: { ...EMPTY.stats, ...remote.stats },
          recent_registrations: remote.recent_registrations ?? [],
        })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const kind = classifyAdminDashboardError(err)
        setErrorKind(kind)
        const ax = err as { apiMessage?: string }
        setErrorMessage(ax?.apiMessage ?? null)

        // Dev-only opt-in demo, ONLY for network/server failures so the UI is testable
        // when the backend isn't running locally. Never for 403 (real auth issue).
        if (DEMO_ENABLED && (kind === 'network' || kind === 'server' || kind === 'notfound')) {
          setData(DEMO)
          setShowingDemo(true)
        } else {
          setData(EMPTY)
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  // ── Forbidden state — render a dedicated panel, no fake numbers ───────────
  if (!isLoading && errorKind === 'forbidden') {
    return (
      <DashboardPageShell title="لوحة تحكم الإدارة" eyebrow="EMC OS · ADMIN">
        <Surface variant="default" elevation={3} padding="lg" className="text-right">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-200">
              <ShieldX size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-black tracking-tight text-deepBlue font-display">لا تملك صلاحية الوصول</h2>
              <p className="mt-1 text-sm leading-7 text-deepBlue/65">
                هذه اللوحة مخصّصة لمستخدمي الإدارة. يُرجى تسجيل الدخول بحساب إدارة أو التواصل مع مدير المنصة.
              </p>
            </div>
            <Link to="/dashboard">
              <EmcButton variant="secondary" size="sm">
                العودة إلى لوحتي
              </EmcButton>
            </Link>
          </div>
        </Surface>
      </DashboardPageShell>
    )
  }

  if (isLoading) return <AdminSkeleton />

  const { stats, recent_registrations } = data

  // ── Primary KPI tiles (premium StatTiles) ────────────────────────────────
  const primaryTiles = [
    { label: 'المستخدمون',     value: stats.total_users,                 icon: Users,         tone: 'brand' as const,  caption: 'إجمالي الحسابات في المنصة' },
    { label: 'الدورات النشطة', value: stats.active_courses,              icon: BookOpen,      tone: 'accent' as const, caption: 'دورات مفتوحة للتسجيل' },
    { label: 'التسجيلات',      value: stats.total_enrollments,           icon: GraduationCap, tone: 'success' as const, caption: 'تسجيلات على البرامج' },
    { label: 'البرامج',         value: stats.total_programs,              icon: BarChart3,     tone: 'ink' as const,    caption: 'برامج تدريبية معتمدة' },
  ]

  const secondaryTiles = [
    { label: 'ورش نشطة',       value: stats.active_workshops ?? 0,       icon: CalendarClock, tone: 'brand' as const },
    { label: 'مدفوعات معلقة',  value: stats.pending_payments ?? 0,       icon: Wallet,        tone: 'accent' as const, trend: (stats.pending_payments ?? 0) > 0 ? ('up' as const) : ('flat' as const) },
    { label: 'طلبات ورش',      value: stats.workshop_requests ?? 0,       icon: MessageSquare, tone: 'ink' as const },
    { label: 'المسارات',        value: stats.tracks_count ?? 0,            icon: Briefcase,     tone: 'neutral' as const },
    { label: 'المدربون',        value: stats.instructors_count ?? 0,       icon: ShieldCheck,   tone: 'success' as const },
    { label: 'الإدارات',        value: stats.departments_count ?? 0,       icon: Building2,     tone: 'brand' as const },
  ]

  const errorVisual = errorKind ? mapError(errorKind) : null

  return (
    <DashboardPageShell
      title="لوحة تحكم الإدارة"
      eyebrow={<Eyebrow tone="brand">EMC OS · ADMIN</Eyebrow>}
      badge={
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-200 font-latin">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-slow-pulse" />
          مباشر
        </span>
      }
      description="نظرة شاملة على نشاط منصة EMC: المستخدمون، الدورات، التسجيلات، المالية، والعمليات."
      actions={
        <EmcButton
          variant="secondary"
          size="sm"
          onClick={retry}
          leadingIcon={<RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />}
        >
          تحديث
        </EmcButton>
      }
    >
      {/* ── Welcome surface — premium gradient ── */}
      <Surface
        variant="inverse"
        elevation={4}
        padding="lg"
        className="emc-dawn relative overflow-hidden"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-emc-dots bg-dots-22 opacity-[0.06]"
        />
        <div className="relative grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div className="text-right">
            <p className="text-sm font-bold text-ice/70 font-latin tracking-wide">{greeting}،</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-white font-display sm:text-3xl">
              {user?.name ?? 'مرحباً'}
              <span className="ms-2 inline-block animate-soft-float">👋</span>
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-white/70">
              إليك نظرة شاملة على ما يحدث الآن في منصة EMC — أحدث الإحصاءات، آخر التسجيلات، وأهم الإجراءات السريعة.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:max-w-md lg:justify-self-end">
            {[
              { k: 'المستخدمون', v: stats.total_users },
              { k: 'التسجيلات',  v: stats.total_enrollments },
              { k: 'الدورات',     v: stats.active_courses },
            ].map((s) => (
              <div
                key={s.k}
                className="rounded-xl border border-white/[0.12] bg-white/[0.07] px-3 py-3 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm"
              >
                <div className="emc-display-num text-2xl tracking-tight text-white">{s.v}</div>
                <p className="mt-1 text-[11px] font-black uppercase tracking-wider text-ice/60 font-latin">{s.k}</p>
              </div>
            ))}
          </div>
        </div>
      </Surface>

      {/* ── Inline error banner (cleaner Arabic, no raw backend strings) ── */}
      {errorVisual && (
        <Surface variant="default" elevation={2} padding="lg" className="border-amber-200 ring-amber-100">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 ${errorVisual.iconCls}`}
            >
              {errorVisual.icon}
            </span>
            <div className="min-w-0 flex-1 text-right">
              <p className="text-base font-black text-deepBlue">{errorVisual.title}</p>
              <p className="mt-1 text-sm font-medium leading-7 text-deepBlue/65">
                {errorVisual.body}
              </p>
              {showingDemo && (
                <p className="mt-2 text-xs font-bold text-amber-700">
                  يتم عرض بيانات تجريبية مؤقتة حتى يعود الاتصال بالخادم.
                </p>
              )}
            </div>
            <EmcButton variant="primary" size="sm" onClick={retry} leadingIcon={<RefreshCw size={15} />}>
              إعادة المحاولة
            </EmcButton>
          </div>
          {import.meta.env.DEV && errorMessage && (
            <details className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
              <summary className="cursor-pointer font-black text-slate-600">تفاصيل تقنية (وضع التطوير فقط)</summary>
              <p className="mt-2 break-all font-latin">{errorMessage}</p>
            </details>
          )}
        </Surface>
      )}

      {/* ── Primary KPI tiles ── */}
      <section>
        <SectionHeading
          title="المؤشرات الرئيسية"
          subtitle="ملخص حيوي لأهم القياسات التشغيلية للمنصة."
          eyebrow="KPIs"
          align="start"
          rule={false}
        />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {primaryTiles.map((t) => (
            <StatTile key={t.label} {...t} />
          ))}
        </div>
      </section>

      {/* ── Secondary KPI tiles ── */}
      <section>
        <SectionHeading
          title="الأقسام والعمليات"
          subtitle="حالة الورش، المالية، المسارات، المدربين، والإدارات."
          eyebrow="OPERATIONS"
          eyebrowTone="accent"
          align="start"
          rule={false}
        />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {secondaryTiles.map((t) => (
            <StatTile key={t.label} {...t} />
          ))}
        </div>
      </section>

      {/* ── Recent registrations ── */}
      <Surface variant="default" elevation={3} padding="none" className="overflow-hidden">
        <DashboardSection
          title="التسجيلات الأخيرة"
          action={{ label: 'عرض الكل', href: '/dashboard/registrations' }}
        >
          {recent_registrations.length > 0 ? (
            <DataTable<RecentRegistration>
              columns={registrationColumns}
              data={recent_registrations}
              keyExtractor={(row) => row.id}
              emptyMessage="لا توجد تسجيلات حديثة"
            />
          ) : (
            <div className="rounded-xl border border-dashed border-deepBlue/15 bg-emcBg/60 px-6 py-12 text-center">
              <p className="text-sm font-black tracking-tight text-deepBlue font-display">لا توجد تسجيلات حديثة</p>
              <p className="mt-2 text-xs font-medium text-deepBlue/55">
                ستظهر هنا أحدث تسجيلات الطلاب فور إضافتها من خلال المنصة.
              </p>
              <Link
                to="/dashboard/registrations"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-black text-customBlue hover:underline"
              >
                إدارة التسجيلات
                <ChevronLeft size={14} />
              </Link>
            </div>
          )}
        </DashboardSection>
      </Surface>

      {/* ── Quick actions ── */}
      <DashboardSection title="إجراءات سريعة">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickActionCard
            icon={UserCog}
            label="المستخدمون"
            description="إدارة حسابات المستخدمين"
            href="/dashboard/users"
            color="blue"
          />
          <QuickActionCard
            icon={BookOpen}
            label="الدورات"
            description="إدارة الدورات والبرامج"
            href="/dashboard/courses"
            color="orange"
          />
          <QuickActionCard
            icon={GraduationCap}
            label="التسجيلات"
            description="متابعة تسجيلات الطلاب"
            href="/dashboard/registrations"
            color="blue"
          />
          <QuickActionCard
            icon={Wallet}
            label="المدفوعات"
            description="متابعة المدفوعات المعلقة"
            href="/dashboard/finance"
            color="orange"
          />
          <QuickActionCard
            icon={BarChart3}
            label="التقارير"
            description="تقارير الأداء والإحصاءات"
            href="/dashboard/admin/reports"
            color="green"
          />
          <QuickActionCard
            icon={CalendarClock}
            label="الجلسات"
            description="إدارة جلسات التدريب"
            href="/dashboard/admin/lms/sessions"
            color="blue"
          />
          <QuickActionCard
            icon={Building2}
            label="الإدارات"
            description="هيكل الأقسام والإدارات"
            href="/dashboard/super-admin/crud/departments"
            color="green"
          />
          <QuickActionCard
            icon={Settings}
            label="الإعدادات"
            description="إعدادات النظام والمنصة"
            href="/dashboard/settings"
            color="purple"
          />
        </div>
      </DashboardSection>
    </DashboardPageShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Error → friendly Arabic visual
// ─────────────────────────────────────────────────────────────────────────────

function mapError(kind: AdminDashboardErrorKind): {
  icon: React.ReactNode
  iconCls: string
  title: string
  body: string
} {
  switch (kind) {
    case 'network':
      return {
        icon: <WifiOff size={22} />,
        iconCls: 'bg-amber-50 text-amber-600 ring-amber-200',
        title: 'تعذّر الاتصال بخادم EMC',
        body: 'تحقّق من اتصالك بالإنترنت أو من تشغيل الخدمة الخلفية، ثم أعد المحاولة.',
      }
    case 'notfound':
      return {
        icon: <AlertTriangle size={22} />,
        iconCls: 'bg-amber-50 text-amber-600 ring-amber-200',
        title: 'لم يتم العثور على نقطة التحديث',
        body: 'قد تكون نسخة الواجهة الخلفية أقدم. يُرجى التواصل مع الدعم الفني.',
      }
    case 'server':
      return {
        icon: <AlertTriangle size={22} />,
        iconCls: 'bg-rose-50 text-rose-600 ring-rose-200',
        title: 'حدث خطأ غير متوقع في الخادم',
        body: 'حدث خلل أثناء جلب بيانات اللوحة. حاول مرة أخرى بعد قليل.',
      }
    case 'forbidden':
      // Handled by the early-return forbidden panel above.
      return {
        icon: <ShieldX size={22} />,
        iconCls: 'bg-rose-50 text-rose-600 ring-rose-200',
        title: 'لا تملك صلاحية الوصول',
        body: 'يُرجى تسجيل الدخول بحساب إدارة.',
      }
    default:
      return {
        icon: <AlertTriangle size={22} />,
        iconCls: 'bg-rose-50 text-rose-600 ring-rose-200',
        title: 'تعذّر تحميل بيانات اللوحة',
        body: 'حاول إعادة تحميل اللوحة. إذا استمرّت المشكلة، يُرجى التواصل مع الدعم الفني.',
      }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading skeleton — premium shimmer using design-system tokens
// ─────────────────────────────────────────────────────────────────────────────

function AdminSkeleton() {
  return (
    <div className="space-y-8">
      <div className="h-32 emc-skeleton rounded-3xl" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 emc-skeleton rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 emc-skeleton rounded-2xl" />
        ))}
      </div>
      <div className="emc-skeleton h-72 rounded-2xl" />
    </div>
  )
}
