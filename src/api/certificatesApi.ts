import apiClient from './axios'
import { unwrapData } from './unwrap'
import { asList, unwrapLms } from './lmsApi'
import type {
  CertificateVerificationResult,
  CertificateRecord,
} from '@/types/intelligence'

// ── Legacy functions (used by intelligence pages) ────────────────────────────

export async function fetchAdminCertificates(): Promise<CertificateRecord[]> {
  const res = await apiClient.get<unknown>('/admin/certificates')
  return unwrapList<CertificateRecord>(res.data)
}

export async function createCertificate(body: Partial<CertificateRecord>): Promise<CertificateRecord> {
  const res = await apiClient.post<unknown>('/admin/certificates', body)
  return unwrapLms<CertificateRecord>(res.data)
}

export async function updateCertificate(
  id: number,
  body: Partial<Pick<CertificateRecord, 'status' | 'title' | 'verification_code' | 'issued_at'>>,
): Promise<CertificateRecord> {
  if (body.status === 'revoked') {
    const res = await apiClient.post<unknown>(`/admin/certificates/${id}/revoke`, {
      revoke_reason: 'Updated via admin panel',
    })
    return unwrapCert<CertificateRecord>(res.data)
  }
  const res = await apiClient.get<unknown>(`/admin/certificates/${id}`)
  return unwrapCert<CertificateRecord>(res.data)
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

// ── New LMS Certificate Management Types ─────────────────────────────────────

export type CertificateType =
  | 'course_completion'
  | 'workshop_attendance'
  | 'summer_camp'
  | 'learning_track'
  | 'partner'
  | 'guest_speaker'
  | 'volunteer'
  | 'internship'
  | 'sponsor'
  | 'custom'

export type CertificateStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'pending_generation'
  | 'generation_failed'
  | 'issued'
  | 'revoked'

export type Certificate = {
  id: number
  certificate_type: CertificateType
  certificate_code: string | null
  title: string
  status: CertificateStatus
  issued_at: string | null
  revoked_at: string | null
  revoke_reason: string | null
  recipient_name: string | null
  recipient_email: string | null
  pdf_url: string | null
  user: { id: number; name: string; email: string } | null
  course: { id: number; title: string } | null
  workshop: { id: number; title: string } | null
  track: { id: number; name: string } | null
  template: { id: number; name: string; type: string } | null
  batch_id: number | null
  issued_by: { id: number; name: string } | null
  created_at: string
}

export type CertificateTemplate = {
  id: number
  name: string
  type: CertificateType
  language: 'arabic' | 'english' | 'bilingual'
  code_prefix: string
  is_active: boolean
  html_template: string
  css_template: string | null
  config_json: Record<string, unknown> | null
  created_at: string
}

export type EligibilityResult = {
  user: { id: number; name: string; email: string }
  progress_pct: number
  attendance_pct: number
  assignments_pct: number
  assignments_completed?: number
  assignments_total?: number
  /** Backend aliases — may also be returned as progress/attendance/assignments */
  progress?: number
  attendance?: number
  assignments?: number
  is_eligible: boolean
  already_issued?: boolean
  certificate_status?: string | null
  reason: string | null
  existing_certificate: { id: number; status: string; certificate_code?: string } | null
}

export type EligibilitySummary = {
  total: number
  eligible: number
  ineligible: number
  already_issued?: number
}

function normalizeEligibilityStudent(raw: Record<string, unknown>): EligibilityResult {
  const userRaw = raw.user as Record<string, unknown> | null | undefined
  const user = {
    id: Number(userRaw?.id ?? raw.user_id ?? 0),
    name: String(userRaw?.name ?? raw.name ?? '—'),
    email: String(userRaw?.email ?? raw.email ?? ''),
  }
  const progress = Number(raw.progress_pct ?? raw.progress_percentage ?? raw.progress ?? 0)
  const attendance = Number(raw.attendance_pct ?? raw.attendance_percentage ?? raw.attendance ?? 0)
  const assignmentsPct = Number(raw.assignments_pct ?? raw.assignments ?? 0)
  const existing = raw.existing_certificate as Record<string, unknown> | null | undefined

  return {
    user,
    progress_pct: progress,
    attendance_pct: attendance,
    assignments_pct: assignmentsPct,
    progress,
    attendance,
    assignments: assignmentsPct,
    assignments_completed: Number(raw.assignments_completed ?? 0),
    assignments_total: Number(raw.assignments_total ?? 0),
    is_eligible: Boolean(raw.is_eligible ?? raw.eligible),
    already_issued: Boolean(raw.already_issued ?? existing),
    certificate_status: (raw.certificate_status as string | null) ?? (existing?.status as string | undefined) ?? null,
    reason: raw.reason != null ? String(raw.reason) : null,
    existing_certificate: existing
      ? {
          id: Number(existing.id),
          status: String(existing.status ?? ''),
          certificate_code: existing.certificate_code != null ? String(existing.certificate_code) : undefined,
        }
      : null,
  }
}

export type CertificateBatch = {
  id: number
  batch_code: string
  certificate_type: CertificateType
  status: 'pending' | 'processing' | 'completed' | 'failed'
  total_recipients: number
  generated_count: number
  failed_count: number
  created_at: string
  created_by: { id: number; name: string } | null
}

export type CertificateStats = {
  total: number
  issued_this_month: number
  pending: number
  revoked: number
  by_type: Record<string, number>
  recent: Certificate[]
}

// ── Helper ────────────────────────────────────────────────────────────────────

function unwrapCert<T>(data: unknown): T {
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>
    if ('data' in d) return d.data as T
    if ('certificate' in d) return d.certificate as T
  }
  return data as T
}

