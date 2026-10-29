import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import FinancePaymentReconciliationsPage from '@/pages/finance/FinancePaymentReconciliationsPage'
import type { ReconciliationCase, ReconciliationPage } from '@/api/paymentReconciliationsApi'

const fetchReconciliations = vi.fn()
const resolveReconciliation = vi.fn()

vi.mock('@/api/paymentReconciliationsApi', () => ({
  fetchReconciliations: (...a: unknown[]) => fetchReconciliations(...a),
  resolveReconciliation: (...a: unknown[]) => resolveReconciliation(...a),
}))
vi.mock('@/components/intelligence', () => ({ FinanceSubnav: () => <nav data-testid="finance-subnav" /> }))
vi.mock('@/lib/toast', () => ({ default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() } }))

// jsdom has no <dialog> modal support.
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open')
  }
  fetchReconciliations.mockReset()
  resolveReconciliation.mockReset()
})

function caseRow(over: Partial<ReconciliationCase> = {}): ReconciliationCase {
  return {
    id: 7,
    status: 'open',
    reason: 'instructor_conflict',
    created_at: '2026-10-18T10:00:00Z',
    user: { id: 3, name: 'منى السالم', email: 'mona@example.test' },
    program: { type: 'course', id: 11, title: 'الإنجليزية للأعمال', slug: 'business-english' },
    payment: { id: 5, amount: 120, currency: 'EUR', status: 'payment_confirmed', provider: 'stripe', payment_method: 'card', provider_reference: 'pi_test_ref_1', confirmed_at: '2026-10-18T10:00:00Z' },
    order: { id: 2, number: 'ORD-0002', status: 'paid' },
    invoice: { id: 4, number: 'INV-0004' },
    registration: { id: 9, status: 'pending_payment' },
    actions: ['enrollment_activated', 'closed_without_enrollment'],
    conflict_still_present: false,
    resolution: null,
    resolution_note: null,
    resolved_at: null,
    resolved_by: null,
    refund_status: null,
    ...over,
  }
}

function pageOf(rows: ReconciliationCase[], summary = { open: rows.length, resolved: 0, refund_pending: 0 }): ReconciliationPage {
  return { rows, summary, total: rows.length, currentPage: 1, lastPage: 1 }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/dashboard/finance/payment-reconciliations']}>
      <FinancePaymentReconciliationsPage />
    </MemoryRouter>,
  )
}

