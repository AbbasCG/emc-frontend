import { describe, it, expect } from 'vitest'
import {
  getLaravelFieldErrors,
  translateLaravelFieldMessage,
  withArabicValidationMessages,
  getApiErrorMessage,
} from '@/api/apiErrors'

/**
 * apiErrors is a pure module built on the real `axios.isAxiosError` guard,
 * which recognizes any object carrying `isAxiosError: true`. Fixtures below
 * reproduce the exact runtime shape axios errors have — no mocking needed.
 */
type AxiosLikeError = {
  isAxiosError: true
  response?: { status?: number; data?: unknown }
  config?: { url?: string }
}

function axiosErr(
  status: number | undefined,
  data: unknown,
  url?: string,
): AxiosLikeError {
  return {
    isAxiosError: true,
    response: status === undefined && data === undefined ? undefined : { status, data },
    config: { url },
  }
}

/* ── getLaravelFieldErrors ─────────────────────────────────────────── */

describe('getLaravelFieldErrors', () => {
  it('returns {} for non-axios errors', () => {
    expect(getLaravelFieldErrors(new Error('boom'))).toEqual({})
    expect(getLaravelFieldErrors(null)).toEqual({})
    expect(getLaravelFieldErrors('nope')).toEqual({})
  })

  it('returns {} when the response has no errors object', () => {
    expect(getLaravelFieldErrors(axiosErr(422, { message: 'invalid' }))).toEqual({})
    expect(getLaravelFieldErrors(axiosErr(422, undefined))).toEqual({})
    expect(getLaravelFieldErrors(axiosErr(undefined, undefined))).toEqual({})
  })

  it('returns {} when errors is not an object', () => {
    expect(getLaravelFieldErrors(axiosErr(422, { errors: 'العنوان مطلوب' }))).toEqual({})
  })

  it('takes the first message of an array and accepts bare string values', () => {
    const err = axiosErr(422, {
      errors: {
        title: ['العنوان مطلوب', 'العنوان قصير جداً'],
        email: 'البريد غير صالح',
      },
    })
    expect(getLaravelFieldErrors(err)).toEqual({
      title: 'العنوان مطلوب',
      email: 'البريد غير صالح',
    })
  })

  it('skips empty arrays and empty strings', () => {
    const err = axiosErr(422, { errors: { a: [], b: '', c: ['رسالة'] } })
    expect(getLaravelFieldErrors(err)).toEqual({ c: 'رسالة' })
  })

  it('copies dotted keys (learning_outcomes.0) onto the base key for form display', () => {
    const err = axiosErr(422, {
      errors: { 'learning_outcomes.0': ['المخرج طويل جداً'] },
    })
    const out = getLaravelFieldErrors(err)
    expect(out['learning_outcomes.0']).toBe('المخرج طويل جداً')
    expect(out['learning_outcomes']).toBe('المخرج طويل جداً')
  })

  it('never overwrites an existing base-key message with a dotted one', () => {
    const err = axiosErr(422, {
      errors: {
        requirements: ['رسالة القاعدة'],
        'requirements.2': ['رسالة العنصر'],
      },
    })
    const out = getLaravelFieldErrors(err)
    expect(out['requirements']).toBe('رسالة القاعدة')
    expect(out['requirements.2']).toBe('رسالة العنصر')
  })
})

/* ── translateLaravelFieldMessage ──────────────────────────────────── */

