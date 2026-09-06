import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '@/api/axios'
import {
  fetchFinanceDashboard,
  fetchFinancePayments,
  fetchFinanceTransactions,
  fetchAllFinanceTransactions,
  fetchFinanceTransactionsLegacy,
  fetchFinanceOrders,
  fetchFinanceInvoices,
  fetchFinanceAccounts,
  createFinanceAccount,
  updateFinanceAccount,
  fetchAccountTransactions,
  addAccountTransaction,
  fetchFinanceAccountsSummary,
  fetchManualPayments,
  createManualPayment,
  fetchManualPayment,
  confirmManualPayment,
  rejectManualPayment,
  cancelManualPayment,
  updateManualPayment,
  downloadManualPaymentProof,
  fetchAllManualPayments,
  fetchManualPaymentStats,
  searchStudents,
  fetchManualPaymentsPage,
  deleteFinanceAccount,
  recalculateAccountBalance,
} from '@/api/financeApi'

vi.mock('@/api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockedApi = vi.mocked(apiClient, true)

beforeEach(() => {
  vi.clearAllMocks()
})

/* ── Dashboard normalization ── */

describe('fetchFinanceDashboard', () => {
  it('passes real payload fields through untouched and sends date params silently', async () => {
    const inner = {
      total_revenue: 1500.5,
      confirmed_revenue: 1200,
      pending_revenue: 300.5,
      failed_count: 2,
      monthly_revenue: [{ month: '2026-01', revenue: 500 }],
      revenue_by_course: [{ course: 'دورة البرمجة للمبتدئين', revenue: 800 }],
      revenue_by_track: [{ track: 'المسار التقني', revenue: 700 }],
      latest_payments: [{ id: 1, amount: 100, student: 'أحمد' }],
    }
    mockedApi.get.mockResolvedValueOnce({ data: { success: true, data: inner } })

    const result = await fetchFinanceDashboard({ from: '2026-01-01', to: '2026-01-31' })

    expect(mockedApi.get).toHaveBeenCalledWith('/finance/dashboard', {
      skipErrorToast: true,
      params: { from: '2026-01-01', to: '2026-01-31' },
    })
    expect(result).toEqual(inner)
  })

  it('normalizes an empty-array dashboard payload to a complete zeroed structure', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { success: true, data: [] } })
    const result = await fetchFinanceDashboard()
    expect(result).toEqual({
      total_revenue: 0,
      confirmed_revenue: 0,
      pending_revenue: 0,
      failed_count: 0,
      monthly_revenue: [],
      revenue_by_course: [],
      revenue_by_track: [],
      latest_payments: [],
    })
  })

  it('coerces non-finite numbers to 0 and non-arrays to [] without crashing', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { success: true, data: { total_revenue: 'ليس رقماً', monthly_revenue: 'خطأ', failed_count: null } },
    })
    const result = await fetchFinanceDashboard()
    expect(result.total_revenue).toBe(0)
    expect(result.failed_count).toBe(0)
    expect(result.monthly_revenue).toEqual([])
  })

  it('propagates request errors', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'))
    await expect(fetchFinanceDashboard()).rejects.toThrow('Network Error')
  })
})

/* ── Payments list ── */

describe('fetchFinancePayments', () => {
  it('unwraps the nested paginator and forwards filters', async () => {
    const rows = [{ id: 9, amount: 250, status: 'confirmed', student_name: 'سارة يوسف' }]
    mockedApi.get.mockResolvedValueOnce({
      data: { success: true, data: { data: rows, total: 40, per_page: 20, current_page: 2 } },
    })
    const result = await fetchFinancePayments({ status: 'confirmed', search: 'سارة' })
    expect(mockedApi.get).toHaveBeenCalledWith('/finance/payments', {
      skipErrorToast: true,
      params: { status: 'confirmed', search: 'سارة' },
    })
    expect(result).toEqual({ data: rows, total: 40, per_page: 20, current_page: 2 })
  })

  it('falls back to safe defaults on a malformed payload', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: null })
    const result = await fetchFinancePayments()
    expect(result).toEqual({ data: [], total: 0, per_page: 50, current_page: 1 })
  })
})

