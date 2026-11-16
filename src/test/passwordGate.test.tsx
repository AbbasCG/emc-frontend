import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import ProtectedRoute from '@/components/ProtectedRoute'
import ChangePasswordRequired from '@/pages/ChangePasswordRequired'
import { PASSWORD_CHANGE_PATH } from '@/lib/passwordChangeGate'
import { normalizeAuthLoginPayload, normalizeAuthUser } from '@/utils/userIdentity'
import * as authApi from '@/api/authApi'
import type { User } from '@/types'
import { axeCheck } from './axe'

const auth = vi.hoisted(() => ({
  value: {
    user: null as unknown,
    isAuthenticated: true,
    isLoading: false,
    isImpersonating: false,
    logout: vi.fn(),
    refreshUser: vi.fn(),
  },
}))

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth.value }))
vi.mock('@/api/authApi', async (importActual) => {
  const actual = await importActual<typeof import('@/api/authApi')>()
  return { ...actual, changePassword: vi.fn() }
})

const changePassword = vi.mocked(authApi.changePassword)

function makeUser(over: Partial<User> = {}): User {
  return { id: 5, name: 'علي حسن', email: 'ali@example.com', role: 'volunteer', ...over }
}

function setAuth(over: Partial<typeof auth.value>) {
  auth.value = { user: makeUser(), isAuthenticated: true, isLoading: false, isImpersonating: false, logout: vi.fn(), refreshUser: vi.fn(), ...over }
}

function Where() {
  const loc = useLocation()
  return <p data-testid="where">{loc.pathname}</p>
}

function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<p>login page</p>} />
        <Route element={<ProtectedRoute />}>
          <Route path={PASSWORD_CHANGE_PATH} element={<><Where /><ChangePasswordRequired /></>} />
          <Route path="/dashboard/*" element={<><Where /><p>dashboard shell</p></>} />
          <Route path="/dashboard/ops/volunteers" element={<><Where /><p>volunteer home</p></>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  setAuth({})
})

/* ── data layer ─────────────────────────────────────────────────────── */

describe('must_change_password in the auth user', () => {
  it('is read from /auth/me style payloads, in every shape the server may use', () => {
    expect(normalizeAuthUser({ data: { id: 1, name: 'س', email: 'a@b.co', must_change_password: true } }).must_change_password).toBe(true)
    expect(normalizeAuthUser({ id: 1, name: 'س', email: 'a@b.co', must_change_password: 1 }).must_change_password).toBe(true)
    expect(normalizeAuthUser({ id: 1, name: 'س', email: 'a@b.co', must_change_password: false }).must_change_password).toBe(false)
    // sibling of `user`
    expect(normalizeAuthUser({ user: { id: 1, name: 'س', email: 'a@b.co' }, must_change_password: true }).must_change_password).toBe(true)
  })

  it('is absent (never a forced gate) when the server says nothing', () => {
    expect(normalizeAuthUser({ id: 1, name: 'س', email: 'a@b.co' }).must_change_password).toBeUndefined()
  })

  it('survives a login payload and a JSON round-trip through the cached user', () => {
    const { user } = normalizeAuthLoginPayload({ data: { token: 't', user: { id: 1, name: 'س', email: 'a@b.co', must_change_password: true } } })
    expect(user.must_change_password).toBe(true)
    expect(normalizeAuthUser(JSON.parse(JSON.stringify(user))).must_change_password).toBe(true)
  })
})

/* ── router guard ───────────────────────────────────────────────────── */

