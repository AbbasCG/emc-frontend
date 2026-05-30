import apiClient from './axios'
import { asList, unwrapLms } from './lmsApi'
import type { PartnerDashboardData, PartnerProgramRow } from '@/types/platform'

export type PartnerReportRow = { id: number; title: string; at: string }

export async function fetchPartnerDashboard(): Promise<PartnerDashboardData> {
  const res = await apiClient.get<unknown>('/partner/dashboard')
  return unwrapLms<PartnerDashboardData>(res.data)
}

export async function fetchPartnerPrograms(): Promise<PartnerProgramRow[]> {
  try {
    const res = await apiClient.get<unknown>('/partner/programs')
    return asList<PartnerProgramRow>(res.data)
  } catch {
    return []
  }
}

export async function fetchPartnerReports(): Promise<PartnerReportRow[]> {
  try {
    const res = await apiClient.get<unknown>('/partner/reports')
    return asList<PartnerReportRow>(res.data)
  } catch {
    return []
  }
}