function unwrapList<T>(data: unknown): T[] {
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>
    if ('data' in d) {
      const inner = d.data
      if (Array.isArray(inner)) return inner as T[]
      if (inner && typeof inner === 'object') {
        const nested = (inner as Record<string, unknown>).data
        if (Array.isArray(nested)) return nested as T[]
      }
    }
    if (Array.isArray(data)) return data as T[]
  }
  if (Array.isArray(data)) return data as T[]
  return []
}

// ── Admin Certificate Stats ───────────────────────────────────────────────────

export async function fetchCertificateStats(): Promise<CertificateStats> {
  const res = await apiClient.get<unknown>('/admin/certificates/stats')
  const raw = unwrapCert<Record<string, unknown>>(res.data)
  const byStatus = (raw.by_status ?? {}) as Record<string, number>
  const recentRaw = raw.recent
  const recent = Array.isArray(recentRaw)
    ? (recentRaw as Certificate[])
    : unwrapList<Certificate>(recentRaw)

  return {
    total: Number(raw.total ?? 0),
    issued_this_month: Number(raw.issued_this_month ?? raw.recent_30d ?? 0),
    pending: Number(raw.pending ?? 0)
      || Number(byStatus.pending ?? 0)
      + Number(byStatus.approved ?? 0)
      + Number(byStatus.pending_generation ?? 0),
    revoked: Number(raw.revoked ?? byStatus.revoked ?? 0),
    by_type: (raw.by_type ?? {}) as Record<string, number>,
    recent,
  }
}

// ── Admin Certificates CRUD ───────────────────────────────────────────────────

export async function fetchCertificates(
  params?: Record<string, unknown>,
): Promise<{ data: Certificate[]; meta: { total: number; last_page: number } }> {
  const res = await apiClient.get<unknown>('/admin/certificates', { params })
  const inner = unwrapCert<Record<string, unknown>>(res.data)
  const data = unwrapList<Certificate>(inner)
  const metaRaw = inner && typeof inner === 'object' && !Array.isArray(inner)
    ? (inner.meta as { total?: number; last_page?: number } | undefined)
    : undefined
  const meta = {
    total: Number(metaRaw?.total ?? data.length),
    last_page: Number(metaRaw?.last_page ?? 1),
  }
  return { data, meta }
}

