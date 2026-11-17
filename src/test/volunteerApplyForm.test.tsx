import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { AxiosError, type AxiosResponseHeaders } from 'axios'
import VolunteerApply from '@/pages/VolunteerApply'
import { COUNTRIES } from '@/components/ui/CountrySelector'
import {
  COMMITMENT_STATEMENTS,
  MOTIVATION_STATEMENTS,
  SITUATIONAL_QUESTIONS,
} from '@/components/volunteerOpportunities/volunteerFormSpec'

const submit = vi.fn()
vi.mock('@/api/volunteerApplicationApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/volunteerApplicationApi')>()),
  submitVolunteerApplication: (...args: unknown[]) => submit(...args),
}))

const toastError = vi.fn()
const toastSuccess = vi.fn()
vi.mock('@/lib/toast', () => ({
  default: { error: (...a: unknown[]) => toastError(...a), success: (...a: unknown[]) => toastSuccess(...a), warning: vi.fn(), message: vi.fn() },
}))

vi.mock('@/components/public/PublicSeo', () => ({ default: () => null }))
vi.mock('@/components/PageHeader', () => ({ default: ({ title }: { title: string }) => <header>{title}</header> }))

const DRAFT_KEY = 'emc_volunteer_application_draft_v2'

function rate(statements: ReadonlyArray<{ id: string }>) {
  return Object.fromEntries(statements.map((s) => [s.id, 4]))
}

/** A saved draft that passes every level, so a test can walk to the last one and send. */
function seedDraft(over: Record<string, unknown> = {}) {
  localStorage.setItem(
    DRAFT_KEY,
    JSON.stringify({
      full_name: 'أحمد محمد عبدالله السالم',
      email: 'ahmed@example.com',
      phone: '+967 770000000',
      country: COUNTRIES.find((c) => c.code === 'YE') ?? COUNTRIES[0],
      city: 'صنعاء',
      education_level: 'بكالوريوس',
      current_status: 'طالب',
      volunteer_days_availability: 'مرن',
      preferred_time_slot: 'مساءً',
      daily_hours: '2',
      has_previous_volunteering: false,
      motivation_ratings: rate(MOTIVATION_STATEMENTS),
      commitment_ratings: rate(COMMITMENT_STATEMENTS),
      situational_responses: Object.fromEntries(SITUATIONAL_QUESTIONS.map((q) => [q.id, q.options[0]])),
      primary_value_department: 'الإعلام',
      agree_terms: true,
      ...over,
    }),
  )
}

function laravel(status: number, data: unknown, headers: Record<string, string> = {}) {
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    statusText: '',
    data,
    headers: headers as unknown as AxiosResponseHeaders,
    config: {} as never,
  })
}

function renderForm() {
  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <VolunteerApply />
    </MemoryRouter>,
  )

  return user
}

async function walkToTheLastLevel(user: ReturnType<typeof userEvent.setup>) {
  for (const title of ['المؤهلات والتفرغ', 'الخبرات والقدرات', 'الدافعية والجدية', 'التوقعات والإدارات']) {
    await user.click(screen.getByRole('button', { name: 'المستوى التالي' }))
    expect(await screen.findByRole('heading', { level: 2, name: title })).toBeInTheDocument()
  }
}

const sendButton = () => screen.getByRole('button', { name: /إرسال طلب التطوع|جارٍ إرسال الطلب/ })

beforeEach(() => {
  localStorage.clear()
  submit.mockReset()
  toastError.mockClear()
  toastSuccess.mockClear()
  window.scrollTo = vi.fn()
  // jsdom has no layout; the form moves focus itself, so scrolling can be a no-op
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  localStorage.clear()
})

