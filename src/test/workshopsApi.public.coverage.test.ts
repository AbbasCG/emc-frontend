import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '@/api/axios'
import {
  fetchPublicWorkshopsPage,
  fetchPublicWorkshopBySlug,
  type PublicWorkshop,
} from '@/api/workshopsApi.public'

vi.mock('@/api/axios', () => ({
  default: {
    get: vi.fn(),
  },
}))

const mockedApi = vi.mocked(apiClient, true)

beforeEach(() => {
  vi.clearAllMocks()
})

/** Realistic raw backend workshop row (Arabic-first). */
function rawWorkshop(id: number, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id,
    title: `ورشة القيادة ${id}`,
    slug: `leadership-workshop-${id}`,
    description: 'وصف كامل للورشة',
    short_description: 'وصف مختصر',
    status: 'upcoming',
    start_date: '2026-09-01',
    start_time: '18:00',
    end_date: '2026-09-01',
    end_time: '21:00',
    location_type: 'online',
    meeting_link: 'https://meet.example.com/w',
    registration_open: true,
    price: 250,
    total_spots: 30,
    spots_remaining: 12,
    duration_hours: 3,
    certificate_name: 'شهادة حضور',
    cover_image: 'https://cdn.example.com/w.jpg',
    ...overrides,
  }
}

function metaBody(rows: unknown[], meta: Record<string, unknown>): unknown {
  return { success: true, data: rows, meta }
}

/* ── fetchPublicWorkshopsPage — request shape ── */

describe('fetchPublicWorkshopsPage — request params', () => {
  it('sends defaults page=1 per_page=12 silently and omits empty filters', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [] })
    await fetchPublicWorkshopsPage()
    expect(mockedApi.get).toHaveBeenCalledWith('/workshops', {
      skipErrorToast: true,
      params: { page: 1, per_page: 12 },
    })
  })

  it('trims and forwards every supported filter; price_type "all" is dropped', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [] })
    await fetchPublicWorkshopsPage({
      page: 2,
      per_page: 6,
      search: '  قيادة  ',
      status: ' upcoming ',
      instructor_id: 4,
      department_id: 7,
      date_from: ' 2026-09-01 ',
      date_to: ' 2026-09-30 ',
      price_type: 'free',
    })
    expect(mockedApi.get).toHaveBeenCalledWith('/workshops', {
      skipErrorToast: true,
      params: {
        page: 2,
        per_page: 6,
        search: 'قيادة',
        status: 'upcoming',
        instructor_id: 4,
        department_id: 7,
        date_from: '2026-09-01',
        date_to: '2026-09-30',
        price_type: 'free',
      },
    })

    mockedApi.get.mockResolvedValueOnce({ data: [] })
    await fetchPublicWorkshopsPage({ price_type: 'all', search: '   ' })
    expect(mockedApi.get).toHaveBeenLastCalledWith('/workshops', {
      skipErrorToast: true,
      params: { page: 1, per_page: 12 },
    })
  })
})

/* ── row extraction + normalization ── */

