import apiClient from './axios'
import { unwrapData } from './unwrap'
import { asList, unwrapLms } from './lmsApi'
import type {
  CertificateVerificationResult,
  CertificateRecord,
} from '@/types/intelligence'

export async function fetchAdminCertificates(): Promise<CertificateRecord[]> {
  const res = await apiClient.get<unknown>('/certificates')
  return asList<CertificateRecord>(res.data)
}

export async function createCertificate(body: Partial<CertificateRecord>): Promise<CertificateRecord> {
  const res = await apiClient.post<unknown>('/certificates', body)
  return unwrapLms<CertificateRecord>(res.data)
}

export async function updateCertificate(
  id: number,
  body: Partial<Pick<CertificateRecord, 'status' | 'title' | 'verification_code' | 'issued_at'>>,
): Promise<CertificateRecord> {
  const res = await apiClient.patch<unknown>(`/certificates/${id}`, body)
  return unwrapLms<CertificateRecord>(res.data)
}

export async function fetchStudentCertificates(): Promise<CertificateRecord[]> {
  const res = await apiClient.get<unknown>('/student/certificates')
  return asList<CertificateRecord>(res.data)
}

export async function verifyCertificatePublic(code: string): Promise<CertificateVerificationResult> {
  const res = await apiClient.get<unknown>(`/certificates/verify/${encodeURIComponent(code)}`)
  return unwrapLms<CertificateVerificationResult>(res.data)
}

/** Public verification without Authorization header — avoids redirect on 401 for anonymous visitors. */
export async function verifyCertificatePublicAnonymous(code: string): Promise<CertificateVerificationResult> {
  const base = import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? ''
  const url = `${String(base).replace(/\/$/, '')}/certificates/verify/${encodeURIComponent(code)}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  const json = (await res.json()) as unknown
  if (!res.ok) throw new Error('verify failed')
  return unwrapData<CertificateVerificationResult>(json)
}
