/**
 * HR dashboard snapshot: prefers GET /hr/dashboard; otherwise aggregates
 * silent calls to team + instructors + ops endpoints (403 → graceful gaps).
 */

import apiClient from '@/api/axios'
import { fetchInstructors } from '@/api/instructorsApi'
import { asList } from '@/api/lmsApi'
import { getTeam } from '@/services/teamApi'
import type { HrDashboardLinkedFlags, HrDashboardSnapshot } from '@/types/hr'
import type { OpsMeeting, OpsTask, OpsVolunteer, WorkspaceDepartment } from '@/types/operations'
import { getDepartmentName } from '@/utils/workspaceDepartment'

const emptyFlags = (): HrDashboardLinkedFlags => ({
  overviewApi: false,
  team: false,
  volunteers: false,
  instructors: false,
  departments: false,
  tasks: false,
  meetings: false,
})

function volunteerPendingApply(v: OpsVolunteer) {
  return v.status === 'applied' || v.status === 'review'
}

function startOfWeek(d: Date) {
  const x = new Date(d)
  const day = x.getDay()
  const diff = (day + 6) % 7
  x.setDate(x.getDate() - diff)
  x.setHours(0, 0, 0, 0)
  return x
}

function endOfWeek(d: Date) {
  const s = startOfWeek(d)
  const e = new Date(s)
  e.setDate(e.getDate() + 7)
  return e
}

async function silentVolunteers(): Promise<OpsVolunteer[]> {
  const res = await apiClient.get<unknown>('/operations/volunteers', { skipErrorToast: true })
  return asList<OpsVolunteer>(res.data)
}

async function silentWorkspaceDepartments(): Promise<WorkspaceDepartment[]> {
  const res = await apiClient.get<unknown>('/operations/departments', { skipErrorToast: true })
  return asList<WorkspaceDepartment>(res.data)
}

async function silentMeetings(): Promise<OpsMeeting[]> {
  const res = await apiClient.get<unknown>('/operations/meetings', { skipErrorToast: true })
  return asList<OpsMeeting>(res.data)
}

async function silentTasks(): Promise<OpsTask[]> {
  const res = await apiClient.get<unknown>('/operations/tasks', {
    params: { scope: 'all' },
    skipErrorToast: true,
  })
  return asList<OpsTask>(res.data)
}

