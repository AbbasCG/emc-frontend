import apiClient from './axios'
import { asList, unwrapLms } from './lmsApi'
import type { CouponCourseRef, CouponRecord } from '@/types/intelligence'

export async function fetchCoupons(): Promise<CouponRecord[]> {
  const res = await apiClient.get<unknown>('/finance/coupons')
  return asList<CouponRecord>(res.data)
}

export async function createCoupon(body: Partial<CouponRecord>): Promise<CouponRecord> {
  const res = await apiClient.post<unknown>('/finance/coupons', body)
  return unwrapLms<CouponRecord>(res.data)
}

export async function updateCoupon(id: number, body: Partial<CouponRecord>): Promise<CouponRecord> {
  const res = await apiClient.patch<unknown>(`/finance/coupons/${id}`, body)
  return unwrapLms<CouponRecord>(res.data)
}

/** Full detail — courses, excluded_courses, created_by/updated_by. Routed under /finance/coupons for finance_manager too. */
export async function fetchCoupon(id: number): Promise<CouponRecord> {
  const res = await apiClient.get<unknown>(`/finance/coupons/${id}`, { skipErrorToast: true })
  return unwrapLms<CouponRecord>(res.data)
}

/**
 * Server-side search of paid courses (price > 0, every status) for the coupon course picker.
 * `/finance/purchasables` caps the result at 100 and has no pagination, so callers must search.
 * Throws on failure: callers show an error, never an empty list.
 */
export async function searchCouponCourses(q: string, signal?: AbortSignal): Promise<CouponCourseRef[]> {
  const res = await apiClient.get<unknown>('/finance/purchasables', {
    params: { type: 'course', q: q.trim() || undefined, per_page: 100 },
    skipErrorToast: true,
    signal,
  })
  return asList<Record<string, unknown>>(res.data)
    .map((r) => ({
      id: Number(r.id),
      title: String(r.title ?? ''),
      price: r.price == null ? null : Number(r.price),
      status: (r.status as string | null | undefined) ?? null,
    }))
    .filter((c) => Number.isFinite(c.id) && c.id > 0 && c.title !== '')
}
