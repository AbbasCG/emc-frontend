import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest'
import apiClient from '@/api/axios'
import {
  // legacy
  fetchAdminCertificates,
  createCertificate,
  updateCertificate,
  fetchStudentCertificates,
  verifyCertificatePublic,
  verifyCertificatePublicAnonymous,
  // stats
  fetchCertificateStats,
  // admin CRUD
  fetchAdminCertificateList,
  fetchCertificates,
  fetchAdminCertificate,
  fetchCertificate,
  approveCertificate,
  issueCertificate,
  revokeCertificate,
  regenerateCertificate,
  retryPdf,
  downloadAdminCertificate,
  // eligibility / bulk
  fetchEligibility,
  bulkIssueCertificates,
  // templates
  fetchCertificateTemplates,
  fetchCertificateTemplate,
  fetchDefaultCertificateTemplate,
  createCertificateTemplate,
  updateCertificateTemplate,
  deleteCertificateTemplate,
  toggleTemplateActive,
  setTemplateAsDefault,
  duplicateTemplate,
  createDesignerTemplate,
  previewTemplate,
  previewDesigner,
  saveDesignerTemplate,
  uploadTemplateAsset,
  // approvals
  fetchCertificateApprovals,
  recordCertificateApproval,
  // batches / logs / export
  fetchCertificateBatches,
  fetchCertificateBatch,
  fetchCertificateLogs,
  exportCertificates,
  // student
  fetchStudentCertificateList,
  fetchStudentCertificatesNew,
  fetchStudentCertificate,
  downloadStudentCertificate,
  // analytics
  fetchCertificateAnalyticsOverview,
  fetchCertificateAnalyticsTrends,
  fetchCertificateStatusDistribution,
  fetchCertificateApprovalMetrics,
  fetchCertificatePdfMetrics,
  fetchCertificateDownloadMetrics,
  fetchCertificateTemplateUsage,
  fetchCertificateSourceAnalytics,
  fetchCertificateBatchAnalytics,
  fetchCertificateFailureInsights,
  exportCertificateAnalytics,
  verifyCertificate,
  type Certificate,
  type CertificateBatch,
  type CertificateTemplate,
  type CertificateLog,
  type CertificateAnalyticsOverview,
  type CertificateTrendPoint,
  type DesignerCfg,
} from '@/api/certificatesApi'
import type { CertificateRecord } from '@/types/intelligence'

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

const certIssued = {
  id: 101,
  certificate_type: 'course_completion',
  certificate_code: 'EMC-2026-0001',
  title: 'شهادة إتمام دورة أساسيات البرمجة',
  status: 'issued',
  recipient_name: 'أحمد محمد',
  verification_code: 'VER-101',
} as unknown as Certificate

const legacyCert = {
  id: 7,
  title: 'شهادة حضور ورشة',
  status: 'issued',
} as unknown as CertificateRecord

const batchRow = {
  id: 55,
  batch_code: 'BATCH-2026-05',
  certificate_type: 'workshop_attendance',
  status: 'completed',
  total_recipients: 20,
  generated_count: 19,
  failed_count: 1,
} as unknown as CertificateBatch

const templateRow = {
  id: 9,
  name: 'قالب الشهادة الافتراضي',
  type: 'course_completion',
  language: 'arabic',
  is_active: true,
  is_default: true,
} as unknown as CertificateTemplate

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

/* ── Legacy functions ── */

