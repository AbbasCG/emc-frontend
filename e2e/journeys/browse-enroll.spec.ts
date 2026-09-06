import { test, expect } from '@playwright/test'
import { mockApi, loginAs, COURSE_MAIN, ERROR_BOUNDARY_TEXT } from '../support/mocks'

/**
 * Journey 1 — browse → course detail → enroll (free course, mocked API).
 *
 * Phase A (guest): home hero renders (confirmed +20,000 stat pill), hero CTA
 * leads to the catalog, the mocked course card opens the detail page.
 * Phase B (seeded student): the detail CTA becomes "الالتحاق بالدورة",
 * the enrollment form (prefilled from the auth profile) submits against the
 * mocked POST /courses/{id}/register and the success banner appears.
 */
test('guest browses catalog, student enrolls in mocked course', async ({ page }) => {
  await mockApi(page)

  // ── Phase A: guest on the home page ──
  await page.goto('/')
  // Confirmed hero stat pill (HomeCinematicHero → <StatPill value="+20,000" label="مستفيد" />)
  await expect(page.getByText('+20,000').first()).toBeVisible()
  await expect(page.getByText(ERROR_BOUNDARY_TEXT)).toHaveCount(0)

  // Hero CTA → /courses (visible on both desktop and mobile)
  await page.getByRole('link', { name: 'استكشف البرامج' }).click()
  await expect(page).toHaveURL(/\/courses$/)
  await expect(
    page.getByRole('heading', { name: 'استكشف برامجنا' }),
  ).toBeVisible()

  // Mocked course card is rendered from GET /courses
  await expect(page.getByText(COURSE_MAIN.title).first()).toBeVisible()

  // Open the detail page via the card's "تفاصيل" link
  const card = page
    .locator('article')
    .filter({ hasText: COURSE_MAIN.title })
    .first()
  await card.getByRole('link', { name: /تفاصيل/ }).click()
  await expect(page).toHaveURL(new RegExp(`/courses/${COURSE_MAIN.slug}$`))
  await expect(
    page.getByRole('heading', { name: COURSE_MAIN.title }).first(),
  ).toBeVisible()

  // ── Phase B: same course, now as a seeded (storage-authenticated) student ──
  await loginAs(page, 'student')
  await page.goto(`/courses/${COURSE_MAIN.slug}`)

  // Free + registration_open + not enrolled + student → CTA links to /register
  const enrollCta = page.getByRole('link', { name: 'الالتحاق بالدورة' }).first()
  await expect(enrollCta).toBeVisible()
  await enrollCta.click()
  await expect(page).toHaveURL(new RegExp(`/courses/${COURSE_MAIN.slug}/register$`))

  // Enrollment form is prefilled from the mocked auth profile
  const nameInput = page.getByLabel('الاسم الكامل')
  await expect(nameInput).toHaveValue('طالب الاختبار')
  await expect(page.getByLabel('البريد الإلكتروني')).toHaveValue('student@emc.test')

  // Submit the mocked enrollment
  await page.getByRole('button', { name: 'إكمال التسجيل' }).click()

  // Success UI: redirected back to the detail page with ?enrolled=1 + banner
  await expect(page).toHaveURL(/enrolled=1/)
  await expect(page.getByText('تم تسجيلك في الدورة بنجاح')).toBeVisible()
  await expect(page.getByText(ERROR_BOUNDARY_TEXT)).toHaveCount(0)
})
