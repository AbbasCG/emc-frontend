import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import axios from 'axios'
import {
  Activity,
  Banknote,
  CalendarRange,
  ChevronDown,
  CreditCard,
  ExternalLink,
  Funnel,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import { fetchFinancePayments } from '@/api/financeApi'
import { getApiErrorMessage } from '@/api/apiErrors'
import type { FinancePaymentRow, PaymentProvider, PaymentStatus } from '@/types/intelligence'
import {
  formatFinanceCurrency,
  formatFinanceDateTime,
  providerLabelAr,
  ProviderBadge,
} from '@/components/finance/financeTablesShared'
import { MiniSelect } from '@/pages/super-admin/crud/shared/FilterBar'
import { CrudToolbar } from '@/pages/super-admin/crud/shared/CrudToolbar'
import { CrudBadge } from '@/pages/super-admin/crud/shared/Badge'
import { LoadingPanel, EmptyPanel, ErrorPanel } from '@/pages/super-admin/crud/shared/States'
import { SaGlassCard, SaPageRoot } from '@/pages/super-admin/crud/shared/SuperAdminPrimitives'
import {
  EMC_CHART_PALETTE,
  EnterpriseBarChartRtl,
  EnterpriseColumnChart,
  EnterprisePieRadial,
  EnterpriseTinyArea,
} from '@/pages/super-admin/crud/shared/enterprise/charts'
import {
  AnimatedTabular,
  EnterpriseCrudHero,
  EnterpriseMetricTile,
} from '@/pages/super-admin/crud/shared/enterprise/EnterpriseMetrics'

const STATUS_ORDER = ['pending', 'confirmed', 'failed', 'refunded'] as const satisfies readonly PaymentStatus[]

const STATUS_AR: Record<PaymentStatus, string> = {
  pending: 'قيد المعالجة',
  confirmed: 'مؤكَّدة مالياً',
  failed: 'فشل أو رفض',
  refunded: 'مستردّة',
}

function statusBadgeVariant(s: PaymentStatus): 'success' | 'accent' | 'danger' | 'default' {
  if (s === 'confirmed') return 'success'
  if (s === 'pending') return 'accent'
  if (s === 'refunded') return 'default'
  return 'danger'
}

function dayKey(iso: string) {
  if (!iso?.trim()) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

export default function RegistrationsManagementPage() {
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<FinancePaymentRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [from, setFrom] = useState('2026-01-01')
  const [to, setTo] = useState('2026-12-31')
  const [applied, setApplied] = useState({ from: '2026-01-01', to: '2026-12-31' })
  const [status, setStatus] = useState<PaymentStatus | 'all'>('all')
  const [provider, setProvider] = useState<PaymentProvider | 'all'>('all')
  const [q, setQ] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await fetchFinancePayments({ from: applied.from, to: applied.to })
      setPayments(Array.isArray(rows) ? rows : [])
    } catch (e) {
      setPayments([])
      if (axios.isAxiosError(e) && e.response?.status === 403)
        setError('صلاحيات غير كافية لقراءة /finance/payments — راجع حساب السوبر مشرف أو استخدم لوحة المدفوعات مع دور مالي.')
      else setError(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [applied])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    return payments.filter((r) => {
      if (status !== 'all' && r.status !== status) return false
      if (provider !== 'all' && `${r.provider}`.toLowerCase() !== `${provider}`.toLowerCase()) return false
      if (!t) return true
      const blob = `${r.payer_email ?? ''} ${r.course_name ?? ''} ${r.id} ${r.currency ?? ''}`.toLowerCase()
      return blob.includes(t)
    })
  }, [payments, status, provider, q])

  const kpis = useMemo(() => {
    const base = filtered
    const confirmed = base.filter((r) => r.status === 'confirmed').length
    const pending = base.filter((r) => r.status === 'pending').length
    const failed = base.filter((r) => r.status === 'failed').length
    const refunded = base.filter((r) => r.status === 'refunded').length
    const amountConfirmed = base
      .filter((r) => r.status === 'confirmed')
      .reduce((acc, r) => acc + (Number(r.amount) || 0), 0)
    const uniqCourses = new Set(
      base.map((r) => `${r.course_name ?? ''}`.trim()).filter((n) => n.length > 0),
    ).size
    const conversion =
      confirmed + pending > 0 ? confirmed / Math.max(confirmed + pending + failed, 1) : 0
    return {
      total: base.length,
      confirmed,
      pending,
      failed,
      refunded,
      amountConfirmed,
      uniqCourses,
      conversion,
    }
  }, [filtered])

  const pieStatus = useMemo(() => {
    const slice = STATUS_ORDER.map((s) => ({
      name: STATUS_AR[s],
      value: filtered.filter((r) => r.status === s).length,
      fill:
        s === 'confirmed' ? EMC_CHART_PALETTE[0]
        : s === 'pending' ? EMC_CHART_PALETTE[1]
        : s === 'failed' ? EMC_CHART_PALETTE[3]
        : EMC_CHART_PALETTE[4],
    })).filter((x) => x.value > 0)
    return slice
  }, [filtered])

  const funnelRtl = useMemo(
    () =>
      STATUS_ORDER.map((s) => ({
        nameAr: STATUS_AR[s],
        عمليات: filtered.filter((r) => r.status === s).length,
      })).filter((row) => row.عمليات > 0),
    [filtered],
  )

  /** Daily throughput in window (filtered cohort) — count only, axis is operational not academic. */
  const dailyThroughput = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of filtered) {
      const k = dayKey(r.created_at)
      if (!k) continue
      map.set(k, (map.get(k) ?? 0) + 1)
    }
    const keys = [...map.keys()].sort()
    const tail = keys.slice(-21)
    return tail.map((k, idx) => ({ idx, v: map.get(k) ?? 0, day: k }))
  }, [filtered])

  const recent = useMemo(() => {
    return [...filtered]
      .sort((a, b) => `${b.created_at}`.localeCompare(`${a.created_at}`))
      .slice(0, 14)
  }, [filtered])

  const providersInView = useMemo(() => {
    const s = new Set<string>()
    for (const r of payments) s.add(`${r.provider}`)
    return [...s].sort((a, b) => a.localeCompare(b)).slice(0, 24)
  }, [payments])

  return (
    <SaPageRoot className="space-y-8 pb-16">
      <EnterpriseCrudHero
        eyebrow="Enrollment proxy · GET /finance/payments"
        title="التسجيلات التشغيلية"
        subtitle="مركز قبول مبني على دفعات LMS الفعلية ضمن النطاق الزمني المختار؛ ليس تجميع اشتراك أكاديمي كامل قبل ظهور GET موحّد للتسجيلات."
        variant="orange"
        actions={
          <>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-[18px] border border-white/25 bg-white/95 px-4 py-2.5 text-[12px] font-black text-deepBlue shadow backdrop-blur-md"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />
              تحديث
            </button>
            <button
              type="button"
              onClick={() => setApplied({ from, to })}
              className="inline-flex items-center gap-2 rounded-[18px] bg-[#2691C2] px-4 py-2.5 text-[12px] font-black text-white shadow-lg"
            >
              تطبيق النطاق الزمني
            </button>
            <Link
              to="/dashboard/admin/finance/payments"
              className="inline-flex items-center gap-2 rounded-[18px] bg-[#EC943C] px-4 py-2.5 text-[12px] font-black text-white shadow-lg"
            >
              لوحة المدفوعات
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </>
        }
      />

      <SaGlassCard className="border-amber-200/70 bg-gradient-to-bl from-amber-50/90 via-white to-white p-5 text-right ring-2 ring-amber-400/15" glow="orange">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-900 shadow-inner ring-1 ring-amber-200/80">
              <ShieldAlert className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-[13px] font-black text-deepBlue">إخلاء مسؤولية تشغيلية</p>
              <p className="mt-1 text-[12px] font-semibold leading-relaxed text-muted-700">
                ما تراه هنا هو <strong>وكيل قبول عبر المدفوعات المالية فقط</strong> من مسار LMS الحالي؛ إنه ليس عدّاً
                لطلبات التسجيل الأكاديمية الكامل أو حضور المحتوى أو مراحل المسار قبل الدفع.
                أي GET موحّد للتسجيلات سيستبدل هذا العرض دون مسح هذه الصفحة.
              </p>
            </div>
          </div>
          <Sparkles className="h-5 w-5 text-accent-600 opacity-70" aria-hidden />
        </div>
      </SaGlassCard>

      <div className="grid gap-3 rounded-3xl border border-ink-100 bg-white/90 p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-right">
          <span className="text-[10px] font-black uppercase tracking-wide text-muted-500">من تاريخ</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1.5 w-full rounded-2xl border border-ink-100 px-3 py-2 text-right text-[13px] font-bold text-deepBlue outline-none focus:border-brand-400"
          />
        </label>
        <label className="text-right">
          <span className="text-[10px] font-black uppercase tracking-wide text-muted-500">إلى تاريخ</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1.5 w-full rounded-2xl border border-ink-100 px-3 py-2 text-right text-[13px] font-bold text-deepBlue outline-none focus:border-brand-400"
          />
        </label>
        <div className="flex items-end sm:col-span-2">
          <p className="text-[11px] font-semibold leading-relaxed text-muted-600">
            النطاق المطبَّق الآن:&nbsp;
            <span className="font-black text-deepBlue">
              {applied.from}
              {' → '}
              {applied.to}
            </span>
          </p>
        </div>
      </div>

      {error ?
        <ErrorPanel title="تعذّر قراءة المدفوعات المرجعية" hint={error} />
      : loading ?
        <LoadingPanel />
      : null}

      {!loading && !error ?
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <EnterpriseMetricTile
              icon={CreditCard}
              label="عمليات ضمن المرشّح"
              value={<AnimatedTabular value={kpis.total} />}
              hint={`${payments.length.toLocaleString('ar')} في نطاق GET الحالي`}
              accent="blue"
            />
            <EnterpriseMetricTile
              icon={Banknote}
              label="إيراد مؤكّد (مجموعة مرشَّحة)"
              value={<AnimatedTabular value={formatFinanceCurrency(kpis.amountConfirmed)} />}
              hint="مجموع amount للعمليات بحالة confirmed فقط ضمن المرشّح الحالي."
              accent="mint"
            />
            <EnterpriseMetricTile
              icon={Activity}
              label="مسارات نشاط دفع تقريبي"
              value={<AnimatedTabular value={kpis.uniqCourses} />}
              hint="عدّ course_name مختلفة غير الفارغة في المجموعة المصفّاة الآن."
              accent="orange"
            />
            <EnterpriseMetricTile
              icon={Funnel}
              label="نسبة تأكيد (تشغيلية)"
              value={<AnimatedTabular value={`${Math.round(kpis.conversion * 100)}٪`} />}
              hint="confirmed ÷ max(confirmed+pending+failed,1) — مؤشر تشغيلي على الدفعات، وليس SLA أكاديمي."
              accent="navy"
            />
          </div>

          <CrudToolbar
            sticky
            searchValue={q}
            onSearchChange={setQ}
            searchPlaceholder="بحث بالبريف أو اسم الدورة أو رقم العملية…"
          >
            <MiniSelect
              label="حالة دفع LMS"
              value={status}
              onChange={(v) => setStatus(v as PaymentStatus | 'all')}
              options={[
                { value: 'all', labelAr: 'كل الحالات' },
                ...STATUS_ORDER.map((s) => ({ value: s, labelAr: STATUS_AR[s] })),
              ]}
            />
            <MiniSelect
              label="مزوّد"
              value={`${provider}`}
              onChange={(v) => setProvider(v as PaymentProvider | 'all')}
              options={[
                { value: 'all', labelAr: 'كل المزوّدين' },
                ...providersInView.map((p) => ({ value: p, labelAr: providerLabelAr(p) })),
              ]}
            />
          </CrudToolbar>

          {!filtered.length ?
            <EmptyPanel title="لا عمليات ضمن المرشّح الآن." subtitle="وسِّع النطاق الزمني أو أزل عوامل التصفية لمشاهدة التدفّق." />
          :
            <>
              <div className="grid gap-5 lg:grid-cols-3">
                <SaGlassCard className="lg:col-span-1 border border-ink-100/80 p-5 text-right" glow="blue">
                  <p className="text-[11px] font-black uppercase tracking-wide text-deepBlue">توزيع حالات الدفع</p>
                  <p className="mt-1 text-[11px] font-semibold text-muted-600">عدادات حيث تُرجِع مجموعة المرشَّح الآن فقط.</p>
                  <div className="mt-4">{pieStatus.length ? <EnterprisePieRadial data={pieStatus} height={228} /> : null}</div>
                </SaGlassCard>

                <SaGlassCard className="border border-ink-100/80 p-5 text-right lg:col-span-2" glow="orange">
                  <p className="text-[11px] font-black uppercase tracking-wide text-deepBlue">خط أنابيب دفع أفقي</p>
                  <p className="mt-1 text-[11px] font-semibold text-muted-600">ترتيب ثابت: قيد المعالجة → تأكيد → فشل/رفض → استرداد؛ الأعمدة الصفر مخفية.</p>
                  <div className="mt-4 rounded-[22px] border border-ink-100/70 bg-white/70 p-2 shadow-inner backdrop-blur">
                    {funnelRtl.length ?
                      <EnterpriseBarChartRtl data={funnelRtl} dataKey="عمليات" nameKey="nameAr" height={200} gradientId="reg-flow" />
                    : null}
                  </div>
                </SaGlassCard>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <SaGlassCard className="p-6 text-right" glow="orange">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wide text-deepBlue">تسارع قبول باليومي</p>
                      <p className="mt-1 text-[11px] font-semibold text-muted-600">عدّ عمليات لكل يوم (آخر حتى ٢١ يوماً مع بيان).</p>
                    </div>
                    <CalendarRange className="h-5 w-5 shrink-0 text-customBlue opacity-70" aria-hidden />
                  </div>
                  <div className="mt-4">{dailyThroughput.some((d) => d.v > 0) ?
                    <EnterpriseTinyArea data={dailyThroughput.map(({ idx, v }) => ({ idx, v }))} height={132} />
                  :
                    <p className="text-[12px] font-semibold text-muted-600">لا بيان يومية كافية لرسم الانسياب في هذه المجموعة.</p>
                  }</div>
                </SaGlassCard>

                <SaGlassCard className="p-6 text-right" glow="blue">
                  <p className="text-[11px] font-black uppercase tracking-wide text-deepBlue">مسح عمودي سريع</p>
                  <p className="mt-1 text-[11px] font-semibold text-muted-600">نفس المراحل؛ عرض عمود للمقارنة البصرية السريعة مع KPI.</p>
                  <div className="mt-4">
                    <EnterpriseColumnChart
                      data={funnelRtl.map(({ nameAr, عمليات }) => ({ label: nameAr, c: عمليات }))}
                      bars={[{ key: 'c', color: EMC_CHART_PALETTE[2], label: 'عمليات' }]}
                      height={200}
                    />
                  </div>
                </SaGlassCard>
              </div>

              <motion.div layout className="space-y-3">
                <h2 className="text-right text-sm font-black text-deepBlue">آخر عمليات دفع ظاهرة</h2>
                <div className="divide-y divide-ink-100 overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-sm">
                  {recent.map((r) => {
                    const open = expandedId === r.id
                    return (
                      <Fragment key={r.id}>
                        <button
                          type="button"
                          onClick={() => setExpandedId(open ? null : r.id)}
                          className="flex w-full items-center gap-4 px-5 py-4 text-right transition hover:bg-slate-50/90"
                        >
                          <motion.span layout className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-ink-100 bg-white shadow-sm ${open ? 'ring-2 ring-brand-400/25' : ''}`}>
                            <ChevronDown className={`h-4 w-4 text-muted-600 transition ${open ? 'rotate-180' : ''}`} aria-hidden />
                          </motion.span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="truncate font-black text-deepBlue">{r.course_name?.trim() || `عملية رقم ${r.id}`}</p>
                              <span className="text-[13px] font-black tabular-nums text-deepBlue">{formatFinanceCurrency(r.amount)}</span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <CrudBadge variant={statusBadgeVariant(r.status)}>{STATUS_AR[r.status]}</CrudBadge>
                              <ProviderBadge provider={r.provider} />
                              <span className="text-[11px] font-semibold text-muted-600">{formatFinanceDateTime(r.created_at)}</span>
                            </div>
                          </div>
                        </button>
                        <AnimatePresence initial={false}>
                          {open ?
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.26, ease: [0.22, 0.61, 0.36, 1] }}
                              className="overflow-hidden bg-deepBlue/[0.02]"
                            >
                              <div className="space-y-2 px-5 pb-5 pt-2 text-[12px] font-semibold text-muted-700">
                                <p>
                                  <span className="font-black text-deepBlue">المُدفِع:&nbsp;</span>
                                  <span>{r.payer_email?.trim() || '— غير ظاهر في المرجع'}</span>
                                </p>
                                <p dir="ltr" className="font-mono text-[11px] text-muted-500">
                                  id={r.id} · currency={r.currency ?? 'EUR'}
                                </p>
                                <Link
                                  to="/dashboard/admin/finance/payments"
                                  className="inline-flex items-center gap-2 pt-2 text-[11px] font-black text-customBlue underline-offset-4 hover:underline"
                                >
                                  فتح لوحة مدفوعات كاملة
                                  <ExternalLink className="h-3 w-3" aria-hidden />
                                </Link>
                              </div>
                            </motion.div>
                          : null}
                        </AnimatePresence>
                      </Fragment>
                    )
                  })}
                </div>
              </motion.div>
            </>
          }

          <SaGlassCard className="border border-dashed border-ink-200/90 p-6 text-right" glow="blue">
            <p className="text-[13px] font-semibold leading-relaxed text-muted-700">
              عند إتاحة <strong className="text-deepBlue">GET موحّد للتسجيلات الأكاديمية</strong> (طالب، دورة، حالة قبول، جلسات، اشتراك)
              ستُحمَّل قوائم الأعمدة والـ funnel الحقيقي هنا؛ حتى ذلك الحين تعمل هذه الواجهة كـ cockpit استقبال مدفوع خفيف.
            </p>
          </SaGlassCard>
        </>
      : null}
    </SaPageRoot>
  )
}
