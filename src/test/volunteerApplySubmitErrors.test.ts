import { AxiosError, type AxiosResponseHeaders } from 'axios'
import { describe, expect, it } from 'vitest'
import { serverFieldToFormField } from '@/lib/volunteerApply/formModel'
import { classifySubmitError, translateServerMessage } from '@/lib/volunteerApply/submitErrors'

function response(status: number, data: unknown, headers: Record<string, string> = {}): AxiosError {
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    statusText: '',
    data,
    headers: headers as unknown as AxiosResponseHeaders,
    config: {} as never,
  })
}

function noResponse(code: string, message = 'Network Error'): AxiosError {
  return new AxiosError(message, code)
}

const HAS_LATIN_SENTENCE = /[A-Za-z]{3,} [A-Za-z]{3,}/

describe('a 422 from Laravel with several errors', () => {
  const error = response(422, {
    success: false,
    message: 'Validation failed.',
    errors: {
      email: ['The email field must be a valid email address.'],
      phone: ['The phone field is required.'],
      full_name: ['The full name field must not be greater than 255 characters.'],
      'volunteer_days.0': ['The volunteer_days.0 field must be a string.'],
      cv_file: ['The cv file field must be a file of type: pdf.'],
      desired_department: ['The desired department field is required.'],
      agree_terms: ['The agree terms field must be accepted.'],
      opportunity_id: ['للتقديم على فرصة تطوعية محددة استخدم صفحة الفرصة نفسها.'],
      something_new: ['The something new field is invalid.'],
    },
  })
  const failure = classifySubmitError(error)

  it('ties every message to the field the form shows', () => {
    expect(failure.kind).toBe('validation')
    expect(Object.keys(failure.fieldErrors).sort()).toEqual(
      ['agree_terms', 'cv_file', 'email', 'full_name', 'phone', 'primary_value_department', 'volunteer_days'].sort(),
    )
  })

  it('writes each one in Arabic, naming the field', () => {
    expect(failure.fieldErrors.email).toBe('البريد الإلكتروني غير صالح. اكتبه بالشكل name@example.com.')
    expect(failure.fieldErrors.phone).toBe('يرجى إدخال رقم الجوال مع مفتاح الدولة.')
    expect(failure.fieldErrors.full_name).toBe('الاسم الرباعي أطول من الحد المسموح (255 حرفاً).')
    expect(failure.fieldErrors.agree_terms).toBe('يرجى الموافقة على استخدام البيانات قبل إرسال الطلب.')
    expect(failure.fieldErrors.cv_file).toContain('PDF')
    for (const message of Object.values(failure.fieldErrors)) expect(message).not.toMatch(HAS_LATIN_SENTENCE)
  })

  it('maps the fields the form fills from other answers to the answer the person gave', () => {
    expect(failure.fieldErrors.primary_value_department).toBe('يرجى تحديد الإدارة الأنسب لمهاراتك.')
    expect(serverFieldToFormField('skills')).toBe('personal_skills')
    expect(serverFieldToFormField('availability')).toBe('volunteer_days_availability')
    expect(serverFieldToFormField('previous_experience')).toBe('volunteering_organizations')
  })

  it('maps a message about one item of a list to the list', () => {
    expect(failure.fieldErrors.volunteer_days).toBeDefined()
    expect(serverFieldToFormField('motivation_ratings.q1')).toBe('motivation_ratings')
  })

  it('keeps a message about something the form has no field for, once, in Arabic', () => {
    expect(failure.unmapped).toContain('للتقديم على فرصة تطوعية محددة استخدم صفحة الفرصة نفسها.')
    expect(failure.unmapped.join(' ')).not.toMatch(HAS_LATIN_SENTENCE)
  })

  it('is not worth retrying unchanged', () => {
    expect(failure.retryable).toBe(false)
  })
})

describe('a 422 with nothing the form can place', () => {
  it('still says what to do', () => {
    const failure = classifySubmitError(response(422, { message: 'Validation failed.' }))

    expect(failure.kind).toBe('validation')
    expect(failure.fieldErrors).toEqual({})
    expect(failure.message).toContain('راجع')
  })
})

