import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import apiClient from '@/api/axios'
import FormBuilderEditor from '@/components/operations/formBuilder/FormBuilderEditor'
import { operatorsFor } from '@/components/operations/formBuilder/formLogic'
import type { FormQuestion, OpsFormDefinition, QuestionLogic, QuestionType } from '@/types/operations'

/**
 * The builder's Logic and Steps panels as a person uses them: writing a rule without code, only seeing operators that fit the
 * question, reading the rule back in Arabic, warnings for rules that cannot be published, undo, autosave and the review step.
 * Requests go to a mocked client that behaves like the server for drafts, including pointing a rule at the rows it creates.
 */

vi.mock('@/api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))
const api = vi.mocked(apiClient, true)

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open') }
})

const q = (id: number, label: string, type: QuestionType = 'text', extra: Partial<FormQuestion> = {}): FormQuestion => ({ id, label, type, required: false, sort_order: id, ...extra })
const rule = (question: number, operator: QuestionLogic['conditions'][number]['operator'], value?: string | number | string[], action: QuestionLogic['action'] = 'show'): QuestionLogic => ({
  action,
  match: 'all',
  conditions: [{ question, operator, ...(value !== undefined ? { value } : {}) }],
})

const baseForm = (questions: FormQuestion[] = [q(1, 'هل أنت موظف؟', 'yes_no'), q(2, 'اسم الشركة'), q(3, 'العمر', 'number'), q(4, 'ولي الأمر')], flow: OpsFormDefinition['flow'] = null): OpsFormDefinition => ({
  id: 9,
  title: 'استبيان',
  description: 'وصف',
  slug: 'survey',
  form_type: 'suggestion',
  status: 'draft',
  draft_revision: 3,
  questions,
  flow,
  created_at: '2026-10-19',
})

type Sent = { id?: number; ref?: number; type: string; label: string; logic?: QuestionLogic | null }

/** Stores what it is sent. A question without an id becomes row 100+; a rule that names an unsaved question by its `ref` is pointed at that row. */
function fakeServer(initial: OpsFormDefinition) {
  const server = { revision: initial.draft_revision ?? 0, saved: initial, puts: [] as Record<string, unknown>[], nextId: 100 }
  api.put.mockImplementation((async (_url: string, body: Record<string, unknown>) => {
    server.puts.push(body)
    const sent = body.questions as Sent[]
    const idOf = new Map<number, number>()
    const rows = sent.map((item) => {
      const id = item.id ?? server.nextId++
      if (item.ref !== undefined) idOf.set(item.ref, id)

      return { item, id }
    })
    const questions = rows.map(({ item, id }, i) => ({
      ...item,
      id,
      required: false,
      sort_order: i + 1,
      logic: item.logic ? { ...item.logic, conditions: item.logic.conditions.map((c) => ({ ...c, question: idOf.get(c.question) ?? c.question })) } : null,
    }))
    server.revision += 1
    server.saved = { ...server.saved, title: body.title as string, questions: questions as unknown as FormQuestion[], flow: (body.flow as OpsFormDefinition['flow']) ?? null, draft_revision: server.revision }

    return { data: { success: true, data: server.saved } }
  }) as never)

  return server
}

