import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FormRenderer from '@/components/operations/FormRenderer'
import type { FormQuestion, OpsFormDefinition, QuestionType } from '@/types/operations'

/** The public form for every block the builder can produce: the control, the answer it sends, and the checks before sending. */

const q = (id: number, label: string, type: QuestionType, extra: Partial<FormQuestion> = {}): FormQuestion => ({ id, label, type, required: false, sort_order: id, ...extra })
const form = (questions: FormQuestion[]): OpsFormDefinition => ({ id: 1, title: 'نموذج', description: 'وصف النموذج', slug: 's', form_type: 'suggestion', questions, created_at: '' })
const send = async (onSubmit = vi.fn().mockResolvedValue(undefined)) => ({ onSubmit })

describe('each block as a respondent sees it', () => {
  it('draws the right control for every type', () => {
    render(
      <FormRenderer
        onSubmitAnswers={vi.fn()}
        form={form([
          q(1, 'نص', 'text', { placeholder: 'اكتب هنا' }),
          q(2, 'فقرة', 'textarea'),
          q(3, 'بريد', 'email'),
          q(4, 'هاتف', 'phone'),
          q(5, 'عدد', 'number', { config: { validation: { min: 1, max: 9, integer_only: true } } }),
          q(6, 'رابط', 'url'),
          q(7, 'يوم', 'date', { config: { validation: { min_date: '2020-01-01' } } }),
          q(8, 'ساعة', 'time'),
          q(9, 'اختر واحداً', 'radio', { options: ['أ', 'ب'] }),
          q(10, 'اختر عدة', 'checkbox', { options: ['أ', 'ب', 'ج'] }),
          q(11, 'قائمة', 'select', { options: ['أ', 'ب'], placeholder: 'حدد' }),
          q(12, 'هل', 'yes_no'),
          q(13, 'نجوم', 'star_rating', { config: { scale: { max: 7 } } }),
          q(14, 'مقياس', 'linear_scale', { config: { scale: { min: 0, max: 4, min_label: 'أدنى', max_label: 'أعلى' } } }),
          q(15, 'ملف', 'file'),
          q(16, 'صورة', 'image'),
          q(17, 'أوافق', 'consent', { required: true, description: 'نص الشروط' }),
        ])}
      />,
    )

    expect(screen.getByLabelText(/^نص/)).toHaveAttribute('placeholder', 'اكتب هنا')
    expect(screen.getByLabelText(/فقرة/).tagName).toBe('TEXTAREA')
    expect(screen.getByLabelText(/بريد/)).toHaveAttribute('type', 'email')
    expect(screen.getByLabelText(/هاتف/)).toHaveAttribute('type', 'tel')
    expect(screen.getByLabelText(/عدد/)).toHaveAttribute('type', 'number')
    expect(screen.getByLabelText(/عدد/)).toHaveAttribute('min', '1')
    expect(screen.getByLabelText(/عدد/)).toHaveAttribute('step', '1')
    expect(screen.getByLabelText(/رابط/)).toHaveAttribute('type', 'url')
    expect(screen.getByLabelText(/يوم/)).toHaveAttribute('type', 'date')
    expect(screen.getByLabelText(/يوم/)).toHaveAttribute('min', '2020-01-01')
    expect(screen.getByLabelText(/ساعة/)).toHaveAttribute('type', 'time')
    expect(within(screen.getByRole('group', { name: /اختر واحداً/ })).getAllByRole('radio')).toHaveLength(2)
    expect(within(screen.getByRole('group', { name: /اختر عدة/ })).getAllByRole('checkbox')).toHaveLength(3)
    expect(screen.getByLabelText(/قائمة/).tagName).toBe('SELECT')
    expect(within(screen.getByLabelText(/قائمة/)).getByRole('option', { name: 'حدد' })).toBeTruthy()
    expect(within(screen.getByRole('group', { name: /هل/ })).getAllByRole('radio')).toHaveLength(2)
    expect(within(screen.getByRole('group', { name: /نجوم/ })).getAllByRole('radio')).toHaveLength(7)
    expect(within(screen.getByRole('group', { name: /مقياس/ })).getAllByRole('radio')).toHaveLength(5)
    expect(screen.getByText('أدنى')).toBeTruthy()
    expect(screen.getByLabelText(/ملف/)).toHaveAttribute('accept', expect.stringContaining('.pdf'))
    expect(screen.getByLabelText(/صورة/)).toHaveAttribute('accept', expect.not.stringContaining('.pdf'))
    expect(screen.getByLabelText(/أوافق/)).toHaveAttribute('type', 'checkbox')
    expect(screen.getByText('نص الشروط')).toBeTruthy()
  })

  it('headings, text blocks and page breaks are shown or used, never asked', () => {
    render(
      <FormRenderer
        onSubmitAnswers={vi.fn()}
        form={form([q(1, 'القسم الأول', 'section', { description: 'عن هذا القسم' }), q(2, '', 'description', { description: 'اقرأ بعناية' }), q(3, 'سؤال', 'text')])}
      />,
    )

    expect(screen.getByRole('heading', { level: 2, name: 'القسم الأول' })).toBeTruthy()
    expect(screen.getByText('عن هذا القسم')).toBeTruthy()
    expect(screen.getByText('اقرأ بعناية')).toBeTruthy()
    expect(screen.getAllByRole('textbox')).toHaveLength(1)
  })

  it('shows help text, and a required question says so to a screen reader as well', () => {
    render(<FormRenderer onSubmitAnswers={vi.fn()} form={form([q(1, 'الاسم', 'text', { required: true, help_text: 'كما في الهوية' })])} />)
    expect(screen.getByText('كما في الهوية')).toBeTruthy()
    expect(screen.getByLabelText(/الاسم/)).toHaveAccessibleDescription('كما في الهوية')
    expect(screen.getByText('(مطلوب)')).toBeTruthy()
  })

  it('starts with the defaults the builder set', () => {
    render(
      <FormRenderer
        onSubmitAnswers={vi.fn()}
        form={form([
          q(1, 'نص', 'text', { config: { default_value: 'مرحباً' } }),
          q(2, 'عدة', 'checkbox', { options: ['أ', 'ب'], config: { default_value: ['ب'] } }),
          q(3, 'اختيار', 'radio', { options: ['أ', 'ب'], config: { default_value: 'أ' } }),
          q(4, 'سؤال', 'yes_no', { config: { default_value: 'no' } }),
        ])}
      />,
    )

    expect(screen.getByLabelText(/^نص/)).toHaveValue('مرحباً')
    expect(within(screen.getByRole('group', { name: /عدة/ })).getByLabelText('ب')).toBeChecked()
    expect(within(screen.getByRole('group', { name: /اختيار/ })).getByLabelText('أ')).toBeChecked()
    expect(within(screen.getByRole('group', { name: /سؤال/ })).getByLabelText('لا')).toBeChecked()
  })
})