export async function fetchCertificate(id: number): Promise<Certificate> {
  const res = await apiClient.get<unknown>(`/admin/certificates/${id}`)
  return unwrapCert<Certificate>(res.data)
}

export async function approveCertificate(id: number): Promise<Certificate> {
  const res = await apiClient.post<unknown>(`/admin/certificates/${id}/approve`)
  return unwrapCert<Certificate>(res.data)
}

export async function issueCertificate(id: number): Promise<Certificate> {
  const res = await apiClient.post<unknown>(`/admin/certificates/${id}/issue`)
  return unwrapCert<Certificate>(res.data)
}

export async function revokeCertificate(id: number, reason: string): Promise<Certificate> {
  const res = await apiClient.post<unknown>(`/admin/certificates/${id}/revoke`, { revoke_reason: reason })
  return unwrapCert<Certificate>(res.data)
}

export async function regenerateCertificate(id: number): Promise<Certificate> {
  const res = await apiClient.post<unknown>(`/admin/certificates/${id}/regenerate`)
  return unwrapCert<Certificate>(res.data)
}

export function getCertificateDownloadUrl(id: number): string {
  const base = import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? ''
  return `${String(base).replace(/\/$/, '')}/admin/certificates/${id}/download`
}

// ── Eligibility ───────────────────────────────────────────────────────────────

export type EligibilityResponse = {
  summary: EligibilitySummary
  students: EligibilityResult[]
}

export async function fetchEligibility(params: {
  related_type: string
  related_id: number
  certificate_type?: CertificateType
}): Promise<EligibilityResponse> {
  const empty: EligibilityResponse = {
    summary: { total: 0, eligible: 0, ineligible: 0 },
    students: [],
  }
  if (!params.related_type?.trim() || !params.related_id || params.related_id <= 0) {
    return empty
  }
  const res = await apiClient.get<unknown>('/admin/certificates/eligibility', {
    params: {
      related_type: params.related_type,
      related_id: params.related_id,
      certificate_type: params.certificate_type,
    },
  })
  const raw = (res.data as Record<string, unknown>)?.data as Record<string, unknown> | undefined
  const summaryRaw = (raw?.summary ?? {}) as Record<string, unknown>
  const studentsRaw = Array.isArray(raw?.students) ? raw.students : []

  return {
    summary: {
      total: Number(summaryRaw.total ?? 0),
      eligible: Number(summaryRaw.eligible ?? 0),
      ineligible: Number(summaryRaw.ineligible ?? 0),
      already_issued: Number(summaryRaw.already_issued ?? 0),
    },
    students: studentsRaw.map((row) => normalizeEligibilityStudent(row as Record<string, unknown>)),
  }
}

export async function bulkIssueCertificates(data: {
  user_ids: number[]
  certificate_type: CertificateType
  related_type: string
  related_id: number
  template_id?: number
  title?: string
  override?: boolean
}): Promise<{ batch: CertificateBatch; message: string }> {
  const res = await apiClient.post<unknown>('/admin/certificates/bulk-issue', {
    user_ids: data.user_ids,
    type: data.certificate_type,
    certificate_type: data.certificate_type,
    related_type: data.related_type,
    related_id: data.related_id,
    template_id: data.template_id,
    title: data.title,
    override: data.override ?? false,
  })
  const root = res.data as Record<string, unknown>
  const payload = unwrapCert<Record<string, unknown>>(res.data)
  const batch: CertificateBatch = {
    id: Number(payload.batch_id ?? payload.id ?? 0),
    batch_code: String(payload.batch_code ?? ''),
    certificate_type: data.certificate_type,
    status: (payload.status as CertificateBatch['status']) ?? 'pending',
    total_recipients: Number(payload.total_recipients ?? data.user_ids.length),
    generated_count: Number(payload.generated_count ?? 0),
    failed_count: Number(payload.failed_count ?? 0),
    created_at: String(payload.created_at ?? new Date().toISOString()),
    created_by: null,
  }
  return {
    batch,
    message: String(root.message ?? 'Bulk certificate issuance started.'),
  }
}