/* ── Transactions page normalization ── */

describe('fetchFinanceTransactions', () => {
  it('normalizes the paginator-with-meta shape and full transaction rows (user included)', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          data: [{
            id: 5,
            type: 'revenue',
            amount: 120.5,
            currency: 'EUR',
            status: 'confirmed',
            description: 'رسوم دورة اللغة الألمانية',
            occurred_at: '2026-02-01T10:00:00Z',
            created_at: '2026-02-01T10:05:00Z',
            payment_id: 77,
            registration_id: 88,
            user: { id: 3, name: 'محمد علي', email: 'mohammad@example.com' },
          }],
          meta: { current_page: 2, last_page: 4, per_page: 10, total: 40 },
        },
      },
    })

    const page = await fetchFinanceTransactions({ page: 2, type: 'revenue' })

    expect(mockedApi.get).toHaveBeenCalledWith('/finance/transactions', {
      skipErrorToast: true,
      params: { page: 2, type: 'revenue' },
    })
    expect(page.meta).toEqual({ current_page: 2, last_page: 4, per_page: 10, total: 40 })
    expect(page.data).toEqual([{
      id: 5,
      type: 'revenue',
      amount: 120.5,
      currency: 'EUR',
      status: 'confirmed',
      description: 'رسوم دورة اللغة الألمانية',
      occurred_at: '2026-02-01T10:00:00Z',
      payment_id: 77,
      registration_id: 88,
      user: { id: 3, name: 'محمد علي', email: 'mohammad@example.com' },
      created_at: '2026-02-01T10:05:00Z',
    }])
  })

  it('reads pagination fields from the block itself when meta is absent', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { success: true, data: { data: [{ id: 1 }], current_page: 3, last_page: 7, per_page: 15, total: 99 } },
    })
    const page = await fetchFinanceTransactions()
    expect(page.meta).toEqual({ current_page: 3, last_page: 7, per_page: 15, total: 99 })
  })

  it('applies defensive defaults for a malformed transaction row (invalid user dropped)', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { success: true, data: { data: [{ user: { id: 'غير صالح' } }], meta: {} } },
    })
    const page = await fetchFinanceTransactions()
    expect(page.data).toEqual([{
      id: 0,
      type: 'revenue',
      amount: 0,
      currency: 'EUR',
      status: 'pending',
      description: null,
      occurred_at: '',
      payment_id: null,
      registration_id: null,
      user: null,
      created_at: '',
    }])
    expect(page.meta).toEqual({ current_page: 1, last_page: 1, per_page: 30, total: 1 })
  })

  it('handles the bare-list shape via asList (per_page mirrors list length)', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { success: true, data: [{ id: 8, type: 'expense', amount: 50, created_at: '2026-03-01' }] },
    })
    const page = await fetchFinanceTransactions()
    expect(page.data[0].id).toBe(8)
    expect(page.data[0].occurred_at).toBe('2026-03-01') // falls back to created_at
    expect(page.meta).toEqual({ current_page: 1, last_page: 1, per_page: 1, total: 1 })
  })

  it('returns an empty page (per_page 30) for a null payload', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: null })
    const page = await fetchFinanceTransactions()
    expect(page).toEqual({ data: [], meta: { current_page: 1, last_page: 1, per_page: 30, total: 0 } })
  })
})

