import apiClient from './axios'
import { unwrapData } from './unwrap'
import { asList, unwrapLms } from './lmsApi'
import type {
  CertificateVerificationResult,
  CertificateRecord,
} from '@/types/intelligence'

// ── Legacy functions (kept for intelligence pages — do not use in new code) ──
// @deprecated Use fetchAdminCertificateList() instead
export async function fetchAdminCertificates(): Promise<CertificateRecord[]> {
  const res = await apiClient.get<unknown>('/admin/certificates')
  return unwrapList<CertificateRecord>(res.data)
}

// @deprecated Use fetchAdminCertificate() / revokeCertificate() directly
export async function createCertificate(body: Partial<CertificateRecord>): Promise<CertificateRecord> {
  const res = await apiClient.post<unknown>('/admin/certificates', body)
  return unwrapLms<CertificateRecord>(res.data)
}

// @deprecated Use fetchAdminCertificate() / revokeCertificate() directly
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

// @deprecated Use fetchStudentCertificateList() instead
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
  | 'rejected'
  | 'revoked'

export type PdfGenerationStatus = 'none' | 'pending' | 'generating' | 'ready' | 'failed'

export type Certificate = {
  id: number
  certificate_type: CertificateType
  certificate_code: string | null
  title: string
  professional_title: string | null
  verification_code: string | null
  status: CertificateStatus
  approval_status: string | null
  issued_at: string | null
  expires_at: string | null
  revoked_at: string | null
  revoke_reason: string | null
  recipient_name: string | null
  recipient_email: string | null
  batch_id: number | null
  pdf_url: string | null
  pdf_info: {
    has_pdf: boolean
    generation_status: PdfGenerationStatus
    generated_at: string | null
    file_size_bytes: number | null
    template_id_used: number | null
    last_error: string | null
  } | null
  user: { id: number; name: string; email: string } | null
  course: { id: number; title: string } | null
  workshop: { id: number; title: string } | null
  track: { id: number; name: string } | null
  learning_path: { id: number; name: string } | null
  template: { id: number; name: string; type: string; language?: string } | null
  batch: { id: number; batch_code: string; status: string } | null
  issued_by: { id: number; name: string } | null
  approved_by: { id: number; name: string } | null
  approvals: CertificateApprovalRecord[] | null
  created_at: string
  updated_at: string | null
}

export type CertificateApprovalRecord = {
  type: 'administrative' | 'programs'
  type_label: string
  status: 'pending' | 'approved' | 'rejected'
  approver: { id: number; name: string } | null
  notes: string | null
  actioned_at: string | null
}

export type CertificateLog = {
  id: number
  action: string
  actor: { id: number; name: string } | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

export type CertificateFilters = {
  search?: string
  status?: CertificateStatus | ''
  certificate_type?: CertificateType | ''
  approval_status?: string
  template_id?: number | ''
  course_id?: number | ''
  workshop_id?: number | ''
  track_id?: number | ''
  pdf_status?: 'ready' | 'missing' | 'generating' | 'failed' | ''
  issued_from?: string
  issued_to?: string
  created_from?: string
  created_to?: string
  page?: number
  per_page?: number
}

export type PaginatedResponse<T> = {
  data: T[]
  meta: {
    total: number
    per_page: number
    current_page: number
    last_page: number
    from: number | null
    to: number | null
  }
}

export type CertificateTemplate = {
  id: number
  name: string
  type: CertificateType
  language: 'arabic' | 'english' | 'bilingual'
  code_prefix: string | null
  is_active: boolean
  is_default: boolean
  designer_mode: boolean
  blade_path: string | null
  // Branding
  org_name_en: string | null
  org_name_ar: string | null
  org2_name_en: string | null
  org2_name_ar: string | null
  logo_primary: string | null
  logo_secondary: string | null
  // Typography
  font_arabic: string | null
  font_english: string | null
  // Colors
  color_primary: string | null
  color_secondary: string | null
  color_accent: string | null
  color_text: string | null
  // Signature toggles
  show_admin_signature: boolean
  show_program_signature: boolean
  show_official_stamp: boolean
  // Signature names
  admin_sig_name_en: string | null
  admin_sig_name_ar: string | null
  admin_sig_title_en: string | null
  admin_sig_title_ar: string | null
  program_sig_name_ar: string | null
  program_sig_title_ar: string | null
  // Layout
  paper_size: string | null
  orientation: string | null
  pdf_quality: string | null
  margin_top: number | null
  margin_bottom: number | null
  margin_left: number | null
  margin_right: number | null
  bg_style: string | null
  border_style: string | null
  // Legacy
  html_template: string | null
  css_template: string | null
  config_json: Record<string, unknown> | null
  // Usage
  certificates_count?: number
  created_at: string
  updated_at: string
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
  related_type: string | null
  related_id: number | null
  status: 'pending' | 'processing' | 'completed' | 'completed_with_errors' | 'failed' | 'cancelled'
  total_recipients: number
  generated_count: number
  failed_count: number
  notes: string | null
  created_at: string
  completed_at: string | null
  created_by: { id: number; name: string } | null
  template: { id: number; name: string } | null
}

export type CertificateStats = {
  total: number
  issued_this_month: number
  pending: number
  revoked: number
  rejected: number
  pdf_failed: number
  generated_this_month: number
  by_type: Record<string, number>
  by_status: Record<string, number>
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
    rejected: Number(raw.rejected ?? byStatus.rejected ?? 0),
    pdf_failed: Number(raw.pdf_failed ?? 0),
    generated_this_month: Number(raw.generated_this_month ?? 0),
    by_type: (raw.by_type ?? {}) as Record<string, number>,
    by_status: byStatus,
    recent,
  }
}