describe('the first level, left empty', () => {
  it('marks every missing field, says what to write, and puts the cursor on the first', async () => {
    const user = renderForm()

    await user.click(screen.getByRole('button', { name: 'المستوى التالي' }))

    const summary = await screen.findByRole('alert')
    expect(within(summary).getByText('يوجد 5 حقول تحتاج إلى تصحيح')).toBeInTheDocument()
    for (const message of [
      'يرجى إدخال الاسم الرباعي.',
      'يرجى إدخال البريد الإلكتروني.',
      'يرجى إدخال رقم الجوال مع مفتاح الدولة.',
      'يرجى اختيار بلد الإقامة.',
      'يرجى إدخال المدينة.',
    ]) {
      expect(within(summary).getByText(message)).toBeInTheDocument()
    }

    const name = screen.getByLabelText(/الاسم الرباعي/)
    expect(name).toHaveAttribute('aria-invalid', 'true')
    expect(name).toHaveAccessibleDescription('يرجى إدخال الاسم الرباعي.')
    expect(name).toHaveFocus()
    // one message for the problem beside its field, one in the list: never a toast as well
    expect(toastError).not.toHaveBeenCalled()
    // still on the first level
    expect(screen.getByRole('heading', { level: 2, name: 'البيانات الشخصية' })).toBeInTheDocument()
  })

  it('shows the country message once, next to its label', async () => {
    const user = renderForm()

    await user.click(screen.getByRole('button', { name: 'المستوى التالي' }))

    expect(await screen.findAllByText('يرجى اختيار بلد الإقامة.')).toHaveLength(2) // the list and the field, not three
  })

  it('keeps what was typed while explaining what is wrong with it', async () => {
    const user = renderForm()

    await user.type(screen.getByLabelText(/البريد الإلكتروني/), 'ahmed@')
    await user.type(screen.getByLabelText(/رقم الجوال/), 'abc')
    await user.click(screen.getByRole('button', { name: 'المستوى التالي' }))

    const email = screen.getByLabelText(/البريد الإلكتروني/)
    const phone = screen.getByLabelText(/رقم الجوال/)
    expect(email).toHaveValue('ahmed@')
    expect(phone).toHaveValue('abc')
    expect(email).toHaveAccessibleDescription('البريد الإلكتروني غير صالح. اكتبه بالشكل name@example.com.')
    expect(phone).toHaveAccessibleDescription('رقم الجوال غير صالح. تحقق من مفتاح الدولة والرقم.')
  })

  it('clears a field’s message as soon as it is corrected, and the summary with the last one', async () => {
    const user = renderForm()
    await user.click(screen.getByRole('button', { name: 'المستوى التالي' }))

    await user.type(screen.getByLabelText(/الاسم الرباعي/), 'أحمد محمد')

    expect(screen.getByLabelText(/الاسم الرباعي/)).not.toHaveAttribute('aria-invalid')
    expect(within(screen.getByRole('alert')).getByText('يوجد 4 حقول تحتاج إلى تصحيح')).toBeInTheDocument()
  })

  it('moves to a field from the list', async () => {
    const user = renderForm()
    await user.click(screen.getByRole('button', { name: 'المستوى التالي' }))

    await user.click(within(screen.getByRole('alert')).getByRole('button', { name: /المدينة/ }))

    expect(screen.getByLabelText(/المدينة/)).toHaveFocus()
  })
})