describe('legacy certificate functions', () => {
  it('fetchAdminCertificates unwraps a nested Laravel paginator ({ data: { data: [...] } })', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { data: [legacyCert] } } })
    const rows = await fetchAdminCertificates()
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/certificates')
    expect(rows).toEqual([legacyCert])
  })

  it('fetchAdminCertificates accepts a bare array payload', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [legacyCert] })
    await expect(fetchAdminCertificates()).resolves.toEqual([legacyCert])
  })

  it('fetchAdminCertificates falls back to [] on a null payload', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: null })
    await expect(fetchAdminCertificates()).resolves.toEqual([])
  })

  it('createCertificate posts the body and unwraps { data }', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: legacyCert } })
    const created = await createCertificate({ title: 'شهادة حضور ورشة' })
    expect(mockedApi.post).toHaveBeenCalledWith('/admin/certificates', { title: 'شهادة حضور ورشة' })
    expect(created).toEqual(legacyCert)
  })

  it('updateCertificate with status "revoked" posts to the revoke endpoint with a default reason', async () => {
    // exercises the `certificate` envelope branch of the unwrap helper
    mockedApi.post.mockResolvedValueOnce({ data: { certificate: legacyCert } })
    const updated = await updateCertificate(7, { status: 'revoked' })
    expect(mockedApi.post).toHaveBeenCalledWith('/admin/certificates/7/revoke', {
      revoke_reason: 'Updated via admin panel',
    })
    expect(updated).toEqual(legacyCert)
  })

  it('updateCertificate with any other status just re-fetches the certificate (GET)', async () => {
    // bare payload (no data/certificate key) passes through the unwrap helper unchanged
    mockedApi.get.mockResolvedValueOnce({ data: legacyCert })
    const got = await updateCertificate(7, { title: 'عنوان جديد' })
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/certificates/7')
    expect(mockedApi.post).not.toHaveBeenCalled()
    expect(got).toEqual(legacyCert)
  })

  it('fetchStudentCertificates unwraps via asList', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [legacyCert] } })
    await expect(fetchStudentCertificates()).resolves.toEqual([legacyCert])
    expect(mockedApi.get).toHaveBeenCalledWith('/student/certificates')
  })
})

/* ── Public verification ── */

describe('public verification', () => {
  it('verifyCertificatePublic encodes the code into the URL and unwraps { data }', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { valid: true } } })
    const result = await verifyCertificatePublic('EMC 2026/x')
    expect(mockedApi.get).toHaveBeenCalledWith('/certificates/verify/EMC%202026%2Fx')
    expect(result).toEqual({ valid: true })
  })

  it('verifyCertificatePublicAnonymous fetches without apiClient (no Authorization header)', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.emc.test/api')
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { valid: true } }),
    } as unknown as Response)
    vi.stubGlobal('fetch', fetchMock)

    const result = await verifyCertificatePublicAnonymous('EMC 123')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.emc.test/api/certificates/verify/EMC%20123',
      { headers: { Accept: 'application/json' } },
    )
    expect(result).toEqual({ valid: true })
    expect(mockedApi.get).not.toHaveBeenCalled()
  })

  it('verifyCertificatePublicAnonymous throws "verify failed" on a non-ok response', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.emc.test/api')
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'not found' }),
    } as unknown as Response)
    vi.stubGlobal('fetch', fetchMock)
    await expect(verifyCertificatePublicAnonymous('BAD')).rejects.toThrow('verify failed')
  })

  it('verifyCertificate strips a trailing slash from the base URL and unwraps the envelope', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.emc.test/api/')
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { valid: false, message: 'رمز غير صالح' } }),
    } as unknown as Response)
    vi.stubGlobal('fetch', fetchMock)

    const result = await verifyCertificate('XYZ')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.emc.test/api/certificates/verify/XYZ',
      { headers: { Accept: 'application/json' } },
    )
    expect(result).toEqual({ valid: false, message: 'رمز غير صالح' })
  })
})

/* ── Stats ── */

describe('fetchCertificateStats', () => {
  it('maps a complete stats payload directly', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: {
          total: 120,
          issued_this_month: 8,
          pending: 5,
          revoked: 2,
          rejected: 1,
          pdf_failed: 3,
          generated_this_month: 7,
          by_type: { course_completion: 100 },
          by_status: { issued: 100 },
          recent: [certIssued],
        },
      },
    })
    const stats = await fetchCertificateStats()
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/certificates/stats')
    expect(stats.total).toBe(120)
    expect(stats.issued_this_month).toBe(8)
    expect(stats.pending).toBe(5)
    expect(stats.revoked).toBe(2)
    expect(stats.rejected).toBe(1)
    expect(stats.pdf_failed).toBe(3)
    expect(stats.generated_this_month).toBe(7)
    expect(stats.by_type).toEqual({ course_completion: 100 })
    expect(stats.recent).toEqual([certIssued])
  })

  it('derives pending/revoked/rejected from by_status and issued_this_month from recent_30d', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        total: 10,
        recent_30d: 6,
        by_status: { pending: 2, approved: 1, pending_generation: 3, revoked: 4, rejected: 5 },
        recent: { data: [certIssued] },
      },
    })
    const stats = await fetchCertificateStats()
    expect(stats.pending).toBe(6) // 2 + 1 + 3
    expect(stats.revoked).toBe(4)
    expect(stats.rejected).toBe(5)
    expect(stats.issued_this_month).toBe(6)
    expect(stats.pdf_failed).toBe(0)
    expect(stats.by_type).toEqual({})
    expect(stats.recent).toEqual([certIssued]) // unwrapped from { data: [...] }
  })
})

