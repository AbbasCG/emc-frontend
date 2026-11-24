import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'

/**
 * Task C — /dashboard/super-admin/crud/permissions («صلاحيات النظام») is KEPT: it is the only editor of
 * the role -> delegatable tree that department leaders delegate from. It gains an explanatory header with
 * a link to where grants are made, and a «من يملك هذه الصلاحية» panel per permission.
 */

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open')
  }
})

const holdersApi = vi.hoisted(() => ({ fetchPermissionHolders: vi.fn() }))
vi.mock('@/api/actionPermissionsApi', async (orig) => ({
  ...(await orig<typeof import('@/api/actionPermissionsApi')>()),
  ...holdersApi,
}))

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('@/api/axios', () => ({ default: http }))

const holders = (over: Record<string, unknown> = {}) => ({
  permission: {
    key: 'tickets.review_participated',
    labelAr: 'اعتماد التذاكر التي أشارك فيها',
    descriptionAr: 'تتيح لمن شارك في التذكرة اعتمادها.',
    group: 'tickets',
    explicitOnly: true,
  },
  roles: [{ id: 3, name: 'department_manager', displayName: 'مدير الإدارة', usersCount: 4, source: 'role' }],
  directUsers: {
    items: [
      { id: 1, name: 'عباس', email: 'a@emc.test', role: 'department_manager', state: 'allow', expiresAt: null, grantedBy: 'Root' },
    ],
    total: 1,
  },
  effectiveUsers: {
    items: [
      {
        id: 1,
        name: 'عباس',
        email: 'a@emc.test',
        isActive: true,
        role: 'department_manager',
        sources: [{ type: 'direct_allow', labelAr: 'منح مباشر' }],
      },
      {
        id: 2,
        name: 'سارة',
        email: 's@emc.test',
        isActive: false,
        role: 'admin',
        sources: [
          { type: 'role', labelAr: 'مدير النظام' },
          { type: 'system', labelAr: 'صلاحية النظام' },
        ],
      },
    ],
    total: 31,
    page: 1,
    perPage: 15,
    lastPage: 3,
  },
  ...over,
})

const { PermissionHoldersPanel } = await import('@/components/access-control/PermissionHoldersPanel')
const { default: AdminPermissionConfigTree } = await import('@/pages/super-admin/crud/AdminPermissionConfigTree')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PermissionHoldersPanel', () => {
  it('shows roles, direct grants and effective users with source chips and the server total', async () => {
    holdersApi.fetchPermissionHolders.mockResolvedValue(holders())
    render(<PermissionHoldersPanel permissionKey="tickets.review_participated" />)

    expect(await screen.findByText('بواسطة: Root')).toBeInTheDocument()
    expect(screen.getByText('لا تُمنح تلقائيًا؛ تُمنح صراحةً لشخص محدد')).toBeInTheDocument()
    expect(screen.getByTestId('holders-effective-total')).toHaveTextContent('31 مستخدم')
    expect(screen.getByText('(غير نشط)')).toBeInTheDocument()
    expect(screen.getByText('من الدور: مدير النظام')).toBeInTheDocument()
    expect(screen.getByText('صلاحية النظام', { selector: '[data-source-type="system"]' })).toBeInTheDocument()
    expect(screen.getByText('صفحة 1 من 3')).toBeInTheDocument()
  })

  it('searches and paginates through the server', async () => {
    const user = userEvent.setup()
    holdersApi.fetchPermissionHolders.mockResolvedValue(holders())
    render(<PermissionHoldersPanel permissionKey="tickets.review_participated" />)
    await screen.findByText('سارة')

    await user.click(screen.getByRole('button', { name: /التالي/ }))
    await waitFor(() =>
      expect(holdersApi.fetchPermissionHolders).toHaveBeenLastCalledWith('tickets.review_participated', {
        search: '',
        page: 2,
        perPage: 15,
      }),
    )

    await user.type(screen.getByLabelText('البحث في أصحاب الصلاحية'), 'سا')
    await waitFor(() =>
      expect(holdersApi.fetchPermissionHolders).toHaveBeenLastCalledWith('tickets.review_participated', {
        search: 'سا',
        page: 1,
        perPage: 15,
      }),
    )
  })

  it('shows a visible error with retry', async () => {
    const user = userEvent.setup()
    holdersApi.fetchPermissionHolders.mockRejectedValueOnce(new Error('تعذّر الاتصال'))
    holdersApi.fetchPermissionHolders.mockResolvedValueOnce(holders())
    render(<PermissionHoldersPanel permissionKey="tickets.review_participated" />)

    expect(await screen.findByRole('alert')).toHaveTextContent('تعذّر تحميل من يملك هذه الصلاحية')
    await user.click(screen.getByRole('button', { name: 'إعادة المحاولة' }))
    expect(await screen.findByText('سارة')).toBeInTheDocument()
  })

  it('shows an Arabic empty state when nobody holds it', async () => {
    holdersApi.fetchPermissionHolders.mockResolvedValue(
      holders({
        roles: [],
        directUsers: { items: [], total: 0 },
        effectiveUsers: { items: [], total: 0, page: 1, perPage: 15, lastPage: 1 },
      }),
    )
    render(<PermissionHoldersPanel permissionKey="tickets.review_participated" />)

    expect(await screen.findByText('لا يملك أحد هذه الصلاحية حاليًا')).toBeInTheDocument()
    expect(screen.getByText('لا يوجد دور يمنح هذه الصلاحية')).toBeInTheDocument()
  })
})

