import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '@/api/axios'
import {
  fetchQualityDashboard,
  fetchQualityWorkshops,
  fetchQualityReviews,
  createQualityReview,
  updateQualityReview,
  approveQualityReview,
  fetchQualityIncidents,
  createQualityIncident,
  updateQualityIncident,
  fetchCorrectiveActions,
  createCorrectiveAction,
  updateCorrectiveAction,
  fetchQualityTeam,
  fetchQualityAuditLogs,
  fetchQualityCompliance,
  type QualityIncidentRecord,
  type CorrectiveActionRecord,
  type QualityAuditLogRecord,
} from '@/api/qualityApi'
import type { QualityReview } from '@/types/intelligence'

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

const review: QualityReview = {
  id: 1,
  reviewable_label: 'دورة إدارة المشاريع',
  reviewer_name: 'أحمد محمود',
  overall_score: 4.5,
  status: 'submitted',
  reviewed_at: '2026-02-01T10:00:00Z',
}

describe('quality dashboard / compliance / team', () => {
  it('fetchQualityDashboard unwraps the payload and requests silently', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { total_reviews: 12 } } })
    const out = await fetchQualityDashboard()
    expect(mockedApi.get).toHaveBeenCalledWith('/quality/dashboard', { skipErrorToast: true })
    expect(out).toEqual({ total_reviews: 12 })
  })

  it('fetchQualityDashboard returns null when the envelope is empty', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: {} })
    expect(await fetchQualityDashboard()).toBeNull()
  })

  it('fetchQualityCompliance unwraps and falls back to null', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { policies: 3 } } })
    expect(await fetchQualityCompliance()).toEqual({ policies: 3 })
    expect(mockedApi.get).toHaveBeenCalledWith('/quality/compliance', { skipErrorToast: true })

    mockedApi.get.mockResolvedValueOnce({ data: {} })
    expect(await fetchQualityCompliance()).toBeNull()
  })

  it('fetchQualityTeam returns the member list, [] when missing', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [{ name: 'منى حسن' }] } })
    expect(await fetchQualityTeam()).toEqual([{ name: 'منى حسن' }])
    expect(mockedApi.get).toHaveBeenCalledWith('/quality/team', { skipErrorToast: true })

    mockedApi.get.mockResolvedValueOnce({ data: {} })
    expect(await fetchQualityTeam()).toEqual([])
  })

  it('errors propagate (no internal catch)', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'))
    await expect(fetchQualityDashboard()).rejects.toThrow('Network Error')
  })
})

describe('workshops (quality view)', () => {
  it('passes filter params alongside the silent flag', async () => {
    const page = { data: [{ id: 1, title: 'ورشة القيادة' }], meta: { current_page: 1, total: 1 } }
    mockedApi.get.mockResolvedValueOnce({ data: { data: page } })
    const out = await fetchQualityWorkshops({ status: 'pending' })
    expect(mockedApi.get).toHaveBeenCalledWith('/quality/workshops', {
      skipErrorToast: true,
      params: { status: 'pending' },
    })
    expect(out).toEqual(page)
  })

  it('falls back to an empty page on a missing payload', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: {} })
    expect(await fetchQualityWorkshops()).toEqual({ data: [], meta: {} })
  })
})

describe('reviews', () => {
  it('no-params overload returns the bare review list', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [review] } })
    const out = await fetchQualityReviews()
    expect(mockedApi.get).toHaveBeenCalledWith('/quality/reviews', expect.objectContaining({ skipErrorToast: true }))
    expect(out).toEqual([review])
  })

  it('params overload returns the paginator page', async () => {
    const page = { data: [review], meta: { current_page: 2, last_page: 5 } }
    mockedApi.get.mockResolvedValueOnce({ data: { data: page } })
    const out = await fetchQualityReviews({ page: '2' })
    expect(mockedApi.get).toHaveBeenCalledWith('/quality/reviews', {
      skipErrorToast: true,
      params: { page: '2' },
    })
    expect(out).toEqual(page)
  })

  it('empty payload falls back to a page object even on the list overload (current behavior)', async () => {
    // NOTE: overload declares Promise<QualityReview[]> for the no-params call, but the
    // shared fallback returns { data: [], meta: {} } — asserting what the code does.
    mockedApi.get.mockResolvedValueOnce({ data: {} })
    const out = await fetchQualityReviews()
    expect(out).toEqual({ data: [], meta: {} })
  })

  it('createQualityReview posts the body (not silent) and unwraps', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: review } })
    const out = await createQualityReview({ reviewable_label: 'دورة إدارة المشاريع', overall_score: 4.5 })
    expect(mockedApi.post).toHaveBeenCalledWith('/quality/reviews', {
      reviewable_label: 'دورة إدارة المشاريع',
      overall_score: 4.5,
    })
    expect(out).toEqual(review)
  })

  it('updateQualityReview patches /quality/reviews/{id}', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: { data: { id: 4, status: 'archived' } } })
    const out = await updateQualityReview(4, { status: 'archived' })
    expect(mockedApi.patch).toHaveBeenCalledWith('/quality/reviews/4', { status: 'archived' })
    expect(out).toEqual({ id: 4, status: 'archived' })
  })

  it('approveQualityReview posts to the approve endpoint with no body', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: { id: 4, status: 'approved' } } })
    const out = await approveQualityReview(4)
    expect(mockedApi.post).toHaveBeenCalledWith('/quality/reviews/4/approve')
    expect(out).toEqual({ id: 4, status: 'approved' })
  })

  it('updateQualityReview returns undefined when the envelope has no data key', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: {} })
    expect(await updateQualityReview(4, {})).toBeUndefined()
  })
})