describe('sending: what the server says', () => {
  it('422 with several errors: goes back to the level that has them, marks each field, keeps every answer', async () => {
    seedDraft()
    submit.mockRejectedValueOnce(
      laravel(422, {
        success: false,
        message: 'Validation failed.',
        errors: {
          email: ['The email field must be a valid email address.'],
          phone: ['The phone field is required.'],
          agree_terms: ['The agree terms field must be accepted.'],
        },
      }),
    )
    const user = renderForm()
    await walkToTheLastLevel(user)

    await user.click(sendButton())

    expect(await screen.findByRole('heading', { level: 2, name: 'البيانات الشخصية' })).toBeInTheDocument()
    const summary = screen.getByRole('alert')
    expect(within(summary).getByText('يوجد 3 حقول تحتاج إلى تصحيح')).toBeInTheDocument()
    expect(within(summary).getByText('البريد الإلكتروني غير صالح. اكتبه بالشكل name@example.com.')).toBeInTheDocument()
    expect(within(summary).getByText('يرجى إدخال رقم الجوال مع مفتاح الدولة.')).toBeInTheDocument()

    // the phone comes before the email on the form, so the cursor goes there first
    await waitFor(() => expect(screen.getByLabelText(/رقم الجوال/)).toHaveFocus())
    const email = screen.getByLabelText(/البريد الإلكتروني/)
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText(/رقم الجوال/)).toHaveAttribute('aria-invalid', 'true')
    // nothing the person entered was lost
    expect(email).toHaveValue('ahmed@example.com')
    expect(screen.getByLabelText(/رقم الجوال/)).toHaveValue('+967 770000000')
    expect(screen.getByLabelText(/الاسم الرباعي/)).toHaveValue('أحمد محمد عبدالله السالم')
    expect(toastError).not.toHaveBeenCalled()
  })

  it('500: one safe sentence with a way to try again, nothing marked red, every answer kept', async () => {
    seedDraft()
    submit
      .mockRejectedValueOnce(laravel(500, { message: "SQLSTATE[23000]: Column 'motivation' cannot be null" }))
      .mockResolvedValueOnce(undefined)
    const user = renderForm()
    await walkToTheLastLevel(user)

    await user.click(sendButton())

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText(/خلل مؤقت في الخادم/)).toBeInTheDocument()
    expect(within(alert).getByText('HTTP 500')).toBeInTheDocument()
    expect(alert.textContent).not.toMatch(/SQL|motivation/)
    expect(document.querySelector('[aria-invalid="true"]')).toBeNull()
    expect(screen.getByRole('heading', { level: 2, name: 'التوقعات والإدارات' })).toBeInTheDocument()
    expect(toastError).not.toHaveBeenCalled()

    // trying again with the same data works, and only then is success shown
    expect(screen.queryByText(/تم استلام طلب التطوع/)).not.toBeInTheDocument()
    await user.click(within(alert).getByRole('button', { name: 'إعادة المحاولة' }))
    expect(await screen.findByText(/تم استلام طلب التطوع/)).toBeInTheDocument()
    expect(submit).toHaveBeenCalledTimes(2)
  })

  it('network failure: says the data is safe and offers another try', async () => {
    seedDraft()
    submit.mockRejectedValueOnce(new AxiosError('Network Error', 'ERR_NETWORK'))
    const user = renderForm()
    await walkToTheLastLevel(user)

    await user.click(sendButton())

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText(/تعذّر الوصول إلى الخادم/)).toBeInTheDocument()
    expect(within(alert).getByRole('button', { name: 'إعادة المحاولة' })).toBeInTheDocument()
    expect(localStorage.getItem(DRAFT_KEY)).not.toBeNull()
  })

  it('429: tells the person to wait', async () => {
    seedDraft()
    submit.mockRejectedValueOnce(laravel(429, { message: 'Too many requests. Please slow down and try again.' }))
    const user = renderForm()
    await walkToTheLastLevel(user)

    await user.click(sendButton())

    expect(await screen.findByText(/انتظر دقيقة/)).toBeInTheDocument()
  })

  it('409: a conflict is explained, not hidden behind a generic line', async () => {
    seedDraft()
    submit.mockRejectedValueOnce(laravel(409, { message: 'لقد قدّمت طلباً بهذا البريد من قبل.' }))
    const user = renderForm()
    await walkToTheLastLevel(user)

    await user.click(sendButton())

    expect(await screen.findByText('لقد قدّمت طلباً بهذا البريد من قبل.')).toBeInTheDocument()
  })
})

describe('sending: pressing the button', () => {
  it('sends once however many times it is pressed, and shows that it is working', async () => {
    seedDraft()
    let finish: () => void = () => undefined
    submit.mockImplementation(() => new Promise<void>((resolve) => (finish = resolve)))
    const user = renderForm()
    await walkToTheLastLevel(user)

    const button = sendButton()
    await user.click(button)
    await user.click(button)
    await user.click(button)

    expect(submit).toHaveBeenCalledTimes(1)
    expect(sendButton()).toBeDisabled()
    expect(sendButton()).toHaveAttribute('aria-busy', 'true')
    expect(sendButton()).toHaveTextContent('جارٍ إرسال الطلب')
    expect(screen.queryByText(/تم استلام طلب التطوع/)).not.toBeInTheDocument()

    finish()
    expect(await screen.findByText(/تم استلام طلب التطوع/)).toBeInTheDocument()
  })

  it('shows success only after the server accepted it, and forgets the saved draft then', async () => {
    seedDraft()
    submit.mockResolvedValueOnce(undefined)
    const user = renderForm()
    await walkToTheLastLevel(user)
    expect(localStorage.getItem(DRAFT_KEY)).not.toBeNull()

    await user.click(sendButton())

    expect(await screen.findByText(/تم استلام طلب التطوع/)).toBeInTheDocument()
    expect(screen.getByText('ahmed@example.com')).toBeInTheDocument()
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull()
    expect(toastError).not.toHaveBeenCalled()
  })

  it('does not even try to send while a level still has a problem', async () => {
    seedDraft({ agree_terms: false })
    const user = renderForm()
    await walkToTheLastLevel(user)

    await user.click(sendButton())

    expect(submit).not.toHaveBeenCalled()
    expect(await screen.findAllByText('يرجى الموافقة على استخدام البيانات قبل إرسال الطلب.')).not.toHaveLength(0)
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true')
    await waitFor(() => expect(screen.getByRole('checkbox')).toHaveFocus())
  })
})

