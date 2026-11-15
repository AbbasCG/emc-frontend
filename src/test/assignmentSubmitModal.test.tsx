import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, CanceledError, type InternalAxiosRequestConfig } from 'axios'
import AssignmentSubmitModal from '@/components/lms/AssignmentSubmitModal'
import { FALLBACK_UPLOAD_RULES } from '@/lib/assignmentUploadRules'
import type { StudentAssignment } from '@/types/lms'

const submitMock = vi.fn()
const rulesMock = vi.fn()
const toastSuccess = vi.fn()

vi.mock('@/api/studentApi', () => ({
  submitStudentAssignment: (...args: unknown[]) => submitMock(...args),
  fetchAssignmentUploadRules: () => rulesMock(),
}))

vi.mock('@/lib/toast', () => ({
  default: { success: (m: string) => toastSuccess(m), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}))

const MB = 1024 * 1024

const ASSIGNMENT: StudentAssignment = {
  id: 1,
  assignment_id: 91,
  title: 'واجب التقارير',
  course_name: 'دورة الكتابة',
  status: 'pending',
  due_at: null,
  max_score: 100,
}

function fileOf(name: string, size = 1024, type = 'application/pdf', lastModified = 1): File {
  const f = new File(['x'], name, { type, lastModified })
  Object.defineProperty(f, 'size', { value: size })
  return f
}

function httpError(status: number, data: unknown): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig
  return new AxiosError(`status ${status}`, 'ERR_BAD_REQUEST', config, {}, { status, statusText: '', headers: {}, config, data })
}

function setup(props: Partial<React.ComponentProps<typeof AssignmentSubmitModal>> = {}) {
  const onClose = vi.fn()
  const onSuccess = vi.fn()
  const user = userEvent.setup({ applyAccept: false })
  const utils = render(<AssignmentSubmitModal assignment={ASSIGNMENT} onClose={onClose} onSuccess={onSuccess} {...props} />)
  const input = () => screen.getByTestId('assignment-file-input') as HTMLInputElement
  const submitButton = () => screen.getByRole('button', { name: /إرسال التسليم|جارٍ الإرسال|إعادة تسليم الواجب/ })
  return { ...utils, user, onClose, onSuccess, input, submitButton }
}

beforeEach(() => {
  vi.clearAllMocks()
  rulesMock.mockResolvedValue(FALLBACK_UPLOAD_RULES)
})

