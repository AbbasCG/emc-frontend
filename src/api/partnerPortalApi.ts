import apiClient from './axios'
import { asList, unwrapLms } from './lmsApi'
import type { PartnerDashboardData, PartnerProgramRow } from '@/types/platform'

export type PartnerReportRow = { id: number; title: string; at: string }

const EMPTY_PARTNER_DASHBOARD: PartnerDashboardData = {
  partnership_status: '',
  joint_programs_count: 0,
  participants_total: 0,
  impact_score: 0,
  upcoming_meetings: [],
  recent_reports: [],
}

function toFiniteNumber(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function toMeetingList(value: unknown): { id: number; title: string; at: string }[] {
  return Array.isArray(value) ? (value as { id: number; title: string; at: string }[]) : []
}

/** The API may return `{success:true, data:[]}` or `{success:true, data:{}}` for an
 *  empty dashboard — normalize any shape to a complete PartnerDashboardData so the
 *  page never crashes on `.map` of a missing array or renders NaN. */
function normalizePartnerDashboard(payload: unknown): PartnerDashboardData {
  const raw = unwrapLms<unknown>(payload)
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...EMPTY_PARTNER_DASHBOARD }
  const o = raw as Record<string, unknown>
  return {
    partnership_status: typeof o.partnership_status === 'string' ? o.partnership_status : '',
    joint_programs_count: toFiniteNumber(o.joint_programs_count),
    participants_total: toFiniteNumber(o.participants_total),
    impact_score: toFiniteNumber(o.impact_score),
    upcoming_meetings: toMeetingList(o.upcoming_meetings),
    recent_reports: toMeetingList(o.recent_reports),
  }
}

export async function fetchPartnerDashboard(): Promise<PartnerDashboardData> {
  const res = await apiClient.get<unknown>('/partner/dashboard')
  return normalizePartnerDashboard(res.data)
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
