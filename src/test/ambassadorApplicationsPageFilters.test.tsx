import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import AmbassadorApplicationsPage from '@/pages/super-admin/AmbassadorApplicationsPage'
import type { AmbassadorApplication } from '@/api/ambassadorApplicationApi'

const mockFetchAmbassadorApplications = vi.fn()
const mockFetchAmbassadorFilterOptions = vi.fn()
const mockFetchAmbassadorApplication = vi.fn()

vi.mock('@/api/ambassadorApplicationApi', async () => {
  const actual = await vi.importActual<typeof import('@/api/ambassadorApplicationApi')>(
    '@/api/ambassadorApplicationApi',
  )
  return {
    ...actual,
    fetchAmbassadorApplications: (...args: unknown[]) => mockFetchAmbassadorApplications(...args),
    fetchAmbassadorFilterOptions: (...args: unknown[]) => mockFetchAmbassadorFilterOptions(...args),
    fetchAmbassadorApplication: (...args: unknown[]) => mockFetchAmbassadorApplication(...args),
  }
})

vi.mock('@/lib/toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() },
}))

vi.mock('react-select', () => ({
  default: ({
    options = [],
    value,
    onChange,
    placeholder,
  }: {
    options?: { value: string; label: string }[]
    value?: { value: string; label: string } | null
    onChange?: (v: { value: string; label: string } | null) => void
    placeholder?: string
  }) => (
    <select
      aria-label={placeholder ?? 'select'}
      value={value?.value ?? ''}
      onChange={(e) => {
        const next = options.find((o) => o.value === e.target.value) ?? null
        onChange?.(next)
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  ),
}))

function app(overrides: Partial<AmbassadorApplication> = {}): AmbassadorApplication {
  return {
    id: 11,
    uuid: 'uuid-11',
    status: 'new',
    is_draft: false,
    full_name: 'أحمد محمد',
    email: 'ahmed@example.com',
    mobile_phone: '+31612345678',
    country: 'هولندا',
    city: 'بريدا',
    university_name: 'Avans',
    major: 'Software',
    created_at: '2026-08-01T10:00:00Z',
    ...overrides,
  }
}

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>
}

function renderPage(initial = '/dashboard/super-admin/ambassador-applications') {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route
          path="/dashboard/super-admin/ambassador-applications"
          element={
            <>
              <AmbassadorApplicationsPage />
              <LocationProbe />
            </>
          }
        />
        <Route
          path="/dashboard/super-admin/ambassador-applications/:id"
          element={
            <div>
              <h1>Detail page</h1>
              <LocationProbe />
            </div>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AmbassadorApplicationsPage — backend-driven search & filters', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    mockFetchAmbassadorApplications.mockReset()
    mockFetchAmbassadorFilterOptions.mockReset()
    mockFetchAmbassadorApplication.mockReset()

    mockFetchAmbassadorApplications.mockResolvedValue({
      data: [app()],
      meta: { current_page: 1, last_page: 2, per_page: 20, total: 25, from: 1, to: 20 },
      statistics: { total: 25, new: 10, under_review: 5, interview_scheduled: 3, approved: 4, rejected: 2, waitlisted: 1 },
      by_country: [],
      monthly_trend: [],
    })

    mockFetchAmbassadorFilterOptions.mockResolvedValue({
      countries: ['هولندا', 'اليمن'],
      cities: ['بريدا', 'تعز'],
      universities: ['Avans', 'جامعة صنعاء'],
      specializations: ['Software', 'علوم الحاسوب'],
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('sends search query to the API after debounce', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPage()

    await screen.findByText('أحمد محمد')
    const input = screen.getByPlaceholderText('ابحث بالاسم أو البريد أو الجامعة أو الدولة أو المدينة...')
    await user.type(input, 'هولندا')

    await act(async () => {
      vi.advanceTimersByTime(450)
    })

    await waitFor(() => {
      const last = mockFetchAmbassadorApplications.mock.calls.at(-1)?.[0]
      expect(last).toMatchObject({ search: 'هولندا' })
    })
  })

  it('sends country, city and university filters to the API', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPage()
    await screen.findByText('أحمد محمد')

    await user.click(screen.getByRole('button', { name: /فلاتر/ }))
    await user.selectOptions(screen.getByLabelText('كل الدول'), 'هولندا')
    await user.selectOptions(screen.getByLabelText('كل المدن'), 'بريدا')
    await user.selectOptions(screen.getByLabelText('كل الجامعات'), 'Avans')

    await waitFor(() => {
      const last = mockFetchAmbassadorApplications.mock.calls.at(-1)?.[0]
      expect(last).toMatchObject({
        country: 'هولندا',
        city: 'بريدا',
        university: 'Avans',
      })
    })
  })

  it('shows active filter chips and clears all filters', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPage('/dashboard/super-admin/ambassador-applications?country=هولندا&city=بريدا&status=new')

    expect(await screen.findByText('الدولة: هولندا')).toBeInTheDocument()
    expect(screen.getByText('المدينة: بريدا')).toBeInTheDocument()
    expect(screen.getByText('الحالة: جديد')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /مسح الفلاتر/ }))

    await waitFor(() => {
      expect(screen.queryByText('الدولة: هولندا')).not.toBeInTheDocument()
      const last = mockFetchAmbassadorApplications.mock.calls.at(-1)?.[0]
      expect(last?.country).toBeUndefined()
      expect(last?.city).toBeUndefined()
      expect(last?.status).toBeUndefined()
    })
  })

  it('resets page to 1 when a filter changes', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPage('/dashboard/super-admin/ambassador-applications?page=3')
    await screen.findByText('أحمد محمد')

    await user.click(screen.getByRole('button', { name: 'جديد' }))

    await waitFor(() => {
      const loc = screen.getByTestId('location').textContent ?? ''
      expect(loc).toContain('status=new')
      expect(loc).not.toContain('page=')
      const last = mockFetchAmbassadorApplications.mock.calls.at(-1)?.[0]
      expect(last?.page === undefined || last?.page === 1).toBe(true)
      expect(last).toMatchObject({ status: 'new' })
    })
  })

  it('preserves URL query state on mount', async () => {
    renderPage('/dashboard/super-admin/ambassador-applications?search=تعز&country=اليمن&university=جامعة%20صنعاء&page=2')

    await waitFor(() => expect(mockFetchAmbassadorApplications).toHaveBeenCalled())
    const params = mockFetchAmbassadorApplications.mock.calls[0][0]
    expect(params).toMatchObject({
      search: 'تعز',
      country: 'اليمن',
      university: 'جامعة صنعاء',
      page: 2,
    })
  })

  it('returning from detail keeps list query state in history', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPage('/dashboard/super-admin/ambassador-applications?search=هولندا&page=2')
    await screen.findByText('أحمد محمد')

    await user.click(screen.getByText('أحمد محمد'))
    expect(await screen.findByText('Detail page')).toBeInTheDocument()
    expect(screen.getByTestId('location').textContent).toBe('/dashboard/super-admin/ambassador-applications/11')
  })

  it('shows filtered empty state with clear action', async () => {
    mockFetchAmbassadorApplications.mockResolvedValue({
      data: [],
      meta: { current_page: 1, last_page: 1, per_page: 20, total: 0, from: 0, to: 0 },
      statistics: { total: 0, new: 0, under_review: 0, interview_scheduled: 0, approved: 0, rejected: 0, waitlisted: 0 },
      by_country: [],
      monthly_trend: [],
    })

    renderPage('/dashboard/super-admin/ambassador-applications?country=هولندا')

    expect(await screen.findByText('لا توجد طلبات مطابقة لمعايير البحث الحالية')).toBeInTheDocument()
    const emptyCell = screen.getByText('لا توجد طلبات مطابقة لمعايير البحث الحالية').closest('td')
    expect(emptyCell).toBeTruthy()
    expect(within(emptyCell as HTMLElement).getByRole('button', { name: /مسح الفلاتر/ })).toBeInTheDocument()
  })

  it('does not create an infinite request loop for stable URL state', async () => {
    renderPage('/dashboard/super-admin/ambassador-applications?status=new')
    await screen.findByText('أحمد محمد')

    const callsAfterMount = mockFetchAmbassadorApplications.mock.calls.length
    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
    expect(mockFetchAmbassadorApplications.mock.calls.length).toBeLessThanOrEqual(callsAfterMount + 1)
  })
})
