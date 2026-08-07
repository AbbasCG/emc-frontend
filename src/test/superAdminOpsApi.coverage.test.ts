import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '@/api/axios'
import {
  fetchWorkspaceDepartmentsForSuperAdmin,
  fetchAdminDepartmentById,
} from '@/api/superAdminOpsApi'

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

describe('fetchWorkspaceDepartmentsForSuperAdmin', () => {
  it('GETs /operations/departments silently and normalizes each row', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 3,
            name_ar: 'إدارة التعليم',
            members_count: '8',
            leaders_count: 1,
            status: 'healthy',
            open_tasks_count: 2,
          },
        ],
      },
    })

    const rows = await fetchWorkspaceDepartmentsForSuperAdmin()
    expect(mockedApi.get).toHaveBeenCalledWith('/operations/departments', { skipErrorToast: true })
    expect(rows).toHaveLength(1)
    const d = rows[0]!
    expect(d.id).toBe('3') // ids are normalized to strings
    expect(d.title).toBe('إدارة التعليم') // title falls back to name_ar
    expect(d.name_ar).toBe('إدارة التعليم')
    expect(d.members_count).toBe(8) // numeric coercion
    expect(d.leaders_count).toBe(1)
    expect(d.status).toBe('healthy')
    expect(d.open_tasks_count).toBe(2)
  })

  it('normalizes garbage rows without crashing (unknown status → attention, missing counters → defaults)', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [{}] } })
    const rows = await fetchWorkspaceDepartmentsForSuperAdmin()
    const d = rows[0]!
    expect(d.id).toMatch(/^tmp_/) // synthetic id when backend omits one
    expect(d.title).toBe('')
    expect(d.members_count).toBe(0)
    expect(d.open_tasks).toBe(0)
    expect(d.open_tasks_count).toBeNull()
    expect(d.status).toBe('attention')
    expect(d.leader_name).toBeNull()
  })

  it('returns [] for a non-list payload', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { message: 'خطأ' } })
    await expect(fetchWorkspaceDepartmentsForSuperAdmin()).resolves.toEqual([])
  })

  it('propagates network/HTTP errors (documented to throw)', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('503'))
    await expect(fetchWorkspaceDepartmentsForSuperAdmin()).rejects.toThrow('503')
  })
})

describe('fetchAdminDepartmentById', () => {
  it('GETs /operations/departments/{id} and normalizes an enveloped realistic row', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: {
          id: 5,
          name_ar: 'إدارة الشراكات',
          name_en: 'Partnerships',
          description_ar: 'مسؤولة عن الشراكات المؤسسية',
          leader_name: 'محمد علي',
          members_count: 4,
          leaders_count: 1,
          courses_count: 2,
          volunteer_requests_count: 3,
          pending_items_count: 1,
          open_tasks_count: 6,
          status: 'RISK',
        },
      },
    })

    const d = await fetchAdminDepartmentById('5')
    expect(mockedApi.get).toHaveBeenCalledWith('/operations/departments/5', { skipErrorToast: true })
    expect(d).toEqual({
      id: '5',
      name_ar: 'إدارة الشراكات',
      name_en: 'Partnerships',
      description_ar: 'مسؤولة عن الشراكات المؤسسية',
      leader_name: 'محمد علي',
      members_count: 4,
      leaders_count: 1,
      courses_count: 2,
      volunteer_requests_count: 3,
      pending_items_count: 1,
      open_tasks_count: 6,
      status: 'risk', // status is lowercased before validation
    })
  })

  it('falls back through name → title → "إدارة" for the Arabic display name', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { id: 1, name: 'التسويق' } } })
    const byName = await fetchAdminDepartmentById('1')
    expect(byName.name_ar).toBe('التسويق')

    mockedApi.get.mockResolvedValueOnce({ data: { data: { id: 2 } } })
    const unnamed = await fetchAdminDepartmentById('2')
    expect(unnamed.name_ar).toBe('إدارة')
  })

  it('keeps open_tasks_count = null (tasks system not connected) and maps non-numeric to null', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { data: { id: 1, name_ar: 'أ', open_tasks_count: null } },
    })
    expect((await fetchAdminDepartmentById('1')).open_tasks_count).toBeNull()

    mockedApi.get.mockResolvedValueOnce({
      data: { data: { id: 1, name_ar: 'أ', open_tasks_count: 'كثير' } },
    })
    expect((await fetchAdminDepartmentById('1')).open_tasks_count).toBeNull()
  })

  it('legacy `description` field feeds description_ar when description_ar is absent', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { data: { id: 1, name_ar: 'أ', description: 'وصف قديم' } },
    })
    expect((await fetchAdminDepartmentById('1')).description_ar).toBe('وصف قديم')
  })

  it('survives a completely malformed payload (safe zero-department)', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: 'nonsense' })
    const d = await fetchAdminDepartmentById('9')
    expect(d.id).toBe(0)
    expect(d.name_ar).toBe('إدارة')
    expect(d.status).toBe('attention')
    expect(d.members_count).toBe(0)
    expect(d.open_tasks_count).toBeNull()
  })

  it('propagates request errors', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('403'))
    await expect(fetchAdminDepartmentById('5')).rejects.toThrow('403')
  })
})
