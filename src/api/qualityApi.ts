import apiClient from './axios'
import { asList, unwrapLms } from './lmsApi'
import type { QualityReview } from '@/types/intelligence'

export async function fetchQualityReviews(): Promise<QualityReview[]> {
  const res = await apiClient.get<unknown>('/quality/reviews')
  return asList<QualityReview>(res.data)
}

export async function createQualityReview(body: Partial<QualityReview>): Promise<QualityReview> {
  const res = await apiClient.post<unknown>('/quality/reviews', body)
  return unwrapLms<QualityReview>(res.data)
}

export async function updateQualityReview(id: number, body: Partial<QualityReview>): Promise<QualityReview> {
  const res = await apiClient.patch<unknown>(`/quality/reviews/${id}`, body)
  return unwrapLms<QualityReview>(res.data)
}
