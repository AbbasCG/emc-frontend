import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '@/api/axios'
import {
  fetchAdminPermissionsCatalog,
  fetchRolePermissions,
  updateRolePermissions,
  isPermissionsApiMissing,
  permissionsApiErrorMessage,
  type AdminPermissionsCatalog,
} from '@/api/rolesPermissionsApi'

vi.mock('@/api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockedApi = vi.mocked(apiClient, true)

beforeEach(() => {
  vi.clearAllMocks()
})

/** Minimal axios-shaped error recognized by axios.isAxiosError. */
function axiosError(status?: number): unknown {
  return { isAxiosError: true, response: status != null ? { status } : undefined }
}

/* ── fetchAdminPermissionsCatalog ── */

describe('fetchAdminPermissionsCatalog', () => {
  it('parses a grouped catalog, tolerating alias keys, string items and garbage entries', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          groups: [
            {
              key: 'users',
              label: 'إدارة المستخدمين',
              permissions: [
                { key: 'users.view', label: 'عرض المستخدمين', description: 'الاطلاع على القائمة' },
                'users.edit', // bare string item
              ],
            },
            { key: 'empty', label: 'فارغ', permissions: [] }, // dropped: no permissions
            { group: 'courses', title: 'الدورات', items: [{ name: 'courses.view' }] }, // alias keys
            'garbage', // not an object → dropped
          ],
        },
      },
    })

    const cat: AdminPermissionsCatalog = await fetchAdminPermissionsCatalog()
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/permissions', { skipErrorToast: true })
    expect(cat.groups).toHaveLength(2)
    expect(cat.groups[0]).toEqual({
      key: 'users',
      label: 'إدارة المستخدمين',
      permissions: [
        { key: 'users.view', label: 'عرض المستخدمين', description: 'الاطلاع على القائمة' },
        { key: 'users.edit', label: '', description: '' },
      ],
    })
    expect(cat.groups[1]).toEqual({
      key: 'courses',
      label: 'الدورات',
      permissions: [{ key: 'courses.view', label: '', description: '' }],
    })
    expect(cat.allKeys).toEqual(['users.view', 'users.edit', 'courses.view'])
  })

  it('derives a group key from the first permission prefix when the group has no key', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { data: { groups: [{ permissions: ['billing.view', 'billing.export'] }] } },
    })
    const cat = await fetchAdminPermissionsCatalog()
    expect(cat.groups).toHaveLength(1)
    expect(cat.groups[0]?.key).toBe('billing')
    expect(cat.allKeys).toEqual(['billing.view', 'billing.export'])
  })

  it('groups a flat dotted permission list by key prefix', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { data: { permissions: [{ key: 'reports.view', label: 'عرض التقارير' }, 'reports.export'] } },
    })
    const cat = await fetchAdminPermissionsCatalog()
    expect(cat.groups).toHaveLength(1)
    expect(cat.groups[0]).toEqual({
      key: 'reports',
      label: 'reports',
      permissions: [
        { key: 'reports.view', label: '', description: '' },
        { key: 'reports.export', label: '', description: '' },
      ],
    })
    expect(cat.allKeys).toEqual(['reports.view', 'reports.export'])
  })

  it('groups undotted items by their explicit group field, falling back to the key itself', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { data: { permissions: [{ key: 'view', group: 'users' }, { key: 'edit' }] } },
    })
    const cat = await fetchAdminPermissionsCatalog()
    expect(cat.groups).toEqual([
      { key: 'users', label: 'users', permissions: [{ key: 'view', label: '', description: '' }] },
      { key: 'edit', label: 'edit', permissions: [{ key: 'edit', label: '', description: '' }] },
    ])
    expect(cat.allKeys).toEqual(['view', 'edit'])
  })

  it('handles a plain string-array payload (dotted keys → prefixed groups, rest → general)', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: ['users.view', 'misc'] } })
    const cat = await fetchAdminPermissionsCatalog()
    expect(cat.allKeys).toEqual(['users.view', 'misc'])
    const keys = cat.groups.map((g) => g.key)
    expect(keys).toContain('users')
    // undotted key gets grouped under itself in this normalization path
    expect(cat.groups.flatMap((g) => g.permissions.map((p) => p.key))).toEqual(['users.view', 'misc'])
  })

  it('returns an empty catalog for empty or malformed payloads', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: {} } })
    expect(await fetchAdminPermissionsCatalog()).toEqual({ groups: [], allKeys: [] })

    mockedApi.get.mockResolvedValueOnce({ data: { data: null } })
    expect(await fetchAdminPermissionsCatalog()).toEqual({ groups: [], allKeys: [] })
  })

  it('propagates transport errors (no swallow)', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'))
    await expect(fetchAdminPermissionsCatalog()).rejects.toThrow('Network Error')
  })
})