/* ── Admin CRUD ── */

describe('admin certificate list / detail / actions', () => {
  it('fetchAdminCertificateList passes filters and unwraps data + meta', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { success: true, data: { data: [certIssued], meta: { total: 57, last_page: 3, current_page: 2 } } },
    })
    const result = await fetchAdminCertificateList({ status: 'issued', page: 2 })
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/certificates', { params: { status: 'issued', page: 2 } })
    expect(result.data).toEqual([certIssued])
    expect(result.meta).toEqual({ total: 57, last_page: 3, current_page: 2 })
  })

  it('fetchAdminCertificateList defaults meta when the payload is a bare list', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [certIssued] } })
    const result = await fetchAdminCertificateList()
    expect(result.data).toEqual([certIssued])
    expect(result.meta).toEqual({ total: 1, last_page: 1, current_page: 1 })
  })

  it('fetchAdminCertificateList survives a null payload with an empty result', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: null })
    const result = await fetchAdminCertificateList()
    expect(result.data).toEqual([])
    expect(result.meta).toEqual({ total: 0, last_page: 1, current_page: 1 })
  })

  it('deprecated aliases point at the canonical functions', () => {
    expect(fetchCertificates).toBe(fetchAdminCertificateList)
    expect(fetchCertificate).toBe(fetchAdminCertificate)
  })

  it('fetchAdminCertificate unwraps a single certificate', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: certIssued } })
    await expect(fetchAdminCertificate(101)).resolves.toEqual(certIssued)
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/certificates/101')
  })

  it.each([
    ['approve', approveCertificate],
    ['issue', issueCertificate],
    ['regenerate', regenerateCertificate],
    ['retry-pdf', retryPdf],
  ] as const)('POSTs /admin/certificates/{id}/%s', async (segment, fn) => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: certIssued } })
    await expect(fn(101)).resolves.toEqual(certIssued)
    expect(mockedApi.post).toHaveBeenCalledWith(`/admin/certificates/101/${segment}`)
  })

  it('revokeCertificate posts the caller-supplied Arabic reason', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: certIssued } })
    await revokeCertificate(101, 'خطأ في بيانات المستفيد')
    expect(mockedApi.post).toHaveBeenCalledWith('/admin/certificates/101/revoke', {
      revoke_reason: 'خطأ في بيانات المستفيد',
    })
  })

  it('downloadAdminCertificate requests an authenticated blob', async () => {
    const blob = new Blob(['%PDF'])
    mockedApi.get.mockResolvedValueOnce({ data: blob })
    await expect(downloadAdminCertificate(101)).resolves.toBe(blob)
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/certificates/101/download', { responseType: 'blob' })
  })

  it('propagates API errors unchanged', async () => {
    const boom = new Error('Network Error')
    mockedApi.get.mockRejectedValueOnce(boom)
    await expect(fetchAdminCertificate(1)).rejects.toBe(boom)
    mockedApi.post.mockRejectedValueOnce(boom)
    await expect(approveCertificate(1)).rejects.toBe(boom)
  })
})

/* ── Eligibility ── */