describe('FinancePaymentReconciliationsPage', () => {
  it('lists the open cases with user, program, amount, references, reason and counts, in RTL', async () => {
    fetchReconciliations.mockResolvedValue(pageOf([caseRow()], { open: 1, resolved: 4, refund_pending: 2 }))
    renderPage()

    const table = await screen.findByTestId('reconciliation-table')
    expect(within(table).getByText('منى السالم')).toBeInTheDocument()
    expect(within(table).getByText('الإنجليزية للأعمال')).toBeInTheDocument()
    expect(within(table).getByText('INV-0004')).toBeInTheDocument()
    expect(within(table).getByText('الدافع صار مدرّب هذا البرنامج')).toBeInTheDocument()
    expect(within(table).getByText('بانتظار القرار')).toBeInTheDocument()
    expect(screen.getByTestId('reconciliations-page')).toHaveAttribute('dir', 'rtl')
    expect(screen.getByTestId('count-open')).toHaveTextContent('1')
    expect(screen.getByTestId('count-resolved')).toHaveTextContent('4')
    expect(screen.getByTestId('count-refund')).toHaveTextContent('2')
    expect(fetchReconciliations).toHaveBeenCalledWith(expect.objectContaining({ status: 'open' }))
  })

  it('renders the same cases as cards for narrow screens', async () => {
    fetchReconciliations.mockResolvedValue(pageOf([caseRow(), caseRow({ id: 8 })]))
    renderPage()
    expect(await screen.findAllByTestId('case-card')).toHaveLength(2)
  })

  it('shows an empty state, a forbidden state and a retryable error', async () => {
    fetchReconciliations.mockResolvedValueOnce(pageOf([]))
    const first = renderPage()
    expect(await screen.findByTestId('empty')).toHaveTextContent('لا توجد حالات مفتوحة')
    first.unmount()

    fetchReconciliations.mockRejectedValueOnce({ isAxiosError: true, response: { status: 403, data: {} } })
    const second = renderPage()
    expect(await screen.findByText('ليس لديك صلاحية للوصول إلى تسوية المدفوعات')).toBeInTheDocument()
    second.unmount()

    fetchReconciliations.mockRejectedValueOnce(new Error('boom'))
    renderPage()
    expect(await screen.findByRole('button', { name: 'إعادة المحاولة' })).toBeInTheDocument()
  })

  it('switching to the refund tab asks the API for pending refunds', async () => {
    fetchReconciliations.mockResolvedValue(pageOf([]))
    renderPage()
    await screen.findByTestId('empty')
    await userEvent.click(screen.getByRole('tab', { name: /استرداد معلّق/ }))
    await waitFor(() => expect(fetchReconciliations).toHaveBeenLastCalledWith(expect.objectContaining({ refund: 'pending' })))
  })

  it('opening a case shows payment and invoice references and the available decisions', async () => {
    fetchReconciliations.mockResolvedValue(pageOf([caseRow()]))
    renderPage()
    await userEvent.click((await screen.findAllByRole('button', { name: /عرض حالة تسوية 7/ }))[0])

    const detail = await screen.findByTestId('case-detail')
    expect(within(detail).getByText('pi_test_ref_1')).toBeInTheDocument()
    expect(within(detail).getByText('ORD-0002')).toBeInTheDocument()
    expect(within(detail).getByText('INV-0004')).toBeInTheDocument()
    expect(within(detail).getByRole('button', { name: 'تفعيل التسجيل' })).toBeEnabled()
    expect(within(detail).getByRole('button', { name: 'إغلاق دون تفعيل' })).toBeEnabled()
  })

  it('cannot activate while the payer still teaches the program', async () => {
    fetchReconciliations.mockResolvedValue(pageOf([caseRow({ conflict_still_present: true })]))
    renderPage()
    await userEvent.click((await screen.findAllByRole('button', { name: /عرض حالة تسوية 7/ }))[0])
    const detail = await screen.findByTestId('case-detail')
    expect(within(detail).getByRole('button', { name: 'تفعيل التسجيل' })).toBeDisabled()
    expect(within(detail).getByRole('button', { name: 'إغلاق دون تفعيل' })).toBeEnabled()
  })

  it('a decision needs a confirmation with a mandatory note before the API is called', async () => {
    const updated = caseRow({ status: 'resolved', resolution: 'closed_without_enrollment', resolution_note: 'تم الاتفاق مع المستخدم', refund_status: 'pending' })
    fetchReconciliations.mockResolvedValue(pageOf([caseRow()]))
    resolveReconciliation.mockResolvedValue(updated)
    renderPage()

    await userEvent.click((await screen.findAllByRole('button', { name: /عرض حالة تسوية 7/ }))[0])
    await userEvent.click(within(await screen.findByTestId('case-detail')).getByRole('button', { name: 'إغلاق دون تفعيل' }))

    const confirm = await screen.findByRole('button', { name: 'تأكيد الإغلاق دون تفعيل' })
    expect(confirm).toBeDisabled() // no note yet
    expect(resolveReconciliation).not.toHaveBeenCalled()

    const note = screen.getByLabelText(/ملاحظة داخلية/)
    await userEvent.type(note, 'abc')
    expect(confirm).toBeDisabled() // shorter than the minimum
    await userEvent.type(note, 'defg')
    expect(confirm).toBeEnabled()

    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(confirm)

    await waitFor(() => expect(resolveReconciliation).toHaveBeenCalledTimes(1))
    expect(resolveReconciliation).toHaveBeenCalledWith(7, { resolution: 'closed_without_enrollment', note: 'abcdefg', refundRequired: true })
  })

  it('the refund option exists only when closing, and the page never claims a refund happened', async () => {
    fetchReconciliations.mockResolvedValue(pageOf([caseRow()]))
    renderPage()
    await userEvent.click((await screen.findAllByRole('button', { name: /عرض حالة تسوية 7/ }))[0])
    await userEvent.click(within(await screen.findByTestId('case-detail')).getByRole('button', { name: 'تفعيل التسجيل' }))

    await screen.findByRole('button', { name: 'تأكيد تفعيل التسجيل' })
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByText('تم الاسترداد')).not.toBeInTheDocument()
    expect(screen.queryByText('مستردّة')).not.toBeInTheDocument()
  })

  it('a resolved case shows who decided, when, the note, and "refund pending" — never "refunded"', async () => {
    fetchReconciliations.mockResolvedValue(
      pageOf(
        [caseRow({ status: 'resolved', actions: [], conflict_still_present: null, resolution: 'closed_without_enrollment', resolution_note: 'تعذّر التفعيل لأن المستخدم مدرّب', resolved_at: '2026-10-19T09:00:00Z', resolved_by: { id: 1, name: 'مدير المالية' }, refund_status: 'pending' })],
        { open: 0, resolved: 1, refund_pending: 1 },
      ),
    )
    renderPage()
    await userEvent.click(await screen.findByRole('tab', { name: /تمت التسوية/ }))
    await userEvent.click((await screen.findAllByRole('button', { name: /عرض حالة تسوية 7/ }))[0])

    const history = await screen.findByTestId('resolution-history')
    expect(within(history).getByText('مدير المالية')).toBeInTheDocument()
    expect(within(history).getByText('تعذّر التفعيل لأن المستخدم مدرّب')).toBeInTheDocument()
    expect(within(history).getAllByText('استرداد معلّق').length).toBeGreaterThan(0)
    expect(within(history).getAllByText('أُغلقت دون تفعيل التسجيل').length).toBeGreaterThan(0)
    expect(screen.queryByText('تم الاسترداد')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'تفعيل التسجيل' })).not.toBeInTheDocument()
  })

  it('an activated case is labelled as such, distinct from a closed one', async () => {
    fetchReconciliations.mockResolvedValue(
      pageOf([caseRow({ status: 'resolved', actions: [], resolution: 'enrollment_activated', resolved_by: { id: 1, name: 'م' } })], { open: 0, resolved: 1, refund_pending: 0 }),
    )
    renderPage()
    await userEvent.click(await screen.findByRole('tab', { name: /تمت التسوية/ }))
    const table = await screen.findByTestId('reconciliation-table')
    expect(within(table).getByText('فُعّل التسجيل')).toBeInTheDocument()
    expect(within(table).queryByText('أُغلقت دون تفعيل التسجيل')).not.toBeInTheDocument()
  })

  it('states on the page that the platform never refunds automatically', async () => {
    fetchReconciliations.mockResolvedValue(pageOf([]))
    renderPage()
    expect(await screen.findByRole('note')).toHaveTextContent('لا تُجري المنصة استرداداً تلقائياً')
  })
})