describe('fetchPublicWorkshopsPage — payload shapes and normalization', () => {
  it('accepts a bare array body', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [rawWorkshop(1)] })
    const res = await fetchPublicWorkshopsPage()
    expect(res.ok).toBe(true)
    expect(res.workshops.map((w) => w.id)).toEqual([1])
  })

  it('accepts { data: [...] }, { data: { data: [...] } }, { data: { workshops } }, { data: { items } }', async () => {
    for (const body of [
      { data: [rawWorkshop(1)] },
      { data: { data: [rawWorkshop(1)] } },
      { data: { workshops: [rawWorkshop(1)] } },
      { data: { items: [rawWorkshop(1)] } },
    ]) {
      mockedApi.get.mockResolvedValueOnce({ data: body })
      const res = await fetchPublicWorkshopsPage()
      expect(res.workshops).toHaveLength(1)
    }
  })

  it('returns an empty ok-page for an unrecognized body', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { message: 'لا يوجد' } })
    const res = await fetchPublicWorkshopsPage()
    expect(res).toEqual({ workshops: [], total: 0, page: 1, perPage: 12, lastPage: 1, ok: true })
  })

  it('normalizes a full row into the PublicWorkshop shape', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [rawWorkshop(5)] })
    const res = await fetchPublicWorkshopsPage()
    const w = res.workshops[0] as PublicWorkshop
    expect(w).toEqual({
      id: 5,
      title: 'ورشة القيادة 5',
      slug: 'leadership-workshop-5',
      description: 'وصف كامل للورشة',
      short_description: 'وصف مختصر',
      status: 'upcoming',
      start_date: '2026-09-01',
      start_time: '18:00',
      end_date: '2026-09-01',
      end_time: '21:00',
      location_type: 'online',
      meeting_link: 'https://meet.example.com/w',
      registration_open: true,
      is_online: true,
      instructor_name: null,
      instructor_avatar: null,
      course_id: null,
      course_slug: null,
      course_title: null,
      price: 250,
      is_free: false,
      seats_total: 30,
      seats_remaining: 12,
      duration_hours: 3,
      certificate_name: 'شهادة حضور',
      cover_image: 'https://cdn.example.com/w.jpg',
      external_registration_url: null,
    })
  })

  it('drops rows missing id, slug, or title, and non-object rows', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: [
        rawWorkshop(1),
        { ...rawWorkshop(2), id: 'ليس رقماً' },
        { ...rawWorkshop(3), slug: null, workshop_slug: null },
        { ...rawWorkshop(4), title: null, name: null, workshop_title: null },
        null,
        'نص',
      ],
    })
    const res = await fetchPublicWorkshopsPage()
    expect(res.workshops.map((w) => w.id)).toEqual([1])
  })

  it('uses alias keys: workshop_slug / name / summary / date / join_url / capacity / available_seats / hours', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: [{
        id: 8,
        workshop_slug: 'alias-workshop',
        name: 'ورشة بديلة',
        summary: 'ملخص',
        date: '2026-10-01',
        time: '17:00',
        join_url: 'https://zoom.example.com/j',
        capacity: 40,
        available_seats: 15,
        hours: 2,
      }],
    })
    const res = await fetchPublicWorkshopsPage()
    const w = res.workshops[0] as PublicWorkshop
    expect(w.slug).toBe('alias-workshop')
    expect(w.title).toBe('ورشة بديلة')
    expect(w.short_description).toBe('ملخص')
    expect(w.start_date).toBe('2026-10-01')
    expect(w.start_time).toBe('17:00')
    expect(w.meeting_link).toBe('https://zoom.example.com/j')
    expect(w.seats_total).toBe(40)
    expect(w.seats_remaining).toBe(15)
    expect(w.duration_hours).toBe(2)
  })

  it('pulls instructor and course info from nested objects', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: [{
        id: 9,
        slug: 'nested-workshop',
        title: 'ورشة متداخلة',
        instructor: { name: 'د. منى', avatar_url: 'mona.png' },
        course: { id: 77, slug: 'parent-course', title: 'الدورة الأم', price: 0, type: 'free', course_image: 'c.png', certificate_name: 'شهادة إتمام' },
      }],
    })
    const res = await fetchPublicWorkshopsPage()
    const w = res.workshops[0] as PublicWorkshop
    expect(w.instructor_name).toBe('د. منى')
    expect(w.instructor_avatar).toBe('mona.png')
    expect(w.course_id).toBe(77)
    expect(w.course_slug).toBe('parent-course')
    expect(w.course_title).toBe('الدورة الأم')
    expect(w.price).toBe(0)
    expect(w.is_free).toBe(true)
    expect(w.cover_image).toBe('c.png')
    expect(w.certificate_name).toBe('شهادة إتمام')
  })

  it('prefers trainer_name over instructor_name and nested instructor', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: [{
        id: 10, slug: 's', title: 'ت',
        trainer_name: 'المدرب الأساسي',
        instructor_name: 'بديل',
        instructor: { name: 'متداخل' },
      }],
    })
    const res = await fetchPublicWorkshopsPage()
    expect((res.workshops[0] as PublicWorkshop).instructor_name).toBe('المدرب الأساسي')
  })

  it('computes is_online from flags, location_type, and meeting_link presence', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: [
        { id: 1, slug: 'a', title: 'أ', is_online: 1 },
        { id: 2, slug: 'b', title: 'ب', location_type: 'ONLINE' },
        { id: 3, slug: 'c', title: 'ج', meeting_link: 'https://x' },
        { id: 4, slug: 'd', title: 'د', location_type: 'offline', meeting_link: 'https://x' },
        { id: 5, slug: 'e', title: 'هـ' },
      ],
    })
    const res = await fetchPublicWorkshopsPage()
    const byId = new Map(res.workshops.map((w) => [w.id, w]))
    expect(byId.get(1)?.is_online).toBe(true)   // is_online: 1
    expect(byId.get(2)?.is_online).toBe(true)   // location_type lowercased to 'online'
    expect(byId.get(2)?.location_type).toBe('online')
    expect(byId.get(3)?.is_online).toBe(true)   // meeting_link and not offline
    expect(byId.get(4)?.is_online).toBe(false)  // explicit offline wins over meeting_link
    expect(byId.get(5)?.is_online).toBe(false)
  })

  it('computes is_free from flag, type, course type, or price <= 0', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: [
        { id: 1, slug: 'a', title: 'أ', is_free: true, price: 100 },
        { id: 2, slug: 'b', title: 'ب', type: 'free' },
        { id: 3, slug: 'c', title: 'ج', price: 0 },
        { id: 4, slug: 'd', title: 'د', price: 100 },
        { id: 5, slug: 'e', title: 'هـ' }, // no price at all → not free
      ],
    })
    const res = await fetchPublicWorkshopsPage()
    const byId = new Map(res.workshops.map((w) => [w.id, w]))
    expect(byId.get(1)?.is_free).toBe(true)
    expect(byId.get(2)?.is_free).toBe(true)
    expect(byId.get(3)?.is_free).toBe(true)
    expect(byId.get(4)?.is_free).toBe(false)
    expect(byId.get(5)?.is_free).toBe(false)
    expect(byId.get(5)?.price).toBeNull()
  })

  it('treats registration_open as closed only for explicit false/0', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: [
        { id: 1, slug: 'a', title: 'أ', registration_open: false },
        { id: 2, slug: 'b', title: 'ب', registration_open: 0 },
        { id: 3, slug: 'c', title: 'ج' },
      ],
    })
    const res = await fetchPublicWorkshopsPage()
    const byId = new Map(res.workshops.map((w) => [w.id, w]))
    expect(byId.get(1)?.registration_open).toBe(false)
    expect(byId.get(2)?.registration_open).toBe(false)
    expect(byId.get(3)?.registration_open).toBe(true)
  })

  it('normalizes "لا توجد شهادة" certificate to null', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: [{ id: 1, slug: 'a', title: 'أ', certificate_name: 'لا توجد شهادة' }],
    })
    const res = await fetchPublicWorkshopsPage()
    expect((res.workshops[0] as PublicWorkshop).certificate_name).toBeNull()
  })
})

