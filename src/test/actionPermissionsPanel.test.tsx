import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ActionPermissionRow } from '@/api/actionPermissionsApi'

/**
 * «صلاحيات الإجراءات» — the per-user action-permission panel, driven by a stateful FAKE SERVER.
 * Acceptance story: grant `tickets.review_participated` to Abbas, see «منح مباشر» + فعّالة, a
 * colleague with the same role is unchanged, revoke goes back, and a revoke the role still
 * covers shows the «ما زالت فعّالة» notice. The client never decides — it renders server rows.
 */

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open')
  }
})

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('@/lib/toast', () => ({
  successToast: toastMock.success,
  errorToast: toastMock.error,
}))

type Row = Omit<ActionPermissionRow, 'grantedBy'> & { grantedBy: ActionPermissionRow['grantedBy'] }

const base = (over: Partial<Row>): Row => ({
  key: 'x.y',
  labelAr: 'x',
  descriptionAr: '',
  group: 'tickets',
  effective: false,
  source: 'none',
  sources: [],
  directState: null,
  directExpiresAt: null,
  grantedBy: null,
  roleGrants: false,
  stillEffectiveAfterRevoke: false,
  explicitOnly: false,
  canGrant: true,
  canRevoke: false,
  ...over,
})

const PARTICIPATED = 'tickets.review_participated'

/** user id -> permission key -> row */
const store = vi.hoisted(() => ({ rows: new Map<number, Map<string, unknown>>() }))

function seed() {
  store.rows.clear()
  for (const id of [1, 2]) {
    store.rows.set(
      id,
      new Map<string, unknown>([
        [
          PARTICIPATED,
          base({
            key: PARTICIPATED,
            labelAr: 'اعتماد التذاكر التي أشارك فيها',
            descriptionAr: 'تتيح لمن شارك في التذكرة اعتمادها.',
            explicitOnly: true,
          }),
        ],
        [
          'tickets.review',
          base({
            key: 'tickets.review',
            labelAr: 'مراجعة واعتماد إنجاز التذاكر',
            effective: true,
            source: 'role',
            sources: [{ type: 'role', labelAr: 'مدير الإدارة' }],
            roleGrants: true,
            canGrant: true,
            canRevoke: false,
          }),
        ],
        [
          'finance.approve',
          base({ key: 'finance.approve', labelAr: 'اعتماد المصروفات', group: 'finance', canGrant: false, canRevoke: false }),
        ],
      ]),
    )
  }
}

function snapshot(userId: number) {
  const rows = [...(store.rows.get(userId)?.values() ?? [])] as Row[]
  const groupOf = (g: string) => ({ key: g, label_ar: g === 'tickets' ? 'التذاكر' : 'المالية' })
  const groups = ['finance', 'tickets'].map((g) => ({
    key: groupOf(g).key,
    labelAr: groupOf(g).label_ar,
    permissions: rows.filter((r) => r.group === g),
  }))
  return { user: { id: userId, name: 'u', email: 'u@x', role: 'department_manager', isActive: true }, groups }
}

const api = vi.hoisted(() => ({
  fetchUserActionPermissions: vi.fn(),
  grantUserActionPermission: vi.fn(),
  revokeUserActionPermission: vi.fn(),
}))
vi.mock('@/api/actionPermissionsApi', async (orig) => ({
  ...(await orig<typeof import('@/api/actionPermissionsApi')>()),
  ...api,
}))

function wireFakeServer() {
  api.fetchUserActionPermissions.mockImplementation(async (id: number) => snapshot(id))
  api.grantUserActionPermission.mockImplementation(async (id: number, key: string) => {
    const next = base({
      ...(store.rows.get(id)?.get(key) as Row),
      effective: true,
      source: 'direct',
      sources: [{ type: 'direct_allow', labelAr: 'منح مباشر' }],
      directState: 'allow',
      grantedBy: { id: 9, name: 'Root' },
      canGrant: false,
      canRevoke: true,
    })
    store.rows.get(id)?.set(key, next)
    return next
  })
  api.revokeUserActionPermission.mockImplementation(async (id: number, key: string) => {
    const prev = store.rows.get(id)?.get(key) as Row
    const roleStill = prev.key === 'tickets.review'
    const next = base({
      ...prev,
      effective: roleStill,
      source: roleStill ? 'role' : 'none',
      sources: roleStill ? [{ type: 'role', labelAr: 'مدير الإدارة' }] : [],
      directState: null,
      grantedBy: null,
      stillEffectiveAfterRevoke: roleStill,
      canGrant: true,
      canRevoke: false,
    })
    store.rows.get(id)?.set(key, next)
    return next
  })
}

