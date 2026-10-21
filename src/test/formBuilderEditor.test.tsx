import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import apiClient from '@/api/axios'
import FormBuilderEditor from '@/components/operations/formBuilder/FormBuilderEditor'
import { LIBRARY_TYPES, TYPE_SPECS } from '@/components/operations/formBuilder/questionTypes'
import type { FormQuestion, OpsFormDefinition, QuestionType } from '@/types/operations'

/**
 * The builder as a person uses it: add, edit, move, duplicate and delete blocks, undo, save and lose the connection, meet a
 * second editor, preview. Requests go through formsApi to a mocked HTTP client that behaves like the server for drafts:
 * it stores what it is sent, gives new questions ids and moves the revision, and refuses a stale revision with a 409.
 */

vi.mock('@/api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))
const api = vi.mocked(apiClient, true)

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open') }
})

const httpError = (status: number, data: unknown) => Object.assign(new Error(`HTTP ${status}`), { isAxiosError: true, response: { status, data } })

const q = (id: number, label: string, type: QuestionType = 'text', extra: Partial<FormQuestion> = {}): FormQuestion => ({ id, label, type, required: false, sort_order: id, ...extra })

const baseForm = (questions: FormQuestion[] = [q(1, 'الاسم'), q(2, 'البريد', 'email'), q(3, 'المدينة', 'radio', { options: ['جدة', 'الرياض'] })]): OpsFormDefinition => ({
  id: 9,
  title: 'استبيان',
  description: 'وصف',
  slug: 'survey',
  form_type: 'suggestion',
  status: 'draft',
  draft_revision: 3,
  questions,
  created_at: '2026-10-18',
})

/** A server that stores drafts. `server.revision` is the stored revision; a test can move it to simulate another editor. */
function fakeServer(initial: OpsFormDefinition) {
  const server = { revision: initial.draft_revision ?? 0, saved: initial, puts: [] as Record<string, unknown>[], nextId: 100, failNext: [] as unknown[] }
  api.put.mockImplementation((async (_url: string, body: Record<string, unknown>) => {
    server.puts.push(body)
    const failure = server.failNext.shift()
    if (failure) throw failure
    if (body.base_revision !== undefined && !body.force && body.base_revision !== server.revision) {
      throw httpError(409, { success: false, code: 'draft_conflict', message: 'x', data: { ...server.saved, draft_revision: server.revision } })
    }
    const sent = body.questions as FormQuestion[]
    const questions = sent.map((item, i) => ({ ...item, id: item.id > 0 ? item.id : server.nextId++, required: Boolean(item.required), sort_order: i + 1 }))
    server.revision += 1
    server.saved = { ...server.saved, title: body.title as string, description: body.description as string, questions, draft_revision: server.revision }

    return { data: { success: true, data: server.saved } }
  }) as never)

  return server
}

const cards = () => screen.getAllByTestId('block-card')
const labels = () => cards().map((c) => c.getAttribute('data-block-type'))
const pick = (i: number) => userEvent.click(cards()[i].querySelector<HTMLElement>('[role="group"]')!)

const mount = (form = baseForm(), props: Partial<React.ComponentProps<typeof FormBuilderEditor>> = {}) => render(<FormBuilderEditor form={form} {...props} />)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('the library', () => {
  it('offers every block, grouped, and each one can be added by clicking it', async () => {
    mount(baseForm([]))
    const groups = within(screen.getByTestId('builder-library')).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(groups).toEqual(['حقول أساسية', 'حقول الاختيار', 'التقييمات', 'التخطيط والأقسام', 'المرفقات والموافقة'])
    expect(screen.getByText('النموذج فارغ')).toBeTruthy()

    for (const type of LIBRARY_TYPES) await userEvent.click(screen.getByTestId(`library-${type}`))

    expect(labels()).toEqual(LIBRARY_TYPES)
    expect(screen.queryByText('النموذج فارغ')).toBeNull()
  })

  it('a clicked block goes after the selected one, and is selected itself', async () => {
    mount()
    await pick(0)
    await userEvent.click(screen.getByTestId('library-url'))

    expect(labels()).toEqual(['text', 'url', 'email', 'radio'])
    expect(cards()[1]).toHaveAttribute('data-selected', 'true')
  })

  it('the add menu on a block inserts above or below that block', async () => {
    mount()
    await pick(1)
    await userEvent.click(within(cards()[1]).getByRole('button', { name: 'إضافة قبل' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'رقم' }))
    expect(labels()).toEqual(['text', 'number', 'email', 'radio'])

    await userEvent.click(within(cards()[1]).getByRole('button', { name: 'إضافة بعد' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'تاريخ' }))
    expect(labels()).toEqual(['text', 'number', 'date', 'email', 'radio'])
  })

  it('the add button at the end of the form adds at the end', async () => {
    mount()
    await userEvent.click(screen.getByTestId('add-block'))
    await userEvent.click(screen.getByRole('menuitem', { name: 'فاصل صفحة' }))
    expect(labels().at(-1)).toBe('page_break')
  })
})