/* ── location_type client-side filtering ── */

describe('fetchPublicWorkshopsPage — location_type filter', () => {
  const rows = [
    rawWorkshop(1, { location_type: 'online', meeting_link: 'https://x' }),
    rawWorkshop(2, { location_type: 'offline', meeting_link: null, is_online: false }),
    rawWorkshop(3, { location_type: 'hybrid', meeting_link: null, is_online: false }),
  ]

  it('online keeps online rows only', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [...rows] })
    const res = await fetchPublicWorkshopsPage({ location_type: 'online' })
    expect(res.workshops.map((w) => w.id)).toEqual([1])
  })

  it('offline keeps explicit offline rows AND non-online rows (hybrid without meeting link passes too)', async () => {
    // Current behavior: the offline branch is `lt === 'offline' || (!is_online && lt !== 'online')`,
    // so a hybrid workshop that is not online also matches the offline filter.
    mockedApi.get.mockResolvedValueOnce({ data: [...rows] })
    const res = await fetchPublicWorkshopsPage({ location_type: 'offline' })
    expect(res.workshops.map((w) => w.id)).toEqual([2, 3])
  })

  it('hybrid keeps hybrid rows only', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [...rows] })
    const res = await fetchPublicWorkshopsPage({ location_type: 'hybrid' })
    expect(res.workshops.map((w) => w.id)).toEqual([3])
  })

  it('"all" applies no filter', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [...rows] })
    const res = await fetchPublicWorkshopsPage({ location_type: 'all' })
    expect(res.workshops).toHaveLength(3)
  })
})

/* ── meta parsing and client-side pagination fallback ── */

