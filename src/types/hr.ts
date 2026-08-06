/**
 * HR dashboard — types for overview + optional backend shape when GET /hr/dashboard exists.
 */

export type HrInterviewListItem = {
  id: number
  title: string
  when: string
  subtitle?: string | null
}

export type HrTaskDueItem = {
  id: number
  title: string
  due_at: string | null
}

export type HrDepartmentBar = {
  label: string
  count: number
}

export type HrDashboardLinkedFlags = {
  overviewApi: boolean
  team: boolean
  volunteers: boolean
  instructors: boolean
  departments: boolean
  tasks: boolean
  meetings: boolean
}

/** Normalized snapshot consumed by the HR home dashboard. */
export type HrDashboardSnapshot = {
  totalTeamMembers: number | null
  activeVolunteers: number | null
  activeInstructors: number | null
  pendingApplications: number | null
  departmentsCount: number | null
  onboardingProgressPct: number | null
  interviewsUpcoming: HrInterviewListItem[]
  tasksDueThisWeek: HrTaskDueItem[]
  departmentHeadcount: HrDepartmentBar[]
  linked: HrDashboardLinkedFlags
}

export const HR_NOT_LINKED_MESSAGE = 'لم يتم ربط هذا القسم بالبيانات بعد'
