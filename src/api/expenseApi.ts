import apiClient from './axios'
import type { ChartOfAccountItem } from './chartOfAccountsApi'

export interface ManualExpenseItem {
  id: number
  voucher_no: string
  date: string
  expense_account_id: number
  payment_account_id: number
  amount: number | string
  currency: string
  department_id?: number | null
  department_name?: string | null
  description: string
  attachment_path?: string | null
  attachment_name?: string | null
  attachment_url?: string | null
  status: 'posted' | 'draft' | 'cancelled'
  created_by?: number | null
  updated_by?: number | null
  created_at?: string
  updated_at?: string
  expense_account?: ChartOfAccountItem
  payment_account?: ChartOfAccountItem
  department?: { id: number; name_ar?: string; name?: string } | null
  creator?: { id: number; name: string; email: string } | null
  journal_entries?: Array<{
    id: number
    voucher_no: string
    account_id: number
    entry_type: 'debit' | 'credit'
    debit_amount: number | string
    credit_amount: number | string
    account?: ChartOfAccountItem
  }>
}

export interface ExpensesSummary {
  total_amount: number
  total_count: number
  by_category: Array<{ category_name: string; category_code: string; total: number | string }>
}

export interface ExpensesResponse {
  success: boolean
  data: {
    data: ManualExpenseItem[]
    current_page: number
    last_page: number
    total: number
    per_page: number
  }
  summary: ExpensesSummary
}

export async function fetchExpensesList(params?: {
  search?: string
  date_from?: string
  date_to?: string
  status?: string
  expense_account_id?: number
  payment_account_id?: number
  department_id?: number
  page?: number
  per_page?: number
}): Promise<{ items: ManualExpenseItem[]; pagination: any; summary: ExpensesSummary }> {
  const { data } = await apiClient.get<ExpensesResponse>('/admin/finance/expenses', { params })
  return {
    items: data.data.data,
    pagination: {
      current_page: data.data.current_page,
      last_page: data.data.last_page,
      total: data.data.total,
      per_page: data.data.per_page,
    },
    summary: data.summary,
  }
}

export async function suggestExpenseVoucherNo(): Promise<string> {
  const { data } = await apiClient.get<{ success: boolean; suggested_no: string }>(
    '/admin/finance/expenses/suggest-voucher-no'
  )
  return data.suggested_no
}

export async function createExpense(formData: FormData): Promise<ManualExpenseItem> {
  const { data } = await apiClient.post<{ success: boolean; data: ManualExpenseItem }>(
    '/admin/finance/expenses',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  )
  return data.data
}

export async function updateExpense(id: number, formData: FormData): Promise<ManualExpenseItem> {
  // Use POST with _method=PUT for multipart/form-data file uploads in Laravel
  formData.append('_method', 'PUT')
  const { data } = await apiClient.post<{ success: boolean; data: ManualExpenseItem }>(
    `/admin/finance/expenses/${id}`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  )
  return data.data
}

export async function deleteExpense(id: number): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.delete<{ success: boolean; message: string }>(
    `/admin/finance/expenses/${id}`
  )
  return data
}