describe('what is sent', () => {
  it('sends each type in the form the server stores', async () => {
    const { onSubmit } = await send()
    const file = new File(['%PDF-1.4'], 'cv.pdf', { type: 'application/pdf' })
    const image = new File(['x'], 'me.png', { type: 'image/png' })
    render(
      <FormRenderer
        onSubmitAnswers={onSubmit}
        form={form([
          q(1, 'نص', 'text'),
          q(2, 'عدد', 'number'),
          q(3, 'رابط', 'url'),
          q(4, 'يوم', 'date'),
          q(5, 'ساعة', 'time'),
          q(6, 'عدة', 'checkbox', { options: ['أ', 'ب'] }),
          q(7, 'هل', 'yes_no'),
          q(8, 'نجوم', 'star_rating'),
          q(9, 'مقياس', 'linear_scale'),
          q(10, 'ملف', 'file'),
          q(11, 'صورة', 'image'),
          q(12, 'أوافق', 'consent'),
          q(13, 'قسم', 'section'),
          q(14, 'غير مجاب عنه', 'text'),
        ])}
      />,
    )

    await userEvent.type(screen.getByLabelText(/^نص/), 'سارة')
    await userEvent.type(screen.getByLabelText(/عدد/), '29')
    await userEvent.type(screen.getByLabelText(/رابط/), 'https://example.com')
    await userEvent.type(screen.getByLabelText(/يوم/), '1996-04-12')
    await userEvent.type(screen.getByLabelText(/ساعة/), '14:30')
    await userEvent.click(screen.getByLabelText('أ'))
    await userEvent.click(screen.getByLabelText('نعم'))
    await userEvent.click(screen.getByLabelText('4 من 5'))
    await userEvent.click(within(screen.getByRole('group', { name: /مقياس/ })).getByLabelText('3'))
    await userEvent.upload(screen.getByLabelText(/ملف/), file)
    await userEvent.upload(screen.getByLabelText(/صورة/), image)
    await userEvent.click(screen.getByLabelText(/أوافق/))
    await userEvent.click(screen.getByRole('button', { name: 'إرسال' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toEqual({
      '1': 'سارة', '2': '29', '3': 'https://example.com', '4': '1996-04-12', '5': '14:30', '6': ['أ'], '7': 'yes', '8': '4', '9': '3', '10': file, '11': image, '12': 'yes',
    })
  })

  it('an unticked consent and untouched optional questions are simply not sent', async () => {
    const { onSubmit } = await send()
    render(<FormRenderer onSubmitAnswers={onSubmit} form={form([q(1, 'أوافق', 'consent'), q(2, 'نص', 'text'), q(3, 'عدة', 'checkbox', { options: ['أ'] })])} />)

    await userEvent.click(screen.getByLabelText(/أوافق/))
    await userEvent.click(screen.getByLabelText(/أوافق/))
    await userEvent.click(screen.getByRole('button', { name: 'إرسال' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({}))
  })
})

describe('checks before sending', () => {
  it('stops at the first bad answer of each kind, with a message that says what is wrong', async () => {
    const { onSubmit } = await send()
    render(
      <FormRenderer
        onSubmitAnswers={onSubmit}
        form={form([
          q(1, 'بريد', 'email'),
          q(2, 'عدد', 'number', { config: { validation: { min: 5, max: 10 } } }),
          q(3, 'رابط', 'url'),
          q(4, 'قصير', 'text', { config: { validation: { min_length: 3 } } }),
          q(5, 'صورة', 'image'),
          q(6, 'أوافق', 'consent', { required: true }),
        ])}
      />,
    )

    await userEvent.type(screen.getByLabelText(/بريد/), 'ليس بريداً')
    await userEvent.type(screen.getByLabelText(/عدد/), '2')
    await userEvent.type(screen.getByLabelText(/رابط/), 'javascript:alert(1)')
    await userEvent.type(screen.getByLabelText(/قصير/), 'ab')
    await userEvent.upload(screen.getByLabelText(/صورة/), new File(['x'], 'a.pdf', { type: 'application/pdf' }), { applyAccept: false })
    await userEvent.click(screen.getByRole('button', { name: 'إرسال' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('أدخل بريداً إلكترونياً صالحاً.')).toBeTruthy()
    expect(screen.getByText('الرقم يجب أن يكون بين 5 و10.')).toBeTruthy()
    expect(screen.getByText(/أدخل رابطاً صالحاً/)).toBeTruthy()
    expect(screen.getByText(/أقصر من المسموح/)).toBeTruthy()
    expect(screen.getByText(/صور بصيغة JPG/)).toBeTruthy()
    expect(screen.getByText('يجب الموافقة للمتابعة.')).toBeTruthy()
  })

  it('fixing a field clears its own message only', async () => {
    render(<FormRenderer onSubmitAnswers={vi.fn()} form={form([q(1, 'أ', 'text', { required: true }), q(2, 'ب', 'text', { required: true })])} />)
    await userEvent.click(screen.getByRole('button', { name: 'إرسال' }))
    expect(screen.getAllByText('هذا الحقل مطلوب.')).toHaveLength(2)

    await userEvent.type(screen.getByLabelText(/^أ/), 'x')
    expect(screen.getAllByText('هذا الحقل مطلوب.')).toHaveLength(1)
  })

  it('star ratings can be picked with the keyboard', async () => {
    const { onSubmit } = await send()
    render(<FormRenderer onSubmitAnswers={onSubmit} form={form([q(1, 'نجوم', 'star_rating', { required: true })])} />)

    screen.getByLabelText('1 من 5').focus()
    await userEvent.keyboard('{ArrowRight}{ArrowRight}')
    await userEvent.click(screen.getByRole('button', { name: 'إرسال' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(Number((onSubmit.mock.calls[0][0] as Record<string, string>)['1'])).toBeGreaterThan(1)
  })
})

describe('pages', () => {
  const paged = () =>
    form([q(1, 'الاسم', 'text', { required: true }), q(2, 'الصفحة الأولى انتهت', 'page_break'), q(3, 'العمر', 'number'), q(4, '', 'page_break'), q(5, 'ملاحظات', 'textarea', { required: true })])

  it('shows one page at a time with progress, and cannot move on past a missing required answer', async () => {
    render(<FormRenderer onSubmitAnswers={vi.fn()} form={paged()} />)

    expect(screen.getByText('الصفحة 1 من 3')).toBeTruthy()
    expect(screen.queryByLabelText(/العمر/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'السابق' })).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'التالي' }))
    expect(screen.getByText('هذا الحقل مطلوب.')).toBeTruthy()
    expect(screen.getByText('الصفحة 1 من 3')).toBeTruthy()

    await userEvent.type(screen.getByLabelText(/الاسم/), 'سارة')
    await userEvent.click(screen.getByRole('button', { name: 'التالي' }))
    expect(screen.getByText('الصفحة 2 من 3')).toBeTruthy()
    expect(screen.getByLabelText(/العمر/)).toBeTruthy()
  })

  it('goes back without losing answers, and sends everything from the last page', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<FormRenderer onSubmitAnswers={onSubmit} form={paged()} />)
    await userEvent.type(screen.getByLabelText(/الاسم/), 'سارة')
    await userEvent.click(screen.getByRole('button', { name: 'التالي' }))
    await userEvent.type(screen.getByLabelText(/العمر/), '30')
    await userEvent.click(screen.getByRole('button', { name: 'التالي' }))
    await userEvent.type(screen.getByLabelText(/ملاحظات/), 'ملاحظة')
    await userEvent.click(screen.getByRole('button', { name: 'السابق' }))
    await userEvent.click(screen.getByRole('button', { name: 'السابق' }))
    expect(screen.getByLabelText(/الاسم/)).toHaveValue('سارة')
    await userEvent.click(screen.getByRole('button', { name: 'التالي' }))
    await userEvent.click(screen.getByRole('button', { name: 'التالي' }))
    expect(screen.getByLabelText(/ملاحظات/)).toHaveValue('ملاحظة')
    await userEvent.click(screen.getByRole('button', { name: 'إرسال' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ '1': 'سارة', '3': '30', '5': 'ملاحظة' }))
  })

  it('a server refusal on an earlier page brings that page back', async () => {
    const onSubmit = vi.fn().mockRejectedValue(Object.assign(new Error('x'), { isAxiosError: true, response: { status: 422, data: { errors: { 'answers.1': ['حقل «الاسم» غير صالح.'] } } } }))
    render(<FormRenderer onSubmitAnswers={onSubmit} form={form([q(1, 'الاسم', 'text'), q(2, '', 'page_break'), q(3, 'العمر', 'number')])} />)
    await userEvent.click(screen.getByRole('button', { name: 'التالي' }))
    await userEvent.click(screen.getByRole('button', { name: 'إرسال' }))

    expect(await screen.findByText('حقل «الاسم» غير صالح.')).toBeTruthy()
    expect(screen.getByText('الصفحة 1 من 2')).toBeTruthy()
  })
})

describe('preview mode', () => {
  it('works like the form but never sends, and says so', async () => {
    const onSubmit = vi.fn()
    render(<FormRenderer preview onSubmitAnswers={onSubmit} form={form([q(1, 'الاسم', 'text', { required: true })])} />)

    expect(screen.getByRole('note')).toHaveTextContent('لا يُرسل شيء')
    await userEvent.click(screen.getByRole('button', { name: 'إرسال (معاينة)' }))
    expect(screen.getByText('هذا الحقل مطلوب.')).toBeTruthy()

    await userEvent.type(screen.getByLabelText(/الاسم/), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'إرسال (معاينة)' }))
    expect(await screen.findByRole('status')).toHaveTextContent('لم يُرسل شيء')
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
