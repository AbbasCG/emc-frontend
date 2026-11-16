import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import Login from '@/pages/Login'
import { PASSWORD_CHANGE_PATH } from '@/lib/passwordChangeGate'
import type { User } from '@/types'

const login = vi.hoisted(() => vi.fn())
vi.mock('@/components/public/PublicSeo', () => ({ default: () => null }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ login }) }))

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path={PASSWORD_CHANGE_PATH} element={<p>الصفحة الإلزامية</p>} />
          <Route path="/dashboard" element={<p>لوحة التحكم</p>} />
        </Routes>
    </MemoryRouter>,
  )
}

async function submitCredentials() {
  await userEvent.type(document.querySelector('input[type="email"]') as HTMLInputElement, 'ali@example.com')
  await userEvent.type(document.querySelector('input[type="password"]') as HTMLInputElement, 'Temp-1234')
  await userEvent.click(document.querySelector('button[type="submit"]') as HTMLButtonElement)
}

const user = (over: Partial<User> = {}): User => ({ id: 5, name: 'علي', email: 'ali@example.com', role: 'volunteer', ...over })

beforeEach(() => vi.clearAllMocks())

describe('Login with a temporary password', () => {
  it('lands directly on the forced change-password page when the user has must_change_password', async () => {
    login.mockResolvedValueOnce({ token: 't', user: user({ must_change_password: true }) })
    renderLogin()

    await submitCredentials()

    expect(await screen.findByText('الصفحة الإلزامية')).toBeInTheDocument()
  })

  it('goes to the normal landing page otherwise', async () => {
    login.mockResolvedValueOnce({ token: 't', user: user({ must_change_password: false }) })
    renderLogin()

    await submitCredentials()

    expect(await screen.findByText('لوحة التحكم')).toBeInTheDocument()
    expect(screen.queryByText('الصفحة الإلزامية')).not.toBeInTheDocument()
  })
})
