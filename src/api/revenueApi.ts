import apiClient from './axios'
import type { ChartOfAccountItem } from './chartOfAccountsApi'
import type { FinancePagination } from './expenseApi'

export interface ManualRevenueItem {
  id: number
  receipt_no: string
  date: string
  revenue_account_id: number
  deposit_account_id: number
  amount: number | string
  currency: string
  payer_name: string
  program_id?: number | null
  program_name?: string | null
  description: string
  /** The file itself is private — fetch it through voucherAttachmentApi. */
  has_attachment: boolean
  attachment_name?: string | null
  status: 'posted' | 'draft' | 'cancelled'
  created_by?: number | null
  updated_by?: number | null
  created_at?: string
  updated_at?: string
  revenue_account?: ChartOfAccountItem
  deposit_account?: ChartOfAccountItem
  program?: { id: number; title_ar?: string; title?: string; name?: string } | null
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

export interface RevenuesSummary {
  total_amount: number
  total_count: number
  by_category: Array<{ category_name: string; category_code: string; currency: string; total: number | string }>
  by_currency: Array<{ currency: string; total: number | string; count: number }>
}

export interface RevenuesResponse {
  success: boolean
  data: {
    data: ManualRevenueItem[]
    current_page: number
    last_page: number
    total: number
    per_page: number
  }
  summary: RevenuesSummary
}

export async function fetchRevenuesList(params?: {
  search?: string
  date_from?: string
  date_to?: string
  status?: string
  revenue_account_id?: number
  deposit_account_id?: number
  program_id?: number
  page?: number
  per_page?: number
}): Promise<{ items: ManualRevenueItem[]; pagination: FinancePagination; summary: RevenuesSummary }> {
  const { data } = await apiClient.get<RevenuesResponse>('/admin/finance/revenues', { params })
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

export async function suggestRevenueReceiptNo(): Promise<string> {
  const { data } = await apiClient.get<{ success: boolean; suggested_no: string }>(
    '/admin/finance/revenues/suggest-receipt-no'
  )
  return data.suggested_no
}

export async function createRevenue(formData: FormData): Promise<ManualRevenueItem> {
  const { data } = await apiClient.post<{ success: boolean; data: ManualRevenueItem }>(
    '/admin/finance/revenues',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  )
  return data.data
}

export async function updateRevenue(id: number, formData: FormData): Promise<ManualRevenueItem> {
  formData.append('_method', 'PUT')
  const { data } = await apiClient.post<{ success: boolean; data: ManualRevenueItem }>(
    `/admin/finance/revenues/${id}`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  )
  return data.data
}

export async function deleteRevenue(id: number): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.delete<{ success: boolean; message: string }>(
    `/admin/finance/revenues/${id}`
  )
  return data
}

// ── Course Revenue Helpers ─────────────────────────────────────────────────────

export interface PaidCourse {
  id: number
  title: string
  price: number
  currency: string
  status: string
}

export interface CoursePendingStudent {
  registration_id: number
  user_id: number | null
  full_name: string
  email: string
  phone: string
  course_price: number
  currency: string
  status: string
}

export interface CashboxBalance {
  total_revenues: number
  total_expenses: number
  balance: number
}

export async function fetchPaidCourses(): Promise<PaidCourse[]> {
  const { data } = await apiClient.get<{ success: boolean; data: PaidCourse[] }>(
    '/admin/finance/revenues/paid-courses'
  )
  return data.data
}

export async function fetchCourseStudentsPendingPayment(courseId: number): Promise<{
  course: PaidCourse
  students: CoursePendingStudent[]
}> {
  const { data } = await apiClient.get<{
    success: boolean
    course: PaidCourse
    data: CoursePendingStudent[]
  }>(`/admin/finance/revenues/course-students/${courseId}`)
  return { course: data.course, students: data.data }
}

export async function fetchCashboxBalance(): Promise<CashboxBalance> {
  const { data } = await apiClient.get<{ success: boolean } & CashboxBalance>(
    '/admin/finance/revenues/cashbox-balance'
  )
  return {
    total_revenues: data.total_revenues,
    total_expenses: data.total_expenses,
    balance: data.balance,
  }
}
