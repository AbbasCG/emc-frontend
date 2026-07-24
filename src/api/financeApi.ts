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
  FinanceTransactionsPage,
  FinancialTransaction,
  ManualPayment,
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
  status?: string
  type?: string
  page?: number
}): Promise<FinanceTransactionsPage> {
  const res = await apiClient.get<unknown>('/finance/transactions', { ...silent, params })
  return normalizeFinanceTransactionsPage(res.data)
}

/** Fetches every page for analytics/export (respects API date/type/status filters). */
export async function fetchAllFinanceTransactions(params?: {
  from?: string
  to?: string
  status?: string
  type?: string
}): Promise<FinancialTransaction[]> {
  const first = await fetchFinanceTransactions({ ...params, page: 1 })
  const items = [...first.data]
  const lastPage = first.meta.last_page ?? 1
  if (lastPage <= 1) return items

  const rest = await Promise.all(
    Array.from({ length: lastPage - 1 }, (_, i) =>
      fetchFinanceTransactions({ ...params, page: i + 2 }),
    ),
  )
  for (const page of rest) items.push(...page.data)
  return items
}

/** Legacy list shape for finance command center (credit/debit mapping). */
export async function fetchFinanceTransactionsLegacy(params?: {
  from?: string
  to?: string
}): Promise<FinanceTransactionRow[]> {
  const items = await fetchAllFinanceTransactions(params)
  return items.map(toLegacyFinanceTransactionRow)
}

function normalizeFinanceTransactionsPage(payload: unknown): FinanceTransactionsPage {
  const root = payload as { success?: boolean; data?: unknown }
  const inner = root?.data
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    const block = inner as {
      data?: unknown[]
      meta?: Partial<FinanceTransactionsPage['meta']>
      current_page?: number
      last_page?: number
      per_page?: number
      total?: number
    }
    const rows = Array.isArray(block.data) ? block.data.map(normalizeFinancialTransaction) : []
    const meta = block.meta ?? block
    return {
      data: rows,
      meta: {
        current_page: Number(meta.current_page) || 1,
        last_page: Number(meta.last_page) || 1,
        per_page: Number(meta.per_page) || 30,
        total: Number(meta.total) || rows.length,
      },
    }
  }
  const list = asList<unknown>(payload).map(normalizeFinancialTransaction)
  return {
    data: list,
    meta: { current_page: 1, last_page: 1, per_page: list.length || 30, total: list.length },
  }
}

function normalizeFinancialTransaction(raw: unknown): FinancialTransaction {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const userRaw = o.user
  let user: FinancialTransaction['user'] = null
  if (userRaw && typeof userRaw === 'object' && !Array.isArray(userRaw)) {
    const u = userRaw as Record<string, unknown>
    const id = Number(u.id)
    if (Number.isFinite(id) && id > 0) {
      user = {
        id,
        name: String(u.name ?? ''),
        email: String(u.email ?? ''),
      }
    }
  }
  return {
    id: Number(o.id) || 0,
    type: String(o.type ?? 'revenue'),
    amount: Number(o.amount) || 0,
    currency: String(o.currency ?? 'EUR'),
    status: String(o.status ?? 'pending'),
    description: o.description != null ? String(o.description) : null,
    occurred_at: String(o.occurred_at ?? o.created_at ?? ''),
    payment_id: o.payment_id != null ? Number(o.payment_id) : null,
    registration_id: o.registration_id != null ? Number(o.registration_id) : null,
    user,
    created_at: String(o.created_at ?? o.occurred_at ?? ''),
  }
}

