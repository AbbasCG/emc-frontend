import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import CouponCourseSelector from '@/components/intelligence/CouponCourseSelector'
import CouponForm from '@/components/intelligence/CouponForm'
import { fetchCoupon, searchCouponCourses } from '@/api/couponsApi'
import type { CouponCourseRef, CouponRecord } from '@/types/intelligence'

const mockGet = vi.fn()
vi.mock('@/api/axios', () => ({ default: { get: (...a: unknown[]) => mockGet(...a) } }))

const rows = (...r: Array<[number, string, string?]>) => ({
  data: { success: true, data: r.map(([id, title, status]) => ({ id, title, price: 100, status: status ?? 'published', slug: `s${id}`, type: 'course' })) },
})

function Harness({ initial = [], initialCourses }: { initial?: number[]; initialCourses?: CouponCourseRef[] }) {
  const [ids, setIds] = useState<number[]>(initial)
  return (
    <>
      <CouponCourseSelector value={ids} onChange={setIds} initialCourses={initialCourses} />
      <output data-testid="ids">{JSON.stringify(ids)}</output>
    </>
  )
}

beforeEach(() => { vi.clearAllMocks() })

describe('couponsApi', () => {
  it('fetchCoupon calls /finance/coupons/{id} and maps courses / excluded_courses / created_by', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: {
      id: 7, code: 'A', name: 'n', courses: [{ id: 1, title: 'c1', price: 5, status: 'archived' }],
      excluded_courses: [{ id: 2, title: 'c2' }], created_by: { id: 3, name: 'Ali' }, updated_by: null,
    } } })
    const c = await fetchCoupon(7)
    expect(mockGet.mock.calls[0][0]).toBe('/finance/coupons/7')
    expect(c.courses?.[0]).toMatchObject({ id: 1, status: 'archived' })
    expect(c.excluded_courses?.[0].id).toBe(2)
    expect(c.created_by?.name).toBe('Ali')
  })

  it('searchCouponCourses hits /finance/purchasables with type=course and q', async () => {
    mockGet.mockResolvedValue(rows([1, 'A']))
    const out = await searchCouponCourses(' ab ')
    expect(mockGet).toHaveBeenCalledWith('/finance/purchasables', expect.objectContaining({
      params: { type: 'course', q: 'ab', per_page: 100 }, skipErrorToast: true,
    }))
    expect(out).toEqual([{ id: 1, title: 'A', price: 100, status: 'published' }])
  })
})

