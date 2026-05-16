import apiClient from './axios'
import { asList, unwrapLms } from './lmsApi'
import type {
  FinanceDashboardData,
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
}): Promise<FinancePaymentRow[]> {
  const res = await apiClient.get<unknown>('/finance/payments', { ...silent, params })
  return asList<FinancePaymentRow>(res.data)
}

export async function fetchFinanceTransactions(params?: {
  from?: string
  to?: string
}): Promise<FinanceTransactionRow[]> {
  const res = await apiClient.get<unknown>('/finance/transactions', { ...silent, params })
  return asList<FinanceTransactionRow>(res.data)
}
