import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import ExpenseManagementPage from '@/pages/finance/ExpenseManagementPage'
import RevenueManagementPage from '@/pages/finance/RevenueManagementPage'
import { getSidebarByRole } from '@/layouts/dashboardSidebar'
import { filterSidebarGroupsByAccess } from '@/utils/sidebarAccessFilter'
import { formatMoney } from '@/utils/financeFormatters'
import type { EffectivePageAccessRow } from '@/api/accessControlApi'

/**
 * Expense / revenue voucher screens:
 *   - render their lists with currency-aware amounts (YER included);
 *   - open attachments only through the protected endpoint — no public URL is
 *     ever rendered;
 *   - offer edit / delete only on drafts (posted vouchers are immutable);
 *   - appear in the sidebar only when EffectivePageAccess allows them.
 */

const mockGet = vi.fn()
vi.mock('@/api/axios', () => ({ default: { get: (...a: unknown[]) => mockGet(...a) } }))
vi.mock('@/lib/toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/api/chartOfAccountsApi', () => ({ fetchAccountsList: () => Promise.resolve([]) }))

const mockOpen = vi.fn()
vi.mock('@/api/voucherAttachmentApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/voucherAttachmentApi')>()
  return { ...actual, openVoucherAttachment: (...a: unknown[]) => mockOpen(...a) }
})

const mockExpenses = vi.fn()
vi.mock('@/api/expenseApi', () => ({
  fetchExpensesList: () => mockExpenses(),
  suggestExpenseVoucherNo: () => Promise.resolve('PV-2026-0003'),
  createExpense: vi.fn(),
  updateExpense: vi.fn(),
  deleteExpense: vi.fn(),
}))

const mockRevenues = vi.fn()
vi.mock('@/api/revenueApi', () => ({
  fetchRevenuesList: () => mockRevenues(),
  suggestRevenueReceiptNo: () => Promise.resolve('RV-2026-0002'),
  createRevenue: vi.fn(),
  updateRevenue: vi.fn(),
  deleteRevenue: vi.fn(),
}))

const expense = (over: Record<string, unknown> = {}) => ({
  id: 5, voucher_no: 'PV-2026-0001', date: '2026-10-01', expense_account_id: 1, payment_account_id: 2,
  amount: '15000.00', currency: 'YER', description: 'إيجار القاعة', status: 'posted',
  has_attachment: true, attachment_name: 'invoice.pdf', ...over,
})

const revenue = (over: Record<string, unknown> = {}) => ({
  id: 9, receipt_no: 'RV-2026-0001', date: '2026-10-02', revenue_account_id: 3, deposit_account_id: 4,
  amount: '250.00', currency: 'USD', payer_name: 'جهة داعمة', description: 'رسوم دورة', status: 'draft',
  has_attachment: true, attachment_name: 'receipt.png', ...over,
})

const page = (items: unknown[], byCurrency: unknown[]) => ({
  items,
  pagination: { current_page: 1, last_page: 1, total: items.length, per_page: 20 },
  summary: { total_amount: 0, total_count: items.length, by_category: [], by_currency: byCurrency },
})

function renderIn(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGet.mockResolvedValue({ data: { data: [] } })
  mockOpen.mockResolvedValue(undefined)
  mockExpenses.mockResolvedValue(page(
    [expense(), expense({ id: 6, voucher_no: 'PV-2026-0002', status: 'draft', has_attachment: false, currency: 'USD', amount: '40.00' })],
    [{ currency: 'USD', total: '40.00', count: 1 }, { currency: 'YER', total: '15000.00', count: 1 }],
  ))
  mockRevenues.mockResolvedValue(page([revenue()], [{ currency: 'USD', total: '250.00', count: 1 }]))
})

describe('ExpenseManagementPage', () => {
  it('renders the voucher list with YER amounts and per-currency totals', async () => {
    const { container } = renderIn(<ExpenseManagementPage />)
    const row = (await screen.findByText('PV-2026-0001')).closest('tr') as HTMLElement

    expect(within(row).getByText(formatMoney('15000.00', 'YER'))).toBeInTheDocument()
    expect(screen.getAllByText(formatMoney('15000.00', 'YER')).length).toBeGreaterThan(1) // row + summary
    expect(screen.getAllByText(formatMoney('40.00', 'USD')).length).toBeGreaterThan(0)
    expect(container.textContent).not.toContain('$15,000')
  })

  it('opens the attachment through the protected endpoint and never renders a public URL', async () => {
    const { container } = renderIn(<ExpenseManagementPage />)
    await screen.findByText('PV-2026-0001')

    expect(container.querySelector('a[href*="/storage/"]')).toBeNull()
    expect(screen.getAllByRole('button', { name: /عرض مرفق سند الصرف/ })).toHaveLength(1) // only the voucher that has one

    await userEvent.click(screen.getByRole('button', { name: 'عرض مرفق سند الصرف PV-2026-0001' }))
    await waitFor(() => expect(mockOpen).toHaveBeenCalledWith('expenses', 5, 'preview', 'invoice.pdf'))
  })

  it('offers edit and delete on drafts only', async () => {
    renderIn(<ExpenseManagementPage />)
    const posted = (await screen.findByText('PV-2026-0001')).closest('tr') as HTMLElement
    const draft = screen.getByText('PV-2026-0002').closest('tr') as HTMLElement

    expect(within(posted).queryByTitle('تعديل السند')).not.toBeInTheDocument()
    expect(within(posted).queryByTitle('حذف المسودة')).not.toBeInTheDocument()
    expect(within(draft).getByTitle('تعديل السند')).toBeInTheDocument()
    expect(within(draft).getByTitle('حذف المسودة')).toBeInTheDocument()
  })
})

