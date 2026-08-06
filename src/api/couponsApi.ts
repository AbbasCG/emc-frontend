import apiClient from './axios'
import { asList, unwrapLms } from './lmsApi'
import type { CouponRecord } from '@/types/intelligence'

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

/** Full detail — courses, excluded_courses, created_by/updated_by. GET is only routed under /admin/coupons, not /finance/coupons. */
export async function fetchCoupon(id: number): Promise<CouponRecord> {
  const res = await apiClient.get<unknown>(`/admin/coupons/${id}`)
  return unwrapLms<CouponRecord>(res.data)
}
