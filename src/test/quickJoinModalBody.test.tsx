import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import QuickJoinModalBody from '@/components/enrollment/QuickJoinModalBody'
import type { EnrollIntent } from '@/lib/enrollIntent'

/**
 * The guest's in-place "join + enroll" flow. An account is created (or signed in), then the recorded intent is finished where the
 * visitor stands. Learning is not a role: the only refusal is the server's own "you teach this program" conflict.
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const navigate = vi.fn()
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => navigate,
}))

const registerAccount = vi.fn()
const login = vi.fn()
let auth: { user: unknown; isAuthenticated: boolean } = { user: null, isAuthenticated: false }
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ ...auth, registerAccount, login }),
}))

const submitCourseRegistration = vi.fn()
vi.mock('@/api/registrationsApi', () => ({ submitCourseRegistration: (...a: unknown[]) => submitCourseRegistration(...a) }))

const checkoutLearningPath = vi.fn()
const enrollInLearningPath = vi.fn()
vi.mock('@/api/learningPathsApi', () => ({
  checkoutLearningPath: (...a: unknown[]) => checkoutLearningPath(...a),
  enrollInLearningPath: (...a: unknown[]) => enrollInLearningPath(...a),
}))

const trackFunnelEvent = vi.fn()
vi.mock('@/lib/funnelEvents', () => ({ trackFunnelEvent: (...a: unknown[]) => trackFunnelEvent(...a) }))

const toastSuccess = vi.fn()
vi.mock('@/lib/toast', () => ({ default: { success: (...a: unknown[]) => toastSuccess(...a), error: vi.fn() } }))

const FREE_COURSE: EnrollIntent = { kind: 'course', slug: 'python-101', title: 'بايثون', isFree: true, id: 7 }
const NEW_USER = { id: 5, name: 'Mona', email: 'mona@example.test', phone: '', city: '', gender: '' }

function httpError(status: number, data: Record<string, unknown> = {}) {
  const config = { headers: {} } as InternalAxiosRequestConfig
  return new AxiosError('failed', 'ERR', config, {}, { status, data, statusText: '', headers: {}, config } as AxiosResponse)
}

function open(intent: EnrollIntent = FREE_COURSE, onClose = vi.fn()) {
  render(
    <MemoryRouter>
      <QuickJoinModalBody intent={intent} onClose={onClose} />
    </MemoryRouter>,
  )
  return onClose
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>, { name = 'Mona', email = 'mona@example.test', password = 'longenough1' } = {}) {
  if (name) await user.type(screen.getByLabelText(/quickJoin\.form\.name/), name)
  if (email) await user.type(screen.getByLabelText(/quickJoin\.form\.email/), email)
  if (password) await user.type(screen.getByLabelText(/quickJoin\.form\.password/), password)
  await user.click(screen.getByRole('button', { name: /quickJoin\.form\.registerSubmit$/ }))
}

beforeEach(() => {
  vi.clearAllMocks()
  auth = { user: null, isAuthenticated: false }
  registerAccount.mockResolvedValue({ user: NEW_USER })
  submitCourseRegistration.mockResolvedValue({})
})

describe('QuickJoinModalBody — entry', () => {
  it('shows the program being joined and the free note', () => {
    open()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('quickJoin.header.titleWithProgram')).toBeInTheDocument()
    expect(screen.getByText('quickJoin.header.freeNote')).toBeInTheDocument()
  })

  it('shows the price of a paid program', () => {
    open({ ...FREE_COURSE, isFree: false, price: 120, currency: 'USD' })
    expect(screen.getByText('120 USD')).toBeInTheDocument()
  })

  it('dismisses itself when the visitor is already signed in (a stale intent)', async () => {
    auth = { user: NEW_USER, isAuthenticated: true }
    const onClose = open()
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('closes from the close button and from Escape, but not from a click inside the panel', async () => {
    const user = userEvent.setup()
    const onClose = open()

    await user.click(screen.getByLabelText('quickJoin.close'))
    expect(onClose).toHaveBeenCalledTimes(1)

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(2)

    await user.click(screen.getByText('quickJoin.header.titleWithProgram'))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})

describe('QuickJoinModalBody — validation', () => {
  it('asks for every missing field and calls nothing', async () => {
    const user = userEvent.setup()
    open()
    await user.click(screen.getByRole('button', { name: /quickJoin\.form\.registerSubmit$/ }))

    expect(screen.getByText('quickJoin.validation.nameRequired')).toBeInTheDocument()
    expect(screen.getByText('quickJoin.validation.emailRequired')).toBeInTheDocument()
    expect(screen.getByText('quickJoin.validation.passwordRequired')).toBeInTheDocument()
    expect(registerAccount).not.toHaveBeenCalled()
    expect(trackFunnelEvent).toHaveBeenCalledWith('quickjoin_submit', expect.objectContaining({ slug: 'python-101', free: true }))
  })

  it('rejects a malformed email and a short password', async () => {
    const user = userEvent.setup()
    open()
    await fillAndSubmit(user, { email: 'not-an-email', password: 'short' })

    expect(screen.getByText('quickJoin.validation.emailInvalid')).toBeInTheDocument()
    expect(screen.getByText('quickJoin.validation.passwordMin')).toBeInTheDocument()
    expect(registerAccount).not.toHaveBeenCalled()
  })
})

describe('QuickJoinModalBody — free course', () => {
  it('creates the account with a mirrored confirmation, registers for the course and shows success', async () => {
    const user = userEvent.setup()
    open()
    await fillAndSubmit(user)

    await waitFor(() => expect(screen.getByText('quickJoin.success.titleWithProgram')).toBeInTheDocument())
    expect(registerAccount).toHaveBeenCalledWith({
      name: 'Mona',
      email: 'mona@example.test',
      password: 'longenough1',
      password_confirmation: 'longenough1',
    })
    expect(submitCourseRegistration).toHaveBeenCalledWith(expect.objectContaining({ course_id: 7, full_name: 'Mona', email: 'mona@example.test' }))
    expect(trackFunnelEvent).toHaveBeenCalledWith('quickjoin_success', { kind: 'course', slug: 'python-101' })
    expect(screen.getByRole('link', { name: /quickJoin\.success\.startLearning/ })).toBeInTheDocument()
  })

  it('treats "already registered" (409) as the same happy ending', async () => {
    submitCourseRegistration.mockRejectedValue(httpError(409))
    const user = userEvent.setup()
    open()
    await fillAndSubmit(user)

    await waitFor(() => expect(screen.getByText('quickJoin.success.titleWithProgram')).toBeInTheDocument())
  })

  it('tells an instructor of the program so in the server\'s words — never because of their account type', async () => {
    submitCourseRegistration.mockRejectedValue(httpError(403, { code: 'instructor_teaches_program', message_ar: 'أنت تدرّس هذه الدورة' }))
    const user = userEvent.setup()
    open()
    await fillAndSubmit(user)

    await waitFor(() => expect(screen.getByText('quickJoin.conflict.title')).toBeInTheDocument())
    expect(screen.getByText('أنت تدرّس هذه الدورة')).toBeInTheDocument()
    expect(screen.queryByText('quickJoin.success.titleWithProgram')).not.toBeInTheDocument()
  })

  it('sends the visitor to the course page to finish when the registration needs more', async () => {
    submitCourseRegistration.mockRejectedValue(httpError(422, { message: 'missing profile fields' }))
    const user = userEvent.setup()
    open()
    await fillAndSubmit(user)

    await waitFor(() => expect(screen.getByText('quickJoin.partial.title')).toBeInTheDocument())
    expect(screen.getByRole('link', { name: /quickJoin\.partial\.complete/ })).toHaveAttribute('href', '/courses/python-101/register')
  })

  it('hands a free course without an id to the register page', async () => {
    const user = userEvent.setup()
    const onClose = open({ ...FREE_COURSE, id: undefined })
    await fillAndSubmit(user)

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/courses/python-101/register'))
    expect(onClose).toHaveBeenCalled()
    expect(submitCourseRegistration).not.toHaveBeenCalled()
  })
})

describe('QuickJoinModalBody — paid course', () => {
  it('creates the account, then leaves payment to the course page with a toast', async () => {
    const user = userEvent.setup()
    const onClose = open({ ...FREE_COURSE, isFree: false, price: 50, currency: 'EUR' })
    await fillAndSubmit(user)

    await waitFor(() => expect(navigate).toHaveBeenCalled())
    expect(onClose).toHaveBeenCalled()
    expect(toastSuccess).toHaveBeenCalledWith('quickJoin.paidToast.title', { description: 'quickJoin.paidToast.description' })
    expect(submitCourseRegistration).not.toHaveBeenCalled()
  })
})

describe('QuickJoinModalBody — learning path', () => {
  const FREE_PATH: EnrollIntent = { kind: 'path', slug: 'data-path', title: 'مسار البيانات', isFree: true, id: 3 }

  it('enrolls in a free path and links into it', async () => {
    enrollInLearningPath.mockResolvedValue({ success: true })
    const user = userEvent.setup()
    open(FREE_PATH)
    await fillAndSubmit(user)

    await waitFor(() => expect(screen.getByText('quickJoin.success.titleWithProgram')).toBeInTheDocument())
    expect(enrollInLearningPath).toHaveBeenCalledWith('data-path')
    expect(screen.getByRole('link', { name: /quickJoin\.success\.startLearning/ })).toHaveAttribute('href', '/dashboard/student/learning-paths/3')
  })

  it('falls back to the path page when the enrollment is not confirmed', async () => {
    enrollInLearningPath.mockResolvedValue({ success: false, enrolled: false })
    const user = userEvent.setup()
    open(FREE_PATH)
    await fillAndSubmit(user)

    await waitFor(() => expect(screen.getByRole('link', { name: /quickJoin\.partial\.complete/ })).toHaveAttribute('href', '/learning-paths/data-path'))
  })

  it('reports the instructor conflict for a path too', async () => {
    enrollInLearningPath.mockRejectedValue(httpError(403, { code: 'instructor_teaches_program', message_ar: 'تدرّس هذا المسار' }))
    const user = userEvent.setup()
    open(FREE_PATH)
    await fillAndSubmit(user)

    await waitFor(() => expect(screen.getByText('تدرّس هذا المسار')).toBeInTheDocument())
  })

  it('goes to the payment page for a paid path', async () => {
    checkoutLearningPath.mockResolvedValue({ checkout_url: 'https://pay.example.test/session' })
    const assign = vi.fn()
    Object.defineProperty(window, 'location', { value: { ...window.location, assign }, configurable: true })
    const user = userEvent.setup()
    open({ ...FREE_PATH, isFree: false, price: 90 })
    await fillAndSubmit(user)

    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://pay.example.test/session'))
  })

  it('falls back to the path page when checkout returns no payment link', async () => {
    checkoutLearningPath.mockResolvedValue({})
    const user = userEvent.setup()
    open({ ...FREE_PATH, isFree: false, price: 90 })
    await fillAndSubmit(user)

    await waitFor(() => expect(screen.getByText('quickJoin.partial.title')).toBeInTheDocument())
  })
})

describe('QuickJoinModalBody — server-driven fields and failures', () => {
  it('reveals only the extra fields the server names, and records which', async () => {
    registerAccount.mockRejectedValueOnce(httpError(422, { errors: { phone: ['The phone field is required.'], city: ['The city field is required.'] } }))
    const user = userEvent.setup()
    open()
    await fillAndSubmit(user)

    await waitFor(() => expect(screen.getByLabelText(/quickJoin\.form\.city/)).toBeInTheDocument())
    expect(screen.getByText('quickJoin.form.phone')).toBeInTheDocument()
    expect(screen.getByText('quickJoin.form.country')).toBeInTheDocument()
    expect(screen.queryByText('quickJoin.form.gender')).not.toBeInTheDocument()
    expect(trackFunnelEvent).toHaveBeenCalledWith('quickjoin_fields_expanded', expect.objectContaining({ fields: 'phone,city' }))
  })

  it('shows a general error and keeps the form when registration fails without field errors', async () => {
    registerAccount.mockRejectedValueOnce(httpError(500))
    const user = userEvent.setup()
    open()
    await fillAndSubmit(user)

    await waitFor(() => expect(screen.getByRole('button', { name: /quickJoin\.form\.registerSubmit$/ })).toBeEnabled())
    expect(submitCourseRegistration).not.toHaveBeenCalled()
    expect(screen.queryByText('quickJoin.success.titleWithProgram')).not.toBeInTheDocument()
  })
})

describe('QuickJoinModalBody — existing account', () => {
  it('signs in instead and finishes the same intent', async () => {
    login.mockResolvedValue({ user: NEW_USER })
    const user = userEvent.setup()
    open()

    await user.click(screen.getByRole('button', { name: /quickJoin\.form\.switchToLogin/ }))
    await user.type(screen.getByLabelText(/quickJoin\.form\.email/), 'mona@example.test')
    await user.type(screen.getByLabelText(/quickJoin\.form\.password/), 'longenough1')
    await user.click(screen.getByRole('button', { name: /quickJoin\.form\.loginSubmit$/ }))

    await waitFor(() => expect(screen.getByText('quickJoin.success.titleWithProgram')).toBeInTheDocument())
    expect(login).toHaveBeenCalledWith('mona@example.test', 'longenough1')
    expect(registerAccount).not.toHaveBeenCalled()
  })

  it('asks for the missing credentials before calling the server', async () => {
    const user = userEvent.setup()
    open()
    await user.click(screen.getByRole('button', { name: /quickJoin\.form\.switchToLogin/ }))
    await user.click(screen.getByRole('button', { name: /quickJoin\.form\.loginSubmit$/ }))

    expect(screen.getByText('quickJoin.validation.emailRequired')).toBeInTheDocument()
    expect(screen.getByText('quickJoin.validation.passwordRequired')).toBeInTheDocument()
    expect(login).not.toHaveBeenCalled()
  })

  it('reports a failed sign-in without leaving the form', async () => {
    login.mockRejectedValueOnce(httpError(401, { message: 'bad credentials' }))
    const user = userEvent.setup()
    open()
    await user.click(screen.getByRole('button', { name: /quickJoin\.form\.switchToLogin/ }))
    await user.type(screen.getByLabelText(/quickJoin\.form\.email/), 'mona@example.test')
    await user.type(screen.getByLabelText(/quickJoin\.form\.password/), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /quickJoin\.form\.loginSubmit$/ }))

    await waitFor(() => expect(screen.getByRole('button', { name: /quickJoin\.form\.loginSubmit$/ })).toBeEnabled())
    expect(screen.queryByText('quickJoin.success.titleWithProgram')).not.toBeInTheDocument()
  })
})
