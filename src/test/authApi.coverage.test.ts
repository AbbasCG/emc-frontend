import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '@/api/axios'
import {
  login,
  registerAccount,
  fetchMe,
  postImpersonateUser,
  postImpersonateStop,
  forgotPassword,
  resetPassword,
  logoutRemote,
} from '@/api/authApi'

vi.mock('@/api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockedApi = vi.mocked(apiClient, true)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('login', () => {
  it('POSTs credentials silently and normalizes { data: { token, user } }', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: {
        data: {
          token: 'tok_123',
          user: { id: '9', name: '  أيمن محمد  ', email: 'ayman@example.com', role: 'student' },
        },
      },
    })

    const out = await login('ayman@example.com', 'secret')
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/auth/login',
      { email: 'ayman@example.com', password: 'secret' },
      { skipErrorToast: true },
    )
    expect(out.token).toBe('tok_123')
    expect(out.user.id).toBe(9) // numeric coercion
    expect(out.user.name).toBe('أيمن محمد') // trimmed
    expect(out.user.email).toBe('ayman@example.com')
    expect(out.user.role).toBe('student')
  })

  it('accepts the access_token alias and sibling permissions', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: {
        data: {
          access_token: 'tok_alias',
          user: { id: 1, name: 'سارة', email: 's@example.com' },
          permissions: ['courses.view', 'tasks.manage'],
        },
      },
    })
    const out = await login('s@example.com', 'pw')
    expect(out.token).toBe('tok_alias')
    expect(out.user.permissions).toEqual(['courses.view', 'tasks.manage'])
  })

  it('rejects a malformed payload instead of fabricating a ghost session', async () => {
    // Contract hardened (M10.3): the old lenient normalization produced a nameless
    // "ghost user" that rendered an authenticated navbar with no identity. A payload
    // carrying no usable user record must throw so callers route to a clean logout.
    mockedApi.post.mockResolvedValueOnce({ data: 'nonsense' })
    await expect(login('a@b.c', 'pw')).rejects.toThrow(/no usable user record/)
  })

  it('propagates authentication errors', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('401'))
    await expect(login('a@b.c', 'bad')).rejects.toThrow('401')
  })
})

describe('registerAccount', () => {
  it('POSTs the full registration body and normalizes the auth payload', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { data: { token: 'tok_new', user: { id: 2, name: 'ليلى', email: 'l@example.com' } } },
    })
    const input = {
      name: 'ليلى',
      email: 'l@example.com',
      password: 'pw123456',
      password_confirmation: 'pw123456',
      country_code: 'EG',
      phone_country_code: '+20',
      phone: '1001234567',
      city: 'القاهرة',
      gender: 'female',
      how_did_you_hear_about_us: 'صديق',
    }
    const out = await registerAccount(input)
    expect(mockedApi.post).toHaveBeenCalledWith('/auth/register', input, { skipErrorToast: true })
    expect(out.token).toBe('tok_new')
    expect(out.user.name).toBe('ليلى')
  })
})

describe('fetchMe', () => {
  it('GETs /auth/me silently and normalizes the nested user with sibling permissions', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: {
          user: { id: 3, name: 'محمد', email: 'm@example.com', role: 'super_admin' },
          permissions: ['admin.all'],
          is_department_leader: true,
        },
      },
    })
    const me = await fetchMe()
    expect(mockedApi.get).toHaveBeenCalledWith('/auth/me', { skipErrorToast: true })
    expect(me.id).toBe(3)
    expect(me.role).toBe('super_admin')
    expect(me.permissions).toEqual(['admin.all'])
    expect(me.is_department_leader).toBe(true)
  })

  it('propagates errors (session expiry must be observable)', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('401'))
    await expect(fetchMe()).rejects.toThrow('401')
  })
})

describe('impersonation', () => {
  it('postImpersonateUser POSTs to /admin/impersonate/{id} and unwraps the data envelope', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: { token: 'imp_tok' } } })
    await expect(postImpersonateUser(42)).resolves.toEqual({ token: 'imp_tok' })
    expect(mockedApi.post).toHaveBeenCalledWith('/admin/impersonate/42', {}, { skipErrorToast: true })
  })

  it('postImpersonateStop POSTs to /admin/impersonate/stop', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: { ok: true } } })
    await expect(postImpersonateStop()).resolves.toEqual({ ok: true })
    expect(mockedApi.post).toHaveBeenCalledWith('/admin/impersonate/stop', {}, { skipErrorToast: true })
  })
})

describe('password flows', () => {
  it('forgotPassword POSTs the email silently', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: {} })
    await expect(forgotPassword('a@b.c')).resolves.toBeUndefined()
    expect(mockedApi.post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'a@b.c' }, { skipErrorToast: true })
  })

  it('resetPassword POSTs the full reset params', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: {} })
    const params = {
      token: 'reset-token',
      email: 'a@b.c',
      password: 'newpw123',
      password_confirmation: 'newpw123',
    }
    await expect(resetPassword(params)).resolves.toBeUndefined()
    expect(mockedApi.post).toHaveBeenCalledWith('/auth/reset-password', params, { skipErrorToast: true })
  })

  it('resetPassword propagates validation errors', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('422'))
    await expect(
      resetPassword({ token: 't', email: 'a@b.c', password: 'x', password_confirmation: 'y' }),
    ).rejects.toThrow('422')
  })
})

describe('logoutRemote', () => {
  it('POSTs /auth/logout silently', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: {} })
    await expect(logoutRemote()).resolves.toBeUndefined()
    expect(mockedApi.post).toHaveBeenCalledWith('/auth/logout', undefined, { skipErrorToast: true })
  })

  it('never throws even when the server rejects (client state must still clear)', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('500'))
    await expect(logoutRemote()).resolves.toBeUndefined()
  })
})
