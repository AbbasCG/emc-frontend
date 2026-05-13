import apiClient from './axios'
import { asList, unwrapLms } from './lmsApi'
import type { ReportRecord, ReportTypeSlug } from '@/types/intelligence'

export async function fetchReports(): Promise<ReportRecord[]> {
  const res = await apiClient.get<unknown>('/reports')
  return asList<ReportRecord>(res.data)
}

export async function generateReport(payload: {
  report_type: ReportTypeSlug
  related_label?: string
  title?: string
}): Promise<ReportRecord> {
  const res = await apiClient.post<unknown>('/reports/generate', payload)
  return unwrapLms<ReportRecord>(res.data)
}
