import { test, expect, type Page } from '@playwright/test'
import { mockApi } from './support/mocks'
import {
  COMMITMENT_STATEMENTS,
  MOTIVATION_STATEMENTS,
  SITUATIONAL_QUESTIONS,
} from '../src/components/volunteerOpportunities/volunteerFormSpec'

/**
 * The volunteer application (/volunteer/apply): fields that are easy to see and to tap, errors that say exactly what to
 * fix and take the person to it, on the screen sizes people actually use, with the mobile bottom bar present.
 */

const DRAFT_KEY = 'emc_volunteer_application_draft_v2'

const rate = (statements: ReadonlyArray<{ id: string }>) => Object.fromEntries(statements.map((s) => [s.id, 4]))

const COMPLETE_DRAFT = {
  full_name: 'أحمد محمد عبدالله السالم',
  email: 'ahmed@example.com',
  phone: '+967 770000000',
  country: { code: 'YE', name: 'اليمن', englishName: 'Yemen', dialCode: '+967', flag: '🇾🇪' },
  city: 'صنعاء',
  education_level: 'بكالوريوس',
  current_status: 'طالب',
  volunteer_days_availability: 'مرن',
  preferred_time_slot: 'مساءً',
  daily_hours: '2',
  has_previous_volunteering: false,
  motivation_ratings: rate(MOTIVATION_STATEMENTS),
  commitment_ratings: rate(COMMITMENT_STATEMENTS),
  situational_responses: Object.fromEntries(SITUATIONAL_QUESTIONS.map((q) => [q.id, q.options[0]])),
  primary_value_department: 'الإعلام',
  agree_terms: true,
}

async function seedDraft(page: Page, draft: Record<string, unknown> = COMPLETE_DRAFT) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [DRAFT_KEY, JSON.stringify(draft)])
}

async function openForm(page: Page) {
  await mockApi(page)
  await page.goto('/volunteer/apply')
  await expect(page.getByRole('heading', { level: 2, name: 'البيانات الشخصية' })).toBeVisible()
}

const SIZES = [
  { name: 'Samsung A-series', width: 360, height: 740 },
  { name: 'Samsung S-series', width: 412, height: 915 },
  { name: 'iPad portrait', width: 768, height: 1024 },
  { name: 'laptop', width: 1280, height: 800 },
]

test.describe('the first level on real screen sizes', () => {
  for (const size of SIZES) {
    test(`${size.name} (${size.width}px): every field is tall enough, readable, and inside the screen`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height })
      await openForm(page)

      const controls = [
        page.getByLabel(/الاسم الرباعي/),
        page.getByLabel(/تاريخ الميلاد/),
        page.getByLabel(/الجنسية/),
        page.getByLabel(/المدينة/),
        page.getByLabel(/رقم الجوال/),
        page.getByLabel(/البريد الإلكتروني/),
      ]
      for (const control of controls) {
        const box = await control.boundingBox()
        expect(box, 'the control is on the page').not.toBeNull()
        expect(box!.height, 'at least 52px tall (sub-pixel rounding allowed)').toBeGreaterThanOrEqual(51.5)
        expect(box!.x, 'not cut off on the left').toBeGreaterThanOrEqual(0)
        expect(box!.x + box!.width, 'not cut off on the right').toBeLessThanOrEqual(size.width)
        // 16px text stops Android and iOS from zooming the page when the field is focused
        const fontSize = await control.evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize))
        expect(fontSize).toBeGreaterThanOrEqual(16)
      }

      // the country picker is as tall as the other fields
      const country = page.locator('[data-field="country"] [class*="control"]').first()
      expect((await country.boundingBox())!.height).toBeGreaterThanOrEqual(51.5)

      // no sideways scrolling
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow).toBeLessThanOrEqual(0)
    })
  }

  test('a field is visibly bordered and a placeholder looks different from a value', async ({ page }) => {
    await openForm(page)
    const name = page.getByLabel(/الاسم الرباعي/)

    const border = await name.evaluate((el) => getComputedStyle(el).borderTopColor)
    expect(border).not.toBe('rgb(231, 227, 218)') // the old, nearly invisible line

    const placeholder = await name.evaluate((el) => getComputedStyle(el, '::placeholder').color)
    await name.fill('أحمد محمد')
    const value = await name.evaluate((el) => getComputedStyle(el).color)
    expect(placeholder).not.toBe(value)
  })
})

