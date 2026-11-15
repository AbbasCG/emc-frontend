import { test, expect, type Page, type Route } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { mockApi, loginAs, COURSE_ENROLLED } from './support/mocks'

/**
 * Assignment submission — multi-file uploads, end to end against a mocked API.
 *
 * What unit tests cannot show: that the real multipart body carries `files[]` once per file with the Arabic
 * file name, that every failure shape ends in an Arabic message while the student's text and files stay put,
 * and that the modal fits a 375px phone. Set UPLOAD_SHOTS_DIR to also write screenshots for design review.
 */

const SHOT_DIR = process.env.UPLOAD_SHOTS_DIR
const CORS = {
  'Access-Control-Allow-Origin': 'http://localhost:4173',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json',
}

const ASSIGNMENT_ROW = {
  id: 55,
  course_assignment_id: 55,
  lms_assignment_id: 91,
  title: 'واجب كتابة التقارير',
  course: { id: COURSE_ENROLLED.id, title: 'دورة الكتابة المهنية' },
  deadline: '2026-12-20T10:00:00Z',
  max_points: 100,
  status: 'needs_resubmission',
  my_submission: { id: 400, status: 'needs_resubmission', submitted_at: '2026-11-10T09:00:00Z' },
}

const SUBMITTED_ROW = {
  id: 56,
  course_assignment_id: 56,
  lms_assignment_id: 92,
  title: 'واجب مسلَّم بملفات',
  course: { id: COURSE_ENROLLED.id, title: 'دورة الكتابة المهنية' },
  deadline: '2026-12-21T10:00:00Z',
  max_points: 50,
  status: 'submitted',
  my_submission: {
    id: 401,
    status: 'submitted',
    submitted_at: '2026-11-11T09:00:00Z',
    attachments: [
      {
        id: 7,
        name: 'تسليمي الأول.pdf',
        size: 2048,
        mime: 'application/pdf',
        download_url: 'http://127.0.0.1:8000/api/student/assignment-attachments/7/download',
      },
    ],
  },
}

const RULES = {
  success: true,
  data: {
    max_files: 5,
    max_total_bytes: 26214400,
    groups: [
      { key: 'image', label_ar: 'الصور', extensions: ['jpg', 'jpeg', 'png', 'webp'], max_bytes: 5242880 },
      { key: 'document', label_ar: 'المستندات', extensions: ['pdf', 'doc', 'docx'], max_bytes: 10485760 },
      { key: 'text', label_ar: 'الملفات النصية', extensions: ['txt'], max_bytes: 2097152 },
      { key: 'spreadsheet', label_ar: 'جداول البيانات', extensions: ['xls', 'xlsx', 'csv'], max_bytes: 10485760 },
      { key: 'archive', label_ar: 'الملفات المضغوطة', extensions: ['zip', 'rar', '7z'], max_bytes: 10485760 },
      { key: 'presentation', label_ar: 'العروض التقديمية', extensions: ['ppt', 'pptx'], max_bytes: 10485760 },
    ],
    accept: '.jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.txt,.xls,.xlsx,.csv,.zip,.rar,.7z,.ppt,.pptx',
  },
}

type Captured = { body: string; contentType: string }

type SubmitMode =
  | { kind: 'ok'; delayMs?: number }
  | { kind: 'json'; status: number; body: unknown }
  | { kind: 'abort' }

