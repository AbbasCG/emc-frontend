import apiClient from './axios'
import { asList, unwrapLms } from './lmsApi'
import type {
  FinanceAccount,
  FinanceAccountTransaction,
  FinanceDashboardData,
  FinanceInvoice,
  FinanceOrder,
  FinancePaymentRow,
  FinanceTransactionRow,
} from '@/types/intelligence'

/** Finance pages fallback to seeded data — avoid global 403 toast on role/endpoint mismatch. */
const silent = { skipErrorToast: true as const }

export async function fetchFinanceDashboard(params?: {
  from?: string
  to?: string
}): Promise<FinanceDashboardData> {
  const res = await apiClient.get<unknown>('/finance/dashboard', { ...silent, params })
  return unwrapLms<FinanceDashboardData>(res.data)
}

export async function fetchFinancePayments(params?: {
  from?: string
  to?: string
  status?: string
  provider?: string
  search?: string
}): Promise<{ data: FinancePaymentRow[]; total: number; per_page: number; current_page: number }> {
  const res = await apiClient.get<unknown>('/finance/payments', { ...silent, params })
  const d = res.data as { success?: boolean; data?: { data?: unknown[]; total?: number; per_page?: number; current_page?: number } }
  const inner = d?.data ?? {}
  return {
    data: Array.isArray((inner as { data?: unknown[] }).data) ? (inner as { data: FinancePaymentRow[] }).data : [],
    total: (inner as { total?: number }).total ?? 0,
    per_page: (inner as { per_page?: number }).per_page ?? 50,
    current_page: (inner as { current_page?: number }).current_page ?? 1,
  }
}

export async function fetchFinanceTransactions(params?: {
  from?: string
  to?: string
}): Promise<FinanceTransactionRow[]> {
  const res = await apiClient.get<unknown>('/finance/transactions', { ...silent, params })
  return asList<FinanceTransactionRow>(res.data)
}

// ── Finance Orders & Invoices ─────────────────────────────────────────────────

export async function fetchFinanceOrders(params?: {
  from?: string; to?: string; status?: string; search?: string; page?: number
}): Promise<{ data: FinanceOrder[]; total: number; per_page: number; current_page: number }> {
  const res = await apiClient.get<unknown>('/finance/orders', { ...silent, params })
  const d = res.data as { data?: unknown }
  const inner = d?.data as { data?: FinanceOrder[]; total?: number; per_page?: number; current_page?: number } | FinanceOrder[]
  if (Array.isArray(inner)) return { data: inner, total: inner.length, per_page: 50, current_page: 1 }
  return {
    data: Array.isArray(inner?.data) ? inner.data! : [],
    total: inner?.total ?? 0,
    per_page: inner?.per_page ?? 50,
    current_page: inner?.current_page ?? 1,
  }
}

export async function fetchFinanceInvoices(params?: {
  from?: string; to?: string; search?: string; page?: number
}): Promise<{ data: FinanceInvoice[]; total: number; per_page: number; current_page: number }> {
  const res = await apiClient.get<unknown>('/finance/invoices', { ...silent, params })
  const d = res.data as { data?: unknown; meta?: { total?: number; current_page?: number } }
  const items = d?.data
  const meta = d?.meta
  if (Array.isArray(items)) {
    return { data: items as FinanceInvoice[], total: meta?.total ?? items.length, per_page: 50, current_page: meta?.current_page ?? 1 }
  }
  return { data: [], total: 0, per_page: 50, current_page: 1 }
}

// ── Finance Accounts ─────────────────────────────────────────────────────────

export async function fetchFinanceAccounts(): Promise<FinanceAccount[]> {
  const res = await apiClient.get<unknown>('/finance/accounts', silent)
  const d = res.data as { data?: unknown[] }
  return Array.isArray(d?.data) ? (d.data as FinanceAccount[]) : []
}

export async function createFinanceAccount(payload: {
  name: string; type: string; currency: string; opening_balance?: number; notes?: string
}): Promise<FinanceAccount> {
  const res = await apiClient.post<unknown>('/finance/accounts', payload)
  const d = res.data as { data?: FinanceAccount }
  return d.data!
}

export async function updateFinanceAccount(id: number, payload: Partial<{
  name: string; type: string; currency: string; notes: string
}>): Promise<FinanceAccount> {
  const res = await apiClient.patch<unknown>(`/finance/accounts/${id}`, payload)
  const d = res.data as { data?: FinanceAccount }
  return d.data!
}

export async function fetchAccountTransactions(
  accountId: number,
  params?: { from?: string; to?: string }
): Promise<FinanceAccountTransaction[]> {
  const res = await apiClient.get<unknown>(`/finance/accounts/${accountId}/transactions`, { ...silent, params })
  const d = res.data as { data?: { data?: unknown[] } }
  return Array.isArray(d?.data?.data) ? (d.data!.data as FinanceAccountTransaction[]) : []
}

export async function addAccountTransaction(
  accountId: number,
  payload: {
    type: string; category?: string; amount: number; currency?: string;
    status?: string; description?: string; payment_method?: string; transaction_date: string
  }
): Promise<FinanceAccount> {
  const res = await apiClient.post<unknown>(`/finance/accounts/${accountId}/transactions`, payload)
  const d = res.data as { data?: FinanceAccount }
  return d.data!
}

export async function fetchFinanceAccountsSummary(): Promise<{ accounts: FinanceAccount[]; total_cash: number }> {
  const res = await apiClient.get<unknown>('/finance/accounts-summary', silent)
  const d = res.data as { data?: { accounts?: FinanceAccount[]; total_cash?: number } }
  return { accounts: d?.data?.accounts ?? [], total_cash: d?.data?.total_cash ?? 0 }
}