describe('the optional profile questions: languages, bio, LinkedIn, professional-profile consent', () => {
  async function goToLevel3(user: ReturnType<typeof userEvent.setup>) {
    for (const title of ['المؤهلات والتفرغ', 'الخبرات والقدرات']) {
      await user.click(screen.getByRole('button', { name: 'المستوى التالي' }))
      expect(await screen.findByRole('heading', { level: 2, name: title })).toBeInTheDocument()
    }
  }

  const consentGroup = () => screen.getByRole('radiogroup', { name: /هل توافق على عرض بياناتك المهنية/ })

  it('the first three are on level 3 and the consent on level 5, all marked optional and none blocking', async () => {
    seedDraft()
    const user = renderForm()
    await goToLevel3(user)

    expect(screen.getByRole('combobox', { name: /اللغات/ })).toBeInTheDocument()
    expect(screen.getByLabelText(/نبذة تعريفية عنك/)).toBeInTheDocument()
    expect(screen.getByLabelText(/رابط LinkedIn/)).toHaveAttribute('dir', 'ltr')
    expect(screen.getAllByText('اختياري').length).toBeGreaterThanOrEqual(3)

    // left empty: the level is accepted
    await user.click(screen.getByRole('button', { name: 'المستوى التالي' }))
    await user.click(screen.getByRole('button', { name: 'المستوى التالي' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'التوقعات والإدارات' })).toBeInTheDocument()

    // the consent: two answers, NEITHER preselected
    const radios = within(consentGroup()).getAllByRole('radio')
    expect(radios.map((r) => r.textContent)).toEqual(['نعم، أوافق', 'لا، لا أوافق'])
    for (const radio of radios) expect(radio).toHaveAttribute('aria-checked', 'false')
  })

  it('an untouched form sends nothing for them: no invented «no», no empty strings', async () => {
    seedDraft()
    submit.mockResolvedValueOnce(undefined)
    const user = renderForm()
    await walkToTheLastLevel(user)

    await user.click(sendButton())

    expect(await screen.findByText(/تم استلام طلب التطوع/)).toBeInTheDocument()
    const payload = submit.mock.calls[0][0] as Record<string, unknown>
    expect(payload.professional_profile_consent).toBeNull()
    expect(payload.languages).toEqual([])
    expect(payload.professional_bio).toBeNull()
    expect(payload.linkedin_url).toBeNull()
  })

  it('answers are sent: languages, bio, a bare LinkedIn address completed with https://, and the consent', async () => {
    seedDraft()
    submit.mockResolvedValueOnce(undefined)
    const user = renderForm()
    await goToLevel3(user)

    const languages = screen.getByRole('combobox', { name: /اللغات/ })
    await user.click(languages)
    await user.type(languages, 'العربية{Enter}')
    await user.type(languages, 'الإنجليزية{Enter}')
    await user.type(screen.getByLabelText(/نبذة تعريفية عنك/), '  مصمم مهتم بالعمل المجتمعي ')
    await user.type(screen.getByLabelText(/رابط LinkedIn/), 'linkedin.com/in/ali-hasan')

    await user.click(screen.getByRole('button', { name: 'المستوى التالي' }))
    await user.click(screen.getByRole('button', { name: 'المستوى التالي' }))
    await user.click(within(consentGroup()).getByRole('radio', { name: 'نعم، أوافق' }))
    expect(within(consentGroup()).getByRole('radio', { name: 'نعم، أوافق' })).toHaveAttribute('aria-checked', 'true')

    await user.click(sendButton())

    expect(await screen.findByText(/تم استلام طلب التطوع/)).toBeInTheDocument()
    const payload = submit.mock.calls[0][0] as Record<string, unknown>
    expect(payload.languages).toEqual(['العربية', 'الإنجليزية'])
    expect(payload.professional_bio).toBe('مصمم مهتم بالعمل المجتمعي')
    expect(payload.linkedin_url).toBe('https://linkedin.com/in/ali-hasan')
    expect(payload.professional_profile_consent).toBe(true)
  })

  it('an explicit «لا» is sent as false, which is different from not answering', async () => {
    seedDraft({ professional_profile_consent: false })
    submit.mockResolvedValueOnce(undefined)
    const user = renderForm()
    await walkToTheLastLevel(user)

    expect(within(consentGroup()).getByRole('radio', { name: 'لا، لا أوافق' })).toHaveAttribute('aria-checked', 'true')
    await user.click(sendButton())

    await screen.findByText(/تم استلام طلب التطوع/)
    expect((submit.mock.calls[0][0] as Record<string, unknown>).professional_profile_consent).toBe(false)
  })

  it('the bio stops at 500 characters and counts them', async () => {
    seedDraft()
    const user = renderForm()
    await goToLevel3(user)

    const bio = screen.getByLabelText(/نبذة تعريفية عنك/)
    expect(bio).toHaveAttribute('maxlength', '500')
    expect(screen.getByTestId('professional-bio-counter')).toHaveTextContent('0 / 500')

    await user.type(bio, 'أحمد')
    expect(screen.getByTestId('professional-bio-counter')).toHaveTextContent('4 / 500')
  })

  it('a bio over the limit (an old saved draft) is refused with a message, at its field', async () => {
    seedDraft({ professional_bio: 'ا'.repeat(501) })
    const user = renderForm()
    await goToLevel3(user)

    await user.click(screen.getByRole('button', { name: 'المستوى التالي' }))

    const summary = await screen.findByRole('alert')
    expect(within(summary).getByText('النبذة التعريفية لا تزيد عن 500 حرفًا.')).toBeInTheDocument()
    expect(screen.getByLabelText(/نبذة تعريفية عنك/)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('heading', { level: 2, name: 'الخبرات والقدرات' })).toBeInTheDocument()
  })

  it('a LinkedIn value that is not a web address is refused; a javascript: link never passes', async () => {
    seedDraft()
    const user = renderForm()
    await goToLevel3(user)

    const input = screen.getByLabelText(/رابط LinkedIn/)
    await user.type(input, 'javascript:alert(1)')
    await user.click(screen.getByRole('button', { name: 'المستوى التالي' }))

    const summary = await screen.findByRole('alert')
    expect(within(summary).getByText(/رابط LinkedIn غير صالح/)).toBeInTheDocument()
    expect(input).toHaveAttribute('aria-invalid', 'true')
    await waitFor(() => expect(input).toHaveFocus())

    // fixing it clears the message and lets the person go on
    await user.clear(input)
    await user.type(input, 'https://www.linkedin.com/in/ali')
    expect(input).not.toHaveAttribute('aria-invalid')
    await user.click(screen.getByRole('button', { name: 'المستوى التالي' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'الدافعية والجدية' })).toBeInTheDocument()
  })

  it('a server error on one of them lands on that field', async () => {
    seedDraft({ linkedin_url: 'https://www.linkedin.com/in/ali' })
    submit.mockRejectedValueOnce(laravel(422, { message: 'Validation failed.', errors: { linkedin_url: ['The linkedin url field must be a valid URL.'] } }))
    const user = renderForm()
    await walkToTheLastLevel(user)

    await user.click(sendButton())

    expect(await screen.findByRole('heading', { level: 2, name: 'الخبرات والقدرات' })).toBeInTheDocument()
    const summary = screen.getByRole('alert')
    expect(within(summary).getByText('يرجى مراجعة رابط LinkedIn.')).toBeInTheDocument()
    expect(screen.getByLabelText(/رابط LinkedIn/)).toHaveAttribute('aria-invalid', 'true')
  })
})

