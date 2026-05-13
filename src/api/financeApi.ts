import apiClient from './axios'
import { asList, unwrapLms } from './lmsApi'
import type {
  FinanceDashboardData,
  FinancePaymentRow,
  FinanceTransactionRow,
} from '@/types/intelligence'

export async function fetchFinanceDashboard(params?: {
  from?: string
  to?: string
}): Promise<FinanceDashboardData> {
  const res = await apiClient.get<unknown>('/finance/dashboard', { params })
  return unwrapLms<FinanceDashboardData>(res.data)
}

export async function fetchFinancePayments(params?: {
  from?: string
  to?: string
  status?: string
}): Promise<FinancePaymentRow[]> {
  const res = await apiClient.get<unknown>('/finance/payments', { params })
  return asList<FinancePaymentRow>(res.data)
}

export async function fetchFinanceTransactions(params?: {
  from?: string
  to?: string
}): Promise<FinanceTransactionRow[]> {
  const res = await apiClient.get<unknown>('/finance/transactions', { params })
  return asList<FinanceTransactionRow>(res.data)
}
