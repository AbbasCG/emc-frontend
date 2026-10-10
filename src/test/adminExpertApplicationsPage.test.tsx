import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import AdminExpertApplicationsPage from '@/pages/platform/admin/ai/AdminExpertApplicationsPage'

/**
 * Expert Applications review page: list + search + status filter +
 * pagination, a working detail view, and status actions that offer only the
 * transitions the backend allows (new → under_review → approved | rejected).
 */

const access = { aiCenter: false }

vi.mock('@/contexts/PageAccessContext', () => ({
  usePageAccess: () => ({ canAccessPath: (p: string) => (p === '/dashboard/admin/ai' ? access.aiCenter : null) }),
}))

vi.mock('@/lib/toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

const mockList = vi.fn()
const mockShow = vi.fn()
const mockUpdate = vi.fn()

vi.mock('@/api/expertApplicationsAdminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/expertApplicationsAdminApi')>()
  return {
    ...actual,
    fetchExpertApplications: (p: unknown) => mockList(p),
    fetchExpertApplication: (id: number) => mockShow(id),
    updateExpertApplicationStatus: (id: number, s: string) => mockUpdate(id, s),
  }
})

const row = (over: Record<string, unknown> = {}) => ({
  id: 7, uuid: 'u', status: 'new', full_name: 'ليلى أحمد', email: 'layla@example.test',
  whatsapp_number: null, country: 'هولندا', city: 'أمستردام', primary_specialty: 'تعلم الآلة',
  created_at: '2026-10-01T10:00:00Z', ...over,
})

function renderPage() {
  return render(<MemoryRouter><AdminExpertApplicationsPage /></MemoryRouter>)
}

describe('AdminExpertApplicationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    access.aiCenter = false
    mockList.mockResolvedValue({ data: [row()], current_page: 1, last_page: 1, total: 1 })
    mockShow.mockResolvedValue({ ...row(), job_title: 'مهندسة بيانات', expertise_fields: ['NLP', 'Vision'], agree_to_contact: true })
    mockUpdate.mockImplementation((_id: number, status: string) => Promise.resolve({ ...row(), status }))
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('lists applications with Arabic status labels', async () => {
    renderPage()
    expect(await screen.findByText('ليلى أحمد')).toBeInTheDocument()
    expect(screen.getAllByText('جديد').length).toBeGreaterThan(0)
  })

  it('shows an empty state', async () => {
    mockList.mockResolvedValue({ data: [], current_page: 1, last_page: 1, total: 0 })
    renderPage()
    expect(await screen.findByText('لا توجد طلبات انضمام حالياً.')).toBeInTheDocument()
  })

  it('shows an error with retry', async () => {
    mockList.mockRejectedValueOnce(new Error('500'))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('تعذر تحميل الطلبات')
    await userEvent.click(screen.getByRole('button', { name: /إعادة المحاولة/ }))
    expect(await screen.findByText('ليلى أحمد')).toBeInTheDocument()
  })

  it('searches and filters by status through the API', async () => {
    renderPage()
    await screen.findByText('ليلى أحمد')

    await userEvent.type(screen.getByRole('searchbox', { name: 'بحث في الطلبات' }), 'ليلى')
    await waitFor(() => expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'ليلى', page: 1 })))

    await userEvent.click(screen.getByRole('tab', { name: 'قيد المراجعة' }))
    await waitFor(() => expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'under_review' })))
  })

  it('opens the detail view with labelled fields', async () => {
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /عرض/ }))

    const dialog = await screen.findByRole('dialog', { name: 'تفاصيل الطلب' })
    expect(await within(dialog).findByText('مهندسة بيانات')).toBeInTheDocument()
    expect(within(dialog).getByText('المسمى الوظيفي')).toBeInTheDocument()
    expect(within(dialog).getByText('NLP')).toBeInTheDocument()
    expect(within(dialog).getByText('نعم')).toBeInTheDocument()
  })

  it('offers review, approve and reject for a new application and applies the choice', async () => {
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /عرض/ }))
    const dialog = await screen.findByRole('dialog', { name: 'تفاصيل الطلب' })
    await within(dialog).findByText('مهندسة بيانات')

    expect(within(dialog).getByRole('button', { name: 'بدء المراجعة' })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'رفض الطلب' })).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'قبول الطلب' }))

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith(7, 'approved'))
    expect(await within(dialog).findByText('تم البت في هذا الطلب — القرار نهائي.')).toBeInTheDocument()
  })

  it('offers no actions for a decided application', async () => {
    mockShow.mockResolvedValue({ ...row({ status: 'rejected' }), job_title: 'x' })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /عرض/ }))
    const dialog = await screen.findByRole('dialog', { name: 'تفاصيل الطلب' })

    expect(await within(dialog).findByText('تم البت في هذا الطلب — القرار نهائي.')).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'قبول الطلب' })).not.toBeInTheDocument()
  })

  it('shows the back link to the AI Command Center only to those who may open it', async () => {
    const { unmount } = renderPage()
    await screen.findByText('ليلى أحمد')
    expect(screen.queryByRole('link', { name: 'العودة إلى مركز الذكاء الاصطناعي' })).not.toBeInTheDocument()
    unmount()

    access.aiCenter = true
    renderPage()
    await screen.findByText('ليلى أحمد')
    expect(screen.getByRole('link', { name: 'العودة إلى مركز الذكاء الاصطناعي' })).toBeInTheDocument()
  })
})
