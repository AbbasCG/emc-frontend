import { useState } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth, TOKEN_KEY, USER_KEY } from '@/contexts/AuthContext'
import * as authApi from '@/api/authApi'
import toast from '@/lib/toast'
import {
  IMPERSONATION_ACTIVE_KEY,
  IMPERSONATION_ORIGINAL_TOKEN_KEY,
  IMPERSONATION_ORIGINAL_USER_KEY,
  SESSION_HINT_KEY,
} from '@/lib/impersonationSession'
import type { User } from '@/types'

vi.mock('@/api/authApi', () => ({
  login: vi.fn(),
  registerAccount: vi.fn(),
  fetchMe: vi.fn(),
  postImpersonateUser: vi.fn(),
  postImpersonateStop: vi.fn(),
  logoutRemote: vi.fn(),
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
}))

vi.mock('@/lib/toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() },
}))

const mockedLogin = vi.mocked(authApi.login)
const mockedRegister = vi.mocked(authApi.registerAccount)
const mockedFetchMe = vi.mocked(authApi.fetchMe)
const mockedImpersonate = vi.mocked(authApi.postImpersonateUser)
const mockedImpersonateStop = vi.mocked(authApi.postImpersonateStop)
const mockedLogoutRemote = vi.mocked(authApi.logoutRemote)

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 41,
    name: 'سارة المطيري',
    email: 'sara@emc.test',
    role: 'student',
    ...overrides,
  }
}

const REGISTER_INPUT = {
  name: 'خالد العتيبي',
  email: 'khaled@emc.test',
  password: 'Secret123!',
  password_confirmation: 'Secret123!',
  country_code: 'SA',
  phone_country_code: '+966',
  phone: '500000000',
  city: 'الرياض',
  gender: 'male',
}

/** Reads the persisted `emc_user` blob back as an object (null when absent/unparsable). */
function storedUser(): Record<string, unknown> | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
}

function Harness() {
  const auth = useAuth()
  const [error, setError] = useState('none')
  const [refreshed, setRefreshed] = useState('none')

  function run(work: () => Promise<unknown>) {
    setError('none')
    work().catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }

  return (
    <div>
      <p>{`loading: ${auth.isLoading}`}</p>
      <p>{`authenticated: ${auth.isAuthenticated}`}</p>
      <p>{`user: ${auth.user?.name ?? 'none'}`}</p>
      <p>{`token: ${auth.token ?? 'none'}`}</p>
      <p>{`impersonating: ${auth.isImpersonating}`}</p>
      <p>{`original: ${auth.impersonationOriginalUser?.name ?? 'none'}`}</p>
      <p>{`error: ${error}`}</p>
      <p>{`refreshed: ${refreshed}`}</p>
      <button onClick={() => run(() => auth.login('sara@emc.test', 'pw'))}>login</button>
      <button onClick={() => run(() => auth.registerAccount(REGISTER_INPUT))}>register</button>
      <button onClick={() => auth.logout()}>logout</button>
      <button
        onClick={() =>
          run(async () => {
            const fresh = await auth.refreshUser()
            setRefreshed(fresh?.name ?? 'null')
          })
        }
      >
        refresh
      </button>
      <button onClick={() => run(() => auth.startImpersonationPreview(77))}>start-preview</button>
      <button onClick={() => run(() => auth.stopImpersonationPreview())}>stop-preview</button>
    </div>
  )
}

function renderAuth() {
  return render(
    <AuthProvider>
      <Harness />
    </AuthProvider>,
  )
}

const click = (name: string) => userEvent.click(screen.getByRole('button', { name }))

let assignSpy: ReturnType<typeof vi.fn>
const realLocation = window.location

beforeEach(() => {
  // resetAllMocks (not clearAllMocks) so queued `mockResolvedValueOnce` / persistent
  // implementations from a previous test can never leak into the next one.
  vi.resetAllMocks()
  localStorage.clear()
  sessionStorage.clear()
  assignSpy = vi.fn()
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { href: 'http://localhost/dashboard', pathname: '/dashboard', assign: assignSpy },
  })
})

