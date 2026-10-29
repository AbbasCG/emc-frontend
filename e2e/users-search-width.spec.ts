import { test, expect } from '@playwright/test'
import { mockApi, loginAs } from './support/mocks'

/**
 * Users management — search field must not collapse on desktop.
 *
 * Typing a query (or picking a filter) shows the "مسح التصفية" button; the
 * wider filter row used to squeeze the flex-basis-0 search input down to its
 * icon. The input must keep a usable width instead.
 */
test('users search field keeps its width while typing and filtering', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await mockApi(page)
  await loginAs(page, 'super_admin')
  await page.goto('/dashboard/super-admin/crud/users')

  // The sidebar has its own search box — target the one inside <main>.
  const search = page.locator('main input[type="search"]').first()
  await expect(search).toBeVisible()

  await search.fill('مدير الجودة')
  await expect(page.getByRole('button', { name: 'مسح التصفية' })).toBeVisible()
  expect((await search.boundingBox())!.width).toBeGreaterThan(250)
  await expect(search).toHaveValue('مدير الجودة')

  const selects = page.locator('main select:not([disabled])')
  for (let i = 0; i < 3; i++) await selects.nth(i).selectOption({ index: 1 })
  expect((await search.boundingBox())!.width).toBeGreaterThan(250)
})
