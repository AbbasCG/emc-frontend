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
