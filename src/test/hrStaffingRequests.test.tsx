import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HrMyRequestsPage from '@/pages/hr/HrMyRequestsPage'

/**
 * A department leader files and follows staffing requests: employment type, job title, count, qualification, duties, skills.
 * Rows saved before those fields existed only carry `request_type`, so the list must still read them.
 */

const get = vi.fn()
const post = vi.fn()
vi.mock('@/api/axios', () => ({ default: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) } }))

const toastError = vi.fn()
const toastSuccess = vi.fn()
vi.mock('@/lib/toast', () => ({ default: { error: (...a: unknown[]) => toastError(...a), success: (...a: unknown[]) => toastSuccess(...a) } }))

const base = { status: 'pending', created_by: 1, created_at: '2026-10-28T10:00:00Z', department: { id: 1, name_ar: 'إدارة الإعلام' } }
const ROWS = [
  { ...base, id: 1, request_type: 'مصمم محتوى (وظيفة شاغرة)', employment_type: 'وظيفة شاغرة', job_title: 'مصمم محتوى', required_count: 2, qualification: 'بكالوريوس تصميم' },
  { ...base, id: 2, request_type: 'منسق برامج (استبدال)', employment_type: 'استبدال', job_title: 'منسق برامج', required_count: 1, qualification: null },
  // saved before the detailed fields existed: only request_type, with the type in parentheses
  { ...base, id: 3, request_type: 'مدير مجتمع (استبدال)', required_count: 3, qualification: null, status: 'approved' },
  // legacy row with a plain request_type
  { ...base, id: 4, request_type: 'احتياج عام', required_count: 1, qualification: null, status: 'rejected' },
]

function listReturns(rows: unknown[]) {
  get.mockResolvedValue({ data: { data: rows } })
}

beforeEach(() => {
  vi.clearAllMocks()
  listReturns(ROWS)
  post.mockResolvedValue({ data: { success: true } })
})

describe('HrMyRequestsPage — the list', () => {
  it('reads the new fields and falls back gracefully for rows saved before them', async () => {
    render(<HrMyRequestsPage />)
    await screen.findByText('مصمم محتوى')

    const row = (title: string) => screen.getByText(title).closest('tr')!
    expect(within(row('مصمم محتوى')).getByText('وظيفة شاغرة')).toBeInTheDocument()
    expect(within(row('مصمم محتوى')).getByText('بكالوريوس تصميم')).toBeInTheDocument()
    expect(within(row('منسق برامج')).getByText('استبدال')).toBeInTheDocument()
    expect(within(row('منسق برامج')).getByText('—')).toBeInTheDocument() // no qualification

    // legacy: the type is recovered from the parentheses and the title from what precedes them
    expect(within(row('مدير مجتمع')).getByText('استبدال')).toBeInTheDocument()
    // legacy without a type defaults to a vacancy
    expect(within(row('احتياج عام')).getByText('وظيفة شاغرة')).toBeInTheDocument()

    expect(screen.getByText('مقبول')).toBeInTheDocument()
    expect(screen.getByText('مرفوض')).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith('/admin/hr-requests/my')
  })

  it('says so when nothing was submitted yet', async () => {
    listReturns([])
    render(<HrMyRequestsPage />)
    expect(await screen.findByText('لا توجد طلبات احتياج مقدمة حتى الآن.')).toBeInTheDocument()
  })

  it('reports a list that cannot be loaded', async () => {
    get.mockRejectedValue(new Error('offline'))
    render(<HrMyRequestsPage />)
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('فشل في جلب طلبات الاحتياج'))
  })
})

