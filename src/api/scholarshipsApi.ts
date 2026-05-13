import apiClient from './axios'
import { asList, unwrapLms } from './lmsApi'
import type { ScholarshipApplication, ScholarshipStatus } from '@/types/intelligence'

export async function fetchScholarships(): Promise<ScholarshipApplication[]> {
  const res = await apiClient.get<unknown>('/finance/scholarships')
  return asList<ScholarshipApplication>(res.data)
}

export async function updateScholarshipStatus(id: number, status: ScholarshipStatus): Promise<ScholarshipApplication> {
  const res = await apiClient.patch<unknown>(`/finance/scholarships/${id}`, { status })
  return unwrapLms<ScholarshipApplication>(res.data)
}
