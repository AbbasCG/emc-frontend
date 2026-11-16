import { test, expect, type Page, type Route } from '@playwright/test'
import { mockApi, loginAs, USERS, tokenFor } from './support/mocks'

/**
 * Volunteer onboarding, end to end against a mocked API:
 *   1. HR accepts a volunteer request -> the convert POPUP (department suggestion, change, result, resend e-mail).
 *   2. The converted volunteer signs in with the temporary password -> FORCED password change -> normal landing.
 *
 * The API is never real: both scenarios layer their own routes on top of the shared mocks (a later page.route wins,
 * and `route.fallback()` hands everything else back to the shared handler).
 */

const CORS = {
  'Access-Control-Allow-Origin': 'http://localhost:4173',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json',
}

/** The cookie banner sits over the bottom of the page (and the phone viewport): accept it so clicks land. */
async function dismissCookies(page: Page) {
  const accept = page.getByRole('button', { name: 'قبول الكل' })
  if (await accept.isVisible().catch(() => false)) await accept.click()
}

const reply = (route: Route, body: unknown, status = 200) => route.fulfill({ status, headers: CORS, body: JSON.stringify(body) })
const apiPath = (route: Route) => {
  const url = new URL(route.request().url())
  const i = url.pathname.indexOf('/api/')

  return i >= 0 ? url.pathname.slice(i + 4) : url.pathname
}

/* ── 1. the convert popup ─────────────────────────────────────────── */

const ACCEPTED = {
  id: 7,
  full_name: 'علي حسن',
  email: 'ali.volunteer@example.com',
  phone: '+31600000007',
  city: 'أمستردام',
  desired_department: 'الإعلام والتسويق',
  suggested_department_id: 4,
  suggested_department_name: 'الإعلام والتسويق',
  status: 'accepted',
  accepted_at: '2026-11-10T10:00:00Z',
  is_converted: false,
  can_convert_to_member: true,
}

async function mockConvertFlow(page: Page) {
  const calls = { convertBody: null as unknown, resend: 0, accepted: 0 }
  let converted = false

  await page.route('**/api/**', async (route) => {
    const method = route.request().method()
    const path = apiPath(route)
    if (method === 'OPTIONS') return route.fallback()

    if (method === 'GET' && path === '/admin/volunteers/accepted') {
      calls.accepted++
      const row = converted ? { ...ACCEPTED, status: 'converted_to_member', is_converted: true, can_convert_to_member: false } : ACCEPTED

      return reply(route, {
        success: true,
        data: { data: [row], meta: { total: 1, current_page: 1, last_page: 1, per_page: 200 } },
        meta: { total_accepted: converted ? 0 : 1, total_converted: converted ? 1 : 0, accepted_this_month: 1, top_department: 'الإعلام والتسويق' },
      })
    }
    if (method === 'GET' && path === '/departments/options') {
      return reply(route, { success: true, data: [{ id: 3, name_ar: 'الموارد البشرية' }, { id: 4, name_ar: 'الإعلام والتسويق' }, { id: 5, name_ar: 'التقنية' }] })
    }
    if (method === 'POST' && path === '/admin/volunteer-requests/7/convert-to-member') {
      calls.convertBody = route.request().postDataJSON()
      converted = true

      return reply(
        route,
        {
          success: true,
          message: 'تم تحويل المتطوع إلى عضو وإنشاء حسابه.',
          volunteer_request: { ...ACCEPTED, status: 'converted_to_member', is_converted: true, converted_member_id: 99 },
          data: {
            id: 99, name_ar: 'علي حسن', position_ar: 'عضو', role_key: 'department_member', department_id: 5, department_name: 'التقنية',
            member_type: 'volunteer', source: 'volunteer_request', source_id: 7, is_new_member: true, joined_at: '2026-11-16', is_active: true,
            has_user_account: true, user_id: 501, account_created: true, account_existing: false, email_sent: false,
          },
        },
        201,
      )
    }
    if (method === 'POST' && path === '/admin/volunteer-requests/7/resend-credentials') {
      calls.resend++

      return reply(route, { success: true, email_sent: true })
    }

    return route.fallback()
  })

  return calls
}

test('HR converts an accepted volunteer through the popup: suggested department, change it, result, resend e-mail', async ({ page }) => {
  await mockApi(page)
  const calls = await mockConvertFlow(page)
  await loginAs(page, 'super_admin')
  await page.goto('/dashboard/volunteer')
  await expect(page.getByText('علي حسن').first()).toBeVisible()
  await dismissCookies(page)

  // Nothing converts from the row button: it opens the confirmation popup.
  await page.getByRole('button', { name: /تحويل إلى عضو/ }).click()
  const dialog = page.getByRole('dialog', { name: 'تحويل المتطوع إلى عضو' })
  await expect(dialog).toBeVisible()
  expect(calls.convertBody).toBeNull()

  // What they applied for + the server's suggestion pre-selected.
  await expect(dialog.getByTestId('applied-department')).toHaveText('الإعلام والتسويق')
  const select = dialog.getByRole('combobox', { name: 'الإدارة التي سيُضاف إليها العضو' })
  await expect(select).toHaveValue('4')
  await expect(dialog.getByText('يُطلب منه اختيار كلمة مرور جديدة عند أول دخول بكلمة مرور مؤقتة.')).toBeVisible()

  // HR changes the department, then approves.
  await select.selectOption('5')
  await dialog.getByRole('button', { name: 'اعتماد الإدارة وإنشاء الحساب' }).click()

  await expect.poll(() => calls.convertBody).toEqual({ department_id: 5 })
  await expect(dialog.getByText('تم تحويل المتطوع إلى عضو وإنشاء حسابه.')).toBeVisible()
  await expect(dialog.getByTestId('account-outcome')).toContainText('أُنشئ حساب جديد')

  // The e-mail did not go out: a visible warning, and the resend button fixes it.
  const warning = dialog.getByTestId('email-warning')
  await expect(warning).toBeVisible()
  await warning.getByRole('button', { name: 'إعادة إرسال بيانات الدخول' }).click()
  await expect(dialog.getByTestId('email-outcome')).toContainText('أُعيد إرسال بيانات الدخول')
  await expect(warning).toHaveCount(0)
  await expect.poll(() => calls.resend).toBe(1)

  // Closing shows the list refreshed: the row is «تم التحويل» and no convert button is left.
  await dialog.getByRole('button', { name: 'إغلاق', exact: true }).last().click()
  await expect(page.getByRole('dialog', { name: 'تحويل المتطوع إلى عضو' })).toHaveCount(0)
  await expect(page.getByText('تم التحويل').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /تحويل إلى عضو/ })).toHaveCount(0)
  await expect.poll(() => calls.accepted).toBeGreaterThanOrEqual(2)
})

