import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '@/api/axios'
import {
  submitWorkshopRequest,
  fetchWorkshopRequestsStrict,
  fetchAdminWorkshopRequests,
  fetchAdminWorkshopRequestDetail,
  approveWorkshopRequest,
  rejectWorkshopRequest,
  fetchWorkshopWorkflowHistory,
  type WorkshopRequestDetail,
  type WorkflowHistoryResponse,
} from '@/api/workshopRequestsApi'

// Only the app's apiClient is mocked — the real `axios` package stays intact so
// axios.isAxiosError() keeps working inside fetchWorkshopRequestsStrict.
vi.mock('@/api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

const mockedApi = vi.mocked(apiClient, true)

beforeEach(() => {
  vi.clearAllMocks()
})

/* ── submitWorkshopRequest ── */

describe('submitWorkshopRequest', () => {
  it('posts multipart FormData to /workshop-requests', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { success: true } })
    const fd = new FormData()
    fd.append('program_name', 'ورشة الكتابة الإبداعية')
    await submitWorkshopRequest(fd)
    expect(mockedApi.post).toHaveBeenCalledWith('/workshop-requests', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  })

  it('propagates submission errors', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('422'))
    await expect(submitWorkshopRequest(new FormData())).rejects.toThrow('422')
  })
})

/* ── fetchWorkshopRequestsStrict: mapping + payload shapes + error contract ── */

describe('fetchWorkshopRequestsStrict', () => {
  const fullRaw = {
    id: 11,
    program_name: 'ورشة الكتابة الإبداعية',
    slug: 'creative-writing',
    proposed_date: '2026-05-01',
    proposed_time: '10:30',
    location_types: ['قاعة المركز', 'Zoom'],
    duration_hours: 3,
    speaker_name: 'ليلى حسن',
    requester_email: 'rana@example.com',
    requester_name: 'رنا',
  }

  it('maps a full Laravel row to the catalog workshop row (silent request)', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { success: true, data: [fullRaw] } })
    const result = await fetchWorkshopRequestsStrict()
    expect(mockedApi.get).toHaveBeenCalledWith('/workshop-requests', { skipErrorToast: true })
    expect(result).toEqual({
      ok: true,
      rows: [{
        id: 11,
        title: 'ورشة الكتابة الإبداعية',
        slug: 'creative-writing',
        date: '2026-05-01T10:30:00',
        duration_hours: 3,
        trainer_name: 'ليلى حسن',
        is_online: true, // inferred from "Zoom" in location_types
        requester_email: 'rana@example.com',
        requester_name: 'رنا',
      }],
    })
  })

  it.each([
    ['{ data: { data: [...] } }', { data: { data: [fullRaw] } }],
    ['{ data: { data: { data: [...] } } }', { data: { data: { data: [fullRaw] } } }],
  ])('unwraps the %s pagination shape', async (_label, payload) => {
    mockedApi.get.mockResolvedValueOnce({ data: payload })
    const result = await fetchWorkshopRequestsStrict()
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.rows.map((r) => r.id)).toEqual([11])
  })

  it('applies legacy aliases and fallbacks (title/name, slug, date-only, explicit is_online)', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: [
        { id: 12, title: 'عنوان قديم', date: '2026-06-10 00:00:00', location_type: ['حضوري'], is_online: false, trainer_name: 'مدرب' },
        { id: 13, name: 'اسم بديل', online: true },
      ],
    })
    const result = await fetchWorkshopRequestsStrict()
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows[0]).toEqual({
      id: 12,
      title: 'عنوان قديم',
      slug: 'workshop-request-12',
      date: '2026-06-10', // date without time → date part only
      duration_hours: null,
      trainer_name: 'مدرب',
      is_online: false, // explicit boolean wins over inference
      requester_email: null,
      requester_name: null,
    })
    expect(result.rows[1]).toEqual({
      id: 13,
      title: 'اسم بديل',
      slug: 'workshop-request-13',
      date: null,
      duration_hours: null,
      trainer_name: null,
      is_online: true, // `online` boolean alias
      requester_email: null,
      requester_name: null,
    })
  })

  it('normalizes time formats: HH:MM:SS kept, hour-only padded', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: [
        { id: 21, program_name: 'أ', proposed_date: '2026-07-01', proposed_time: '18:45:30' },
        { id: 22, program_name: 'ب', proposed_date: '2026-07-02', proposed_time: '18' },
      ],
    })
    const result = await fetchWorkshopRequestsStrict()
    if (!result.ok) throw new Error('expected ok')
    expect(result.rows[0].date).toBe('2026-07-01T18:45:30')
    expect(result.rows[1].date).toBe('2026-07-02T18:00:00')
  })

  it('drops rows without a positive id and non-object rows, returning ok with the survivors', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: [
        'نص',
        null,
        { program_name: 'بدون معرف' }, // id NaN → filtered
        { id: 0, program_name: 'صفر' },
        fullRaw,
      ],
    })
    const result = await fetchWorkshopRequestsStrict()
    if (!result.ok) throw new Error('expected ok')
    expect(result.rows.map((r) => r.id)).toEqual([11])
  })

  it('returns ok with empty rows for an unrecognized payload', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: 'ليست قائمة' } })
    expect(await fetchWorkshopRequestsStrict()).toEqual({ ok: true, rows: [] })
  })

  it('returns { ok: false, status } for an axios error and status undefined otherwise', async () => {
    mockedApi.get.mockRejectedValueOnce({ isAxiosError: true, response: { status: 403 } })
    expect(await fetchWorkshopRequestsStrict()).toEqual({ ok: false, status: 403 })

    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'))
    expect(await fetchWorkshopRequestsStrict()).toEqual({ ok: false, status: undefined })
  })
})

/* ── Admin workflow API ── */