/* ── fetchRolePermissions ── */

describe('fetchRolePermissions', () => {
  it('URL-encodes the role slug', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { current_permissions: [] } } })
    await fetchRolePermissions('super admin/ar')
    expect(mockedApi.get).toHaveBeenCalledWith(
      '/admin/roles/super%20admin%2Far/permissions',
      { skipErrorToast: true },
    )
  })

  it('reads current_permissions with mixed string/object entries, skipping junk', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { data: { current_permissions: ['users.view', { name: 'users.edit' }, 42, { slug: 'x.y' }] } },
    })
    expect(await fetchRolePermissions('admin')).toEqual(['users.view', 'users.edit', 'x.y'])
  })

  it('falls back to a permissions list of objects', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { permissions: [{ name: 'a.b' }] } } })
    expect(await fetchRolePermissions('admin')).toEqual(['a.b'])
  })

  it('accepts a bare string array as the payload root', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: ['p.q'] } })
    expect(await fetchRolePermissions('admin')).toEqual(['p.q'])
  })

  it('returns [] for malformed payloads', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: 'غير متوقع' } })
    expect(await fetchRolePermissions('admin')).toEqual([])
  })
})

/* ── updateRolePermissions ── */

describe('updateRolePermissions', () => {
  it('PUTs the permissions payload and normalizes the echoed list', async () => {
    mockedApi.put.mockResolvedValueOnce({
      data: { data: { permissions: [{ name: 'users.view' }, 'users.edit'] } },
    })
    const result = await updateRolePermissions('supervisor', ['users.view', 'users.edit'])
    expect(mockedApi.put).toHaveBeenCalledWith(
      '/admin/roles/supervisor/permissions',
      { permissions: ['users.view', 'users.edit'] },
      { skipErrorToast: true },
    )
    expect(result).toEqual(['users.view', 'users.edit'])
  })

  it('propagates transport errors', async () => {
    mockedApi.put.mockRejectedValueOnce(new Error('forbidden'))
    await expect(updateRolePermissions('supervisor', [])).rejects.toThrow('forbidden')
  })
})

/* ── isPermissionsApiMissing / permissionsApiErrorMessage ── */

describe('isPermissionsApiMissing', () => {
  it('flags 404 / 405 / 501 axios errors as missing-API', () => {
    expect(isPermissionsApiMissing(axiosError(404))).toBe(true)
    expect(isPermissionsApiMissing(axiosError(405))).toBe(true)
    expect(isPermissionsApiMissing(axiosError(501))).toBe(true)
  })

  it('does not flag other statuses, response-less errors, or non-axios errors', () => {
    expect(isPermissionsApiMissing(axiosError(500))).toBe(false)
    expect(isPermissionsApiMissing(axiosError())).toBe(false)
    expect(isPermissionsApiMissing(new Error('boom'))).toBe(false)
    expect(isPermissionsApiMissing(null)).toBe(false)
  })
})

describe('permissionsApiErrorMessage', () => {
  it('returns the dedicated Arabic message when the permissions API is missing', () => {
    expect(permissionsApiErrorMessage(axiosError(404))).toBe(
      'واجهة صلاحيات الأدوار غير متوفرة على الخادم (GET/PUT /admin/permissions).',
    )
  })

  it('delegates other axios errors to the generic Arabic status message', () => {
    expect(permissionsApiErrorMessage(axiosError(403))).toBe('لا تملك صلاحية الوصول.')
  })

  it('surfaces plain Error messages as-is', () => {
    expect(permissionsApiErrorMessage(new Error('انقطع الاتصال'))).toBe('انقطع الاتصال')
  })
})