describe('ProtectedRoute: the forced password change', () => {
  it('sends a flagged user from ANY protected route to the change-password page, without the dashboard shell', async () => {
    setAuth({ user: makeUser({ must_change_password: true }) })
    renderApp('/dashboard/anything/deep')

    expect(await screen.findByRole('heading', { name: 'اختر كلمة مرور جديدة' })).toBeInTheDocument()
    expect(screen.getByTestId('where')).toHaveTextContent(PASSWORD_CHANGE_PATH)
    expect(screen.queryByText('dashboard shell')).not.toBeInTheDocument()
  })

  it('keeps a flagged user on the page (no redirect loop)', async () => {
    setAuth({ user: makeUser({ must_change_password: true }) })
    renderApp(PASSWORD_CHANGE_PATH)

    expect(await screen.findByRole('heading', { name: 'اختر كلمة مرور جديدة' })).toBeInTheDocument()
    expect(screen.getByTestId('where')).toHaveTextContent(PASSWORD_CHANGE_PATH)
  })

  it('lets an ordinary user through, and bounces them away from the page to their role home', async () => {
    renderApp('/dashboard/x')
    expect(await screen.findByText('dashboard shell')).toBeInTheDocument()
  })

  it('a user who is not flagged cannot sit on the page: they land on their role home', async () => {
    renderApp(PASSWORD_CHANGE_PATH)

    expect(await screen.findByText('volunteer home')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'اختر كلمة مرور جديدة' })).not.toBeInTheDocument()
  })

  it('does NOT gate a super admin who is previewing a flagged user (the server skips the gate for impersonation)', async () => {
    setAuth({ user: makeUser({ must_change_password: true }), isImpersonating: true })
    renderApp('/dashboard/anything/deep')

    expect(await screen.findByText('dashboard shell')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'اختر كلمة مرور جديدة' })).not.toBeInTheDocument()
  })

  it('while impersonating, the change-password page itself bounces to the home (nothing to change for the admin)', async () => {
    setAuth({ user: makeUser({ must_change_password: true }), isImpersonating: true })
    renderApp(PASSWORD_CHANGE_PATH)

    expect(await screen.findByText('volunteer home')).toBeInTheDocument()
  })

  it('still sends an anonymous visitor to /login, flagged or not', async () => {
    setAuth({ user: null, isAuthenticated: false })
    renderApp('/dashboard/x')
    expect(await screen.findByText('login page')).toBeInTheDocument()
  })
})

/* ── the page ───────────────────────────────────────────────────────── */