describe('fetchEligibility', () => {
  it('returns the empty result without any HTTP call when related_type is blank', async () => {
    const result = await fetchEligibility({ related_type: '   ', related_id: 5 })
    expect(result).toEqual({ summary: { total: 0, eligible: 0, ineligible: 0 }, students: [] })
    expect(mockedApi.get).not.toHaveBeenCalled()
  })

  it('returns the empty result without any HTTP call when related_id is not positive', async () => {
    const result = await fetchEligibility({ related_type: 'course', related_id: 0 })
    expect(result.students).toEqual([])
    expect(mockedApi.get).not.toHaveBeenCalled()
  })

  it('normalizes students with nested user objects and flat alias fields alike', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: {
          summary: { total: 2, eligible: 1, ineligible: 1 },
          students: [
            {
              user: { id: 4, name: 'أحمد محمد', email: 'ahmad@emc.sa' },
              progress_pct: 80,
              attendance_pct: 90,
              assignments_pct: 70,
              assignments_completed: 7,
              assignments_total: 10,
              is_eligible: true,
              reason: null,
            },
            {
              user_id: 7,
              name: 'سارة علي',
              email: 'sara@emc.sa',
              progress_percentage: 50,
              attendance_percentage: 60,
              assignments: 40,
              eligible: false,
              reason: 'نسبة الحضور منخفضة',
              existing_certificate: { id: 3, status: 'issued', certificate_code: 'EMC-1' },
            },
          ],
        },
      },
    })

    const result = await fetchEligibility({
      related_type: 'course',
      related_id: 9,
      certificate_type: 'course_completion',
    })
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/certificates/eligibility', {
      params: { related_type: 'course', related_id: 9, certificate_type: 'course_completion' },
    })
    expect(result.summary).toEqual({ total: 2, eligible: 1, ineligible: 1, already_issued: 0 })

    const [a, b] = result.students
    expect(a?.user).toEqual({ id: 4, name: 'أحمد محمد', email: 'ahmad@emc.sa' })
    expect(a?.progress_pct).toBe(80)
    expect(a?.attendance_pct).toBe(90)
    expect(a?.assignments_pct).toBe(70)
    expect(a?.assignments_completed).toBe(7)
    expect(a?.assignments_total).toBe(10)
    expect(a?.is_eligible).toBe(true)
    expect(a?.already_issued).toBe(false)
    expect(a?.existing_certificate).toBeNull()
    expect(a?.reason).toBeNull()

    expect(b?.user).toEqual({ id: 7, name: 'سارة علي', email: 'sara@emc.sa' })
    expect(b?.progress_pct).toBe(50)
    expect(b?.attendance_pct).toBe(60)
    expect(b?.assignments_pct).toBe(40)
    expect(b?.is_eligible).toBe(false)
    // existing certificate implies already_issued + derives certificate_status
    expect(b?.already_issued).toBe(true)
    expect(b?.certificate_status).toBe('issued')
    expect(b?.existing_certificate).toEqual({ id: 3, status: 'issued', certificate_code: 'EMC-1' })
    expect(b?.reason).toBe('نسبة الحضور منخفضة')
  })

  it('returns zeroed summary and no students when the response has no data envelope', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: {} })
    const result = await fetchEligibility({ related_type: 'course', related_id: 9 })
    expect(result.summary).toEqual({ total: 0, eligible: 0, ineligible: 0, already_issued: 0 })
    expect(result.students).toEqual([])
  })
})

/* ── Bulk issue ── */

describe('bulkIssueCertificates', () => {
  it('sends both `type` and `certificate_type` and maps the batch payload', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: {
        message: 'تم بدء إصدار الشهادات',
        data: {
          batch_id: 9,
          batch_code: 'B-2026-01',
          status: 'processing',
          total_recipients: 3,
          generated_count: 1,
          failed_count: 0,
          created_at: '2026-08-01T10:00:00Z',
        },
      },
    })

    const result = await bulkIssueCertificates({
      user_ids: [1, 2, 3],
      certificate_type: 'workshop_attendance',
      related_type: 'workshop',
      related_id: 4,
      template_id: 9,
      title: 'شهادة حضور ورشة الروبوتات',
    })

    expect(mockedApi.post).toHaveBeenCalledWith(
      '/admin/certificates/bulk-issue',
      expect.objectContaining({
        user_ids: [1, 2, 3],
        type: 'workshop_attendance',
        certificate_type: 'workshop_attendance',
        related_type: 'workshop',
        related_id: 4,
        template_id: 9,
        title: 'شهادة حضور ورشة الروبوتات',
        override: false,
      }),
    )
    expect(result.message).toBe('تم بدء إصدار الشهادات')
    expect(result.batch.id).toBe(9)
    expect(result.batch.batch_code).toBe('B-2026-01')
    expect(result.batch.status).toBe('processing')
    expect(result.batch.total_recipients).toBe(3)
    expect(result.batch.generated_count).toBe(1)
    expect(result.batch.created_at).toBe('2026-08-01T10:00:00Z')
  })

  it('falls back to defaults when the backend returns a minimal payload', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: { id: 3 } } })
    const result = await bulkIssueCertificates({
      user_ids: [10, 11],
      certificate_type: 'course_completion',
      related_type: 'course',
      related_id: 8,
      override: true,
    })
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/admin/certificates/bulk-issue',
      expect.objectContaining({ override: true }),
    )
    expect(result.batch.id).toBe(3) // batch_id missing → id
    expect(result.batch.batch_code).toBe('')
    expect(result.batch.status).toBe('pending')
    expect(result.batch.total_recipients).toBe(2) // user_ids.length
    expect(typeof result.batch.created_at).toBe('string')
    expect(result.message).toBe('Bulk certificate issuance started.')
  })
})

