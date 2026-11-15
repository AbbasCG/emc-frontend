import { describe, it, expect } from 'vitest'
import {
  addFilesToSelection,
  buildAcceptAttribute,
  fileExtension,
  FALLBACK_UPLOAD_RULES,
  findUploadGroup,
  formatFileSize,
  formatMegabytes,
  parseAssignmentUploadRules,
  tooManyFilesMessage,
  totalSelectionBytes,
  UNSUPPORTED_TYPE_MESSAGE,
} from '@/lib/assignmentUploadRules'

const MB = 1024 * 1024

/** A File of an exact byte size without allocating it. */
function fileOf(name: string, size: number, lastModified = 1): File {
  const f = new File(['x'], name, { lastModified })
  Object.defineProperty(f, 'size', { value: size })
  return f
}

const SERVER_PAYLOAD = {
  success: true,
  data: {
    max_files: 5,
    max_total_bytes: 26214400,
    groups: [
      { key: 'image', label_ar: 'الصور', extensions: ['jpg', 'jpeg', 'png', 'webp'], max_bytes: 5242880 },
      { key: 'document', extensions: ['pdf', 'doc', 'docx'], max_bytes: 10485760 },
      { key: 'text', extensions: ['txt'], max_bytes: 2097152 },
      { key: 'spreadsheet', extensions: ['xls', 'xlsx', 'csv'], max_bytes: 10485760 },
      { key: 'archive', extensions: ['zip', 'rar', '7z'], max_bytes: 10485760 },
      { key: 'presentation', extensions: ['ppt', 'pptx'], max_bytes: 10485760 },
    ],
    accept: '.jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.txt,.xls,.xlsx,.csv,.zip,.rar,.7z,.ppt,.pptx',
  },
}

describe('upload rules: fallback and server payload', () => {
  it('ships the same numbers the server publishes', () => {
    const parsed = parseAssignmentUploadRules(SERVER_PAYLOAD)
    expect(parsed).not.toBeNull()
    expect(parsed!.max_files).toBe(FALLBACK_UPLOAD_RULES.max_files)
    expect(parsed!.max_total_bytes).toBe(FALLBACK_UPLOAD_RULES.max_total_bytes)
    expect(parsed!.accept).toBe(FALLBACK_UPLOAD_RULES.accept)
    expect(parsed!.groups.map((g) => [g.key, g.extensions, g.max_bytes])).toEqual(
      FALLBACK_UPLOAD_RULES.groups.map((g) => [g.key, g.extensions, g.max_bytes]),
    )
  })

  it('uses the Arabic label of the server and falls back to the built-in label per key', () => {
    const parsed = parseAssignmentUploadRules(SERVER_PAYLOAD)!
    expect(parsed.groups.find((g) => g.key === 'image')!.label_ar).toBe('الصور')
    expect(parsed.groups.find((g) => g.key === 'document')!.label_ar).toBe('المستندات')
  })

  it('accepts a body without the data envelope and numeric strings', () => {
    const parsed = parseAssignmentUploadRules({
      max_files: '3',
      max_total_bytes: '1048576',
      groups: [{ key: 'custom', label_ar: 'مخصص', extensions: ['.PDF', 'Docx'], max_bytes: '1024' }],
    })
    expect(parsed).toEqual({
      max_files: 3,
      max_total_bytes: 1048576,
      groups: [{ key: 'custom', label_ar: 'مخصص', extensions: ['pdf', 'docx'], max_bytes: 1024 }],
      accept: '.pdf,.docx',
    })
  })

  it.each([
    ['null', null],
    ['a string', 'x'],
    ['no groups', { data: { max_files: 5, max_total_bytes: 1, groups: [] } }],
    ['zero max_files', { data: { max_files: 0, max_total_bytes: 1, groups: [{ key: 'a', extensions: ['a'], max_bytes: 1 }] } }],
    ['a group without extensions', { data: { max_files: 5, max_total_bytes: 1, groups: [{ key: 'a', extensions: [], max_bytes: 1 }] } }],
    ['a group without a size', { data: { max_files: 5, max_total_bytes: 1, groups: [{ key: 'a', extensions: ['a'] }] } }],
    ['a non-object group', { data: { max_files: 5, max_total_bytes: 1, groups: ['x'] } }],
  ])('rejects an unusable payload (%s) so the caller falls back', (_label, raw) => {
    expect(parseAssignmentUploadRules(raw)).toBeNull()
  })

  it('builds the accept attribute from the groups', () => {
    expect(buildAcceptAttribute([{ key: 'a', label_ar: 'أ', extensions: ['x', 'y'], max_bytes: 1 }])).toBe('.x,.y')
  })
})

