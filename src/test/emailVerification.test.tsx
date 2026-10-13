import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import apiClient from '@/api/axios'
import toast from '@/lib/toast'
import {
  unwrapAdminUsersList,
  resendUserVerification,
  getResendVerificationErrorMessage,
  type AdminManagedUser,
} from '@/api/adminUsersApi'
import { UserVerifiedBadge } from '@/components/super-admin/users/UserBadges'
import { ResendVerificationButton } from '@/components/super-admin/users/ResendVerificationButton'
import VerifyEmail from '@/pages/VerifyEmail'
import { parseVerifyEmailStatus } from '@/pages/verifyEmailStatus'

vi.mock('@/api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))
vi.mock('@/lib/toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() },
}))

const authState: { user: { id: number; role: string } | null } = { user: null }
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: authState.user }) }))
vi.mock('@/components/public/PublicSeo', () => ({ default: () => null }))

const mockedApi = vi.mocked(apiClient, true)

function axiosErr(status: number, data?: unknown): unknown {
  return { isAxiosError: true, name: 'AxiosError', message: 'x', config: {}, response: { status, data } }
}

function user(over: Partial<AdminManagedUser> = {}): AdminManagedUser {
  return {
    id: 7,
    name: 'سارة',
    email: 'sara@emc.test',
    role: 'student',
    email_verified: false,
    email_verified_at: null,
    can_resend_verification: true,
    ...over,
  } as AdminManagedUser
}

