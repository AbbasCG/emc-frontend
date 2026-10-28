import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import apiClient from '@/api/axios'
import FormAnalyticsPanel from '@/components/operations/formAnalytics/FormAnalyticsPanel'
import OpsFormsAnalyticsPage from '@/pages/operations/admin/OpsFormsAnalyticsPage'
import { analyticsParams, parseAnalyticsError } from '@/api/formsAnalyticsApi'
import type { FormAnalytics } from '@/api/formsAnalyticsApi'

/**
 * Smart Forms Phase 7 screens. The payloads have the shape FormAnalyticsService returns (tests/Feature/Forms/FormAnalyticsTest):
 * the screen formats numbers, it never computes them.
 */

vi.mock('@/api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))
vi.mock('@/components/operations/OpsPageSkeleton', () => ({ default: () => <div>loading</div> }))
// Recharts measures its container, which jsdom cannot: the chart is replaced, its table view is not.
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts')
  return { ...actual, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="chart">{children}</div> }
})
const api = vi.mocked(apiClient, true)
const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { isAxiosError: true, response: { status, data: {} } })

const ANALYTICS: FormAnalytics = {
  timezone: 'Europe/Amsterdam',
  totals: { responses: 4, signed_in: 1, anonymous: 3, via_share_link: 0, first_response_at: null, last_response_at: null, by_status: { new: 2, in_review: 1, needs_followup: 0, completed: 1, archived: 0 } },
  completion: { rate: null, reason: 'not_tracked', note: 'لا تُسجَّل المحاولات غير المكتملة، لذلك لا يمكن حساب نسبة الإكمال.' },
  series: { granularity: 'day', points: [{ period: '2026-03-01', count: 0 }, { period: '2026-03-02', count: 2 }] },
  comparison: { current: 3, previous: 1, previous_from: '2026-02-22', previous_to: '2026-02-28', change_percent: 200 },
  questions: [
    { id: 1, label: 'التقييم', type: 'star_rating', removed: false, answered: 4, eligible: 4, answer_rate: 100, stats: { kind: 'numeric', count: 4, average: 3.5, min: 2, max: 5, scale: { min: 1, max: 5 }, distribution: [1, 2, 3, 4, 5].map((v) => ({ value: String(v), count: v === 1 ? 0 : 1, percent: v === 1 ? 0 : 25 })) } },
    { id: 2, label: 'المدينة', type: 'radio', removed: false, answered: 3, eligible: 4, answer_rate: 75, stats: { kind: 'choice', multiple: false, options: [{ value: 'أمستردام', label: 'أمستردام', count: 2, percent: 66.7 }, { value: 'أوترخت', label: 'أوترخت', count: 1, percent: 33.3, retired: true }] } },
    { id: 3, label: 'ملاحظات', type: 'textarea', removed: false, answered: 1, eligible: 4, answer_rate: 25, stats: { kind: 'count' } },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  api.get.mockImplementation((async (url: string) => {
    if (url === '/operations/forms/5/analytics') return { data: { success: true, data: ANALYTICS } }
    if (url === '/operations/forms/5/response-options') return { data: { success: true, data: { versions: [{ id: 11, number: 1, published_at: null, responses: 1 }, { id: 12, number: 2, published_at: null, responses: 3 }] } } }
    if (url === '/operations/form-analytics/overview') {
      return { data: { success: true, data: { totals: { forms: 2, active_forms: 1, responses: 7, open: 3 }, forms: [
        { id: 5, title: 'استطلاع', status: 'active', department: { id: 3, name: 'قسم أ' }, responses: 6, open: 2, last_response_at: '2026-03-02T12:00:00+01:00' },
        { id: 6, title: 'تسجيل', status: 'closed', department: null, responses: 1, open: 1, last_response_at: null },
      ] }, meta: { departments: [{ id: 3, name: 'A', name_ar: 'قسم أ' }] } } }
    }
    throw new Error(`unexpected GET ${url}`)
  }) as never)
})

describe('form analytics panel', () => {
  it('shows the totals, the comparison and the completion rate as not measurable', async () => {
    render(<FormAnalyticsPanel formId={5} />)
    expect(await screen.findByText('+200% عن الفترة السابقة')).toBeInTheDocument()
    expect(screen.getByText('غير قابلة للقياس')).toBeInTheDocument()
    expect(screen.getByText(/لا تُسجَّل المحاولات غير المكتملة/)).toBeInTheDocument()
    expect(screen.getByText('بانتظار المعالجة').nextSibling).toHaveTextContent('3')
  })

  it('summarises each question by its kind, without quoting text answers', async () => {
    render(<FormAnalyticsPanel formId={5} />)
    const cards = await screen.findAllByTestId('question-analytics')
    expect(cards).toHaveLength(3)

    expect(within(cards[0]).getByText('3.5')).toBeInTheDocument()
    expect(within(cards[0]).getByText('أجاب 4 من 4 · نسبة الإجابة 100%')).toBeInTheDocument()
    expect(within(cards[1]).getByText('أوترخت (خيار سابق)')).toBeInTheDocument()
    expect(within(cards[1]).getByText('2 · 66.7%')).toBeInTheDocument()
    expect(within(cards[2]).getByText(/تُعدّ هنا ولا تُعرض/)).toBeInTheDocument()
  })

  it('sends the chosen filters to the server and offers the series as a table', async () => {
    const user = userEvent.setup()
    render(<FormAnalyticsPanel formId={5} />)
    await screen.findAllByTestId('question-analytics')

    await user.selectOptions(screen.getByRole('combobox', { name: 'الإصدار' }), '12')
    await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/operations/forms/5/analytics', expect.objectContaining({ params: { version: '12' } })))
    await user.selectOptions(screen.getByRole('combobox', { name: 'الحالة' }), 'completed')
    await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/operations/forms/5/analytics', expect.objectContaining({ params: { version: '12', status: 'completed' } })))

    await user.click(screen.getByRole('button', { name: 'عرض كجدول' }))
    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('row')).toHaveLength(3)
  })

  it('explains a refusal instead of showing empty numbers', async () => {
    api.get.mockImplementation((async (url: string) => {
      if (url.endsWith('/response-options')) return { data: { data: { versions: [] } } }
      throw httpError(403)
    }) as never)
    render(<FormAnalyticsPanel formId={5} />)
    expect(await screen.findByText(/لا تملك صلاحية الاطلاع على ردود هذا النموذج/)).toBeInTheDocument()
    expect(screen.queryByTestId('question-analytics')).toBeNull()
  })
})

describe('analytics overview page', () => {
  it('lists the forms with their counts and filters by department', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><OpsFormsAnalyticsPage /></MemoryRouter>)

    const rows = await screen.findAllByTestId('overview-row')
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByRole('link', { name: 'استطلاع' })).toHaveAttribute('href', '/dashboard/admin/forms/5')
    expect(screen.getByText('الردود في الفترة').nextSibling).toHaveTextContent('7')

    await user.selectOptions(screen.getByRole('combobox', { name: 'القسم' }), '3')
    await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/operations/form-analytics/overview', expect.objectContaining({ params: { department_id: '3' } })))
  })
})

describe('analytics helpers', () => {
  it('builds the query string the server reads', () => {
    expect(analyticsParams({ from: '2026-03-01', to: '2026-03-07', status: ['new', 'in_review'], version: 4, source: 'link' }))
      .toEqual({ from: '2026-03-01', to: '2026-03-07', status: 'new,in_review', version: '4', source: 'link' })
    expect(analyticsParams({ status: [] })).toEqual({})
    expect(parseAnalyticsError(httpError(422))).toContain('تاريخ النهاية')
  })
})
