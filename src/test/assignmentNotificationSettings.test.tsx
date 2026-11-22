import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import AssignmentNotificationPreferences from '@/components/settings/AssignmentNotificationPreferences'
import AssignmentNotificationAdminPanel from '@/components/settings/AssignmentNotificationAdminPanel'
import type { AdminAssignmentSetting, UserAssignmentPreference } from '@/api/assignmentNotificationsApi'

/**
 * «إشعارات إسناد التذاكر»: the user's own section (account notification settings)
 * and the admin panel (email settings). Two independent types x two independent
 * channels; delivery itself is decided and tested on the backend.
 */

const api = vi.hoisted(() => ({
  fetchAssignmentPreferences: vi.fn(),
  saveAssignmentPreferences: vi.fn(),
  fetchAdminAssignmentSettings: vi.fn(),
  saveAdminAssignmentSettings: vi.fn(),
}))
vi.mock('@/api/assignmentNotificationsApi', async (orig) => ({ ...(await orig<object>()), ...api }))

const ch = (enabled = true, available = true, customized = false) => ({ enabled, available, customized })

function prefs(over: Partial<Record<string, Partial<UserAssignmentPreference['channels']>>> = {}): UserAssignmentPreference[] {
  return [
    { type: 'operations_ticket_assigned', label: 'إسناد تذكرة العمليات', description: 'عمليات', channels: { email: ch(), in_app: ch(), ...over.operations_ticket_assigned } },
    { type: 'ticket_assigned', label: 'إسناد تذكرة الدعم الفني', description: 'دعم', channels: { email: ch(true, false), in_app: ch(), ...over.ticket_assigned } },
  ]
}

const toggle = (name: RegExp) => screen.getByRole('switch', { name })

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset())
})

describe('AssignmentNotificationPreferences (user)', () => {
  it('shows both types separately, each with its own email and in-app switch, defaults on', async () => {
    api.fetchAssignmentPreferences.mockResolvedValue(prefs())
    render(<AssignmentNotificationPreferences />)

    const ops = within(await screen.findByTestId('assignment-pref-operations_ticket_assigned'))
    const support = within(screen.getByTestId('assignment-pref-ticket_assigned'))
    expect(ops.getByText('إسناد تذكرة العمليات')).toBeInTheDocument()
    expect(support.getByText('إسناد تذكرة الدعم الفني')).toBeInTheDocument()
    expect(ops.getAllByRole('switch')).toHaveLength(2)
    expect(toggle(/العمليات — البريد الإلكتروني/)).toHaveAttribute('aria-checked', 'true')
    expect(toggle(/العمليات — داخل المنصة/)).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('button', { name: 'حفظ تفضيلات الإسناد' })).toBeDisabled()
  })

  it('marks a channel the admin turned off as unavailable, keeping the saved choice visible', async () => {
    api.fetchAssignmentPreferences.mockResolvedValue(prefs({ ticket_assigned: { email: ch(false, false, true) } }))
    render(<AssignmentNotificationPreferences />)

    const support = within(await screen.findByTestId('assignment-pref-ticket_assigned'))
    expect(support.getByText('غير متاحة حاليًا')).toBeInTheDocument()
    const email = toggle(/الدعم الفني — البريد الإلكتروني/)
    expect(email).toBeDisabled()
    expect(email).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByText(/اختيارك محفوظ، وسيُطبَّق تلقائيًا/)).toBeInTheDocument()
    // The other type and channel are untouched.
    expect(toggle(/العمليات — البريد الإلكتروني/)).not.toBeDisabled()
    expect(within(screen.getByTestId('assignment-pref-operations_ticket_assigned')).queryByText('غير متاحة حاليًا')).toBeNull()
  })

  it('saves only the changed channel and shows the saved state from the server', async () => {
    api.fetchAssignmentPreferences.mockResolvedValue(prefs())
    api.saveAssignmentPreferences.mockResolvedValue(prefs({ operations_ticket_assigned: { email: ch(false, true, true) } }))
    render(<AssignmentNotificationPreferences />)

    fireEvent.click(await screen.findByRole('switch', { name: /العمليات — البريد الإلكتروني/ }))
    expect(screen.getByText('لديك تغييرات غير محفوظة في إشعارات الإسناد')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'حفظ تفضيلات الإسناد' }))

    await screen.findByText(/تم حفظ التفضيلات/)
    expect(api.saveAssignmentPreferences).toHaveBeenCalledWith({ operations_ticket_assigned: { email: false } })
    expect(toggle(/العمليات — البريد الإلكتروني/)).toHaveAttribute('aria-checked', 'false')
    expect(toggle(/العمليات — داخل المنصة/)).toHaveAttribute('aria-checked', 'true')
  })

  it('shows what was saved when the page is opened again', async () => {
    api.fetchAssignmentPreferences.mockResolvedValue(prefs({ ticket_assigned: { in_app: ch(false, true, true) } }))
    render(<AssignmentNotificationPreferences />)

    expect(await screen.findByRole('switch', { name: /الدعم الفني — داخل المنصة/ })).toHaveAttribute('aria-checked', 'false')
  })

  it('shows a save error clearly and keeps the change so it can be retried', async () => {
    api.fetchAssignmentPreferences.mockResolvedValue(prefs())
    api.saveAssignmentPreferences.mockRejectedValue(new Error('network'))
    render(<AssignmentNotificationPreferences />)

    fireEvent.click(await screen.findByRole('switch', { name: /العمليات — داخل المنصة/ }))
    fireEvent.click(screen.getByRole('button', { name: 'حفظ تفضيلات الإسناد' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('تعذّر حفظ التفضيلات')
    expect(toggle(/العمليات — داخل المنصة/)).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('button', { name: 'إعادة المحاولة' })).toBeEnabled()
  })

  it('shows a load error with a retry', async () => {
    api.fetchAssignmentPreferences.mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(prefs())
    render(<AssignmentNotificationPreferences />)

    expect(await screen.findByRole('alert')).toHaveTextContent('تعذّر تحميل')
    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }))
    await screen.findByTestId('assignment-pref-ticket_assigned')
  })
})

