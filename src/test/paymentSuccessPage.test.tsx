import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import api from '@/api/axios'
import PaymentSuccessPage from '@/pages/student/PaymentSuccessPage'

vi.mock('@/api/axios', () => ({ default: { get: vi.fn() } }))
const mocked = api as unknown as { get: ReturnType<typeof vi.fn> }

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <PaymentSuccessPage />
    </MemoryRouter>,
  )
}

beforeEach(() => mocked.get.mockReset())

describe('PaymentSuccessPage (checkout return)', () => {
  it('asks the server about THIS checkout session only', async () => {
    mocked.get.mockResolvedValue({ data: { data: [{ status: 'paid', invoice: { id: 4 } }] } })
    renderAt('/dashboard/student/payment-success?session_id=cs_test_abc')
    await screen.findByText('تم الدفع بنجاح!')
    expect(mocked.get).toHaveBeenCalledWith('/student/orders', { params: { session_id: 'cs_test_abc' } })
  })

  it('a normal paid order says the learner is enrolled', async () => {
    mocked.get.mockResolvedValue({ data: { data: [{ status: 'paid', payment_under_review: false, invoice: null }] } })
    renderAt('/x?session_id=cs_1')
    expect(await screen.findByText('تم الدفع بنجاح!')).toBeInTheDocument()
    expect(screen.queryByTestId('payment-return-under-review')).not.toBeInTheDocument()
  })

  it('a paid order whose enrollment is withheld says "received — under review", never "enrolled / start learning"', async () => {
    mocked.get.mockResolvedValue({ data: { data: [{ status: 'paid', payment_under_review: true, invoice: { id: 9 } }] } })
    renderAt('/x?session_id=cs_1')
    const box = await screen.findByTestId('payment-return-under-review')
    expect(box).toHaveTextContent('تم استلام الدفعة — قيد المراجعة')
    expect(box).toHaveTextContent('لا حاجة للدفع مرة أخرى')
    expect(screen.queryByText('تم الدفع بنجاح!')).not.toBeInTheDocument()
    expect(screen.queryByText(/يمكنك البدء بالتعلم/)).not.toBeInTheDocument()
    expect(screen.getByText('عرض الفاتورة')).toBeInTheDocument()
  })

  it('the failure state never promises an automatic refund', () => {
    renderAt('/x') // no session id
    expect(screen.getByText('تعذّر تأكيد الدفع')).toBeInTheDocument()
    expect(screen.queryByText(/استرداده تلقائيًا/)).not.toBeInTheDocument()
    expect(screen.getByText(/الفريق المالي/)).toBeInTheDocument()
  })
})
