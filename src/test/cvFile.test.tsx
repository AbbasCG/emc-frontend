import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { CvFileField } from '@/components/ui/CvFileField'
import { CV_MAX_BYTES, CV_PDF_ONLY_MESSAGE, CV_TOO_LARGE_MESSAGE, formatFileSize, validateCvFile } from '@/utils/cvFile'

const pdf = (name = 'cv.pdf', bytes = 2048, type = 'application/pdf') => new File(['%PDF-1.4\n' + 'x'.repeat(Math.max(0, bytes - 9))], name, { type })
const docx = (name = 'cv.docx') => new File(['PK\u0003\u0004' + 'x'.repeat(100)], name, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })

describe('validateCvFile', () => {
  it('accepts a real PDF, including an unnamed type', async () => {
    expect(await validateCvFile(pdf())).toBeNull()
    expect(await validateCvFile(pdf('CV.PDF'))).toBeNull()
    expect(await validateCvFile(pdf('cv.pdf', 2048, ''))).toBeNull()
  })

  it('rejects Word documents and images with the Arabic message', async () => {
    expect(await validateCvFile(docx('cv.docx'))).toBe(CV_PDF_ONLY_MESSAGE)
    expect(await validateCvFile(docx('cv.doc'))).toBe(CV_PDF_ONLY_MESSAGE)
    expect(await validateCvFile(new File(['x'], 'cv.png', { type: 'image/png' }))).toBe(CV_PDF_ONLY_MESSAGE)
  })

  it('rejects a renamed file by looking inside it, not at its name or claimed type', async () => {
    expect(await validateCvFile(docx('cv.pdf'))).toBe(CV_PDF_ONLY_MESSAGE)
    expect(await validateCvFile(new File(['MZ binary'], 'cv.pdf', { type: 'application/pdf' }))).toBe(CV_PDF_ONLY_MESSAGE)
  })

  it('rejects a PDF whose type says something else, or whose name does not end in .pdf', async () => {
    expect(await validateCvFile(pdf('cv.pdf', 2048, 'application/msword'))).toBe(CV_PDF_ONLY_MESSAGE)
    expect(await validateCvFile(pdf('cv.docx'))).toBe(CV_PDF_ONLY_MESSAGE)
  })

  it('keeps the 5 MB limit', async () => {
    const big = pdf('cv.pdf', 10)
    Object.defineProperty(big, 'size', { value: CV_MAX_BYTES + 1 })

    expect(await validateCvFile(big)).toBe(CV_TOO_LARGE_MESSAGE)
  })

  it('formats sizes in Arabic units', () => {
    expect(formatFileSize(2048)).toBe('2 كيلوبايت')
    expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 ميغابايت')
  })
})

function Harness({ onChange = () => {}, error }: { onChange?: (f: File | null) => void; error?: string }) {
  const [file, setFile] = useState<File | null>(null)

  return <CvFileField required file={file} error={error} onChange={(f) => { setFile(f); onChange(f) }} />
}

describe('CvFileField', () => {
  it('states the PDF-only rule up front and accepts only .pdf in the picker', () => {
    render(<Harness />)

    expect(screen.getByText('ملف PDF فقط، بحد أقصى 5 ميغابايت.')).toBeTruthy()
    expect(screen.getByLabelText(/السيرة الذاتية/, { selector: 'input' })).toHaveAttribute('accept', '.pdf,application/pdf')
  })

  it('shows the chosen PDF with its name and size, and can remove it', async () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)

    await userEvent.upload(screen.getByLabelText(/السيرة الذاتية/, { selector: 'input' }), pdf('my-cv.pdf', 3000))

    expect(await screen.findByText('my-cv.pdf')).toBeTruthy()
    expect(screen.getByTestId('cv-size')).toHaveTextContent('3 كيلوبايت')
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'my-cv.pdf' }))

    await userEvent.click(screen.getByRole('button', { name: 'إزالة الملف' }))
    expect(onChange).toHaveBeenLastCalledWith(null)
    expect(screen.queryByText('my-cv.pdf')).toBeNull()
  })

  it('refuses a Word file even when it bypasses the accept hint, with an accessible error, and keeps nothing', async () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    const input = screen.getByLabelText(/السيرة الذاتية/, { selector: 'input' })

    // applyAccept:false simulates a drag-and-drop or a browser that ignores `accept`.
    await userEvent.setup({ applyAccept: false }).upload(input, docx('cv.docx'))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(CV_PDF_ONLY_MESSAGE)
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input.getAttribute('aria-describedby')).toContain(alert.id)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('a refused file leaves an earlier valid choice in place, and a later valid one clears the error', async () => {
    render(<Harness />)
    const input = screen.getByLabelText(/السيرة الذاتية/, { selector: 'input' })
    const user = userEvent.setup({ applyAccept: false })
    await user.upload(input, pdf('first.pdf'))
    await screen.findByText('first.pdf')

    await user.upload(input, docx('second.docx'))
    expect(await screen.findByRole('alert')).toHaveTextContent(CV_PDF_ONLY_MESSAGE)
    expect(screen.getByText('first.pdf')).toBeTruthy()

    await user.upload(input, pdf('third.pdf'))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(screen.getByText('third.pdf')).toBeTruthy()
  })

  it('shows an error the form or the server produced', () => {
    render(<Harness error="السيرة الذاتية مطلوبة (PDF)" />)

    expect(screen.getByRole('alert')).toHaveTextContent('السيرة الذاتية مطلوبة (PDF)')
  })
})
