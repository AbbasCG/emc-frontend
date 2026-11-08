import { describe, expect, it } from 'vitest'
import {
  COMMITMENT_STATEMENTS,
  MOTIVATION_STATEMENTS,
  SITUATIONAL_QUESTIONS,
} from '@/components/volunteerOpportunities/volunteerFormSpec'
import { COUNTRIES } from '@/components/ui/CountrySelector'
import { FIELD_STEP, initialVolunteerForm, type VolunteerFormState } from '@/lib/volunteerApply/formModel'
import {
  MESSAGES,
  isPlausiblePhone,
  orderedErrorFields,
  validateVolunteerForm,
  validateVolunteerStep,
} from '@/lib/volunteerApply/validation'

/** An application that passes every level. */
function complete(over: Partial<VolunteerFormState> = {}): VolunteerFormState {
  const rate = (statements: ReadonlyArray<{ id: string }>) => Object.fromEntries(statements.map((s) => [s.id, 4]))

  return {
    ...initialVolunteerForm,
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
  }
}

describe('level 1: who you are', () => {
  it('asks for every required field when they are empty', () => {
    expect(validateVolunteerStep(initialVolunteerForm, 1)).toEqual({
      full_name: 'يرجى إدخال الاسم الرباعي.',
      email: 'يرجى إدخال البريد الإلكتروني.',
      phone: 'يرجى إدخال رقم الجوال مع مفتاح الدولة.',
      country: 'يرجى اختيار بلد الإقامة.',
      city: 'يرجى إدخال المدينة.',
    })
  })

  it('treats a name made of spaces as empty', () => {
    expect(validateVolunteerStep(complete({ full_name: '    ' }), 1).full_name).toBe(MESSAGES.full_name)
  })

  it('refuses an email that cannot be one, and says how to write it', () => {
    for (const bad of ['ahmed', 'ahmed@', 'ahmed@example', 'ahmed example@x.com', '@example.com']) {
      expect(validateVolunteerStep(complete({ email: bad }), 1).email).toBe(MESSAGES.email_invalid)
    }
    expect(validateVolunteerStep(complete({ email: ' ahmed@example.com ' }), 1).email).toBeUndefined()
  })

  it('refuses a phone number that cannot be one, naming the country code', () => {
    for (const bad of ['abc', '12345', '+++967770000000', '0000', '+967 770 abc 000', `+${'9'.repeat(31)}`]) {
      expect(validateVolunteerStep(complete({ phone: bad }), 1).phone).toBe(MESSAGES.phone_invalid)
    }
    expect(MESSAGES.phone_invalid).toContain('مفتاح الدولة')
  })

  it('accepts the ways people write a phone number', () => {
    for (const good of ['+967 770000000', '00967770000000', '+31 6 12345678', '(+966) 50-123-4567', '+٩٦٧٧٧٠٠٠٠٠٠٠', '+۹۶۷۷۷۰۰۰۰۰۰۰']) {
      expect(isPlausiblePhone(good), good).toBe(true)
    }
  })

  it('asks for a country that was never chosen', () => {
    expect(validateVolunteerStep(complete({ country: null }), 1).country).toBe('يرجى اختيار بلد الإقامة.')
  })

  it('has nothing to say about a complete first level', () => {
    expect(validateVolunteerStep(complete(), 1)).toEqual({})
  })
})

describe('the other levels', () => {
  it('asks for the job title only for an employee, and for days only when days are the answer', () => {
    expect(validateVolunteerStep(complete({ current_status: 'موظف', job_title: '' }), 2).job_title).toBe(MESSAGES.job_title)
    expect(validateVolunteerStep(complete({ current_status: 'طالب' }), 2).job_title).toBeUndefined()
    expect(validateVolunteerStep(complete({ volunteer_days_availability: 'أيام الإجازة فقط', volunteer_days: [] }), 2).volunteer_days).toBe(MESSAGES.volunteer_days)
  })

  it('asks for the length of experience only when the person has volunteered before', () => {
    expect(validateVolunteerStep(complete({ has_previous_volunteering: null }), 3).has_previous_volunteering).toBe(MESSAGES.has_previous_volunteering)
    expect(validateVolunteerStep(complete({ has_previous_volunteering: true, volunteering_duration: '' }), 3).volunteering_duration).toBe(MESSAGES.volunteering_duration)
    expect(validateVolunteerStep(complete({ has_previous_volunteering: false }), 3)).toEqual({})
  })

  it('wants every statement rated and every situation answered', () => {
    const errors = validateVolunteerStep(complete({ motivation_ratings: {}, commitment_ratings: {}, situational_responses: {} }), 4)
    expect(Object.keys(errors).sort()).toEqual(['commitment_ratings', 'motivation_ratings', 'situational_responses'])
  })

  it('asks for the consent in words a person understands', () => {
    expect(validateVolunteerStep(complete({ agree_terms: false }), 5).agree_terms).toBe('يرجى الموافقة على استخدام البيانات قبل إرسال الطلب.')
    expect(validateVolunteerStep(complete({ primary_value_department: '' }), 5).primary_value_department).toBe(MESSAGES.primary_value_department)
  })
})

describe('the whole application', () => {
  it('is complete when every level is', () => {
    expect(validateVolunteerForm(complete())).toEqual({ errors: {}, firstStep: null })
  })

  it('finds a problem on an earlier level when sending, and says which level', () => {
    const { errors, firstStep } = validateVolunteerForm(complete({ email: 'not-an-email', agree_terms: false }))

    expect(firstStep).toBe(1)
    expect(errors.email).toBe(MESSAGES.email_invalid)
    expect(errors.agree_terms).toBe(MESSAGES.agree_terms)
  })

  it('lists the problems in the order the form asks the questions', () => {
    const { errors } = validateVolunteerForm(initialVolunteerForm)
    const ordered = orderedErrorFields(errors)

    expect(ordered[0]).toBe('full_name')
    expect(ordered.map((key) => FIELD_STEP[key])).toEqual([...ordered.map((key) => FIELD_STEP[key])].sort((a, b) => a - b))
    expect(ordered.at(-1)).toBe('agree_terms')
  })

  it('keeps everything the person typed', () => {
    const form = complete({ email: 'bad', notes: 'ملاحظة طويلة' })
    const before = JSON.stringify(form)

    validateVolunteerForm(form)

    expect(JSON.stringify(form)).toBe(before)
  })
})
