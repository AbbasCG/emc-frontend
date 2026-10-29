import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import apiClient from '@/api/axios'
import FormResponsesPanel from '@/components/operations/formResponses/FormResponsesPanel'

/**
 * The response management screens against a fake server that behaves like the real one: it filters and pages, keeps statuses,
 * assignments, notes and corrected answers, and refuses what the real server refuses. What a person may do comes only from the
 * server's `abilities`; the screens must never offer more.
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
const ok = (data: unknown, extra: Record<string, unknown> = {}) => ({ data: { success: true, data, ...extra } })

type Answer = Record<string, unknown>
type Raw = Record<string, unknown> & { id: number; status: string; answers: Answer[]; assignee: { id: number; name: string } | null; corrected: boolean }

const answers = (id: number): Answer[] => [
  { id: id * 10 + 1, question_id: 5, question_label: 'الاسم', question_type: 'text', value: `شخص ${id}`, display_value: `شخص ${id}`, has_file: false, file_name: null, question_required: true, question_options: null },
  { id: id * 10 + 2, question_id: 6, question_label: 'المدينة', question_type: 'select', value: 'جدة', display_value: 'جدة', has_file: false, file_name: null, question_required: false, question_options: ['الرياض', 'جدة', 'مكة'] },
  { id: id * 10 + 3, question_id: 7, question_label: 'السيرة', question_type: 'file', value: 'cv.pdf', display_value: 'cv.pdf', has_file: true, file_name: 'cv.pdf', question_required: false },
]

const row = (id: number, over: Partial<Raw> = {}): Raw => ({
  id, form_id: 7, form_version_id: 1, form_version: 1, status: 'new', status_label: 'جديد', submitted_at: `2026-10-${String(10 + (id % 18)).padStart(2, '0')}T10:00:00+00:00`,
  submitter_label: 'زائر', assignee: null, assigned_at: null, corrected: false, corrected_at: null, source: { type: 'public', label: null },
  answers_preview: `الاسم: شخص ${id}`, answers: answers(id), ...over,
})

type Calls = { method: string; path: string; body?: unknown; params?: Record<string, unknown> }[]

function fakeServer(opts: { rows?: Raw[]; abilities?: { review: boolean; correct: boolean }; pageSize?: number } = {}) {
  const state = {
    rows: opts.rows ?? [row(1), row(2, { status: 'in_review', assignee: { id: 21, name: 'سلمى' } }), row(3, { source: { type: 'link', label: 'ملصق المدخل' }, share_link: { id: 4, label: 'ملصق المدخل' } })],
    abilities: opts.abilities ?? { review: true, correct: true },
    notes: new Map<number, { id: number; body: string; author: { id: number; name: string }; created_at: string }[]>(),
    history: new Map<number, unknown[]>(),
    exports: [] as { id: number; format: string; polls: number; failWith?: string }[],
    columns: [
      { key: 'id', label: 'رقم الرد', group: 'meta', type: 'number', removed: false, default: true },
      { key: 'status', label: 'الحالة', group: 'meta', type: null, removed: false, default: true },
      { key: 'q_5', label: 'الاسم', group: 'question', type: 'text', removed: false, default: true },
      { key: 'q_6', label: 'المدينة', group: 'question', type: 'select', removed: false, default: true },
    ] as Record<string, unknown>[],
    failNext: {} as Record<string, unknown>,
    exportDefault: undefined as undefined | { status: 'queued' | 'ready' },
    calls: [] as Calls,
  }
  const pageSize = opts.pageSize ?? 20

  const matches = (r: Raw, p: Record<string, unknown>): boolean => {
    const statuses = ([] as string[]).concat((p.status as string | string[] | undefined) ?? [])
    if (statuses.length && !statuses.includes(r.status)) return false
    if (p.search && !JSON.stringify(r.answers).includes(String(p.search))) return false
    if (p.assignee === 'none' && r.assignee) return false
    if (p.corrected && !r.corrected) return false
    return true
  }

  const counts = (p: Record<string, unknown>) => {
    const base = state.rows.filter((r) => matches(r, { ...p, status: undefined }))
    const c: Record<string, number> = { new: 0, in_review: 0, needs_followup: 0, completed: 0, archived: 0 }
    for (const r of base) c[r.status] = (c[r.status] ?? 0) + 1
    return c
  }

  const detail = (r: Raw) => ({ ...structuredClone(r), abilities: state.abilities })
  const find = (path: string) => state.rows.find((r) => r.id === Number(/submissions\/(\d+)/.exec(path)?.[1]))

  const handle = (method: string) => async (url: string, a?: unknown, b?: unknown) => {
    const path = url.replace('/operations/forms/7', '')
    const config = (method === 'GET' ? a : b) as { params?: Record<string, unknown> } | undefined
    const body = method === 'GET' ? undefined : a
    state.calls.push({ method, path, body, params: config?.params })
    const fail = state.failNext[`${method} ${path}`]
    if (fail) { delete state.failNext[`${method} ${path}`]; throw fail }

    if (method === 'GET' && path === '/submissions') {
      const p = config?.params ?? {}
      const filtered = state.rows.filter((r) => matches(r, p))
      const per = Number(p.per_page ?? pageSize)
      const page = Number(p.page ?? 1)
      return { data: { success: true, data: { data: filtered.slice((page - 1) * per, page * per).map((r) => structuredClone(r)), meta: { current_page: page, last_page: Math.max(1, Math.ceil(filtered.length / per)), total: filtered.length }, status_counts: counts(p) } } }
    }
    if (method === 'GET' && path === '/response-options') {
      return ok({
        statuses: [], versions: [{ id: 1, number: 1, published_at: null, responses: 3 }, { id: 2, number: 2, published_at: null, responses: 0 }],
        links: [{ id: 4, label: 'ملصق المدخل' }], columns: state.columns,
        assignees: [{ id: 21, name: 'سلمى' }], assignable: state.abilities.review ? [{ id: 21, name: 'سلمى' }, { id: 22, name: 'سلطان' }] : [],
      })
    }
    const r = find(path)
    if (method === 'GET' && /^\/submissions\/\d+$/.test(path) && r) return ok(detail(r))
    if (method === 'PUT' && path.endsWith('/status') && r) {
      if (!state.abilities.review) throw httpError(403, { message: 'forbidden' })
      const status = (body as { status: string }).status
      state.history.set(r.id, [...(state.history.get(r.id) ?? []), { id: Date.now(), type: 'status_changed', label: 'تغيير حالة الرد', actor: { id: 1, name: 'أنا' }, from: r.status, to: status, meta: null, corrections: [], created_at: '2026-10-18T10:00:00Z' }])
      r.status = status
      return ok(detail(r), { changed: true })
    }
    if (method === 'PUT' && path.endsWith('/assignment') && r) {
      const id = (body as { assignee_id: number | null }).assignee_id
      r.assignee = id === null ? null : { id, name: id === 21 ? 'سلمى' : 'سلطان' }
      return ok(detail(r), { changed: true })
    }
    if (path.endsWith('/notes') && r) {
      if (!state.abilities.review) throw httpError(403, { message: 'forbidden' })
      const list = state.notes.get(r.id) ?? []
      if (method === 'POST') {
        list.push({ id: list.length + 1, body: String((body as { body: string }).body).trim(), author: { id: 1, name: 'أنا' }, created_at: '2026-10-18T10:00:00Z' })
        state.notes.set(r.id, list)
        return { data: { success: true, data: structuredClone(list) } }
      }
      return ok(structuredClone(list))
    }
    if (method === 'GET' && path.endsWith('/history') && r) {
      if (!state.abilities.review) throw httpError(403, { message: 'forbidden' })
      return ok([{ id: 0, type: 'submitted', label: 'استلام الرد', actor: null, from: null, to: null, meta: null, corrections: [], created_at: '2026-10-10T10:00:00Z' }, ...(state.history.get(r.id) ?? [])])
    }
    if (method === 'PUT' && path.endsWith('/answers') && r) {
      if (!state.abilities.correct) throw httpError(403, { message: 'forbidden' })
      const corrections = (body as { corrections: Record<string, string> }).corrections
      const errors: Record<string, string[]> = {}
      for (const [qid, value] of Object.entries(corrections)) {
        const a = r.answers.find((x) => String(x.question_id) === qid)
        if (a?.question_type === 'select' && !(a.question_options as string[]).includes(value)) errors[`answers.${qid}`] = ['اختر قيمة من الخيارات المتاحة في «المدينة».']
        if (a?.question_required && value === '') errors[`answers.${qid}`] = ['حقل «الاسم» مطلوب.']
      }
      if (Object.keys(errors).length) throw httpError(422, { success: false, errors })
      for (const [qid, value] of Object.entries(corrections)) {
        const a = r.answers.find((x) => String(x.question_id) === qid)
        if (a) { a.value = value; a.display_value = value; a.corrected = true }
      }
      r.corrected = true
      state.history.set(r.id, [...(state.history.get(r.id) ?? []), { id: Date.now(), type: 'corrected', label: 'تصحيح إجابات', actor: { id: 1, name: 'أنا' }, from: null, to: null, meta: { count: Object.keys(corrections).length }, corrections: [{ id: 1, question_id: 5, question_label: 'الاسم', question_type: 'text', previous: 'قديم', new: 'جديد', previous_display: 'قديم', new_display: 'جديد', reason: (body as { reason?: string }).reason ?? null, corrected_by: { id: 1, name: 'أنا' }, created_at: '2026-10-18T10:00:00Z' }], created_at: '2026-10-18T10:00:00Z' }])
      return { data: { success: true, changed: Object.keys(corrections).length, data: detail(r) } }
    }
    if (method === 'POST' && path === '/exports') {
      const req = body as { format: string }
      const id = state.exports.length + 1
      const ready = (state.exportDefault?.status ?? 'ready') === 'ready'
      state.exports.push({ id, format: req.format, polls: 0 })
      return { data: { success: true, data: { id, format: req.format, status: ready ? 'ready' : 'queued', ready, row_count: state.rows.length, file_name: `form-7-responses.${req.format}`, file_size: 2048, error: null, expires_at: null } } }
    }
    if (method === 'GET' && /^\/exports\/\d+$/.test(path)) {
      const e = state.exports[Number(/\d+/.exec(path)![0]) - 1]
      e.polls++
      if (e.failWith) return ok({ id: e.id, format: e.format, status: 'failed', ready: false, error: e.failWith })
      const done = e.polls >= 2
      return ok({ id: e.id, format: e.format, status: done ? 'ready' : 'processing', ready: done, row_count: state.rows.length, file_name: `form-7-responses.${e.format}`, file_size: 2048, error: null, expires_at: null })
    }
    if (method === 'GET' && /\/exports\/\d+\/download$/.test(path)) return { data: new Blob(['x']) }
    throw new Error(`unexpected ${method} ${url}`)
  }
  api.get.mockImplementation(handle('GET') as never)
  api.put.mockImplementation(handle('PUT') as never)
  api.post.mockImplementation(handle('POST') as never)

  return state
}

let downloads: string[]
beforeEach(() => {
  vi.clearAllMocks()
  downloads = []
  Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { downloads.push(this.download) })
})
afterEach(() => vi.restoreAllMocks())

const mount = () => render(<FormResponsesPanel formId={7} />)
const open = async (id: number) => {
  await userEvent.click(await screen.findByRole('button', { name: `عرض إجابات الإرسال ${id}` }))
  return screen.findByTestId('response-details')
}
const rows = () => screen.getAllByTestId('response-row')

describe('the table', () => {
  it('shows the responses with their status, assignee, source and version, and the status counts', async () => {
    fakeServer()
    mount()

    expect(await screen.findAllByTestId('response-row')).toHaveLength(3)
    const second = rows()[1]
    expect(within(second).getByText('قيد المراجعة')).toBeTruthy()
    expect(within(second).getByText('سلمى')).toBeTruthy()
    expect(within(rows()[2]).getByText('رابط: ملصق المدخل')).toBeTruthy()
    expect(screen.getByTestId('responses-total')).toHaveTextContent('إجمالي الإرسالات: 3')
    expect(within(screen.getByRole('group', { name: 'حالة الرد' })).getByRole('button', { name: /جديد/ })).toHaveTextContent('2')
  })

  it('filters on the server: a status chip, then the search box, sending the filters as parameters and starting again at page 1', async () => {
    const server = fakeServer()
    mount()
    await screen.findAllByTestId('response-row')

    await userEvent.click(within(screen.getByRole('group', { name: 'حالة الرد' })).getByRole('button', { name: /قيد المراجعة/ }))
    await waitFor(() => expect(rows()).toHaveLength(1))
    expect(server.calls.at(-1)?.params).toMatchObject({ status: ['in_review'], page: 1 })
    expect(screen.getByTestId('responses-total')).toHaveTextContent('النتائج المطابقة: 1')

    await userEvent.type(screen.getByRole('searchbox'), 'شخص 9')
    await waitFor(() => expect(screen.getByTestId('responses-empty')).toHaveTextContent('لا توجد إرسالات مطابقة للتصفية.'), { timeout: 3000 })
    expect(server.calls.at(-1)?.params).toMatchObject({ search: 'شخص 9', status: ['in_review'] })

    await userEvent.click(screen.getByRole('button', { name: /مسح التصفية/ }))
    await waitFor(() => expect(rows()).toHaveLength(3))
  })

  it('the assignee, version, source, date range and corrected filters are sent as asked', async () => {
    const server = fakeServer()
    mount()
    await screen.findAllByTestId('response-row')

    await userEvent.selectOptions(screen.getByLabelText('المُسنَد إليه'), 'none')
    await waitFor(() => expect(server.calls.at(-1)?.params).toMatchObject({ assignee: 'none' }))
    await userEvent.selectOptions(screen.getByLabelText('إصدار النموذج'), '1')
    await waitFor(() => expect(server.calls.at(-1)?.params).toMatchObject({ version: 1 }))
    await userEvent.selectOptions(screen.getByLabelText('مصدر الإرسال'), 'link')
    await waitFor(() => expect(server.calls.at(-1)?.params).toMatchObject({ source: 'link' }))
    await userEvent.type(screen.getByLabelText('من تاريخ'), '2026-10-01')
    await waitFor(() => expect(server.calls.at(-1)?.params).toMatchObject({ from: '2026-10-01' }))
    await userEvent.type(screen.getByLabelText('إلى تاريخ'), '2026-10-31')
    await waitFor(() => expect(server.calls.at(-1)?.params).toMatchObject({ to: '2026-10-31' }))
    await userEvent.click(screen.getByLabelText('الردود التي صُحِّحت إجاباتها فقط'))
    await waitFor(() => expect(server.calls.at(-1)?.params).toMatchObject({ corrected: 1, assignee: 'none', version: 1, source: 'link', from: '2026-10-01', to: '2026-10-31' }))
  })

  it('pages on the server and goes back to the first page when the page size changes', async () => {
    const many = Array.from({ length: 25 }, (_, i) => row(i + 1))
    const server = fakeServer({ rows: many })
    mount()
    await screen.findAllByTestId('response-row')
    expect(screen.getByText('صفحة 1 من 2')).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: 'التالي' }))
    await waitFor(() => expect(screen.getByText('صفحة 2 من 2')).toBeTruthy())
    expect(server.calls.at(-1)?.params).toMatchObject({ page: 2, per_page: 20 })
    expect(rows()).toHaveLength(5)
    expect(screen.getByRole('button', { name: 'التالي' })).toBeDisabled()

    await userEvent.selectOptions(screen.getByLabelText('عدد الصفوف'), '50')
    await waitFor(() => expect(screen.getByText('صفحة 1 من 1')).toBeTruthy())
    expect(server.calls.at(-1)?.params).toMatchObject({ page: 1, per_page: 50 })
  })

  it('applying a filter while on a later page goes back to page 1 instead of asking for a page that no longer exists', async () => {
    const server = fakeServer({ rows: Array.from({ length: 25 }, (_, i) => row(i + 1)) })
    mount()
    await screen.findAllByTestId('response-row')
    await userEvent.click(screen.getByRole('button', { name: 'التالي' }))
    await waitFor(() => expect(server.calls.at(-1)?.params).toMatchObject({ page: 2 }))

    await userEvent.click(within(screen.getByRole('group', { name: 'حالة الرد' })).getByRole('button', { name: /جديد/ }))

    await waitFor(() => expect(server.calls.at(-1)?.params).toMatchObject({ status: ['new'], page: 1 }))
  })

  it('sorting asks the server and flips the direction', async () => {
    const server = fakeServer()
    mount()
    await screen.findAllByTestId('response-row')

    await userEvent.click(screen.getByRole('button', { name: 'التاريخ' }))
    await waitFor(() => expect(server.calls.at(-1)?.params).toMatchObject({ sort: 'submitted_at', direction: 'asc' }))
    await userEvent.click(screen.getByRole('button', { name: '#' }))
    await waitFor(() => expect(server.calls.at(-1)?.params).toMatchObject({ sort: 'id', direction: 'desc' }))
  })

  it('says so when there are no responses yet, and when loading fails, with a retry', async () => {
    const empty = fakeServer({ rows: [] })
    const { unmount } = mount()
    expect(await screen.findByTestId('responses-empty')).toHaveTextContent('لا توجد إرسالات بعد.')
    unmount()

    const failing = fakeServer()
    failing.failNext['GET /submissions'] = httpError(500, {})
    mount()
    expect(await screen.findByText('تعذّر تحميل الإرسالات. تحقق من الاتصال وأعد المحاولة.')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }))
    expect(await screen.findAllByTestId('response-row')).toHaveLength(3)
    expect(empty.calls.length).toBeGreaterThan(0)
  })

  it('a refused list (no permission) is said plainly instead of a generic failure', async () => {
    const server = fakeServer()
    server.failNext['GET /submissions'] = httpError(403, { message: 'forbidden' })
    mount()

    expect(await screen.findByText('لا تملك صلاحية عرض إجابات هذا النموذج.')).toBeTruthy()
  })
})

describe('one response', () => {
  it('opens with the answers under the labels of its own version, and the way it arrived', async () => {
    fakeServer()
    mount()
    const modal = await open(3)

    expect(within(modal).getByText('الاسم')).toBeTruthy()
    expect(within(modal).getByText('شخص 3')).toBeTruthy()
    expect(within(modal).getByTestId('via-link')).toHaveTextContent('ملصق المدخل')
    expect(within(modal).getByRole('button', { name: /تنزيل cv\.pdf/ })).toBeTruthy()
  })

  it('someone who may only read sees the status and the assignee as words, and no workflow controls at all', async () => {
    fakeServer({ abilities: { review: false, correct: false } })
    mount()
    const modal = await open(2)

    await waitFor(() => expect(within(modal).queryByRole('combobox', { name: 'حالة الرد' })).toBeNull())
    expect(within(modal).queryByRole('tab')).toBeNull()
    expect(within(modal).queryByRole('button', { name: /تصحيح الإجابات/ })).toBeNull()
    expect(within(modal).getAllByText('قيد المراجعة').length).toBeGreaterThan(0)
    expect(within(modal).getByText('سلمى')).toBeTruthy()
  })

  it('a reviewer changes the status and the assignee, and the table follows', async () => {
    const server = fakeServer()
    mount()
    const modal = await open(1)

    await userEvent.selectOptions(await within(modal).findByRole('combobox', { name: 'حالة الرد' }), 'needs_followup')
    expect(await within(modal).findByText('تم تحديث حالة الرد.')).toBeTruthy()
    expect(server.calls.find((c) => c.method === 'PUT' && c.path === '/submissions/1/status')?.body).toEqual({ status: 'needs_followup' })

    await userEvent.selectOptions(within(modal).getByRole('combobox', { name: 'إسناد الرد إلى' }), '22')
    expect(await within(modal).findByText('تم إسناد الرد.')).toBeTruthy()
    expect(server.calls.find((c) => c.path === '/submissions/1/assignment')?.body).toEqual({ assignee_id: 22 })

    await waitFor(() => {
      expect(within(rows()[0]).getByText('يحتاج متابعة')).toBeTruthy()
      expect(within(rows()[0]).getByText('سلطان')).toBeTruthy()
    })
  })

  it('a refused status change is said in words and nothing changes on screen', async () => {
    const server = fakeServer()
    mount()
    const modal = await open(1)
    server.failNext['PUT /submissions/1/status'] = httpError(403, { message: 'forbidden' })

    await userEvent.selectOptions(await within(modal).findByRole('combobox', { name: 'حالة الرد' }), 'completed')

    expect(await within(modal).findByText('لا تملك صلاحية تنفيذ هذه العملية على هذا النموذج.')).toBeTruthy()
    expect(within(rows()[0]).getByText('جديد')).toBeTruthy()
  })

  it('internal notes: written, listed in order, and described as staff-only', async () => {
    const server = fakeServer()
    mount()
    const modal = await open(1)

    await userEvent.click(await within(modal).findByRole('tab', { name: 'الملاحظات الداخلية' }))
    expect(await within(modal).findByTestId('notes-empty')).toBeTruthy()
    expect(within(modal).getByText(/للفريق فقط/)).toBeTruthy()
    expect(within(modal).getByRole('button', { name: 'إضافة الملاحظة' })).toBeDisabled()

    await userEvent.type(within(modal).getByLabelText('ملاحظة جديدة'), '  اتصلنا بالمشارك  ')
    await userEvent.click(within(modal).getByRole('button', { name: 'إضافة الملاحظة' }))

    await waitFor(() => expect(within(modal).getAllByTestId('note')).toHaveLength(1))
    expect(within(modal).getByText('اتصلنا بالمشارك')).toBeTruthy()
    expect(server.calls.find((c) => c.method === 'POST' && c.path === '/submissions/1/notes')?.body).toEqual({ body: '  اتصلنا بالمشارك  ' })
    expect((within(modal).getByLabelText('ملاحظة جديدة') as HTMLTextAreaElement).value).toBe('')
  })

  it('a blank note is never sent, even when the form is submitted without the button', async () => {
    const server = fakeServer()
    mount()
    const modal = await open(1)
    await userEvent.click(await within(modal).findByRole('tab', { name: 'الملاحظات الداخلية' }))
    await within(modal).findByTestId('notes-empty')

    await userEvent.type(within(modal).getByLabelText('ملاحظة جديدة'), '   ')
    fireEvent.submit(within(modal).getByLabelText('ملاحظة جديدة').closest('form')!)

    expect(server.calls.some((c) => c.method === 'POST' && c.path.endsWith('/notes'))).toBe(false)
  })

  it('correcting: only changed answers are sent, the reason goes with them, the answer is marked, and the history shows before and after', async () => {
    const server = fakeServer()
    mount()
    const modal = await open(1)

    await userEvent.click(await within(modal).findByRole('button', { name: /تصحيح الإجابات/ }))
    expect(within(modal).getByRole('note')).toHaveTextContent('الإجابة الأصلية محفوظة')
    expect(within(modal).getByRole('button', { name: 'حفظ التصحيح' })).toBeDisabled()
    // The attachment is shown, not editable.
    expect(within(modal).queryByLabelText(/السيرة/)).toBeNull()

    const name = within(modal).getByLabelText(/الاسم/)
    await userEvent.clear(name)
    await userEvent.type(name, 'سارة المصحّحة')
    await userEvent.type(within(modal).getByLabelText('سبب التصحيح (اختياري)'), 'صحّح المشارك اسمه')
    await userEvent.click(within(modal).getByRole('button', { name: 'حفظ التصحيح' }))

    expect(await within(modal).findByText(/تم حفظ التصحيح \(1\)/)).toBeTruthy()
    expect(server.calls.find((c) => c.path === '/submissions/1/answers')?.body).toEqual({ corrections: { 5: 'سارة المصحّحة' }, reason: 'صحّح المشارك اسمه' })
    expect(within(modal).getByText('مُصحَّحة')).toBeTruthy()
    expect(within(rows()[0]).getByText('مُصحَّح')).toBeTruthy()

    await userEvent.click(within(modal).getByRole('tab', { name: 'السجل والتصحيحات' }))
    const correction = await within(modal).findByTestId('correction')
    expect(correction).toHaveTextContent('قبل: قديم')
    expect(correction).toHaveTextContent('بعد: جديد')
    expect(correction).toHaveTextContent('صحّح المشارك اسمه')
  })

  it('a refused correction shows the server\'s message next to the question and keeps the typed values', async () => {
    fakeServer()
    mount()
    const modal = await open(1)

    await userEvent.click(await within(modal).findByRole('button', { name: /تصحيح الإجابات/ }))
    // The server refuses an emptied required answer; the city, changed in the same request, is kept as typed.
    await userEvent.clear(within(modal).getByLabelText(/الاسم/))
    await userEvent.selectOptions(within(modal).getByLabelText(/المدينة/), 'مكة')
    await userEvent.click(within(modal).getByRole('button', { name: 'حفظ التصحيح' }))

    expect(await within(modal).findByText('حقل «الاسم» مطلوب.')).toBeTruthy()
    expect(within(modal).getByText('راجع الإجابات المحدّدة أدناه ثم أعد المحاولة.')).toBeTruthy()
    expect((within(modal).getByLabelText(/الاسم/) as HTMLInputElement).value).toBe('')
    expect((within(modal).getByLabelText(/المدينة/) as HTMLSelectElement).value).toBe('مكة')
  })

  it('someone who may review but not correct has no correction button, and a reviewer sees the controls only once the server says so', async () => {
    fakeServer({ abilities: { review: true, correct: false } })
    mount()
    const modal = await open(1)

    expect(await within(modal).findByRole('tab', { name: 'الملاحظات الداخلية' })).toBeTruthy()
    expect(within(modal).queryByRole('button', { name: /تصحيح الإجابات/ })).toBeNull()
  })
})

describe('exporting', () => {
  it('offers the formats and the columns, the default selection first, and says exactly what the file will hold', async () => {
    const server = fakeServer()
    mount()
    await screen.findAllByTestId('response-row')
    await userEvent.click(screen.getByRole('button', { name: 'تصدير' }))

    const dialog = await screen.findByTestId('export-dialog')
    expect(within(dialog).getByTestId('export-scope')).toHaveTextContent('3')
    expect(within(dialog).getByTestId('export-scope')).toHaveTextContent('كل الإرسالات')
    expect(within(dialog).getByTestId('export-scope')).toHaveTextContent('لا تُصدَّر الملاحظات الداخلية')
    expect(within(dialog).getByRole('radio', { name: /Excel/ })).toBeChecked()
    expect(within(dialog).getAllByRole('checkbox').every((c) => (c as HTMLInputElement).checked)).toBe(true)
    expect(within(dialog).getByText('الأعمدة (4 من 4)')).toBeTruthy()
    expect(server.exports).toHaveLength(0)
  })

  it('exports the current filters, only the chosen columns, then downloads the file (a ready export at once)', async () => {
    const server = fakeServer()
    mount()
    await screen.findAllByTestId('response-row')
    await userEvent.click(within(screen.getByRole('group', { name: 'حالة الرد' })).getByRole('button', { name: /جديد/ }))
    await waitFor(() => expect(rows()).toHaveLength(2))
    await userEvent.click(screen.getByRole('button', { name: 'تصدير' }))
    const dialog = await screen.findByTestId('export-dialog')

    await userEvent.click(within(dialog).getByRole('radio', { name: /CSV/ }))
    await userEvent.click(within(dialog).getByLabelText('المدينة'))
    await userEvent.click(within(dialog).getByRole('button', { name: 'تصدير CSV' }))

    expect(await within(dialog).findByTestId('export-done')).toHaveTextContent('تم تنزيل الملف')
    expect(server.calls.find((c) => c.method === 'POST' && c.path === '/exports')?.body).toEqual({ format: 'csv', columns: ['id', 'status', 'q_5'], filters: { status: ['new'] } })
    expect(downloads).toEqual(['form-7-responses.csv'])
  })

  it('a large export is waited for: queued, then processing, then downloaded when ready', async () => {
    const server = fakeServer()
    server.exportDefault = { status: 'queued' }
    mount()
    await screen.findAllByTestId('response-row')
    await userEvent.click(screen.getByRole('button', { name: 'تصدير' }))
    const dialog = await screen.findByTestId('export-dialog')

    await userEvent.click(within(dialog).getByRole('button', { name: 'تصدير Excel (XLSX)' }))

    expect(await within(dialog).findByRole('status')).toHaveTextContent('لا تغلق النافذة')
    expect(await within(dialog).findByTestId('export-done', {}, { timeout: 8000 })).toBeTruthy()
    expect(server.calls.filter((c) => c.method === 'GET' && /^\/exports\/\d+$/.test(c.path)).length).toBeGreaterThanOrEqual(2)
    expect(downloads).toEqual(['form-7-responses.xlsx'])
  }, 15000)

  it('a failed export says why, in words, and offers nothing to download', async () => {
    const server = fakeServer()
    server.exportDefault = { status: 'queued' }
    mount()
    await screen.findAllByTestId('response-row')
    await userEvent.click(screen.getByRole('button', { name: 'تصدير' }))
    const dialog = await screen.findByTestId('export-dialog')
    server.failNext['POST /exports'] = httpError(422, { errors: { format: ['حجم البيانات كبير على ملف XLSX. اختر أعمدة أقل أو ضيّق التصفية أو استخدم صيغة CSV.'] } })

    await userEvent.click(within(dialog).getByRole('button', { name: 'تصدير Excel (XLSX)' }))

    expect(await within(dialog).findByTestId('export-error')).toHaveTextContent('استخدم صيغة CSV')
    expect(downloads).toEqual([])
    expect(within(dialog).getByRole('button', { name: 'تصدير Excel (XLSX)' })).toBeEnabled()
  })

  it('a PDF is held to a printable number of columns before anything is sent, and nothing can be exported with no columns', async () => {
    const server = fakeServer()
    server.columns = Array.from({ length: 14 }, (_, i) => ({ key: `q_${i}`, label: `سؤال ${i}`, group: 'question', type: 'text', removed: false, default: true }))
    mount()
    await screen.findAllByTestId('response-row')
    await userEvent.click(screen.getByRole('button', { name: 'تصدير' }))
    const dialog = await screen.findByTestId('export-dialog')

    await userEvent.click(within(dialog).getByRole('radio', { name: /PDF/ }))
    expect(within(dialog).getByRole('button', { name: 'تصدير PDF' })).toBeDisabled()
    expect(within(dialog).getByText(/يتسع لـ 12 عموداً/)).toBeTruthy()

    await userEvent.click(within(dialog).getAllByRole('button', { name: 'لا شيء' })[0])
    expect(within(dialog).getByRole('button', { name: 'تصدير PDF' })).toBeDisabled()
    await userEvent.click(within(dialog).getByRole('button', { name: 'تحديد الكل' }))
    await userEvent.click(within(dialog).getByLabelText('سؤال 0'))
    await userEvent.click(within(dialog).getByLabelText('سؤال 1'))
    expect(within(dialog).getByRole('button', { name: 'تصدير PDF' })).toBeEnabled()
    expect(server.exports).toHaveLength(0)
  })

  it('with a version chosen, the columns are that version\'s questions', async () => {
    const server = fakeServer()
    mount()
    await screen.findAllByTestId('response-row')
    await userEvent.selectOptions(screen.getByLabelText('إصدار النموذج'), '1')
    await waitFor(() => expect(server.calls.at(-1)?.params).toMatchObject({ version: 1 }))
    server.calls.length = 0
    await userEvent.click(screen.getByRole('button', { name: 'تصدير' }))

    await screen.findByTestId('export-dialog')
    await waitFor(() => expect(server.calls.some((c) => c.path === '/response-options' && c.params?.version === 1)).toBe(true))
  })
})