describe('CouponCourseSelector', () => {
  it('loads results from the server, with no fallback to the public courses endpoint', async () => {
    mockGet.mockResolvedValue(rows([1, 'دورة أ'], [2, 'دورة ب', 'draft']))
    render(<Harness />)
    expect(await screen.findByText('دورة أ')).toBeInTheDocument()
    expect(screen.getByText('مسودة')).toBeInTheDocument()
    expect(mockGet.mock.calls.every((c) => c[0] === '/finance/purchasables')).toBe(true)
  })

  it('debounces typing and sends q to the server', async () => {
    mockGet.mockResolvedValue(rows([1, 'دورة أ']))
    render(<Harness />)
    await screen.findByText('دورة أ')
    mockGet.mockClear()
    mockGet.mockResolvedValue(rows([9, 'ReactJS']))

    await userEvent.type(screen.getByLabelText('ابحث عن دورة'), 'rea')
    expect(await screen.findByText('ReactJS')).toBeInTheDocument()
    expect(mockGet).toHaveBeenCalledTimes(1)
    expect(mockGet.mock.calls[0][1].params).toMatchObject({ type: 'course', q: 'rea' })
  })

  it('shows the empty message only after a successful empty response', async () => {
    mockGet.mockResolvedValue(rows())
    render(<Harness />)
    expect(screen.queryByText('لا توجد نتائج')).not.toBeInTheDocument()
    expect(await screen.findByText('لا توجد نتائج')).toBeInTheDocument()
  })

  it('shows an error with retry (never the empty message) when the request fails, and recovers', async () => {
    mockGet.mockRejectedValueOnce(new Error('403'))
    render(<Harness />)
    expect(await screen.findByRole('alert')).toHaveTextContent('تعذّر تحميل الدورات')
    expect(screen.queryByText('لا توجد نتائج')).not.toBeInTheDocument()

    mockGet.mockResolvedValue(rows([1, 'دورة أ']))
    await userEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }))
    expect(await screen.findByText('دورة أ')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('keeps linked courses visible and selected when absent from results, across term changes and failures', async () => {
    mockGet.mockResolvedValue(rows([1, 'دورة أ']))
    render(<Harness initial={[50, 51]} initialCourses={[
      { id: 50, title: 'مؤرشفة مرتبطة', price: 20, status: 'archived' },
      { id: 51, title: 'مجانية مرتبطة', price: 0, status: 'draft' },
    ]} />)
    await screen.findByText('دورة أ')
    expect(screen.getByLabelText('مؤرشفة مرتبطة')).toBeChecked()
    expect(screen.getByLabelText('مجانية مرتبطة')).toBeChecked()

    mockGet.mockResolvedValue(rows([9, 'نتيجة أخرى']))
    await userEvent.type(screen.getByLabelText('ابحث عن دورة'), 'zzz')
    await screen.findByText('نتيجة أخرى')
    expect(screen.getByLabelText('مؤرشفة مرتبطة')).toBeChecked()

    mockGet.mockRejectedValue(new Error('x'))
    await userEvent.type(screen.getByLabelText('ابحث عن دورة'), 'q')
    await screen.findByRole('alert')
    expect(screen.getByLabelText('مجانية مرتبطة')).toBeChecked()
  })

  it('toggles selection: untouched ids stay, ticking adds, unticking a linked course removes only it', async () => {
    mockGet.mockResolvedValue(rows([1, 'دورة أ']))
    render(<Harness initial={[50]} initialCourses={[{ id: 50, title: 'مرتبطة', price: 20, status: 'published' }]} />)
    await screen.findByText('دورة أ')
    expect(screen.getByTestId('ids')).toHaveTextContent('[50]')

    await userEvent.click(screen.getByLabelText('دورة أ'))
    expect(screen.getByTestId('ids')).toHaveTextContent('[50,1]')

    await userEvent.click(screen.getByLabelText('مرتبطة'))
    expect(screen.getByTestId('ids')).toHaveTextContent('[1]')
  })

  it('a selection made from results survives a later search that no longer returns it', async () => {
    mockGet.mockResolvedValue(rows([1, 'دورة أ']))
    render(<Harness />)
    await userEvent.click(await screen.findByLabelText('دورة أ'))

    mockGet.mockResolvedValue(rows([2, 'دورة ب']))
    await userEvent.type(screen.getByLabelText('ابحث عن دورة'), 'b')
    await screen.findByText('دورة ب')
    expect(screen.getByLabelText('دورة أ')).toBeChecked()
  })
})

describe('CouponForm payload', () => {
  it('sends the original linked course ids unchanged when the selection was not touched', async () => {
    mockGet.mockResolvedValue(rows([1, 'غير مرتبطة']))
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const initial = {
      id: 1, code: 'C', name: 'n', discount_type: 'percentage', discount_value: 10, max_uses: null, used_count: 0,
      starts_at: null, expires_at: null, status: 'active', eligibility_type: 'selected_courses',
      courses: [{ id: 50, title: 'مرتبطة', price: 0, status: 'archived' }, { id: 51, title: 'أخرى', price: 5, status: 'draft' }],
    } as CouponRecord
    const { container } = render(<CouponForm initial={initial} onSubmit={onSubmit} onCancel={() => {}} />)
    await screen.findByText('غير مرتبطة')
    await userEvent.click(container.querySelector('button[type="submit"]') as HTMLElement)
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0].course_ids).toEqual([50, 51])
  })
})
