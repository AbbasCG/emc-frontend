import type {
  FinanceAccount,
  FinanceDashboardData,
  FinanceInvoice,
  FinancePaymentRow,
  FinanceTransactionRow,
  ManualPayment,
} from '@/types/intelligence'

export type FinancePeriod = 'week' | 'month' | 'year'

export type FinanceCurrency = 'EUR' | 'USD' | 'SAR'

export type FinanceKpiId =
  | 'total_revenue'
  | 'total_expenses'
  | 'net_profit'
  | 'bank_balance'
  | 'outstanding_invoices'
  | 'pending_payments'
  | 'paid_students'
  | 'collection_rate'

export type FinanceKpiCard = {
  id: FinanceKpiId
  label: string
  emoji: string
  value: number
  formatted: string
  trendPct: number | null
  trendLabel: string
  sparkline: number[]
  accent: 'income' | 'expense' | 'neutral' | 'pending'
  suffix?: string
}

export type FinanceActivityItem = {
  id: string
  type: 'payment' | 'invoice' | 'refund' | 'manual' | 'transfer' | 'expense' | 'webhook'
  title: string
  subtitle: string
  amount: number | null
  currency: string
  status: string
  timestamp: string
  provider?: string
  student?: string
  course?: string
}

export type FinanceAlert = {
  id: string
  severity: 'warning' | 'danger' | 'info'
  title: string
  description: string
  href?: string
}

export type FinanceCalendarItem = {
  id: string
  title: string
  date: string
  type: 'invoice' | 'payment' | 'salary' | 'subscription' | 'deadline'
  amount?: number
}

export type FinanceCommandCenterData = {
  dashboard: FinanceDashboardData
  accounts: FinanceAccount[]
  totalCash: number
  payments: FinancePaymentRow[]
  transactions: FinanceTransactionRow[]
  invoices: FinanceInvoice[]
  manualPayments: ManualPayment[]
}

export type ChartPeriod = 'monthly' | 'weekly' | 'yearly'