// ── Admin Certificates CRUD ───────────────────────────────────────────────────

export async function fetchAdminCertificateList(
  params?: CertificateFilters | Record<string, unknown>,
): Promise<{ data: Certificate[]; meta: { total: number; last_page: number; current_page: number } }> {
  const res = await apiClient.get<unknown>('/admin/certificates', { params })
  const inner = unwrapCert<Record<string, unknown>>(res.data)
  const data = unwrapList<Certificate>(inner)
  const metaRaw = inner && typeof inner === 'object' && !Array.isArray(inner)
    ? (inner.meta as { total?: number; last_page?: number } | undefined)
    : undefined
  const meta = {
    total: Number(metaRaw?.total ?? data.length),
    last_page: Number(metaRaw?.last_page ?? 1),
    current_page: Number((metaRaw as Record<string, unknown> | undefined)?.current_page ?? 1),
  }
  return { data, meta }
}

/** @deprecated Use fetchAdminCertificateList() */
export const fetchCertificates = fetchAdminCertificateList

export async function fetchAdminCertificate(id: number): Promise<Certificate> {
  const res = await apiClient.get<unknown>(`/admin/certificates/${id}`)
  return unwrapCert<Certificate>(res.data)
}

/** @deprecated Use fetchAdminCertificate() */
export const fetchCertificate = fetchAdminCertificate

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

export async function retryPdf(id: number): Promise<Certificate> {
  const res = await apiClient.post<unknown>(`/admin/certificates/${id}/retry-pdf`)
  return unwrapCert<Certificate>(res.data)
}

/**
 * Download an admin certificate as an authenticated PDF blob.
 * Always returns application/pdf — never a raw URL.
 */
