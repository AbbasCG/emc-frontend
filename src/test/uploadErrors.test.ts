import { describe, it, expect } from 'vitest'
import { AxiosError, CanceledError, type InternalAxiosRequestConfig } from 'axios'
import { hasArabicLetters, mapAssignmentUploadError, UPLOAD_ERROR_MESSAGES as M } from '@/api/uploadErrors'

function httpError(status: number, data: unknown): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig
  return new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST', config, {}, {
    status,
    statusText: '',
    headers: {},
    config,
    data,
  })
}

const files = [{ name: 'تقرير.pdf' }, { name: 'photo.png' }]

describe('hasArabicLetters', () => {
  it('detects Arabic text only', () => {
    expect(hasArabicLetters('حجم الملف')).toBe(true)
    expect(hasArabicLetters('The file failed to upload.')).toBe(false)
    expect(hasArabicLetters('')).toBe(false)
  })
})

describe('mapAssignmentUploadError', () => {
  it('shows the Arabic message of a 413 verbatim, because it names the real limit, and lists no limits beside it', () => {
    const info = mapAssignmentUploadError(
      httpError(413, {
        success: false,
        code: 'payload_too_large',
        message: 'حجم الملفات أكبر مما يقبله الخادم (الحد 8 ميجابايت).',
        limits: { max_files: 5, max_total_bytes: 26214400, server_post_max_bytes: 8388608 },
      }),
      { files },
    )
    expect(info.kind).toBe('too_large')
    expect(info.message).toBe('حجم الملفات أكبر مما يقبله الخادم (الحد 8 ميجابايت).')
    expect(info.details).toEqual([])
    expect(info.retryable).toBe(false)
    expect(info.status).toBe(413)
  })

  it('prefers message_ar over message on a 413', () => {
    const info = mapAssignmentUploadError(
      httpError(413, { code: 'payload_too_large', message_ar: 'المجموع أكبر من 25 ميجابايت.', message: 'حجم آخر 8 ميجابايت.' }),
    )
    expect(info.message).toBe('المجموع أكبر من 25 ميجابايت.')
  })

  it('falls back to the fixed 413 text, with limits, when the reply has no Arabic message', () => {
    const info = mapAssignmentUploadError(
      httpError(413, { success: false, code: 'payload_too_large', message: 'Payload too large', limits: { max_files: 5, max_total_bytes: 26214400 } }),
    )
    expect(info.message).toBe('حجم الملفات أكبر مما يقبله الخادم. قلّل عدد الملفات أو حجمها وحاول مرة أخرى.')
    expect(info.details).toEqual([{ fileName: null, message: 'الحد الأقصى 5 ملفات لكل تسليم، المجموع الكلي 25 ميجابايت.' }])
  })

  it('a bare nginx 413 with an HTML body never reaches PHP and gets the fixed message', () => {
    const info = mapAssignmentUploadError(httpError(413, '<html><head><title>413 Request Entity Too Large</title></head></html>'))
    expect(info.kind).toBe('too_large')
    expect(info.message).toBe(M.tooLarge)
    expect(info.details).toEqual([])
  })

  it('recognises the payload_too_large code on other statuses', () => {
    expect(mapAssignmentUploadError(httpError(400, { code: 'payload_too_large', message_ar: 'كبير' })).kind).toBe('too_large')
  })

  it('shows a top-level Arabic 422 message that no listed line repeats (already submitted, attempts cap, empty submission)', () => {
    expect(mapAssignmentUploadError(httpError(422, { message: 'لقد استنفدت عدد محاولات التسليم المسموح بها.' })).message).toBe(
      'لقد استنفدت عدد محاولات التسليم المسموح بها.',
    )
    const withField = mapAssignmentUploadError(
      httpError(422, { message: 'أضف إجابة نصية أو مرفقاً.', errors: { text_answer: ['الإجابة النصية مطلوبة.'] } }),
    )
    expect(withField.message).toBe('أضف إجابة نصية أو مرفقاً.')
    expect(withField.details).toEqual([{ fileName: null, message: 'الإجابة النصية مطلوبة.' }])
  })

  it('does not print the same file error twice when the top-level message is its first Arabic error', () => {
    const msg = 'حجم الملف أكبر من المسموح. الحد الأقصى 10 ميجابايت.'
    const info = mapAssignmentUploadError(httpError(422, { message: msg, errors: { 'files.0': [msg] } }), { files })
    expect(info.message).toBe(M.validation)
    expect(info.details).toEqual([{ fileName: 'تقرير.pdf', message: msg }])
  })

  it('maps 422 file errors to the picked file names, in request order', () => {
    const info = mapAssignmentUploadError(
      httpError(422, {
        message: 'The given data was invalid.',
        errors: {
          'files.0': ['حجم الملف أكبر من المسموح. الحد الأقصى 10 ميجابايت.'],
          'files.1': ['نوع الملف غير مدعوم.'],
          text_answer: ['الإجابة النصية طويلة جداً.'],
        },
      }),
      { files },
    )
    expect(info.kind).toBe('validation')
    expect(info.message).toBe(M.validation)
    expect(info.details).toEqual([
      { fileName: 'تقرير.pdf', message: 'حجم الملف أكبر من المسموح. الحد الأقصى 10 ميجابايت.' },
      { fileName: 'photo.png', message: 'نوع الملف غير مدعوم.' },
      { fileName: null, message: 'الإجابة النصية طويلة جداً.' },
    ])
  })

  it('keeps a general `files` message unprefixed and an out-of-range index without a name', () => {
    const info = mapAssignmentUploadError(
      httpError(422, { errors: { files: ['الحد الأقصى 5 ملفات لكل تسليم.'], 'files.9': ['الملف تالف.'] } }),
      { files },
    )
    expect(info.details).toEqual([
      { fileName: null, message: 'الحد الأقصى 5 ملفات لكل تسليم.' },
      { fileName: null, message: 'الملف تالف.' },
    ])
  })

  it('never shows an English validation message and maps "failed to upload" specifically', () => {
    const info = mapAssignmentUploadError(
      httpError(422, {
        message: 'The file failed to upload.',
        errors: { 'files.0': ['The files.0 failed to upload.'], 'files.1': ['The files.1 must be a file of type: pdf.'], note: ['The note is bad.'] },
      }),
      { files },
    )
    expect(info.details).toEqual([
      { fileName: 'تقرير.pdf', message: M.uploadFailed },
      { fileName: 'photo.png', message: M.fileInvalid },
      { fileName: null, message: M.fieldInvalid },
    ])
    expect([info.message, ...info.details.map((d) => d.message)].every(hasArabicLetters)).toBe(true)
  })

  it('maps the bare English "The file failed to upload." (422 or 500) to the dedicated Arabic message', () => {
    for (const status of [422, 500, 400]) {
      const info = mapAssignmentUploadError(httpError(status, { message: 'The file failed to upload.' }))
      expect(info.kind).toBe('upload_failed')
      expect(info.message).toBe('تعذّر رفع الملف. قد يكون حجمه أكبر مما يقبله الخادم. قلّل حجم الملف أو تواصل مع الدعم.')
      expect(info.retryable).toBe(false)
    }
  })

  it('uses the server message only when it is Arabic', () => {
    expect(mapAssignmentUploadError(httpError(422, { message: 'انتهى موعد التسليم.' })).message).toBe('انتهى موعد التسليم.')
    expect(mapAssignmentUploadError(httpError(403, { message_ar: 'لست مسجلاً في هذه الدورة.', message: 'Forbidden' })).message).toBe('لست مسجلاً في هذه الدورة.')
    expect(mapAssignmentUploadError(httpError(422, { message: 'The given data was invalid.' })).message).toBe(M.validationFallback)
  })

  it('maps a response-less error (offline, dropped connection, timeout) to the retryable network message', () => {
    const net = new AxiosError('Network Error', 'ERR_NETWORK')
    const info = mapAssignmentUploadError(net)
    expect(info).toMatchObject({ kind: 'network', message: 'انقطع الاتصال أثناء الرفع. تحقق من الإنترنت ثم اضغط «إعادة المحاولة».', retryable: true, status: null })

    const timeout = new AxiosError('timeout of 600000ms exceeded', 'ECONNABORTED')
    expect(mapAssignmentUploadError(timeout)).toMatchObject({ kind: 'network', retryable: true })
  })

  it('treats an abort as a quiet, non-error outcome', () => {
    expect(mapAssignmentUploadError(new CanceledError('canceled')).kind).toBe('aborted')
    expect(mapAssignmentUploadError(new AxiosError('canceled', 'ERR_CANCELED')).kind).toBe('aborted')
    expect(mapAssignmentUploadError(new CanceledError('canceled')).message).toBe(M.aborted)
  })

  it('maps auth, permission, missing, throttled and server failures', () => {
    expect(mapAssignmentUploadError(httpError(401, { message: 'Unauthenticated.' }))).toMatchObject({ kind: 'auth', message: M.auth, retryable: false })
    expect(mapAssignmentUploadError(httpError(403, { message: 'This action is unauthorized.' }))).toMatchObject({ kind: 'forbidden', message: M.forbidden })
    expect(mapAssignmentUploadError(httpError(404, { message: 'Not Found' }))).toMatchObject({ kind: 'not_found', message: M.notFound })
    expect(mapAssignmentUploadError(httpError(429, {}))).toMatchObject({ kind: 'rate_limited', retryable: true })
    for (const status of [500, 502, 503]) {
      expect(mapAssignmentUploadError(httpError(status, { message: 'Server Error' }))).toMatchObject({ kind: 'server', message: M.server, retryable: true })
    }
    expect(mapAssignmentUploadError(httpError(409, { message: 'Conflict' }))).toMatchObject({ kind: 'unknown', message: M.generic })
  })

  it('never leaks an English Error.message from a non-axios failure', () => {
    expect(mapAssignmentUploadError(new Error('boom'))).toMatchObject({ kind: 'unknown', message: M.generic })
    expect(mapAssignmentUploadError(new Error('خطأ محلي')).message).toBe('خطأ محلي')
    expect(mapAssignmentUploadError('weird').message).toBe(M.generic)
    expect(mapAssignmentUploadError(undefined).message).toBe(M.generic)
  })

  it('de-duplicates identical messages for the same file', () => {
    const info = mapAssignmentUploadError(
      httpError(422, { errors: { 'files.0': ['نوع الملف غير مدعوم.', 'نوع الملف غير مدعوم.'] } }),
      { files },
    )
    expect(info.details).toHaveLength(1)
  })
})
