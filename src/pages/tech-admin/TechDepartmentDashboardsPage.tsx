import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  Info,
  Loader2,
  Lock,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from 'lucide-react'
import DashboardPageShell from '@/components/ui/DashboardPageShell'
import AnimatedSelect from '@/components/ui/AnimatedSelect'
import { usePageAccess } from '@/contexts/PageAccessContext'
import {
  classifyDashboardError,
  fetchDepartmentDashboard,
  fetchMonitoredDepartments,
  type DashboardErrorKind,
  type DashboardMetric,
  type DashboardTone,
  type DashboardWarning,
  type DepartmentDashboard,
  type MonitoredDepartment,
} from '@/api/techDepartmentDashboardsApi'
import { cn } from '@/lib/utils'

/**
 * /dashboard/tech-admin/department-dashboards — لوحات الإدارات.
 *
 * A READ-ONLY monitoring view for Technology Management. It is not impersonation and not
 * a role switch: the signed-in user keeps their own identity and role, and the page only
 * displays aggregated counts the backend chose to expose.
 *
 * Two independent layers decide who gets here, and this page trusts neither alone:
 *   - PAGE ACCESS (sidebar entry + route guard) decides whether the page opens.
 *   - AUTHORIZATION (`tech.department_dashboards.view`, enforced by the API) decides
 *     whether any data comes back. A 403 is rendered as a clear state, never as an empty page.
 *
 * There is deliberately no edit, approve, delete or workflow control anywhere on it.
 */

const TONE_CARD: Record<DashboardTone, string> = {
  good: 'border-emerald-200 bg-emerald-50/70',
  info: 'border-customBlue/25 bg-customBlue/[0.05]',
  warning: 'border-amber-200 bg-amber-50',
  neutral: 'border-deepBlue/[0.07] bg-white',
}

const TONE_VALUE: Record<DashboardTone, string> = {
  good: 'text-emerald-800',
  info: 'text-customBlue',
  warning: 'text-amber-800',
  neutral: 'text-deepBlue',
}

const SEVERITY: Record<DashboardWarning['severity'], { box: string; icon: typeof Info; label: string }> = {
  critical: { box: 'border-red-200 bg-red-50 text-red-800', icon: XCircle, label: 'حرج' },
  warning: { box: 'border-amber-200 bg-amber-50 text-amber-900', icon: AlertTriangle, label: 'تنبيه' },
  info: { box: 'border-customBlue/20 bg-customBlue/[0.05] text-deepBlue', icon: Info, label: 'معلومة' },
}

function formatValue(m: DashboardMetric): string {
  if (m.value === null || m.value === '') return '—'
  if (m.key === 'last_activity' && typeof m.value === 'string') return formatDateTime(m.value)
  if (typeof m.value === 'number') return m.value.toLocaleString('en-US')
  return String(m.value)
}

function formatDateTime(raw: string | null | undefined): string {
  if (!raw) return '—'
  const t = Date.parse(raw)
  if (!Number.isFinite(t)) return '—'
  return new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(t))
}

function MetricCard({ metric, large = false }: { metric: DashboardMetric; large?: boolean }) {
  return (
    <div className={cn('rounded-2xl border p-4 shadow-sm', TONE_CARD[metric.tone])} data-testid={`metric-${metric.key}`}>
      <p className="text-[11px] font-bold leading-snug text-deepBlue/60">{metric.label}</p>
      <p className={cn('mt-2 font-black', large ? 'text-2xl' : 'text-xl', TONE_VALUE[metric.tone])}>{formatValue(metric)}</p>
    </div>
  )
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-2xl bg-deepBlue/[0.06]', className)} />
}

