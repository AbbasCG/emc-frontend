import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '@/api/axios'
import { normalizeForm, parseFormSubmitError } from '@/api/formsApi'
import {
  addFormCollaborator,
  archiveForm,
  closeForm,
  fetchFormActivity,
  fetchFormCollaborators,
  fetchFormVersion,
  fetchFormVersions,
  parseFormActionError,
  previewForm,
  publishForm,
  removeFormCollaborator,
  reopenForm,
  restoreFormVersion,
  searchFormCollaboratorCandidates,
  transferFormOwnership,
  unarchiveForm,
  unpublishForm,
  updateFormCollaborator,
  updateFormSettings,
} from '@/api/formsAdminApi'
import contract from '@/test/fixtures/formsApiContract.json'

/**
 * The Phase 1 side of the Forms API contract (publishing, versions, sharing, history), driven by responses recorded from the
 * Laravel API (src/test/fixtures/formsApiContract.json). tests/Feature/Forms/* asserts the same shapes on the server.
 */

vi.mock('@/api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))
const api = vi.mocked(apiClient, true)
const httpError = (status: number, data: unknown) => Object.assign(new Error(`HTTP ${status}`), { isAxiosError: true, response: { status, data } })
const OWN = { skipErrorToast: true }

beforeEach(() => vi.clearAllMocks())

describe('what the server says about a form now', () => {
  it('carries ownership, visibility, version, settings and what the signed-in person may do', () => {
    const form = normalizeForm(contract.publishResponse.data as never)

    expect(form.status).toBe('active')
    expect(form.visibility).toBe('private')
    expect(form.responses_visibility).toBe('restricted')
    expect(form.owner?.id).toBe(form.created_by?.id)
    expect(form.last_editor?.name).toBeTruthy()
    expect(form.publisher?.name).toBeTruthy()
    expect(form.current_version).toBe(2)
    expect(form.has_unpublished_changes).toBe(false)
    expect(form.settings).toMatchObject({ max_submissions: 50, allow_anonymous: true, requires_login: false })
    expect(form.abilities).toMatchObject({ view: true, edit: true, publish: true, manage_access: true, view_responses: true })
    expect(Object.keys(form.owner ?? {})).toEqual(['id', 'name'])
  })

  it('a draft edit of a published form says it differs from what respondents see', () => {
    const edited = normalizeForm(contract.editedDraftResponse.data as never)

    expect(edited.status).toBe('active')
    expect(edited.current_version).toBe(1)
    expect(edited.has_unpublished_changes).toBe(true)
    expect(edited.questions).toHaveLength(3)
  })

  it('a collaborator sees the form but not what they may not do', () => {
    const viewer = normalizeForm(contract.collaboratorViewResponse.data as never)

    expect(viewer.abilities).toMatchObject({ view: true, edit: false, manage_access: false, view_responses: false })
    expect(viewer).not.toHaveProperty('submissions_count')
  })
})

describe('publishing and status', () => {
  it('publish sends the note, turns the global toast off and returns the new state', async () => {
    api.post.mockResolvedValueOnce({ data: contract.publishResponse })

    const form = await publishForm(5, 'تحديث الأسئلة')

    expect(api.post).toHaveBeenCalledWith('/operations/forms/5/publish', { note: 'تحديث الأسئلة' }, OWN)
    expect(form.current_version).toBe(2)
  })

  it('publish without a note sends an empty body', async () => {
    api.post.mockResolvedValueOnce({ data: contract.publishResponse })

    await publishForm(5)

    expect(api.post).toHaveBeenCalledWith('/operations/forms/5/publish', {}, OWN)
  })

  it.each([
    ['close', closeForm, '/close'],
    ['reopen', reopenForm, '/reopen'],
    ['unpublish', unpublishForm, '/unpublish'],
    ['archive', archiveForm, '/archive'],
    ['unarchive', unarchiveForm, '/unarchive'],
  ])('%s posts to its own endpoint', async (_name, fn, path) => {
    api.post.mockResolvedValueOnce({ data: contract.closeResponse })

    const form = await fn(5)

    expect(api.post).toHaveBeenCalledWith(`/operations/forms/5${path}`, {}, OWN)
    expect(form.status).toBe('closed')
  })

  it('a refused publish carries the reason and is never swallowed', async () => {
    api.post.mockRejectedValueOnce(httpError(422, contract.publishNothingNewResponse))

    await expect(publishForm(5)).rejects.toMatchObject({ response: { status: 422 } })
    expect(parseFormActionError(httpError(422, contract.publishNothingNewResponse))).toContain('لا توجد تغييرات جديدة')
  })

  it('the preview is the draft in the public shape', async () => {
    api.get.mockResolvedValueOnce({ data: contract.previewResponse })

    const form = await previewForm(5)

    expect(api.get).toHaveBeenCalledWith('/operations/forms/5/preview', OWN)
    expect(form.preview).toBe(true)
    expect(form.questions.length).toBeGreaterThan(0)
  })

  it('settings are sent as given', async () => {
    api.put.mockResolvedValueOnce({ data: contract.settingsResponse })

    const form = await updateFormSettings(5, { max_submissions: 50, visibility: 'organization' })

    expect(api.put).toHaveBeenCalledWith('/operations/forms/5/settings', { max_submissions: 50, visibility: 'organization' }, OWN)
    expect(form.settings?.max_submissions).toBe(50)
  })
})

describe('versions', () => {
  it('lists them with the facts of each publication and marks the current one', async () => {
    api.get.mockResolvedValueOnce({ data: contract.versionsResponse })

    const page = await fetchFormVersions(5, 1)

    expect(api.get).toHaveBeenCalledWith('/operations/forms/5/versions', { params: { page: 1 }, ...OWN })
    expect(page.rows.map((v) => v.version_number)).toEqual([2, 1])
    expect(page.rows.map((v) => v.is_current)).toEqual([true, false])
    expect(page.rows[0]).toMatchObject({ note: 'تحديث الأسئلة', question_count: 3 })
    expect(page.rows[0].publisher?.name).toBeTruthy()
    expect(page).toMatchObject({ currentPage: 1, lastPage: 1, total: 2 })
  })

  it('a single version shows the questions exactly as respondents saw them', async () => {
    api.get.mockResolvedValueOnce({ data: contract.versionResponse })

    const v = await fetchFormVersion(5, 9)

    expect(api.get).toHaveBeenCalledWith('/operations/forms/5/versions/9', OWN)
    expect(v.version_number).toBe(1)
    expect(v.questions.map((q) => q.label)).toEqual(['الاسم الكامل', 'البريد الإلكتروني', 'المدينة', 'الاهتمامات', 'السيرة الذاتية'])
    expect(v.questions[0].required).toBe(true)
    expect(v.questions[2].options).toEqual(['الرياض', 'جدة'])
  })

  it('restoring rebuilds the draft and says it is still unpublished', async () => {
    api.post.mockResolvedValueOnce({ data: contract.restoreResponse })

    const form = await restoreFormVersion(5, 9)

    expect(api.post).toHaveBeenCalledWith('/operations/forms/5/versions/9/restore', {}, OWN)
    expect(form.has_unpublished_changes).toBe(true)
    expect(form.current_version).toBe(2)
    expect(form.questions).toHaveLength(5)
  })
})

describe('collaborators and history', () => {
  it('lists collaborators with who granted access and when, and no contact details', async () => {
    api.get.mockResolvedValueOnce({ data: contract.collaboratorsResponse })

    const rows = await fetchFormCollaborators(5)

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ access_level: 'viewer', can_view_responses: false })
    expect(rows[0].granted_by?.name).toBeTruthy()
    expect(rows[0].granted_at).toBeTruthy()
    expect(Object.keys(rows[0].user)).toEqual(['id', 'name', 'role', 'departments'])
    expect(JSON.stringify(contract.collaboratorsResponse) + JSON.stringify(contract.candidatesResponse)).not.toContain('@')
  })

  it('searches eligible employees by name', async () => {
    api.get.mockResolvedValueOnce({ data: contract.candidatesResponse })

    await searchFormCollaboratorCandidates(5, 'عمليات')

    expect(api.get).toHaveBeenCalledWith('/operations/forms/5/collaborator-candidates', { params: { q: 'عمليات' }, ...OWN })
  })

  it('adds, changes and removes through the collaborator endpoints', async () => {
    api.post.mockResolvedValueOnce({ data: contract.addCollaboratorResponse })
    api.put.mockResolvedValueOnce({ data: contract.addCollaboratorResponse })
    api.delete.mockResolvedValueOnce({ data: {} })

    await addFormCollaborator(5, { user_id: 7, access_level: 'viewer', can_view_responses: false })
    await updateFormCollaborator(5, 3, { access_level: 'editor', can_view_responses: true })
    await removeFormCollaborator(5, 3)

    expect(api.post).toHaveBeenCalledWith('/operations/forms/5/collaborators', { user_id: 7, access_level: 'viewer', can_view_responses: false }, OWN)
    expect(api.put).toHaveBeenCalledWith('/operations/forms/5/collaborators/3', { access_level: 'editor', can_view_responses: true }, OWN)
    expect(api.delete).toHaveBeenCalledWith('/operations/forms/5/collaborators/3', OWN)
  })

  it('a duplicate collaborator is refused with the reason the server gave', () => {
    expect(parseFormActionError(httpError(422, contract.duplicateCollaboratorResponse))).toContain('تمت إضافة هذا الموظف مسبقاً')
  })

  it('ownership transfer returns the form, or just says access was removed', async () => {
    api.post.mockResolvedValueOnce({ data: contract.publishResponse }).mockResolvedValueOnce({ data: { success: true, data: { id: 5, access_removed: true } } })

    const first = await transferFormOwnership(5, { owner_id: 9, keep_access: 'editor', keep_responses: true })
    const second = await transferFormOwnership(5, { owner_id: 9, keep_access: 'none' })

    expect(api.post).toHaveBeenNthCalledWith(1, '/operations/forms/5/ownership', { owner_id: 9, keep_access: 'editor', keep_responses: true }, OWN)
    expect(first.accessRemoved).toBe(false)
    expect(second).toEqual({ accessRemoved: true })
  })

  it('the history lists who did what, newest first, with only summaries in the details', async () => {
    api.get.mockResolvedValueOnce({ data: contract.activityResponse })

    const page = await fetchFormActivity(5, 1)

    const actions = page.rows.map((r) => r.action)
    expect(actions[0]).toBe('collaborator_added')
    expect(actions).toEqual(expect.arrayContaining(['created', 'published', 'settings_changed', 'questions_changed', 'version_restored']))
    const published = page.rows.find((r) => r.action === 'published' && r.details.note === 'تحديث الأسئلة')!
    expect(published).toMatchObject({ label: 'نشر النموذج', details: { version: 2, question_count: 3 } })
    expect(published.actor?.name).toBeTruthy()
    expect(JSON.stringify(contract.activityResponse)).not.toMatch(/@|Bearer|password|SECRET/i)
  })
})