function toLegacyFinanceTransactionRow(t: FinancialTransaction): FinanceTransactionRow {
  const isCredit = t.type === 'revenue'
  const status =
    t.type === 'refund' ? 'refunded'
    : (['confirmed', 'pending', 'failed'].includes(t.status) ? t.status : 'pending') as FinanceTransactionRow['status']
  return {
    id: t.id,
    label: t.description ?? `معاملة #${t.id}`,
    amount: t.amount,
    type: isCredit ? 'credit' : 'debit',
    status,
    provider: 'unknown',
    created_at: t.occurred_at || t.created_at,
  }
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

// ── Manual Payments ──────────────────────────────────────────────────────────

export async function fetchManualPayments(params?: {
  status?: string
  student_id?: number
  finance_account_id?: number
  currency?: string
  payment_method?: string
  date_from?: string
  date_to?: string
  external_reference?: string
  search?: string
  page?: number
}): Promise<{ data: ManualPayment[]; total: number; per_page: number; current_page: number }> {
  const res = await apiClient.get<unknown>('/finance/manual-payments', { ...silent, params })
  const d = res.data as { data?: { data?: unknown[]; total?: number; per_page?: number; current_page?: number } }
  const inner = d?.data ?? {}
  return {
    data: Array.isArray((inner as { data?: unknown[] }).data) ? (inner as { data: ManualPayment[] }).data : [],
    total: (inner as { total?: number }).total ?? 0,
    per_page: (inner as { per_page?: number }).per_page ?? 30,
    current_page: (inner as { current_page?: number }).current_page ?? 1,
  }
}

export async function createManualPayment(payload: FormData | Record<string, unknown>): Promise<ManualPayment> {
  const res = await apiClient.post<unknown>('/finance/manual-payments', payload)
  const d = res.data as { data?: ManualPayment }
  return d.data!
}

export async function fetchManualPayment(id: number): Promise<ManualPayment> {
  const res = await apiClient.get<unknown>(`/finance/manual-payments/${id}`)
  const d = res.data as { data?: ManualPayment }
  return d.data!
}

export async function confirmManualPayment(id: number): Promise<{ message: string }> {
  const res = await apiClient.post<unknown>(`/finance/manual-payments/${id}/confirm`)
  return res.data as { message: string }
}

export async function rejectManualPayment(id: number, reason?: string): Promise<void> {
  await apiClient.post(`/finance/manual-payments/${id}/reject`, { reason })
}

export async function cancelManualPayment(id: number): Promise<void> {
  await apiClient.post(`/finance/manual-payments/${id}/cancel`)
}

export async function updateManualPayment(
  id: number,
  payload: FormData | Record<string, unknown>,
): Promise<ManualPayment> {
  const res = await apiClient.patch<unknown>(`/finance/manual-payments/${id}`, payload)
  const d = res.data as { data?: ManualPayment }
  return d.data!
}

export async function downloadManualPaymentProof(id: number): Promise<{ blob: Blob; filename: string }> {
  const res = await apiClient.get<Blob>(`/finance/manual-payments/${id}/proof`, {
    responseType: 'blob',
    skipErrorToast: true,
  } as Record<string, unknown>)
  const blob = res.data
  const cd = (res.headers?.['content-disposition'] ?? res.headers?.['Content-Disposition']) as string | undefined
  let filename = `manual-payment-${id}-proof`
  if (cd) {
    const m = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i.exec(cd)
    if (m?.[1]) filename = m[1].replace(/['"]/g, '')
  }
  return { blob, filename }
}

export async function fetchAllManualPayments(
  params?: Omit<Parameters<typeof fetchManualPayments>[0], 'page'>,
): Promise<ManualPayment[]> {
  const all: ManualPayment[] = []
  let page = 1
  let lastPage: number
  do {
    const res = await fetchManualPayments({ ...params, page })
    all.push(...res.data)
    lastPage = Math.max(1, Math.ceil(res.total / (res.per_page || 30)))
    if (res.data.length === 0) break
    page += 1
  } while (page <= lastPage)
  return all
}

export type ManualPaymentStats = {
  pending_review: number
  confirmed_this_month: number
  confirmed_total: number
  rejected: number
  avg_payment: number
}

export async function fetchManualPaymentStats(): Promise<ManualPaymentStats> {
  const res = await apiClient.get<unknown>('/finance/manual-payments/stats', silent)
  const d = res.data as { data?: ManualPaymentStats }
  return d.data ?? { pending_review: 0, confirmed_this_month: 0, confirmed_total: 0, rejected: 0, avg_payment: 0 }
}

export type StudentSearchResult = {
  id: number
  student_id: string
  name: string
  email: string
  phone: string | null
  avatar: string | null
  status: string
}

export async function searchStudents(q: string): Promise<StudentSearchResult[]> {
  if (q.length < 2) return []
  const res = await apiClient.get<unknown>('/finance/students/search', { params: { q }, skipErrorToast: true })
  const d = res.data as { data?: StudentSearchResult[] }
  return Array.isArray(d?.data) ? d.data : []
}

export async function fetchManualPaymentsPage(params?: {
  status?: string
  search?: string
  date_from?: string
  date_to?: string
  finance_account_id?: number
  payment_method?: string
  currency?: string
  page?: number
}): Promise<{ data: ManualPayment[]; total: number; per_page: number; current_page: number; last_page: number }> {
  const res = await apiClient.get<unknown>('/finance/manual-payments', { ...silent, params })
  const d = res.data as { data?: { data?: unknown[]; total?: number; per_page?: number; current_page?: number; last_page?: number } }
  const inner = d?.data ?? {}
  return {
    data: Array.isArray((inner as { data?: unknown[] }).data) ? (inner as { data: ManualPayment[] }).data : [],
    total: (inner as { total?: number }).total ?? 0,
    per_page: (inner as { per_page?: number }).per_page ?? 30,
    current_page: (inner as { current_page?: number }).current_page ?? 1,
    last_page: (inner as { last_page?: number }).last_page ?? 1,
  }
}

export async function deleteFinanceAccount(id: number): Promise<void> {
  await apiClient.delete(`/finance/accounts/${id}`)
}

export async function recalculateAccountBalance(id: number): Promise<FinanceAccount> {
  const res = await apiClient.post<unknown>(`/finance/accounts/${id}/recalculate`)
  const d = res.data as { data?: FinanceAccount }
  return d.data!
}