describe('formatting', () => {
  it('formats the megabyte limit without trailing zeros', () => {
    expect(formatMegabytes(10 * MB)).toBe('10')
    expect(formatMegabytes(5242880)).toBe('5')
    expect(formatMegabytes(2.5 * MB)).toBe('2.5')
  })

  it('formats file sizes in Arabic units', () => {
    expect(formatFileSize(0)).toBe('0 بايت')
    expect(formatFileSize(500)).toBe('500 بايت')
    expect(formatFileSize(1024)).toBe('1 كيلوبايت')
    expect(formatFileSize(350 * 1024)).toBe('350 كيلوبايت')
    expect(formatFileSize(1.5 * MB)).toBe('1.5 ميجابايت')
    expect(formatFileSize(10 * MB)).toBe('10 ميجابايت')
    expect(formatFileSize(-1)).toBe('')
    expect(formatFileSize(Number.NaN)).toBe('')
  })

  it('words the file-count limit', () => {
    expect(tooManyFilesMessage(5)).toBe('الحد الأقصى 5 ملفات لكل تسليم.')
    expect(tooManyFilesMessage(1)).toBe('الحد الأقصى ملف واحد لكل تسليم.')
    expect(tooManyFilesMessage(2)).toBe('الحد الأقصى ملفين لكل تسليم.')
    expect(tooManyFilesMessage(12)).toBe('الحد الأقصى 12 ملفاً لكل تسليم.')
  })
})

describe('extensions', () => {
  it('reads the last extension, case-insensitively', () => {
    expect(fileExtension('Report.PDF')).toBe('pdf')
    expect(fileExtension('a.php.jpg')).toBe('jpg')
    expect(fileExtension('تقرير نهائي.docx')).toBe('docx')
    expect(fileExtension('noextension')).toBe('')
    expect(fileExtension('trailingdot.')).toBe('')
  })

  it('finds the group of an extension', () => {
    expect(findUploadGroup('a.PNG', FALLBACK_UPLOAD_RULES)?.key).toBe('image')
    expect(findUploadGroup('a.7z', FALLBACK_UPLOAD_RULES)?.key).toBe('archive')
    expect(findUploadGroup('a.exe', FALLBACK_UPLOAD_RULES)).toBeNull()
    expect(findUploadGroup('README', FALLBACK_UPLOAD_RULES)).toBeNull()
  })
})

