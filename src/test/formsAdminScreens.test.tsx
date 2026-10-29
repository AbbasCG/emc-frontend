import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import apiClient from '@/api/axios'
import OpsFormDetailPage from '@/pages/operations/admin/OpsFormDetailPage'
import PublicFormPage from '@/pages/operations/public/PublicFormPage'
import contract from '@/test/fixtures/formsApiContract.json'

/**
 * The Phase 1 form-management screens against the real API contract: every request goes through formsApi / formsAdminApi to a
 * mocked HTTP client that answers with responses recorded from the Laravel API.
 */

vi.mock('@/api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))
vi.mock('@/components/operations/OpsPageSkeleton', () => ({ default: () => <div>loading</div> }))
const api = vi.mocked(apiClient, true)

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open') }
})

const httpError = (status: number, data: unknown) => Object.assign(new Error(`HTTP ${status}`), { isAxiosError: true, response: { status, data } })
const ok = (data: unknown) => ({ data })

function Where() {
  const l = useLocation()

  return <span data-testid="where">{l.pathname}</span>
}

type Handler = (url: string, body?: unknown) => unknown
let routes: Record<string, Handler> = {}

/** Answers each request from `routes` by "METHOD path" (query string ignored); an unknown request fails the test loudly. */
function wire(extra: Record<string, Handler> = {}) {
  routes = { ...extra }
  const handle = (method: string) => async (url: string, a?: unknown, b?: unknown) => {
    const body = method === 'GET' || method === 'DELETE' ? undefined : a
    const key = `${method} ${url.split('?')[0]}`
    const route = routes[key]
    if (!route) throw new Error(`unexpected request: ${key} ${JSON.stringify(body ?? b ?? '')}`)
    const out = route(url, body)
    if (out instanceof Error) throw out

    return out
  }
  api.get.mockImplementation(handle('GET') as never)
  api.post.mockImplementation(handle('POST') as never)
  api.put.mockImplementation(handle('PUT') as never)
  api.delete.mockImplementation(handle('DELETE') as never)
}

const detail = (payload: { data: unknown }) => payload.data as Record<string, unknown> & { id: number }
const FORM = detail(contract.publishResponse) // published v2, nothing unpublished, owner with every ability
const ID = FORM.id

function mount(path = `/dashboard/admin/forms/${ID}`) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/dashboard/admin/forms/:id" element={<OpsFormDetailPage />} />
        <Route path="/dashboard/admin/forms" element={<div>forms list</div>} />
      </Routes>
      <Where />
    </MemoryRouter>,
  )
}

/** The form's sections (the editor also has its own tab switcher for small screens, which is not part of this). */
const sectionTabs = () => within(screen.getByRole('tablist', { name: 'أقسام النموذج' })).getAllByRole('tab').map((t) => t.textContent)

const withAbilities = (form: Record<string, unknown>, abilities: Record<string, boolean>) => ({
  ...form,
  abilities: { ...(form.abilities as object), ...abilities },
})

beforeEach(() => {
  vi.clearAllMocks()
  wire({ [`GET /operations/forms/${ID}`]: () => ok({ success: true, data: FORM }) })
})

// ═══ The header ══════════════════════════════════════════════════════════════

describe('form page header', () => {
  it('shows the status, the version, who owns it, who made it, who last edited it, when it was published and the response count', async () => {
    mount()

    await screen.findByRole('heading', { name: String(FORM.title) })
    expect(screen.getByTestId('status-badge')).toHaveTextContent('منشور')
    expect(screen.getByTestId('version-badge')).toHaveTextContent('الإصدار 2')
    const owner = FORM.owner as { name: string }
    const editor = FORM.last_editor as { name: string }
    const header = screen.getByRole('region', { name: 'حالة النموذج' })
    expect(within(header).getByText('المالك').nextElementSibling).toHaveTextContent(owner.name)
    expect(within(header).getByText('المنشئ').nextElementSibling).toHaveTextContent((FORM.created_by as { name: string }).name)
    expect(within(header).getByText('آخر من عدّل').nextElementSibling).toHaveTextContent(editor.name)
    expect(within(header).getByText('آخر نشر').nextElementSibling).toHaveTextContent((FORM.publisher as { name: string }).name)
    expect(within(header).getByText('الظهور').nextElementSibling).toHaveTextContent('خاص')
    expect(within(header).getByText('عدد الإجابات')).toBeTruthy()
    expect(within(header).queryByText('آخر نشر')?.nextElementSibling).not.toHaveTextContent('لم يُنشر بعد')
  })

  it('says when the draft differs from what respondents see', async () => {
    wire({ [`GET /operations/forms/${ID}`]: () => ok(contract.editedDraftResponse) })
    mount()

    await screen.findByText('تعديلات غير منشورة')
    expect(screen.getByTestId('version-badge')).toHaveTextContent('الإصدار 1')
  })

  it('a form that was never published says so and offers publishing', async () => {
    const draft = detail(contract.createDraftResponse)
    wire({ [`GET /operations/forms/${draft.id}`]: () => ok({ data: draft }) })
    mount(`/dashboard/admin/forms/${draft.id}`)

    await screen.findByRole('heading', { name: String(draft.title) })
    expect(screen.getByTestId('status-badge')).toHaveTextContent('مسودة')
    expect(screen.getByTestId('version-badge')).toHaveTextContent('لم يُنشر بعد')
    expect(screen.getByRole('button', { name: /نشر$/ })).toBeTruthy()
  })
})