afterEach(() => {
  Object.defineProperty(window, 'location', { configurable: true, value: realLocation })
})

describe('AuthProvider — إقلاع الجلسة من التخزين المحلي', () => {
  it('لا يستدعي /auth/me ولا يعرض حالة تحميل عندما لا يوجد توكن مخزّن', () => {
    renderAuth()

    expect(screen.getByText('loading: false')).toBeInTheDocument()
    expect(screen.getByText('authenticated: false')).toBeInTheDocument()
    expect(screen.getByText('user: none')).toBeInTheDocument()
    expect(mockedFetchMe).not.toHaveBeenCalled()
  })

  it('يعرض المستخدم المخزّن في أول إطار ثم يحدّثه من /auth/me', async () => {
    localStorage.setItem(TOKEN_KEY, 'token-cached')
    localStorage.setItem(USER_KEY, JSON.stringify(makeUser()))
    mockedFetchMe.mockResolvedValue(makeUser({ name: 'سارة المطيري (محدّثة)', role: 'instructor' }))

    renderAuth()

    // First paint already reflects the stored session — no logged-out flash.
    expect(screen.getByText('user: سارة المطيري')).toBeInTheDocument()
    expect(screen.getByText('token: token-cached')).toBeInTheDocument()
    expect(screen.getByText('loading: true')).toBeInTheDocument()

    await waitFor(() => expect(screen.getByText('loading: false')).toBeInTheDocument())
    expect(screen.getByText('user: سارة المطيري (محدّثة)')).toBeInTheDocument()
    expect(screen.getByText('authenticated: true')).toBeInTheDocument()
    expect(storedUser()?.role).toBe('instructor')
  })

  it('يتجاهل المستخدم المخزّن عندما لا يوجد توكن ولا يستدعي /auth/me', () => {
    localStorage.setItem(USER_KEY, JSON.stringify(makeUser()))

    renderAuth()

    expect(screen.getByText('user: none')).toBeInTheDocument()
    expect(screen.getByText('authenticated: false')).toBeInTheDocument()
    expect(mockedFetchMe).not.toHaveBeenCalled()
  })

  it('يُسقط بيانات المستخدم التالفة بدل الانهيار', async () => {
    localStorage.setItem(TOKEN_KEY, 'token-cached')
    localStorage.setItem(USER_KEY, '{ not json')
    mockedFetchMe.mockResolvedValue(makeUser())

    renderAuth()

    expect(screen.getByText('user: none')).toBeInTheDocument()
    expect(screen.getByText('token: token-cached')).toBeInTheDocument()

    await waitFor(() => expect(screen.getByText('user: سارة المطيري')).toBeInTheDocument())
  })

  it('يمسح الجلسة بالكامل عندما يفشل /auth/me', async () => {
    localStorage.setItem(TOKEN_KEY, 'token-stale')
    localStorage.setItem(USER_KEY, JSON.stringify(makeUser()))
    sessionStorage.setItem(IMPERSONATION_ACTIVE_KEY, '1')
    sessionStorage.setItem(IMPERSONATION_ORIGINAL_TOKEN_KEY, 'super-token')
    sessionStorage.setItem(IMPERSONATION_ORIGINAL_USER_KEY, JSON.stringify(makeUser({ id: 1, role: 'super_admin' })))
    mockedFetchMe.mockRejectedValue(new Error('401'))

    renderAuth()

    await waitFor(() => expect(screen.getByText('loading: false')).toBeInTheDocument())
    expect(screen.getByText('authenticated: false')).toBeInTheDocument()
    expect(screen.getByText('user: none')).toBeInTheDocument()
    expect(screen.getByText('token: none')).toBeInTheDocument()
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    expect(localStorage.getItem(USER_KEY)).toBeNull()
    expect(sessionStorage.getItem(IMPERSONATION_ACTIVE_KEY)).toBeNull()
    expect(sessionStorage.getItem(IMPERSONATION_ORIGINAL_TOKEN_KEY)).toBeNull()
  })
})