describe('ChangePasswordRequired page', () => {
  const NEW = 'NewPass-2026'

  function renderPage() {
    setAuth({ user: makeUser({ must_change_password: true }) })
    return renderApp(PASSWORD_CHANGE_PATH)
  }

  /** What AuthProvider.refreshUser does: the fresh /auth/me user replaces the session user. */
  function refreshesTo(fresh: User) {
    auth.value.refreshUser.mockImplementationOnce(async () => {
      auth.value.user = fresh
      return fresh
    })
  }

  const field = (name: string) => screen.getByLabelText(name, { selector: 'input' })

  async function fillValid() {
    await userEvent.type(field('كلمة المرور المؤقتة'), 'Temp-1234')
    await userEvent.type(field('كلمة المرور الجديدة'), NEW)
    await userEvent.type(field('تأكيد كلمة المرور الجديدة'), NEW)
  }

  it('is an accessible Arabic RTL form with a logout button and no navigation shell', async () => {
    const { container } = renderPage()

    expect(await screen.findByRole('main')).toHaveAttribute('dir', 'rtl')
    expect(screen.getByText(/كلمة مرور مؤقتة/)).toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    expect(await axeCheck(container)).toHaveNoViolations()

    await userEvent.click(screen.getByRole('button', { name: 'تسجيل الخروج' }))
    expect(auth.value.logout).toHaveBeenCalledTimes(1)
  })

  it('validates in the browser: the button stays off until the form is valid, with the same 8-character rule', async () => {
    renderPage()
    const submit = await screen.findByRole('button', { name: 'حفظ كلمة المرور والمتابعة' })
    expect(submit).toBeDisabled()

    await userEvent.type(field('كلمة المرور المؤقتة'), 'Temp-1234')
    await userEvent.type(field('كلمة المرور الجديدة'), 'short')
    expect(screen.getByRole('alert')).toHaveTextContent('لا تقل عن 8 أحرف')
    expect(submit).toBeDisabled()

    await userEvent.clear(field('كلمة المرور الجديدة'))
    await userEvent.type(field('كلمة المرور الجديدة'), NEW)
    await userEvent.type(field('تأكيد كلمة المرور الجديدة'), 'different')
    await userEvent.tab()
    expect(screen.getByText('تأكيد كلمة المرور غير مطابق.')).toBeInTheDocument()
    expect(submit).toBeDisabled()

    await userEvent.clear(field('تأكيد كلمة المرور الجديدة'))
    await userEvent.type(field('تأكيد كلمة المرور الجديدة'), NEW)
    expect(submit).toBeEnabled()
  })

  it('shows a strength hint while typing', async () => {
    renderPage()
    await userEvent.type(await screen.findByLabelText('كلمة المرور الجديدة', { selector: 'input' }), 'abcdefgh')
    expect(screen.getByText('كلمة مرور ضعيفة')).toBeInTheDocument()
    await userEvent.clear(field('كلمة المرور الجديدة'))
    await userEvent.type(field('كلمة المرور الجديدة'), 'Str0ng!Passw0rd#')
    expect(screen.getByText('كلمة مرور قوية')).toBeInTheDocument()
  })

  it('has show/hide toggles per field', async () => {
    renderPage()
    const input = await screen.findByLabelText('كلمة المرور المؤقتة', { selector: 'input' })
    expect(input).toHaveAttribute('type', 'password')

    const toggle = screen.getByRole('button', { name: 'إظهار كلمة المرور المؤقتة' })
    await userEvent.click(toggle)

    expect(input).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'إخفاء كلمة المرور المؤقتة' })).toHaveAttribute('aria-pressed', 'true')
    // the others stay hidden
    expect(field('كلمة المرور الجديدة')).toHaveAttribute('type', 'password')
  })

  it('success: sends the three fields, refreshes the user from /auth/me and goes to the role landing page', async () => {
    renderPage()
    changePassword.mockResolvedValueOnce(undefined)
    refreshesTo(makeUser({ must_change_password: false }))
    await fillValid()

    await userEvent.click(screen.getByRole('button', { name: 'حفظ كلمة المرور والمتابعة' }))

    expect(changePassword).toHaveBeenCalledWith({ current_password: 'Temp-1234', password: NEW, password_confirmation: NEW })
    expect(auth.value.refreshUser).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('volunteer home')).toBeInTheDocument()
  })

  it('double-clicking submit sends one request', async () => {
    renderPage()
    let finish!: () => void
    changePassword.mockReturnValueOnce(new Promise<void>((resolve) => { finish = resolve }))
    refreshesTo(makeUser({ must_change_password: false }))
    await fillValid()

    const submit = screen.getByRole('button', { name: 'حفظ كلمة المرور والمتابعة' })
    await userEvent.click(submit)
    expect(submit).toBeDisabled()
    await userEvent.click(submit)
    expect(changePassword).toHaveBeenCalledTimes(1)

    finish()
    await screen.findByText('volunteer home')
  })

  it('422 on the temporary password shows under that field and leaves the user on the page', async () => {
    renderPage()
    changePassword.mockRejectedValueOnce(
      new AxiosError('x', '422', undefined, undefined, {
        status: 422, statusText: '', headers: {}, config: {} as InternalAxiosRequestConfig,
        data: { errors: { current_password: ['كلمة المرور الحالية غير صحيحة.'] } },
      }),
    )
    await fillValid()

    await userEvent.click(screen.getByRole('button', { name: 'حفظ كلمة المرور والمتابعة' }))

    expect(await screen.findByText('كلمة المرور الحالية غير صحيحة.')).toBeInTheDocument()
    expect(field('كلمة المرور المؤقتة')).toHaveAttribute('aria-invalid', 'true')
    expect(auth.value.refreshUser).not.toHaveBeenCalled()
    expect(screen.getByTestId('where')).toHaveTextContent(PASSWORD_CHANGE_PATH)

    // editing the field clears its server error
    await userEvent.type(field('كلمة المرور المؤقتة'), 'x')
    expect(screen.queryByText('كلمة المرور الحالية غير صحيحة.')).not.toBeInTheDocument()
  })

  it('422 on a weak new password shows under the new-password field', async () => {
    renderPage()
    changePassword.mockRejectedValueOnce(
      new AxiosError('x', '422', undefined, undefined, {
        status: 422, statusText: '', headers: {}, config: {} as InternalAxiosRequestConfig,
        data: { errors: { password: ['كلمة المرور ضعيفة جدًا.'] } },
      }),
    )
    await fillValid()

    await userEvent.click(screen.getByRole('button', { name: 'حفظ كلمة المرور والمتابعة' }))

    expect(await screen.findByText('كلمة المرور ضعيفة جدًا.')).toBeInTheDocument()
    expect(field('كلمة المرور الجديدة')).toHaveAttribute('aria-invalid', 'true')
  })

  it('a non-field failure shows one banner message', async () => {
    renderPage()
    changePassword.mockRejectedValueOnce(new Error('Network Error'))
    await fillValid()

    await userEvent.click(screen.getByRole('button', { name: 'حفظ كلمة المرور والمتابعة' }))

    await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThan(0))
    expect(screen.getByTestId('where')).toHaveTextContent(PASSWORD_CHANGE_PATH)
  })

  it('does not let the user leave if /auth/me still reports the flag, or cannot be read', async () => {
    renderPage()
    changePassword.mockResolvedValueOnce(undefined)
    auth.value.refreshUser.mockResolvedValueOnce(null)
    await fillValid()

    await userEvent.click(screen.getByRole('button', { name: 'حفظ كلمة المرور والمتابعة' }))

    expect(await screen.findByText(/تعذّر تحديث الجلسة/)).toBeInTheDocument()
    expect(screen.queryByText('volunteer home')).not.toBeInTheDocument()
  })
})