test.describe('what happens when something is wrong', () => {
  test('an empty first level lists every problem, puts the cursor on the first and leaves the buttons uncovered', async ({ page }) => {
    await openForm(page)

    await page.getByRole('button', { name: 'المستوى التالي' }).click()

    const summary = page.getByRole('alert')
    await expect(summary).toContainText('يوجد 5 حقول تحتاج إلى تصحيح')
    await expect(summary).toContainText('يرجى إدخال الاسم الرباعي.')
    await expect(page.getByLabel(/الاسم الرباعي/)).toBeFocused()
    await expect(page.getByLabel(/الاسم الرباعي/)).toHaveAttribute('aria-invalid', 'true')

    // the focused field is not hidden under the action bar or the mobile bottom bar (wait for the smooth scroll to end)
    const isCovered = () =>
      page.getByLabel(/الاسم الرباعي/).evaluate((el) => {
        const rect = el.getBoundingClientRect()
        const top = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)

        return top !== el && !el.contains(top)
      })
    await expect.poll(isCovered, { timeout: 5000 }).toBe(false)
  })

  test('the action buttons stay above the mobile bottom bar', async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 915 })
    await openForm(page)

    const next = page.getByRole('button', { name: 'المستوى التالي' })
    await next.scrollIntoViewIfNeeded()
    const box = (await next.boundingBox())!
    const bar = await page.getByRole('navigation', { name: 'شريط التنقل السفلي للهاتف' }).boundingBox()

    if (bar) expect(box.y + box.height).toBeLessThanOrEqual(bar.y + 1)
    await expect
      .poll(() =>
        next.evaluate((el) => {
          const rect = el.getBoundingClientRect()
          const top = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)

          return top !== el && !el.contains(top)
        }),
      )
      .toBe(false)
  })

  test('the server rejects an earlier level: the form goes back to it, marks the fields and keeps the data', async ({ page }) => {
    await seedDraft(page)
    await mockApi(page)
    await page.route('**/volunteer-requests', (route) =>
      route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Validation failed.',
          errors: {
            phone: ['The phone field is required.'],
            email: ['The email field must be a valid email address.'],
          },
        }),
      }),
    )
    await page.goto('/volunteer/apply')

    for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'المستوى التالي' }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'التوقعات والإدارات' })).toBeVisible()
    await page.getByRole('button', { name: 'إرسال طلب التطوع' }).click()

    await expect(page.getByRole('heading', { level: 2, name: 'البيانات الشخصية' })).toBeVisible()
    await expect(page.getByRole('alert')).toContainText('يوجد 2 حقول تحتاج إلى تصحيح')
    await expect(page.getByLabel(/رقم الجوال/)).toBeFocused()
    await expect(page.getByLabel(/البريد الإلكتروني/)).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByLabel(/البريد الإلكتروني/)).toHaveValue('ahmed@example.com')
    await expect(page.getByLabel(/الاسم الرباعي/)).toHaveValue('أحمد محمد عبدالله السالم')
  })

  test('a server fault shows one safe message with a retry, then a retry succeeds', async ({ page }) => {
    await seedDraft(page)
    await mockApi(page)
    let calls = 0
    await page.route('**/volunteer-requests', (route) => {
      calls += 1
      if (calls === 1) {
        return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Server Error' }) })
      }

      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true, data: { id: 1 } }) })
    })
    await page.goto('/volunteer/apply')
    for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'المستوى التالي' }).click()

    await page.getByRole('button', { name: 'إرسال طلب التطوع' }).click()
    const alert = page.getByRole('alert')
    await expect(alert).toContainText('خلل مؤقت في الخادم')
    await expect(alert).not.toContainText('Server Error')

    await alert.getByRole('button', { name: 'إعادة المحاولة' }).click()
    await expect(page.getByText(/تم استلام طلب التطوع/)).toBeVisible()
  })

  test('a dropped connection says the data is safe', async ({ page }) => {
    await seedDraft(page)
    await mockApi(page)
    await page.route('**/volunteer-requests', (route) => route.abort('failed'))
    await page.goto('/volunteer/apply')
    for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'المستوى التالي' }).click()

    await page.getByRole('button', { name: 'إرسال طلب التطوع' }).click()

    await expect(page.getByRole('alert')).toContainText('بياناتك محفوظة')
    await expect(page.getByLabel(/الاسم الرباعي/)).toHaveCount(0) // still on the last level
  })
})