describe('AuthProvider — login / registerAccount', () => {
  it('يحفظ التوكن والمستخدم ويصبح المستخدم مصادقاً بعد تسجيل الدخول', async () => {
    mockedLogin.mockResolvedValue({ token: 'token-fresh', user: makeUser({ name: 'أحمد' }) })

    renderAuth()
    await click('login')

    await waitFor(() => expect(screen.getByText('authenticated: true')).toBeInTheDocument())
    expect(mockedLogin).toHaveBeenCalledWith('sara@emc.test', 'pw')
    expect(screen.getByText('user: أحمد')).toBeInTheDocument()
    expect(screen.getByText('token: token-fresh')).toBeInTheDocument()
    expect(localStorage.getItem(TOKEN_KEY)).toBe('token-fresh')
    expect(storedUser()?.name).toBe('أحمد')
  })

  it('يثبت جلسة الكوكيز بلا تخزين رمز وصول في المتصفح', async () => {
    mockedLogin.mockResolvedValue({ token: '', user: makeUser({ name: 'مستخدم جلسة' }) })

    renderAuth()
    await click('login')

    await waitFor(() => expect(screen.getByText('authenticated: true')).toBeInTheDocument())
    expect(screen.getByText('user: مستخدم جلسة')).toBeInTheDocument()
    expect(screen.getByText('token: none')).toBeInTheDocument()
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    expect(localStorage.getItem(SESSION_HINT_KEY)).toBe('1')
  })

  it('يُبقي الجلسة فارغة ويمرّر الخطأ عند فشل تسجيل الدخول', async () => {
    mockedLogin.mockRejectedValue(new Error('بيانات الدخول غير صحيحة'))

    renderAuth()
    await click('login')

    await waitFor(() =>
      expect(screen.getByText('error: بيانات الدخول غير صحيحة')).toBeInTheDocument(),
    )
    expect(screen.getByText('authenticated: false')).toBeInTheDocument()
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    expect(localStorage.getItem(USER_KEY)).toBeNull()
  })

  it('يمسح أي بقايا معاينة انتحال عند تسجيل دخول جديد', async () => {
    sessionStorage.setItem(IMPERSONATION_ACTIVE_KEY, '1')
    sessionStorage.setItem(IMPERSONATION_ORIGINAL_TOKEN_KEY, 'super-token')
    sessionStorage.setItem(IMPERSONATION_ORIGINAL_USER_KEY, JSON.stringify(makeUser({ role: 'super_admin' })))
    mockedLogin.mockResolvedValue({ token: 'token-fresh', user: makeUser() })

    renderAuth()
    await click('login')

    await waitFor(() => expect(screen.getByText('authenticated: true')).toBeInTheDocument())
    expect(screen.getByText('impersonating: false')).toBeInTheDocument()
    expect(sessionStorage.getItem(IMPERSONATION_ACTIVE_KEY)).toBeNull()
    expect(sessionStorage.getItem(IMPERSONATION_ORIGINAL_USER_KEY)).toBeNull()
  })

  it('ينشئ حساباً جديداً ويحفظ الجلسة بنفس طريقة تسجيل الدخول', async () => {
    mockedRegister.mockResolvedValue({ token: 'token-new', user: makeUser({ name: 'خالد العتيبي' }) })

    renderAuth()
    await click('register')

    await waitFor(() => expect(screen.getByText('authenticated: true')).toBeInTheDocument())
    expect(mockedRegister).toHaveBeenCalledWith(REGISTER_INPUT)
    expect(screen.getByText('user: خالد العتيبي')).toBeInTheDocument()
    expect(localStorage.getItem(TOKEN_KEY)).toBe('token-new')
  })
})

