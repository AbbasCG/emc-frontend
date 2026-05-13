import apiClient from './axios'
import type { User } from '../types'
import { unwrapData } from './unwrap'

type AuthPayload = { token: string; user: User }

export async function login(email: string, password: string): Promise<AuthPayload> {
  const res = await apiClient.post<{ success: boolean; data: AuthPayload }>(
    '/auth/login',
    {
      email,
      password,
    },
    { skipErrorToast: true },
  )
  return unwrapData<AuthPayload>(res.data)
}

export async function registerAccount(input: {
  name: string
  email: string
  password: string
  password_confirmation: string
}): Promise<AuthPayload> {
  const res = await apiClient.post<{ success: boolean; data: AuthPayload }>(
    '/auth/register',
    input,
    { skipErrorToast: true },
  )
  return unwrapData<AuthPayload>(res.data)
}

export async function fetchMe(): Promise<User> {
  const res = await apiClient.get<{ success: boolean; data: User }>('/auth/me', {
    skipErrorToast: true,
  })
  return unwrapData<User>(res.data)
}

export async function logoutRemote(): Promise<void> {
  await apiClient.post('/auth/logout', undefined, { skipErrorToast: true })
}