/* ── 2. forced password change ────────────────────────────────────── */

test('a volunteer on a temporary password is held on the change-password page until they set their own', async ({ page }) => {
  await mockApi(page)
  const flagged = { current: true }
  const volunteer = (mustChange: boolean) => ({ ...USERS.volunteer, must_change_password: mustChange })
  let changeBody: unknown = null

  await page.route('**/api/**', async (route) => {
    const method = route.request().method()
    const path = apiPath(route)
    if (method === 'OPTIONS') return route.fallback()

    if (method === 'POST' && path === '/auth/login') {
      return reply(route, { success: true, data: { token: tokenFor('volunteer'), user: volunteer(true), permissions: [] } })
    }
    if (method === 'GET' && path === '/auth/me') {
      return reply(route, { success: true, data: { user: volunteer(flagged.current), permissions: [] } })
    }
    if (method === 'POST' && path === '/auth/logout') return reply(route, { success: true })
    if (method === 'POST' && path === '/auth/change-password') {
      changeBody = route.request().postDataJSON()
      const body = changeBody as { current_password: string; password: string }
      if (body.current_password !== 'Temp-Pass-1') {
        return reply(route, { message: 'The given data was invalid.', errors: { current_password: ['كلمة المرور المؤقتة غير صحيحة.'] } }, 422)
      }
      flagged.current = false

      return reply(route, { success: true })
    }
    // While flagged, every other AUTHENTICATED call is refused with the gate code (anonymous calls are not gated).
    if (flagged.current && route.request().headers()['authorization'] && path !== '/auth/me/page-access') {
      return reply(route, { success: false, code: 'PASSWORD_CHANGE_REQUIRED', message: 'يجب تغيير كلمة المرور أولًا.' }, 403)
    }

    return route.fallback()
  })

  // Login with the temporary password lands directly on the gate.
  await page.goto('/login')
  await dismissCookies(page)
  await page.locator('#login-email').fill('ali.volunteer@example.com')
  await page.locator('#login-password').fill('Temp-Pass-1')
  await page.getByRole('button', { name: /تسجيل الدخول/ }).click()
  await expect(page).toHaveURL(/\/change-password-required$/)
  await expect(page.getByRole('heading', { name: 'اختر كلمة مرور جديدة' })).toBeVisible()

  // No dashboard shell (sidebar/topbar) here, and every other protected URL bounces back.
  await expect(page.getByRole('navigation')).toHaveCount(0)
  await page.goto('/dashboard/ops/volunteers')
  await expect(page).toHaveURL(/\/change-password-required$/)
  await page.goto('/dashboard/profile')
  await expect(page).toHaveURL(/\/change-password-required$/)

  // Client-side rules, then a wrong temporary password is refused inline.
  const submit = page.getByRole('button', { name: 'حفظ كلمة المرور والمتابعة' })
  await expect(submit).toBeDisabled()
  await page.getByLabel('كلمة المرور المؤقتة', { exact: true }).fill('Wrong-Temp-9')
  await page.getByLabel('كلمة المرور الجديدة', { exact: true }).fill('MyOwn-Secret-2026')
  await page.getByLabel('تأكيد كلمة المرور الجديدة', { exact: true }).fill('MyOwn-Secret-2026')
  await expect(submit).toBeEnabled()
  await submit.click()
  await expect(page.getByText('كلمة المرور المؤقتة غير صحيحة.')).toBeVisible()
  await expect(page).toHaveURL(/\/change-password-required$/)

  // The right one: the flag clears, /auth/me is re-read and the user leaves for the normal landing page.
  await page.getByLabel('كلمة المرور المؤقتة', { exact: true }).fill('Temp-Pass-1')
  await submit.click()
  await expect(page).not.toHaveURL(/change-password-required/)
  await expect(page).toHaveURL(/\/dashboard/)
  await expect.poll(() => changeBody).toEqual({ current_password: 'Temp-Pass-1', password: 'MyOwn-Secret-2026', password_confirmation: 'MyOwn-Secret-2026' })

  // And the page is no longer reachable for them.
  await page.goto('/change-password-required')
  await expect(page).not.toHaveURL(/change-password-required/)
})
