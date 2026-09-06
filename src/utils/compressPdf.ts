import type { CompressionResult } from './compressImage'

export type { CompressionResult }

export const PDF_MAX_INPUT_BYTES = 50 * 1024 * 1024
export const PDF_MAX_OUTPUT_BYTES = 15 * 1024 * 1024

export async function compressPdf(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<CompressionResult> {
  if (file.type !== 'application/pdf') {
    throw new Error('الملف ليس بصيغة PDF')
  }
  if (file.size > PDF_MAX_INPUT_BYTES) {
    throw new Error(`حجم ملف PDF يتجاوز ${PDF_MAX_INPUT_BYTES / 1024 / 1024} ميجابايت`)
  }

  onProgress?.(5)
  const buffer = await file.arrayBuffer()
  onProgress?.(25)

  // Dynamic import keeps pdf-lib out of the initial bundle
  const { PDFDocument } = await import('pdf-lib')
  onProgress?.(40)

  let pdfDoc
  try {
    pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true })
  } catch {
    throw new Error('تعذّر قراءة ملف PDF. تأكد أن الملف صحيح وغير تالف.')
  }

  onProgress?.(55)

  // Strip metadata (reduces file size modestly)
  pdfDoc.setTitle('')
  pdfDoc.setAuthor('')
  pdfDoc.setSubject('')
  pdfDoc.setKeywords([])
  pdfDoc.setCreator('')
  pdfDoc.setProducer('')

  onProgress?.(70)

  // useObjectStreams enables deflate compression of object streams
  const compressed = await pdfDoc.save({ useObjectStreams: true, addDefaultPage: false })
  onProgress?.(95)

  const out = new File([compressed.buffer as ArrayBuffer], file.name, { type: 'application/pdf' })
  onProgress?.(100)

  return {
    file: out,
    originalSize: file.size,
    compressedSize: out.size,
    savedPercent: Math.max(0, Math.round((1 - out.size / file.size) * 100)),
  }
}
