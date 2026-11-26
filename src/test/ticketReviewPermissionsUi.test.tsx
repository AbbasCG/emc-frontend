import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

const api = vi.hoisted(() => ({
  fetchAdminPermissionsCatalog: vi.fn(),
  fetchRolePermissions: vi.fn(),
  updateRolePermissions: vi.fn(),
}))
vi.mock('@/api/rolesPermissionsApi', () => ({
  fetchAdminPermissionsCatalog: api.fetchAdminPermissionsCatalog,
  fetchRolePermissions: api.fetchRolePermissions,
  updateRolePermissions: api.updateRolePermissions,
  permissionsApiErrorMessage: () => 'خطأ',
}))
vi.mock('@/lib/toast', () => ({ default: { success: vi.fn(), error: vi.fn(), message: vi.fn() } }))

import { RolePermissionsMatrix } from '@/components/super-admin/RolePermissionsMatrix'
import {
  isExplicitOnlyPermission,
  permissionActionLabelAr,
  permissionDescriptionAr,
  permissionGroupLabelAr,
  permissionNoteAr,
} from '@/utils/permissionLabels'

const REVIEW = 'tickets.review_completion'
const PARTICIPATED = 'tickets.review_participated'

/** The catalog as the server sends it (label / description present) and as a bare-keys catalog (no labels at all). */
const labelled = {
  groups: [
    {
      key: 'tickets',
      label: 'التذاكر',
      permissions: [
        { key: REVIEW, label: 'مراجعة واعتماد إنجاز التذاكر', description: 'اعتماد إنجاز التذاكر ضمن الإدارات التي يقودها حاملها.' },
        { key: PARTICIPATED, label: 'اعتماد التذاكر التي أشارك فيها', description: 'تتيح اعتماد تذكرة شارك فيها صاحبها.' },
      ],
    },
    { key: 'users', label: 'المستخدمون', permissions: [{ key: 'view_users', label: 'عرض المستخدمين', description: '' }] },
  ],
  allKeys: [REVIEW, PARTICIPATED, 'view_users'],
}
const bare = {
  groups: [{ key: 'tickets', label: 'tickets', permissions: [{ key: REVIEW, label: '', description: '' }, { key: PARTICIPATED, label: '', description: '' }] }],
  allKeys: [REVIEW, PARTICIPATED],
}

beforeEach(() => {
  Object.values(api).forEach((m) => m.mockReset())
  api.fetchRolePermissions.mockResolvedValue([])
})

describe('labels of the ticket review permissions', () => {
  it('the group «التذاكر» and both permissions have Arabic labels even when the catalog came without them', () => {
    expect(permissionGroupLabelAr('tickets', 'tickets')).toBe('التذاكر')
    expect(permissionGroupLabelAr('tickets')).toBe('التذاكر')
    expect(permissionGroupLabelAr('tasks')).toBe('المهام والعمليات')
    expect(permissionActionLabelAr(REVIEW)).toBe('مراجعة واعتماد إنجاز التذاكر')
    expect(permissionActionLabelAr(PARTICIPATED)).toBe('اعتماد التذاكر التي أشارك فيها')
    expect(permissionDescriptionAr(PARTICIPATED)).toContain('أرسل إنجازها')
  })

  it('the server\'s label wins when it sends one', () => {
    expect(permissionGroupLabelAr('tickets', 'تذاكر مخصصة')).toBe('تذاكر مخصصة')
    expect(permissionActionLabelAr(REVIEW, 'اسم من الخادم')).toBe('اسم من الخادم')
  })

  it('only the participation permission carries the «not granted automatically» explanation', () => {
    expect(permissionNoteAr(PARTICIPATED)).toContain('لا تُمنح تلقائيًا')
    expect(permissionNoteAr(PARTICIPATED)).toContain('تتيح لمن شارك في التذكرة اعتمادها')
    expect(permissionNoteAr(REVIEW)).toBe('')
    expect(isExplicitOnlyPermission(PARTICIPATED)).toBe(true)
    expect(isExplicitOnlyPermission(REVIEW)).toBe(false)
  })
})

