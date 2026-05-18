import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import {
  Activity,
  Building2,
  ChevronDown,
  CircuitBoard,
  RefreshCw,
  Target,
  Users,
  Workflow,
} from 'lucide-react'
import { fetchWorkspaceDepartmentsForSuperAdmin } from '@/api/superAdminOpsApi'
import { getApiErrorMessage } from '@/api/apiErrors'
import type { WorkspaceDepartment } from '@/types/operations'
import { getDepartmentName } from '@/utils/workspaceDepartment'
import { MiniSelect } from '@/pages/super-admin/crud/shared/FilterBar'
import { CrudBadge } from '@/pages/super-admin/crud/shared/Badge'
import { EmptyPanel, ErrorPanel } from '@/pages/super-admin/crud/shared/States'
import { RowActionsMenu } from '@/pages/super-admin/crud/shared/RowActions'
import {
  EntityDetailDrawer,
  EntityDetailField,
  EntityDetailSection,
} from '@/pages/super-admin/crud/shared/EntityDetailDrawer'
import { EntityActionMenu } from '@/pages/super-admin/crud/shared/EntityActionMenu'
import { CrudToolbar } from '@/pages/super-admin/crud/shared/CrudToolbar'
import {
  EnterpriseBarChartRtl,
  EnterpriseTinyArea,
} from '@/pages/super-admin/crud/shared/enterprise/charts'
import {
  AnimatedTabular,
  EnterpriseCrudHero,
  EnterpriseMetricTile,
  EnterpriseTableSkeleton,
} from '@/pages/super-admin/crud/shared/enterprise/EnterpriseMetrics'
import {
  SaGlassCard,
  SaPageRoot,
} from '@/pages/super-admin/crud/shared/SuperAdminPrimitives'
import {
  CrudCardTable,
  CrudTable,
  Th,
  Tr,
  Td,
} from '@/pages/super-admin/crud/shared/TableChrome'

function healthBadge(h: WorkspaceDepartment['status']) {
  if (h === 'healthy') return <CrudBadge variant="success">سليم</CrudBadge>
  if (h === 'risk') return <CrudBadge variant="danger">خطر</CrudBadge>
  return <CrudBadge variant="accent">انتباه</CrudBadge>
}

function spineTone(status: WorkspaceDepartment['status']) {
  if (status === 'risk') return 'border-rose-200/85 bg-gradient-to-bl from-rose-50/90 to-white'
  if (status === 'healthy') return 'border-emerald-200/80 bg-gradient-to-bl from-emerald-50/70 to-white'
  return 'border-amber-200/75 bg-gradient-to-bl from-amber-50/75 to-white'
}

