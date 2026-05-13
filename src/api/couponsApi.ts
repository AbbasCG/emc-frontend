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