/* ── Templates ── */

describe('certificate templates', () => {
  it('fetchCertificateTemplates lists with params', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [templateRow] } })
    await expect(fetchCertificateTemplates({ active: 1 })).resolves.toEqual([templateRow])
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/certificates/templates', { params: { active: 1 } })
  })

  it('fetchCertificateTemplate / fetchDefaultCertificateTemplate hit the right routes', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: templateRow } })
    await expect(fetchCertificateTemplate(9)).resolves.toEqual(templateRow)
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/certificates/templates/9')

    mockedApi.get.mockResolvedValueOnce({ data: { data: templateRow } })
    await expect(fetchDefaultCertificateTemplate()).resolves.toEqual(templateRow)
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/certificates/templates/default')
  })

  it('create / update / delete templates', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: templateRow } })
    await createCertificateTemplate({ name: 'قالب جديد' })
    expect(mockedApi.post).toHaveBeenCalledWith('/admin/certificates/templates', { name: 'قالب جديد' })

    mockedApi.put.mockResolvedValueOnce({ data: { data: templateRow } })
    await updateCertificateTemplate(9, { name: 'قالب معدل' })
    expect(mockedApi.put).toHaveBeenCalledWith('/admin/certificates/templates/9', { name: 'قالب معدل' })

    mockedApi.delete.mockResolvedValueOnce({ data: {} })
    await expect(deleteCertificateTemplate(9)).resolves.toBeUndefined()
    expect(mockedApi.delete).toHaveBeenCalledWith('/admin/certificates/templates/9')
  })

  it('toggleTemplateActive / setTemplateAsDefault use PUT, duplicateTemplate uses POST', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: { data: templateRow } })
    await toggleTemplateActive(9)
    expect(mockedApi.put).toHaveBeenCalledWith('/admin/certificates/templates/9/activate')

    mockedApi.put.mockResolvedValueOnce({ data: { data: templateRow } })
    await setTemplateAsDefault(9)
    expect(mockedApi.put).toHaveBeenCalledWith('/admin/certificates/templates/9/set-default')

    mockedApi.post.mockResolvedValueOnce({ data: { data: templateRow } })
    await duplicateTemplate(9)
    expect(mockedApi.post).toHaveBeenCalledWith('/admin/certificates/templates/9/duplicate')
  })

  it('createDesignerTemplate forces designer_mode and the default blade_path', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: templateRow } })
    await createDesignerTemplate({ name: 'قالب المصمم', type: 'custom', language: 'bilingual' })
    expect(mockedApi.post).toHaveBeenCalledWith('/admin/certificates/templates', {
      name: 'قالب المصمم',
      type: 'custom',
      language: 'bilingual',
      designer_mode: true,
      blade_path: 'certificates.templates.default',
    })
  })

  it('previewTemplate prefers html, then data, then empty string', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { html: '<div>شهادة</div>' } })
    await expect(previewTemplate(9)).resolves.toBe('<div>شهادة</div>')
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/certificates/templates/9/preview')

    mockedApi.get.mockResolvedValueOnce({ data: { data: '<p>معاينة</p>' } })
    await expect(previewTemplate(9)).resolves.toBe('<p>معاينة</p>')

    mockedApi.get.mockResolvedValueOnce({ data: {} })
    await expect(previewTemplate(9)).resolves.toBe('')
  })

  it('previewDesigner posts { cfg } and returns the raw HTML body', async () => {
    const cfg: DesignerCfg = { org_name_ar: 'مركز EMC', orientation: 'landscape' }
    mockedApi.post.mockResolvedValueOnce({ data: '<html dir="rtl"></html>' })
    await expect(previewDesigner(cfg)).resolves.toBe('<html dir="rtl"></html>')
    expect(mockedApi.post).toHaveBeenCalledWith('/admin/certificates/templates/preview-designer', { cfg })
  })

  it('saveDesignerTemplate puts to the designer endpoint', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: { data: templateRow } })
    await saveDesignerTemplate(9, { name: 'قالبي', color_primary: '#123456' })
    expect(mockedApi.put).toHaveBeenCalledWith('/admin/certificates/templates/9/designer', {
      name: 'قالبي',
      color_primary: '#123456',
    })
  })

  it('uploadTemplateAsset posts FormData WITHOUT a manual Content-Type config', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { path: 'p', url: 'u' } })
    const file = new File(['img'], 'logo.png', { type: 'image/png' })
    const result = await uploadTemplateAsset(9, 'logo_primary', file)
    // exactly two args — no third config arg, axios sets the multipart boundary itself
    expect(mockedApi.post).toHaveBeenCalledWith('/admin/certificates/templates/9/upload-asset', expect.any(FormData))
    const fd = mockedApi.post.mock.calls[0]?.[1] as FormData
    expect(fd.get('file')).toBe(file)
    expect(fd.get('field')).toBe('logo_primary')
    expect(result).toEqual({ path: 'p', url: 'u' })
  })
})

