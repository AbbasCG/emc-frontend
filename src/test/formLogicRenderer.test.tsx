import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FormRenderer from '@/components/operations/FormRenderer'
import type { FormQuestion, OpsFormDefinition, QuestionLogic, QuestionType } from '@/types/operations'

/** The public form with rules and steps: what a respondent sees, what stops them, and what is sent. */

const q = (id: number, label: string, type: QuestionType, extra: Partial<FormQuestion> = {}): FormQuestion => ({ id, label, type, required: false, sort_order: id, ...extra })
const rule = (question: number, operator: QuestionLogic['conditions'][number]['operator'], value?: string | number | string[], action: QuestionLogic['action'] = 'show'): QuestionLogic => ({
  action,
  match: 'all',
  conditions: [{ question, operator, ...(value !== undefined ? { value } : {}) }],
})
const form = (questions: FormQuestion[], flow: OpsFormDefinition['flow'] = null): OpsFormDefinition => ({ id: 1, title: 'نموذج', description: '', slug: 's', form_type: 'suggestion', questions, flow, created_at: '' })

const yes = () => userEvent.click(within(screen.getByRole('group', { name: /هل أنت موظف/ })).getByRole('radio', { name: 'نعم' }))
const no = () => userEvent.click(within(screen.getByRole('group', { name: /هل أنت موظف/ })).getByRole('radio', { name: 'لا' }))
const next = () => userEvent.click(screen.getByRole('button', { name: /^(التالي|مراجعة الإجابات)$/ }))

/** yes/no → company (required, shown when yes) */
const employed = () => [q(1, 'هل أنت موظف؟', 'yes_no', { required: true }), q(2, 'اسم الشركة', 'text', { required: true, logic: rule(1, 'equals', 'yes') })]

describe('questions that appear and disappear', () => {
  it('a question with a rule is not drawn until its condition holds, and goes away when it stops holding', async () => {
    render(<FormRenderer form={form(employed())} onSubmitAnswers={vi.fn()} />)

    expect(screen.queryByLabelText(/اسم الشركة/)).toBeNull()
    await yes()
    expect(screen.getByLabelText(/اسم الشركة/)).toBeTruthy()
    await no()
    expect(screen.queryByLabelText(/اسم الشركة/)).toBeNull()
  })

  it('a hide rule works the other way round', async () => {
    render(<FormRenderer form={form([q(1, 'هل أنت موظف؟', 'yes_no'), q(2, 'جهة الدراسة', 'text', { logic: rule(1, 'equals', 'yes', 'hide') })])} onSubmitAnswers={vi.fn()} />)

    expect(screen.getByLabelText(/جهة الدراسة/)).toBeTruthy()
    await yes()
    expect(screen.queryByLabelText(/جهة الدراسة/)).toBeNull()
  })

  it('compares numbers as numbers and options by value', async () => {
    render(
      <FormRenderer
        onSubmitAnswers={vi.fn()}
        form={form([
          q(1, 'العمر', 'number'),
          q(2, 'ولي الأمر', 'text', { logic: rule(1, 'lt', 18) }),
          q(3, 'المدينة', 'radio', { options: ['جدة', 'الرياض'] }),
          q(4, 'الحي', 'text', { logic: rule(3, 'any_of', ['جدة']) }),
        ])}
      />,
    )

    expect(screen.queryByLabelText(/ولي الأمر/)).toBeNull()
    await userEvent.type(screen.getByLabelText(/العمر/), '9')
    expect(screen.getByLabelText(/ولي الأمر/)).toBeTruthy()
    await userEvent.clear(screen.getByLabelText(/العمر/))
    await userEvent.type(screen.getByLabelText(/العمر/), '30')
    expect(screen.queryByLabelText(/ولي الأمر/)).toBeNull()

    await userEvent.click(within(screen.getByRole('group', { name: /المدينة/ })).getByRole('radio', { name: 'الرياض' }))
    expect(screen.queryByLabelText(/الحي/)).toBeNull()
    await userEvent.click(within(screen.getByRole('group', { name: /المدينة/ })).getByRole('radio', { name: 'جدة' }))
    expect(screen.getByLabelText(/الحي/)).toBeTruthy()
  })

  it('a question that is not answered yet behaves as the shared rules say: not_equals holds, equals does not', () => {
    render(<FormRenderer form={form([q(1, 'السؤال الأول', 'text'), q(2, 'ظاهر', 'text', { logic: rule(1, 'not_equals', 'x') }), q(3, 'مخفي', 'text', { logic: rule(1, 'equals', 'x') })])} onSubmitAnswers={vi.fn()} />)

    expect(screen.getByLabelText(/ظاهر/)).toBeTruthy()
    expect(screen.queryByLabelText(/مخفي/)).toBeNull()
  })

  it('a form without any rule is unchanged: one page, every question, no progress bar', () => {
    render(<FormRenderer form={form([q(1, 'أ', 'text'), q(2, 'ب', 'text')])} onSubmitAnswers={vi.fn()} />)

    expect(screen.getByLabelText('أ')).toBeTruthy()
    expect(screen.getByLabelText('ب')).toBeTruthy()
    expect(screen.queryByTestId('progress')).toBeNull()
    expect(screen.getByRole('button', { name: 'إرسال' })).toBeTruthy()
  })
})

