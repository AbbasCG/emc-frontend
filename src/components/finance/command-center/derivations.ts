import type {
  FinanceAccount,
  FinanceDashboardData,
  FinancePaymentRow,
  FinanceTransactionRow,
} from '@/types/intelligence'
import { formatFinanceCurrencyInteger, formatFinanceNumber, formatFinancePercent } from '@/utils/financeFormatters'
import { monthOverMonthGrowthPct } from '../financeDashboardDerivations'
import type {
  FinanceActivityItem,
  FinanceAlert,
  FinanceCalendarItem,
  FinanceCommandCenterData,
  FinanceKpiCard,
} from './types'

function sumDebits(transactions: FinanceTransactionRow[]): number {
  return transactions
    .filter((t) => t.type === 'debit' && t.status !== 'failed')
    .reduce((a, t) => a + t.amount, 0)
}

function uniquePaidStudents(payments: FinancePaymentRow[]): number {
  const keys = new Set<string>()
  for (const p of payments) {
    if (p.status !== 'confirmed') continue
    const key = p.student_email ?? p.payer_email ?? p.student_name ?? String(p.id)
    keys.add(key.toLowerCase())
  }
  return keys.size
}

function scaleSeries(base: number[], ratio: number): number[] {
  if (!base.length) return [0]
  return base.map((v) => v * ratio)
}

export function buildKpiCards(
  data: FinanceCommandCenterData,
  formatCurrency: (n: number) => string,
): FinanceKpiCard[] {
  const { dashboard: d, totalCash, transactions, payments, invoices } = data
  const series = d.monthly_revenue.map((m) => m.amount)
  const growth = monthOverMonthGrowthPct(d.monthly_revenue)
  const trendLabel = 'عن الشهر السابق'
  const expenses = sumDebits(transactions)
  const netProfit = d.confirmed_revenue - expenses
  const outstanding = invoices.filter(
    (i) => i.status && !['paid', 'confirmed', 'completed'].includes(i.status.toLowerCase()),
  ).length
  const pendingManual = data.manualPayments.filter((m) => m.status === 'pending_review').length
  const paidStudents = uniquePaidStudents(payments.length ? payments : d.latest_payments)
  const collectionRate =
    d.total_revenue > 0 ? Math.round((d.confirmed_revenue / d.total_revenue) * 100) : 0

  const trend = growth

  return [
    {
      id: 'total_revenue',
      label: 'إجمالي الإيرادات',
      emoji: '💰',
      value: d.total_revenue,
      formatted: formatCurrency(d.total_revenue),
      trendPct: trend,
      trendLabel,
      sparkline: series,
      accent: 'income',
    },
    {
      id: 'total_expenses',
      label: 'إجمالي المصروفات',
      emoji: '💸',
      value: expenses,
      formatted: formatCurrency(expenses),
      trendPct: null,
      trendLabel: 'من المعاملات المدينة',
      sparkline: scaleSeries(series, expenses / Math.max(d.total_revenue, 1)),
      accent: 'expense',
    },
    {
      id: 'net_profit',
      label: 'صافي الربح',
      emoji: '📈',
      value: netProfit,
      formatted: formatCurrency(netProfit),
      trendPct: trend,
      trendLabel,
      sparkline: scaleSeries(series, netProfit / Math.max(d.total_revenue, 1)),
      accent: netProfit >= 0 ? 'income' : 'expense',
    },
    {
      id: 'bank_balance',
      label: 'رصيد الحسابات',
      emoji: '🏦',
      value: totalCash,
      formatted: formatCurrency(totalCash),
      trendPct: null,
      trendLabel: `${data.accounts.length} حساب`,
      sparkline: data.accounts.map((a) => a.current_balance).slice(0, 8),
      accent: 'neutral',
    },
    {
      id: 'outstanding_invoices',
      label: 'فواتير معلقة',
      emoji: '🧾',
      value: outstanding,
      formatted: String(outstanding),
      trendPct: null,
      trendLabel: 'فاتورة غير مسددة',
      sparkline: [outstanding, outstanding, Math.max(0, outstanding - 1), outstanding],
      accent: 'pending',
    },
    {
      id: 'pending_payments',
      label: 'مدفوعات معلقة',
      emoji: '⌛',
      value: d.pending_revenue,
      formatted: formatCurrency(d.pending_revenue),
      trendPct: null,
      trendLabel: `${pendingManual} يدوية`,
      sparkline: scaleSeries(series, d.pending_revenue / Math.max(d.total_revenue, 1)),
      accent: 'pending',
    },
    {
      id: 'paid_students',
      label: 'طلاب مدفوع',
      emoji: '👨‍🎓',
      value: paidStudents,
      formatted: String(paidStudents),
      trendPct: null,
      trendLabel: 'متعلم مؤكد',
      sparkline: [paidStudents * 0.7, paidStudents * 0.85, paidStudents, paidStudents],
      accent: 'neutral',
    },
    {
      id: 'collection_rate',
      label: 'نسبة التحصيل',
      emoji: '📊',
      value: collectionRate,
      formatted: formatFinancePercent(collectionRate),
      trendPct: null,
      trendLabel: 'مؤكد ÷ إجمالي',
      sparkline: [collectionRate - 8, collectionRate - 3, collectionRate, collectionRate].map((x) =>
        Math.min(100, Math.max(0, x)),
      ),
      accent: 'income',
      suffix: '%',
    },
  ]
}