/* ── Approvals ── */

describe('certificate approvals', () => {
  it('fetchCertificateApprovals returns the raw approvals map', async () => {
    const payload = {
      approval_status: 'pending',
      approvals: {
        administrative: { status: 'approved', type_label: 'الاعتماد الإداري', approver: 'أحمد', notes: null, actioned_at: '2026-08-01' },
      },
    }
    mockedApi.get.mockResolvedValueOnce({ data: payload })
    await expect(fetchCertificateApprovals(101)).resolves.toEqual(payload)
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/certificates/101/approvals')
  })

  it('recordCertificateApproval posts type/status/notes', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { approval_status: 'fully_approved' } })
    const result = await recordCertificateApproval(101, 'programs', 'approved', 'مستوفٍ للشروط')
    expect(mockedApi.post).toHaveBeenCalledWith('/admin/certificates/101/approvals', {
      type: 'programs',
      status: 'approved',
      notes: 'مستوفٍ للشروط',
    })
    expect(result).toEqual({ approval_status: 'fully_approved' })
  })
})

/* ── Batches & logs ── */

describe('certificate batches and logs', () => {
  it('fetchCertificateBatches unwraps data + meta', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { data: { data: [batchRow], meta: { total: 4, last_page: 2 } } },
    })
    const result = await fetchCertificateBatches({ page: 1 })
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/certificates/batches', { params: { page: 1 } })
    expect(result.data).toEqual([batchRow])
    expect(result.meta).toEqual({ total: 4, last_page: 2 })
  })

  it('fetchCertificateBatches defaults meta for a bare list', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [batchRow] } })
    const result = await fetchCertificateBatches()
    expect(result.meta).toEqual({ total: 1, last_page: 1 })
  })

  it('fetchCertificateBatch accepts a plain certificates array', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { batch: batchRow, certificates: [certIssued] } } })
    const result = await fetchCertificateBatch(55)
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/certificates/batches/55')
    expect(result.batch).toEqual(batchRow)
    expect(result.certificates).toEqual([certIssued])
  })

  it('fetchCertificateBatch accepts paginated certificates and tolerates garbage', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { data: { batch: batchRow, certificates: { data: [certIssued] } } },
    })
    await expect(fetchCertificateBatch(55)).resolves.toMatchObject({ certificates: [certIssued] })

    mockedApi.get.mockResolvedValueOnce({ data: { data: { batch: batchRow, certificates: 'zzz' } } })
    await expect(fetchCertificateBatch(55)).resolves.toMatchObject({ certificates: [] })
  })

  it('fetchCertificateLogs returns the data array, or [] when it is not an array', async () => {
    const log = { id: 1, action: 'issued', actor: null, old_values: null, new_values: null, ip_address: null, created_at: '2026-08-01' } as CertificateLog
    mockedApi.get.mockResolvedValueOnce({ data: { data: [log] } })
    await expect(fetchCertificateLogs(101)).resolves.toEqual([log])
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/certificates/101/logs')

    mockedApi.get.mockResolvedValueOnce({ data: { data: { nope: true } } })
    await expect(fetchCertificateLogs(101)).resolves.toEqual([])
  })
})