// ═══ Publishing ══════════════════════════════════════════════════════════════

describe('publishing controls', () => {
  const draftWithChanges = detail(contract.editedDraftResponse)

  it('publish asks first, says which version it will create, and reports success only after the server accepts', async () => {
    wire({
      [`GET /operations/forms/${ID}`]: () => ok(contract.editedDraftResponse),
      [`POST /operations/forms/${ID}/publish`]: () => ok(contract.publishResponse),
    })
    mount()
    await screen.findByText('تعديلات غير منشورة')

    await userEvent.click(screen.getByRole('button', { name: /^نشر$/ }))
    const dialog = await screen.findByTestId('publish-dialog')
    expect(dialog).toHaveTextContent('الإصدار 2')
    expect(api.post).not.toHaveBeenCalled()
    await userEvent.type(within(dialog).getByLabelText(/ملاحظة الإصدار/), 'تحديث الأسئلة')
    await userEvent.click(within(dialog).getByRole('button', { name: /نشر الإصدار 2/ }))

    expect(await screen.findByText('تم نشر النموذج.')).toBeTruthy()
    expect(api.post).toHaveBeenCalledWith(`/operations/forms/${ID}/publish`, { note: 'تحديث الأسئلة' }, { skipErrorToast: true })
    await waitFor(() => expect(screen.getByTestId('version-badge')).toHaveTextContent('الإصدار 2'))
    expect(screen.queryByText('تعديلات غير منشورة')).toBeNull()
    expect(draftWithChanges.has_unpublished_changes).toBe(true)
  })

  it('a refused publish shows the reason, never says it worked, and nothing on the page changes', async () => {
    wire({
      [`GET /operations/forms/${ID}`]: () => ok(contract.editedDraftResponse),
      [`POST /operations/forms/${ID}/publish`]: () => httpError(422, contract.publishEmptyResponse),
    })
    mount()
    await screen.findByText('تعديلات غير منشورة')

    await userEvent.click(screen.getByRole('button', { name: /^نشر$/ }))
    await userEvent.click(within(await screen.findByTestId('publish-dialog')).getByRole('button', { name: /نشر الإصدار/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent('أضف سؤالاً واحداً على الأقل قبل نشر النموذج.')
    expect(screen.queryByText('تم نشر النموذج.')).toBeNull()
    expect(screen.getByTestId('version-badge')).toHaveTextContent('الإصدار 1')
    expect(screen.getByText('تعديلات غير منشورة')).toBeTruthy()
  })

  it('a form that is already live and has nothing new to publish does not offer publish', async () => {
    mount()

    await screen.findByRole('heading', { name: String(FORM.title) })
    expect(screen.queryByRole('button', { name: /^نشر$/ })).toBeNull()
  })

  it('closing asks first and the badge changes only after the server confirms', async () => {
    wire({
      [`GET /operations/forms/${ID}`]: () => ok({ data: FORM }),
      [`POST /operations/forms/${ID}/close`]: () => ok(contract.closeResponse),
    })
    mount()
    await screen.findByRole('heading', { name: String(FORM.title) })

    await userEvent.click(screen.getByRole('button', { name: 'إغلاق' }))
    expect(await screen.findByText('إغلاق النموذج؟')).toBeTruthy()
    expect(api.post).not.toHaveBeenCalled()
    await userEvent.click(screen.getAllByRole('button', { name: 'إغلاق' }).at(-1)!)

    expect(await screen.findByText('تم إغلاق النموذج.')).toBeTruthy()
    expect(screen.getByTestId('status-badge')).toHaveTextContent('مغلق')
    expect(screen.getByRole('button', { name: /إعادة فتح/ })).toBeTruthy()
  })

  it('cancelling a confirmation does nothing', async () => {
    mount()
    await screen.findByRole('heading', { name: String(FORM.title) })

    await userEvent.click(screen.getByRole('button', { name: 'أرشفة' }))
    await screen.findByText('أرشفة النموذج؟')
    await userEvent.click(screen.getAllByRole('button', { name: 'إلغاء' }).at(-1)!)

    expect(api.post).not.toHaveBeenCalled()
    expect(screen.getByTestId('status-badge')).toHaveTextContent('منشور')
  })

  it('a refused status change is reported and the status stays what it was', async () => {
    wire({
      [`GET /operations/forms/${ID}`]: () => ok({ data: FORM }),
      [`POST /operations/forms/${ID}/archive`]: () => httpError(403, { message: 'Forbidden' }),
    })
    mount()
    await screen.findByRole('heading', { name: String(FORM.title) })

    await userEvent.click(screen.getByRole('button', { name: 'أرشفة' }))
    await userEvent.click(screen.getAllByRole('button', { name: 'أرشفة' }).at(-1)!)

    expect(await screen.findByRole('alert')).toHaveTextContent('لا تملك صلاحية')
    expect(screen.queryByText('تمت أرشفة النموذج.')).toBeNull()
    expect(screen.getByTestId('status-badge')).toHaveTextContent('منشور')
  })

  it('a closed form can be reopened, and an archived one restored', async () => {
    wire({
      [`GET /operations/forms/${ID}`]: () => ok(contract.closeResponse),
      [`POST /operations/forms/${ID}/reopen`]: () => ok(contract.publishResponse),
    })
    mount()
    await screen.findByRole('button', { name: /إعادة فتح/ })

    await userEvent.click(screen.getByRole('button', { name: /إعادة فتح/ }))
    await userEvent.click(screen.getAllByRole('button', { name: 'إعادة الفتح' }).at(-1)!)

    expect(await screen.findByText('أُعيد فتح النموذج.')).toBeTruthy()
    expect(screen.getByTestId('status-badge')).toHaveTextContent('منشور')
  })

  it('people without the right to publish see no publishing buttons at all', async () => {
    wire({ [`GET /operations/forms/${ID}`]: () => ok({ data: withAbilities(FORM, { publish: false, edit: false, manage_access: false }) }) })
    mount()

    await screen.findByRole('heading', { name: String(FORM.title) })
    for (const name of [/^نشر$/, 'إغلاق', 'أرشفة', /إلغاء النشر/]) expect(screen.queryByRole('button', { name })).toBeNull()
    expect(screen.getByRole('button', { name: /معاينة المسودة/ })).toBeTruthy()
  })
})

// ═══ Preview ═════════════════════════════════════════════════════════════════

describe('preview', () => {
  it('shows the draft as respondents will see it and cannot send an answer', async () => {
    wire({
      [`GET /operations/forms/${ID}`]: () => ok({ data: FORM }),
      [`GET /operations/forms/${ID}/preview`]: () => ok(contract.previewResponse),
    })
    mount()
    await screen.findByRole('heading', { name: String(FORM.title) })

    await userEvent.click(screen.getByRole('button', { name: /معاينة المسودة/ }))
    const modal = await screen.findByTestId('preview-modal')

    await within(modal).findByText(/معاينة: هكذا سيراها المجيبون/)
    expect(within(modal).getByLabelText(/الاسم الكامل/)).toBeTruthy()
    // The preview validates like the real form but never sends: submitting it (even a valid one) makes no request.
    await userEvent.type(within(modal).getByLabelText(/الاسم الكامل/), 'سارة')
    await userEvent.click(within(modal).getByRole('button', { name: 'إرسال (معاينة)' }))
    expect(api.post).not.toHaveBeenCalled()
  })

  it('a failed preview says so and can be retried', async () => {
    let attempts = 0
    wire({
      [`GET /operations/forms/${ID}`]: () => ok({ data: FORM }),
      [`GET /operations/forms/${ID}/preview`]: () => (attempts++ === 0 ? httpError(500, {}) : ok(contract.previewResponse)),
    })
    mount()
    await screen.findByRole('heading', { name: String(FORM.title) })

    await userEvent.click(screen.getByRole('button', { name: /معاينة المسودة/ }))
    const modal = await screen.findByTestId('preview-modal')
    expect(await within(modal).findByRole('alert')).toHaveTextContent('لم تتم العملية')
    await userEvent.click(within(modal).getByRole('button', { name: 'إعادة المحاولة' }))

    expect(await within(modal).findByText(/معاينة: هكذا سيراها المجيبون/)).toBeTruthy()
  })
})

// ═══ Tabs and what each person sees ══════════════════════════════════════════

describe('tabs', () => {
  it('an owner sees every section', async () => {
    mount()
    await screen.findByRole('heading', { name: String(FORM.title) })

    expect(sectionTabs()).toEqual(['المحرر', 'الإرسالات', 'التحليلات', 'إعدادات النشر', 'الإشعارات والأتمتة', 'المتعاونون', 'سجل النشاط', 'الإصدارات'])
  })

  it('a viewer sees the form, its history and its versions — not the responses, settings or collaborators', async () => {
    wire({ [`GET /operations/forms/${ID}`]: () => ok(contract.collaboratorViewResponse) })
    mount()
    await screen.findByRole('heading', { name: String(detail(contract.collaboratorViewResponse).title) })

    expect(sectionTabs()).toEqual(['المحرر', 'سجل النشاط', 'الإصدارات'])
    expect(screen.getByText(/لا تملك صلاحية تعديل هذا النموذج/)).toBeTruthy()
    expect(screen.getAllByTestId('block-card').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'حفظ الآن' })).toBeNull()
    expect(screen.queryByTestId('builder-library')).toBeNull()
  })

  it('an editor without response access does not get the responses tab', async () => {
    wire({ [`GET /operations/forms/${ID}`]: () => ok({ data: withAbilities(FORM, { view_responses: false, manage_access: false }) }) })
    mount()
    await screen.findByRole('heading', { name: String(FORM.title) })

    const names = screen.getAllByRole('tab').map((t) => t.textContent)
    expect(names).not.toContain('الإرسالات')
    expect(names).not.toContain('التحليلات') // analytics summarise the responses: same permission
    expect(names).toContain('المحرر')
    expect(names).toContain('المتعاونون')
  })

  it('switching tabs shows that section only', async () => {
    wire({
      [`GET /operations/forms/${ID}`]: () => ok({ data: FORM }),
      [`GET /operations/forms/${ID}/activity`]: () => ok(contract.activityResponse),
    })
    mount()
    await screen.findByRole('heading', { name: String(FORM.title) })

    await userEvent.click(screen.getByRole('tab', { name: 'سجل النشاط' }))

    expect(await screen.findAllByTestId('activity-entry')).not.toHaveLength(0)
    expect(screen.getByRole('tab', { name: 'سجل النشاط' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('button', { name: 'حفظ المسودة' })).toBeNull()
  })
})

// ═══ Versions ════════════════════════════════════════════════════════════════

describe('version history tab', () => {
  const versions = { [`GET /operations/forms/${ID}/versions`]: () => ok(contract.versionsResponse) }
  const v1 = contract.versionsResponse.data.data.find((v) => v.version_number === 1)!

  async function openVersions(extra: Record<string, Handler> = {}) {
    wire({ [`GET /operations/forms/${ID}`]: () => ok({ data: FORM }), ...versions, ...extra })
    mount()
    await screen.findByRole('heading', { name: String(FORM.title) })
    await userEvent.click(screen.getByRole('tab', { name: 'الإصدارات' }))
    await screen.findAllByTestId('version-row')
  }

  it('lists the versions newest first, marks the current one and shows who published and the note', async () => {
    await openVersions()

    const rows = screen.getAllByTestId('version-row')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('الإصدار 2')
    expect(rows[0]).toHaveTextContent('الحالي')
    expect(rows[0]).toHaveTextContent('تحديث الأسئلة')
    expect(rows[1]).not.toHaveTextContent('الحالي')
    expect(rows[1]).toHaveTextContent('الإصدار 1')
  })

  it('opens an old version and shows its questions exactly as respondents saw them', async () => {
    await openVersions({ [`GET /operations/forms/${ID}/versions/${v1.id}`]: () => ok(contract.versionResponse) })

    await userEvent.click(within(screen.getAllByTestId('version-row')[1]).getByRole('button', { name: 'عرض' }))

    const modal = await screen.findByTestId('version-modal')
    expect(await within(modal).findAllByTestId('question-row')).toHaveLength(5)
    expect(within(modal).getByText(/الاسم الكامل/)).toBeTruthy()
    expect(modal).toHaveTextContent('لا يمكن تعديله')
  })

  it('restoring asks first, says nothing is published, then opens the rebuilt draft in the editor', async () => {
    await openVersions({ [`POST /operations/forms/${ID}/versions/${v1.id}/restore`]: () => ok(contract.restoreResponse) })

    await userEvent.click(within(screen.getAllByTestId('version-row')[1]).getByRole('button', { name: 'استعادة إلى المسودة' }))
    expect(await screen.findByText(/لن يُنشر شيء/)).toBeTruthy()
    expect(api.post).not.toHaveBeenCalled()
    await userEvent.click(screen.getAllByRole('button', { name: 'استعادة' }).at(-1)!)

    expect(await screen.findByText(/استُعيد الإصدار إلى المسودة/)).toBeTruthy()
    expect(within(screen.getByRole('tablist', { name: 'أقسام النموذج' })).getByRole('tab', { name: 'المحرر' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getAllByTestId('block-card')).toHaveLength(5)
    expect(screen.getByText('تعديلات غير منشورة')).toBeTruthy()
  })

  it('a failed restore is reported and the draft is left alone', async () => {
    await openVersions({ [`POST /operations/forms/${ID}/versions/${v1.id}/restore`]: () => httpError(403, {}) })

    await userEvent.click(within(screen.getAllByTestId('version-row')[1]).getByRole('button', { name: 'استعادة إلى المسودة' }))
    await userEvent.click(screen.getAllByRole('button', { name: 'استعادة' }).at(-1)!)

    expect(await screen.findByRole('alert')).toHaveTextContent('لا تملك صلاحية')
    expect(screen.queryByText(/استُعيد الإصدار إلى المسودة/)).toBeNull()
    expect(screen.getByRole('tab', { name: 'الإصدارات' })).toHaveAttribute('aria-selected', 'true')
  })

  it('a viewer can read versions but is not offered a restore', async () => {
    const viewer = contract.collaboratorViewResponse.data
    wire({ [`GET /operations/forms/${ID}`]: () => ok({ data: viewer }), ...versions })
    mount()
    await screen.findByRole('heading', { name: String(viewer.title) })
    await userEvent.click(screen.getByRole('tab', { name: 'الإصدارات' }))

    await screen.findAllByTestId('version-row')
    expect(screen.queryByRole('button', { name: 'استعادة إلى المسودة' })).toBeNull()
    expect(screen.getAllByRole('button', { name: 'عرض' })).toHaveLength(2)
  })

  it('an unpublished form says there are no versions yet', async () => {
    await openVersions({ [`GET /operations/forms/${ID}/versions`]: () => ok({ data: { data: [], meta: { current_page: 1, last_page: 1, total: 0 } } }) }).catch(() => undefined)

    expect(await screen.findByText(/لم يُنشر هذا النموذج بعد/)).toBeTruthy()
  })
})

// ═══ History ═════════════════════════════════════════════════════════════════

describe('activity tab', () => {
  it('shows who did what and when, with a summary of the change', async () => {
    wire({
      [`GET /operations/forms/${ID}`]: () => ok({ data: FORM }),
      [`GET /operations/forms/${ID}/activity`]: () => ok(contract.activityResponse),
    })
    mount()
    await screen.findByRole('heading', { name: String(FORM.title) })
    await userEvent.click(screen.getByRole('tab', { name: 'سجل النشاط' }))

    const entries = await screen.findAllByTestId('activity-entry')
    expect(entries[0]).toHaveTextContent('إضافة متعاون')
    const published = entries.find((e) => e.textContent?.includes('تحديث الأسئلة'))!
    expect(published).toHaveTextContent('نشر النموذج')
    expect(published).toHaveTextContent('الإصدار 2')
    expect(published).toHaveTextContent((FORM.owner as { name: string }).name)
  })

  it('pages through a long history', async () => {
    let calls = 0
    const pageTwo = { data: { data: [{ id: 1, action: 'created', label: 'إنشاء النموذج', actor: { id: 1, name: 'س' }, details: {}, created_at: '2026-01-01T10:00:00Z' }], meta: { current_page: 2, last_page: 2, total: 21 } } }
    wire({
      [`GET /operations/forms/${ID}`]: () => ok({ data: FORM }),
      [`GET /operations/forms/${ID}/activity`]: () => (calls++ === 0
        ? ok({ data: { data: contract.activityResponse.data.data.slice(0, 2), meta: { current_page: 1, last_page: 2, total: 21 } } })
        : ok(pageTwo)),
    })
    mount()
    await screen.findByRole('heading', { name: String(FORM.title) })
    await userEvent.click(screen.getByRole('tab', { name: 'سجل النشاط' }))
    await screen.findAllByTestId('activity-entry')

    await userEvent.click(screen.getByRole('button', { name: 'التالي' }))

    expect(await screen.findByText('صفحة 2 من 2')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'التالي' })).toBeDisabled()
  })

  it('a failed load says so and can be retried', async () => {
    let n = 0
    wire({
      [`GET /operations/forms/${ID}`]: () => ok({ data: FORM }),
      [`GET /operations/forms/${ID}/activity`]: () => (n++ === 0 ? httpError(403, {}) : ok(contract.activityResponse)),
    })
    mount()
    await screen.findByRole('heading', { name: String(FORM.title) })
    await userEvent.click(screen.getByRole('tab', { name: 'سجل النشاط' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('لا تملك صلاحية')
    await userEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }))

    expect(await screen.findAllByTestId('activity-entry')).not.toHaveLength(0)
  })
})

// ═══ Collaborators ═══════════════════════════════════════════════════════════

describe('collaborators tab', () => {
  const listUrl = `GET /operations/forms/${ID}/collaborators`
  const row = contract.collaboratorsResponse.data[0]

  async function openCollaborators(extra: Record<string, Handler> = {}, form: unknown = FORM) {
    wire({ [`GET /operations/forms/${ID}`]: () => ok({ data: form }), [listUrl]: () => ok(contract.collaboratorsResponse), ...extra })
    mount()
    await screen.findByRole('heading', { name: String((form as { title: string }).title) })
    await userEvent.click(screen.getByRole('tab', { name: 'المتعاونون' }))
    await screen.findByText(row.user.name)
  }

  it('lists who has access, at what level, with response access, who granted it and when', async () => {
    await openCollaborators()

    const tr = screen.getByText(row.user.name).closest('tr')!
    expect(tr).toHaveTextContent(row.granted_by.name)
    expect(within(tr).getByLabelText(`مستوى ${row.user.name}`)).toHaveValue('viewer')
    expect(within(tr).getByLabelText(`قراءة الإجابات لـ ${row.user.name}`)).not.toBeChecked()
    expect(within(tr).getByText(new RegExp(row.user.departments[0] ?? '.'))).toBeTruthy()
    expect(document.body.textContent).not.toContain('@')
  })

  it('searches by name, picks a person, chooses the level and adds them — the row appears only after the server accepts', async () => {
    const candidate = { id: 99, name: 'موظفة مرشحة', role: 'operations_manager', departments: [] as string[] }
    await openCollaborators({
      [`GET /operations/forms/${ID}/collaborator-candidates`]: () => ok({ data: [candidate] }),
      [`POST /operations/forms/${ID}/collaborators`]: () => ok({ data: { ...row, id: 77, user: { ...row.user, id: 99, name: 'موظفة مرشحة' }, access_level: 'editor', can_view_responses: true } }),
    })

    await userEvent.type(screen.getByLabelText(/ابحث عن موظف بالاسم/), 'مرشح')
    await userEvent.click(await screen.findByRole('button', { name: /موظفة مرشحة/ }))
    await userEvent.selectOptions(screen.getByLabelText('المستوى'), 'editor')
    await userEvent.click(screen.getByLabelText('يستطيع قراءة الإجابات'))
    await userEvent.click(screen.getByRole('button', { name: 'إضافة' }))

    expect(await screen.findByText(/أُضيف موظفة مرشحة كـمحرّر/)).toBeTruthy()
    expect(api.post).toHaveBeenCalledWith(`/operations/forms/${ID}/collaborators`, { user_id: 99, access_level: 'editor', can_view_responses: true }, { skipErrorToast: true })
    expect(screen.getAllByText('موظفة مرشحة').length).toBeGreaterThan(0)
  })

  it('a duplicate is refused with the server reason and no row is added', async () => {
    await openCollaborators({
      [`GET /operations/forms/${ID}/collaborator-candidates`]: () => ok({ data: [{ id: 5, name: 'مكرّر', role: 'operations_manager', departments: [] }] }),
      [`POST /operations/forms/${ID}/collaborators`]: () => httpError(422, contract.duplicateCollaboratorResponse),
    })

    await userEvent.type(screen.getByLabelText(/ابحث عن موظف بالاسم/), 'مكرّر')
    await userEvent.click(await screen.findByRole('button', { name: /مكرّر/ }))
    await userEvent.click(screen.getByRole('button', { name: 'إضافة' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('تمت إضافة هذا الموظف مسبقاً')
    expect(screen.queryByText(/أُضيف/)).toBeNull()
    expect(screen.getAllByRole('row')).toHaveLength(2)
  })

  it('changes a collaborators level and response access through the server', async () => {
    await openCollaborators({
      [`PUT /operations/forms/${ID}/collaborators/${row.id}`]: () => ok({ data: { ...row, access_level: 'editor', can_view_responses: false } }),
    })

    await userEvent.selectOptions(screen.getByLabelText(`مستوى ${row.user.name}`), 'editor')

    expect(await screen.findByText('تم تحديث الصلاحيات.')).toBeTruthy()
    expect(api.put).toHaveBeenCalledWith(`/operations/forms/${ID}/collaborators/${row.id}`, { access_level: 'editor', can_view_responses: false }, { skipErrorToast: true })
    expect(screen.getByLabelText(`مستوى ${row.user.name}`)).toHaveValue('editor')
  })

  it('a refused change leaves the row as it was', async () => {
    await openCollaborators({ [`PUT /operations/forms/${ID}/collaborators/${row.id}`]: () => httpError(403, {}) })

    await userEvent.click(screen.getByLabelText(`قراءة الإجابات لـ ${row.user.name}`))

    expect(await screen.findByRole('alert')).toHaveTextContent('لا تملك صلاحية')
    expect(screen.getByLabelText(`قراءة الإجابات لـ ${row.user.name}`)).not.toBeChecked()
  })

  it('removing asks first, then drops the row only after the server confirms', async () => {
    await openCollaborators({ [`DELETE /operations/forms/${ID}/collaborators/${row.id}`]: () => ok({}) })

    await userEvent.click(screen.getByRole('button', { name: 'إزالة' }))
    expect(await screen.findByText('إزالة المتعاون؟')).toBeTruthy()
    expect(api.delete).not.toHaveBeenCalled()
    await userEvent.click(screen.getAllByRole('button', { name: 'إزالة' }).at(-1)!)

    await waitFor(() => expect(screen.queryByText(row.user.name)).toBeNull())
    expect(screen.getByText(/أُزيل/)).toBeTruthy()
    expect(screen.getByText('لم تتم مشاركة النموذج مع أحد بعد.')).toBeTruthy()
  })

  it('an editor who is not the owner sees the list but none of the controls to change it', async () => {
    await openCollaborators({}, withAbilities(FORM, { manage_access: false }))

    expect(screen.queryByLabelText(/ابحث عن موظف بالاسم/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'إزالة' })).toBeNull()
    expect(screen.queryByLabelText(`مستوى ${row.user.name}`)).toBeNull()
    expect(screen.getByText('مشاهد')).toBeTruthy()
  })
})

// ═══ Publishing settings and ownership ═══════════════════════════════════════

describe('publishing settings tab', () => {
  async function openSettings(form: unknown = FORM, extra: Record<string, Handler> = {}) {
    wire({ [`GET /operations/forms/${ID}`]: () => ok({ data: form }), ...extra })
    mount()
    await screen.findByRole('heading', { name: String((form as { title: string }).title) })
    await userEvent.click(screen.getByRole('tab', { name: 'إعدادات النشر' }))
    await screen.findByRole('form', { name: 'إعدادات النشر' })
  }

  it('shows the current visibility, response visibility, limits and sign-in setting', async () => {
    await openSettings()

    expect(screen.getByRole('radio', { name: /خاص/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /مقيّدة/ })).toBeChecked()
    expect(screen.getByLabelText('الحد الأقصى لعدد الإجابات')).toHaveValue(50)
    expect(screen.getByTestId('access-moved-note')).toBeTruthy()
    expect(screen.getByText(/الحد لكل شخص يتطلب تسجيل الدخول دائماً/)).toBeTruthy()
  })

  it('saves only what changed, and says so only after the server accepts', async () => {
    await openSettings(FORM, { [`PUT /operations/forms/${ID}/settings`]: () => ok(contract.settingsResponse) })

    await userEvent.click(screen.getByRole('radio', { name: /للمؤسسة/ }))
    await userEvent.clear(screen.getByLabelText('الحد الأقصى لعدد الإجابات'))
    await userEvent.type(screen.getByLabelText('الحد الأقصى لعدد الإجابات'), '75')
    await userEvent.click(screen.getByRole('button', { name: 'حفظ الإعدادات' }))

    expect(await screen.findByText('تم حفظ الإعدادات.')).toBeTruthy()
    expect(api.put).toHaveBeenCalledWith(`/operations/forms/${ID}/settings`, { visibility: 'organization', max_submissions: 75 }, { skipErrorToast: true })
  })

  it('a validation error appears next to its field and nothing is reported as saved', async () => {
    await openSettings(FORM, {
      [`PUT /operations/forms/${ID}/settings`]: () => httpError(422, { errors: { closes_at: ['يجب أن يكون موعد الإغلاق بعد موعد الفتح.'] } }),
    })

    await userEvent.type(screen.getByLabelText('يفتح في'), '2030-05-01T10:00')
    await userEvent.type(screen.getByLabelText('يُغلق في'), '2030-04-01T10:00')
    await userEvent.click(screen.getByRole('button', { name: 'حفظ الإعدادات' }))

    const alerts = await screen.findAllByRole('alert')
    expect(alerts.map((a) => a.textContent).join(' ')).toContain('يجب أن يكون موعد الإغلاق بعد موعد الفتح.')
    expect(screen.queryByText('تم حفظ الإعدادات.')).toBeNull()
  })

  it('an editor who is not the owner cannot change who can open the form or read the answers, and never sends those fields', async () => {
    await openSettings(withAbilities(FORM, { manage_access: false }), { [`PUT /operations/forms/${ID}/settings`]: () => ok(contract.settingsResponse) })

    expect(screen.getByRole('radio', { name: /للمؤسسة/ })).toBeDisabled()
    expect(screen.getByRole('radio', { name: /لكل من يرى النموذج/ })).toBeDisabled()
    expect(screen.queryByRole('heading', { name: 'ملكية النموذج' })).toBeNull()
    await userEvent.clear(screen.getByLabelText('الحد الأقصى لعدد الإجابات'))
    await userEvent.type(screen.getByLabelText('الحد الأقصى لعدد الإجابات'), '60')
    await userEvent.click(screen.getByRole('button', { name: 'حفظ الإعدادات' }))

    await screen.findByText('تم حفظ الإعدادات.')
    expect(api.put).toHaveBeenCalledWith(`/operations/forms/${ID}/settings`, { max_submissions: 60 }, { skipErrorToast: true })
  })

  it('transferring ownership asks first, names the new owner, and updates the page after the server accepts', async () => {
    await openSettings(FORM, {
      [`GET /operations/forms/${ID}/collaborator-candidates`]: () => ok({ data: [{ id: 41, name: 'مالكة جديدة', role: 'community_manager', departments: ['المجتمع'] }] }),
      [`POST /operations/forms/${ID}/ownership`]: () => ok({ data: { ...FORM, owner: { id: 41, name: 'مالكة جديدة' } } }),
    })

    await userEvent.type(screen.getByLabelText(/ابحث عن المالك الجديد بالاسم/), 'مالكة')
    await userEvent.click(await screen.findByRole('button', { name: /مالكة جديدة/ }))
    await userEvent.selectOptions(screen.getByLabelText('وصول المالك الحالي بعد النقل'), 'editor')
    await userEvent.click(screen.getByRole('button', { name: 'نقل الملكية' }))
    expect(await screen.findByText('نقل ملكية النموذج؟')).toBeTruthy()
    expect(api.post).not.toHaveBeenCalled()
    await userEvent.click(screen.getAllByRole('button', { name: 'نقل الملكية' }).at(-1)!)

    expect(await screen.findByText('انتقلت ملكية النموذج إلى مالكة جديدة.')).toBeTruthy()
    expect(api.post).toHaveBeenCalledWith(`/operations/forms/${ID}/ownership`, { owner_id: 41, keep_access: 'editor', keep_responses: false }, { skipErrorToast: true })
    expect(within(screen.getByRole('region', { name: 'حالة النموذج' })).getByText('المالك').nextElementSibling).toHaveTextContent('مالكة جديدة')
  })

  it('giving the form away without keeping access leaves the page, because nothing about the form is shown any more', async () => {
    await openSettings(FORM, {
      [`GET /operations/forms/${ID}/collaborator-candidates`]: () => ok({ data: [{ id: 41, name: 'مالكة جديدة', role: 'community_manager', departments: [] }] }),
      [`POST /operations/forms/${ID}/ownership`]: () => ok({ data: { id: ID, access_removed: true } }),
    })

    await userEvent.type(screen.getByLabelText(/ابحث عن المالك الجديد بالاسم/), 'مالكة')
    await userEvent.click(await screen.findByRole('button', { name: /مالكة جديدة/ }))
    await userEvent.click(screen.getByRole('button', { name: 'نقل الملكية' }))
    await userEvent.click(screen.getAllByRole('button', { name: 'نقل الملكية' }).at(-1)!)

    expect(await screen.findByText('forms list')).toBeTruthy()
    expect(screen.getByTestId('where')).toHaveTextContent('/dashboard/admin/forms')
  })

  it('a refused transfer says why and changes nothing', async () => {
    await openSettings(FORM, {
      [`GET /operations/forms/${ID}/collaborator-candidates`]: () => ok({ data: [{ id: 41, name: 'مالكة جديدة', role: 'community_manager', departments: [] }] }),
      [`POST /operations/forms/${ID}/ownership`]: () => httpError(422, { errors: { owner_id: ['لا يمكن نقل الملكية إلى هذا الموظف: يجب أن يكون مؤهلاً لإدارة النماذج.'] } }),
    })

    await userEvent.type(screen.getByLabelText(/ابحث عن المالك الجديد بالاسم/), 'مالكة')
    await userEvent.click(await screen.findByRole('button', { name: /مالكة جديدة/ }))
    await userEvent.click(screen.getByRole('button', { name: 'نقل الملكية' }))
    await userEvent.click(screen.getAllByRole('button', { name: 'نقل الملكية' }).at(-1)!)

    expect(await screen.findByText(/يجب أن يكون مؤهلاً لإدارة النماذج/)).toBeTruthy()
    expect(screen.queryByText(/انتقلت ملكية النموذج/)).toBeNull()
  })
})

// ═══ Editing the draft ═══════════════════════════════════════════════════════

describe('editor', () => {
  it('saving says it saved the DRAFT and, on a live form, that respondents do not see it until it is published', async () => {
    wire({
      [`GET /operations/forms/${ID}`]: () => ok({ data: FORM }),
      [`PUT /operations/forms/${ID}`]: () => ok(contract.editedDraftResponse),
    })
    mount()
    await screen.findByRole('heading', { name: String(FORM.title) })
    expect(screen.getByText(/ولا يراها المجيبون حتى تنشرها/)).toBeTruthy()

    await userEvent.type(screen.getByLabelText('عنوان النموذج'), ' معدّل')
    await userEvent.click(screen.getByRole('button', { name: 'حفظ الآن' }))

    await waitFor(() => expect(screen.getByTestId('save-indicator')).toHaveTextContent('تم الحفظ'))
    await waitFor(() => expect(screen.getByText('تعديلات غير منشورة')).toBeTruthy())
    expect(screen.getByTestId('version-badge')).toHaveTextContent('الإصدار 1')
  })

  it('the draft save does not carry a status, so saving can never publish or unpublish', async () => {
    wire({
      [`GET /operations/forms/${ID}`]: () => ok({ data: FORM }),
      [`PUT /operations/forms/${ID}`]: () => ok({ data: FORM }),
    })
    mount()
    await screen.findByRole('heading', { name: String(FORM.title) })

    await userEvent.type(screen.getByLabelText('عنوان النموذج'), ' معدّل')
    await userEvent.click(screen.getByRole('button', { name: 'حفظ الآن' }))

    await waitFor(() => expect(screen.getByTestId('save-indicator')).toHaveTextContent('تم الحفظ'))
    expect(api.put.mock.calls[0][1]).not.toHaveProperty('status')
  })
})

// ═══ The public page ═════════════════════════════════════════════════════════

describe('public page states', () => {
  const mountPublic = () =>
    render(
      <MemoryRouter initialEntries={['/forms/x']}>
        <Routes>
          <Route path="/forms/:slug" element={<PublicFormPage />} />
          <Route path="/login" element={<div>login page</div>} />
        </Routes>
      </MemoryRouter>,
    )

  it('a closed form says it is closed and shows no questions or submit button', async () => {
    api.get.mockResolvedValueOnce(ok(contract.publicClosedResponse))
    mountPublic()

    expect(await screen.findByTestId('availability-closed')).toHaveTextContent('مغلق')
    expect(screen.queryByRole('button', { name: 'إرسال' })).toBeNull()
  })

  it('a sign-in-only form asks the visitor to sign in', async () => {
    api.get.mockResolvedValueOnce(ok(contract.publicLoginRequiredResponse))
    mountPublic()

    expect(await screen.findByTestId('availability-login_required')).toHaveTextContent('تسجيل الدخول')
    await userEvent.click(screen.getByRole('link', { name: 'تسجيل الدخول' }))
    expect(await screen.findByText('login page')).toBeTruthy()
  })

  it.each([
    ['not_open_yet', 'لم يبدأ استقبال الإجابات'],
    ['ended', 'انتهى موعد استقبال الإجابات'],
    ['limit_reached', 'اكتمل العدد المسموح به'],
    ['respondent_limit', 'وصلت إلى الحد الأقصى'],
  ])('%s is explained in words', async (state, text) => {
    const base = contract.publicClosedResponse.data
    api.get.mockResolvedValueOnce(ok({ data: { ...base, availability: { ...base.availability, state, message: `${text} على هذا النموذج.`, opens_at: '2031-01-01T10:00:00+00:00' } } }))
    mountPublic()

    expect(await screen.findByTestId(`availability-${state}`)).toHaveTextContent(text)
    expect(screen.queryByRole('button', { name: 'إرسال' })).toBeNull()
  })

  it('an open form shows its questions, and a refusal at send time is shown as the refusal it is', async () => {
    api.get.mockResolvedValueOnce(ok(contract.publicShowResponse))
    api.post.mockRejectedValueOnce(httpError(contract.submitClosedStatus, contract.submitClosedResponse))
    mountPublic()
    await userEvent.type(await screen.findByLabelText(/الاسم الكامل/), 'سارة')
    await userEvent.type(screen.getByLabelText(/البريد الإلكتروني/), 'sara@example.com')
    await userEvent.selectOptions(screen.getByLabelText(/المدينة/), 'جدة')

    await userEvent.click(screen.getByRole('button', { name: 'إرسال' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('مغلق ولا يستقبل إجابات')
    expect(screen.queryByRole('status')).toBeNull()
  })
})