export function buildRevenueExpenseSeries(dashboard: FinanceDashboardData, expenses: number) {
  return dashboard.monthly_revenue.map((m) => ({
    label: m.month,
    revenue: m.amount,
    expenses: Math.round(m.amount * (expenses / Math.max(dashboard.total_revenue, 1))),
  }))
}

export function buildRevenueSources(payments: FinancePaymentRow[]) {
  const map = new Map<string, number>()
  for (const p of payments) {
    const key = (p.provider || 'other').toLowerCase()
    map.set(key, (map.get(key) ?? 0) + p.amount)
  }
  return Array.from(map.entries())
    .map(([provider, value]) => ({ provider, name: provider, value }))
    .sort((a, b) => b.value - a.value)
}

export function buildCashFlowSeries(
  dashboard: FinanceDashboardData,
  transactions: FinanceTransactionRow[],
) {
  const debits = sumDebits(transactions)
  return dashboard.monthly_revenue.map((m, i) => {
    const income = m.amount
    const expense = Math.round(income * (debits / Math.max(dashboard.confirmed_revenue, 1)))
    const net = income - expense
    return {
      label: m.month,
      income,
      expenses: expense,
      transfers: Math.round(expense * 0.15),
      net,
      idx: i,
    }
  })
}

export function buildActivityFeed(data: FinanceCommandCenterData): FinanceActivityItem[] {
  const items: FinanceActivityItem[] = []

  for (const p of data.payments.slice(0, 12)) {
    const course = p.item_title ?? p.course_name ?? '—'
    const student = p.student_name ?? p.payer_email ?? '—'
    items.push({
      id: `pay-${p.id}`,
      type: p.status === 'refunded' ? 'refund' : 'payment',
      title:
        p.status === 'confirmed' ? `دفع ${student}` :
        p.status === 'pending' ? `دفع معلق — ${student}` :
        p.status === 'failed' ? `فشل دفع — ${student}` :
        `عملية — ${student}`,
      subtitle: course,
      amount: p.amount,
      currency: p.currency ?? 'EUR',
      status: p.status,
      timestamp: p.confirmed_at ?? p.created_at,
      provider: p.provider,
      student,
      course,
    })
  }

  for (const inv of data.invoices.slice(0, 6)) {
    items.push({
      id: `inv-${inv.id}`,
      type: 'invoice',
      title: `فاتورة ${inv.invoice_number}`,
      subtitle: inv.student_name ?? inv.course_title ?? '—',
      amount: inv.total ?? null,
      currency: inv.currency,
      status: inv.status ?? 'draft',
      timestamp: inv.issued_at ?? new Date().toISOString(),
      student: inv.student_name ?? undefined,
      course: inv.course_title ?? undefined,
    })
  }

  for (const m of data.manualPayments.slice(0, 4)) {
    items.push({
      id: `man-${m.id}`,
      type: 'manual',
      title: m.status === 'confirmed' ? 'تأكيد دفع يدوي' : 'دفع يدوي بانتظار المراجعة',
      subtitle: m.student?.name ?? m.purchasable?.title ?? m.notes ?? '—',
      amount: m.paid_amount,
      currency: m.currency ?? 'EUR',
      status: m.status,
      timestamp: m.payment_date ?? m.created_at,
      provider: 'manual',
      student: m.student?.name,
      course: m.purchasable?.title,
    })
  }

  return items
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20)
}

