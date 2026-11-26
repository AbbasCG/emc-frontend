import { test, expect, type Page } from '@playwright/test'
import { mockApi, loginAs } from './support/mocks'

/**
 * Layout of the work boards: «مهامي ومسؤولياتي», the management kanban, the agile board and the tickets board.
 *
 *  - the document never scrolls sideways (scrollWidth <= innerWidth) at 375 / 768 / 1280;
 *  - on 768px and below a status switcher replaces the strip of columns;
 *  - the task-create modal has ONE scroll area with its header and action footer always visible.
 *
 * Everything is served from fixtures (no backend), like the other specs.
 */

const WIDTHS = [375, 768, 1280] as const
const iso = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString()

const task = (id: number, status: string, over: Record<string, unknown> = {}) => ({
  id, title: `مهمة رقم ${id} بعنوان طويل نسبيًا لاختبار التفاف النص داخل البطاقة`, description: 'وصف', priority: 'medium', task_scope: 'medium', points: 100,
  estimated_hours: 2, status, acceptance_status: 'accepted', locked_at: null, locked_by: null, due_date: '2099-01-01T00:00:00.000000Z',
  department: { id: 1, name: 'الإعلام' }, assigned_to: { id: 1, name: 'مدير' }, ...over,
})

const BOARD = Object.fromEntries(
  ['idea', 'under_review', 'planning', 'waiting_approval', 'in_progress', 'needs_evaluation', 'completed', 'postponed', 'cancelled'].map((s, i) => [s, [task(i + 1, s)]]),
)

const MY_TICKETS = [
  { id: 11, ticket_number: 'EMC-11', title: 'تعطل البريد', description: 'x', status: 'ASSIGNED', priority: 'HIGH', department: { id: 1, name: 'التقنية' }, expected_resolution_time: iso(24), is_delayed: false, task_scope: 'medium', task_points: 120, estimated_hours: 2.5, capabilities: { can_accept: true, can_reject: true, can_complete: false, can_open: true } },
  { id: 12, ticket_number: 'EMC-12', title: 'بطء الشبكة', description: 'x', status: 'IN_PROGRESS', priority: 'LOW', department: { id: 1, name: 'التقنية' }, expected_resolution_time: iso(48), is_delayed: false, task_scope: null, task_points: null, estimated_hours: null, capabilities: { can_complete: true, can_open: true } },
]

async function serve(page: Page) {
  await mockApi(page, { role: 'super_admin' })
  await loginAs(page, 'super_admin')
  const json = (data: unknown, extra: Record<string, unknown> = {}) => ({ json: { success: true, data, ...extra } })
  await page.route('**/api/v1/tickets/my-work', (r) => r.fulfill(json(MY_TICKETS, { meta: { open_total: 2, closed_total: 0, truncated: false } })))
  await page.route('**/api/admin/tasks/my', (r) => r.fulfill(json([task(21, 'planning', { acceptance_status: 'pending' }), task(22, 'in_progress')])))
  await page.route('**/api/operations/board**', (r) => r.fulfill(json(BOARD)))
  // The global board (`/dashboard/operations/board`) reads its columns AND what the viewer may do to tasks from the server:
  // the «إسناد مهمة جديدة» button exists only when `meta.task_actions.can_create`, and the modal lists the departments of the task-scope endpoint.
  await page.route('**/api/operations/work-board**', (r) =>
    r.fulfill(json({ columns: [] }, { meta: { scope: 'all', kind: 'all', per_column: 30, column: null, page: 1, counts: { all: 0, tasks: 0, tickets: 0 }, task_actions: { can_create: true, can_assign: true, can_update: true, manageable_department_ids: null }, generated_at: null } })),
  )
  await page.route('**/api/operations/board/task-scope/departments', (r) => r.fulfill(json([{ id: 1, name: 'الإعلام', name_ar: 'الإعلام' }], { meta: { manageable_department_ids: null } })))
  await page.route('**/api/operations/board/task-scope/departments/*/members', (r) => r.fulfill(json([])))
  await page.route('**/api/v1/tickets/board**', (r) =>
    r.fulfill(json({ columns: ['PENDING_APPROVAL', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'UNRESOLVED', 'REJECTED_BY_ADMIN', 'REJECTED_BY_ASSIGNEE'].map((status) => ({ status, count: 1, tickets: [{ ...MY_TICKETS[0], status, ticket_category: 'OLD_ISSUE', created_by_name: 'x', department_id: 1, created_at: iso(-5), updated_at: iso(-1), capabilities: {} }] })) })),
  )
}

const noSidewaysScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)

for (const width of WIDTHS) {
  test.describe(`${width}px`, () => {
    test.beforeEach(async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'sizes are set inside the test')
      await page.setViewportSize({ width, height: 800 })
      await serve(page)
    })

    test('«مهامي ومسؤولياتي»: no sideways scroll; switcher on narrow, wrapping grid on wide', async ({ page }) => {
      await page.goto('/dashboard/admin/tasks/my')
      // the top bar repeats the page title in its own h1: the page's heading is the last one
      await expect(page.getByRole('heading', { level: 1, name: 'مهامي ومسؤولياتي' }).last()).toBeVisible()
      await expect(page.getByText('تعطل البريد').first()).toBeVisible()
      expect(await noSidewaysScroll(page)).toBe(true)

      const board = page.getByTestId('my-work-board')
      if (width <= 768) {
        await expect(board).toHaveAttribute('data-layout', 'tabs')
        await expect(page.getByRole('tab')).toHaveCount(8)
        await page.getByRole('tab', { name: /قيد التنفيذ/ }).click()
        await expect(page.getByText('بطء الشبكة')).toBeVisible()
      } else {
        await expect(board).toHaveAttribute('data-layout', 'grid')
        await expect(page.getByRole('region')).toHaveCount(8)
        // no column is cut off by the viewport
        for (const box of await page.getByRole('region').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().right))) expect(box).toBeLessThanOrEqual(width + 1)
      }
    })

    test('the management kanban shows all nine statuses without clipping', async ({ page }) => {
      await page.goto('/dashboard/admin/tasks/kanban')
      await expect(page.getByTestId('tasks-kanban')).toBeVisible()
      expect(await noSidewaysScroll(page)).toBe(true)
      if (width <= 768) await expect(page.getByRole('tab')).toHaveCount(9)
      else await expect(page.getByRole('region')).toHaveCount(9)
    })

    test('the agile board adapts to the width', async ({ page }) => {
      await page.goto('/dashboard/operations/board')
      await expect(page.getByTestId('operations-board')).toBeVisible()
      expect(await noSidewaysScroll(page)).toBe(true)
    })

    test('the tickets board adapts to the width', async ({ page }) => {
      await page.goto('/dashboard/tickets/admin?view=board')
      await expect(page.getByTestId('ticket-status-board')).toBeVisible()
      expect(await noSidewaysScroll(page)).toBe(true)
    })

    test('the task-create modal: one scroll area, header and footer always visible', async ({ page }) => {
      await page.goto('/dashboard/operations/board')
      await page.getByRole('button', { name: /إسناد مهمة جديدة/ }).first().click()
      const dialog = page.getByTestId('task-create-modal')
      await expect(dialog).toBeVisible()
      expect(await noSidewaysScroll(page)).toBe(true)
      expect(await dialog.locator('.overflow-y-auto').count()).toBe(1)

      const submit = dialog.getByRole('button', { name: /إسناد المهمة الآن/ })
      const box = await submit.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.y + box!.height).toBeLessThanOrEqual(800)
      expect(box!.x).toBeGreaterThanOrEqual(0)
      await expect(dialog.getByRole('button', { name: 'إلغاء' })).toBeInViewport()
      // the page behind does not scroll while it is open
      expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe('hidden')

      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
    })
  })
}
