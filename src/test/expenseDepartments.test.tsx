import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import ExpenseManagementPage from '@/pages/finance/ExpenseManagementPage'

const mockGet = vi.fn()
vi.mock('@/api/axios', () => ({ default: { get: (...a: unknown[]) => mockGet(...a) } }))
vi.mock('@/lib/toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/api/chartOfAccountsApi', () => ({ fetchAccountsList: () => Promise.resolve([]) }))
vi.mock('@/api/expenseApi', () => ({
  fetchExpensesList: () => Promise.resolve({
    items: [{
      id: 5, voucher_no: 'PV-1', date: '2026-10-01', expense_account_id: 1, payment_account_id: 2,
      amount: '10.00', currency: 'USD', description: 'x', status: 'posted', has_attachment: false,
      department_id: 99, department_name: 'إدارة قديمة',
    }],
    pagination: { current_page: 1, last_page: 1, total: 1, per_page: 20 },
    summary: { total_amount: 0, total_count: 1, by_category: [], by_currency: [] },
  }),
  suggestExpenseVoucherNo: () => Promise.resolve('PV-2'),
  createExpense: vi.fn(),
  updateExpense: vi.fn(),
  deleteExpense: vi.fn(),
}))

const urls = () => mockGet.mock.calls.map((c) => c[0])

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ExpenseManagementPage departments', () => {
  it('loads departments from /departments/options (never /admin/departments) and fills filter and form select', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: [{ id: 1, name_ar: 'التسويق', name: 'Marketing' }, { id: 2, name: 'IT' }] } })
    render(<MemoryRouter><ExpenseManagementPage /></MemoryRouter>)

    expect(await screen.findByRole('option', { name: 'التسويق' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'IT' })).toBeInTheDocument()
    expect(urls()).toContain('/departments/options')
    expect(urls()).not.toContain('/admin/departments')
    expect(mockGet).toHaveBeenCalledWith('/departments/options', expect.objectContaining({ skipErrorToast: true }))

    await userEvent.click(screen.getByRole('button', { name: /سند صرف جديد/ }))
    expect(await screen.findByRole('option', { name: '-- اختر القسم أو الإدارة --' })).toBeInTheDocument()
    expect(screen.getAllByRole('option', { name: 'التسويق' })).toHaveLength(2) // filter + form
  })

  it('on failure shows a notice, keeps the list usable and falls back to the free-text field', async () => {
    mockGet.mockRejectedValue(new Error('403'))
    render(<MemoryRouter><ExpenseManagementPage /></MemoryRouter>)

    expect(await screen.findByText('PV-1')).toBeInTheDocument()
    expect(await screen.findByText('تعذّر تحميل قائمة الإدارات للتصفية')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /سند صرف جديد/ }))
    expect(await screen.findByText(/تعذّر تحميل قائمة الإدارات، يمكنك كتابة اسم الإدارة يدويًا/)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/مثال: إدارة تقنية المعلومات/)).toBeInTheDocument()
  })

  it('retry reloads the departments and replaces the free-text field with the select', async () => {
    mockGet.mockRejectedValueOnce(new Error('500'))
    mockGet.mockResolvedValue({ data: { data: [{ id: 1, name_ar: 'التسويق' }] } })
    render(<MemoryRouter><ExpenseManagementPage /></MemoryRouter>)

    await userEvent.click(await screen.findByRole('button', { name: /سند صرف جديد/ }))
    await userEvent.click(await screen.findByRole('button', { name: 'إعادة المحاولة' }))
    await waitFor(() => expect(screen.getAllByRole('option', { name: 'التسويق' }).length).toBeGreaterThan(0))
    expect(screen.queryByText(/تعذّر تحميل قائمة الإدارات، يمكنك/)).not.toBeInTheDocument()
  })

  it('keeps showing the stored department name of existing rows even when it is not in the active options', async () => {
    mockGet.mockResolvedValue({ data: { data: [{ id: 1, name_ar: 'التسويق' }] } })
    render(<MemoryRouter><ExpenseManagementPage /></MemoryRouter>)
    expect(await screen.findByText('إدارة قديمة')).toBeInTheDocument()
  })
})