const cards = () => screen.getAllByTestId('block-card')
const pick = (i: number) => userEvent.click(cards()[i].querySelector<HTMLElement>('[role="group"]')!)
const mount = (form = baseForm(), props: Partial<React.ComponentProps<typeof FormBuilderEditor>> = {}) => render(<FormBuilderEditor form={form} {...props} />)
// The Logic tab carries a warning count in its name when a rule cannot be published, so the name is matched from its start.
const side = (name: 'الخصائص' | 'المنطق' | 'الخطوات') => userEvent.click(within(screen.getByRole('tablist', { name: 'لوحة الإعدادات' })).getByRole('tab', { name: new RegExp(`^${name}`) }))
const optionValues = (select: HTMLElement) => within(select).getAllByRole('option').map((o) => (o as HTMLOptionElement).value)
const saveNow = () => userEvent.click(screen.getByRole('button', { name: 'حفظ الآن' }))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('the Logic panel', () => {
  it('is one of three tabs of the right column, and nothing about rules shows until it is opened', async () => {
    mount()
    const tabs = within(screen.getByRole('tablist', { name: 'لوحة الإعدادات' })).getAllByRole('tab')

    expect(tabs.map((t) => t.textContent?.replace(/\d+$/, ''))).toEqual(['الخصائص', 'المنطق', 'الخطوات'])
    expect(screen.queryByTestId('logic-panel')).toBeNull()
    await side('المنطق')
    expect(screen.getByTestId('logic-panel')).toBeTruthy()
    expect(screen.getByText('لا توجد شروط بعد. كل عناصر النموذج تظهر دائماً.')).toBeTruthy()
  })

  it('says, for an item with no rule, that it always shows, and offers to add one', async () => {
    mount()
    await pick(1)
    await side('المنطق')

    expect(screen.getByText(/يظهر دائماً/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'إضافة شرط ظهور' })).toBeTruthy()
  })

  it('the first question has nothing before it, so it cannot be given a rule', async () => {
    mount()
    await pick(0)
    await side('المنطق')

    expect(screen.queryByRole('button', { name: 'إضافة شرط ظهور' })).toBeNull()
    expect(screen.getByRole('note')).toHaveTextContent('لا يوجد سؤال قبل هذا السؤال')
  })

  it('writes a rule with no code: pick the question, the comparison and the value, and read it back in Arabic', async () => {
    mount()
    await pick(1)
    await side('المنطق')
    await userEvent.click(screen.getByRole('button', { name: 'إضافة شرط ظهور' }))

    expect(screen.getByTestId('rule-sentence')).toHaveTextContent('يظهر هذا السؤال فقط إذا كانت إجابة «هل أنت موظف؟» تساوي «نعم».')
    await userEvent.selectOptions(screen.getByLabelText('قيمة الشرط 1'), 'no')
    expect(screen.getByTestId('rule-sentence')).toHaveTextContent('تساوي «لا»')

    await userEvent.selectOptions(screen.getByLabelText('نوع الشرط'), 'hide')
    expect(screen.getByTestId('rule-sentence')).toHaveTextContent('يُخفى هذا السؤال إذا')
    expect(within(cards()[1]).getByTestId('rule-badge')).toBeTruthy()
    expect(within(cards()[0]).getByTestId('source-badge')).toHaveTextContent('مصدر لـ 1 شرط')
  })

  it('offers only the earlier questions as the source, and only the operators that fit its type', async () => {
    mount()
    await pick(3)
    await side('المنطق')
    await userEvent.click(screen.getByRole('button', { name: 'إضافة شرط ظهور' }))

    const source = screen.getByLabelText('السؤال المصدر 1')
    expect(within(source).getAllByRole('option')).toHaveLength(3)
    expect(optionValues(screen.getByLabelText('المشغّل 1'))).toEqual(operatorsFor('yes_no'))

    await userEvent.selectOptions(source, within(source).getByRole('option', { name: /العمر/ }))
    expect(optionValues(screen.getByLabelText('المشغّل 1'))).toEqual(operatorsFor('number'))
    expect(optionValues(screen.getByLabelText('المشغّل 1'))).toContain('gte')
    expect(screen.getByLabelText('قيمة الشرط 1')).toHaveAttribute('type', 'number')

    await userEvent.selectOptions(source, within(source).getByRole('option', { name: /اسم الشركة/ }))
    expect(optionValues(screen.getByLabelText('المشغّل 1'))).toEqual(operatorsFor('text'))
    expect(optionValues(screen.getByLabelText('المشغّل 1'))).not.toContain('gte')
  })

  it('a choice question gives a list of its own options as the value, and "one of" gives a checklist', async () => {
    mount(baseForm([q(1, 'المدينة', 'radio', { options: ['جدة', 'الرياض'] }), q(2, 'الحي')]))
    await pick(1)
    await side('المنطق')
    await userEvent.click(screen.getByRole('button', { name: 'إضافة شرط ظهور' }))

    expect(optionValues(screen.getByLabelText('قيمة الشرط 1'))).toEqual(['', 'جدة', 'الرياض'])
    await userEvent.selectOptions(screen.getByLabelText('المشغّل 1'), 'any_of')
    const list = screen.getByRole('group', { name: 'قيمة الشرط 1' })
    expect(within(list).getAllByRole('checkbox')).toHaveLength(2)
    await userEvent.click(within(list).getByRole('checkbox', { name: 'الرياض' }))
    expect(screen.getByTestId('rule-sentence')).toHaveTextContent('الرياض')
  })

  it('combines several conditions with all / any, and removes one or all of them', async () => {
    mount()
    await pick(3)
    await side('المنطق')
    await userEvent.click(screen.getByRole('button', { name: 'إضافة شرط ظهور' }))
    expect(screen.queryByLabelText('طريقة الجمع')).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'إضافة شرط آخر' }))
    expect(screen.getAllByTestId('condition')).toHaveLength(2)
    await userEvent.selectOptions(screen.getByLabelText('طريقة الجمع'), 'any')
    expect(screen.getByTestId('rule-sentence')).toHaveTextContent('تحقق أي شرط من الشروط التالية')
    await userEvent.selectOptions(screen.getByLabelText('طريقة الجمع'), 'all')
    expect(screen.getByTestId('rule-sentence')).toHaveTextContent('تحققت كل الشروط التالية')

    await userEvent.click(screen.getByRole('button', { name: 'حذف الشرط 2' }))
    expect(screen.getAllByTestId('condition')).toHaveLength(1)
    await userEvent.click(screen.getByRole('button', { name: 'إزالة الشرط' }))
    expect(screen.queryByTestId('rule-sentence')).toBeNull()
    expect(within(cards()[3]).queryByTestId('rule-badge')).toBeNull()
  })

  it('states what happens when the source is not answered, in the editor', async () => {
    mount(baseForm([q(1, 'هل أنت موظف؟', 'yes_no'), q(2, 'اسم الشركة', 'text', { logic: rule(1, 'equals', 'yes') })]))
    await pick(1)
    await side('المنطق')

    expect(screen.getByTestId('logic-editor')).toHaveTextContent('إذا لم يُجب المجيب على السؤال المصدر (أو كان مخفياً) فالشرط لا يتحقق، إلا شرط «بلا إجابة»')
  })

  it('warns, and says why, when a rule reads a later question — and the warning clears when it is moved back', async () => {
    mount(baseForm([q(1, 'هل أنت موظف؟', 'yes_no'), q(2, 'اسم الشركة', 'text', { logic: rule(1, 'equals', 'yes') })]))
    await pick(0)
    await userEvent.click(within(cards()[0]).getByRole('button', { name: 'نقل للأسفل' }))
    await side('المنطق')

    expect(screen.getByTestId('logic-warnings')).toHaveTextContent('لا يمكن نشر النموذج')
    expect(within(screen.getByRole('tablist', { name: 'لوحة الإعدادات' })).getByRole('tab', { name: /المنطق/ })).toHaveTextContent('1')
    expect(within(cards()[0]).getByTestId('rule-badge')).toHaveClass('bg-amber-50')

    await userEvent.click(screen.getByRole('button', { name: 'تراجع' }))
    expect(screen.queryByTestId('logic-warnings')).toBeNull()
  })

  it('shows every rule in an overview with what it depends on, and a source that has none of its own', async () => {
    mount(baseForm([q(1, 'هل أنت موظف؟', 'yes_no'), q(2, 'اسم الشركة', 'text', { logic: rule(1, 'equals', 'yes') })]))
    await side('المنطق')
    const overview = screen.getByTestId('rules-overview')

    expect(within(overview).getByText('يعتمد على: هل أنت موظف؟')).toBeTruthy()
    expect(within(overview).getByText(/مصدر لـ 1 شرط/)).toBeTruthy()
    await userEvent.click(within(overview).getByRole('button', { name: /اسم الشركة/ }))
    expect(cards()[1]).toHaveAttribute('data-selected', 'true')
  })

  it('lets the author try answer paths and see which items appear', async () => {
    mount(baseForm([q(1, 'هل أنت موظف؟', 'yes_no'), q(2, 'اسم الشركة', 'text', { logic: rule(1, 'equals', 'yes') })]))
    await side('المنطق')
    const sim = screen.getByTestId('path-simulator')
    const shown = () => within(sim).getAllByTestId('sim-block').map((li) => li.getAttribute('data-visible'))

    expect(shown()).toEqual(['true', 'false'])
    await userEvent.selectOptions(within(sim).getByRole('combobox'), 'yes')
    expect(shown()).toEqual(['true', 'true'])
  })

  it('a rule edit can be undone and redone from the toolbar', async () => {
    mount()
    await pick(1)
    await side('المنطق')
    await userEvent.click(screen.getByRole('button', { name: 'إضافة شرط ظهور' }))
    expect(screen.getByTestId('rule-sentence')).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: 'تراجع' }))
    expect(screen.queryByTestId('rule-sentence')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'إعادة' }))
    expect(screen.getByTestId('rule-sentence')).toBeTruthy()
  })

  it('deleting a question that a rule reads removes the condition and says nothing is left dangling', async () => {
    mount(baseForm([q(1, 'هل أنت موظف؟', 'yes_no'), q(2, 'اسم الشركة', 'text', { logic: rule(1, 'equals', 'yes') })]))
    await pick(0)
    await userEvent.click(within(cards()[0]).getByRole('button', { name: /^حذف/ }))
    await side('المنطق')

    expect(screen.getByText('لا توجد شروط بعد. كل عناصر النموذج تظهر دائماً.')).toBeTruthy()
  })

  it('the tabs work from the keyboard', async () => {
    mount()
    const logicTab = within(screen.getByRole('tablist', { name: 'لوحة الإعدادات' })).getByRole('tab', { name: 'المنطق' })
    logicTab.focus()
    await userEvent.keyboard('{Enter}')

    expect(logicTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toContainElement(screen.getByTestId('logic-panel'))
  })
})