function detailFixture(overrides: Partial<WorkshopRequestDetail> = {}): WorkshopRequestDetail {
  return {
    id: 5,
    requester_name: 'رنا خليل',
    requester_email: 'rana@example.com',
    requester_phone: null,
    requester_department: 'قسم الفعاليات',
    program_name: 'ورشة الإسعافات الأولية',
    speaker_name: 'د. سمير عوض',
    speaker_job_title: 'طبيب طوارئ',
    speaker_photo_url: null,
    topics: 'الإنعاش القلبي، التعامل مع الحروق',
    categories: ['صحة'],
    target_audience: 'المتطوعون الجدد',
    proposed_date_1: '2026-09-01',
    proposed_time_1: '17:00',
    proposed_date_2: null,
    proposed_time_2: null,
    proposed_date_3: null,
    proposed_time_3: null,
    location_types: ['قاعة المركز'],
    price_type: 'free',
    price_amount: null,
    generated_announcement_text: null,
    status: 'pending',
    current_step: 2,
    current_department: 'finance',
    workflow_status: 'in_progress',
    created_at: '2026-08-01T09:00:00Z',
    updated_at: '2026-08-02T09:00:00Z',
    ...overrides,
  }
}

describe('fetchAdminWorkshopRequests', () => {
  it('returns the paginator block when data.data is an array', async () => {
    const detail = detailFixture()
    mockedApi.get.mockResolvedValueOnce({
      data: { data: { data: [detail], current_page: 2, last_page: 4, total: 31 } },
    })
    const page = await fetchAdminWorkshopRequests({ page: 2, workflow_status: 'pending', search: 'ورشة' })
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/workshop-requests', {
      params: { page: 2, workflow_status: 'pending', search: 'ورشة' },
    })
    expect(page).toEqual({ data: [detail], current_page: 2, last_page: 4, total: 31 })
  })

  it('wraps a bare array payload into a single-page result', async () => {
    const detail = detailFixture()
    mockedApi.get.mockResolvedValueOnce({ data: { data: [detail] } })
    const page = await fetchAdminWorkshopRequests()
    expect(page).toEqual({ data: [detail], current_page: 1, last_page: 1, total: 1 })
  })

  it('returns an empty page for an unrecognized payload', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: {} } })
    expect(await fetchAdminWorkshopRequests()).toEqual({ data: [], current_page: 1, last_page: 1, total: 0 })
  })
})

describe('fetchAdminWorkshopRequestDetail', () => {
  it('unwraps the envelope and copies top-level can_act / is_history_viewer flags', async () => {
    const detail = detailFixture()
    mockedApi.get.mockResolvedValueOnce({ data: { data: detail, can_act: true, is_history_viewer: false } })
    const result = await fetchAdminWorkshopRequestDetail(5)
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/workshop-requests/5', { skipErrorToast: true })
    expect(result.id).toBe(5)
    expect(result.can_act).toBe(true)
    expect(result.is_history_viewer).toBe(false)
  })

  it('supports an envelope-less payload and leaves flags untouched when non-boolean', async () => {
    const detail = detailFixture({ id: 6 })
    mockedApi.get.mockResolvedValueOnce({ data: detail })
    const result = await fetchAdminWorkshopRequestDetail(6)
    expect(result.id).toBe(6)
    expect(result.can_act).toBeUndefined()
    expect(result.is_history_viewer).toBeUndefined()
  })
})

describe('approve / reject / workflow history', () => {
  it('approveWorkshopRequest includes selected_date_option only when provided', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { message: 'تمت الموافقة على الطلب' } })
    const withOption = await approveWorkshopRequest(5, 'موافق على الموعد الثاني', 2)
    expect(mockedApi.post).toHaveBeenCalledWith('/admin/workshop-requests/5/approve', {
      notes: 'موافق على الموعد الثاني',
      selected_date_option: 2,
    })
    expect(withOption).toEqual({ message: 'تمت الموافقة على الطلب' })

    mockedApi.post.mockResolvedValueOnce({ data: { message: 'تمت الموافقة' } })
    await approveWorkshopRequest(5, 'موافقة مبدئية', null)
    expect(mockedApi.post).toHaveBeenLastCalledWith('/admin/workshop-requests/5/approve', {
      notes: 'موافقة مبدئية',
    })
  })

  it('rejectWorkshopRequest posts the notes to the reject endpoint', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { message: 'تم رفض الطلب' } })
    const result = await rejectWorkshopRequest(5, 'الميزانية غير كافية')
    expect(mockedApi.post).toHaveBeenCalledWith('/admin/workshop-requests/5/reject', { notes: 'الميزانية غير كافية' })
    expect(result).toEqual({ message: 'تم رفض الطلب' })
  })

  it('rejectWorkshopRequest propagates errors', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('403'))
    await expect(rejectWorkshopRequest(5, 'سبب')).rejects.toThrow('403')
  })

  it('fetchWorkshopWorkflowHistory returns the response body as-is (silent request)', async () => {
    const history: WorkflowHistoryResponse = {
      success: true,
      current_step: 2,
      current_department: 'finance',
      workflow_status: 'in_progress',
      can_act: true,
      all_steps: [{
        step_number: 1,
        department_key: 'events',
        department_label: 'قسم الفعاليات',
        status: 'approved',
        actor_name: 'رنا خليل',
        actor_email: 'rana@example.com',
        acted_at: '2026-08-02T10:00:00Z',
        notes: 'تمت المراجعة',
        is_current: false,
      }],
    }
    mockedApi.get.mockResolvedValueOnce({ data: history })
    expect(await fetchWorkshopWorkflowHistory(5)).toEqual(history)
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/workshop-requests/5/workflow-history', { skipErrorToast: true })
  })
})