export default function DepartmentsManagementPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<WorkspaceDepartment[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [health, setHealth] = useState<'all' | WorkspaceDepartment['status']>('all')
  const [view, setView] = useState<WorkspaceDepartment | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const list = await fetchWorkspaceDepartmentsForSuperAdmin()
      const safeDepartments = Array.isArray(list) ? list : []
      setRows(safeDepartments)
    } catch (e) {
      setRows([])
      setLoadError(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    return rows.filter((r) => {
      if (health !== 'all' && r.status !== health) return false
      const deptHay = `${getDepartmentName(r) ?? ''}`.toLowerCase()
      const hay = `${deptHay} ${(r.leader_name ?? '').toLowerCase()} ${(r.description ?? '').toLowerCase()}`
      return !t || hay.includes(t)
    })
  }, [rows, q, health])

  const totalTasks = rows.reduce((acc, r) => acc + (r.open_tasks ?? 0), 0)
  const totalMeetings = rows.reduce((a, r) => a + (r.meetings_week ?? 0), 0)
  const spotlight = [...filtered].sort((a, b) => {
    const diff = (b.open_tasks ?? 0) - (a.open_tasks ?? 0)
    if (diff !== 0) return diff
    if (a.status !== b.status) return a.status === 'risk' ? -1 : 1
    const na = getDepartmentName(a) ?? ''
    const nb = getDepartmentName(b) ?? ''
    return na.localeCompare(nb, 'ar')
  })[0]

  const avgHealthScores = rows.filter((r) => typeof r.health_score === 'number' && !Number.isNaN(r.health_score))
  const healthAvg =
    avgHealthScores.length > 0 ?
      avgHealthScores.reduce((a, r) => a + (r.health_score ?? 0), 0) / avgHealthScores.length
    : null

  const barData = [...filtered].sort((a, b) => (b.open_tasks ?? 0) - (a.open_tasks ?? 0)).slice(0, 8)

  const areaSeries =
    filtered.length ?
      [...filtered]
        .slice(0, 12)
        .map((d, idx) => ({ idx, v: (d.members_count ?? 0) + (d.open_tasks ?? 0) * 0.4 }))
    : []
  const loadDen = filtered.length === 0 ? 1 : Math.max(1, ...filtered.map((x) => x.open_tasks ?? 0))

  const statusMix = rows.reduce(
    (acc, r) => {
      const st = r.status ?? 'attention'
      if (st === 'healthy') acc.healthy += 1
      else if (st === 'risk') acc.risk += 1
      else acc.attention += 1
      return acc
    },
    { healthy: 0, attention: 0, risk: 0 },
  )

  return (
    <SaPageRoot className="space-y-8 pb-14">
      <EnterpriseCrudHero
        eyebrow="Org Spine · Workforce Load"
        title="الإدارات — لوحة تنظيمية تشغيلية"
        subtitle="هيكلة مساحة العمل، حمولة مهام المرصودة، ومؤشر الصحة حيث يصدّره الخادم؛ لا نقترح مصروفًا أو ميزانية قبل توفر حقولمالية موثَّقة من الـAPI."
        variant="navy"
        actions={
          <>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-[18px] border border-white/28 bg-white/95 px-4 py-2.5 text-[12px] font-black text-deepBlue shadow backdrop-blur-md"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />
              تحديث
            </button>
            <Link
              to="/dashboard/admin/departments"
              className="inline-flex items-center gap-2 rounded-[18px] bg-[#EC943C] px-5 py-2.5 text-[12px] font-black text-white shadow-lg"
            >
              <CircuitBoard className="h-4 w-4" aria-hidden />
              مساحة التشغيل
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <EnterpriseMetricTile
          accent="blue"
          icon={Building2}
          label="وحدات الإدارات"
          value={<AnimatedTabular value={rows.length} />}
          hint={`آخر مراجعة مخطط صحّي تقريبي: سليم ${statusMix.healthy} · انتباه ${statusMix.attention} · خطر ${statusMix.risk}`}
        />
        <EnterpriseMetricTile
          accent="orange"
          icon={Target}
          label="حمولة مهام مفتوحة"
          value={<AnimatedTabular value={totalTasks} />}
          deltaLabel={`${rows.length === 0 ? '—' : (totalTasks / rows.length).toFixed(1)} متوسط مهام على الإدارة`}
        />
        <EnterpriseMetricTile
          accent="mint"
          icon={Activity}
          label="مجموع لقاءات أسبوعية مرصودة"
          value={<AnimatedTabular value={Math.round(totalMeetings)} />}
        />
        <EnterpriseMetricTile
          accent="navy"
          icon={Workflow}
          label="مجمّح الصحة المرصود من الخلفية"
          value={healthAvg == null ? '—' : <AnimatedTabular value={healthAvg.toFixed(1)} />}
          hint={healthAvg == null ? 'لم يصدِّر GET حقل نقاط صحة رقمي لهذه العيّنة.' : 'على مجموعة تعرض health_score ضمن الإجابة فقط'}
        />
      </div>

      <CrudToolbar sticky searchValue={q} onSearchChange={setQ} searchPlaceholder="بحث اسم الإدارة، القائد، أو جزء من وصف مهام…">
        <MiniSelect
          label="الجودة الصحّية"
          value={health}
          onChange={(v) => setHealth(v === 'all' ? 'all' : (v as WorkspaceDepartment['status']))}
          options={[
            { value: 'all', labelAr: 'الجميع' },
            { value: 'healthy', labelAr: 'سليم' },
            { value: 'attention', labelAr: 'انتباه' },
            { value: 'risk', labelAr: 'خطر' },
          ]}
        />
      </CrudToolbar>

      {loadError && !loading ?
        <ErrorPanel title="تعذر تحميل بيانات الإدارات" hint={loadError} />
      : null}

      {loading && rows.length === 0 ?
        <EnterpriseTableSkeleton cols={6} rows={8} />
      : null}

      {!loading && !loadError && rows.length === 0 ?
        <EmptyPanel
          title="لا توجد إدارات متاحة حاليًا"
          subtitle="لم تُرجِع نقطة العمليات أي وحدة الآن؛ جرّب التحديث لاحقاً أو راجع صلاحية GET /operations/departments."
        />
      : null}

      {!loadError && rows.length > 0 ?
        <>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <motion.div layout className="space-y-5">
          <SaGlassCard className="relative overflow-hidden p-6" glow="blue">
            <div className="absolute -start-20 top-1/2 h-48 w-48 -translate-y-1/2 rounded-full bg-[#2691C2]/10 blur-[80px]" aria-hidden />
            <div className="relative flex flex-wrap items-start justify-between gap-4 text-right rtl:text-right">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-600">محور التركيز</p>
                {spotlight ?
                  <>
                    <h2 className="mt-3 text-xl font-black text-deepBlue">{getDepartmentName(spotlight)}</h2>
                    <p className="mt-2 max-w-xl text-[12px] font-semibold leading-relaxed text-muted-700">
                      {spotlight.description?.trim() ??
                        'لا يتوفر ملخص مهام نشِطة من الوصف الآن؛ تُكمَّل هذه البطاقة عند ظهور وصف تهيئة في الاستجابة.'}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3 justify-start">
                      {healthBadge(spotlight.status)}
                      <span className="inline-flex items-center gap-2 rounded-2xl border border-ink-100 bg-white px-4 py-1.5 text-[11px] font-black text-deepBlue shadow-sm">
                        <Users className="h-4 w-4 text-customBlue" aria-hidden />
                        {spotlight.members_count ?? 0} موظفي إداريين · {spotlight.leader_name ?? 'بحاجة تعيين قائدة'}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-2xl border border-accent-200 bg-accent-50 px-4 py-1.5 text-[11px] font-black text-accent-950 shadow-sm ring-1 ring-accent-200/50">
                        {spotlight.open_tasks ?? 0} مهمة مفتوحة · {(spotlight.meetings_week ?? 0)} لقاء أسبوعي
                      </span>
                    </div>
                  </>
                : (
                  <p className="mt-3 font-bold text-muted-600">لم نُظهر وحدة تنفيذية بعد — فارغ وفق المرشح.</p>
                )}
              </div>
              <div className="min-w-[12rem] flex-1 text-right rtl:text-right">
                <p className="text-[11px] font-black text-muted-600">مؤشر نشاط ظرفيّ</p>
                <p className="mt-1 text-[11px] font-semibold text-muted-500">أعضاء + ضبط مهام (مركّبة من حقول موجودة بالفعل).</p>
                <div className="mt-3 rounded-3xl border border-white/65 bg-white/70 p-2 shadow-inner backdrop-blur">
                  {areaSeries.length ?
                    <EnterpriseTinyArea data={areaSeries} />
                  : (
                    <p className="px-2 py-6 text-[11px] font-bold text-muted-500 rtl:text-center">بدون نقاط ظرف مركّبة</p>
                  )}
                </div>
              </div>
            </div>
          </SaGlassCard>

          <SaGlassCard className="p-6" glow="orange">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-ink-100/70 pb-4 text-right">
              <div>
                <p className="text-[11px] font-black text-muted-600">خطّ التراص التنفيذي</p>
                <p className="mt-1 text-sm font-black text-deepBlue">أدوار على محور واحد وفق المرشحات الحالية</p>
              </div>
              <Workflow className="h-9 w-9 text-accent-600/55" aria-hidden />
            </div>
            {!filtered.length ?
              <p className="px-4 py-10 text-[13px] font-bold leading-relaxed text-muted-600 rtl:text-center">
                لا توجد وحدات تطابق المرشّح ضمن هذا العمود — استخدم بحث الاسم أسفله لإظهار نتائج أخرى.
              </p>
            :
              <div className="space-y-3">
                {[...filtered]
                  .sort((a, b) => (b.open_tasks ?? 0) - (a.open_tasks ?? 0))
                  .slice(0, 10)
                  .map((d, i) => (
                    <motion.button
                      type="button"
                      key={d.id}
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.28, delay: i * 0.035 }}
                      onClick={() => setView(d)}
                      className={`flex w-full items-center gap-4 rounded-[22px] border px-5 py-3 text-start shadow-[0_14px_50px_-32px_rgba(15,23,42,0.55)] backdrop-blur ${spineTone(d.status)}`}
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/92 text-[11px] font-black text-deepBlue ring-1 ring-deepBlue/15">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1 rtl:text-right">
                        <div className="flex flex-wrap items-center justify-between gap-2 rtl:flex-row-reverse">
                          <p className="truncate font-black text-deepBlue">{getDepartmentName(d)}</p>
                          <div className="flex gap-2 opacity-95">{healthBadge(d.status)}</div>
                        </div>
                        <p className="mt-1 truncate text-[12px] font-bold text-muted-600">
                          {d.leader_name ?? 'بحاجة تسمية قائدة'} · {d.members_count ?? 0} مشاركون · {d.open_tasks ?? 0} مهام مفتوحة
                        </p>
                      </div>
                      <Building2 className="h-5 w-5 shrink-0 opacity-55" aria-hidden />
                    </motion.button>
                  ))}
              </div>
            }
          </SaGlassCard>
        </motion.div>

        <div className="space-y-4">
          <SaGlassCard className="flex flex-col gap-3 p-5 text-right" glow="orange">
            <p className="text-[11px] font-black text-deepBlue">حمولة مهام حسب وحدة تنظيمية</p>
            <p className="text-[11px] font-semibold text-muted-600">مصدر عدّادات مهام المرصود من GET؛ أعلى حمولة إلى أقل.</p>
            <div className="rounded-3xl bg-white/[0.45] px-2 py-1 ring-1 ring-ink-100/60 backdrop-blur">
              <EnterpriseBarChartRtl
                data={barData.map((r) => ({ nameAr: getDepartmentName(r), حمولة: r.open_tasks ?? 0 }))}
                dataKey="حمولة"
                nameKey="nameAr"
                gradientId="dept-load"
              />
            </div>
            {!barData.length && !loading ? <p className="text-[12px] font-bold text-muted-500">لا بيانات لرسم عمود مرئي الآن.</p> : null}
          </SaGlassCard>
          <SaGlassCard className="p-5 text-right" glow="blue">
            <p className="text-[11px] font-black text-muted-600">مزامنة LMS</p>
            <p className="mt-3 text-[12px] font-semibold leading-relaxed text-muted-700">
              ربط تقدّم الطلاب وحزم المحتوى يبقى عبر نقاط مسؤولة خارج هذه القائمة. استخدم الوحدات المرجعية أدناه عند
              المراجعة الميدانية الفعلية.
            </p>
            <Link
              to="/dashboard/admin/departments"
              className="mt-5 inline-flex w-full items-center justify-center rounded-[18px] border border-deepBlue/[0.1] bg-deepBlue/[0.05] px-4 py-2.5 text-[11px] font-black text-deepBlue transition hover:bg-deepBlue/[0.08]"
            >
              فتح وحدة الموظّف التفصيلية
            </Link>
          </SaGlassCard>
        </div>
      </div>

      {!filtered.length ?
        <EmptyPanel title="لا نتائج للمرشّح الحالي" subtitle="عدِّل البحث أو مرشّح الجودة الصحّية لإظهار وحدات أخرى." />
      :
        <CrudCardTable>
          <CrudTable>
            <thead>
              <tr>
                <Th>الإدارة</Th>
                <Th>قيادة وحضور عمل</Th>
                <Th>حمولة مهام مفتوحة</Th>
                <Th className="whitespace-nowrap">لقاءات أسبوعية مرصودة</Th>
                <Th className="whitespace-nowrap">مؤشر صحّة</Th>
                <Th className="text-end whitespace-nowrap">إجراءات</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const open = expanded === r.id
                return (
                  <Fragment key={r.id}>
                    <Tr muted={false}>
                      <Td>
                        <button
                          type="button"
                          onClick={() => setExpanded((id) => (id === r.id ? null : r.id))}
                          className="flex w-full min-w-0 items-center gap-3 text-right rtl:flex-row-reverse"
                        >
                          <ChevronDown
                            className={`h-5 w-5 shrink-0 text-muted-600 transition-transform ${open ? '-rotate-180' : ''}`}
                            aria-hidden
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-black text-deepBlue">{getDepartmentName(r)}</p>
                            <p className="text-[11px] font-bold text-muted-500">معرّف داخلي #{r.id}</p>
                          </div>
                          {healthBadge(r.status)}
                        </button>
                      </Td>
                      <Td className="text-[12px] font-bold rtl:text-right">
                        <div className="flex flex-wrap items-center gap-2 rtl:flex-row-reverse">
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-800 ring-1 ring-slate-200">
                            <Users className="h-3.5 w-3.5" aria-hidden />
                            {r.members_count ?? 0}
                          </span>
                          <span className="text-muted-700">{r.leader_name ?? 'بحاجة تسمية'}</span>
                        </div>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-3 rtl:flex-row-reverse">
                          <span className="tabular-nums text-lg font-black text-accent-800">{r.open_tasks ?? 0}</span>
                          <div className="h-2 flex-1 max-w-[7rem] overflow-hidden rounded-full bg-slate-100 ring-1 ring-ink-100/80">
                            <div
                              className="h-full rounded-full bg-gradient-to-l from-customBlue to-accent-400 transition-all"
                              style={{ width: `${Math.min(100, ((r.open_tasks ?? 0) / loadDen) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </Td>
                      <Td className="tabular-nums font-black text-muted-700">{r.meetings_week ?? '—'}</Td>
                      <Td>
                        <div className="flex flex-col items-end gap-1">
                          <span>{healthBadge(r.status)}</span>
                          <span className="text-[11px] font-bold text-muted-500">
                            {typeof r.health_score === 'number' ? `${r.health_score.toFixed(1)} نقاط` : 'لا يصدّره الخادم'}
                          </span>
                        </div>
                      </Td>
                      <Td className="text-end">
                        <RowActionsMenu
                          ariaLabel={getDepartmentName(r)}
                          actions={[
                            { key: 'v', label: 'لمحة تنفيذية', onClick: () => setView(r) },
                            {
                              key: 'deptdash',
                              label: 'تفاصيل التشغيل',
                              onClick: () => navigate(`/dashboard/admin/departments/${r.id}`),
                            },
                          ]}
                        />
                      </Td>
                    </Tr>
                    <AnimatePresence initial={false}>
                      {open ?
                        <motion.tr
                          layout
                          key={`exp-${r.id}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="bg-brand-500/[0.03]"
                        >
                          <Td colSpan={6} className="!border-t-0">
                            <div className="px-10 py-6 text-[13px] font-semibold leading-relaxed text-muted-700 rtl:text-right">
                              {r.description?.trim() ??
                                'لا يتوفر مسار مهام نصّي موسّع؛ أضف حقول تهيئة عند جهوزية نقطة الموظّف التفاعلية لتوسيع هذا القسم التشغيلي.'}
                              <div className="mt-4 flex flex-wrap gap-2 rtl:flex-row-reverse">
                                <CrudBadge variant="brand">{(r.open_tasks ?? 0).toLocaleString('ar')} مهمة مفتوحة</CrudBadge>
                                <CrudBadge variant={r.status === 'healthy' ? 'success' : 'accent'}>
                                  لقاءات أسبوعية مرصودة: {(r.meetings_week ?? 0).toLocaleString('ar')} جلسات
                                </CrudBadge>
                              </div>
                            </div>
                          </Td>
                        </motion.tr>
                      : null}
                    </AnimatePresence>
                  </Fragment>
                )
              })}
            </tbody>
          </CrudTable>
        </CrudCardTable>
      }
        </>
      : null}

      <EntityDetailDrawer
        open={view !== null}
        onClose={() => setView(null)}
        title={view ? getDepartmentName(view) : ''}
        subtitle="وحدة تنظيمية · GET /operations/departments"
        avatar={
          view ?
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-[#2691C2] to-[#22334A] text-lg font-black text-white shadow-lg ring-4 ring-white/90">
              <Building2 className="h-7 w-7" aria-hidden />
            </span>
          : null
        }
        badges={view ? <>{healthBadge(view.status)}</> : null}
        footerSlot={
          <EntityActionMenu
            onClose={() => setView(null)}
            onEdit={() => view && navigate(`/dashboard/admin/departments/${view.id}`)}
            editLabel="لوحة التشغيل التفصيلية"
          />
        }
        tabs={
          view ?
            [
              {
                id: 'overview',
                labelAr: 'نظرة عامة',
                content: (
                  <div className="space-y-4">
                    <EntityDetailSection title="ملخص تنظيمي" icon={<Target className="h-4 w-4" aria-hidden />}>
                      <p className="text-[13px] font-semibold leading-relaxed text-muted-700">
                        {view.description?.trim() ?? 'لا وصف موسّع مرصود من الخادم لهذه الوحدة.'}
                      </p>
                    </EntityDetailSection>
                    <EntityDetailSection title="مؤشرات تشغيلية" icon={<Activity className="h-4 w-4" aria-hidden />}>
                      <dl className="grid gap-3 sm:grid-cols-2">
                        <EntityDetailField label="معرّف الإدارة" value={<span className="font-mono">#{view.id}</span>} />
                        <EntityDetailField label="الاسم المعروض" value={getDepartmentName(view)} />
                        <EntityDetailField label="قائد مسجّل" value={view.leader_name ?? '—'} />
                        <EntityDetailField label="أعضاء (عدّاد)" value={view.members_count ?? 0} />
                        <EntityDetailField label="مهام مفتوحة" value={view.open_tasks ?? 0} />
                        <EntityDetailField
                          label="لقاءات أسبوعية"
                          value={view.meetings_week ?? '—'}
                        />
                        <EntityDetailField
                          label="نقاط صحّة"
                          value={
                            typeof view.health_score === 'number' ?
                              view.health_score.toFixed(1)
                            : 'لا يصدّر الخادم قيمة رقمية'
                          }
                        />
                      </dl>
                    </EntityDetailSection>
                  </div>
                ),
              },
              {
                id: 'context',
                labelAr: 'السياق التشغيلي',
                content: (
                  <EntityDetailSection title="حمولة ورصد" icon={<Workflow className="h-4 w-4" aria-hidden />}>
                    <ul className="space-y-2 text-[13px] font-semibold text-muted-700 rtl:text-right">
                      <li>حالة الصحّة المرصودة: {healthBadge(view.status)}</li>
                      <li>
                        المهام المفتوحة نسبةً للمجموعة الحالية تُستنتج في الجدول الرئيسي؛ راجع التوسيع النصّي لكل صفّ.
                      </li>
                    </ul>
                  </EntityDetailSection>
                ),
              },
              {
                id: 'activity',
                labelAr: 'النشاط',
                content: (
                  <EntityDetailSection title="سجل زمني مبدئي" icon={<Activity className="h-4 w-4" aria-hidden />}>
                    <p className="text-[12px] font-semibold text-muted-600">
                      لا حقل «آخر من عدّل» في مجموعة العمليات الحالية؛ يُعرض هنا وصف تذكيري حتى يتوفّر تدقيق خلفي.
                    </p>
                    <EntityDetailField
                      label="مصدر البيانات"
                      value="GET /operations/departments — بلا حقل تدقيق مستخدم في الاستجابة الحالية"
                    />
                  </EntityDetailSection>
                ),
              },
            ]
          : undefined
        }
      />
    </SaPageRoot>
  )
}