describe('a viewer who cannot edit', () => {
  it('sees the rules and the tabs but cannot add, change or remove anything', async () => {
    mount(baseForm([q(1, 'هل أنت موظف؟', 'yes_no'), q(2, 'اسم الشركة', 'text', { logic: rule(1, 'equals', 'yes') }), q(3, 'ملاحظات')]), { readOnly: true })
    await pick(1)
    await side('المنطق')

    expect(screen.getByTestId('rule-sentence')).toBeTruthy()
    expect(screen.getByLabelText('نوع الشرط')).toBeDisabled()
    expect(screen.getByLabelText('المشغّل 1')).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'إزالة الشرط' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'إضافة شرط آخر' })).toBeNull()

    await pick(2)
    expect(screen.queryByRole('button', { name: 'إضافة شرط ظهور' })).toBeNull()
  })
})

describe('saving rules', () => {
  it('sends a rule between two new questions with `ref`, the server points it at the rows it creates, and the editor then reads "saved"', async () => {
    const server = fakeServer(baseForm([]))
    mount(baseForm([]))
    await userEvent.click(screen.getByTestId('library-yes_no'))
    await userEvent.click(screen.getByTestId('library-text'))
    await pick(1)
    await side('المنطق')
    await userEvent.click(screen.getByRole('button', { name: 'إضافة شرط ظهور' }))
    await saveNow()

    await waitFor(() => expect(server.puts).toHaveLength(1))
    const [first, second] = server.puts[0].questions as Sent[]
    expect(first).not.toHaveProperty('id')
    expect(first.ref).toBeLessThan(0)
    expect(second).not.toHaveProperty('id')
    expect(second.logic?.conditions[0].question).toBe(first.ref)

    await waitFor(() => expect(screen.getByText(/^تم الحفظ|^كل التغييرات محفوظة/)).toBeTruthy())
    const stored = server.saved.questions
    expect(stored[1].logic?.conditions[0].question).toBe(stored[0].id)
    // Saving gave the questions ids, but the document is not edited by that: nothing more is sent.
    await new Promise((r) => setTimeout(r, 50))
    expect(server.puts).toHaveLength(1)
  })

  it('a second edit of the saved rule is sent with the stored id of its source and no `ref`', async () => {
    const server = fakeServer(baseForm([q(1, 'هل أنت موظف؟', 'yes_no'), q(2, 'اسم الشركة', 'text', { logic: rule(1, 'equals', 'yes') })]))
    mount(baseForm([q(1, 'هل أنت موظف؟', 'yes_no'), q(2, 'اسم الشركة', 'text', { logic: rule(1, 'equals', 'yes') })]))
    await pick(1)
    await side('المنطق')
    await userEvent.selectOptions(screen.getByLabelText('قيمة الشرط 1'), 'no')
    await saveNow()

    await waitFor(() => expect(server.puts).toHaveLength(1))
    const [first, second] = server.puts[0].questions as Sent[]
    expect(first.id).toBe(1)
    expect(first).not.toHaveProperty('ref')
    expect(second.logic).toEqual(rule(1, 'equals', 'no'))
  })

  it('removing the last condition sends `null`, so the rule is removed on the server too', async () => {
    const server = fakeServer(baseForm([q(1, 'هل أنت موظف؟', 'yes_no'), q(2, 'اسم الشركة', 'text', { logic: rule(1, 'equals', 'yes') })]))
    mount(baseForm([q(1, 'هل أنت موظف؟', 'yes_no'), q(2, 'اسم الشركة', 'text', { logic: rule(1, 'equals', 'yes') })]))
    await pick(1)
    await side('المنطق')
    await userEvent.click(screen.getByRole('button', { name: 'إزالة الشرط' }))
    await saveNow()

    await waitFor(() => expect(server.puts).toHaveLength(1))
    expect((server.puts[0].questions as Sent[])[1].logic).toBeNull()
  })

  it('does not send a rule that is half-written (the server would refuse it), and says what to fix', async () => {
    const server = fakeServer(baseForm([q(1, 'ملاحظات', 'text'), q(2, 'اسم الشركة', 'text', { logic: rule(1, 'equals', 'x') })]))
    mount(baseForm([q(1, 'ملاحظات', 'text'), q(2, 'اسم الشركة', 'text', { logic: rule(1, 'equals', 'x') })]))
    await pick(1)
    await side('المنطق')
    await userEvent.clear(screen.getByLabelText('قيمة الشرط 1'))
    await saveNow()

    expect(server.puts).toHaveLength(0)
    expect(within(screen.getByTestId('logic-editor')).getAllByRole('alert').length).toBeGreaterThan(0)
  })
})