describe('what a hidden question can do to the respondent', () => {
  it('a required question that is hidden does not block sending', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<FormRenderer form={form(employed())} onSubmitAnswers={onSubmit} />)

    await no()
    await userEvent.click(screen.getByRole('button', { name: 'إرسال' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith({ 1: 'no' })
    expect(screen.getByRole('status')).toHaveTextContent('تم استلام إجاباتك')
  })

  it('the same question blocks sending once it is shown', async () => {
    const onSubmit = vi.fn()
    render(<FormRenderer form={form(employed())} onSubmitAnswers={onSubmit} />)

    await yes()
    await userEvent.click(screen.getByRole('button', { name: 'إرسال' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
  })

  it('an answer typed before the question was hidden is not sent', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<FormRenderer form={form(employed())} onSubmitAnswers={onSubmit} />)

    await yes()
    await userEvent.type(screen.getByLabelText(/اسم الشركة/), 'شركة')
    await no()
    await userEvent.click(screen.getByRole('button', { name: 'إرسال' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toEqual({ 1: 'no' })
  })

  it('a hidden question counts as unanswered for the rules that read it', () => {
    render(
      <FormRenderer
        onSubmitAnswers={vi.fn()}
        form={form([
          q(1, 'هل أنت موظف؟', 'yes_no'),
          q(2, 'اسم الشركة', 'text', { logic: rule(1, 'equals', 'yes') }),
          q(3, 'ملاحظة فارغة', 'text', { logic: rule(2, 'is_empty') }),
          q(4, 'ملاحظة مكتوبة', 'text', { logic: rule(2, 'equals', 'x') }),
          q(5, 'إخفاء الفارغ', 'text', { logic: rule(2, 'is_empty', undefined, 'hide') }),
        ])}
      />,
    )

    expect(screen.queryByLabelText(/اسم الشركة/)).toBeNull()
    expect(screen.getByLabelText(/ملاحظة فارغة/)).toBeTruthy()
    expect(screen.queryByLabelText(/ملاحظة مكتوبة/)).toBeNull()
    expect(screen.queryByLabelText(/إخفاء الفارغ/)).toBeNull()
  })
})

describe('steps', () => {
  const stepped = (extra: FormQuestion[] = [], flow: OpsFormDefinition['flow'] = null) =>
    form(
      [
        q(1, 'الاسم', 'text', { required: true }),
        q(2, 'الخطوة الثانية', 'page_break', { description: 'تفاصيل أكثر' }),
        q(3, 'الهاتف', 'phone', { required: true }),
        ...extra,
      ],
      flow,
    )

  it('shows one step at a time with a title, a description and "page n of m"', async () => {
    render(<FormRenderer form={stepped()} onSubmitAnswers={vi.fn()} />)

    expect(screen.getByTestId('progress')).toHaveTextContent('الصفحة 1 من 2')
    expect(screen.getByLabelText(/الاسم/)).toBeTruthy()
    expect(screen.queryByLabelText(/الهاتف/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'السابق' })).toBeNull()

    await userEvent.type(screen.getByLabelText(/الاسم/), 'سارة')
    await next()

    expect(screen.getByTestId('progress')).toHaveTextContent('الصفحة 2 من 2')
    expect(screen.getByTestId('step-heading')).toHaveTextContent('الخطوة الثانية')
    expect(screen.getByTestId('step-heading')).toHaveTextContent('تفاصيل أكثر')
    expect(screen.getByRole('button', { name: 'إرسال' })).toBeTruthy()
  })

  it('does not move on while a visible required question of the step is unanswered, and says which', async () => {
    render(<FormRenderer form={stepped()} onSubmitAnswers={vi.fn()} />)

    await next()

    expect(screen.getByTestId('progress')).toHaveTextContent('الصفحة 1 من 2')
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
    expect(screen.getByLabelText(/الاسم/)).toHaveAttribute('aria-invalid', 'true')
  })

  it('Previous goes back with the answers kept', async () => {
    render(<FormRenderer form={stepped()} onSubmitAnswers={vi.fn()} />)

    await userEvent.type(screen.getByLabelText(/الاسم/), 'سارة')
    await next()
    await userEvent.click(screen.getByRole('button', { name: 'السابق' }))

    expect(screen.getByLabelText(/الاسم/)).toHaveValue('سارة')
    expect(screen.getByTestId('progress')).toHaveTextContent('الصفحة 1 من 2')
  })

  it('nothing is sent until the very end: moving between steps makes no request, and a response is sent once', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<FormRenderer form={stepped()} onSubmitAnswers={onSubmit} />)

    await userEvent.type(screen.getByLabelText(/الاسم/), 'سارة')
    await next()
    expect(onSubmit).not.toHaveBeenCalled()
    await userEvent.type(screen.getByLabelText(/الهاتف/), '0555555555')
    await userEvent.click(screen.getByRole('button', { name: 'إرسال' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith({ 1: 'سارة', 3: '0555555555' })
  })

  it('moves focus to the top of the new step so a keyboard user starts there', async () => {
    render(<FormRenderer form={stepped()} onSubmitAnswers={vi.fn()} />)

    await userEvent.type(screen.getByLabelText(/الاسم/), 'سارة')
    await next()

    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }).parentElement))
  })

  it('a step whose rule does not hold is skipped, and the progress counts only the steps that will be shown', async () => {
    const questions = [
      q(1, 'هل أنت موظف؟', 'yes_no', { required: true }),
      q(2, 'بيانات العمل', 'page_break', { logic: rule(1, 'equals', 'yes') }),
      q(3, 'اسم الشركة', 'text', { required: true }),
      q(4, 'ختام', 'page_break'),
      q(5, 'ملاحظات', 'textarea'),
    ]
    render(<FormRenderer form={form(questions)} onSubmitAnswers={vi.fn()} />)

    // Unanswered: the conditional step does not hold, so the respondent will meet two steps.
    expect(screen.getByTestId('progress')).toHaveTextContent('الصفحة 1 من 2')
    await no()
    expect(screen.getByTestId('progress')).toHaveTextContent('الصفحة 1 من 2')
    await next()
    expect(screen.getByTestId('step-heading')).toHaveTextContent('ختام')
    expect(screen.queryByLabelText(/اسم الشركة/)).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'السابق' }))

    await yes()
    expect(screen.getByTestId('progress')).toHaveTextContent('الصفحة 1 من 3')
    await next()
    expect(screen.getByLabelText(/اسم الشركة/)).toBeTruthy()
  })

  it('a step with nothing left to show (every question hidden) is skipped too', async () => {
    const questions = [
      q(1, 'هل أنت موظف؟', 'yes_no'),
      q(2, 'تفاصيل', 'page_break'),
      q(3, 'اسم الشركة', 'text', { logic: rule(1, 'equals', 'yes') }),
      q(4, 'النهاية', 'page_break'),
      q(5, 'ملاحظات', 'textarea'),
    ]
    render(<FormRenderer form={form(questions)} onSubmitAnswers={vi.fn()} />)

    await no()
    expect(screen.getByTestId('progress')).toHaveTextContent('الصفحة 1 من 2')
    await next()
    expect(screen.getByTestId('step-heading')).toHaveTextContent('النهاية')
  })

  it('when the step being viewed stops being shown (a preview redrawn with a new rule), the respondent moves to the next shown step', async () => {
    const questions = (stepRule: QuestionLogic | null): FormQuestion[] => [
      q(1, 'أ', 'text'),
      q(2, 'الثانية', 'page_break', stepRule ? { logic: stepRule } : {}),
      q(3, 'ب', 'text'),
      q(4, 'الثالثة', 'page_break'),
      q(5, 'ج', 'text'),
    ]
    const { rerender } = render(<FormRenderer preview form={form(questions(null))} onSubmitAnswers={vi.fn()} />)
    await next()
    expect(screen.getByTestId('step-heading')).toHaveTextContent('الثانية')

    rerender(<FormRenderer preview form={form(questions(rule(1, 'equals', 'مستحيل')))} onSubmitAnswers={vi.fn()} />)

    expect(screen.getByTestId('step-heading')).toHaveTextContent('الثالثة')
    expect(screen.getByTestId('progress')).toHaveTextContent('الصفحة 2 من 2')
  })

  it('exposes progress to assistive technology: the current step is marked, and errors are announced', async () => {
    render(<FormRenderer form={stepped()} onSubmitAnswers={vi.fn()} />)

    const list = screen.getByRole('list', { name: 'خطوات النموذج' })
    expect(within(list).getAllByRole('listitem').filter((li) => li.getAttribute('aria-current') === 'step')).toHaveLength(1)
    await next()
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
  })

  it('when the server refuses an answer on an earlier step, the respondent is taken to that step with the message', async () => {
    const refusal = Object.assign(new Error('x'), { isAxiosError: true, response: { status: 422, data: { message: 'راجع', errors: { 'answers.1': ['الاسم غير مقبول'] } } } })
    const onSubmit = vi.fn().mockRejectedValue(refusal)
    render(<FormRenderer form={stepped()} onSubmitAnswers={onSubmit} />)

    await userEvent.type(screen.getByLabelText(/الاسم/), 'سارة')
    await next()
    await userEvent.type(screen.getByLabelText(/الهاتف/), '0555555555')
    await userEvent.click(screen.getByRole('button', { name: 'إرسال' }))

    await waitFor(() => expect(screen.getByTestId('progress')).toHaveTextContent('الصفحة 1 من 2'))
    expect(screen.queryByText(/تم استلام إجاباتك/)).toBeNull()
  })
})