describe('AdminPermissionConfigTree (kept)', () => {
  const renderPage = () =>
    render(
      <MemoryRouter>
        <AdminPermissionConfigTree />
      </MemoryRouter>,
    )

  it('explains in Arabic what it is for and links to where grants are made', () => {
    http.get.mockResolvedValue({ data: { success: true, roles: [] } })
    renderPage()

    const note = screen.getByTestId('delegation-page-purpose')
    expect(note).toHaveTextContent('ما يحق لقائد الإدارة أن يفوّضه')
    expect(note).toHaveTextContent('وهي لا تمنح صلاحية لأي شخص')
    const link = within(note).getByRole('link', { name: /إدارة الوصول والصلاحيات.*المستخدمون.*صلاحيات الإجراءات/ })
    expect(link).toHaveAttribute('href', '/dashboard/super-admin/access-control?tab=users')
  })

  it('still toggles delegation and opens the holders panel from a permission row', async () => {
    const user = userEvent.setup()
    http.get.mockImplementation(async (url: string) =>
      url === '/admin/permissions/roles' ?
        { data: { success: true, roles: [{ id: 3, name: 'department_manager', display_name: 'مدير الإدارة' }] } }
      : {
          data: {
            success: true,
            tree: [
              {
                id: 1,
                parent_id: null,
                node_type: 'permission',
                key: 'tickets.review_participated',
                label_ar: 'اعتماد التذاكر التي أشارك فيها',
                label_en: null,
                permission_name: 'tickets.review_participated',
                is_delegatable: false,
                is_system: false,
              },
            ],
          },
        },
    )
    http.post.mockResolvedValue({ data: { success: true } })
    holdersApi.fetchPermissionHolders.mockResolvedValue(holders())
    renderPage()

    await user.click(await screen.findByRole('button', { name: /مدير الإدارة/ }))
    await user.click(await screen.findByRole('button', { name: 'غير قابل للتفويض' }))
    await waitFor(() =>
      expect(http.post).toHaveBeenCalledWith('/admin/permissions/roles/department_manager/delegatable/toggle', {
        permission_name: 'tickets.review_participated',
        is_delegatable: true,
      }),
    )

    await user.click(screen.getByRole('button', { name: 'من يملك هذه الصلاحية' }))
    expect(await screen.findByText('بواسطة: Root')).toBeInTheDocument()
    expect(holdersApi.fetchPermissionHolders).toHaveBeenCalledWith('tickets.review_participated', {
      search: '',
      page: 1,
      perPage: 15,
    })
  })
})

describe('registration evidence (page is kept, wired exactly once)', () => {
  const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), 'utf8')

  it('keeps the route and the sidebar entry', () => {
    expect(read('src/App.tsx')).toMatch(/path="\/dashboard\/super-admin\/crud\/permissions"[^\n]*AdminPermissionConfigTreePage/)
    expect(read('src/layouts/dashboardSidebar.tsx')).toMatch(/صلاحيات النظام[^\n]*\/dashboard\/super-admin\/crud\/permissions/)
  })

  it('the roles drawer «المستخدمون» tab uses the shared members panel, not a client-side filter of /admin/users', () => {
    const drawer = read('src/components/super-admin/RoleDetailDrawer.tsx')
    expect(drawer).toMatch(/<RoleMembersPanel\b/)
    expect(drawer).not.toMatch(/fetchAdminUsers/)
  })
})