describe('the Steps panel', () => {
  const stepped = () => baseForm([q(1, 'الاسم'), q(2, 'الخطوة الثانية', 'page_break', { description: 'تفاصيل' }), q(3, 'الهاتف', 'phone'), q(4, 'الخطوة الثالثة', 'page_break'), q(5, 'ملاحظات', 'textarea')])

  it('lists each step with its title, its description and its questions', async () => {
    mount(stepped())
    await side('الخطوات')
    const items = screen.getAllByTestId('step-item')

    expect(items).toHaveLength(3)
    expect(within(items[1]).getByLabelText('عنوان الخطوة 2')).toHaveValue('الخطوة الثانية')
    expect(within(items[1]).getByLabelText('وصف الخطوة 2')).toHaveValue('تفاصيل')
    expect(within(items[1]).getByText('الهاتف')).toBeTruthy()
  })

  it('adds a step, and it is an undoable edit', async () => {
    mount(stepped())
    await side('الخطوات')
    await userEvent.click(screen.getByRole('button', { name: /إضافة خطوة/ }))
    expect(screen.getAllByTestId('step-item')).toHaveLength(4)

    await userEvent.click(screen.getByRole('button', { name: 'تراجع' }))
    expect(screen.getAllByTestId('step-item')).toHaveLength(3)
  })

  it('reorders steps with their questions; the first stage cannot be moved above', async () => {
    mount(stepped())
    await side('الخطوات')
    expect(screen.getByRole('button', { name: 'نقل الخطوة 2 للأعلى' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'نقل الخطوة 3 للأعلى' }))

    const titles = screen.getAllByTestId('step-item').map((li) => within(li).queryByRole('textbox', { name: /عنوان الخطوة/ })?.getAttribute('value') ?? null)
    expect(titles).toEqual([null, 'الخطوة الثالثة', 'الخطوة الثانية'])
  })

  it('moves a question to another step', async () => {
    mount(stepped())
    await side('الخطوات')
    const items = screen.getAllByTestId('step-item')
    await userEvent.selectOptions(within(items[1]).getByLabelText('نقل «الهاتف» إلى خطوة'), items[2].getAttribute('data-step-key')!)

    expect(within(screen.getAllByTestId('step-item')[2]).getByText('الهاتف')).toBeTruthy()
    expect(within(screen.getAllByTestId('step-item')[1]).queryByText('الهاتف')).toBeNull()
  })

  it('edits a title and the description from the panel, and the canvas follows', async () => {
    mount(stepped())
    await side('الخطوات')
    const title = screen.getByLabelText('عنوان الخطوة 2')
    await userEvent.clear(title)
    await userEvent.type(title, 'معلومات التواصل')

    expect(cards()[1].textContent).toContain('معلومات التواصل')
  })

  it('switches the review page on, and the draft is saved with it; off sends nothing for it', async () => {
    const server = fakeServer(stepped())
    mount(stepped())
    await side('الخطوات')
    await userEvent.click(screen.getByRole('switch', { name: 'عرض صفحة مراجعة قبل الإرسال' }))
    await saveNow()

    await waitFor(() => expect(server.puts).toHaveLength(1))
    expect(server.puts[0].flow).toEqual({ review_step: true })

    await userEvent.click(screen.getByRole('switch', { name: 'عرض صفحة مراجعة قبل الإرسال' }))
    await saveNow()
    await waitFor(() => expect(server.puts).toHaveLength(2))
    expect(server.puts[1].flow).toBeNull()
  })

  it('loads a form that already has the review page on', async () => {
    mount(baseForm(stepped().questions, { review_step: true }))
    await side('الخطوات')

    expect(screen.getByRole('switch', { name: 'عرض صفحة مراجعة قبل الإرسال' })).toBeChecked()
  })

  it('a viewer sees the steps but cannot change them', async () => {
    mount(stepped(), { readOnly: true })
    await side('الخطوات')

    expect(screen.getByLabelText('عنوان الخطوة 2')).toBeDisabled()
    expect(screen.getByRole('switch', { name: 'عرض صفحة مراجعة قبل الإرسال' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: /إضافة خطوة/ })).toBeNull()
  })

  it('jumps from a step to its rule in the Logic tab', async () => {
    mount(baseForm([q(1, 'هل أنت موظف؟', 'yes_no'), q(2, 'بيانات العمل', 'page_break', { logic: rule(1, 'equals', 'yes') }), q(3, 'اسم الشركة')]))
    await side('الخطوات')
    await userEvent.click(within(screen.getAllByTestId('step-item')[1]).getByRole('button', { name: /الشرط|شرط/ }))

    expect(screen.getByTestId('logic-panel')).toBeTruthy()
    expect(screen.getByTestId('rule-sentence')).toHaveTextContent('تظهر هذه الخطوة فقط إذا')
  })
})
