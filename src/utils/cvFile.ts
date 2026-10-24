/**
 * CV / resume uploads are PDF only. The browser's `accept` attribute is a hint, not a check (a dragged file or a
 * renamed one gets through), so the file itself is looked at: its name, the type the browser reports, its size and
 * its first bytes. The server repeats the check and has the last word.
 */

export const CV_MAX_BYTES = 5 * 1024 * 1024
export const CV_PDF_ONLY_MESSAGE = 'يُسمح برفع السيرة الذاتية بصيغة PDF فقط.'
export const CV_TOO_LARGE_MESSAGE = 'حجم السيرة الذاتية يجب ألا يتجاوز 5 ميغابايت.'
export const CV_INSTRUCTION = 'ملف PDF فقط، بحد أقصى 5 ميغابايت.'
export const CV_ACCEPT = '.pdf,application/pdf'

/** "٢٤٠ كيلوبايت" / "1.2 ميغابايت". */
export function formatFileSize(bytes: number): string {
  const mb = bytes / 1024 / 1024

  return mb >= 1 ? `${mb.toFixed(1)} ميغابايت` : `${Math.max(1, Math.round(bytes / 1024))} كيلوبايت`
}

function startsWithPdfSignature(file: Blob): Promise<boolean> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' && reader.result.startsWith('%PDF-'))
    reader.onerror = () => resolve(false)
    reader.readAsText(file.slice(0, 5))
  })
}

/** An Arabic error message, or null when the file is an acceptable CV. */
export async function validateCvFile(file: File): Promise<string | null> {
  if (!/\.pdf$/i.test(file.name)) return CV_PDF_ONLY_MESSAGE
  // An empty type is allowed (some systems report none); a type that names another format is not.
  if (file.type !== '' && file.type !== 'application/pdf') return CV_PDF_ONLY_MESSAGE
  if (file.size > CV_MAX_BYTES) return CV_TOO_LARGE_MESSAGE
  if (!(await startsWithPdfSignature(file))) return CV_PDF_ONLY_MESSAGE

  return null
}