const { UserActionPermissionsPanel } = await import('@/components/access-control/UserActionPermissionsPanel')

beforeEach(() => {
  vi.clearAllMocks()
  seed()
  wireFakeServer()
})

const rowOf = (key: string) => document.querySelector(`[data-permission-key="${key}"]`) as HTMLElement

describe('layout', () => {
  it('lists the tickets group first and expanded, other groups collapsed', async () => {
    render(<UserActionPermissionsPanel userId={1} userName="عباس" />)

    const groupButtons = (await screen.findAllByText(/^(التذاكر|المالية)/)).map((n) => n.closest('button')).filter(Boolean)
    expect(groupButtons[0]).toHaveTextContent('التذاكر')
    expect(groupButtons[0]).toHaveAttribute('aria-expanded', 'true')
    expect(groupButtons[1]).toHaveTextContent('المالية')
    expect(groupButtons[1]).toHaveAttribute('aria-expanded', 'false')
    expect(rowOf('finance.approve')).toBeNull()
  })

  it('shows label, LTR key, description, status and source chips, and the explicit-only note', async () => {
    render(<UserActionPermissionsPanel userId={1} userName="عباس" />)

    const review = await waitFor(() => {
      const el = rowOf('tickets.review')
      expect(el).toBeTruthy()
      return el
    })
    expect(within(review).getByText('مراجعة واعتماد إنجاز التذاكر')).toBeInTheDocument()
    expect(within(review).getByText('tickets.review')).toHaveAttribute('dir', 'ltr')
    expect(within(review).getByText('فعّالة')).toBeInTheDocument()
    expect(within(review).getByText('من الدور: مدير الإدارة')).toBeInTheDocument()

    const part = rowOf(PARTICIPATED)
    expect(within(part).getByText('غير فعّالة')).toBeInTheDocument()
    expect(within(part).getByText('تتيح لمن شارك في التذكرة اعتمادها.')).toBeInTheDocument()
    expect(within(part).getByText('لا تُمنح تلقائيًا؛ تُمنح صراحةً لشخص محدد')).toBeInTheDocument()
  })

  it('renders action buttons ONLY from the server flags', async () => {
    const user = userEvent.setup()
    render(<UserActionPermissionsPanel userId={1} userName="عباس" />)
    await waitFor(() => expect(rowOf(PARTICIPATED)).toBeTruthy())

    expect(within(rowOf(PARTICIPATED)).getByRole('button', { name: 'منح مباشر' })).toBeInTheDocument()
    expect(within(rowOf(PARTICIPATED)).queryByRole('button', { name: 'سحب المنح المباشر' })).toBeNull()

    // finance.approve has can_grant=false / can_revoke=false: expand and verify there is no button.
    await user.click(screen.getByRole('button', { name: /المالية/ }))
    expect(within(rowOf('finance.approve')).queryByRole('button')).toBeNull()
  })

  it('hides «منح مباشر» when the row already has a direct allow, even if the server flags both', async () => {
    store.rows.get(1)?.set(
      PARTICIPATED,
      base({
        key: PARTICIPATED,
        labelAr: 'اعتماد التذاكر التي أشارك فيها',
        effective: true,
        source: 'direct',
        sources: [{ type: 'direct_allow', labelAr: 'منح مباشر' }],
        directState: 'allow',
        canGrant: true,
        canRevoke: true,
      }),
    )
    render(<UserActionPermissionsPanel userId={1} userName="عباس" />)
    await waitFor(() => expect(rowOf(PARTICIPATED)).toBeTruthy())

    expect(within(rowOf(PARTICIPATED)).queryByRole('button', { name: 'منح مباشر' })).toBeNull()
    expect(within(rowOf(PARTICIPATED)).getByRole('button', { name: 'سحب المنح المباشر' })).toBeInTheDocument()
  })

  it('searches by Arabic name and by key', async () => {
    const user = userEvent.setup()
    render(<UserActionPermissionsPanel userId={1} userName="عباس" />)
    await waitFor(() => expect(rowOf(PARTICIPATED)).toBeTruthy())

    await user.type(screen.getByLabelText('البحث في صلاحيات الإجراءات'), 'المصروفات')
    expect(rowOf('finance.approve')).toBeTruthy()
    expect(rowOf(PARTICIPATED)).toBeNull()

    await user.clear(screen.getByLabelText('البحث في صلاحيات الإجراءات'))
    await user.type(screen.getByLabelText('البحث في صلاحيات الإجراءات'), 'review_participated')
    expect(rowOf(PARTICIPATED)).toBeTruthy()
    expect(rowOf('tickets.review')).toBeNull()

    await user.clear(screen.getByLabelText('البحث في صلاحيات الإجراءات'))
    await user.type(screen.getByLabelText('البحث في صلاحيات الإجراءات'), 'zzz')
    expect(screen.getByText('لا توجد صلاحيات مطابقة')).toBeInTheDocument()
  })
})