// ── Templates ─────────────────────────────────────────────────────────────────

export async function fetchCertificateTemplates(
  params?: Record<string, unknown>,
): Promise<CertificateTemplate[]> {
  const res = await apiClient.get<unknown>('/admin/certificates/templates', { params })
  return unwrapList<CertificateTemplate>(res.data)
}

export async function fetchCertificateTemplate(id: number): Promise<CertificateTemplate> {
  const res = await apiClient.get<unknown>(`/admin/certificates/templates/${id}`)
  return unwrapCert<CertificateTemplate>(res.data)
}

export async function createCertificateTemplate(
  data: Record<string, unknown>,
): Promise<CertificateTemplate> {
  const res = await apiClient.post<unknown>('/admin/certificates/templates', data)
  return unwrapCert<CertificateTemplate>(res.data)
}

export async function updateCertificateTemplate(
  id: number,
  data: Record<string, unknown>,
): Promise<CertificateTemplate> {
  const res = await apiClient.put<unknown>(`/admin/certificates/templates/${id}`, data)
  return unwrapCert<CertificateTemplate>(res.data)
}

export async function deleteCertificateTemplate(id: number): Promise<void> {
  await apiClient.delete(`/admin/certificates/templates/${id}`)
}

export async function toggleTemplateActive(id: number): Promise<CertificateTemplate> {
  const res = await apiClient.put<unknown>(`/admin/certificates/templates/${id}/activate`)
  return unwrapCert<CertificateTemplate>(res.data)
}

export async function previewTemplate(id: number): Promise<string> {
  const res = await apiClient.get<unknown>(`/admin/certificates/templates/${id}/preview`)
  const raw = res.data as Record<string, unknown>
  return (raw.html ?? raw.data ?? '') as string
}

// ── Batches ───────────────────────────────────────────────────────────────────

export async function fetchCertificateBatches(): Promise<CertificateBatch[]> {
  const res = await apiClient.get<unknown>('/admin/certificates/batches')
  return unwrapList<CertificateBatch>(res.data)
}

export async function fetchCertificateBatch(
  id: number,
): Promise<{ batch: CertificateBatch; certificates: Certificate[] }> {
  const res = await apiClient.get<unknown>(`/admin/certificates/batches/${id}`)
  return unwrapCert<{ batch: CertificateBatch; certificates: Certificate[] }>(res.data)
}

// ── Student API ───────────────────────────────────────────────────────────────

export async function fetchStudentCertificatesNew(): Promise<Certificate[]> {
  const res = await apiClient.get<unknown>('/student/certificates')
  return unwrapList<Certificate>(res.data)
}

export async function fetchStudentCertificate(id: number): Promise<Certificate> {
  const res = await apiClient.get<unknown>(`/student/certificates/${id}`)
  return unwrapCert<Certificate>(res.data)
}

export function getStudentCertificateDownloadUrl(id: number): string {
  const base = import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? ''
  return `${String(base).replace(/\/$/, '')}/student/certificates/${id}/download`
}

// ── Public Verification ───────────────────────────────────────────────────────

export async function verifyCertificate(code: string): Promise<{
  valid: boolean
  certificate?: Certificate
  message: string
}> {
  const base = import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? ''
  const url = `${String(base).replace(/\/$/, '')}/certificates/verify/${encodeURIComponent(code)}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  const json = (await res.json()) as unknown
  return unwrapCert<{ valid: boolean; certificate?: Certificate; message: string }>(json)
}