/** Routes the assignment list, the rules and the submit endpoint; every submit's multipart body is recorded. */
async function mockAssignments(page: Page, mode: () => SubmitMode): Promise<Captured[]> {
  const captured: Captured[] = []

  await page.route((u) => u.pathname.endsWith('/api/student/assignments'), (route) => {
    if (route.request().method() === 'OPTIONS') return route.fallback()
    return route.fulfill({ status: 200, headers: CORS, body: JSON.stringify({ data: [ASSIGNMENT_ROW, SUBMITTED_ROW] }) })
  })
  await page.route((u) => u.pathname.endsWith('/api/student/assignment-upload-rules'), (route) => {
    if (route.request().method() === 'OPTIONS') return route.fallback()
    return route.fulfill({ status: 200, headers: CORS, body: JSON.stringify(RULES) })
  })
  await page.route(
    (u) => /\/api\/student\/assignment-attachments\/\d+\/download$/.test(u.pathname),
    (route) => {
      if (route.request().method() === 'OPTIONS') return route.fallback()
      return route.fulfill({
        status: 200,
        headers: { 'Access-Control-Allow-Origin': 'http://localhost:4173', 'Access-Control-Allow-Credentials': 'true', 'Content-Type': 'application/pdf' },
        body: '%PDF-1.4 test',
      })
    },
  )
  await page.route((u) => /\/api\/student\/assignments\/\d+\/submit$/.test(u.pathname), async (route: Route) => {
    const request = route.request()
    if (request.method() === 'OPTIONS') return route.fallback()
    captured.push({ body: request.postDataBuffer()?.toString('utf8') ?? '', contentType: request.headers()['content-type'] ?? '' })
    const m = mode()
    if (m.kind === 'abort') return route.abort('failed')
    if (m.kind === 'json') return route.fulfill({ status: m.status, headers: CORS, body: JSON.stringify(m.body) })
    if (m.delayMs) await new Promise((r) => setTimeout(r, m.delayMs))
    return route.fulfill({
      status: 201,
      headers: CORS,
      body: JSON.stringify({ data: { id: 400, status: 'submitted', submitted_at: '2026-11-15T10:00:00Z', attachments: [] } }),
    })
  })
  return captured
}

const pdf = (name: string, size = 2000) => ({ name, mimeType: 'application/pdf', buffer: Buffer.alloc(size, 'a') })
const png = (name: string) => ({ name, mimeType: 'image/png', buffer: Buffer.alloc(1500, 'b') })
const txt = (name: string) => ({ name, mimeType: 'text/plain', buffer: Buffer.from('hello') })

async function openModal(page: Page): Promise<void> {
  await seedCookieConsent(page)
  await loginAs(page, 'student')
  await page.goto('/dashboard/student/assignments')
  await page.getByRole('button', { name: 'إعادة تسليم الواجب' }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('button', { name: 'إضافة ملفات' })).toBeVisible()
  await shot(page, '00-empty')
}

async function shot(page: Page, name: string): Promise<void> {
  if (!SHOT_DIR) return
  mkdirSync(SHOT_DIR, { recursive: true })
  await page.waitForTimeout(600) // let the modal finish its entrance animation
  await page.screenshot({ path: `${SHOT_DIR}/${test.info().project.name}-${name}.png`, fullPage: false })
}

/** The consent banner is a fixed overlay that is not part of this design; pre-seed consent (keys mirror src/lib/cookieConsent.ts). */
async function seedCookieConsent(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'emc_cookie_consent_v1',
      JSON.stringify({ version: 1, necessary: true, analytics: false, marketing: false, updatedAt: '2026-01-01T00:00:00Z' }),
    )
  })
}

async function fillAndPick(page: Page, files: ReturnType<typeof pdf>[]): Promise<void> {
  await page.getByPlaceholder('اكتب إجابتك هنا…').fill('هذه إجابتي المهمة التي لا يجب أن تضيع')
  await page.getByPlaceholder('ملاحظة للمدرب…').fill('ملاحظة للمدرب')
  await page.getByTestId('assignment-file-input').setInputFiles(files)
}

