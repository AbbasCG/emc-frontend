import apiClient from '@/api/axios'

/** Exact shape of DepartmentResource — not AdminDepartment's computed "healthy/risk/attention" status. */
export type DepartmentOverviewDepartment = {
  id: number
  name: string
  name_ar: string
  name_en: string | null
  slug: string
  description: string | null
  description_ar: string | null
  status: string
  is_active: boolean
  icon: string | null
  color: string | null
  sort_order: number
  parent_id: number | null
  leader: { id: number; name: string; email: string; role: string } | null
  created_at: string | null
}

export type DepartmentOverviewMember = {
  id: number
  user_id: number | null
  name: string
  position: string | null
  email: string | null
  image: string | null
  is_active: boolean
  is_leader: boolean
  is_executive: boolean
  joined_at: string | null
}

export type DepartmentOverviewVolunteer = {
  id: number
  full_name: string
  job_title: string
  join_date: string | null
  weekly_hours: number | null
  availability: string | null
  status: string
  approved_at: string | null
}

export type DepartmentOverviewApplication = {
  id: number
  full_name: string
  email: string
  job_title: string
  submitted_at: string | null
  status: string
}

export type DepartmentOverviewCourse = {
  id: number
  title: string
  type: string | null
  status: string | null
  instructor: string | null
  students_count: number
  start_date: string | null
  end_date: string | null
}

export type DepartmentOverviewTask = {
  id: number
  title: string
  assignee: string | null
  priority: string
  status: string
  due_date: string | null
  is_overdue: boolean
}

export type DepartmentOverviewActivity = {
  id: number
  action: string
  entity_type: string
  entity_name: string | null
  description: string | null
  user_name: string | null
  created_at: string
}

export type DepartmentOverview = {
  department: DepartmentOverviewDepartment
  kpis: {
    total_members: number
    active_members: number
    approved_volunteers: number
    pending_applications: number
    programs_linked: number
    courses_linked: number
    open_tasks: number
    overdue_tasks: number
    leadership_count: number
    new_members_this_month: number
    activity_rate: number
    last_join_date: string | null
    completed_tasks_this_month: number
  }
  leadership: {
    manager: { id: number; name: string; email: string; role: string; phone: string | null } | null
    section_leads: { id: number; name: string; email: string; role: string; title: string }[]
  }
  members: DepartmentOverviewMember[]
  approved_volunteers: DepartmentOverviewVolunteer[]
  volunteer_applications: {
    stats: { total: number; submitted: number; under_review: number; approved: number; rejected: number }
    recent: DepartmentOverviewApplication[]
  }
  courses: DepartmentOverviewCourse[]
  tasks: DepartmentOverviewTask[]
  recent_activity: DepartmentOverviewActivity[]
  completeness: { percentage: number; missing: string[] }
}

export async function fetchDepartmentOverview(id: string | number): Promise<DepartmentOverview> {
  const res = await apiClient.get(`/operations/departments/${id}/overview`)
  return res.data.data
}