describe('fetchAllFinanceTransactions', () => {
  function txPage(id: number, lastPage: number) {
    return { data: { success: true, data: { data: [{ id }], meta: { current_page: 1, last_page: lastPage, per_page: 1, total: lastPage } } } }
  }

  it('short-circuits after one request when last_page is 1', async () => {
    mockedApi.get.mockResolvedValueOnce(txPage(1, 1))
    const items = await fetchAllFinanceTransactions()
    expect(items.map((t) => t.id)).toEqual([1])
    expect(mockedApi.get).toHaveBeenCalledTimes(1)
  })

  it('fetches remaining pages in parallel and concatenates in page order', async () => {
    mockedApi.get
      .mockResolvedValueOnce(txPage(1, 3))
      .mockResolvedValueOnce(txPage(2, 3))
      .mockResolvedValueOnce(txPage(3, 3))
    const items = await fetchAllFinanceTransactions({ status: 'confirmed' })
    expect(items.map((t) => t.id)).toEqual([1, 2, 3])
    expect(mockedApi.get).toHaveBeenCalledTimes(3)
    expect(mockedApi.get).toHaveBeenNthCalledWith(1, '/finance/transactions', {
      skipErrorToast: true, params: { status: 'confirmed', page: 1 },
    })
    expect(mockedApi.get).toHaveBeenNthCalledWith(3, '/finance/transactions', {
      skipErrorToast: true, params: { status: 'confirmed', page: 3 },
    })
  })
})

describe('fetchFinanceTransactionsLegacy (credit/debit mapping)', () => {
  it('maps revenue→credit, refund→refunded debit, unknown status→pending, null description→Arabic fallback label', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          data: [
            { id: 1, type: 'revenue', amount: 100, status: 'confirmed', description: 'دفعة تسجيل', occurred_at: '2026-01-05' },
            { id: 2, type: 'refund', amount: 40, status: 'confirmed', occurred_at: '2026-01-06' },
            { id: 3, type: 'expense', amount: 25, status: 'weird-status', created_at: '2026-01-07' },
          ],
          meta: { current_page: 1, last_page: 1, per_page: 30, total: 3 },
        },
      },
    })

    const rows = await fetchFinanceTransactionsLegacy()

    expect(rows).toEqual([
      { id: 1, label: 'دفعة تسجيل', amount: 100, type: 'credit', status: 'confirmed', provider: 'unknown', created_at: '2026-01-05' },
      { id: 2, label: 'معاملة #2', amount: 40, type: 'debit', status: 'refunded', provider: 'unknown', created_at: '2026-01-06' },
      { id: 3, label: 'معاملة #3', amount: 25, type: 'debit', status: 'pending', provider: 'unknown', created_at: '2026-01-07' },
    ])
  })
})

/* ── Orders & invoices ── */

describe('fetchFinanceOrders', () => {
  it('supports the bare-array shape (total = length)', async () => {
    const orders = [{ id: 1, total: 99 }, { id: 2, total: 45 }]
    mockedApi.get.mockResolvedValueOnce({ data: { data: orders } })
    const result = await fetchFinanceOrders({ status: 'paid' })
    expect(mockedApi.get).toHaveBeenCalledWith('/finance/orders', { skipErrorToast: true, params: { status: 'paid' } })
    expect(result).toEqual({ data: orders, total: 2, per_page: 50, current_page: 1 })
  })

  it('supports the paginator shape', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { data: { data: [{ id: 3 }], total: 12, per_page: 10, current_page: 2 } },
    })
    const result = await fetchFinanceOrders()
    expect(result).toEqual({ data: [{ id: 3 }], total: 12, per_page: 10, current_page: 2 })
  })

  it('returns defaults for a malformed payload', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: null })
    const result = await fetchFinanceOrders()
    expect(result).toEqual({ data: [], total: 0, per_page: 50, current_page: 1 })
  })
})

describe('fetchFinanceInvoices', () => {
  it('uses meta totals when data is an array', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { data: [{ id: 1, number: 'INV-001' }], meta: { total: 30, current_page: 3 } },
    })
    const result = await fetchFinanceInvoices({ page: 3 })
    expect(mockedApi.get).toHaveBeenCalledWith('/finance/invoices', { skipErrorToast: true, params: { page: 3 } })
    expect(result).toEqual({ data: [{ id: 1, number: 'INV-001' }], total: 30, per_page: 50, current_page: 3 })
  })

  it('falls back to length/1 without meta, and to empty on non-array data', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [{ id: 1 }] } })
    expect(await fetchFinanceInvoices()).toEqual({ data: [{ id: 1 }], total: 1, per_page: 50, current_page: 1 })

    mockedApi.get.mockResolvedValueOnce({ data: { data: { not: 'array' } } })
    expect(await fetchFinanceInvoices()).toEqual({ data: [], total: 0, per_page: 50, current_page: 1 })
  })
})