/* ── CSV export (admin list) ── */

describe('exportCertificates', () => {
  const originalCreateObjectURL = URL.createObjectURL
  const originalRevokeObjectURL = URL.revokeObjectURL

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    URL.revokeObjectURL = vi.fn()
  })

  afterAll(() => {
    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
  })

  it('downloads the CSV blob and revokes the object URL after the 5s grace period', async () => {
    vi.useFakeTimers()
    try {
      mockedApi.get.mockResolvedValueOnce({ data: new Blob(['csv-bytes']) })
      await exportCertificates({ status: 'issued' })
      expect(mockedApi.get).toHaveBeenCalledWith('/admin/certificates/export', {
        params: { status: 'issued' },
        responseType: 'blob',
      })
      expect(URL.createObjectURL).toHaveBeenCalled()
      expect(URL.revokeObjectURL).not.toHaveBeenCalled()
      vi.advanceTimersByTime(5000)
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    } finally {
      vi.useRealTimers()
    }
  })
})

/* ── Student API ── */

describe('student certificates', () => {
  it('fetchStudentCertificateList maps data + meta from the enveloped response', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { success: true, data: [certIssued], meta: { total: 40, per_page: 10, current_page: 2, last_page: 4 } },
    })
    const result = await fetchStudentCertificateList({ page: 2, per_page: 10 })
    expect(mockedApi.get).toHaveBeenCalledWith('/student/certificates', { params: { page: 2, per_page: 10 } })
    expect(result.data).toEqual([certIssued])
    expect(result.meta).toEqual({ total: 40, per_page: 10, current_page: 2, last_page: 4 })
  })

  it('fetchStudentCertificateList unwraps a nested paginator and applies meta defaults', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { data: [certIssued] } } })
    const result = await fetchStudentCertificateList()
    expect(result.data).toEqual([certIssued])
    expect(result.meta).toEqual({ total: 1, per_page: 20, current_page: 1, last_page: 1 })
  })

  it('fetchStudentCertificatesNew requests 100 per page and returns the bare list', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [certIssued] } })
    await expect(fetchStudentCertificatesNew()).resolves.toEqual([certIssued])
    expect(mockedApi.get).toHaveBeenCalledWith('/student/certificates', { params: { per_page: 100 } })
  })

  it('fetchStudentCertificate unwraps a single record', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: certIssued } })
    await expect(fetchStudentCertificate(101)).resolves.toEqual(certIssued)
    expect(mockedApi.get).toHaveBeenCalledWith('/student/certificates/101')
  })

  it('downloadStudentCertificate fetches an authenticated PDF blob', async () => {
    const blob = new Blob(['%PDF'])
    mockedApi.get.mockResolvedValueOnce({ data: blob })
    await expect(downloadStudentCertificate(101)).resolves.toBe(blob)
    expect(mockedApi.get).toHaveBeenCalledWith('/student/certificates/101/download', { responseType: 'blob' })
  })
})

/* ── Analytics ── */