describe('AuthProvider — logout', () => {
  it('يمسح التخزين المحلي وجلسة المتصفح ويحوّل إلى صفحة الدخول', async () => {
    localStorage.setItem(TOKEN_KEY, 'token-cached')
    localStorage.setItem(USER_KEY, JSON.stringify(makeUser()))
    sessionStorage.setItem('emc_scratch', 'x')
    mockedFetchMe.mockResolvedValue(makeUser())
    mockedLogoutRemote.mockResolvedValue(undefined)

    renderAuth()
    await waitFor(() => expect(screen.getByText('loading: false')).toBeInTheDocument())

    await click('logout')

    await waitFor(() => expect(screen.getByText('authenticated: false')).toBeInTheDocument())
    expect(mockedLogoutRemote).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    expect(localStorage.getItem(USER_KEY)).toBeNull()
    expect(sessionStorage.getItem('emc_scratch')).toBeNull()
    expect(assignSpy).toHaveBeenCalledWith('/login')
  })

  it('ينظّف الجلسة محلياً حتى عندما يفشل نداء الخروج على الخادم', async () => {
    localStorage.setItem(TOKEN_KEY, 'token-cached')
    localStorage.setItem(USER_KEY, JSON.stringify(makeUser()))
    mockedFetchMe.mockResolvedValue(makeUser())
    mockedLogoutRemote.mockRejectedValue(new Error('network down'))

    renderAuth()
    await waitFor(() => expect(screen.getByText('loading: false')).toBeInTheDocument())

    await click('logout')

    await waitFor(() => expect(localStorage.getItem(TOKEN_KEY)).toBeNull())
    expect(screen.getByText('token: none')).toBeInTheDocument()
    expect(assignSpy).toHaveBeenCalledWith('/login')
  })
})

describe('AuthProvider — refreshUser', () => {
  it('يعيد المستخدم المحدّث ويكتبه في التخزين', async () => {
    localStorage.setItem(TOKEN_KEY, 'token-cached')
    localStorage.setItem(USER_KEY, JSON.stringify(makeUser()))
    mockedFetchMe.mockResolvedValueOnce(makeUser())
    renderAuth()
    await waitFor(() => expect(screen.getByText('loading: false')).toBeInTheDocument())

    mockedFetchMe.mockResolvedValueOnce(makeUser({ name: 'سارة بعد التحديث', avatar_url: 'https://cdn/a.png' }))
    await click('refresh')

    await waitFor(() => expect(screen.getByText('refreshed: سارة بعد التحديث')).toBeInTheDocument())
    expect(screen.getByText('user: سارة بعد التحديث')).toBeInTheDocument()
    expect(storedUser()?.avatar_url).toBe('https://cdn/a.png')
  })

  it('يرجع النسخة المخزّنة ولا يُنهي الجلسة عندما يفشل النداء', async () => {
    localStorage.setItem(TOKEN_KEY, 'token-cached')
    localStorage.setItem(USER_KEY, JSON.stringify(makeUser()))
    mockedFetchMe.mockResolvedValueOnce(makeUser())
    renderAuth()
    await waitFor(() => expect(screen.getByText('loading: false')).toBeInTheDocument())

    mockedFetchMe.mockRejectedValueOnce(new Error('timeout'))
    await click('refresh')

    await waitFor(() => expect(screen.getByText('refreshed: سارة المطيري')).toBeInTheDocument())
    expect(screen.getByText('authenticated: true')).toBeInTheDocument()
    expect(localStorage.getItem(TOKEN_KEY)).toBe('token-cached')
  })

  it('يرجع null عندما يفشل النداء ولا توجد نسخة مخزّنة', async () => {
    renderAuth()

    mockedFetchMe.mockRejectedValueOnce(new Error('timeout'))
    await click('refresh')

    await waitFor(() => expect(screen.getByText('refreshed: null')).toBeInTheDocument())
  })
})