describe('AssignmentNotificationAdminPanel', () => {
  const admin = (): AdminAssignmentSetting[] => [
    { type: 'operations_ticket_assigned', label: 'إسناد تذكرة العمليات', description: '', channels: { email: { enabled: true }, in_app: { enabled: true } } },
    { type: 'ticket_assigned', label: 'إسناد تذكرة الدعم الفني', description: '', channels: { email: { enabled: false }, in_app: { enabled: true } } },
  ]

  it('switches one channel of one type without touching the others', async () => {
    api.fetchAdminAssignmentSettings.mockResolvedValue(admin())
    api.saveAdminAssignmentSettings.mockImplementation(async () => {
      const next = admin()
      next[1].channels.email.enabled = true
      return next
    })
    render(<AssignmentNotificationAdminPanel />)

    const supportEmail = await screen.findByRole('switch', { name: /الدعم الفني — البريد الإلكتروني/ })
    expect(supportEmail).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(supportEmail)
    fireEvent.click(screen.getByRole('button', { name: 'حفظ إعدادات الإسناد' }))

    await screen.findByText('تم حفظ إعدادات الإسناد')
    expect(api.saveAdminAssignmentSettings).toHaveBeenCalledWith({ ticket_assigned: { email: true } })
    expect(toggle(/العمليات — داخل المنصة/)).toHaveAttribute('aria-checked', 'true')
  })

  it('reports a refused save', async () => {
    api.fetchAdminAssignmentSettings.mockResolvedValue(admin())
    api.saveAdminAssignmentSettings.mockRejectedValue(new Error('403'))
    render(<AssignmentNotificationAdminPanel />)

    fireEvent.click(await screen.findByRole('switch', { name: /العمليات — داخل المنصة/ }))
    fireEvent.click(screen.getByRole('button', { name: 'حفظ إعدادات الإسناد' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('تعذّر حفظ إعدادات الإسناد'))
  })
})

describe('assignmentErrorMessage', () => {
  it('explains a refusal, an offline request and a server message', async () => {
    const { assignmentErrorMessage } = await vi.importActual<typeof import('@/api/assignmentNotificationsApi')>('@/api/assignmentNotificationsApi')
    const axiosErr = (response?: { status: number; data?: unknown }) => Object.assign(new Error('x'), { isAxiosError: true, response })

    expect(assignmentErrorMessage(axiosErr({ status: 403 }), 'fb')).toBe('ليست لديك صلاحية لتعديل هذه الإعدادات.')
    expect(assignmentErrorMessage(axiosErr(), 'fb')).toMatch(/تعذّر الاتصال بالخادم/)
    expect(assignmentErrorMessage(axiosErr({ status: 422, data: { message: 'نوع إشعار غير معروف.' } }), 'fb')).toBe('نوع إشعار غير معروف.')
    expect(assignmentErrorMessage(new Error('plain'), 'fb')).toBe('fb')
  })
})