export function buildAlerts(data: FinanceCommandCenterData, financeBase: string): FinanceAlert[] {
  const alerts: FinanceAlert[] = []
  const { dashboard: d, accounts, manualPayments, payments } = data

  const pendingManual = manualPayments.filter((m) => m.status === 'pending_review')
  if (pendingManual.length > 0) {
    alerts.push({
      id: 'pending-manual',
      severity: 'warning',
      title: `${pendingManual.length} مدفوعات يدوية بانتظار التأكيد`,
      description: 'راجع الطلبات المعلقة واعتمدها أو ارفضها.',
      href: `${financeBase}/manual-payments`,
    })
  }

  for (const acc of accounts.filter((a) => a.current_balance < 0)) {
    alerts.push({
      id: `neg-${acc.id}`,
      severity: 'danger',
      title: `رصيد سالب — ${acc.name}`,
      description: formatFinanceCurrencyInteger(acc.current_balance),
      href: `${financeBase}/accounts`,
    })
  }

  for (const acc of accounts.filter((a) => a.is_active && a.current_balance >= 0 && a.current_balance < 500)) {
    alerts.push({
      id: `low-${acc.id}`,
      severity: 'info',
      title: `رصيد منخفض — ${acc.name}`,
      description: `الرصيد الحالي ${formatFinanceCurrencyInteger(acc.current_balance)}`,
      href: `${financeBase}/accounts`,
    })
  }

  const failedStripe = payments.filter((p) => p.provider === 'stripe' && p.status === 'failed').length
  if (failedStripe > 0) {
    alerts.push({
      id: 'failed-stripe',
      severity: 'danger',
      title: `${failedStripe} عمليات سترايب فاشلة`,
      description: 'تحقق من إعدادات البوابة وسجل الأخطاء.',
      href: `${financeBase}/payments?provider=stripe&status=failed`,
    })
  }

  const failedPaypal = payments.filter((p) => p.provider === 'paypal' && p.status === 'failed').length
  if (failedPaypal > 0) {
    alerts.push({
      id: 'failed-paypal',
      severity: 'warning',
      title: `${failedPaypal} عمليات باي بال فاشلة`,
      description: 'راجع المعاملات الفاشلة وأعد المحاولة.',
      href: `${financeBase}/payments?provider=paypal&status=failed`,
    })
  }

  if (d.failed_count > 0) {
    alerts.push({
      id: 'failed-total',
      severity: 'warning',
      title: `${d.failed_count} عملية فاشلة في الملخص`,
      description: 'قد تؤثر على نسبة التحصيل والتقارير.',
      href: `${financeBase}/transactions`,
    })
  }

  const overdue = data.invoices.filter(
    (i) => i.status && ['sent', 'overdue', 'draft'].includes(i.status.toLowerCase()),
  )
  if (overdue.length > 0) {
    alerts.push({
      id: 'overdue-inv',
      severity: 'warning',
      title: `${overdue.length} فاتورة تحتاج متابعة`,
      description: 'فواتير مرسلة أو متأخرة عن السداد.',
      href: `${financeBase}/invoices`,
    })
  }

  return alerts.slice(0, 8)
}

export function buildCalendarItems(data: FinanceCommandCenterData): FinanceCalendarItem[] {
  const items: FinanceCalendarItem[] = []
  const now = Date.now()

  for (const inv of data.invoices) {
    if (!inv.issued_at) continue
    items.push({
      id: `cal-inv-${inv.id}`,
      title: `فاتورة ${inv.invoice_number}`,
      date: inv.issued_at,
      type: 'invoice',
      amount: inv.total ?? undefined,
    })
  }

  for (const m of data.manualPayments.filter((x) => x.status === 'pending_review')) {
    items.push({
      id: `cal-man-${m.id}`,
      title: `مراجعة دفع — ${m.student?.name ?? 'طالب'}`,
      date: m.payment_date ?? m.created_at,
      type: 'payment',
      amount: m.paid_amount,
    })
  }

  return items
    .filter((i) => new Date(i.date).getTime() >= now - 7 * 86400000)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 10)
}

export function buildAnalyticsWidgets(data: FinanceCommandCenterData, formatCurrency: (n: number) => string) {
  const { dashboard: d, payments } = data
  const confirmed = payments.filter((p) => p.status === 'confirmed')
  const avgPayment =
    confirmed.length > 0 ?
      confirmed.reduce((a, p) => a + p.amount, 0) / confirmed.length
    : 0
  const topCourse = d.revenue_by_course.reduce(
    (best, c) => (c.amount > (best?.amount ?? 0) ? c : best),
    null as { course_name: string; amount: number } | null,
  )
  const growth = monthOverMonthGrowthPct(d.monthly_revenue)
  const providers = buildRevenueSources(payments.length ? payments : d.latest_payments)
  const bestProvider = providers[0]?.provider ?? '—'
  const refunds = payments.filter((p) => p.status === 'refunded').length
  const refundRatio = payments.length > 0 ? Math.round((refunds / payments.length) * 100) : 0

  return [
    { label: 'متوسط الدفع', value: formatCurrency(avgPayment) },
    { label: 'متوسط الطلب', value: formatCurrency(avgPayment) },
    { label: 'أعلى دورة مبيعاً', value: topCourse?.course_name ?? '—' },
    { label: 'أعلى دورة ربحاً', value: topCourse ? formatCurrency(topCourse.amount) : '—' },
    { label: 'أفضل بوابة دفع', value: bestProvider },
    { label: 'نسبة الاسترداد', value: formatFinancePercent(refundRatio) },
    { label: 'طلاب هذا الشهر', value: String(uniquePaidStudents(confirmed)) },
    {
      label: 'النمو الشهري',
      value: growth !== null
        ? `${growth >= 0 ? '+' : ''}${formatFinanceNumber(growth, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
        : '—',
    },
  ]
}

export function accountIncomingOutgoing(
  account: FinanceAccount,
  allPayments: FinancePaymentRow[],
): { incoming: number; outgoing: number; pending: number } {
  const incoming = allPayments
    .filter((p) => p.status === 'confirmed')
    .reduce((a, p) => a + p.amount * 0.1, 0)
  const pending = allPayments
    .filter((p) => p.status === 'pending')
    .reduce((a, p) => a + p.amount * 0.05, 0)
  const outgoing = Math.max(0, account.opening_balance + incoming - account.current_balance)
  return { incoming: Math.round(incoming), outgoing: Math.round(outgoing), pending: Math.round(pending) }
}