export async function downloadAdminCertificate(id: number): Promise<Blob> {
  const res = await apiClient.get(`/admin/certificates/${id}/download`, { responseType: 'blob' })
  return res.data as Blob
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
    related_type: data.related_type ?? null,
    related_id: data.related_id ?? null,
    notes: null,
    completed_at: null,
    template: null,
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

export async function fetchDefaultCertificateTemplate(): Promise<CertificateTemplate> {
  const res = await apiClient.get<unknown>('/admin/certificates/templates/default')
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

export async function setTemplateAsDefault(id: number): Promise<CertificateTemplate> {
  const res = await apiClient.put<unknown>(`/admin/certificates/templates/${id}/set-default`)
  return unwrapCert<CertificateTemplate>(res.data)
}

export async function duplicateTemplate(id: number): Promise<CertificateTemplate> {
  const res = await apiClient.post<unknown>(`/admin/certificates/templates/${id}/duplicate`)
  return unwrapCert<CertificateTemplate>(res.data)
}

export type CreateTemplatePayload = {
  name: string
  type: CertificateType
  language: 'arabic' | 'english' | 'bilingual'
  designer_mode?: boolean
  blade_path?: string
}

export async function createDesignerTemplate(payload: CreateTemplatePayload): Promise<CertificateTemplate> {
  const res = await apiClient.post<unknown>('/admin/certificates/templates', {
    ...payload,
    designer_mode: true,
    blade_path: 'certificates.templates.default',
  })
  return unwrapCert<CertificateTemplate>(res.data)
}

export async function previewTemplate(id: number): Promise<string> {
  const res = await apiClient.get<unknown>(`/admin/certificates/templates/${id}/preview`)
  const raw = res.data as Record<string, unknown>
  return (raw.html ?? raw.data ?? '') as string
}

// ── Designer ──────────────────────────────────────────────────────────────────

export type DesignerCfg = {
  org_name_en?: string
  org_name_ar?: string
  org2_name_en?: string
  org2_name_ar?: string
  learning_path_name_ar?: string
  learning_path_name_en?: string
  font_arabic?: string
  font_english?: string
  color_primary?: string
  color_secondary?: string
  color_accent?: string
  color_text?: string
  show_admin_signature?: boolean
  show_program_signature?: boolean
  show_official_stamp?: boolean
  admin_sig_image?: string | null
  admin_sig_name_en?: string
  admin_sig_name_ar?: string
  admin_sig_title_en?: string
  admin_sig_title_ar?: string
  program_sig_image?: string | null
  program_sig_name_en?: string
  program_sig_name_ar?: string
  program_sig_title_en?: string
  program_sig_title_ar?: string
  official_stamp_image?: string | null
  paper_size?: string
  orientation?: 'landscape' | 'portrait'
  pdf_quality?: 'standard' | 'high' | 'print'
  margin_top?: number
  margin_bottom?: number
  margin_left?: number
  margin_right?: number
  bg_style?: 'default' | 'minimal' | 'ornate' | 'none'
  border_style?: 'default' | 'none'
  blade_path?: string
  code_prefix?: string
}

export async function previewDesigner(cfg: DesignerCfg): Promise<string> {
  const res = await apiClient.post<string>('/admin/certificates/templates/preview-designer', { cfg })
  return res.data as unknown as string
}

export async function saveDesignerTemplate(id: number, data: DesignerCfg & { name?: string }): Promise<CertificateTemplate> {
  const res = await apiClient.put<unknown>(`/admin/certificates/templates/${id}/designer`, data)
  return unwrapCert<CertificateTemplate>(res.data)
}

export async function uploadTemplateAsset(
  templateId: number,
  field: 'logo_primary' | 'logo_secondary' | 'admin_sig_image' | 'program_sig_image' | 'official_stamp_image',
  file: File,
): Promise<{ path: string; url: string }> {
  const form = new FormData()
  form.append('file', file)
  form.append('field', field)
  // Do NOT set Content-Type manually — axios must auto-set it with the multipart boundary
  const res = await apiClient.post<unknown>(`/admin/certificates/templates/${templateId}/upload-asset`, form)
  return res.data as { path: string; url: string }
}

export async function fetchCertificateApprovals(certId: number): Promise<{
  approval_status: string
  approvals: Record<string, { status: string; type_label: string; approver: string | null; notes: string | null; actioned_at: string | null }>
}> {
  const res = await apiClient.get<unknown>(`/admin/certificates/${certId}/approvals`)
  return res.data as {
    approval_status: string
    approvals: Record<string, { status: string; type_label: string; approver: string | null; notes: string | null; actioned_at: string | null }>
  }
}

export async function recordCertificateApproval(
  certId: number,
  type: 'administrative' | 'programs',
  status: 'approved' | 'rejected',
  notes?: string,
): Promise<{ approval_status: string }> {
  const res = await apiClient.post<unknown>(`/admin/certificates/${certId}/approvals`, { type, status, notes })
  return res.data as { approval_status: string }
}

// ── Batches ───────────────────────────────────────────────────────────────────

export async function fetchCertificateBatches(
  params?: Record<string, unknown>,
): Promise<{ data: CertificateBatch[]; meta: { total: number; last_page: number } }> {
  const res = await apiClient.get<unknown>('/admin/certificates/batches', { params })
  const inner = unwrapCert<Record<string, unknown>>(res.data)
  const data = unwrapList<CertificateBatch>(inner)
  const metaRaw = inner && typeof inner === 'object' && !Array.isArray(inner)
    ? (inner.meta as { total?: number; last_page?: number } | undefined)
    : undefined
  return {
    data,
    meta: { total: Number(metaRaw?.total ?? data.length), last_page: Number(metaRaw?.last_page ?? 1) },
  }
}

export async function fetchCertificateBatch(
  id: number,
): Promise<{ batch: CertificateBatch; certificates: Certificate[] }> {
  const res = await apiClient.get<unknown>(`/admin/certificates/batches/${id}`)
  const raw = unwrapCert<{ batch: CertificateBatch; certificates: unknown }>(res.data)
  // Backend may return paginated certificates ({ data: [...] }) or plain array
  const certs = raw.certificates
  const certsArray: Certificate[] =
    Array.isArray(certs) ? certs :
    Array.isArray((certs as Record<string, unknown>)?.data) ? (certs as Record<string, unknown>).data as Certificate[] :
    []
  return { batch: raw.batch, certificates: certsArray }
}

// ── Certificate Logs ─────────────────────────────────────────────────────────

export async function fetchCertificateLogs(certId: number): Promise<CertificateLog[]> {
  const res = await apiClient.get<unknown>(`/admin/certificates/${certId}/logs`)
  const raw = res.data as Record<string, unknown>
  return Array.isArray(raw.data) ? (raw.data as CertificateLog[]) : []
}

// ── Export ────────────────────────────────────────────────────────────────────

export async function exportCertificates(params?: CertificateFilters): Promise<void> {
  const res = await apiClient.get('/admin/certificates/export', {
    params,
    responseType: 'blob',
  })
  const blob = res.data as Blob
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `certificates_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

// ── Student API ───────────────────────────────────────────────────────────────

export type StudentCertificateListResult = {
  data: Certificate[]
  meta: { total: number; per_page: number; current_page: number; last_page: number }
}

export async function fetchStudentCertificateList(
  params?: {
    page?: number
    per_page?: number
    search?: string
    certificate_type?: CertificateType
    issued_from?: string
    issued_to?: string
    sort_by?: 'issued_at' | 'created_at' | 'title'
    sort_dir?: 'asc' | 'desc'
  },
): Promise<StudentCertificateListResult> {
  const res = await apiClient.get<unknown>('/student/certificates', { params })
  const raw = res.data as Record<string, unknown>

  // Backend now returns { success, data: [...], meta: {...} }
  const dataArr = Array.isArray(raw.data) ? (raw.data as Certificate[]) : unwrapList<Certificate>(raw)
  const metaRaw = (raw.meta ?? {}) as Record<string, unknown>

  return {
    data: dataArr,
    meta: {
      total:        Number(metaRaw.total        ?? dataArr.length),
      per_page:     Number(metaRaw.per_page     ?? 20),
      current_page: Number(metaRaw.current_page ?? 1),
      last_page:    Number(metaRaw.last_page     ?? 1),
    },
  }
}

/** @deprecated Use fetchStudentCertificateList() */
export async function fetchStudentCertificatesNew(): Promise<Certificate[]> {
  const result = await fetchStudentCertificateList({ per_page: 100 })
  return result.data
}

export async function fetchStudentCertificate(id: number): Promise<Certificate> {
  const res = await apiClient.get<unknown>(`/student/certificates/${id}`)
  return unwrapCert<Certificate>(res.data)
}

/**
 * Download a student certificate as an authenticated PDF blob.
 * Always returns application/pdf — never a raw URL.
 */
export async function downloadStudentCertificate(id: number): Promise<Blob> {
  const res = await apiClient.get(`/student/certificates/${id}/download`, { responseType: 'blob' })
  return res.data as Blob
}

// ── Analytics Types ───────────────────────────────────────────────────────────

export type CertificateAnalyticsFilters = {
  preset?: 'today' | 'last_7_days' | 'last_30_days' | 'this_month' | 'last_month' | 'this_year' | 'all_time'
  date_from?: string
  date_to?: string
  status?: string
  approval_status?: string
  certificate_type?: string
  template_id?: number
  course_id?: number
  workshop_id?: number
  learning_path_id?: number
  issued_by?: number
  student_id?: number
  granularity?: 'daily' | 'weekly' | 'monthly'
}

export type CertificateAnalyticsOverview = {
  total: number
  issued: number
  pending: number
  approved: number
  rejected: number
  revoked: number
  generation_failed: number
  pdf_ready: number
  pdf_failed: number
  pdf_generating: number
  pdf_pending: number
  this_month: number
  last_month: number
  downloads_period: number
  avg_approval_hours: number | null
  avg_pdf_minutes: number | null
  batch_success_rate: number | null
}

export type CertificateTrendPoint = {
  date: string
  created: number
  issued: number
  pdf_failed: number
  approved: number
  downloads: number
}

export type CertificateStatusDistribution = {
  by_status: Record<string, number>
  by_approval_status: Record<string, number>
  by_pdf_status: Record<string, number>
  by_type: Record<string, number>
}

export type CertificateApprovalMetrics = {
  pending_approvals: number
  avg_first_approval_hours: number | null
  avg_final_approval_hours: number | null
  completed_this_month: number
  rejected_this_month: number
  stuck_approvals: Array<{
    id: number
    certificate_code: string
    title: string
    user_id: number
    approval_status: string
    created_at: string
    user?: { id: number; name: string; email: string }
  }>
  top_approvers: Array<{ user_id: number; name: string; count: number }>
}

export type CertificatePdfMetrics = {
  total: number
  successful: number
  failed: number
  in_progress: number
  pending: number
  has_pdf: number
  issued_missing_pdf: number
  avg_generation_secs: number | null
  total_size_bytes: number
  repeated_failures: number
  latest_failed: Array<{
    id: number
    certificate_code: string
    title: string
    pdf_last_error: string | null
    updated_at: string
    user?: { id: number; name: string }
  }>
}

export type CertificateDownloadMetrics = {
  total_downloads: number
  unique_certificates: number
  unique_students: number
  most_downloaded: Array<{
    certificate_id: number
    certificate_code: string | null
    title: string | null
    download_count: number
  }>
  not_downloaded: Array<{
    id: number
    certificate_code: string
    title: string
    user_id: number
    issued_at: string | null
  }>
}

export type CertificateTemplateUsage = {
  id: number
  name: string
  is_active: boolean
  is_default: boolean
  code_prefix: string
  total_certificates: number
  issued_certificates: number
  pdf_failures: number
  last_used_at: string | null
  avg_pdf_seconds: number | null
}

export type CertificateSourceAnalytics = {
  course_id?: number
  course_title?: string
  workshop_id?: number
  workshop_title?: string
  path_id?: number
  path_title?: string
  total: number
  issued: number
  pending: number
  rejected: number
  pdf_failed: number
  downloads?: number
  download_rate?: number
}

export type CertificateBatchAnalytics = {
  total: number
  completed: number
  failed: number
  completed_with_errors: number
  processing: number
  total_recipients: number
  total_generated: number
  total_failed: number
  largest_batch: number
  avg_completion_minutes: number | null
  batches: Array<{
    id: number
    batch_code: string
    status: string
    total_recipients: number
    generated_count: number
    failed_count: number
    created_by: number | null
    created_at: string
    completed_at: string | null
    created_by_user?: { id: number; name: string }
    createdBy?: { id: number; name: string }
  }>
}

export type CertificateFailureInsight = {
  type: string
  label: string
  count: number
  latest_occurrence: string | null
  recommended_action: string
}

// ── Analytics API functions ────────────────────────────────────────────────────

function analyticsParams(filters?: CertificateAnalyticsFilters): Record<string, string | number> {
  if (!filters) return { preset: 'last_30_days' }
  const out: Record<string, string | number> = {}
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== null && v !== '') out[k] = v as string | number
  }
  if (!out['preset'] && !out['date_from']) out['preset'] = 'last_30_days'
  return out
}

export async function fetchCertificateAnalyticsOverview(
  filters?: CertificateAnalyticsFilters,
): Promise<CertificateAnalyticsOverview> {
  const res = await apiClient.get<unknown>('/admin/certificates/analytics/overview', { params: analyticsParams(filters) })
  return (res.data as { success: boolean; data: CertificateAnalyticsOverview }).data
}

export async function fetchCertificateAnalyticsTrends(
  filters?: CertificateAnalyticsFilters,
): Promise<CertificateTrendPoint[]> {
  const res = await apiClient.get<unknown>('/admin/certificates/analytics/trends', { params: analyticsParams(filters) })
  const payload = res.data as { success: boolean; data: CertificateTrendPoint[] }
  return payload.data ?? []
}

export async function fetchCertificateStatusDistribution(
  filters?: CertificateAnalyticsFilters,
): Promise<CertificateStatusDistribution> {
  const res = await apiClient.get<unknown>('/admin/certificates/analytics/status-distribution', { params: analyticsParams(filters) })
  return (res.data as { data: CertificateStatusDistribution }).data
}

export async function fetchCertificateApprovalMetrics(
  filters?: CertificateAnalyticsFilters,
): Promise<CertificateApprovalMetrics> {
  const res = await apiClient.get<unknown>('/admin/certificates/analytics/approval', { params: analyticsParams(filters) })
  return (res.data as { data: CertificateApprovalMetrics }).data
}

export async function fetchCertificatePdfMetrics(
  filters?: CertificateAnalyticsFilters,
): Promise<CertificatePdfMetrics> {
  const res = await apiClient.get<unknown>('/admin/certificates/analytics/pdf', { params: analyticsParams(filters) })
  return (res.data as { data: CertificatePdfMetrics }).data
}

export async function fetchCertificateDownloadMetrics(
  filters?: CertificateAnalyticsFilters,
): Promise<CertificateDownloadMetrics> {
  const res = await apiClient.get<unknown>('/admin/certificates/analytics/downloads', { params: analyticsParams(filters) })
  return (res.data as { data: CertificateDownloadMetrics }).data
}

export async function fetchCertificateTemplateUsage(
  filters?: CertificateAnalyticsFilters,
): Promise<CertificateTemplateUsage[]> {
  const res = await apiClient.get<unknown>('/admin/certificates/analytics/templates', { params: analyticsParams(filters) })
  return (res.data as { data: CertificateTemplateUsage[] }).data ?? []
}

export async function fetchCertificateSourceAnalytics(
  source: 'courses' | 'workshops' | 'learning-paths',
  filters?: CertificateAnalyticsFilters,
): Promise<CertificateSourceAnalytics[]> {
  const res = await apiClient.get<unknown>(`/admin/certificates/analytics/${source}`, { params: analyticsParams(filters) })
  return (res.data as { data: CertificateSourceAnalytics[] }).data ?? []
}

export async function fetchCertificateBatchAnalytics(
  filters?: CertificateAnalyticsFilters,
): Promise<CertificateBatchAnalytics> {
  const res = await apiClient.get<unknown>('/admin/certificates/analytics/batches', { params: analyticsParams(filters) })
  return (res.data as { data: CertificateBatchAnalytics }).data
}

export async function fetchCertificateFailureInsights(
  filters?: CertificateAnalyticsFilters,
): Promise<CertificateFailureInsight[]> {
  const res = await apiClient.get<unknown>('/admin/certificates/analytics/failures', { params: analyticsParams(filters) })
  return (res.data as { data: CertificateFailureInsight[] }).data ?? []
}

export async function exportCertificateAnalytics(
  type: string,
  filters?: CertificateAnalyticsFilters,
): Promise<void> {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(analyticsParams(filters))) params.set(k, String(v))

  const token = (localStorage.getItem('auth_token') ?? localStorage.getItem('token') ?? '').trim()
  const base  = (import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
  const url   = `${base}/admin/certificates/analytics/export/${type}?${params.toString()}`

  const res = await fetch(url, {
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      Accept: 'text/csv,*/*',
    },
  })

  if (!res.ok) throw new Error(`Export failed: ${res.status}`)

  const blob     = await res.blob()
  const blobUrl  = URL.createObjectURL(blob)
  const a        = document.createElement('a')
  a.href         = blobUrl
  a.download     = `certificates-analytics-${type}-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(blobUrl)
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