/* ── Accounts ── */

describe('finance accounts', () => {
  it('fetchFinanceAccounts unwraps the list and tolerates malformed payloads', async () => {
    const accounts = [{ id: 1, name: 'الحساب الرئيسي', currency: 'EUR' }]
    mockedApi.get.mockResolvedValueOnce({ data: { data: accounts } })
    expect(await fetchFinanceAccounts()).toEqual(accounts)
    expect(mockedApi.get).toHaveBeenCalledWith('/finance/accounts', { skipErrorToast: true })

    mockedApi.get.mockResolvedValueOnce({ data: { data: 'ليست مصفوفة' } })
    expect(await fetchFinanceAccounts()).toEqual([])
  })

  it('fetchFinanceAccounts propagates errors', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('403'))
    await expect(fetchFinanceAccounts()).rejects.toThrow('403')
  })

  it('createFinanceAccount posts the payload and unwraps data', async () => {
    const payload = { name: 'صندوق نقدي', type: 'cash', currency: 'EUR', opening_balance: 500 }
    mockedApi.post.mockResolvedValueOnce({ data: { data: { id: 4, ...payload } } })
    const account = await createFinanceAccount(payload)
    expect(mockedApi.post).toHaveBeenCalledWith('/finance/accounts', payload)
    expect(account).toEqual({ id: 4, ...payload })
  })

  it('updateFinanceAccount patches the account', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: { data: { id: 4, name: 'اسم جديد' } } })
    const account = await updateFinanceAccount(4, { name: 'اسم جديد' })
    expect(mockedApi.patch).toHaveBeenCalledWith('/finance/accounts/4', { name: 'اسم جديد' })
    expect(account).toEqual({ id: 4, name: 'اسم جديد' })
  })

  it('fetchAccountTransactions unwraps the nested paginator and defaults to []', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { data: [{ id: 10, amount: 20 }] } } })
    expect(await fetchAccountTransactions(4, { from: '2026-01-01' })).toEqual([{ id: 10, amount: 20 }])
    expect(mockedApi.get).toHaveBeenCalledWith('/finance/accounts/4/transactions', {
      skipErrorToast: true, params: { from: '2026-01-01' },
    })

    mockedApi.get.mockResolvedValueOnce({ data: {} })
    expect(await fetchAccountTransactions(4)).toEqual([])
  })

  it('addAccountTransaction posts to the account transactions endpoint', async () => {
    const payload = { type: 'expense', amount: 75, transaction_date: '2026-02-10', description: 'إيجار القاعة' }
    mockedApi.post.mockResolvedValueOnce({ data: { data: { id: 4, balance: 425 } } })
    const account = await addAccountTransaction(4, payload)
    expect(mockedApi.post).toHaveBeenCalledWith('/finance/accounts/4/transactions', payload)
    expect(account).toEqual({ id: 4, balance: 425 })
  })

  it('fetchFinanceAccountsSummary returns defaults on malformed payload', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { accounts: [{ id: 1 }], total_cash: 900 } } })
    expect(await fetchFinanceAccountsSummary()).toEqual({ accounts: [{ id: 1 }], total_cash: 900 })
    expect(mockedApi.get).toHaveBeenCalledWith('/finance/accounts-summary', { skipErrorToast: true })

    mockedApi.get.mockResolvedValueOnce({ data: null })
    expect(await fetchFinanceAccountsSummary()).toEqual({ accounts: [], total_cash: 0 })
  })

  it('deleteFinanceAccount calls DELETE, recalculateAccountBalance posts and unwraps', async () => {
    mockedApi.delete.mockResolvedValueOnce({ data: {} })
    await deleteFinanceAccount(9)
    expect(mockedApi.delete).toHaveBeenCalledWith('/finance/accounts/9')

    mockedApi.post.mockResolvedValueOnce({ data: { data: { id: 9, balance: 1000 } } })
    expect(await recalculateAccountBalance(9)).toEqual({ id: 9, balance: 1000 })
    expect(mockedApi.post).toHaveBeenCalledWith('/finance/accounts/9/recalculate')
  })
})

