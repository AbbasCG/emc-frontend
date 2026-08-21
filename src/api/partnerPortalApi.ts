import apiClient from './axios'
import { asList, unwrapLms } from './lmsApi'
import type { PartnerDashboardData, PartnerProgramRow } from '@/types/platform'

export type PartnerReportRow = { id: number; title: string; at: string }

const EMPTY_PARTNER_DASHBOARD: PartnerDashboardData = {
  partner: null,
  partnership_status: '',
  joint_programs_count: 0,
  active_programs_count: 0,
  participants_total: 0,
  impact_score: null,
  reports_count: 0,
  documents_count: 0,
  your_role: null,
  upcoming_meetings: [],
  recent_reports: [],
}

function toFiniteNumber(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function toNullableFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
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
  const partner = o.partner && typeof o.partner === 'object' && !Array.isArray(o.partner)
    ? o.partner as PartnerDashboardData['partner']
    : null
  return {
    partner,
    partnership_status: typeof o.partnership_status === 'string'
      ? o.partnership_status
      : partner?.status ?? '',
    joint_programs_count: toFiniteNumber(o.joint_programs_count ?? o.programs_count),
    active_programs_count: toFiniteNumber(o.active_programs_count ?? o.active_programs),
    participants_total: toFiniteNumber(o.participants_total),
    impact_score: toNullableFiniteNumber(o.impact_score),
    reports_count: toFiniteNumber(o.reports_count),
    documents_count: toFiniteNumber(o.documents_count),
    your_role: typeof o.your_role === 'string' ? o.your_role : null,
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
    return asList<Record<string, unknown>>(res.data).map((row) => ({
      id: toFiniteNumber(row.id),
      title: typeof row.title === 'string' ? row.title : '',
      status: typeof row.status === 'string' ? row.status : 'draft',
      cohort_size: toFiniteNumber(row.cohort_size ?? row.participant_count),
      starts_at: typeof (row.starts_at ?? row.start_date) === 'string' ? String(row.starts_at ?? row.start_date) : null,
      ends_at: typeof (row.ends_at ?? row.end_date) === 'string' ? String(row.ends_at ?? row.end_date) : null,
      description: typeof row.description === 'string' ? row.description : null,
    }))
  } catch {
    return []
  }
}

export async function fetchPartnerReports(): Promise<PartnerReportRow[]> {
  try {
    const res = await apiClient.get<unknown>('/partner/reports')
    return asList<Record<string, unknown>>(res.data).map((row) => ({
      id: toFiniteNumber(row.id),
      title: typeof row.title === 'string' ? row.title : '',
      at: typeof row.at === 'string' ? row.at : '',
    }))
  } catch {
    return []
  }
}