describe('the review step', () => {
  const reviewed = () =>
    form(
      [
        q(1, 'هل أنت موظف؟', 'yes_no', { required: true }),
        q(2, 'اسم الشركة', 'text', { logic: rule(1, 'equals', 'yes') }),
        q(3, 'بيانات إضافية', 'page_break'),
        q(4, 'ملاحظات', 'textarea'),
      ],
      { review_step: true },
    )

  it('adds a last page that lists the visible answers only, each with a way back, and sends nothing before the final button', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<FormRenderer form={reviewed()} onSubmitAnswers={onSubmit} />)

    expect(screen.getByTestId('progress')).toHaveTextContent('الصفحة 1 من 3')
    await yes()
    await userEvent.type(screen.getByLabelText(/اسم الشركة/), 'شركة النور')
    await no()
    await next()
    await userEvent.type(screen.getByLabelText(/ملاحظات/), 'لا شيء')
    await next()

    const review = screen.getByTestId('review-step')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(within(review).getByText('لا')).toBeTruthy()
    expect(within(review).getByText('لا شيء')).toBeTruthy()
    expect(within(review).queryByText('شركة النور')).toBeNull()
    expect(within(review).queryByText('اسم الشركة')).toBeNull()
    expect(screen.getByRole('button', { name: 'إرسال' })).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: 'إرسال' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({ 1: 'no', 4: 'لا شيء' })
  })

  it('"edit" on the review page goes back to that step, and Previous leaves the review', async () => {
    render(<FormRenderer form={reviewed()} onSubmitAnswers={vi.fn()} />)

    await no()
    await next()
    await next()
    const edits = screen.getAllByRole('button', { name: /^تعديل/ })
    expect(edits).toHaveLength(2)
    await userEvent.click(edits[1])
    expect(screen.queryByTestId('review-step')).toBeNull()
    expect(screen.getByTestId('progress')).toHaveTextContent('الصفحة 2 من 3')
    await userEvent.click(screen.getByRole('button', { name: 'السابق' }))
    expect(screen.getByTestId('progress')).toHaveTextContent('الصفحة 1 من 3')
  })

  it('without the setting there is no review page', async () => {
    render(<FormRenderer form={form([q(1, 'أ', 'text'), q(2, 'ب', 'page_break'), q(3, 'ج', 'text')])} onSubmitAnswers={vi.fn()} />)

    await next()
    expect(screen.queryByTestId('review-step')).toBeNull()
    expect(screen.getByRole('button', { name: 'إرسال' })).toBeTruthy()
  })
})

describe('preview', () => {
  it('follows the same rules and steps, validates, and sends nothing', async () => {
    const onSubmit = vi.fn()
    render(<FormRenderer preview form={form([...employed(), q(3, 'ختام', 'page_break'), q(4, 'ملاحظات', 'textarea')])} onSubmitAnswers={onSubmit} />)

    await no()
    await next()
    await userEvent.click(screen.getByRole('button', { name: /إرسال/ }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/لم يُرسل شيء/)).toBeTruthy()
  })
})