function StateCard({
  icon: Icon,
  title,
  body,
  tone = 'neutral',
  action,
}: {
  icon: typeof Info
  title: string
  body: string
  tone?: 'neutral' | 'danger'
  action?: React.ReactNode
}) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className="mx-auto max-w-lg rounded-3xl border border-deepBlue/[0.07] bg-white p-8 text-center shadow-sm"
    >
      <span
        className={cn(
          'mx-auto grid h-14 w-14 place-items-center rounded-full ring-1',
          tone === 'danger' ? 'bg-red-50 text-red-500 ring-red-100' : 'bg-customBlue/[0.07] text-customBlue ring-customBlue/15',
        )}
      >
        <Icon size={26} aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-black text-deepBlue">{title}</h2>
      <p className="mt-1.5 text-sm font-bold leading-relaxed text-deepBlue/60">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export default function TechDepartmentDashboardsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { canAccessKey } = usePageAccess()

  const [departments, setDepartments] = useState<MonitoredDepartment[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<DashboardErrorKind | null>(null)

  const [dashboard, setDashboard] = useState<DepartmentDashboard | null>(null)
  const [dashLoading, setDashLoading] = useState(false)
  const [dashError, setDashError] = useState<DashboardErrorKind | null>(null)
  const [moduleKey, setModuleKey] = useState('overview')

  // The selected department lives in the URL, so a refresh or a shared link lands on the
  // same department. Nothing is persisted in storage.
  const selectedId = Number(searchParams.get('department') ?? 0) || 0
  const requestRef = useRef(0)

  const loadList = useCallback(async () => {
    setListLoading(true)
    setListError(null)
    try {
      const res = await fetchMonitoredDepartments()
      setDepartments(res.departments)
    } catch (e) {
      setListError(classifyDashboardError(e))
    } finally {
      setListLoading(false)
    }
  }, [])

  const loadDashboard = useCallback(async (id: number) => {
    const request = ++requestRef.current
    setDashLoading(true)
    setDashError(null)
    try {
      const res = await fetchDepartmentDashboard(id)
      if (request !== requestRef.current) return
      setDashboard(res)
      if (res.departments.length > 0) setDepartments(res.departments)
    } catch (e) {
      if (request !== requestRef.current) return
      setDashboard(null)
      setDashError(classifyDashboardError(e))
    } finally {
      if (request === requestRef.current) setDashLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount; the loading flag must reset before the request
    void loadList()
  }, [loadList])

  useEffect(() => {
    if (selectedId > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on department change; the loading flag must reset before the request
      void loadDashboard(selectedId)
    } else {
      requestRef.current++
      setDashboard(null)
      setDashError(null)
      setDashLoading(false)
    }
  }, [selectedId, loadDashboard])

  const options = useMemo(
    () =>
      departments.map((d) => ({
        value: String(d.id),
        label: d.name,
        keywords: [d.slug ?? '', d.leader?.name ?? ''].filter(Boolean),
        meta: d.leader?.name,
      })),
    [departments],
  )

  function select(value: string) {
    setModuleKey('overview')
    const next = new URLSearchParams(searchParams)
    if (value) next.set('department', value)
    else next.delete('department')
    setSearchParams(next, { replace: true })
  }

  function refresh() {
    void loadList()
    if (selectedId > 0) void loadDashboard(selectedId)
  }

  const busy = listLoading || dashLoading
  const forbidden = listError === 'forbidden' || dashError === 'forbidden'
  const visibleSections = useMemo(
    () => (dashboard ? dashboard.sections.filter((s) => moduleKey === 'overview' || s.key === moduleKey) : []),
    [dashboard, moduleKey],
  )

  const refreshButton = (
    <button
      type="button"
      onClick={refresh}
      disabled={busy || forbidden}
      className="inline-flex items-center gap-2 rounded-xl border border-deepBlue/10 bg-white px-4 py-2.5 text-xs font-black text-deepBlue shadow-sm transition hover:bg-customBlue/[0.05] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <RefreshCw size={14} className={cn(busy && 'animate-spin')} aria-hidden="true" />
      تحديث
    </button>
  )

  return (
    <div dir="rtl" className="mx-auto w-full max-w-7xl">
      <DashboardPageShell
        eyebrow="إدارة التقنية"
        title="لوحات الإدارات"
        description="متابعة لوحات التحكم الخاصة بالإدارات من مكان واحد لأغراض الفحص والدعم التقني."
        breadcrumbs={[
          { label: 'لوحة التحكم التقنية', href: '/dashboard/tech-admin' },
          { label: 'لوحات الإدارات' },
        ]}
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-customBlue/10 px-3 py-1 text-[11px] font-black text-customBlue">
            <Eye size={12} aria-hidden="true" /> عرض للقراءة فقط
          </span>
        }
        actions={refreshButton}
      >
        {forbidden ?
          <StateCard
            icon={Lock}
            tone="danger"
            title="لا تملك صلاحية عرض هذه الصفحة"
            body="عرض لوحات الإدارات يتطلب صلاحية خاصة بالمتابعة التقنية. تواصل مع مسؤول النظام إن كنت تحتاجها."
          />
        : listError ?
          <StateCard
            icon={ShieldAlert}
            tone="danger"
            title="تعذّر تحميل قائمة الإدارات"
            body="حدث خطأ أثناء الاتصال بالخادم. حاول مرة أخرى."
            action={
              <button type="button" onClick={() => void loadList()} className="rounded-xl bg-customOrange px-5 py-2.5 text-sm font-extrabold text-white shadow-emc-md">
                إعادة المحاولة
              </button>
            }
          />
        : (
          <div className="space-y-6">
            {/* ── Department selector ─────────────────────────────────── */}
            <section className="rounded-3xl border border-deepBlue/[0.07] bg-white p-4 shadow-sm sm:p-5" aria-label="اختيار الإدارة">
              <div className="grid gap-4 md:grid-cols-[minmax(0,22rem)_1fr] md:items-end">
                <div>
                  <label className="mb-2 block text-[11px] font-black text-deepBlue/60">الإدارة</label>
                  {listLoading ?
                    <Skeleton className="h-11" />
                  : <AnimatedSelect
                      value={selectedId > 0 ? String(selectedId) : ''}
                      onChange={select}
                      options={options}
                      placeholder="اختر إدارة لعرض لوحتها"
                      ariaLabel="اختيار الإدارة"
                      searchable
                      searchPlaceholder="ابحث عن إدارة…"
                      disabled={options.length === 0}
                    />
                  }
                </div>
                {dashboard ?
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs font-bold text-deepBlue/65">
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 size={14} className="text-customBlue" aria-hidden="true" />
                      {dashboard.selectedDepartment.name}
                    </span>
                    <span>
                      مدير الإدارة: {dashboard.selectedDepartment.leader ? dashboard.selectedDepartment.leader.name : <em className="not-italic text-amber-700">غير معيَّن</em>}
                    </span>
                  </div>
                : null}
              </div>
              {!listLoading && options.length === 0 ?
                <p className="mt-3 text-xs font-bold text-deepBlue/55">لا توجد إدارات نشطة لعرضها.</p>
              : null}
            </section>

            {/* ── Body ────────────────────────────────────────────────── */}
            {selectedId <= 0 ?
              <StateCard icon={Building2} title="اختر إدارة" body="اختر إدارة من القائمة أعلاه لعرض ملخص لوحتها ومؤشراتها." />
            : dashLoading && !dashboard ?
              <div className="space-y-4" aria-busy="true" aria-label="جارٍ التحميل">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
                </div>
                <Skeleton className="h-48" />
              </div>
            : dashError === 'not_found' ?
              <StateCard icon={Building2} tone="danger" title="الإدارة غير متاحة" body="هذه الإدارة غير موجودة أو لم تعد نشطة. اختر إدارة أخرى من القائمة." />
            : dashError ?
              <StateCard
                icon={ShieldAlert}
                tone="danger"
                title="تعذّر تحميل لوحة الإدارة"
                body="حدث خطأ أثناء جلب البيانات. حاول مرة أخرى."
                action={
                  <button type="button" onClick={() => void loadDashboard(selectedId)} className="rounded-xl bg-customOrange px-5 py-2.5 text-sm font-extrabold text-white shadow-emc-md">
                    إعادة المحاولة
                  </button>
                }
              />
            : dashboard ?
              <div className={cn('space-y-6 transition-opacity', dashLoading && 'opacity-60')}>
                {/* KPI cards */}
                <section aria-label="المؤشرات الرئيسية" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {dashboard.cards.length > 0 ?
                    dashboard.cards.map((c) => <MetricCard key={c.key} metric={c} large />)
                  : <p className="text-sm font-bold text-deepBlue/55 sm:col-span-2 lg:col-span-5">لا توجد مؤشرات متاحة لهذه الإدارة.</p>}
                </section>

                {/* Module filter */}
                {dashboard.modules.length > 1 ?
                  <nav aria-label="أقسام اللوحة" className="flex flex-wrap gap-1.5 rounded-2xl border border-deepBlue/[0.07] bg-slate-50/70 p-1.5">
                    {dashboard.modules.map((m) => (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setModuleKey(m.key)}
                        disabled={!m.available}
                        aria-pressed={moduleKey === m.key}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-black transition',
                          moduleKey === m.key ? 'bg-white text-deepBlue shadow-sm ring-1 ring-deepBlue/10' : 'text-deepBlue/55 hover:text-deepBlue',
                          !m.available && 'cursor-not-allowed opacity-50',
                        )}
                      >
                        {!m.available ? <AlertTriangle size={12} aria-hidden="true" /> : null}
                        {m.label}
                      </button>
                    ))}
                  </nav>
                : null}

                <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
                  {/* Sections */}
                  <div className="space-y-4">
                    {visibleSections.length === 0 ?
                      <p className="rounded-2xl border border-dashed border-deepBlue/15 p-6 text-center text-sm font-bold text-deepBlue/55">
                        {moduleKey === 'overview' ? 'لا توجد بيانات تفصيلية لهذه الإدارة بعد.' : 'لا توجد بيانات في هذا القسم.'}
                      </p>
                    : visibleSections.map((s) => (
                        <section key={s.key} className="rounded-3xl border border-deepBlue/[0.07] bg-white p-5 shadow-sm" aria-label={s.label}>
                          <h3 className="mb-3 text-sm font-black text-deepBlue">{s.label}</h3>
                          {s.available ?
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                              {s.metrics.map((m) => <MetricCard key={m.key} metric={m} />)}
                            </div>
                          : <p className="flex items-center gap-2 text-xs font-bold text-red-700">
                              <XCircle size={14} aria-hidden="true" /> تعذّر تحميل هذا القسم.
                            </p>}
                        </section>
                      ))}
                  </div>

                  {/* Diagnostics */}
                  <aside className="space-y-4" aria-label="التشخيص">
                    <section className="rounded-3xl border border-deepBlue/[0.07] bg-white p-5 shadow-sm">
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-deepBlue">
                        <CheckCircle2 size={15} className="text-customBlue" aria-hidden="true" /> التشخيص
                      </h3>
                      <dl className="space-y-2.5 text-xs font-bold">
                        <div className="flex justify-between gap-3">
                          <dt className="text-deepBlue/55">آخر تحديث للبيانات</dt>
                          <dd className="text-deepBlue">{formatDateTime(dashboard.diagnostics.generated_at)}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-deepBlue/55">آخر نشاط في الإدارة</dt>
                          <dd className="text-deepBlue">{formatDateTime(dashboard.diagnostics.last_activity_at)}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-deepBlue/55">مصدر البيانات</dt>
                          <dd className="text-end text-deepBlue">{dashboard.diagnostics.data_source || '—'}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-deepBlue/55">أقسام تعذّر تحميلها</dt>
                          <dd className={dashboard.diagnostics.sections_failed > 0 ? 'text-red-700' : 'text-emerald-700'}>
                            {dashboard.diagnostics.sections_failed}
                          </dd>
                        </div>
                      </dl>
                      {dashboard.diagnostics.stale ?
                        <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-900">
                          <Clock size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                          لا يوجد نشاط مسجَّل في هذه الإدارة منذ أكثر من 30 يومًا.
                        </p>
                      : null}
                      {!dashboard.capabilities.can_view_sensitive ?
                        <p className="mt-3 flex items-start gap-2 text-[11px] font-bold leading-relaxed text-deepBlue/55">
                          <Lock size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                          تُعرض الأرقام المجمَّعة فقط؛ لا تظهر أسماء أو مبالغ أو محتوى خاص.
                        </p>
                      : null}
                    </section>

                    <section className="rounded-3xl border border-deepBlue/[0.07] bg-white p-5 shadow-sm" aria-label="التنبيهات">
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-deepBlue">
                        <AlertTriangle size={15} className="text-customOrange" aria-hidden="true" /> التنبيهات
                      </h3>
                      {dashboard.warnings.length === 0 ?
                        <p className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                          <CheckCircle2 size={14} aria-hidden="true" /> لا توجد تنبيهات لهذه الإدارة.
                        </p>
                      : <ul className="space-y-2">
                          {dashboard.warnings.map((w) => {
                            const sev = SEVERITY[w.severity]
                            return (
                              <li key={w.code} className={cn('flex items-start gap-2 rounded-xl border p-3 text-xs font-bold leading-relaxed', sev.box)}>
                                <sev.icon size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                                <span><span className="sr-only">{sev.label}: </span>{w.message}</span>
                              </li>
                            )
                          })}
                        </ul>}
                    </section>

                    {dashboard.links.length > 0 ?
                      <section className="rounded-3xl border border-deepBlue/[0.07] bg-white p-5 shadow-sm" aria-label="اللوحة الأصلية">
                        {dashboard.links.map((l) =>
                          canAccessKey(l.page_key) ?
                            <Link key={l.key} to={l.path} className="inline-flex w-full items-center justify-center rounded-xl border border-customBlue/30 px-4 py-2.5 text-xs font-black text-customBlue transition hover:bg-customBlue/[0.06]">
                              {l.label}
                            </Link>
                          : <div key={l.key}>
                              <span aria-disabled="true" className="inline-flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-xl border border-deepBlue/10 px-4 py-2.5 text-xs font-black text-deepBlue/40">
                                <Lock size={12} aria-hidden="true" /> {l.label}
                              </span>
                              <p className="mt-2 text-[11px] font-bold text-deepBlue/55">هذه اللوحة تتطلب صلاحية إضافية.</p>
                            </div>,
                        )}
                      </section>
                    : null}
                  </aside>
                </div>
              </div>
            : null}

            {dashLoading && dashboard ?
              <p className="flex items-center justify-center gap-2 text-xs font-bold text-deepBlue/55" role="status">
                <Loader2 size={14} className="animate-spin" aria-hidden="true" /> جارٍ التحديث…
              </p>
            : null}
          </div>
        )}
      </DashboardPageShell>
    </div>
  )
}