describe('translateLaravelFieldMessage', () => {
  it('returns the empty string untouched (whitespace-only input trims to empty)', () => {
    expect(translateLaravelFieldMessage('')).toBe('')
    expect(translateLaravelFieldMessage('   ')).toBe('')
  })

  it('maps type errors to نوع البيانات غير صحيح.', () => {
    expect(translateLaravelFieldMessage('The title must be a string.')).toBe('نوع البيانات غير صحيح.')
    expect(translateLaravelFieldMessage('The tags must be an array.')).toBe('نوع البيانات غير صحيح.')
  })

  it('maps image errors to الصورة غير صالحة.', () => {
    expect(translateLaravelFieldMessage('The avatar must be an image.')).toBe('الصورة غير صالحة.')
    expect(translateLaravelFieldMessage('The image could not be processed.')).toBe('الصورة غير صالحة.')
  })

  it('maps required-field and generic invalid-data messages to الحقل مطلوب.', () => {
    expect(translateLaravelFieldMessage('The name field is required.')).toBe('الحقل مطلوب.')
    expect(translateLaravelFieldMessage('The given data was invalid.')).toBe('الحقل مطلوب.')
  })

  it('maps "selected ... invalid" before the status-specific branch', () => {
    expect(translateLaravelFieldMessage('The selected status is invalid.')).toBe(
      'القيمة المختارة غير مقبولة من الخادم.',
    )
  })

  it('maps "validation ... selected" (without "invalid") to its own copy', () => {
    expect(translateLaravelFieldMessage('Validation failed for the selected item.')).toBe(
      'القيمة المحدّدة غير صالحة.',
    )
  })

  it('maps "status ... invalid" (without "selected") to حالة النشر غير صحيحة.', () => {
    expect(translateLaravelFieldMessage('The status is invalid.')).toBe('حالة النشر غير صحيحة.')
  })

  it('maps field-specific 500/255 length messages before the generic length branch', () => {
    expect(
      translateLaravelFieldMessage('The learning_outcomes.0 must not be greater than 500 characters.'),
    ).toBe('كل مخرج تعليمي يجب ألا يتجاوز 500 حرف')
    expect(
      translateLaravelFieldMessage('The requirements.1 must not be greater than 500 characters.'),
    ).toBe('كل متطلب يجب ألا يتجاوز 500 حرف')
    expect(
      translateLaravelFieldMessage('The curriculum_topics.0 must not be greater than 500 characters.'),
    ).toBe('كل محور يجب ألا يتجاوز 500 حرف')
    expect(
      translateLaravelFieldMessage('The features.0 may not be greater than 255 characters.'),
    ).toBe('كل نقطة يجب ألا تتجاوز 255 حرفاً')
  })

  it('generic length branch picks the Arabic copy by max: 500 / 255 / 100 / fallback', () => {
    expect(translateLaravelFieldMessage('The bio must not be greater than 500 characters.')).toBe(
      'كل عنصر يجب ألا يتجاوز 500 حرف',
    )
    expect(translateLaravelFieldMessage('The note may not be greater than 255 characters.')).toBe(
      'كل نقطة يجب ألا تتجاوز 255 حرفاً',
    )
    expect(translateLaravelFieldMessage('The keyword must not be greater than 100 characters.')).toBe(
      'كل كلمة مفتاحية يجب ألا تتجاوز 100 حرف',
    )
    expect(translateLaravelFieldMessage('The title must not be greater than 80 characters.')).toBe(
      'النص أطول من الحد المسموح',
    )
    // Non-character max (numeric rule) — no "N characters" match → generic copy
    expect(translateLaravelFieldMessage('The count must not be greater than 10.')).toBe(
      'النص أطول من الحد المسموح',
    )
  })

  it('passes unknown / already-Arabic messages through trimmed', () => {
    expect(translateLaravelFieldMessage('  هذه رسالة عربية جاهزة  ')).toBe('هذه رسالة عربية جاهزة')
    expect(translateLaravelFieldMessage('Something unexpected happened')).toBe(
      'Something unexpected happened',
    )
  })
})

/* ── withArabicValidationMessages ──────────────────────────────────── */

describe('withArabicValidationMessages', () => {
  it('translates every value while keeping keys', () => {
    const out = withArabicValidationMessages({
      title: 'The title field is required.',
      note: 'رسالة عربية',
    })
    expect(out).toEqual({ title: 'الحقل مطلوب.', note: 'رسالة عربية' })
  })

  it('returns an empty object for empty input', () => {
    expect(withArabicValidationMessages({})).toEqual({})
  })
})

/* ── getApiErrorMessage ────────────────────────────────────────────── */