describe('the role editor (RolePermissionsMatrix)', () => {
  it('lists both permissions under «التذاكر» with their Arabic labels, and explains the participation one', async () => {
    api.fetchAdminPermissionsCatalog.mockResolvedValue(labelled)
    render(<RolePermissionsMatrix roleSlug="department_manager" canEdit />)

    expect(await screen.findByRole('heading', { name: 'التذاكر' })).toBeInTheDocument()
    expect(screen.getByText('مراجعة واعتماد إنجاز التذاكر')).toBeInTheDocument()
    expect(screen.getByText('اعتماد التذاكر التي أشارك فيها')).toBeInTheDocument()
    const notes = screen.getAllByTestId('permission-note')
    expect(notes).toHaveLength(1)
    expect(notes[0]).toHaveTextContent('لا تُمنح تلقائيًا؛ تتيح لمن شارك في التذكرة اعتمادها')
  })

  it('falls back to the Arabic names when the catalog has only bare keys', async () => {
    api.fetchAdminPermissionsCatalog.mockResolvedValue(bare)
    render(<RolePermissionsMatrix roleSlug="department_manager" canEdit />)

    expect(await screen.findByRole('heading', { name: 'التذاكر' })).toBeInTheDocument()
    expect(screen.getByText('مراجعة واعتماد إنجاز التذاكر')).toBeInTheDocument()
    expect(screen.getByText('اعتماد التذاكر التي أشارك فيها')).toBeInTheDocument()
  })

  it('«تحديد الكل» of the group ticks the review permission but NEVER the participation one', async () => {
    api.fetchAdminPermissionsCatalog.mockResolvedValue(labelled)
    render(<RolePermissionsMatrix roleSlug="department_manager" canEdit />)
    const section = (await screen.findByRole('heading', { name: 'التذاكر' })).closest('section')!

    fireEvent.click(within(section).getByRole('button', { name: /تحديد الكل/ }))

    const boxes = within(section).getAllByRole('checkbox') as HTMLInputElement[]
    expect(boxes).toHaveLength(2)
    expect(boxes[0].checked).toBe(true)
    expect(boxes[1].checked).toBe(false)

    // Saving sends only what is ticked: the participation key is not in it.
    api.updateRolePermissions.mockResolvedValue(undefined)
    api.fetchRolePermissions.mockResolvedValue([REVIEW])
    fireEvent.click(screen.getByRole('button', { name: /حفظ الصلاحيات/ }))
    await waitFor(() => expect(api.updateRolePermissions).toHaveBeenCalledWith('department_manager', [REVIEW]))
  })

  it('«إلغاء الكل» never removes an explicit participation grant', async () => {
    api.fetchAdminPermissionsCatalog.mockResolvedValue(labelled)
    api.fetchRolePermissions.mockResolvedValue([REVIEW, PARTICIPATED])
    render(<RolePermissionsMatrix roleSlug="department_manager" canEdit />)
    const section = (await screen.findByRole('heading', { name: 'التذاكر' })).closest('section')!
    await waitFor(() => expect((within(section).getAllByRole('checkbox') as HTMLInputElement[])[1].checked).toBe(true))

    // The bulk control only governs what it can change, so with the review key ticked it offers «إلغاء الكل».
    fireEvent.click(within(section).getByRole('button', { name: /إلغاء الكل/ }))

    const boxes = within(section).getAllByRole('checkbox') as HTMLInputElement[]
    expect(boxes[0].checked).toBe(false)
    expect(boxes[1].checked).toBe(true)
  })

  it('only an individual tick grants the participation permission', async () => {
    api.fetchAdminPermissionsCatalog.mockResolvedValue(labelled)
    render(<RolePermissionsMatrix roleSlug="department_manager" canEdit />)
    const section = (await screen.findByRole('heading', { name: 'التذاكر' })).closest('section')!

    fireEvent.click(within(section).getAllByRole('checkbox')[1])

    expect((within(section).getAllByRole('checkbox') as HTMLInputElement[])[1].checked).toBe(true)
  })

  it('a group that holds only the participation permission has no bulk control at all', async () => {
    api.fetchAdminPermissionsCatalog.mockResolvedValue({
      groups: [{ key: 'tickets', label: 'التذاكر', permissions: [{ key: PARTICIPATED, label: 'اعتماد التذاكر التي أشارك فيها', description: '' }] }],
      allKeys: [PARTICIPATED],
    })
    render(<RolePermissionsMatrix roleSlug="department_manager" canEdit />)
    const section = (await screen.findByRole('heading', { name: 'التذاكر' })).closest('section')!

    expect(within(section).queryByRole('button', { name: /تحديد الكل|إلغاء الكل/ })).toBeNull()
  })
})