describe('certificate analytics', () => {
  const overview = { total: 10, issued: 8, pending: 1 } as unknown as CertificateAnalyticsOverview

  it('defaults to preset last_30_days when no filters are given', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { success: true, data: overview } })
    await expect(fetchCertificateAnalyticsOverview()).resolves.toEqual(overview)
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/certificates/analytics/overview', {
      params: { preset: 'last_30_days' },
    })
  })

  it('prunes empty filter values and skips the default preset when date_from is set', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { success: true, data: overview } })
    await fetchCertificateAnalyticsOverview({ status: '', template_id: 4, date_from: '2026-01-01' })
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/certificates/analytics/overview', {
      params: { template_id: 4, date_from: '2026-01-01' },
    })
  })

  it('keeps an explicitly chosen preset', async () => {
    const trend: CertificateTrendPoint = { date: '2026-08-01', created: 3, issued: 2, pdf_failed: 0, approved: 1, downloads: 5 }
    mockedApi.get.mockResolvedValueOnce({ data: { success: true, data: [trend] } })
    await expect(fetchCertificateAnalyticsTrends({ preset: 'this_month' })).resolves.toEqual([trend])
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/certificates/analytics/trends', {
      params: { preset: 'this_month' },
    })
  })

  it('trends / templates / source / failures fall back to [] when data is missing', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: {} })
    await expect(fetchCertificateAnalyticsTrends()).resolves.toEqual([])

    mockedApi.get.mockResolvedValueOnce({ data: {} })
    await expect(fetchCertificateTemplateUsage()).resolves.toEqual([])

    mockedApi.get.mockResolvedValueOnce({ data: {} })
    await expect(fetchCertificateSourceAnalytics('workshops')).resolves.toEqual([])
    expect(mockedApi.get).toHaveBeenLastCalledWith('/admin/certificates/analytics/workshops', {
      params: { preset: 'last_30_days' },
    })

    mockedApi.get.mockResolvedValueOnce({ data: {} })
    await expect(fetchCertificateFailureInsights()).resolves.toEqual([])
  })

  it('each metric endpoint hits its dedicated route and unwraps { data }', async () => {
    const cases: Array<[() => Promise<unknown>, string]> = [
      [() => fetchCertificateStatusDistribution(), '/admin/certificates/analytics/status-distribution'],
      [() => fetchCertificateApprovalMetrics(), '/admin/certificates/analytics/approval'],
      [() => fetchCertificatePdfMetrics(), '/admin/certificates/analytics/pdf'],
      [() => fetchCertificateDownloadMetrics(), '/admin/certificates/analytics/downloads'],
      [() => fetchCertificateBatchAnalytics(), '/admin/certificates/analytics/batches'],
      [() => fetchCertificateSourceAnalytics('courses'), '/admin/certificates/analytics/courses'],
      [() => fetchCertificateSourceAnalytics('learning-paths'), '/admin/certificates/analytics/learning-paths'],
    ]
    for (const [call, route] of cases) {
      mockedApi.get.mockResolvedValueOnce({ data: { data: { marker: route } } })
      await expect(call()).resolves.toEqual({ marker: route })
      expect(mockedApi.get).toHaveBeenLastCalledWith(route, { params: { preset: 'last_30_days' } })
    }
  })
})

/* ── Analytics CSV export (raw fetch with bearer token) ── */

describe('exportCertificateAnalytics', () => {
  const originalCreateObjectURL = URL.createObjectURL
  const originalRevokeObjectURL = URL.revokeObjectURL

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    URL.revokeObjectURL = vi.fn()
    localStorage.removeItem('auth_token')
    localStorage.removeItem('token')
  })

  afterAll(() => {
    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
  })

  it('builds the export URL with query params and sends the bearer token', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.emc.test/api')
    localStorage.setItem('auth_token', 'tok-123')
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      blob: async () => new Blob(['csv']),
    } as unknown as Response)
    vi.stubGlobal('fetch', fetchMock)

    await exportCertificateAnalytics('overview', { preset: 'this_month' })

    const [calledUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(calledUrl).toBe('https://api.emc.test/api/admin/certificates/analytics/export/overview?preset=this_month')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok-123')
    expect(URL.createObjectURL).toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('sends an empty Authorization header when no token is stored', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.emc.test/api')
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      blob: async () => new Blob(['csv']),
    } as unknown as Response)
    vi.stubGlobal('fetch', fetchMock)

    await exportCertificateAnalytics('pdf')
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect((init.headers as Record<string, string>).Authorization).toBe('')
  })

  it('throws with the HTTP status when the export fails', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.emc.test/api')
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false, status: 403 } as unknown as Response)
    vi.stubGlobal('fetch', fetchMock)
    await expect(exportCertificateAnalytics('overview')).rejects.toThrow('Export failed: 403')
  })
})