describe('getApiErrorMessage', () => {
  const FALLBACK = 'حدث خطأ غير متوقع. حاول مرة أخرى.'

  it('uses the message of a plain (non-axios) Error', () => {
    expect(getApiErrorMessage(new Error('Network Error'))).toBe('Network Error')
  })

  it('falls back for a non-axios value without a usable message', () => {
    expect(getApiErrorMessage(new Error(''))).toBe(FALLBACK)
    expect(getApiErrorMessage(null)).toBe(FALLBACK)
    expect(getApiErrorMessage('nope')).toBe(FALLBACK)
  })

  it('422: prefers the first field message and translates known English copies', () => {
    const err = axiosErr(422, {
      message: 'The given data was invalid.',
      errors: { name: ['The name field is required.'] },
    })
    expect(getApiErrorMessage(err)).toBe('الحقل مطلوب.')
  })

  it('422: passes through an Arabic field message untouched', () => {
    const err = axiosErr(422, { errors: { level: ['المستوى غير متاح'] } })
    expect(getApiErrorMessage(err)).toBe('المستوى غير متاح')
  })

  it('422: skips empty entries and accepts a string-valued field error', () => {
    const err = axiosErr(422, { errors: { a: [], b: 'قيمة خاطئة' } })
    expect(getApiErrorMessage(err)).toBe('قيمة خاطئة')
  })

  it('422: falls back to the generic 422 Arabic copy when errors is truthy but empty', () => {
    const err = axiosErr(422, { errors: {} })
    expect(getApiErrorMessage(err)).toBe('يرجى مراجعة الحقول المطلوبة.')
  })

  it('404 on certificate template/eligibility endpoints gets dedicated Arabic copy', () => {
    expect(getApiErrorMessage(axiosErr(404, {}, '/admin/certificates/templates'))).toBe(
      'تعذر تحميل بيانات الشهادات. تحقق من الاتصال وأعد المحاولة.',
    )
    expect(getApiErrorMessage(axiosErr(404, {}, '/admin/certificates/eligibility'))).toBe(
      'تعذر تحميل بيانات الأهلية. تحقق من الاتصال وأعد المحاولة.',
    )
  })

  it('uses the backend message verbatim when present (trimmed)', () => {
    const err = axiosErr(403, { message: '  لا يمكنك تعديل هذا السجل  ' })
    expect(getApiErrorMessage(err)).toBe('لا يمكنك تعديل هذا السجل')
  })

  it('rewrites the Laravel English 404 sentinel message into the Arabic 404 copy', () => {
    const err = axiosErr(404, { message: 'The requested endpoint does not exist.' }, '/admin/whatever')
    expect(getApiErrorMessage(err)).toBe('لم يتم العثور على البيانات.')
  })

  it('maps bare statuses through the Arabic status table', () => {
    expect(getApiErrorMessage(axiosErr(401, {}))).toBe('يجب تسجيل الدخول أولًا.')
    expect(getApiErrorMessage(axiosErr(403, {}))).toBe('لا تملك صلاحية الوصول.')
    expect(getApiErrorMessage(axiosErr(429, {}))).toBe('تم إرسال عدد كبير من الطلبات. حاول بعد قليل.')
    expect(getApiErrorMessage(axiosErr(500, {}))).toBe('حدث خطأ غير متوقع في الخادم.')
    expect(getApiErrorMessage(axiosErr(503, {}))).toBe('الخدمة غير متاحة حاليًا.')
  })

  it('falls back for an unmapped status and for a response-less network error', () => {
    expect(getApiErrorMessage(axiosErr(418, {}))).toBe(FALLBACK)
    expect(getApiErrorMessage(axiosErr(undefined, undefined))).toBe(FALLBACK)
  })

  it('ignores a non-string or blank backend message', () => {
    expect(getApiErrorMessage(axiosErr(404, { message: 123 }))).toBe('لم يتم العثور على البيانات.')
    expect(getApiErrorMessage(axiosErr(400, { message: '   ' }))).toBe(
      'تعذّر تنفيذ الطلب. يرجى التحقق من البيانات.',
    )
  })
})