describe('the canvas and the properties panel', () => {
  it('is right to left, and says when nothing is selected', () => {
    mount()
    expect(screen.getByTestId('form-builder')).toHaveAttribute('dir', 'rtl')
    expect(within(screen.getByTestId('builder-properties')).getByText('لا يوجد عنصر محدد')).toBeTruthy()
  })

  it('editing a property changes the canvas at once: text, required, placeholder, help text', async () => {
    mount()
    await pick(0)
    const panel = within(screen.getByTestId('builder-properties'))

    const label = panel.getByDisplayValue('الاسم')
    await userEvent.clear(label)
    await userEvent.type(label, 'الاسم الكامل')
    await userEvent.click(panel.getByRole('switch'))
    await userEvent.type(panel.getByLabelText('النص التوضيحي داخل الحقل'), 'مثال: سارة')
    await userEvent.type(panel.getByLabelText(/نص المساعدة/), 'كما في الهوية')

    const card = within(cards()[0])
    expect(card.getAllByText(/الاسم الكامل/).length).toBeGreaterThan(0)
    expect(card.getByText('إلزامي')).toBeTruthy()
    expect(card.getByPlaceholderText('مثال: سارة')).toBeTruthy()
    expect(card.getByText('كما في الهوية')).toBeTruthy()
  })

  it('options are edited as a list: add, rename, reorder, remove — and the canvas follows', async () => {
    mount()
    await pick(2)
    const panel = within(screen.getByTestId('builder-properties'))

    await userEvent.click(panel.getByRole('button', { name: 'إضافة خيار' }))
    const third = panel.getByLabelText('الخيار 3')
    await userEvent.clear(third)
    await userEvent.type(third, 'الدمام')
    await userEvent.click(panel.getByRole('button', { name: 'نقل الخيار 3 للأعلى' }))
    await userEvent.click(panel.getByRole('button', { name: 'حذف الخيار 1' }))

    const options = within(cards()[2]).getAllByRole('radio').map((r) => r.closest('label')?.textContent)
    expect(options).toEqual(['الدمام', 'الرياض'])
  })

  it('type-specific settings appear only for the types that have them', async () => {
    mount(baseForm([q(1, 'نص'), q(2, 'رقم', 'number'), q(3, 'نجوم', 'star_rating'), q(4, 'مقياس', 'linear_scale', { config: { scale: { min: 1, max: 5 } } }), q(5, 'خيارات', 'checkbox', { options: ['أ', 'ب'] })]))
    const panel = () => within(screen.getByTestId('builder-properties'))

    await pick(0)
    expect(panel().getByLabelText('أقل عدد أحرف')).toBeTruthy()
    expect(panel().queryByLabelText('الحد الأدنى')).toBeNull()
    await pick(1)
    expect(panel().getByLabelText('الحد الأدنى')).toBeTruthy()
    expect(panel().getByRole('switch', { name: 'أرقام صحيحة فقط' })).toBeTruthy()
    await pick(2)
    expect(panel().getByLabelText('عدد النجوم')).toBeTruthy()
    await pick(3)
    expect(panel().getByLabelText('عنوان البداية')).toBeTruthy()
    await pick(4)
    expect(panel().getByLabelText('أقل عدد اختيارات')).toBeTruthy()
  })

  it('star count and scale labels are reflected on the canvas', async () => {
    mount(baseForm([q(1, 'نجوم', 'star_rating', { config: { scale: { max: 5 } } }), q(2, 'مقياس', 'linear_scale', { config: { scale: { min: 1, max: 5 } } })]))
    await pick(0)
    await userEvent.selectOptions(within(screen.getByTestId('builder-properties')).getByLabelText('عدد النجوم'), '8')
    expect(within(cards()[0]).getAllByRole('radio')).toHaveLength(8)

    await pick(1)
    await userEvent.type(within(screen.getByTestId('builder-properties')).getByLabelText('عنوان البداية'), 'ضعيف')
    expect(within(cards()[1]).getByText('ضعيف')).toBeTruthy()
  })

  it('a block with answers cannot change type, and says why', async () => {
    mount(baseForm([q(1, 'الاسم', 'text', { has_answers: true }), q(2, 'جديد', 'text')]))
    await pick(0)
    expect(within(screen.getByTestId('builder-properties')).getByLabelText(/نوع الحقل/)).toBeDisabled()
    expect(within(cards()[0]).getByText('لديه إجابات')).toBeTruthy()

    await pick(1)
    const select = within(screen.getByTestId('builder-properties')).getByLabelText(/نوع الحقل/)
    expect(select).toBeEnabled()
    await userEvent.selectOptions(select, 'email')
    expect(labels()).toEqual(['text', 'email'])
  })

  it('a heading has no required switch, a description block is just text, a page break shows its line', async () => {
    mount(baseForm([q(1, 'قسم', 'section'), q(2, '', 'description', { description: 'اقرأ بعناية' }), q(3, '', 'page_break')]))
    await pick(0)
    expect(within(screen.getByTestId('builder-properties')).queryByRole('switch')).toBeNull()
    expect(within(cards()[1]).getByText('اقرأ بعناية')).toBeTruthy()
    expect(within(cards()[2]).getByTestId('page-break-line')).toBeTruthy()
  })
})

