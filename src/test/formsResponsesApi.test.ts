import { beforeEach, describe, expect, it, vi } from 'vitest'
import apiClient from '@/api/axios'
import {
  activeFilterCount,
  addResponseNote,
  assignResponse,
  changeResponseStatus,
  correctResponse,
  createResponseExport,
  downloadResponseExport,
  EMPTY_FILTERS,
  fetchResponse,
  fetchResponseExport,
  fetchResponseHistory,
  fetchResponseNotes,
  fetchResponseOptions,
  fetchResponses,
  filterParams,
  responseFieldErrors,
} from '@/api/formsResponsesApi'

/** The Phase 4 client: what it asks the server for, and how it reads the answers. Every call keeps the screen's own error handling. */

vi.mock('@/api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))
const api = vi.mocked(apiClient, true)
beforeEach(() => vi.clearAllMocks())

const OWN = { skipErrorToast: true }
const ok = (data: unknown) => ({ data: { success: true, data } })

describe('filters', () => {
  it('sends only what is set: an empty filter sends nothing', () => {
    expect(filterParams(EMPTY_FILTERS)).toEqual({})
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0)
    expect(filterParams({ ...EMPTY_FILTERS, search: '  سارة  ', status: ['new', 'completed'], assignee: 'none', version: '12', from: '2026-01-01', to: '2026-01-31', source: 'link', corrected: true })).toEqual({
      search: 'سارة', status: ['new', 'completed'], assignee: 'none', version: 12, from: '2026-01-01', to: '2026-01-31', source: 'link', corrected: 1,
    })
    expect(activeFilterCount({ ...EMPTY_FILTERS, search: '   ' })).toBe(0)
    expect(activeFilterCount({ ...EMPTY_FILTERS, status: ['new'], from: '2026-01-01' })).toBe(2)
  })
})

describe('the table', () => {
  it('asks the server for one filtered, sorted page and reads the paging facts and the status counts', async () => {
    api.get.mockResolvedValueOnce(ok({ data: [{ id: 3, status: 'in_review', submitted_at: '2026-10-18T10:00:00Z' }], meta: { current_page: 2, last_page: 5, total: 93 }, status_counts: { new: 40, completed: 3 } }))

    const page = await fetchResponses(7, { page: 2, perPage: 20, filters: { ...EMPTY_FILTERS, status: ['in_review'] }, sort: 'id', direction: 'asc' })

    expect(api.get).toHaveBeenCalledWith('/operations/forms/7/submissions', { params: { status: ['in_review'], page: 2, per_page: 20, sort: 'id', direction: 'asc' }, ...OWN })
    expect(page).toMatchObject({ currentPage: 2, lastPage: 5, total: 93 })
    expect(page.statusCounts).toEqual({ new: 40, in_review: 0, needs_followup: 0, completed: 3, archived: 0 })
    expect(page.rows[0]).toMatchObject({ id: 3, status: 'in_review', assignee: null, corrected: false, source: { type: 'public', label: null } })
  })

  it('reads the share link a response came through, for a server that only sends the older share_link field', async () => {
    api.get.mockResolvedValueOnce(ok({ data: [{ id: 1, share_link: { id: 9, label: 'ملصق' } }], meta: {} }))

    const page = await fetchResponses(7, { page: 1, filters: EMPTY_FILTERS })

    expect(page.rows[0].source).toEqual({ type: 'link', label: 'ملصق' })
  })

  it('the options carry what the filter and export controls offer, and a missing part is an empty list', async () => {
    api.get.mockResolvedValueOnce(ok({ statuses: [{ value: 'new', label: 'جديد' }], columns: [{ key: 'id', label: 'رقم الرد', group: 'meta', type: 'number', removed: false, default: true }] }))

    const options = await fetchResponseOptions(7, 12)

    expect(api.get).toHaveBeenCalledWith('/operations/forms/7/response-options', { params: { version: 12 }, ...OWN })
    expect(options.columns).toHaveLength(1)
    expect(options).toMatchObject({ versions: [], links: [], assignees: [], assignable: [] })
  })
})