export async function fetchHrDashboardSnapshot(): Promise<HrDashboardSnapshot> {
  const linked = emptyFlags()

  let totalTeamMembers: number | null = null
  let deptHeadcount: { label: string; count: number }[] = []
  let departmentsCount: number | null = null

  let activeVolunteers: number | null = null
  let pendingApplications: number | null = null
  let onboardingProgressPct: number | null = null

  let activeInstructors: number | null = null

  let interviewsUpcoming: HrDashboardSnapshot['interviewsUpcoming'] = []
  let tasksDueThisWeek: HrDashboardSnapshot['tasksDueThisWeek'] = []

  try {
    const res = await apiClient.get<unknown>('/hr/dashboard', { skipErrorToast: true })
    linked.overviewApi = true
    const raw = res.data as Record<string, unknown>
    const payload =
      raw && typeof raw === 'object' && 'data' in raw && raw.data && typeof raw.data === 'object' ?
        (raw.data as Record<string, unknown>)
      : raw

    const num = (k: string): number | null => {
      const v = payload[k]
      return typeof v === 'number' && Number.isFinite(v) ? v : null
    }
    totalTeamMembers = num('total_team_members')
    departmentsCount = num('departments_count')
    activeVolunteers = num('active_volunteers')
    activeInstructors = num('active_instructors')
    pendingApplications = num('pending_applications')
    onboardingProgressPct = num('onboarding_progress_pct')

    const dh = payload.department_headcount
    if (Array.isArray(dh)) {
      deptHeadcount = dh
        .map((row) =>
          row && typeof row === 'object' ?
            {
              label: String((row as { label?: unknown }).label ?? ''),
              count: Number((row as { count?: unknown }).count) || 0,
            }
          : null,
        )
        .filter((x): x is { label: string; count: number } => Boolean(x?.label?.trim()))
    }

    const iv = payload.interviews
    if (Array.isArray(iv)) {
      interviewsUpcoming = iv.map((item, idx) =>
        item && typeof item === 'object' ?
          {
            id: Number((item as { id?: unknown }).id) || idx + 1,
            title: String((item as { title?: unknown }).title ?? ''),
            when: String(
              (item as { when?: unknown }).when ??
                (item as { starts_at?: unknown }).starts_at ??
                '',
            ),
            subtitle:
              typeof (item as { subtitle?: unknown }).subtitle === 'string' ?
                ((item as { subtitle: string }).subtitle as string | null)
              : null,
          }
        : { id: idx + 1, title: '', when: '', subtitle: null },
      )
    }

    const tk = payload.tasks_due_week
    if (Array.isArray(tk)) {
      tasksDueThisWeek = tk.map((item, idx) =>
        item && typeof item === 'object' ?
          {
            id: Number((item as { id?: unknown }).id) || idx + 1,
            title: String((item as { title?: unknown }).title ?? ''),
            due_at:
              (item as { due_at?: string | null }).due_at !== undefined ?
                ((item as { due_at?: string | null }).due_at ?? null)
              : null,
          }
        : { id: idx + 1, title: '', due_at: null },
      )
    }
  } catch {
    linked.overviewApi = false
  }

  try {
    const depts = await getTeam()
    linked.team = true
    if (totalTeamMembers == null)
      totalTeamMembers = depts.reduce((acc, d) => acc + (d.members?.length ?? 0), 0)
    if (!deptHeadcount.length)
      deptHeadcount = depts.map((d) => ({ label: d.name_ar, count: d.members?.length ?? 0 }))
    if (departmentsCount == null) departmentsCount = depts.length
  } catch {
    if (!linked.overviewApi) linked.team = false
  }

  try {
    const opsDepts = await silentWorkspaceDepartments()
    if (opsDepts.length > 0) {
      linked.departments = true
      if (departmentsCount == null) departmentsCount = opsDepts.length
      if (!deptHeadcount.length || deptHeadcount.every((r) => r.count === 0)) {
        deptHeadcount = opsDepts.map((d) => ({ label: getDepartmentName(d), count: d.members_count }))
      }
    }
  } catch {
    linked.departments = false
  }

  try {
    const vols: OpsVolunteer[] = await silentVolunteers()
    linked.volunteers = true
    if (activeVolunteers == null)
      activeVolunteers = vols.filter((v) => v.status === 'active' || v.status === 'partial').length
    if (pendingApplications == null) pendingApplications = vols.filter(volunteerPendingApply).length

    const n = vols.length
    if (onboardingProgressPct == null && n > 0) {
      const doneLike = vols.filter((v) => v.status === 'active' || v.status === 'accepted').length
      onboardingProgressPct = Math.round((doneLike / n) * 100)
    }
  } catch {
    linked.volunteers = false
  }

  try {
    const rows = await fetchInstructors()
    linked.instructors = true
    if (activeInstructors == null)
      activeInstructors = rows.filter((x) => x?.id != null).length
  } catch {
    linked.instructors = false
  }

  if (!interviewsUpcoming.length) {
    try {
      const meetings = await silentMeetings()
      linked.meetings = true
      const now = Date.now()
      interviewsUpcoming = meetings
        .filter((m) => m.status === 'scheduled' && Boolean(m.starts_at))
        .filter((m) => new Date(m.starts_at as string).getTime() >= now)
        .slice(0, 6)
        .map((m) => ({
          id: m.id,
          title: m.title,
          when: String(m.starts_at),
          subtitle: m.department_name ?? null,
        }))
    } catch {
      linked.meetings = false
    }
  }

  if (!tasksDueThisWeek.length) {
    try {
      const tasks = await silentTasks()
      linked.tasks = true
      const w0 = startOfWeek(new Date())
      const w1 = endOfWeek(new Date())
      tasksDueThisWeek = tasks
        .filter((t) => {
          if (!t.due_at) return false
          const d = new Date(t.due_at)
          return d >= w0 && d < w1 && t.status !== 'done' && t.status !== 'cancelled'
        })
        .slice(0, 8)
        .map((t) => ({ id: t.id, title: t.title, due_at: t.due_at ?? null }))
    } catch {
      linked.tasks = false
    }
  }

  return {
    totalTeamMembers,
    activeVolunteers,
    activeInstructors,
    pendingApplications,
    departmentsCount,
    onboardingProgressPct,
    interviewsUpcoming,
    tasksDueThisWeek,
    departmentHeadcount: deptHeadcount,
    linked,
  }
}