describe('AssignmentSubmitModal — picking files', () => {
  it('offers a clear «إضافة ملفات» button and a multi-select input limited to the allowed types', () => {
    const { input } = setup()
    expect(screen.getByRole('button', { name: 'إضافة ملفات' })).toBeInTheDocument()
    expect(input().multiple).toBe(true)
    expect(input().accept).toBe(FALLBACK_UPLOAD_RULES.accept)
  })

  it('clicking the button opens the native picker', async () => {
    const { user, input } = setup()
    const click = vi.spyOn(input(), 'click')
    await user.click(screen.getByRole('button', { name: 'إضافة ملفات' }))
    expect(click).toHaveBeenCalled()
  })

  it('lists picked files with name, Arabic type label and human size, and removes one before submitting', async () => {
    const { user, input } = setup()
    await user.upload(input(), [fileOf('تقرير.pdf', 350 * 1024), fileOf('photo.png', 1.5 * MB, 'image/png')])

    const list = screen.getByRole('list', { name: 'الملفات المختارة' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(within(items[0]).getByText('تقرير.pdf')).toHaveAttribute('title', 'تقرير.pdf')
    expect(within(items[0]).getByText('تقرير.pdf')).toHaveAttribute('dir', 'auto')
    expect(items[0]).toHaveTextContent('المستندات · 350 كيلوبايت')
    expect(items[1]).toHaveTextContent('الصور · 1.5 ميجابايت')
    expect(screen.getByTestId('assignment-files-summary')).toHaveTextContent('2 من 5 ملفات')

    await user.click(screen.getByRole('button', { name: 'إزالة الملف تقرير.pdf' }))
    expect(within(screen.getByRole('list', { name: 'الملفات المختارة' })).getAllByRole('listitem')).toHaveLength(1)
    expect(screen.queryByText('تقرير.pdf')).not.toBeInTheDocument()
  })

  it('adds files dropped on the zone', () => {
    setup()
    fireEvent.drop(screen.getByTestId('assignment-drop-zone'), {
      dataTransfer: { files: [fileOf('dropped.docx', 2048, 'application/msword')] },
    })
    expect(screen.getByText('dropped.docx')).toBeInTheDocument()
  })

  it('shows each rejection inline with the exact Arabic reason, names the file and keeps the valid ones', async () => {
    const { user, input } = setup()
    await user.upload(input(), [
      fileOf('good.pdf', 1024),
      fileOf('huge.pdf', 10 * MB + 1),
      fileOf('malware.exe', 10, 'application/x-msdownload'),
      fileOf('good.pdf', 1024),
    ])

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('huge.pdf')
    expect(alert).toHaveTextContent('حجم الملف أكبر من المسموح. الحد الأقصى 10 ميجابايت.')
    expect(alert).toHaveTextContent('malware.exe')
    expect(alert).toHaveTextContent('نوع الملف غير مدعوم. يمكنك رفع الصور وPDF وWord وExcel والملفات المضغوطة.')
    expect(alert).toHaveTextContent('هذا الملف مضاف مسبقاً.')
    expect(within(screen.getByRole('list', { name: 'الملفات المختارة' })).getAllByRole('listitem')).toHaveLength(1)
  })

  it('rejects the sixth file and a total over 25 MB with the exact messages', async () => {
    const { user, input } = setup()
    await user.upload(
      input(),
      Array.from({ length: 6 }, (_, i) => fileOf(`f${i}.pdf`, 100, 'application/pdf', i)),
    )
    expect(screen.getByRole('alert')).toHaveTextContent('الحد الأقصى 5 ملفات لكل تسليم.')

    await user.click(screen.getByRole('button', { name: 'إخفاء رسائل الملفات المرفوضة' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('rejects a file that pushes the total past 25 MB', async () => {
    const { user, input } = setup()
    await user.upload(input(), [fileOf('a.pdf', 10 * MB, 'application/pdf', 1), fileOf('b.pdf', 10 * MB, 'application/pdf', 2), fileOf('c.pdf', 6 * MB, 'application/pdf', 3)])
    expect(screen.getByRole('alert')).toHaveTextContent('المجموع الكلي للمرفقات أكبر من 25 ميجابايت.')
    expect(within(screen.getByRole('list', { name: 'الملفات المختارة' })).getAllByRole('listitem')).toHaveLength(2)
  })

  it('uses the limits the server sent', async () => {
    rulesMock.mockResolvedValue({
      max_files: 2,
      max_total_bytes: 4 * MB,
      groups: [{ key: 'document', label_ar: 'المستندات', extensions: ['pdf'], max_bytes: 3 * MB }],
      accept: '.pdf',
    })
    const { user, input } = setup()
    await waitFor(() => expect(input().accept).toBe('.pdf'))
    await user.upload(input(), [fileOf('a.pdf', 3 * MB + 1)])
    expect(screen.getByRole('alert')).toHaveTextContent('الحد الأقصى 3 ميجابايت.')
  })
})

describe('AssignmentSubmitModal — submitting', () => {
  it('sends the typed text, notes and every picked file, then closes with a success toast', async () => {
    submitMock.mockResolvedValueOnce({ status: 'submitted', submitted_at: null, submission_id: 1 })
    const { user, input, onClose, onSuccess, submitButton } = setup()
    await user.type(screen.getByPlaceholderText('اكتب إجابتك هنا…'), 'إجابتي')
    await user.type(screen.getByPlaceholderText('ملاحظة للمدرب…'), 'ملاحظة')
    const a = fileOf('a.pdf', 100, 'application/pdf', 1)
    const b = fileOf('b.png', 100, 'image/png', 2)
    await user.upload(input(), [a, b])
    await user.click(submitButton())

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(submitMock).toHaveBeenCalledTimes(1)
    const [id, payload, options] = submitMock.mock.calls[0]
    expect(id).toBe(91)
    expect(payload).toEqual({ text_answer: 'إجابتي', answer_text: 'إجابتي', notes: 'ملاحظة', files: [a, b] })
    expect(options.signal).toBeInstanceOf(AbortSignal)
    expect(typeof options.onProgress).toBe('function')
    expect(toastSuccess).toHaveBeenCalledWith('تم تسليم الواجب بنجاح.')
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('still closes when the post-submit refresh fails (the submission is saved)', async () => {
    submitMock.mockResolvedValueOnce({ status: 'submitted', submitted_at: null, submission_id: 1 })
    const { user, onClose, submitButton } = setup({ onSuccess: vi.fn().mockRejectedValue(new Error('refresh failed')) })
    await user.type(screen.getByPlaceholderText('اكتب إجابتك هنا…'), 'نص')
    await user.click(submitButton())
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(screen.queryByTestId('assignment-submit-error')).not.toBeInTheDocument()
  })

  it('refuses an empty submission without calling the server', async () => {
    const { user, submitButton } = setup()
    await user.click(submitButton())
    expect(screen.getByRole('alert')).toHaveTextContent('أضف إجابة نصية أو مرفقاً على الأقل.')
    expect(submitMock).not.toHaveBeenCalled()
  })

  it('allows a files-only submission', async () => {
    submitMock.mockResolvedValueOnce({ status: 'submitted', submitted_at: null, submission_id: 1 })
    const { user, input, onClose, submitButton } = setup()
    await user.upload(input(), [fileOf('only.pdf')])
    await user.click(submitButton())
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(submitMock.mock.calls[0][1].text_answer).toBeUndefined()
  })

  it('shows progress while uploading, locks every control, and posts only once on a double click', async () => {
    let capturedProgress: ((p: { loaded: number; total: number | null; percent: number }) => void) | undefined
    let resolveSubmit: (v: unknown) => void = () => {}
    submitMock.mockImplementationOnce((_id, _payload, options) => {
      capturedProgress = options.onProgress
      return new Promise((resolve) => {
        resolveSubmit = resolve
      })
    })
    const { user, input, onClose, submitButton } = setup()
    await user.type(screen.getByPlaceholderText('اكتب إجابتك هنا…'), 'نص')
    await user.upload(input(), [fileOf('a.pdf'), fileOf('b.pdf', 10, 'application/pdf', 2)])

    const button = submitButton()
    // Two clicks in the same tick — before React has re-rendered the disabled state.
    fireEvent.click(button)
    fireEvent.click(button)
    fireEvent.submit(button.closest('form')!)

    expect(submitMock).toHaveBeenCalledTimes(1)
    const bar = await screen.findByRole('progressbar', { name: 'تقدّم رفع الملفات' })
    expect(bar).toHaveAttribute('aria-valuenow', '0')

    act(() => capturedProgress?.({ loaded: 40, total: 100, percent: 40 }))
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40')
    expect(screen.getByTestId('assignment-upload-progress')).toHaveTextContent('40%')
    expect(screen.getByText('جارٍ رفع الملفات…')).toBeInTheDocument()

    // Progress never goes backwards.
    act(() => capturedProgress?.({ loaded: 10, total: 100, percent: 10 }))
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40')

    act(() => capturedProgress?.({ loaded: 100, total: 100, percent: 100 }))
    expect(screen.getByText('اكتمل الرفع، جارٍ حفظ التسليم…')).toBeInTheDocument()

    expect(submitButton()).toBeDisabled()
    expect(screen.getByRole('button', { name: 'إضافة ملفات' })).toBeDisabled()
    expect(screen.getAllByRole('button', { name: /إزالة الملف/ }).every((b) => (b as HTMLButtonElement).disabled)).toBe(true)
    expect(screen.getByRole('button', { name: 'إغلاق نافذة التسليم' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'إغلاق' })).toBeDisabled()
    expect(screen.getByPlaceholderText('اكتب إجابتك هنا…')).toBeDisabled()

    // Escape cannot dismiss an upload in flight.
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()

    await act(async () => {
      resolveSubmit({ status: 'submitted', submitted_at: null, submission_id: 1 })
    })
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(submitMock).toHaveBeenCalledTimes(1)
  })

  it('«إيقاف الرفع» aborts the request and keeps everything the student entered', async () => {
    let signal: AbortSignal | undefined
    submitMock.mockImplementationOnce(
      (_id, _payload, options) =>
        new Promise((_resolve, reject) => {
          signal = options.signal
          options.signal.addEventListener('abort', () => reject(new CanceledError('canceled')))
        }),
    )
    const { user, input, onClose, submitButton } = setup()
    await user.type(screen.getByPlaceholderText('اكتب إجابتك هنا…'), 'إجابة مهمة')
    await user.upload(input(), [fileOf('keep.pdf')])
    await user.click(submitButton())

    await user.click(await screen.findByRole('button', { name: 'إيقاف الرفع' }))
    expect(signal?.aborted).toBe(true)

    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('تم إيقاف الرفع.')
    expect(screen.getByPlaceholderText('اكتب إجابتك هنا…')).toHaveValue('إجابة مهمة')
    expect(screen.getByText('keep.pdf')).toBeInTheDocument()
    expect(submitButton()).toBeEnabled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('aborts an upload in flight when the parent removes the assignment', async () => {
    let signal: AbortSignal | undefined
    submitMock.mockImplementationOnce(
      (_id, _payload, options) =>
        new Promise((_resolve, reject) => {
          signal = options.signal
          options.signal.addEventListener('abort', () => reject(new CanceledError('canceled')))
        }),
    )
    const { user, rerender, onClose, submitButton } = setup()
    await user.type(screen.getByPlaceholderText('اكتب إجابتك هنا…'), 'نص')
    await user.click(submitButton())
    await screen.findByRole('button', { name: 'إيقاف الرفع' })

    rerender(<AssignmentSubmitModal assignment={null} onClose={onClose} />)
    await waitFor(() => expect(signal?.aborted).toBe(true))
  })
})

describe('AssignmentSubmitModal — failures', () => {
  async function failWith(error: unknown) {
    submitMock.mockRejectedValueOnce(error)
    const ctx = setup()
    await ctx.user.type(screen.getByPlaceholderText('اكتب إجابتك هنا…'), 'إجابتي المهمة')
    await ctx.user.type(screen.getByPlaceholderText('ملاحظة للمدرب…'), 'ملاحظتي')
    await ctx.user.upload(ctx.input(), [fileOf('تقرير.pdf', 100, 'application/pdf', 1), fileOf('b.png', 100, 'image/png', 2)])
    await ctx.user.click(ctx.submitButton())
    await screen.findByTestId('assignment-submit-error')
    return ctx
  }

  function expectNothingLost() {
    expect(screen.getByPlaceholderText('اكتب إجابتك هنا…')).toHaveValue('إجابتي المهمة')
    expect(screen.getByPlaceholderText('ملاحظة للمدرب…')).toHaveValue('ملاحظتي')
    const list = within(screen.getByRole('list', { name: 'الملفات المختارة' }))
    expect(list.getByText('تقرير.pdf')).toBeInTheDocument()
    expect(list.getByText('b.png')).toBeInTheDocument()
  }

  it('replaces the English "The file failed to upload." with the Arabic message and keeps the draft', async () => {
    const { onClose } = await failWith(httpError(422, { message: 'The file failed to upload.' }))
    const box = screen.getByTestId('assignment-submit-error')
    expect(box).toHaveTextContent('تعذّر رفع الملف. قد يكون حجمه أكبر مما يقبله الخادم. قلّل حجم الملف أو تواصل مع الدعم.')
    expect(box.textContent).not.toMatch(/failed to upload/i)
    expectNothingLost()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('shows per-file 422 messages prefixed with the file name, and field errors', async () => {
    await failWith(
      httpError(422, {
        message: 'The given data was invalid.',
        errors: { 'files.0': ['حجم الملف أكبر من المسموح. الحد الأقصى 10 ميجابايت.'], 'files.1': ['نوع الملف غير مدعوم.'], text_answer: ['الإجابة طويلة.'] },
      }),
    )
    const box = screen.getByTestId('assignment-submit-error')
    expect(box).toHaveTextContent('تقرير.pdf — حجم الملف أكبر من المسموح. الحد الأقصى 10 ميجابايت.')
    expect(box).toHaveTextContent('b.png — نوع الملف غير مدعوم.')
    expect(box).toHaveTextContent('الإجابة طويلة.')
    expect(within(box).queryByRole('button', { name: 'إعادة المحاولة' })).not.toBeInTheDocument()
    expectNothingLost()
  })

  it('maps a 413 to the server-limit message', async () => {
    await failWith(httpError(413, { success: false, code: 'payload_too_large', message: 'Payload Too Large' }))
    expect(screen.getByTestId('assignment-submit-error')).toHaveTextContent('حجم الملفات أكبر مما يقبله الخادم. قلّل عدد الملفات أو حجمها وحاول مرة أخرى.')
    expectNothingLost()
  })

  it.each([
    [401, 'انتهت جلسة الدخول. سجّل الدخول مجدداً ثم أعد المحاولة.'],
    [403, 'ليس لديك صلاحية تسليم هذا الواجب.'],
    [500, 'تعذّر على الخادم استلام التسليم الآن. حاول مرة أخرى بعد قليل.'],
  ])('shows an Arabic message for %i, never the English server text', async (status, expected) => {
    await failWith(httpError(status, { message: 'Server Error' }))
    const box = screen.getByTestId('assignment-submit-error')
    expect(box).toHaveTextContent(expected)
    expect(box.textContent).not.toMatch(/Server Error/)
    expectNothingLost()
  })

  it('on a network failure offers «إعادة المحاولة», which resends the same files and succeeds', async () => {
    const { onClose, user } = await failWith(new AxiosError('Network Error', 'ERR_NETWORK'))
    const box = screen.getByTestId('assignment-submit-error')
    expect(box).toHaveTextContent('انقطع الاتصال أثناء الرفع. تحقق من الإنترنت ثم اضغط «إعادة المحاولة».')
    expectNothingLost()

    const firstFiles = submitMock.mock.calls[0][1].files as File[]
    submitMock.mockResolvedValueOnce({ status: 'submitted', submitted_at: null, submission_id: 1 })
    await user.click(within(box).getByRole('button', { name: 'إعادة المحاولة' }))

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(submitMock).toHaveBeenCalledTimes(2)
    const retry = submitMock.mock.calls[1][1]
    expect(retry.files).toEqual(firstFiles)
    expect(retry.text_answer).toBe('إجابتي المهمة')
    expect(toastSuccess).toHaveBeenCalledWith('تم تسليم الواجب بنجاح.')
  })

  it('on a 429 shows the server Arabic message and blocks resending until retry_after has run out', async () => {
    const { user, submitButton } = await failWith(httpError(429, { code: 'too_many_requests', message: 'محاولات التسليم كثيرة. حاول بعد قليل.', retry_after: 2 }))
    const box = screen.getByTestId('assignment-submit-error')
    expect(box).toHaveTextContent('محاولات التسليم كثيرة. حاول بعد قليل.')
    const retry = within(box).getByRole('button', { name: /إعادة المحاولة/ })
    expect(retry).toBeDisabled()
    expect(retry).toHaveTextContent('بعد 0:0')
    expect(submitButton()).toBeDisabled()
    expectNothingLost()

    await waitFor(() => expect(within(screen.getByTestId('assignment-submit-error')).getByRole('button', { name: 'إعادة المحاولة' })).toBeEnabled(), { timeout: 4000 })
    expect(submitButton()).toBeEnabled()

    submitMock.mockResolvedValueOnce({ status: 'submitted', submitted_at: null, submission_id: 1 })
    await user.click(within(screen.getByTestId('assignment-submit-error')).getByRole('button', { name: 'إعادة المحاولة' }))
    await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(2))
  })

  it('a 409 (concurrent submit) shows its Arabic message verbatim with «إعادة المحاولة» available at once', async () => {
    await failWith(httpError(409, { message: 'يوجد تسليم آخر قيد المعالجة.' }))
    const box = screen.getByTestId('assignment-submit-error')
    expect(box).toHaveTextContent('يوجد تسليم آخر قيد المعالجة.')
    expect(within(box).getByRole('button', { name: 'إعادة المحاولة' })).toBeEnabled()
  })

  it('a timeout (no response) is treated like a lost connection', async () => {
    await failWith(new AxiosError('timeout of 600000ms exceeded', 'ECONNABORTED'))
    expect(screen.getByRole('button', { name: 'إعادة المحاولة' })).toBeInTheDocument()
  })

  it('can fail twice and still keep everything', async () => {
    const { user } = await failWith(new AxiosError('Network Error', 'ERR_NETWORK'))
    submitMock.mockRejectedValueOnce(new AxiosError('Network Error', 'ERR_NETWORK'))
    await user.click(screen.getByRole('button', { name: 'إعادة المحاولة' }))
    await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(2))
    await screen.findByRole('button', { name: 'إعادة المحاولة' })
    expectNothingLost()
  })

  it('lets the student remove the offending file and resend after a 422', async () => {
    const { user, submitButton } = await failWith(httpError(422, { errors: { 'files.0': ['الملف تالف.'] } }))
    await user.click(screen.getByRole('button', { name: 'إزالة الملف تقرير.pdf' }))
    submitMock.mockResolvedValueOnce({ status: 'submitted', submitted_at: null, submission_id: 1 })
    await user.click(submitButton())
    await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(2))
    expect((submitMock.mock.calls[1][1].files as File[]).map((f) => f.name)).toEqual(['b.png'])
  })
})

describe('AssignmentSubmitModal — resubmission and read-only context', () => {
  const submittedWithFiles: StudentAssignment = {
    ...ASSIGNMENT,
    status: 'submitted',
    submitted_at: '2026-11-01T10:00:00Z',
    attachments: [{ id: 1, name: 'تسليمي الأول.pdf', size: 2048, mime: 'application/pdf', download_url: '/x/1' }],
  }

  it('lists the submitted files (with a download button) once the assignment is read-only', () => {
    setup({ assignment: submittedWithFiles })
    expect(screen.getByText('تسليمي الأول.pdf')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'تنزيل تسليمي الأول.pdf' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'إضافة ملفات' })).not.toBeInTheDocument()
  })

  it('shows the earlier files above the form when the instructor asked for a resubmission', () => {
    setup({ assignment: { ...submittedWithFiles, status: 'needs_resubmission' } })
    expect(screen.getByText('ملفاتك المُسلَّمة سابقاً')).toBeInTheDocument()
    expect(screen.getByText('تسليمي الأول.pdf')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'إضافة ملفات' })).toBeInTheDocument()
  })

  it('keeps the older single-file submission (no attachments) rendering as before', () => {
    setup({ assignment: { ...ASSIGNMENT, status: 'submitted', submitted_at: '2026-11-01T10:00:00Z' } })
    expect(screen.getByText('تم تسليم هذا الواجب. لا يمكن إعادة التسليم إلا بطلب من المدرس.')).toBeInTheDocument()
    expect(screen.queryByText('ملفاتك المُسلَّمة')).not.toBeInTheDocument()
  })
})