describe('HrMyRequestsPage — the request form', () => {
  async function openForm() {
    const user = userEvent.setup()
    render(<HrMyRequestsPage />)
    await screen.findByText('مصمم محتوى')
    await user.click(screen.getByRole('button', { name: /تقديم طلب احتياج جديد/ }))
    return user
  }

  const fields = () => ({
    title: screen.getByPlaceholderText(/منسق برامج، مصمم محتوى/),
    qualification: screen.getByPlaceholderText(/بكالوريوس إدارة أعمال/),
    duties: screen.getByPlaceholderText(/المهام والمسؤوليات الرئيسية/),
    skills: screen.getByPlaceholderText(/خبرة سنتين/),
    notes: screen.getByPlaceholderText('أي ملاحظات إضافية...'),
  })

  it('refuses answers made of blanks, naming the first missing one, and sends nothing', async () => {
    // Empty required fields are stopped by the browser itself; blanks pass that check, so the page's own check must catch them.
    const user = await openForm()
    const submit = () => user.click(screen.getByRole('button', { name: 'تقديم الطلب' }))

    await user.type(fields().title, '   ')
    await user.type(fields().duties, 'مهام')
    await user.type(fields().skills, 'مهارات')
    await submit()
    expect(toastError).toHaveBeenLastCalledWith('يرجى إدخال المسمى الوظيفي')

    await user.clear(fields().title)
    await user.type(fields().title, 'محاسب')
    await user.clear(fields().duties)
    await user.type(fields().duties, '   ')
    await submit()
    expect(toastError).toHaveBeenLastCalledWith('يرجى تحديد المهام والمسؤوليات')

    await user.clear(fields().duties)
    await user.type(fields().duties, 'إعداد التقارير')
    await user.clear(fields().skills)
    await user.type(fields().skills, '   ')
    await submit()
    expect(toastError).toHaveBeenLastCalledWith('يرجى تحديد المهارات والقدرات')

    expect(post).not.toHaveBeenCalled()
  })

  it('does not even try to send an incomplete form (the browser blocks empty required fields)', async () => {
    const user = await openForm()
    await user.type(fields().title, 'محاسب')
    await user.click(screen.getByRole('button', { name: 'تقديم الطلب' }))

    expect(post).not.toHaveBeenCalled()
  })

  it('submits every detailed field, composes request_type for older consumers, then reloads and resets', async () => {
    const user = await openForm()
    await user.selectOptions(screen.getByRole('combobox'), 'استبدال')
    await user.type(fields().title, '  محاسب  ')
    await user.type(fields().duties, 'إعداد التقارير')
    await user.type(fields().skills, 'خبرة سنتين')
    await user.click(screen.getByRole('button', { name: 'تقديم الطلب' }))

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    expect(post).toHaveBeenCalledWith('/admin/hr-requests', {
      employment_type: 'استبدال',
      job_title: 'محاسب',
      request_type: 'محاسب (استبدال)',
      required_count: 1,
      qualification: null, // optional and left empty
      responsibilities: 'إعداد التقارير',
      skills_and_specs: 'خبرة سنتين',
      notes: null,
    })
    expect(toastSuccess).toHaveBeenCalledWith('تم تقديم الطلب بنجاح')
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2)) // the list is refreshed
    expect(screen.queryByPlaceholderText(/المهام والمسؤوليات الرئيسية/)).not.toBeInTheDocument() // the form closed
  })

  it('sends the optional qualification and notes when given', async () => {
    const user = await openForm()
    await user.type(fields().title, 'مبرمج')
    await user.type(fields().qualification, 'بكالوريوس حاسب')
    await user.type(fields().duties, 'تطوير المنصة')
    await user.type(fields().skills, 'React')
    await user.type(fields().notes, 'عاجل')
    await user.click(screen.getByRole('button', { name: 'تقديم الطلب' }))

    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(post.mock.calls[0][1]).toMatchObject({ employment_type: 'وظيفة شاغرة', qualification: 'بكالوريوس حاسب', notes: 'عاجل' })
  })

  it('shows the server\'s own message when the request is refused and keeps the form open', async () => {
    post.mockRejectedValue(Object.assign(new Error('422'), { isAxiosError: true, response: { data: { message: 'العدد المطلوب غير صالح' } } }))
    const user = await openForm()
    await user.type(fields().title, 'محاسب')
    await user.type(fields().duties, 'مهام')
    await user.type(fields().skills, 'مهارات')
    await user.click(screen.getByRole('button', { name: 'تقديم الطلب' }))

    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(screen.getByPlaceholderText(/المهام والمسؤوليات الرئيسية/)).toBeInTheDocument()
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it('closes without sending anything when cancelled', async () => {
    const user = await openForm()
    await user.type(fields().title, 'محاسب')
    await user.click(screen.getByRole('button', { name: 'إلغاء' }))

    expect(screen.queryByPlaceholderText(/المهام والمسؤوليات الرئيسية/)).not.toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
  })
})