describe('moving, duplicating and deleting', () => {
  it('buttons move a block up and down, and the edges are disabled', async () => {
    mount()
    await pick(1)
    await userEvent.click(within(cards()[1]).getByRole('button', { name: 'نقل للأعلى' }))
    expect(labels()).toEqual(['email', 'text', 'radio'])
    expect(within(cards()[0]).getByRole('button', { name: 'نقل للأعلى' })).toBeDisabled()

    await userEvent.click(within(cards()[0]).getByRole('button', { name: 'نقل للأسفل' }))
    await userEvent.click(within(cards()[1]).getByRole('button', { name: 'نقل للأسفل' }))
    expect(labels()).toEqual(['text', 'radio', 'email'])
    expect(within(cards()[2]).getByRole('button', { name: 'نقل للأسفل' })).toBeDisabled()
  })

  it('the keyboard moves the focused block (Alt + arrows) and selects it (Enter)', async () => {
    mount()
    cards()[0].querySelector<HTMLElement>('[role="group"]')!.focus()
    await userEvent.keyboard('{Enter}')
    expect(cards()[0]).toHaveAttribute('data-selected', 'true')

    await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}')
    expect(labels()).toEqual(['email', 'text', 'radio'])
  })

  it('every block has a drag handle with a name, for the pointer and the keyboard', () => {
    mount()
    const handles = screen.getAllByTestId('drag-handle')
    expect(handles).toHaveLength(3)
    expect(handles[0]).toHaveAccessibleName(/اسحب لإعادة ترتيب/)
    expect(handles[0]).toHaveAttribute('aria-roledescription')
  })

  it('duplicates a block right after itself as a new unsaved block', async () => {
    const server = fakeServer(baseForm())
    mount()
    await pick(2)
    await userEvent.click(within(cards()[2]).getByRole('button', { name: 'تكرار' }))

    expect(labels()).toEqual(['text', 'email', 'radio', 'radio'])
    expect(within(cards()[3]).getAllByText(/المدينة \(نسخة\)/).length).toBeGreaterThan(0)
    expect(cards()[3]).toHaveAttribute('data-selected', 'true')

    await userEvent.click(screen.getByRole('button', { name: 'حفظ الآن' }))
    await waitFor(() => expect(server.puts).toHaveLength(1))
    const sent = server.puts[0].questions as { id: number; options: string[] }[]
    expect(sent.map((s) => s.id > 0)).toEqual([true, true, true, false])
    expect(sent[3].options).toEqual(['جدة', 'الرياض'])
  })

  it('deleting says what happened, offers undo, and undo brings the block back where it was', async () => {
    mount()
    await pick(1)
    await userEvent.click(within(cards()[1]).getByRole('button', { name: 'حذف' }))

    expect(labels()).toEqual(['text', 'radio'])
    const notice = screen.getByText(/تم حذف العنصر/)
    await userEvent.click(within(notice.closest('p')!).getByRole('button', { name: 'تراجع' }))
    expect(labels()).toEqual(['text', 'email', 'radio'])
  })

  it('a block with answers says its answers stay readable when it is deleted', async () => {
    mount(baseForm([q(1, 'الاسم', 'text', { has_answers: true })]))
    await pick(0)
    await userEvent.click(within(cards()[0]).getByRole('button', { name: 'حذف' }))
    expect(screen.getByText(/تبقى الإجابات المسجّلة ظاهرة/)).toBeTruthy()
  })
})