/* ── Manual payments ── */

describe('manual payments', () => {
  it('fetchManualPayments unwraps the paginator with default per_page 30', async () => {
    const rows = [{ id: 1, amount: 60, student_name: 'ليلى حسن' }]
    mockedApi.get.mockResolvedValueOnce({ data: { data: { data: rows, total: 1, per_page: 30, current_page: 1 } } })
    const result = await fetchManualPayments({ status: 'pending_review' })
    expect(mockedApi.get).toHaveBeenCalledWith('/finance/manual-payments', {
      skipErrorToast: true, params: { status: 'pending_review' },
    })
    expect(result).toEqual({ data: rows, total: 1, per_page: 30, current_page: 1 })
  })

  it('fetchManualPayments falls back safely on malformed payload', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: null })
    expect(await fetchManualPayments()).toEqual({ data: [], total: 0, per_page: 30, current_page: 1 })
  })

  it('fetchManualPaymentsPage includes last_page (default 1)', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { data: { data: [{ id: 2 }], total: 90, per_page: 30, current_page: 2, last_page: 3 } },
    })
    expect(await fetchManualPaymentsPage({ page: 2 })).toEqual({
      data: [{ id: 2 }], total: 90, per_page: 30, current_page: 2, last_page: 3,
    })

    mockedApi.get.mockResolvedValueOnce({ data: {} })
    expect(await fetchManualPaymentsPage()).toEqual({ data: [], total: 0, per_page: 30, current_page: 1, last_page: 1 })
  })

  it('createManualPayment / fetchManualPayment / updateManualPayment unwrap the envelope', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: { id: 5, amount: 200 } } })
    expect(await createManualPayment({ amount: 200, currency: 'EUR' })).toEqual({ id: 5, amount: 200 })
    expect(mockedApi.post).toHaveBeenCalledWith('/finance/manual-payments', { amount: 200, currency: 'EUR' })

    mockedApi.get.mockResolvedValueOnce({ data: { data: { id: 5, amount: 200 } } })
    expect(await fetchManualPayment(5)).toEqual({ id: 5, amount: 200 })
    expect(mockedApi.get).toHaveBeenCalledWith('/finance/manual-payments/5')

    mockedApi.patch.mockResolvedValueOnce({ data: { data: { id: 5, amount: 250 } } })
    expect(await updateManualPayment(5, { amount: 250 })).toEqual({ id: 5, amount: 250 })
    expect(mockedApi.patch).toHaveBeenCalledWith('/finance/manual-payments/5', { amount: 250 })
  })

  it('createManualPayment propagates errors', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('422'))
    await expect(createManualPayment({ amount: 0 })).rejects.toThrow('422')
  })

  it('confirm / reject / cancel hit the lifecycle endpoints', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { message: 'تم تأكيد الدفعة بنجاح' } })
    expect(await confirmManualPayment(7)).toEqual({ message: 'تم تأكيد الدفعة بنجاح' })
    expect(mockedApi.post).toHaveBeenCalledWith('/finance/manual-payments/7/confirm')

    mockedApi.post.mockResolvedValueOnce({ data: {} })
    await rejectManualPayment(7, 'إيصال غير واضح')
    expect(mockedApi.post).toHaveBeenCalledWith('/finance/manual-payments/7/reject', { reason: 'إيصال غير واضح' })

    mockedApi.post.mockResolvedValueOnce({ data: {} })
    await cancelManualPayment(7)
    expect(mockedApi.post).toHaveBeenCalledWith('/finance/manual-payments/7/cancel')
  })

  it('downloadManualPaymentProof extracts the filename from Content-Disposition (quoted and bare)', async () => {
    const blob = new Blob(['proof-bytes'])
    mockedApi.get.mockResolvedValueOnce({
      data: blob,
      headers: { 'content-disposition': 'attachment; filename="receipt-2026.pdf"' },
    })
    const quoted = await downloadManualPaymentProof(3)
    expect(mockedApi.get).toHaveBeenCalledWith('/finance/manual-payments/3/proof', {
      responseType: 'blob', skipErrorToast: true,
    })
    expect(quoted).toEqual({ blob, filename: 'receipt-2026.pdf' })

    mockedApi.get.mockResolvedValueOnce({
      data: blob,
      headers: { 'Content-Disposition': 'attachment; filename=proof.jpg' },
    })
    expect((await downloadManualPaymentProof(3)).filename).toBe('proof.jpg')
  })

  it('downloadManualPaymentProof falls back to a default filename when the header is missing', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: new Blob(['x']) })
    expect((await downloadManualPaymentProof(12)).filename).toBe('manual-payment-12-proof')
  })

  it('fetchAllManualPayments walks pages using total/per_page', async () => {
    mockedApi.get
      .mockResolvedValueOnce({ data: { data: { data: [{ id: 1 }, { id: 2 }], total: 3, per_page: 2, current_page: 1 } } })
      .mockResolvedValueOnce({ data: { data: { data: [{ id: 3 }], total: 3, per_page: 2, current_page: 2 } } })
    const all = await fetchAllManualPayments({ status: 'confirmed' })
    expect(all.map((p) => (p as { id: number }).id)).toEqual([1, 2, 3])
    expect(mockedApi.get).toHaveBeenCalledTimes(2)
    expect(mockedApi.get).toHaveBeenNthCalledWith(1, '/finance/manual-payments', {
      skipErrorToast: true, params: { status: 'confirmed', page: 1 },
    })
    expect(mockedApi.get).toHaveBeenNthCalledWith(2, '/finance/manual-payments', {
      skipErrorToast: true, params: { status: 'confirmed', page: 2 },
    })
  })

  it('fetchAllManualPayments stops on an empty page even if total claims more', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { data: [], total: 100, per_page: 30, current_page: 1 } } })
    expect(await fetchAllManualPayments()).toEqual([])
    expect(mockedApi.get).toHaveBeenCalledTimes(1)
  })

  it('fetchManualPaymentStats returns zeroed stats when the payload has no data', async () => {
    const stats = { pending_review: 4, confirmed_this_month: 10, confirmed_total: 55, rejected: 1, avg_payment: 84.5 }
    mockedApi.get.mockResolvedValueOnce({ data: { data: stats } })
    expect(await fetchManualPaymentStats()).toEqual(stats)
    expect(mockedApi.get).toHaveBeenCalledWith('/finance/manual-payments/stats', { skipErrorToast: true })

    mockedApi.get.mockResolvedValueOnce({ data: {} })
    expect(await fetchManualPaymentStats()).toEqual({
      pending_review: 0, confirmed_this_month: 0, confirmed_total: 0, rejected: 0, avg_payment: 0,
    })
  })
})

/* ── Student search ── */

describe('searchStudents', () => {
  it('short-circuits without any request for queries under 2 characters', async () => {
    expect(await searchStudents('م')).toEqual([])
    expect(mockedApi.get).not.toHaveBeenCalled()
  })

  it('searches with the query param and unwraps results', async () => {
    const results = [{
      id: 1, student_id: 'STU-001', name: 'مريم خالد', email: 'mariam@example.com',
      phone: null, avatar: null, status: 'active',
    }]
    mockedApi.get.mockResolvedValueOnce({ data: { data: results } })
    expect(await searchStudents('مريم')).toEqual(results)
    expect(mockedApi.get).toHaveBeenCalledWith('/finance/students/search', {
      params: { q: 'مريم' }, skipErrorToast: true,
    })
  })

  it('returns [] on a malformed payload', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: 'خطأ' } })
    expect(await searchStudents('مريم')).toEqual([])
  })
})