test.describe('assignment multi-file upload', () => {
  test('adds files, removes one, uploads with progress and sends files[] once per file', async ({ page }) => {
    await mockApi(page)
    const captured = await mockAssignments(page, () => ({ kind: 'ok', delayMs: 700 }))
    await openModal(page)

    await fillAndPick(page, [pdf('تقرير الواجب.pdf'), png('صورة الشاشة.png'), txt('remove-me.txt')])

    const list = page.getByRole('list', { name: 'الملفات المختارة' })
    await expect(list.getByRole('listitem')).toHaveCount(3)
    await expect(list).toContainText('تقرير الواجب.pdf')
    await expect(list).toContainText('المستندات')
    await expect(list).toContainText('الصور')
    await list.scrollIntoViewIfNeeded()
    await shot(page, '01-three-files')

    await page.getByRole('button', { name: 'إزالة الملف remove-me.txt' }).click()
    await expect(list.getByRole('listitem')).toHaveCount(2)
    await expect(list).not.toContainText('remove-me.txt')

    await page.getByRole('button', { name: 'إعادة تسليم الواجب' }).last().click()

    // While the request is in flight: progress bar, everything locked.
    const bar = page.getByRole('progressbar', { name: 'تقدّم رفع الملفات' })
    await expect(bar).toBeVisible()
    await expect(page.getByRole('button', { name: 'إضافة ملفات' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'إغلاق نافذة التسليم' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'جارٍ الإرسال…' })).toBeDisabled()
    await shot(page, '02-uploading')

    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(page.getByText('تمت إعادة تسليم الواجب بنجاح.')).toBeVisible()

    expect(captured).toHaveLength(1)
    const { body, contentType } = captured[0]
    expect(contentType).toContain('multipart/form-data')
    expect(body.match(/name="files\[\]"/g)).toHaveLength(2)
    expect(body).toContain('filename="تقرير الواجب.pdf"')
    expect(body).toContain('filename="صورة الشاشة.png"')
    expect(body).not.toContain('remove-me.txt')
    expect(body).toContain('name="text_answer"')
    expect(body).toContain('هذه إجابتي المهمة')
    expect(body).toContain('name="answer_text"')
    expect(body).toContain('name="notes"')
  })

  test('a 422 on files.0 names the file in Arabic and keeps the text and the files', async ({ page }) => {
    await mockApi(page)
    await mockAssignments(page, () => ({
      kind: 'json',
      status: 422,
      body: {
        message: 'The given data was invalid.',
        errors: { 'files.0': ['حجم الملف أكبر من المسموح. الحد الأقصى 10 ميجابايت.'], 'files.1': ['The files.1 failed to upload.'] },
      },
    }))
    await openModal(page)
    await fillAndPick(page, [pdf('تقرير الواجب.pdf'), png('صورة الشاشة.png')])
    await page.getByRole('button', { name: 'إعادة تسليم الواجب' }).last().click()

    const error = page.getByTestId('assignment-submit-error')
    await expect(error).toContainText('تقرير الواجب.pdf')
    await expect(error).toContainText('حجم الملف أكبر من المسموح. الحد الأقصى 10 ميجابايت.')
    await expect(error).toContainText('صورة الشاشة.png')
    await expect(error).toContainText('تعذّر رفع الملف. قد يكون حجمه أكبر مما يقبله الخادم.')
    await expect(error).not.toContainText('failed to upload')
    await shot(page, '03-422')

    await expect(page.getByPlaceholder('اكتب إجابتك هنا…')).toHaveValue('هذه إجابتي المهمة التي لا يجب أن تضيع')
    await expect(page.getByPlaceholder('ملاحظة للمدرب…')).toHaveValue('ملاحظة للمدرب')
    await expect(page.getByRole('list', { name: 'الملفات المختارة' }).getByRole('listitem')).toHaveCount(2)
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('the English «The file failed to upload.» never reaches the student', async ({ page }) => {
    await mockApi(page)
    await mockAssignments(page, () => ({ kind: 'json', status: 422, body: { message: 'The file failed to upload.' } }))
    await openModal(page)
    await fillAndPick(page, [pdf('a.pdf')])
    await page.getByRole('button', { name: 'إعادة تسليم الواجب' }).last().click()

    const error = page.getByTestId('assignment-submit-error')
    await expect(error).toContainText('تعذّر رفع الملف. قد يكون حجمه أكبر مما يقبله الخادم. قلّل حجم الملف أو تواصل مع الدعم.')
    await expect(page.getByRole('dialog')).not.toContainText('failed to upload')
  })

  test('a 413 explains the server limit and keeps the draft', async ({ page }) => {
    await mockApi(page)
    await mockAssignments(page, () => ({
      kind: 'json',
      status: 413,
      body: { success: false, code: 'payload_too_large', message: 'Payload Too Large', limits: { max_files: 5, max_total_bytes: 26214400 } },
    }))
    await openModal(page)
    await fillAndPick(page, [pdf('a.pdf'), pdf('b.pdf', 3000)])
    await page.getByRole('button', { name: 'إعادة تسليم الواجب' }).last().click()

    const error = page.getByTestId('assignment-submit-error')
    await expect(error).toContainText('حجم الملفات أكبر مما يقبله الخادم. قلّل عدد الملفات أو حجمها وحاول مرة أخرى.')
    await expect(error).toContainText('25 ميجابايت')
    await expect(page.getByPlaceholder('اكتب إجابتك هنا…')).toHaveValue('هذه إجابتي المهمة التي لا يجب أن تضيع')
    await expect(page.getByRole('list', { name: 'الملفات المختارة' }).getByRole('listitem')).toHaveCount(2)
  })

  test('a 413 with an Arabic server message shows that message, which names the real limit', async ({ page }) => {
    await mockApi(page)
    await mockAssignments(page, () => ({
      kind: 'json',
      status: 413,
      body: {
        success: false,
        code: 'payload_too_large',
        message: 'حجم الملفات أكبر مما يقبله الخادم (الحد 8 ميجابايت). قلّل عدد الملفات أو حجمها.',
        limits: { max_files: 5, max_total_bytes: 26214400, server_post_max_bytes: 8388608 },
      },
    }))
    await openModal(page)
    await fillAndPick(page, [pdf('تقرير الواجب.pdf')])
    await page.getByRole('button', { name: 'إعادة تسليم الواجب' }).last().click()

    const error = page.getByTestId('assignment-submit-error')
    await expect(error).toContainText('الحد 8 ميجابايت')
    await expect(error).not.toContainText('25 ميجابايت')
    await shot(page, '03b-413-server-message')
    await expect(page.getByPlaceholder('اكتب إجابتك هنا…')).toHaveValue('هذه إجابتي المهمة التي لا يجب أن تضيع')
  })

  test('a dropped connection shows the retry message; «إعادة المحاولة» resends the same files and succeeds', async ({ page }) => {
    await mockApi(page)
    let mode: SubmitMode = { kind: 'abort' }
    const captured = await mockAssignments(page, () => mode)
    await openModal(page)
    await fillAndPick(page, [pdf('تقرير الواجب.pdf'), png('صورة الشاشة.png')])
    await page.getByRole('button', { name: 'إعادة تسليم الواجب' }).last().click()

    const error = page.getByTestId('assignment-submit-error')
    await expect(error).toContainText('انقطع الاتصال أثناء الرفع. تحقق من الإنترنت ثم اضغط «إعادة المحاولة».')
    await expect(page.getByPlaceholder('اكتب إجابتك هنا…')).toHaveValue('هذه إجابتي المهمة التي لا يجب أن تضيع')
    await expect(page.getByRole('list', { name: 'الملفات المختارة' }).getByRole('listitem')).toHaveCount(2)
    await shot(page, '04-network')

    mode = { kind: 'ok' }
    await error.getByRole('button', { name: 'إعادة المحاولة' }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(page.getByText('تمت إعادة تسليم الواجب بنجاح.')).toBeVisible()

    expect(captured).toHaveLength(2)
    expect(captured[1].body.match(/name="files\[\]"/g)).toHaveLength(2)
    expect(captured[1].body).toContain('filename="تقرير الواجب.pdf"')
  })

  test('rejects an unsupported or oversized file inline without blocking the valid one', async ({ page }) => {
    await mockApi(page)
    await mockAssignments(page, () => ({ kind: 'ok' }))
    await openModal(page)
    await page.getByTestId('assignment-file-input').setInputFiles([
      pdf('valid.pdf'),
      { name: 'malware.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('MZ') },
      { name: 'huge.png', mimeType: 'image/png', buffer: Buffer.alloc(5 * 1024 * 1024 + 1, 'z') },
    ])

    const alert = page.getByRole('alert').filter({ hasText: 'لم تتم إضافة' })
    await expect(alert).toContainText('malware.exe')
    await expect(alert).toContainText('نوع الملف غير مدعوم. يمكنك رفع الصور وPDF وWord وExcel والملفات المضغوطة.')
    await expect(alert).toContainText('huge.png')
    await expect(alert).toContainText('حجم الملف أكبر من المسموح. الحد الأقصى 5 ميجابايت.')
    await expect(page.getByRole('list', { name: 'الملفات المختارة' }).getByRole('listitem')).toHaveCount(1)
    await shot(page, '05-rejections')
  })

  test('shows the submitted files on the card and downloads one under its Arabic name', async ({ page }) => {
    await mockApi(page)
    await mockAssignments(page, () => ({ kind: 'ok' }))
    await seedCookieConsent(page)
    await loginAs(page, 'student')
    await page.goto('/dashboard/student/assignments')

    await expect(page.getByText('تسليمي الأول.pdf')).toBeVisible()
    await shot(page, '06-card-files')
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'تنزيل تسليمي الأول.pdf' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('تسليمي الأول.pdf')
  })

  test('fits a 375px phone: nothing overflows and tap targets are at least 40px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await mockApi(page)
    await mockAssignments(page, () => ({ kind: 'ok' }))
    await openModal(page)
    await fillAndPick(page, [
      pdf('تقرير_المشروع_النهائي_للدورة_الاحترافية_في_الكتابة_المهنية_النسخة_الثالثة_بعد_المراجعة.pdf'),
      png('a-very-long-english-screenshot-file-name-that-keeps-going-and-going-and-going-2026.png'),
      txt('ملاحظات.txt'),
    ])
    await expect(page.getByRole('list', { name: 'الملفات المختارة' }).getByRole('listitem')).toHaveCount(3)
    await page.getByRole('list', { name: 'الملفات المختارة' }).scrollIntoViewIfNeeded()
    await shot(page, '07-mobile-375')

    const overflow = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"] > div') as HTMLElement
      const body = dialog.querySelector('form > div') as HTMLElement
      return {
        page: document.documentElement.scrollWidth - window.innerWidth,
        panel: dialog.scrollWidth - dialog.clientWidth,
        body: body.scrollWidth - body.clientWidth,
        offenders: Array.from(body.querySelectorAll('*'))
          .filter((el) => el.getBoundingClientRect().width > body.clientWidth + 1)
          .slice(0, 5)
          .map((el) => `${el.tagName}.${String(el.getAttribute('class') ?? '').slice(0, 60)}`),
      }
    })
    expect(overflow.page).toBeLessThanOrEqual(0)
    expect(overflow.panel).toBeLessThanOrEqual(0)
    expect(overflow.body, overflow.offenders.join(' | ')).toBeLessThanOrEqual(0)

    const targets = [
      page.getByRole('button', { name: 'إضافة ملفات' }),
      page.getByRole('button', { name: /^إزالة الملف/ }).first(),
      page.getByRole('button', { name: /^إعادة تسليم الواجب$/ }).last(),
    ]
    for (const t of targets) {
      const box = await t.boundingBox()
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(40)
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(40)
    }
  })
})