describe('client validation (mirror of the server rules)', () => {
  const rules = FALLBACK_UPLOAD_RULES

  it('accepts a valid file with its group label', () => {
    const { accepted, rejected } = addFilesToSelection([], [fileOf('واجب.pdf', 1 * MB)], rules)
    expect(rejected).toEqual([])
    expect(accepted).toHaveLength(1)
    expect(accepted[0]).toMatchObject({ groupKey: 'document', groupLabel: 'المستندات' })
    expect(accepted[0].id).toMatch(/^picked-\d+$/)
  })

  it('accepts a file exactly at its group limit and rejects one byte over, with the real number', () => {
    const atLimit = addFilesToSelection([], [fileOf('a.pdf', 10 * MB)], rules)
    expect(atLimit.accepted).toHaveLength(1)

    const over = addFilesToSelection([], [fileOf('big.pdf', 10 * MB + 1)], rules)
    expect(over.accepted).toEqual([])
    expect(over.rejected).toEqual([
      { name: 'big.pdf', reason: 'size', message: 'حجم الملف أكبر من المسموح. الحد الأقصى 10 ميجابايت.' },
    ])
  })

  it('uses each group limit: images 5, text 2', () => {
    const img = addFilesToSelection([], [fileOf('p.jpg', 5 * MB + 1)], rules)
    expect(img.rejected[0].message).toBe('حجم الملف أكبر من المسموح. الحد الأقصى 5 ميجابايت.')
    const txt = addFilesToSelection([], [fileOf('n.txt', 2 * MB + 1)], rules)
    expect(txt.rejected[0].message).toBe('حجم الملف أكبر من المسموح. الحد الأقصى 2 ميجابايت.')
    expect(addFilesToSelection([], [fileOf('n.txt', 2 * MB)], rules).accepted).toHaveLength(1)
  })

  it('rejects unsupported and extension-less files with the exact message', () => {
    const { accepted, rejected } = addFilesToSelection(
      [],
      [fileOf('virus.exe', 10), fileOf('Makefile', 10), fileOf('.', 10)],
      rules,
    )
    expect(accepted).toEqual([])
    expect(rejected.map((r) => r.reason)).toEqual(['type', 'type', 'type'])
    expect(rejected.every((r) => r.message === UNSUPPORTED_TYPE_MESSAGE)).toBe(true)
    expect(UNSUPPORTED_TYPE_MESSAGE).toBe('نوع الملف غير مدعوم. يمكنك رفع الصور وPDF وWord وExcel والملفات المضغوطة.')
  })

  it('treats the extension case-insensitively and judges only the last one (the server decides the rest)', () => {
    const { accepted, rejected } = addFilesToSelection([], [fileOf('SCAN.JPG', 100), fileOf('a.php.jpg', 100), fileOf('a.jpg.php', 100)], rules)
    expect(accepted.map((a) => a.file.name)).toEqual(['SCAN.JPG', 'a.php.jpg'])
    expect(rejected.map((r) => r.name)).toEqual(['a.jpg.php'])
  })

  it('caps the selection at 5 files; the sixth is rejected and the others stay', () => {
    const six = Array.from({ length: 6 }, (_, i) => fileOf(`f${i}.pdf`, 100, i))
    const { accepted, rejected } = addFilesToSelection([], six, rules)
    expect(accepted).toHaveLength(5)
    expect(rejected).toEqual([{ name: 'f5.pdf', reason: 'count', message: 'الحد الأقصى 5 ملفات لكل تسليم.' }])
  })

  it('counts files already in the selection', () => {
    const first = addFilesToSelection([], Array.from({ length: 5 }, (_, i) => fileOf(`f${i}.pdf`, 100, i)), rules).accepted
    const more = addFilesToSelection(first, [fileOf('extra.pdf', 100)], rules)
    expect(more.accepted).toEqual([])
    expect(more.rejected[0].reason).toBe('count')
  })

  it('rejects when the total passes 25 MB but accepts exactly 25 MB', () => {
    const exact = addFilesToSelection(
      [],
      [fileOf('a.pdf', 10 * MB, 1), fileOf('b.pdf', 10 * MB, 2), fileOf('c.pdf', 5 * MB, 3)],
      rules,
    )
    expect(exact.accepted).toHaveLength(3)
    expect(totalSelectionBytes(exact.accepted)).toBe(25 * MB)

    const over = addFilesToSelection(
      [],
      [fileOf('a.pdf', 10 * MB, 1), fileOf('b.pdf', 10 * MB, 2), fileOf('c.pdf', 5 * MB + 1, 3)],
      rules,
    )
    expect(over.accepted).toHaveLength(2)
    expect(over.rejected).toEqual([
      { name: 'c.pdf', reason: 'total', message: 'المجموع الكلي للمرفقات أكبر من 25 ميجابايت.' },
    ])
  })

  it('rejects a duplicate (same name, size and modified time) but keeps a same-name file that differs', () => {
    const a = fileOf('a.pdf', 100, 7)
    const first = addFilesToSelection([], [a], rules).accepted
    const again = addFilesToSelection(first, [fileOf('a.pdf', 100, 7), fileOf('a.pdf', 101, 7), fileOf('a.pdf', 100, 8)], rules)
    expect(again.rejected).toEqual([{ name: 'a.pdf', reason: 'duplicate', message: 'هذا الملف مضاف مسبقاً.' }])
    expect(again.accepted).toHaveLength(2)
  })

  it('also catches a duplicate inside one drop', () => {
    const { accepted, rejected } = addFilesToSelection([], [fileOf('a.pdf', 1, 1), fileOf('a.pdf', 1, 1)], rules)
    expect(accepted).toHaveLength(1)
    expect(rejected[0].reason).toBe('duplicate')
  })

  it('one bad file never blocks the others and the reason names the file', () => {
    const { accepted, rejected } = addFilesToSelection(
      [],
      [fileOf('ok1.pdf', 10), fileOf('bad.exe', 10), fileOf('ok2.png', 10)],
      rules,
    )
    expect(accepted.map((a) => a.file.name)).toEqual(['ok1.pdf', 'ok2.png'])
    expect(rejected).toHaveLength(1)
    expect(rejected[0].name).toBe('bad.exe')
  })

  it('follows rules from the server, not hard-coded numbers', () => {
    const custom = parseAssignmentUploadRules({
      max_files: 2,
      max_total_bytes: 3 * MB,
      groups: [{ key: 'document', label_ar: 'المستندات', extensions: ['pdf'], max_bytes: 2 * MB }],
    })!
    const r = addFilesToSelection([], [fileOf('a.pdf', 2 * MB + 1), fileOf('b.png', 5), fileOf('c.pdf', 2 * MB, 1), fileOf('d.pdf', 2 * MB, 2)], custom)
    expect(r.rejected.map((x) => x.message)).toEqual([
      'حجم الملف أكبر من المسموح. الحد الأقصى 2 ميجابايت.',
      UNSUPPORTED_TYPE_MESSAGE,
      'المجموع الكلي للمرفقات أكبر من 3 ميجابايت.',
    ])
    expect(r.accepted.map((a) => a.file.name)).toEqual(['c.pdf'])
  })
})