describe('incidents', () => {
  const incident: QualityIncidentRecord = {
    id: 7,
    title: 'انقطاع في بث الجلسة',
    severity: 'high',
    status: 'open',
    reporter: { name: 'سارة علي' },
  }

  it('fetchQualityIncidents passes params and unwraps the page', async () => {
    const page = { data: [incident], meta: { total: 1 }, stats: { open: 1 } }
    mockedApi.get.mockResolvedValueOnce({ data: { data: page } })
    const out = await fetchQualityIncidents({ severity: 'high' })
    expect(mockedApi.get).toHaveBeenCalledWith('/quality/incidents', {
      skipErrorToast: true,
      params: { severity: 'high' },
    })
    expect(out).toEqual(page)
  })

  it('fetchQualityIncidents falls back to an empty page', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: {} })
    expect(await fetchQualityIncidents()).toEqual({ data: [], meta: {} })
  })

  it('createQualityIncident posts and unwraps', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: incident } })
    const out = await createQualityIncident({ title: 'انقطاع في بث الجلسة' })
    expect(mockedApi.post).toHaveBeenCalledWith('/quality/incidents', { title: 'انقطاع في بث الجلسة' })
    expect(out).toEqual(incident)
  })

  it('updateQualityIncident patches /quality/incidents/{id}', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: { data: { ...incident, status: 'resolved' } } })
    const out = await updateQualityIncident(7, { status: 'resolved' })
    expect(mockedApi.patch).toHaveBeenCalledWith('/quality/incidents/7', { status: 'resolved' })
    expect(out?.status).toBe('resolved')
  })

  it('createQualityIncident propagates rejection', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('500'))
    await expect(createQualityIncident({})).rejects.toThrow('500')
  })
})

describe('corrective actions', () => {
  const action: CorrectiveActionRecord = {
    id: 3,
    title: 'تحديث دليل المدربين',
    priority: 'medium',
    status: 'in_progress',
    progress: 40,
    assignee: { name: 'خالد إبراهيم' },
  }

  it('fetchCorrectiveActions unwraps the page and passes params', async () => {
    const page = { data: [action], meta: { total: 1 } }
    mockedApi.get.mockResolvedValueOnce({ data: { data: page } })
    const out = await fetchCorrectiveActions({ status: 'in_progress' })
    expect(mockedApi.get).toHaveBeenCalledWith('/quality/corrective-actions', {
      skipErrorToast: true,
      params: { status: 'in_progress' },
    })
    expect(out).toEqual(page)
  })

  it('fetchCorrectiveActions falls back to an empty page', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: {} })
    expect(await fetchCorrectiveActions()).toEqual({ data: [], meta: {} })
  })

  it('createCorrectiveAction posts to /quality/corrective-actions', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: action } })
    const out = await createCorrectiveAction({ title: 'تحديث دليل المدربين' })
    expect(mockedApi.post).toHaveBeenCalledWith('/quality/corrective-actions', { title: 'تحديث دليل المدربين' })
    expect(out).toEqual(action)
  })

  it('updateCorrectiveAction patches /quality/corrective-actions/{id}', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: { data: { ...action, progress: 100 } } })
    const out = await updateCorrectiveAction(3, { progress: 100 })
    expect(mockedApi.patch).toHaveBeenCalledWith('/quality/corrective-actions/3', { progress: 100 })
    expect(out?.progress).toBe(100)
  })
})

describe('audit logs', () => {
  it('fetchQualityAuditLogs unwraps the page with typed records', async () => {
    const log: QualityAuditLogRecord = {
      id: 9,
      action: 'updated',
      user: { name: 'مدير الجودة' },
      created_at: '2026-03-01T08:00:00Z',
    }
    const page = { data: [log], meta: { current_page: 1 } }
    mockedApi.get.mockResolvedValueOnce({ data: { data: page } })
    const out = await fetchQualityAuditLogs({ action: 'updated' })
    expect(mockedApi.get).toHaveBeenCalledWith('/quality/audit-logs', {
      skipErrorToast: true,
      params: { action: 'updated' },
    })
    expect(out).toEqual(page)
  })

  it('fetchQualityAuditLogs falls back to an empty page', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: {} })
    expect(await fetchQualityAuditLogs()).toEqual({ data: [], meta: {} })
  })
})