describe('other answers from the server', () => {
  it('409: uses the server sentence when it is Arabic, otherwise explains the conflict', () => {
    expect(classifySubmitError(response(409, { message: 'لقد قدّمت على هذه الفرصة مسبقًا.' })).message).toBe('لقد قدّمت على هذه الفرصة مسبقًا.')

    const generic = classifySubmitError(response(409, { message: 'Duplicate entry' }))
    expect(generic.kind).toBe('conflict')
    expect(generic.message).toContain('طلب سابق')
    expect(generic.message).not.toContain('Duplicate')
  })

  it('401 and 419: a session problem, with the data still safe', () => {
    for (const status of [401, 419]) {
      const failure = classifySubmitError(response(status, { message: 'Unauthenticated.' }))
      expect(failure.kind).toBe('session')
      expect(failure.message).toContain('محفوظة')
    }
  })

  it('403: no detail beyond the fact', () => {
    const failure = classifySubmitError(response(403, { message: 'This action is unauthorized for role X.' }))
    expect(failure.kind).toBe('forbidden')
    expect(failure.message).not.toContain('role X')
  })

  it('413: the file is too big', () => {
    expect(classifySubmitError(response(413, '<html>Request Entity Too Large</html>')).message).toContain('5 ميجابايت')
  })

  it('429: too many attempts, with the wait when the server gives it', () => {
    const plain = classifySubmitError(response(429, { message: 'Too many requests. Please slow down and try again.' }))
    expect(plain.kind).toBe('rate_limit')
    expect(plain.message).toContain('انتظر دقيقة')
    expect(plain.retryable).toBe(true)

    expect(classifySubmitError(response(429, {}, { 'retry-after': '37' })).message).toContain('انتظر 37 ثانية')
  })

  it('500: a safe sentence, never the server text, never SQL or a trace', () => {
    const leaks = [
      { message: 'SQLSTATE[23000]: Integrity constraint violation: 1048 Column \'motivation\' cannot be null (Connection: mysql, SQL: insert into `volunteer_requests`)' },
      { message: 'Server Error', exception: 'Illuminate\\Database\\QueryException', trace: [{ file: '/var/www/app/Http/Controllers/X.php', line: 12 }] },
      '<html><body>Whoops, looks like something went wrong.</body></html>',
    ]
    for (const body of leaks) {
      const failure = classifySubmitError(response(500, body))
      expect(failure.kind).toBe('server')
      expect(failure.retryable).toBe(true)
      expect(failure.reference).toBe('HTTP 500')
      expect(failure.message).toContain('بياناتك')
      expect(failure.message).not.toMatch(/SQL|Illuminate|\/var\/www|Whoops|motivation|volunteer_requests/)
    }
  })

  it('502, 503 and 504 are treated like any server fault', () => {
    for (const status of [502, 503, 504]) expect(classifySubmitError(response(status, '')).kind).toBe('server')
  })
})

describe('when no answer comes back', () => {
  it('a network failure says the data is safe and offers another try', () => {
    const failure = classifySubmitError(noResponse('ERR_NETWORK'), { online: true })

    expect(failure.kind).toBe('network')
    expect(failure.retryable).toBe(true)
    expect(failure.message).toContain('بياناتك محفوظة')
  })

  it('mentions the CV only when one was attached', () => {
    expect(classifySubmitError(noResponse('ERR_NETWORK'), { online: true, hasAttachment: true }).message).toContain('سيرة ذاتية')
    expect(classifySubmitError(noResponse('ERR_NETWORK'), { online: true, hasAttachment: false }).message).not.toContain('سيرة ذاتية')
  })

  it('a timeout is not called a network failure', () => {
    const failure = classifySubmitError(noResponse('ECONNABORTED', 'timeout of 60000ms exceeded'))

    expect(failure.kind).toBe('timeout')
    expect(failure.message).toContain('وقتاً أطول')
  })

  it('being offline is said as it is', () => {
    expect(classifySubmitError(noResponse('ERR_NETWORK'), { online: false }).kind).toBe('offline')
  })

  it('an error that is not from the network at all still gives a way forward', () => {
    const failure = classifySubmitError(new TypeError('x is undefined'))

    expect(failure.kind).toBe('unknown')
    expect(failure.message).toContain('أعد المحاولة')
    expect(failure.message).not.toContain('undefined')
  })
})

describe('translating one server message', () => {
  it('leaves an Arabic message as the server wrote it', () => {
    expect(translateServerMessage('email', 'صيغة غير صحيحة')).toBe('صيغة غير صحيحة')
  })

  it('never returns the English message', () => {
    for (const message of [
      'The selected education level is invalid.',
      'The birth date field must be a valid date.',
      'The notes field must be at least 5 characters.',
      'Something nobody planned for.',
    ]) {
      expect(translateServerMessage('notes', message)).not.toMatch(HAS_LATIN_SENTENCE)
    }
  })
})