describe('refusals the public form can now give', () => {
  it('a closed form says so in the server words', () => {
    const parsed = parseFormSubmitError(httpError(contract.submitClosedStatus, contract.submitClosedResponse))

    expect(parsed.kind).toBe('unavailable')
    expect(parsed.message).toBe(contract.submitClosedResponse.message)
    expect(parsed.message).toContain('مغلق')
  })

  it('a form that needs sign-in says so', () => {
    const parsed = parseFormSubmitError(httpError(contract.submitLoginRequiredStatus, contract.submitLoginRequiredResponse))

    expect(parsed.kind).toBe('unavailable')
    expect(parsed.message).toContain('تسجيل الدخول')
  })

  it('the public view of a closed or sign-in-only form carries its state and no questions', () => {
    const closed = normalizeForm(contract.publicClosedResponse.data as never)
    const login = normalizeForm(contract.publicLoginRequiredResponse.data as never)

    expect(closed.availability?.state).toBe('closed')
    expect(closed.questions).toEqual([])
    expect(login.availability).toMatchObject({ state: 'login_required', requires_login: true })
    expect(login.questions).toEqual([])
  })

  it('action failures read as plain sentences', () => {
    expect(parseFormActionError(httpError(403, {}))).toContain('صلاحية')
    expect(parseFormActionError(httpError(404, {}))).toContain('غير موجود')
    expect(parseFormActionError(new Error('Network Error'))).toContain('الاتصال')
    expect(parseFormActionError(httpError(500, {}))).toContain('لم تتم العملية')
    expect(contract.studentForbidden).toBe(403)
  })
})