describe('sections', () => {
  const sectioned = () => baseForm([q(1, 'بداية'), q(2, 'القسم أ', 'section'), q(3, 'سؤال أ1'), q(4, 'سؤال أ2'), q(5, 'القسم ب', 'section'), q(6, 'سؤال ب1')])

  it('a block can be moved into another section from its own menu', async () => {
    mount(sectioned())
    await pick(0)
    await userEvent.selectOptions(within(cards()[0]).getByLabelText('نقل إلى قسم'), 'القسم ب')

    expect(cards().map((c) => c.getAttribute('data-block-type'))).toEqual(['section', 'text', 'text', 'section', 'text', 'text'])
    expect(within(cards()[5]).getAllByText(/بداية/).length).toBeGreaterThan(0)
  })

  it('moving a section moves what is inside it, and duplicating copies all of it', async () => {
    mount(sectioned())
    await pick(4)
    await userEvent.click(within(cards()[4]).getByRole('button', { name: 'نقل للأعلى' }))
    expect(cards().map((c) => within(c).queryAllByText(/القسم ب|سؤال ب1|القسم أ/).length > 0 ? c.getAttribute('data-block-type') : '-')).toBeDefined()
    const order = cards().map((c) => c.getAttribute('aria-label') ?? c.querySelector('[role="group"]')?.getAttribute('aria-label'))
    expect(order[1]).toContain('القسم ب')
    expect(order[2]).toContain('سؤال ب1')
    expect(order[3]).toContain('القسم أ')

    await pick(1)
    await userEvent.click(within(cards()[1]).getByRole('button', { name: 'تكرار القسم' }))
    expect(cards()).toHaveLength(8)
    expect(cards()[3].querySelector('[role="group"]')!.getAttribute('aria-label')).toContain('القسم ب (نسخة)')
  })

  it('deleting a section says how much went with it, and one undo restores all of it', async () => {
    mount(sectioned())
    await pick(1)
    await userEvent.click(within(cards()[1]).getByRole('button', { name: 'حذف القسم' }))

    expect(cards()).toHaveLength(3)
    expect(screen.getByText(/القسم و2 عناصر بداخله/)).toBeTruthy()
    await userEvent.click(within(screen.getByText(/القسم و2 عناصر بداخله/).closest('p')!).getByRole('button', { name: 'تراجع' }))
    expect(cards()).toHaveLength(6)
  })
})

describe('undo and redo from the toolbar and the keyboard', () => {
  it('walks back and forward through edits, and the buttons know when there is nothing to do', async () => {
    mount()
    const undo = screen.getByRole('button', { name: 'تراجع' })
    const redo = screen.getByRole('button', { name: 'إعادة' })
    expect(undo).toBeDisabled()
    expect(redo).toBeDisabled()

    await userEvent.click(screen.getByTestId('library-url'))
    await userEvent.click(screen.getByTestId('library-date'))
    expect(labels()).toEqual(['text', 'email', 'radio', 'url', 'date'])

    await userEvent.click(undo)
    expect(labels()).toEqual(['text', 'email', 'radio', 'url'])
    expect(redo).toBeEnabled()
    await userEvent.click(redo)
    expect(labels()).toEqual(['text', 'email', 'radio', 'url', 'date'])

    await userEvent.keyboard('{Control>}z{/Control}')
    expect(labels()).toHaveLength(4)
    await userEvent.keyboard('{Control>}{Shift>}z{/Shift}{/Control}')
    expect(labels()).toHaveLength(5)
  })

  it('does not hijack Ctrl+Z while typing in a field', async () => {
    mount()
    await userEvent.click(screen.getByTestId('library-url'))
    await userEvent.click(screen.getByLabelText('عنوان النموذج'))
    await userEvent.keyboard('{Control>}z{/Control}')
    expect(labels()).toHaveLength(4)
  })
})

