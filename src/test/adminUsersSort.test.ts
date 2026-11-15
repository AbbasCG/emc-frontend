import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '@/api/axios'
import { fetchAdminUsersPage, sortUsersClientSide, type AdminManagedUser } from '@/api/adminUsersApi'

vi.mock('@/api/axios', () => ({
  default: { get: vi.fn() },
}))

const mockedApi = vi.mocked(apiClient, true)

beforeEach(() => {
  vi.clearAllMocks()
})

function u(id: number, created_at: string | null, last_login_at: string | null): AdminManagedUser {
  return { id, name: `u${id}`, email: `u${id}@x.com`, created_at, last_login_at }
}

const users = [
  u(1, '2024-01-10T00:00:00Z', null),
  u(2, '2025-06-01T00:00:00Z', '2026-01-05T00:00:00Z'),
  u(3, '2023-03-15T00:00:00Z', '2026-03-01T00:00:00Z'),
  u(4, null, '2025-12-01T00:00:00Z'),
]

describe('sortUsersClientSide', () => {
  it('sorts by created_at newest first, nulls last', () => {
    expect(sortUsersClientSide(users, 'created_at', 'desc').map((x) => x.id)).toEqual([2, 1, 3, 4])
  })

  it('sorts by created_at oldest first, nulls still last', () => {
    expect(sortUsersClientSide(users, 'created_at', 'asc').map((x) => x.id)).toEqual([3, 1, 2, 4])
  })

  it('sorts by last_login_at, never-logged-in users last in both directions', () => {
    expect(sortUsersClientSide(users, 'last_login_at', 'desc').map((x) => x.id)).toEqual([3, 2, 4, 1])
    expect(sortUsersClientSide(users, 'last_login_at', 'asc').map((x) => x.id)).toEqual([4, 2, 3, 1])
  })

  it('does not mutate the input array', () => {
    const copy = [...users]
    sortUsersClientSide(users, 'created_at', 'desc')
    expect(users).toEqual(copy)
  })
})

describe('fetchAdminUsersPage — frontend sorting', () => {
  it('sorts the full list when the server does not paginate', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: users })
    const res = await fetchAdminUsersPage({ page: 1, per_page: 2, sort_by: 'created_at', sort_dir: 'desc' })
    expect(res.users.map((x) => x.id)).toEqual([2, 1])
    expect(res.total).toBe(4)
  })

  it('fetches every server page when sorting, then sorts and paginates locally', async () => {
    const page = (data: AdminManagedUser[], current: number) => ({
      data: { data, meta: { total: 4, current_page: current, per_page: 2, last_page: 2 } },
    })
    // 1st call: the normal page request; 2nd + 3rd: fetch-all pages.
    mockedApi.get
      .mockResolvedValueOnce(page([users[0], users[1]], 1))
      .mockResolvedValueOnce(page([users[0], users[1]], 1))
      .mockResolvedValueOnce(page([users[2], users[3]], 2))

    const res = await fetchAdminUsersPage({ page: 1, per_page: 2, sort_by: 'last_login_at', sort_dir: 'desc' })

    expect(mockedApi.get).toHaveBeenCalledTimes(3)
    expect(mockedApi.get.mock.calls[2][1]).toMatchObject({ params: { page: 2, per_page: 100 } })
    expect(res.users.map((x) => x.id)).toEqual([3, 2])
    expect(res.total).toBe(4)
    expect(res.lastPage).toBe(2)
  })

  it('keeps the joined filter on every request of the sorted fetch-all flow', async () => {
    const page = (data: AdminManagedUser[], current: number) => ({
      data: { data, meta: { total: 4, current_page: current, per_page: 2, last_page: 2 } },
    })
    mockedApi.get
      .mockResolvedValueOnce(page([users[0], users[1]], 1))
      .mockResolvedValueOnce(page([users[0], users[1]], 1))
      .mockResolvedValueOnce(page([users[2], users[3]], 2))

    await fetchAdminUsersPage({ page: 1, per_page: 2, joined: 'month', sort_by: 'created_at', sort_dir: 'desc' })

    expect(mockedApi.get).toHaveBeenCalledTimes(3)
    for (const call of mockedApi.get.mock.calls) {
      expect(call[1]).toMatchObject({ params: { joined: 'month' } })
    }
  })

  it('keeps server pagination untouched when no sort is active', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { data: [users[0]], meta: { total: 4, current_page: 1, per_page: 1, last_page: 4 } },
    })
    const res = await fetchAdminUsersPage({ page: 1, per_page: 1 })
    expect(mockedApi.get).toHaveBeenCalledTimes(1)
    expect(res.users.map((x) => x.id)).toEqual([1])
  })
})
