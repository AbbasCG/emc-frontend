import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '@/api/axios'
import {
  fetchVolunteers,
  fetchVolunteerRequestsStats,
  fetchVolunteer,
  updateVolunteer,
} from '@/api/volunteersApi'
import type { OpsVolunteer } from '@/types/operations'

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

const volunteer: OpsVolunteer = {
  id: 7,
  name: 'سارة أحمد',
  department_id: 'edu',
  department_name: 'إدارة التعليم',
  status: 'active',
  skills: ['تصميم', 'ترجمة'],
  availability: 'weekends',
  hours_logged: 12,
  onboarding_step: null,
}

describe('fetchVolunteers', () => {
  it('unwraps a Laravel { data: [...] } envelope into the volunteer list', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [volunteer] } })
    const rows = await fetchVolunteers()
    expect(rows).toEqual([volunteer])
    expect(mockedApi.get).toHaveBeenCalledWith('/operations/volunteers', { skipErrorToast: true })
  })

  it('accepts a bare array payload', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [volunteer] })
    await expect(fetchVolunteers()).resolves.toEqual([volunteer])
  })

  it('returns [] for a malformed (non-list) payload', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { weird: true } } })
    await expect(fetchVolunteers()).resolves.toEqual([])
  })

  it('returns [] when the request fails (never throws)', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'))
    await expect(fetchVolunteers()).resolves.toEqual([])
  })
})

describe('fetchVolunteerRequestsStats', () => {
  it('issues two counting requests (all + pending) with per_page=1 and reads the paginator total', async () => {
    // Promise.all evaluates getCount() then getCount('pending') in order
    mockedApi.get
      .mockResolvedValueOnce({ data: { data: { total: 25 } } })
      .mockResolvedValueOnce({ data: { data: { total: 4 } } })

    const stats = await fetchVolunteerRequestsStats()
    expect(stats).toEqual({ total: 25, pending: 4 })

    expect(mockedApi.get).toHaveBeenCalledWith('/admin/volunteer-requests', {
      skipErrorToast: true,
      params: { per_page: 1 },
    })
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/volunteer-requests', {
      skipErrorToast: true,
      params: { per_page: 1, status: 'pending' },
    })
  })

  it('falls back to 0 when total is missing or non-numeric', async () => {
    mockedApi.get
      .mockResolvedValueOnce({ data: { data: {} } })
      .mockResolvedValueOnce({ data: { data: { total: 'غير رقم' } } })
    await expect(fetchVolunteerRequestsStats()).resolves.toEqual({ total: 0, pending: 0 })
  })

  it('returns 0/0 when both requests fail (never throws)', async () => {
    mockedApi.get.mockRejectedValue(new Error('boom'))
    await expect(fetchVolunteerRequestsStats()).resolves.toEqual({ total: 0, pending: 0 })
  })
})

describe('fetchVolunteer / updateVolunteer', () => {
  it('fetchVolunteer GETs /operations/volunteers/{id} and unwraps { data }', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: volunteer } })
    await expect(fetchVolunteer(7)).resolves.toEqual(volunteer)
    expect(mockedApi.get).toHaveBeenCalledWith('/operations/volunteers/7')
  })

  it('fetchVolunteer propagates request errors', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('404'))
    await expect(fetchVolunteer(99)).rejects.toThrow('404')
  })

  it('updateVolunteer PATCHes the partial body and unwraps the updated row', async () => {
    const updated: OpsVolunteer = { ...volunteer, status: 'inactive' }
    mockedApi.patch.mockResolvedValueOnce({ data: { data: updated } })
    await expect(updateVolunteer(7, { status: 'inactive' })).resolves.toEqual(updated)
    expect(mockedApi.patch).toHaveBeenCalledWith('/operations/volunteers/7', { status: 'inactive' })
  })

  it('updateVolunteer propagates request errors', async () => {
    mockedApi.patch.mockRejectedValueOnce(new Error('422'))
    await expect(updateVolunteer(7, { status: 'active' })).rejects.toThrow('422')
  })
})
