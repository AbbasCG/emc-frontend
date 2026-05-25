import apiClient from './axios'

export type TwoFactorStatus = {
  is_enabled: boolean
}

export type TwoFactorGenerateResult = {
  secret: string
  qr_code_url: string
}

export type TwoFactorEnableResult = {
  backup_codes: string[]
}

export async function fetchTwoFactorStatus(): Promise<TwoFactorStatus> {
  const res = await apiClient.get<unknown>('/auth/2fa/status')
  return (res.data as { data: TwoFactorStatus }).data
}

export async function generateTwoFactorSecret(): Promise<TwoFactorGenerateResult> {
  const res = await apiClient.post<unknown>('/auth/2fa/generate')
  return (res.data as { data: TwoFactorGenerateResult }).data
}

export async function enableTwoFactor(code: string): Promise<TwoFactorEnableResult> {
  const res = await apiClient.post<unknown>('/auth/2fa/enable', { code })
  return (res.data as { data: TwoFactorEnableResult }).data
}

export async function disableTwoFactor(password: string): Promise<void> {
  await apiClient.post('/auth/2fa/disable', { password })
}

export async function verifyTwoFactorLogin(userId: number, code: string): Promise<{
  user: unknown
  role: string
  permissions: string[]
  token: string
}> {
  const res = await apiClient.post<unknown>('/auth/2fa/verify', {
    user_id: userId,
    code,
  })
  return (res.data as { data: { user: unknown; role: string; permissions: string[]; token: string } }).data
}