/* ── axios layer ────────────────────────────────────────────────────── */

describe('axios: 403 PASSWORD_CHANGE_REQUIRED', () => {
  const realLocation = window.location
  let assign: ReturnType<typeof vi.fn>
  let toastError: ReturnType<typeof vi.fn>
  let toastWarning: ReturnType<typeof vi.fn>

  function stubLocation(pathname: string) {
    assign = vi.fn()
    vi.stubGlobal('location', { ...realLocation, pathname, search: '', href: `http://localhost${pathname}`, assign })
  }

  async function freshClient() {
    vi.resetModules()
    toastError = vi.fn()
    toastWarning = vi.fn()
    vi.doMock('@/lib/toast', () => ({ default: { error: toastError, warning: toastWarning, success: vi.fn(), message: vi.fn() } }))
    const { default: client } = await import('@/api/axios')
    return client
  }

  function failWith(status: number, data: unknown): AxiosAdapter {
    return (config) =>
      Promise.reject(
        new AxiosError('failed', String(status), config as InternalAxiosRequestConfig, undefined, {
          status, statusText: '', headers: {}, config: config as InternalAxiosRequestConfig, data,
        }),
      )
  }

  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    localStorage.setItem('emc_token', 'signed-in-token')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.doUnmock('@/lib/toast')
    localStorage.clear()
  })

  it('redirects to the change-password page, remembers the flag in the cached user, and shows no error toast', async () => {
    stubLocation('/dashboard/ops/volunteers')
    localStorage.setItem('emc_user', JSON.stringify({ id: 5, name: 'علي', email: 'a@b.co' }))
    const client = await freshClient()
    client.defaults.adapter = failWith(403, { success: false, code: 'PASSWORD_CHANGE_REQUIRED', message: 'غيّر كلمة المرور' })

    await expect(client.get('/operations/volunteers/hub')).rejects.toBeDefined()

    expect(assign).toHaveBeenCalledTimes(1)
    expect(assign).toHaveBeenCalledWith(PASSWORD_CHANGE_PATH)
    expect(toastError).not.toHaveBeenCalled()
    expect(toastWarning).not.toHaveBeenCalled()
    expect(JSON.parse(localStorage.getItem('emc_user') ?? '{}').must_change_password).toBe(true)
  })

  it('a burst of failing calls redirects once (no storm)', async () => {
    stubLocation('/dashboard')
    const client = await freshClient()
    client.defaults.adapter = failWith(403, { code: 'PASSWORD_CHANGE_REQUIRED' })

    await Promise.allSettled(Array.from({ length: 12 }, (_, i) => client.get(`/x/${i}`)))

    expect(assign).toHaveBeenCalledTimes(1)
    expect(toastError).not.toHaveBeenCalled()
    expect(toastWarning).not.toHaveBeenCalled()
  })

  it('a second redirect within 10 s of the first (a reload loop) is refused; after the cooldown it is allowed again', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    try {
      vi.setSystemTime(new Date('2026-11-16T10:00:00Z'))
      stubLocation('/dashboard')
      let client = await freshClient()
      client.defaults.adapter = failWith(403, { code: 'PASSWORD_CHANGE_REQUIRED' })
      await expect(client.get('/a')).rejects.toBeDefined()
      expect(assign).toHaveBeenCalledTimes(1)

      // the page reloaded (fresh module, same tab sessionStorage) and /auth/me disagreed: same 403 again, 3 s later
      vi.setSystemTime(new Date('2026-11-16T10:00:03Z'))
      client = await freshClient()
      client.defaults.adapter = failWith(403, { code: 'PASSWORD_CHANGE_REQUIRED' })
      await expect(client.get('/a')).rejects.toBeDefined()
      expect(assign).toHaveBeenCalledTimes(1)
      expect(toastError).not.toHaveBeenCalled()

      vi.setSystemTime(new Date('2026-11-16T10:00:20Z'))
      client = await freshClient()
      client.defaults.adapter = failWith(403, { code: 'PASSWORD_CHANGE_REQUIRED' })
      await expect(client.get('/a')).rejects.toBeDefined()
      expect(assign).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('never redirects an anonymous visitor (no token, no cookie session): there is nobody to gate', async () => {
    localStorage.clear()
    stubLocation('/login')
    const client = await freshClient()
    client.defaults.adapter = failWith(403, { code: 'PASSWORD_CHANGE_REQUIRED' })

    await expect(client.get('/courses')).rejects.toBeDefined()

    expect(assign).not.toHaveBeenCalled()
    expect(toastError).not.toHaveBeenCalled()
  })

  it('does not redirect when already on the page (no loop), and still stays quiet', async () => {
    stubLocation(PASSWORD_CHANGE_PATH)
    const client = await freshClient()
    client.defaults.adapter = failWith(403, { code: 'PASSWORD_CHANGE_REQUIRED' })

    await expect(client.get('/notifications')).rejects.toBeDefined()

    expect(assign).not.toHaveBeenCalled()
    expect(toastError).not.toHaveBeenCalled()
    expect(toastWarning).not.toHaveBeenCalled()
  })

  it('only that code triggers it: a plain 403 keeps its normal toast and does not redirect', async () => {
    stubLocation('/dashboard')
    const client = await freshClient()
    client.defaults.adapter = failWith(403, { code: 'SOMETHING_ELSE', message: 'ممنوع' })

    await expect(client.get('/admin/x')).rejects.toBeDefined()

    expect(assign).not.toHaveBeenCalled()
    expect(toastWarning).toHaveBeenCalledTimes(1)
  })
})