describe('saving', () => {
  it('shows "saved" only after the server accepted exactly what is on screen', async () => {
    const server = fakeServer(baseForm())
    mount()
    expect(screen.getByTestId('save-indicator')).toHaveAttribute('data-status', 'saved')

    await userEvent.click(screen.getByTestId('library-email'))
    expect(screen.getByTestId('save-indicator')).toHaveAttribute('data-status', 'dirty')
    expect(screen.getByTestId('save-indicator')).toHaveTextContent('تغييرات غير محفوظة')

    await userEvent.click(screen.getByRole('button', { name: 'حفظ الآن' }))
    await waitFor(() => expect(screen.getByTestId('save-indicator')).toHaveAttribute('data-status', 'saved'))
    expect(server.puts[0]).toMatchObject({ base_revision: 3, title: 'استبيان' })
    expect(screen.getByTestId('save-indicator')).toHaveTextContent('تم الحفظ')
  })

  it('stores a change by itself after a quiet moment, and not before', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const server = fakeServer(baseForm())
      mount()
      await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(screen.getByTestId('library-email'))

      await act(async () => { await vi.advanceTimersByTimeAsync(800) })
      expect(server.puts).toHaveLength(0)
      await act(async () => { await vi.advanceTimersByTimeAsync(1500) })
      expect(server.puts).toHaveLength(1)
      await waitFor(() => expect(screen.getByTestId('save-indicator')).toHaveAttribute('data-status', 'saved'))
    } finally {
      vi.useRealTimers()
    }
  })

  it('a burst of typing is one save, not one per keystroke', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const server = fakeServer(baseForm())
      mount()
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      await user.type(screen.getByLabelText('عنوان النموذج'), ' جديد')
      await act(async () => { await vi.advanceTimersByTimeAsync(2000) })

      expect(server.puts).toHaveLength(1)
      expect(server.puts[0].title).toBe('استبيان جديد')
    } finally {
      vi.useRealTimers()
    }
  })

  it('blocks that were just added get their stored ids, so the next save updates them instead of adding them again', async () => {
    const server = fakeServer(baseForm())
    mount()
    await userEvent.click(screen.getByTestId('library-url'))
    await userEvent.click(screen.getByRole('button', { name: 'حفظ الآن' }))
    await waitFor(() => expect(screen.getByTestId('save-indicator')).toHaveAttribute('data-status', 'saved'))
    const firstIds = (server.puts[0].questions as { id: number }[]).map((x) => x.id)
    expect(firstIds.at(-1)).toBeUndefined() // a new block is sent without an id

    await userEvent.type(screen.getByLabelText('عنوان النموذج'), '!')
    await userEvent.click(screen.getByRole('button', { name: 'حفظ الآن' }))
    await waitFor(() => expect(server.puts).toHaveLength(2))
    const secondIds = (server.puts[1].questions as { id: number }[]).map((x) => x.id)
    expect(secondIds).toEqual([1, 2, 3, 100])
    expect(server.puts[1].base_revision).toBe(4)
  })

  it('undoing back to the saved state is "saved" again — nothing needs storing', async () => {
    fakeServer(baseForm())
    mount()
    await userEvent.click(screen.getByTestId('library-url'))
    expect(screen.getByTestId('save-indicator')).toHaveAttribute('data-status', 'dirty')
    await userEvent.click(screen.getByRole('button', { name: 'تراجع' }))
    expect(screen.getByTestId('save-indicator')).toHaveAttribute('data-status', 'saved')
    expect(api.put).not.toHaveBeenCalled()
  })

  it('does not send a block the server would refuse, and says which one to fix', async () => {
    fakeServer(baseForm())
    mount()
    await pick(0)
    await userEvent.clear(within(screen.getByTestId('builder-properties')).getByDisplayValue('الاسم'))

    expect(screen.getByTestId('save-indicator')).toHaveAttribute('data-status', 'invalid')
    expect(within(cards()[0]).getByTestId('block-issue')).toHaveTextContent('اكتب نص السؤال.')
    await userEvent.click(screen.getByRole('button', { name: 'حفظ الآن' }))
    expect(api.put).not.toHaveBeenCalled()
  })

  it('a document the server would refuse is not autosaved either, however long it waits', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const server = fakeServer(baseForm())
      mount()
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      await pick(0)
      await user.clear(within(screen.getByTestId('builder-properties')).getByDisplayValue('الاسم'))
      await act(async () => { await vi.advanceTimersByTimeAsync(10000) })

      expect(server.puts).toHaveLength(0)
      expect(screen.getByTestId('save-indicator')).toHaveAttribute('data-status', 'invalid')
    } finally {
      vi.useRealTimers()
    }
  })

  it('closing the editor after a failed save tries once more to store what is still unsaved', async () => {
    const server = fakeServer(baseForm())
    server.failNext.push(httpError(500, {}))
    const view = mount()
    await userEvent.click(screen.getByTestId('library-url'))
    await userEvent.click(screen.getByRole('button', { name: 'حفظ الآن' }))
    await screen.findByTestId('save-error')
    expect(server.puts).toHaveLength(1)

    view.unmount()

    await waitFor(() => expect(server.puts).toHaveLength(2))
  })

  it('an empty title is held back and marked', async () => {
    fakeServer(baseForm())
    mount()
    await userEvent.clear(screen.getByLabelText('عنوان النموذج'))

    expect(screen.getByTestId('save-indicator')).toHaveAttribute('data-status', 'invalid')
    expect(screen.getByText('عنوان النموذج مطلوب.')).toBeTruthy()
  })

  it('a failed save is reported, never called saved, keeps the work, and a retry that succeeds clears it', async () => {
    const server = fakeServer(baseForm())
    server.failNext.push(httpError(500, {}))
    mount()
    await userEvent.click(screen.getByTestId('library-url'))

    await userEvent.click(screen.getByRole('button', { name: 'حفظ الآن' }))

    expect(await screen.findByTestId('save-error')).toHaveTextContent('لم يُحفظ شيء')
    expect(screen.getByTestId('save-error')).toHaveTextContent('تعديلاتك ما زالت أمامك')
    expect(screen.getByTestId('save-indicator')).toHaveAttribute('data-status', 'error')
    expect(labels()).toHaveLength(4)

    await userEvent.click(within(screen.getByTestId('save-indicator')).getByRole('button', { name: 'إعادة المحاولة' }))
    await waitFor(() => expect(screen.getByTestId('save-indicator')).toHaveAttribute('data-status', 'saved'))
    expect(screen.queryByTestId('save-error')).toBeNull()
  })

  it('a lost connection is retried by itself', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const server = fakeServer(baseForm())
      server.failNext.push(new Error('Network Error'))
      mount()
      await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(screen.getByTestId('library-url'))
      await act(async () => { await vi.advanceTimersByTimeAsync(1600) })
      expect(screen.getByTestId('save-indicator')).toHaveAttribute('data-status', 'error')

      await act(async () => { await vi.advanceTimersByTimeAsync(4500) })
      await waitFor(() => expect(screen.getByTestId('save-indicator')).toHaveAttribute('data-status', 'saved'))
      expect(server.puts).toHaveLength(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('a refusal is not retried by itself, and a validation message lands on the right block', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const server = fakeServer(baseForm())
      server.failNext.push(httpError(422, { errors: { 'questions.1.label': ['نص السؤال مطلوب.'] } }))
      mount()
      await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(screen.getByTestId('library-url'))
      await act(async () => { await vi.advanceTimersByTimeAsync(1600) })
      expect(await screen.findByTestId('save-error')).toBeTruthy()
      expect(within(cards()[1]).getByTestId('block-issue')).toHaveTextContent('نص السؤال مطلوب.')

      await act(async () => { await vi.advanceTimersByTimeAsync(60000) })
      expect(server.puts).toHaveLength(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('reports the status to the page so publishing can wait for unsaved edits', async () => {
    fakeServer(baseForm())
    const onStatus = vi.fn()
    mount(baseForm(), { onStatusChange: onStatus })
    await userEvent.click(screen.getByTestId('library-url'))
    await userEvent.click(screen.getByRole('button', { name: 'حفظ الآن' }))
    await waitFor(() => expect(onStatus).toHaveBeenLastCalledWith('saved'))
    expect(onStatus.mock.calls.map((c) => c[0])).toEqual(expect.arrayContaining(['saved', 'dirty', 'saving']))
  })
})

describe('two people editing', () => {
  it('a stale save is refused, nothing is overwritten silently, and the editor chooses', async () => {
    const server = fakeServer(baseForm())
    const onSaved = vi.fn()
    mount(baseForm(), { onFormSaved: onSaved })
    server.revision = 4 // somebody else saved
    server.saved = { ...server.saved, draft_revision: 4, title: 'عنوان الزميل', last_editor: { id: 2, name: 'نورة' } }

    await userEvent.click(screen.getByTestId('library-url'))
    await userEvent.click(screen.getByRole('button', { name: 'حفظ الآن' }))

    const banner = await screen.findByTestId('conflict-banner')
    expect(banner).toHaveTextContent('عدّل نورة هذه المسودة')
    expect(banner).toHaveTextContent('لم يُحفظ شيء')
    expect(screen.getByTestId('save-indicator')).toHaveAttribute('data-status', 'conflict')
    expect(onSaved).not.toHaveBeenCalled()
    expect(labels()).toHaveLength(4)
    expect(server.saved.title).toBe('عنوان الزميل')
  })

  it('"load the latest" asks first, then replaces the draft with the other person\'s and starts clean', async () => {
    const server = fakeServer(baseForm())
    const onSaved = vi.fn()
    mount(baseForm(), { onFormSaved: onSaved })
    server.revision = 4
    server.saved = { ...server.saved, draft_revision: 4, title: 'عنوان الزميل', questions: [q(1, 'سؤال الزميل')] }
    await userEvent.click(screen.getByTestId('library-url'))
    await userEvent.click(screen.getByRole('button', { name: 'حفظ الآن' }))
    await screen.findByTestId('conflict-banner')

    await userEvent.click(screen.getByRole('button', { name: 'تحميل آخر نسخة' }))
    expect(labels()).toHaveLength(4) // not yet: it asks first
    await userEvent.click(screen.getByRole('button', { name: /تأكيد: تجاهل تعديلاتي/ }))

    expect(labels()).toEqual(['text'])
    expect(screen.getByLabelText('عنوان النموذج')).toHaveValue('عنوان الزميل')
    expect(screen.queryByTestId('conflict-banner')).toBeNull()
    expect(screen.getByTestId('save-indicator')).toHaveAttribute('data-status', 'saved')
    expect(screen.getByRole('button', { name: 'تراجع' })).toBeDisabled()
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ title: 'عنوان الزميل' }))
  })

  it('"save mine over theirs" asks first, then sends the explicit overwrite', async () => {
    const server = fakeServer(baseForm())
    mount()
    server.revision = 4
    server.saved = { ...server.saved, draft_revision: 4, questions: [q(1, 'سؤال الزميل')] }
    await userEvent.click(screen.getByTestId('library-url'))
    await userEvent.click(screen.getByRole('button', { name: 'حفظ الآن' }))
    await screen.findByTestId('conflict-banner')

    await userEvent.click(screen.getByRole('button', { name: 'حفظ نسختي فوقها' }))
    expect(server.puts).toHaveLength(1)
    await userEvent.click(screen.getByRole('button', { name: /تأكيد: استبدال عمل الآخر/ }))

    await waitFor(() => expect(screen.getByTestId('save-indicator')).toHaveAttribute('data-status', 'saved'))
    expect(server.puts[1]).toMatchObject({ force: true, base_revision: 4 })
    expect((server.puts[1].questions as unknown[]).length).toBe(4)
  })

  it('nothing is saved while a conflict is open, even after more edits', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const server = fakeServer(baseForm())
      mount()
      server.revision = 9
      await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(screen.getByTestId('library-url'))
      await act(async () => { await vi.advanceTimersByTimeAsync(1600) })
      await screen.findByTestId('conflict-banner')
      await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(screen.getByTestId('library-date'))
      await act(async () => { await vi.advanceTimersByTimeAsync(10000) })
      expect(server.puts).toHaveLength(1)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('the live preview', () => {
  it('draws the unsaved document with the real form, validates, pages, and sends nothing', async () => {
    mount(baseForm([q(1, 'الاسم', 'text', { required: true }), q(2, '', 'page_break'), q(3, 'التقييم', 'star_rating', { required: true })]))
    await userEvent.click(screen.getByTestId('library-url'))
    await userEvent.click(screen.getByTestId('open-builder-preview'))

    const dialog = await screen.findByTestId('builder-preview-modal')
    const form = within(dialog)
    expect(form.getByText(/معاينة: هكذا سيراها المجيبون/)).toBeTruthy()
    expect(form.getByText('الصفحة 1 من 2')).toBeTruthy()

    await userEvent.click(form.getByRole('button', { name: 'التالي' }))
    expect(form.getByText('هذا الحقل مطلوب.')).toBeTruthy()
    await userEvent.type(form.getByLabelText(/الاسم/), 'سارة')
    await userEvent.click(form.getByRole('button', { name: 'التالي' }))
    expect(form.getByText('الصفحة 2 من 2')).toBeTruthy()

    await userEvent.click(form.getByRole('button', { name: 'إرسال (معاينة)' }))
    expect(form.getByText('هذا الحقل مطلوب.')).toBeTruthy()
    await userEvent.click(form.getByLabelText('4 من 5'))
    await userEvent.click(form.getByRole('button', { name: 'إرسال (معاينة)' }))
    expect(await form.findByText(/لم يُرسل شيء/)).toBeTruthy()

    expect(api.post).not.toHaveBeenCalled()
    expect(api.put).not.toHaveBeenCalled()
  })

  it('switches between a desktop and a phone width', async () => {
    mount()
    await userEvent.click(screen.getByTestId('open-builder-preview'))
    const frame = await screen.findByTestId('preview-frame')
    expect(frame).toHaveAttribute('data-device', 'desktop')
    await userEvent.click(screen.getByRole('button', { name: 'الجوال' }))
    expect(frame).toHaveAttribute('data-device', 'mobile')
    expect(frame.className).toContain('375')
  })
})

describe('a person who may not edit', () => {
  it('can read and preview the form but is offered nothing that changes it', async () => {
    mount(baseForm(), { readOnly: true })

    expect(screen.queryByTestId('builder-library')).toBeNull()
    expect(screen.queryByRole('button', { name: 'حفظ الآن' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'تراجع' })).toBeNull()
    expect(screen.queryByTestId('add-block')).toBeNull()
    expect(screen.queryByTestId('drag-handle')).toBeNull()
    expect(screen.getByLabelText('عنوان النموذج')).toHaveAttribute('readonly')
    expect(screen.getByText(/وضع العرض فقط/)).toBeTruthy()

    await pick(0)
    expect(within(cards()[0]).queryByRole('toolbar')).toBeNull()
    expect(within(screen.getByTestId('builder-properties')).getByDisplayValue('الاسم')).toBeDisabled()

    await userEvent.click(screen.getByTestId('open-builder-preview'))
    expect(await screen.findByTestId('builder-preview-modal')).toBeTruthy()
    expect(api.put).not.toHaveBeenCalled()
  })
})

describe('leaving the page', () => {
  afterEach(() => vi.restoreAllMocks())

  it('warns before a hard leave while changes are unsaved, and not when everything is saved', async () => {
    fakeServer(baseForm())
    mount()
    const leave = () => {
      const event = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(event)

      return event.defaultPrevented
    }
    expect(leave()).toBe(false)
    await userEvent.click(screen.getByTestId('library-url'))
    expect(leave()).toBe(true)
    await userEvent.click(screen.getByRole('button', { name: 'حفظ الآن' }))
    await waitFor(() => expect(screen.getByTestId('save-indicator')).toHaveAttribute('data-status', 'saved'))
    expect(leave()).toBe(false)
  })

  it('stores pending changes when the editor is closed', async () => {
    const server = fakeServer(baseForm())
    const view = mount()
    await userEvent.click(screen.getByTestId('library-url'))
    view.unmount()
    await waitFor(() => expect(server.puts).toHaveLength(1))
  })

  it('stores pending changes when the tab is hidden', async () => {
    const server = fakeServer(baseForm())
    mount()
    await userEvent.click(screen.getByTestId('library-url'))
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
    fireEvent(document, new Event('visibilitychange'))
    await waitFor(() => expect(server.puts).toHaveLength(1))
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
  })
})

describe('every type in the registry is usable', () => {
  it('each library block renders on the canvas with its own label and has properties', async () => {
    mount(baseForm([]))
    for (const type of LIBRARY_TYPES) {
      await userEvent.click(screen.getByTestId(`library-${type}`))
      const panel = screen.getByTestId('builder-properties')
      expect(within(panel).getByRole('heading', { level: 3 }).textContent, type).toBe(TYPE_SPECS[type].label)
    }
  })
})