describe('grant and revoke (acceptance story)', () => {
  it('asks for confirmation, applies the SERVER row, and leaves a colleague untouched', async () => {
    const user = userEvent.setup()
    const abbas = render(<UserActionPermissionsPanel userId={1} userName="عباس" />)
    await waitFor(() => expect(rowOf(PARTICIPATED)).toBeTruthy())

    await user.click(within(rowOf(PARTICIPATED)).getByRole('button', { name: 'منح مباشر' }))

    // Nothing is sent until the dialog is confirmed.
    expect(api.grantUserActionPermission).not.toHaveBeenCalled()
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('منح مباشر؟')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'منح' }))

    await waitFor(() => expect(api.grantUserActionPermission).toHaveBeenCalledWith(1, PARTICIPATED))
    await waitFor(() => {
      const row = rowOf(PARTICIPATED)
      expect(within(row).getByText('منح مباشر', { selector: 'span' })).toBeInTheDocument()
      expect(within(row).getByText('فعّالة')).toBeInTheDocument()
      expect(within(row).getByText('بواسطة: Root')).toBeInTheDocument()
      expect(within(row).getByRole('button', { name: 'سحب المنح المباشر' })).toBeInTheDocument()
      expect(within(row).queryByRole('button', { name: 'منح مباشر' })).toBeNull()
    })
    expect(toastMock.success).toHaveBeenCalled()

    // Another user with the same role: separate fetch, still not effective.
    abbas.unmount()
    render(<UserActionPermissionsPanel userId={2} userName="زميل" />)
    await waitFor(() => expect(rowOf(PARTICIPATED)).toBeTruthy())
    expect(within(rowOf(PARTICIPATED)).getByText('غير فعّالة')).toBeInTheDocument()
    expect(within(rowOf(PARTICIPATED)).queryByText('منح مباشر', { selector: 'span' })).toBeNull()
  })

  it('revoke goes back to «غير فعّالة» without a notice', async () => {
    const user = userEvent.setup()
    render(<UserActionPermissionsPanel userId={1} userName="عباس" />)
    await waitFor(() => expect(rowOf(PARTICIPATED)).toBeTruthy())

    await user.click(within(rowOf(PARTICIPATED)).getByRole('button', { name: 'منح مباشر' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'منح' }))
    await waitFor(() => expect(within(rowOf(PARTICIPATED)).getByRole('button', { name: 'سحب المنح المباشر' })).toBeInTheDocument())

    await user.click(within(rowOf(PARTICIPATED)).getByRole('button', { name: 'سحب المنح المباشر' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'سحب' }))

    await waitFor(() => expect(api.revokeUserActionPermission).toHaveBeenCalledWith(1, PARTICIPATED))
    await waitFor(() => expect(within(rowOf(PARTICIPATED)).getByText('غير فعّالة')).toBeInTheDocument())
    expect(within(rowOf(PARTICIPATED)).queryByText(/ما زالت فعّالة/)).toBeNull()
  })

  it('shows the «ما زالت فعّالة» notice when the role still grants it after a revoke', async () => {
    const user = userEvent.setup()
    store.rows.get(1)?.set(
      'tickets.review',
      base({
        key: 'tickets.review',
        labelAr: 'مراجعة واعتماد إنجاز التذاكر',
        effective: true,
        source: 'direct',
        sources: [
          { type: 'role', labelAr: 'مدير الإدارة' },
          { type: 'direct_allow', labelAr: 'منح مباشر' },
        ],
        directState: 'allow',
        roleGrants: true,
        canGrant: false,
        canRevoke: true,
      }),
    )
    render(<UserActionPermissionsPanel userId={1} userName="عباس" />)
    await waitFor(() => expect(rowOf('tickets.review')).toBeTruthy())

    await user.click(within(rowOf('tickets.review')).getByRole('button', { name: 'سحب المنح المباشر' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'سحب' }))

    const row = rowOf('tickets.review')
    await waitFor(() => expect(within(row).getByRole('status')).toHaveTextContent('ما زالت فعّالة بسبب الدور/صلاحية النظام: مدير الإدارة'))
    expect(within(row).getByText('فعّالة')).toBeInTheDocument()
  })

  it('does not touch the row and shows the server message when the grant fails', async () => {
    const user = userEvent.setup()
    api.grantUserActionPermission.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 403, data: { success: false, message: 'غير مسموح لك بمنح هذه الصلاحية.' } },
    })
    render(<UserActionPermissionsPanel userId={1} userName="عباس" />)
    await waitFor(() => expect(rowOf(PARTICIPATED)).toBeTruthy())

    await user.click(within(rowOf(PARTICIPATED)).getByRole('button', { name: 'منح مباشر' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'منح' }))

    await waitFor(() => expect(toastMock.error).toHaveBeenCalled())
    // Not optimistic: still «غير فعّالة» and the grant button is still there.
    expect(within(rowOf(PARTICIPATED)).getByText('غير فعّالة')).toBeInTheDocument()
    expect(within(rowOf(PARTICIPATED)).getByRole('button', { name: 'منح مباشر' })).toBeInTheDocument()
    expect(within(rowOf(PARTICIPATED)).getByRole('alert')).toBeInTheDocument()
  })

  it('cancelling the dialog sends nothing', async () => {
    const user = userEvent.setup()
    render(<UserActionPermissionsPanel userId={1} userName="عباس" />)
    await waitFor(() => expect(rowOf(PARTICIPATED)).toBeTruthy())

    await user.click(within(rowOf(PARTICIPATED)).getByRole('button', { name: 'منح مباشر' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'إلغاء' }))

    expect(api.grantUserActionPermission).not.toHaveBeenCalled()
  })
})

describe('states', () => {
  it('shows an Arabic loading state, then an error with retry that reloads', async () => {
    const user = userEvent.setup()
    api.fetchUserActionPermissions.mockRejectedValueOnce(new Error('انقطع الاتصال'))
    render(<UserActionPermissionsPanel userId={1} userName="عباس" />)

    expect(screen.getByText('جارٍ تحميل صلاحيات الإجراءات…')).toBeInTheDocument()
    expect(await screen.findByText('تعذّر تحميل صلاحيات الإجراءات')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'إعادة المحاولة' }))
    await waitFor(() => expect(rowOf(PARTICIPATED)).toBeTruthy())
  })

  it('shows an Arabic empty state when the server returns no permissions', async () => {
    api.fetchUserActionPermissions.mockResolvedValueOnce({ user: { id: 1, name: '', email: '', role: '', isActive: true }, groups: [] })
    render(<UserActionPermissionsPanel userId={1} userName="عباس" />)

    expect(await screen.findByText('لا توجد صلاحيات إجراءات')).toBeInTheDocument()
  })
})