describe('one response and its review', () => {
  it('a response comes with what the person may do with it', async () => {
    api.get.mockResolvedValueOnce(ok({ id: 4, status: 'new', abilities: { review: true, correct: false } }))

    expect(await fetchResponse(7, 4)).toMatchObject({ id: 4, abilities: { review: true, correct: false } })
    expect(api.get).toHaveBeenCalledWith('/operations/forms/7/submissions/4', OWN)
  })

  it('a response without abilities is read-only', async () => {
    api.get.mockResolvedValueOnce(ok({ id: 4 }))

    expect((await fetchResponse(7, 4)).abilities).toEqual({ review: false, correct: false })
  })

  it('status, assignment and notes go to their own endpoints', async () => {
    api.put.mockResolvedValue(ok({ id: 4, status: 'completed', abilities: { review: true, correct: true } }))
    api.post.mockResolvedValue(ok([{ id: 1, body: 'ملاحظة', author: null, created_at: '' }]))
    api.get.mockResolvedValue(ok([]))

    await changeResponseStatus(7, 4, 'completed')
    await assignResponse(7, 4, 9)
    await assignResponse(7, 4, null)
    await addResponseNote(7, 4, 'ملاحظة')
    await fetchResponseNotes(7, 4)
    await fetchResponseHistory(7, 4)

    expect(api.put).toHaveBeenNthCalledWith(1, '/operations/forms/7/submissions/4/status', { status: 'completed' }, OWN)
    expect(api.put).toHaveBeenNthCalledWith(2, '/operations/forms/7/submissions/4/assignment', { assignee_id: 9 }, OWN)
    expect(api.put).toHaveBeenNthCalledWith(3, '/operations/forms/7/submissions/4/assignment', { assignee_id: null }, OWN)
    expect(api.post).toHaveBeenCalledWith('/operations/forms/7/submissions/4/notes', { body: 'ملاحظة' }, OWN)
    expect(api.get).toHaveBeenCalledWith('/operations/forms/7/submissions/4/notes', OWN)
    expect(api.get).toHaveBeenCalledWith('/operations/forms/7/submissions/4/history', OWN)
  })

  it('a correction sends the changed answers and the reason, and says how many changed', async () => {
    api.put.mockResolvedValueOnce({ data: { success: true, changed: 2, data: { id: 4, status: 'new', corrected: true, abilities: { review: true, correct: true } } } })

    const result = await correctResponse(7, 4, { 5: 'سارة الجديدة', 9: ['قراءة'] }, '  سبب  ')

    expect(api.put).toHaveBeenCalledWith('/operations/forms/7/submissions/4/answers', { corrections: { 5: 'سارة الجديدة', 9: ['قراءة'] }, reason: 'سبب' }, OWN)
    expect(result.changed).toBe(2)
    expect(result.response.corrected).toBe(true)

    api.put.mockResolvedValueOnce({ data: { success: true, changed: 0, data: { id: 4 } } })
    await correctResponse(7, 4, { 5: 'x' })
    expect(api.put).toHaveBeenLastCalledWith('/operations/forms/7/submissions/4/answers', { corrections: { 5: 'x' } }, OWN)
  })

  it('the server\'s per-question refusals are read by question id', () => {
    const error = { response: { status: 422, data: { errors: { 'answers.5': ['اختر قيمة من الخيارات المتاحة في «المدينة».'], 'corrections.9': ['لا يمكن تصحيح المرفقات.'], reason: ['طويل'] } } } }

    expect(responseFieldErrors(error)).toEqual({ 5: 'اختر قيمة من الخيارات المتاحة في «المدينة».', 9: 'لا يمكن تصحيح المرفقات.' })
    expect(responseFieldErrors(new Error('network'))).toEqual({})
  })
})

describe('exports', () => {
  it('asks for the export with the current filters and only the chosen columns', async () => {
    api.post.mockResolvedValueOnce(ok({ id: 3, format: 'csv', status: 'ready', ready: true }))

    await createResponseExport(7, { format: 'csv', columns: ['id', 'q_5'], filters: { ...EMPTY_FILTERS, status: ['completed'], from: '2026-01-01' } })

    expect(api.post).toHaveBeenCalledWith('/operations/forms/7/exports', { format: 'csv', columns: ['id', 'q_5'], filters: { status: ['completed'], from: '2026-01-01' } }, OWN)
  })

  it('reads an export\'s state', async () => {
    api.get.mockResolvedValueOnce(ok({ id: 3, status: 'processing', ready: false }))

    expect(await fetchResponseExport(7, 3)).toMatchObject({ status: 'processing', ready: false })
    expect(api.get).toHaveBeenCalledWith('/operations/forms/7/exports/3', OWN)
  })

  it('downloads through the authenticated endpoint and hands the browser a file, never a stored address', async () => {
    const created = vi.fn(() => 'blob:local-1')
    const revoked = vi.fn()
    Object.assign(URL, { createObjectURL: created, revokeObjectURL: revoked })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    api.get.mockResolvedValueOnce({ data: new Blob(['x']) })

    await downloadResponseExport(7, 3, 'form-7-responses.csv')

    expect(api.get).toHaveBeenCalledWith('/operations/forms/7/exports/3/download', { responseType: 'blob', ...OWN })
    expect(click).toHaveBeenCalledTimes(1)
    expect(created).toHaveBeenCalledTimes(1)
    expect(revoked).toHaveBeenCalledWith('blob:local-1')
    click.mockRestore()
  })
})
