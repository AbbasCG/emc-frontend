import { test, expect } from '@playwright/test'
import { mockApi, ERROR_BOUNDARY_TEXT } from '../support/mocks'

/**
 * Journey 3 — public workshop-request wizard (src/pages/SubmitWorkshop.tsx).
 *
 * Fills the minimal required fields of every step (only time-slot 1 — slots
 * 2/3 are optional), submits against the mocked POST /workshop-requests and
 * asserts the success dialog. The date is picked via the calendar's "غداً"
 * quick preset; times via the Google-style picker's manual input + the
 * "+1 ساعة" duration preset.
 */
test('visitor submits a workshop request through the 4-step wizard', async ({ page }) => {
  await mockApi(page)

  await page.goto('/submit-workshop')
  await expect(
    page.getByRole('heading', { name: 'تقديم ورشة عمل', level: 1 }),
  ).toBeVisible()

  // ── Step 1 — بيانات مقدم الطلب ──
  await page.locator('input[name="requester_name"]').fill('أحمد الاختبار')
  await page.locator('input[name="requester_email"]').fill('ahmad@emc.test')
  await page.locator('input[name="requester_phone"]').fill('+31612345678')
  await page.locator('input[name="requester_department"]').fill('قسم الجودة')
  await page.getByRole('button', { name: 'التالي' }).click()

  // ── Step 2 — بيانات الورشة ──
  const programName = page.locator('input[name="program_name"]')
  await expect(programName).toBeVisible()
  await programName.fill('مقدمة عملية في الذكاء الاصطناعي')
  // Category checkbox inputs are sr-only — click the wrapping label text
  await page
    .getByText('الذكاء الاصطناعي والتمكين الرقمي', { exact: true })
    .click()
  await page.locator('input[name="speaker_name"]').fill('م. سارة الأحمد')
  await page.locator('input[name="speaker_job_title"]').fill('مستشارة تطوير مهني')
  await page.getByRole('button', { name: 'التالي' }).click()

  // ── Step 3 — تفاصيل التنفيذ (slot 1 only) ──
  const topics = page.locator('textarea[name="topics"]')
  await expect(topics).toBeVisible()
  await topics.fill('مقدمة نظرية، تطبيق عملي، أسئلة وأجوبة.')
  await page.locator('textarea[name="target_audience"]').fill('طلبة الجامعات والخريجون الجدد.')

  // Date (slot 1): open the calendar popover → quick preset "غداً"
  await page
    .getByRole('button', { name: /التاريخ: اختر التاريخ/ })
    .first()
    .click()
  await page.getByRole('button', { name: 'غداً', exact: true }).click()

  // Start time (slot 1): open picker → type manually → Enter
  await page.getByRole('button', { name: 'وقت البداية' }).first().click()
  const manualTime = page.getByLabel('أدخل الوقت يدوياً')
  await manualTime.fill('10:00')
  await manualTime.press('Enter')

  // End time (slot 1): the "+1 ساعة" preset appears once start time is set
  await page.getByRole('button', { name: '+1 ساعة' }).first().click()

  // Location type checkbox (sr-only input → click the label text)
  await page.getByText('Zoom', { exact: true }).click()
  await page.getByRole('button', { name: 'التالي' }).click()

  // ── Step 4 — المراجعة والإرسال (price_type defaults to "مجانية") ──
  // "نوع السعر" only renders when step 4 is active (unlike the step-list labels)
  await expect(page.getByText('نوع السعر').first()).toBeVisible()
  await page.getByRole('button', { name: 'إرسال الطلب' }).click()

  // ── Success dialog (WorkshopSuccessCelebration) ──
  // Scoped by accessible name: the cookie-consent banner (CookieBanner.tsx)
  // also carries role="dialog", so a bare getByRole('dialog') is ambiguous
  // (Playwright strict-mode violation).
  const dialog = page.getByRole('dialog', { name: 'تم استلام الطلب بنجاح' })
  await expect(dialog).toBeVisible()
  await expect(
    dialog.getByRole('heading', { name: 'تم استلام الطلب بنجاح' }),
  ).toBeVisible()
  await expect(page.getByText(ERROR_BOUNDARY_TEXT)).toHaveCount(0)
})