describe('AuthProvider — معاينة الانتحال (impersonation)', () => {
  const superUser = makeUser({ id: 1, name: 'المشرف الأعلى', email: 'sa@emc.test', role: 'super_admin' })

  async function renderAsSuperAdmin() {
    localStorage.setItem(TOKEN_KEY, 'super-token')
    localStorage.setItem(USER_KEY, JSON.stringify(superUser))
    mockedFetchMe.mockResolvedValue(superUser)
    renderAuth()
    await waitFor(() => expect(screen.getByText('loading: false')).toBeInTheDocument())
  }

  it('يحفظ نسخة الجلسة الأصلية ويبدّل التوكن إلى المستخدم المستهدَف', async () => {
    await renderAsSuperAdmin()
    mockedImpersonate.mockResolvedValue({ token: 'target-token', user: makeUser({ id: 77, name: 'طالب مستهدَف' }) })

    await click('start-preview')

    await waitFor(() => expect(screen.getByText('impersonating: true')).toBeInTheDocument())
    expect(mockedImpersonate).toHaveBeenCalledWith(77)
    expect(screen.getByText('user: طالب مستهدَف')).toBeInTheDocument()
    expect(screen.getByText('token: target-token')).toBeInTheDocument()
    expect(screen.getByText('original: المشرف الأعلى')).toBeInTheDocument()
    expect(localStorage.getItem(TOKEN_KEY)).toBe('target-token')
    expect(sessionStorage.getItem(IMPERSONATION_ACTIVE_KEY)).toBe('1')
    expect(sessionStorage.getItem(IMPERSONATION_ORIGINAL_TOKEN_KEY)).toBe('super-token')
    expect(vi.mocked(toast.success)).toHaveBeenCalled()
  })

  it('يرفض بدء معاينة ثانية أثناء معاينة نشطة', async () => {
    localStorage.setItem(TOKEN_KEY, 'target-token')
    localStorage.setItem(USER_KEY, JSON.stringify(makeUser({ id: 77 })))
    sessionStorage.setItem(IMPERSONATION_ACTIVE_KEY, '1')
    sessionStorage.setItem(IMPERSONATION_ORIGINAL_TOKEN_KEY, 'super-token')
    sessionStorage.setItem(IMPERSONATION_ORIGINAL_USER_KEY, JSON.stringify(superUser))
    mockedFetchMe.mockResolvedValue(makeUser({ id: 77 }))
    renderAuth()
    await waitFor(() => expect(screen.getByText('loading: false')).toBeInTheDocument())

    await click('start-preview')

    await waitFor(() => expect(screen.getByText('error: already_impersonating')).toBeInTheDocument())
    expect(mockedImpersonate).not.toHaveBeenCalled()
    expect(vi.mocked(toast.warning)).toHaveBeenCalled()
    expect(sessionStorage.getItem(IMPERSONATION_ORIGINAL_TOKEN_KEY)).toBe('super-token')
  })

  it('يرفض البدء عندما لا توجد جلسة حالية قابلة للقراءة', async () => {
    renderAuth()

    await click('start-preview')

    await waitFor(() => expect(screen.getByText('error: missing_session')).toBeInTheDocument())
    expect(mockedImpersonate).not.toHaveBeenCalled()
    expect(sessionStorage.getItem(IMPERSONATION_ACTIVE_KEY)).toBeNull()
    expect(vi.mocked(toast.error)).toHaveBeenCalled()
  })

  it('يتراجع عن نسخة الجلسة ويُبقي جلسة المشرف عندما يفشل نداء الانتحال', async () => {
    await renderAsSuperAdmin()
    mockedImpersonate.mockRejectedValue(new Error('impersonation_forbidden'))

    await click('start-preview')

    await waitFor(() => expect(screen.getByText('error: impersonation_forbidden')).toBeInTheDocument())
    expect(screen.getByText('impersonating: false')).toBeInTheDocument()
    expect(screen.getByText('token: super-token')).toBeInTheDocument()
    expect(localStorage.getItem(TOKEN_KEY)).toBe('super-token')
    expect(sessionStorage.getItem(IMPERSONATION_ACTIVE_KEY)).toBeNull()
  })

  it('يرفض حمولة انتحال بلا توكن ولا يبدّل الجلسة', async () => {
    await renderAsSuperAdmin()
    mockedImpersonate.mockResolvedValue({ token: '   ', user: makeUser({ id: 77 }) })

    await click('start-preview')

    await waitFor(() =>
      expect(screen.getByText('error: missing_impersonation_token')).toBeInTheDocument(),
    )
    expect(screen.getByText('impersonating: false')).toBeInTheDocument()
    expect(localStorage.getItem(TOKEN_KEY)).toBe('super-token')
    expect(sessionStorage.getItem(IMPERSONATION_ACTIVE_KEY)).toBeNull()
  })

  it('ينهي المعاينة بجلسة المشرف التي يعيدها الخادم', async () => {
    await renderAsSuperAdmin()
    mockedImpersonate.mockResolvedValue({ token: 'target-token', user: makeUser({ id: 77, name: 'طالب مستهدَف' }) })
    await click('start-preview')
    await waitFor(() => expect(screen.getByText('impersonating: true')).toBeInTheDocument())

    mockedImpersonateStop.mockResolvedValue({ token: 'super-token-rotated', user: superUser })
    await click('stop-preview')

    await waitFor(() => expect(screen.getByText('impersonating: false')).toBeInTheDocument())
    expect(screen.getByText('user: المشرف الأعلى')).toBeInTheDocument()
    expect(screen.getByText('token: super-token-rotated')).toBeInTheDocument()
    expect(localStorage.getItem(TOKEN_KEY)).toBe('super-token-rotated')
    expect(sessionStorage.getItem(IMPERSONATION_ACTIVE_KEY)).toBeNull()
  })

  it('يستعيد النسخة المحفوظة محلياً عندما يفشل نداء إنهاء الانتحال (ذهاب وعودة)', async () => {
    await renderAsSuperAdmin()
    mockedImpersonate.mockResolvedValue({ token: 'target-token', user: makeUser({ id: 77, name: 'طالب مستهدَف' }) })
    await click('start-preview')
    await waitFor(() => expect(screen.getByText('user: طالب مستهدَف')).toBeInTheDocument())

    mockedImpersonateStop.mockRejectedValue(new Error('stop endpoint 500'))
    await click('stop-preview')

    await waitFor(() => expect(screen.getByText('user: المشرف الأعلى')).toBeInTheDocument())
    expect(screen.getByText('token: super-token')).toBeInTheDocument()
    expect(screen.getByText('impersonating: false')).toBeInTheDocument()
    expect(localStorage.getItem(TOKEN_KEY)).toBe('super-token')
    expect(storedUser()?.role).toBe('super_admin')
    expect(sessionStorage.getItem(IMPERSONATION_ACTIVE_KEY)).toBeNull()
  })

  it('يرمي خطأً واضحاً عندما يفشل الإنهاء ولا توجد نسخة محفوظة', async () => {
    localStorage.setItem(TOKEN_KEY, 'target-token')
    localStorage.setItem(USER_KEY, JSON.stringify(makeUser({ id: 77 })))
    mockedFetchMe.mockResolvedValue(makeUser({ id: 77 }))
    renderAuth()
    await waitFor(() => expect(screen.getByText('loading: false')).toBeInTheDocument())

    mockedImpersonateStop.mockRejectedValue(new Error('stop endpoint 500'))
    await click('stop-preview')

    await waitFor(() =>
      expect(screen.getByText('error: stop_impersonation_failed')).toBeInTheDocument(),
    )
    expect(screen.getByText('impersonating: false')).toBeInTheDocument()
  })
})

describe('useAuth', () => {
  it('يرمي خطأً عند استخدامه خارج AuthProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    function Orphan() {
      useAuth()
      return null
    }

    expect(() => render(<Orphan />)).toThrow('useAuth must be used inside <AuthProvider>')
    spy.mockRestore()
  })
})