function renderResult(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/verify-email${search}`]}>
      <VerifyEmail />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  authState.user = null
})

describe('admin badges', () => {
  it('shows «موثّق» for a verified user', () => {
    render(<UserVerifiedBadge user={user({ email_verified: true, email_verified_at: '2026-10-01T10:00:00Z', can_resend_verification: false })} />)
    expect(screen.getByText('موثّق')).toBeTruthy()
  })

  it('shows «غير موثّق» for an unverified user', () => {
    render(<UserVerifiedBadge user={user()} />)
    expect(screen.getByText('غير موثّق')).toBeTruthy()
  })

  it('reads the new backend fields, and a bare boolean can never become a bogus date', () => {
    const [verified, unverified, boolOnly] = unwrapAdminUsersList([{ id: 1, name: 'a', email: 'a@x.co', role: 'student', email_verified: true, email_verified_at: '2026-10-01T10:00:00Z', can_resend_verification: false }, { id: 2, name: 'b', email: 'b@x.co', role: 'student', email_verified: false, email_verified_at: null, can_resend_verification: true }, { id: 3, name: 'c', email: 'c@x.co', role: 'student', email_verified: true }])

    expect(verified.email_verified).toBe(true)
    expect(unverified.email_verified).toBe(false)
    expect(unverified.can_resend_verification).toBe(true)
    expect(boolOnly.email_verified_at).toBeNull()
    render(<UserVerifiedBadge user={boolOnly} />)
    expect(screen.getByText('موثّق')).toBeTruthy()
  })
})

describe('resend button', () => {
  it('is shown only for an unverified user the backend allows a resend for', () => {
    const { rerender, container } = render(<ResendVerificationButton user={user()} />)
    expect(screen.getByRole('button', { name: 'إعادة إرسال رسالة التوثيق' })).toBeTruthy()

    rerender(<ResendVerificationButton user={user({ email_verified: true, email_verified_at: '2026-10-01T10:00:00Z' })} />)
    expect(container.querySelector('button')).toBeNull()

    rerender(<ResendVerificationButton user={user({ can_resend_verification: false })} />)
    expect(container.querySelector('button')).toBeNull()
  })

  it('calls the resend endpoint, shows loading, then the success toast', async () => {
    let release: (v: unknown) => void = () => {}
    mockedApi.post.mockReturnValue(new Promise((r) => (release = r)) as never)
    const onSent = vi.fn()
    render(<ResendVerificationButton user={user({ id: 12 })} onSent={onSent} />)

    await userEvent.click(screen.getByRole('button', { name: 'إعادة إرسال رسالة التوثيق' }))

    expect(mockedApi.post).toHaveBeenCalledWith('/admin/users/12/resend-verification', {}, { skipErrorToast: true })
    const busy = screen.getByRole('button')
    expect((busy as HTMLButtonElement).disabled).toBe(true)
    expect(busy.getAttribute('aria-busy')).toBe('true')

    release({ data: { success: true, message: 'تم إرسال رسالة توثيق البريد الإلكتروني.' } })
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('تم إرسال رسالة توثيق البريد الإلكتروني.'))
    expect(onSent).toHaveBeenCalledTimes(1)
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(false)
  })

  it('does not fire twice on a double click', async () => {
    mockedApi.post.mockReturnValue(new Promise(() => {}) as never)
    render(<ResendVerificationButton user={user()} />)
    const btn = screen.getByRole('button')

    await userEvent.dblClick(btn)

    expect(mockedApi.post).toHaveBeenCalledTimes(1)
  })

  it('shows the backend Arabic message for a rate limit, and a generic one otherwise', async () => {
    mockedApi.post.mockRejectedValueOnce(axiosErr(429, { message: 'تم إرسال رسالة توثيق مؤخرًا. يمكنك المحاولة مجددًا بعد 42 ثانية.' }))
    render(<ResendVerificationButton user={user()} />)
    await userEvent.click(screen.getByRole('button'))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('تم إرسال رسالة توثيق مؤخرًا. يمكنك المحاولة مجددًا بعد 42 ثانية.'))
    expect(toast.success).not.toHaveBeenCalled()

    mockedApi.post.mockRejectedValueOnce(axiosErr(500, {}))
    await userEvent.click(screen.getByRole('button'))
    await waitFor(() => expect(toast.error).toHaveBeenLastCalledWith('تعذّر إرسال رسالة التوثيق. حاول مرة أخرى.'))
  })

  it('maps each refusal to a sensible message', () => {
    expect(getResendVerificationErrorMessage(axiosErr(409, { message: 'البريد الإلكتروني موثّق مسبقًا.' }))).toBe('البريد الإلكتروني موثّق مسبقًا.')
    expect(getResendVerificationErrorMessage(axiosErr(404, {}))).toBe('المستخدم غير موجود.')
    expect(getResendVerificationErrorMessage(new Error('network'))).toBe('تعذّر إرسال رسالة التوثيق. حاول مرة أخرى.')
  })

  it('the API helper falls back to the standard success text', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: {} } as never)
    await expect(resendUserVerification(3)).resolves.toEqual({ message: 'تم إرسال رسالة توثيق البريد الإلكتروني.' })
  })
})

describe('verification result page', () => {
  it('success → message and a login button when signed out', () => {
    renderResult('?status=success')
    expect(screen.getByText('تم توثيق بريدك الإلكتروني بنجاح.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'تسجيل الدخول' }).getAttribute('href')).toBe('/login')
  })

  it('success → a dashboard button when signed in', () => {
    authState.user = { id: 1, role: 'student' }
    renderResult('?status=success')
    const link = screen.getByRole('link', { name: 'الانتقال إلى لوحة التحكم' })
    expect(link.getAttribute('href')).toMatch(/^\/dashboard/)
  })

  it('already verified → its own message', () => {
    renderResult('?status=already')
    expect(screen.getByText('بريدك الإلكتروني موثّق مسبقًا.')).toBeTruthy()
  })

  it('invalid and expired → the same Arabic message, and signed-out visitors get login + support, not a resend', () => {
    for (const status of ['invalid', 'expired']) {
      const { unmount } = renderResult(`?status=${status}`)
      expect(screen.getByText('رابط التوثيق غير صالح أو انتهت صلاحيته.')).toBeTruthy()
      expect(screen.queryByRole('button', { name: 'طلب رابط جديد' })).toBeNull()
      expect(screen.getByRole('link', { name: 'تواصل مع الدعم' }).getAttribute('href')).toBe('/contact')
      unmount()
    }
  })

  it('invalid while signed in → «طلب رابط جديد» asks for a new link', async () => {
    authState.user = { id: 1, role: 'student' }
    mockedApi.post.mockResolvedValueOnce({ data: { message: 'تم إرسال رسالة توثيق البريد الإلكتروني.' } } as never)
    renderResult('?status=expired')

    await userEvent.click(screen.getByRole('button', { name: 'طلب رابط جديد' }))

    expect(mockedApi.post).toHaveBeenCalledWith('/auth/email/resend', {}, { skipErrorToast: true })
    await waitFor(() => expect(toast.success).toHaveBeenCalled())
    expect(screen.getByText('تم إرسال رابط جديد إلى بريدك الإلكتروني.')).toBeTruthy()
  })

  it('a missing or unknown status is treated as an invalid link, never as success', () => {
    expect(parseVerifyEmailStatus(null)).toBe('invalid')
    expect(parseVerifyEmailStatus('verified')).toBe('invalid')
    expect(parseVerifyEmailStatus('<script>')).toBe('invalid')
    renderResult('?status=pwned&id=5&email=a@b.co')
    expect(screen.getByText('رابط التوثيق غير صالح أو انتهت صلاحيته.')).toBeTruthy()
    expect(document.body.textContent).not.toContain('a@b.co')
  })

  it('renders right-to-left', () => {
    const { container } = renderResult('?status=success')
    expect(container.querySelector('[dir="rtl"]')).not.toBeNull()
  })
})