describe('RevenueManagementPage', () => {
  it('renders the receipt list, its draft status and the protected attachment action', async () => {
    const { container } = renderIn(<RevenueManagementPage />)
    const row = (await screen.findByText('RV-2026-0001')).closest('tr') as HTMLElement

    expect(within(row).getByText('مسودة')).toBeInTheDocument()
    expect(within(row).getByText(new RegExp(formatMoney('250.00', 'USD').replace(/[$.]/g, '\\$&')))).toBeInTheDocument()
    expect(container.querySelector('a[href*="/storage/"]')).toBeNull()

    await userEvent.click(within(row).getByRole('button', { name: 'عرض مرفق سند القبض RV-2026-0001' }))
    await waitFor(() => expect(mockOpen).toHaveBeenCalledWith('revenues', 9, 'preview', 'receipt.png'))
  })
})

describe('voucherAttachmentApi', () => {
  it('fetches the file as a blob from the authenticated endpoint', async () => {
    const { fetchVoucherAttachment } = await vi.importActual<typeof import('@/api/voucherAttachmentApi')>('@/api/voucherAttachmentApi')
    mockGet.mockResolvedValue({ data: new Blob(['%PDF'], { type: 'application/pdf' }), headers: { 'content-type': 'application/pdf' } })

    const { mime } = await fetchVoucherAttachment('expenses', 5, 'download')
    expect(mime).toBe('application/pdf')
    expect(mockGet).toHaveBeenCalledWith('/admin/finance/expenses/5/attachment', expect.objectContaining({ responseType: 'blob' }))

    await fetchVoucherAttachment('revenues', 9, 'preview')
    expect(mockGet).toHaveBeenLastCalledWith('/admin/finance/revenues/9/attachment/preview', expect.objectContaining({ responseType: 'blob' }))
  })

  it('surfaces the server message when the file is refused', async () => {
    const { fetchVoucherAttachment } = await vi.importActual<typeof import('@/api/voucherAttachmentApi')>('@/api/voucherAttachmentApi')
    const body = new Blob([JSON.stringify({ message: 'لا يوجد مرفق لهذا السند.' })], { type: 'application/json' })
    mockGet.mockResolvedValue({ data: body, headers: { 'content-type': 'application/json' } })

    await expect(fetchVoucherAttachment('expenses', 5, 'download')).rejects.toThrow('لا يوجد مرفق لهذا السند.')
  })
})

describe('YER formatting', () => {
  it('uses the Yemeni rial symbol with finance digit rules', () => {
    expect(formatMoney(15000, 'YER')).toBe('ر.ي 15.000,00')
  })
})

describe('Voucher sidebar items follow EffectivePageAccess', () => {
  const EXPENSES = '/dashboard/finance/expenses'
  const REVENUES = '/dashboard/finance/revenues'
  const hrefs = (groups: ReturnType<typeof getSidebarByRole>) => groups.flatMap((g) => g.items.map((i) => i.href))

  const row = (key: string, route: string, allowed: boolean): EffectivePageAccessRow =>
    ({
      key, allowed, primarySource: allowed ? 'role' : 'none', primarySourceLabelAr: '', sources: [],
      overrideState: null, protected: false, reason: '', labelAr: '', category: 'finance', categoryLabelAr: '',
      riskLevel: 'ADMIN_ONLY', primaryRoute: route, routePatterns: [route],
    }) as EffectivePageAccessRow

  it.each(['admin', 'super_admin', 'finance_manager'])('offers both items to %s when access is allowed', (role) => {
    const allowed = filterSidebarGroupsByAccess(getSidebarByRole(role), [
      row('finance.expenses', EXPENSES, true), row('finance.revenues', REVENUES, true),
    ])
    expect(hrefs(allowed)).toEqual(expect.arrayContaining([EXPENSES, REVENUES]))
  })

  it('removes the items when the manifest denies them', () => {
    const denied = filterSidebarGroupsByAccess(getSidebarByRole('finance_manager'), [
      row('finance.expenses', EXPENSES, false), row('finance.revenues', REVENUES, false),
    ])
    expect(hrefs(denied)).not.toContain(EXPENSES)
    expect(hrefs(denied)).not.toContain(REVENUES)
  })

  it.each(['student', 'instructor', 'volunteer'])('never offers them to %s', (role) => {
    const h = hrefs(getSidebarByRole(role))
    expect(h).not.toContain(EXPENSES)
    expect(h).not.toContain(REVENUES)
  })
})