describe('fetchPublicWorkshopsPage — meta and pagination', () => {
  it('uses server meta when present', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: metaBody([rawWorkshop(1)], { total: 45, current_page: 2, per_page: 12, last_page: 4 }),
    })
    const res = await fetchPublicWorkshopsPage({ page: 2 })
    expect(res).toMatchObject({ total: 45, page: 2, perPage: 12, lastPage: 4, ok: true })
  })

  it('fills meta gaps: page/perPage aliases and computed lastPage', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: metaBody([rawWorkshop(1)], { total: 25, page: 3, perPage: 10 }),
    })
    const res = await fetchPublicWorkshopsPage()
    expect(res).toMatchObject({ total: 25, page: 3, perPage: 10, lastPage: 3 })
  })

  it('ignores meta without a finite total and paginates client-side instead', async () => {
    const rows = Array.from({ length: 15 }, (_, i) => rawWorkshop(i + 1))
    mockedApi.get.mockResolvedValueOnce({ data: metaBody(rows, { total: 'غير رقم' }) })
    const res = await fetchPublicWorkshopsPage({ per_page: 10, page: 2 })
    expect(res.total).toBe(15)
    expect(res.page).toBe(2)
    expect(res.lastPage).toBe(2)
    expect(res.workshops.map((w) => w.id)).toEqual([11, 12, 13, 14, 15])
  })

  it('clamps an out-of-range requested page in the client-side fallback', async () => {
    const rows = Array.from({ length: 5 }, (_, i) => rawWorkshop(i + 1))
    mockedApi.get.mockResolvedValueOnce({ data: rows })
    const res = await fetchPublicWorkshopsPage({ per_page: 12, page: 9 })
    expect(res.page).toBe(1)
    expect(res.lastPage).toBe(1)
    expect(res.workshops).toHaveLength(5)
  })

  it('returns a not-ok empty page on transport failure', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'))
    const res = await fetchPublicWorkshopsPage({ per_page: 6 })
    expect(res).toEqual({ workshops: [], total: 0, page: 1, perPage: 6, lastPage: 1, ok: false })
  })
})

/* ── fetchPublicWorkshopBySlug ── */

describe('fetchPublicWorkshopBySlug', () => {
  it('returns not-ok immediately for a blank slug without any request', async () => {
    await expect(fetchPublicWorkshopBySlug('   ')).resolves.toEqual({ workshop: null, ok: false })
    expect(mockedApi.get).not.toHaveBeenCalled()
  })

  it('fetches the encoded slug silently and unwraps { data: row }', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { success: true, data: rawWorkshop(3) } })
    const res = await fetchPublicWorkshopBySlug(' ورشة/خاصة ')
    expect(mockedApi.get).toHaveBeenCalledWith(
      `/workshops/${encodeURIComponent('ورشة/خاصة')}`,
      { skipErrorToast: true },
    )
    expect(res.ok).toBe(true)
    expect(res.workshop?.id).toBe(3)
  })

  it('accepts a bare row body (no data wrapper)', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: rawWorkshop(4) })
    const res = await fetchPublicWorkshopBySlug('leadership-workshop-4')
    expect(res.ok).toBe(true)
    expect(res.workshop?.slug).toBe('leadership-workshop-4')
  })

  it('returns not-ok when the body is not a normalizable workshop', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { message: 'غير موجود' } } })
    await expect(fetchPublicWorkshopBySlug('x')).resolves.toEqual({ workshop: null, ok: false })
  })

  it('falls back to searching the public list when the detail request fails', async () => {
    mockedApi.get
      .mockRejectedValueOnce(new Error('Request failed with status code 404'))
      .mockResolvedValueOnce({ data: [rawWorkshop(1), rawWorkshop(2)] })
    const res = await fetchPublicWorkshopBySlug('leadership-workshop-2')
    expect(res.ok).toBe(true)
    expect(res.workshop?.id).toBe(2)
    // fallback list request uses per_page 200
    expect(mockedApi.get).toHaveBeenLastCalledWith('/workshops', {
      skipErrorToast: true,
      params: { page: 1, per_page: 200 },
    })
  })

  it('returns not-ok when the fallback list has no matching slug', async () => {
    mockedApi.get
      .mockRejectedValueOnce(new Error('500'))
      .mockResolvedValueOnce({ data: [rawWorkshop(1)] })
    await expect(fetchPublicWorkshopBySlug('missing-slug')).resolves.toEqual({ workshop: null, ok: false })
  })
})
