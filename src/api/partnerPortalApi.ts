import apiClient from './axios'
import { asList, unwrapLms } from './lmsApi'
import { seedPartnerDashboard, seedPartnerPrograms } from '@/data/platformSeed'
import type { PartnerDashboardData, PartnerProgramRow } from '@/types/platform'

export type PartnerReportRow = { id: number; title: string; at: string }

export async function fetchPartnerDashboard(): Promise<PartnerDashboardData> {
  try {
    const res = await apiClient.get<unknown>('/partner/dashboard')
    return unwrapLms<PartnerDashboardData>(res.data)
  } catch {
    return seedPartnerDashboard()
  }
}

export async function fetchPartnerPrograms(): Promise<PartnerProgramRow[]> {
  try {
    const res = await apiClient.get<unknown>('/partner/programs')
    return asList<PartnerProgramRow>(res.data)
  } catch {
    return seedPartnerPrograms()
  }
}

export async function fetchPartnerReports(): Promise<PartnerReportRow[]> {
  try {
    const res = await apiClient.get<unknown>('/partner/reports')
    return asList<PartnerReportRow>(res.data)
  } catch {
    return seedPartnerDashboard().recent_reports
  }
}