describe('the optional profile questions: server rules mirrored, label focus, taking an answer back', () => {
  async function goToLevel3(user: ReturnType<typeof userEvent.setup>) {
    for (const title of ['المؤهلات والتفرغ', 'الخبرات والقدرات']) {
      await user.click(screen.getByRole('button', { name: 'المستوى التالي' }))
      expect(await screen.findByRole('heading', { level: 2, name: title })).toBeInTheDocument()
    }
  }
  const next = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('button', { name: 'المستوى التالي' }))
  const consentGroup = () => screen.getByRole('radiogroup', { name: /هل توافق على عرض بياناتك المهنية/ })
  const HTML_MESSAGE = 'لا يُسمح بإدخال وسوم HTML في هذا الحقل.'

  it('a bio with a real HTML tag is refused with the server’s sentence, once beside the field and once in the list', async () => {
    seedDraft({ professional_bio: 'مرحبا <b>بكم</b>' })
    const user = renderForm()
    await goToLevel3(user)

    await next(user)

    expect(await screen.findAllByText(HTML_MESSAGE)).toHaveLength(2)
    expect(screen.getByLabelText(/نبذة تعريفية عنك/)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('heading', { level: 2, name: 'الخبرات والقدرات' })).toBeInTheDocument()
  })

  it('the hint says plain text only', async () => {
    seedDraft()
    const user = renderForm()
    await goToLevel3(user)

    expect(screen.getByText(/لا تُقبل وسوم HTML/)).toBeInTheDocument()
    expect(screen.getByLabelText(/نبذة تعريفية عنك/)).toHaveAccessibleDescription(/لا تُقبل وسوم HTML/)
  })

  it('a «<» that is not a tag is fine: «I <3 volunteering» and «أقل من <5 سنوات»', async () => {
    seedDraft({ professional_bio: 'I <3 volunteering، أقل من <5 سنوات و 2 < 3' })
    const user = renderForm()
    await goToLevel3(user)

    await next(user)

    expect(await screen.findByRole('heading', { level: 2, name: 'الدافعية والجدية' })).toBeInTheDocument()
  })

  it('languages: more than 20, an over-long name, a tag, or the same language twice (ignoring case) are refused, and the message is shown ONCE per place', async () => {
    seedDraft({ languages: ['English', 'english'] })
    const user = renderForm()
    await goToLevel3(user)

    await next(user)

    // one in the list at the top, one beside the field: never a third one inside the select
    expect(await screen.findAllByText('لا يمكن اختيار نفس اللغة أكثر من مرة')).toHaveLength(2)
    expect(screen.getByRole('combobox', { name: /اللغات/ })).toHaveAttribute('aria-invalid', 'true')
  })

  it.each([
    ['too many', Array.from({ length: 21 }, (_, i) => `لغة ${i + 1}`), 'لا يمكن اختيار أكثر من 20 لغة.'],
    ['too long', ['ل'.repeat(51)], 'كل لغة يجب أن تكون نصًا لا يتجاوز 50 حرفًا.'],
  ])('languages: %s', async (_name, languages, message) => {
    seedDraft({ languages })
    const user = renderForm()
    await goToLevel3(user)

    await next(user)

    expect(await screen.findAllByText(message)).toHaveLength(2)
  })

  it('the label focuses the languages select, and so does the error list', async () => {
    seedDraft({ languages: ['English', 'english'] })
    const user = renderForm()
    await goToLevel3(user)

    await user.click(screen.getByText('اللغات التي تتحدثها'))
    expect(screen.getByRole('combobox', { name: /اللغات/ })).toHaveFocus()

    // moving to the field from the error list (and automatically after a refused «next») lands on the select
    await user.click(screen.getByRole('textbox', { name: /رابط LinkedIn/ }))
    await next(user)
    await waitFor(() => expect(screen.getByRole('combobox', { name: /اللغات/ })).toHaveFocus())
  })

  it('the consent can be taken back: pressing the chosen answer again returns it to «not answered», in the form and in the saved draft', async () => {
    seedDraft()
    submit.mockResolvedValueOnce(undefined)
    const user = renderForm()
    await walkToTheLastLevel(user)

    const yes = () => within(consentGroup()).getByRole('radio', { name: 'نعم، أوافق' })
    await user.click(yes())
    expect(yes()).toHaveAttribute('aria-checked', 'true')
    await waitFor(() => expect(JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '{}').professional_profile_consent).toBe(true))

    await user.click(yes())
    expect(yes()).toHaveAttribute('aria-checked', 'false')
    expect(within(consentGroup()).getByRole('radio', { name: 'لا، لا أوافق' })).toHaveAttribute('aria-checked', 'false')
    await waitFor(() => expect(JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '{}').professional_profile_consent).toBeNull())

    await user.click(sendButton())
    await screen.findByText(/تم استلام طلب التطوع/)
    expect((submit.mock.calls[0][0] as Record<string, unknown>).professional_profile_consent).toBeNull()
  })

  it('«مسح الاختيار» appears only once answered and clears it', async () => {
    seedDraft({ professional_profile_consent: false })
    const user = renderForm()
    await walkToTheLastLevel(user)

    await user.click(screen.getByRole('button', { name: 'مسح الاختيار' }))

    for (const radio of within(consentGroup()).getAllByRole('radio')) expect(radio).toHaveAttribute('aria-checked', 'false')
    expect(screen.queryByRole('button', { name: 'مسح الاختيار' })).not.toBeInTheDocument()
  })
})
