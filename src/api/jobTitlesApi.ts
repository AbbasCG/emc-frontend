import api from './axios'

export type JobTitleOption = { id: number; department_id: number; name: string }

export async function fetchJobTitles(departmentId: number): Promise<JobTitleOption[]> {
  const res = await api.get('/job-titles', { params: { department_id: departmentId } })
  return res.data.data
}

export type DepartmentOption = { id: number; name_ar: string; name: string | null }

/** Any-authenticated-user department list — for the volunteer form's own picker, not the HR-only one. */
export async function fetchDepartmentOptions(): Promise<DepartmentOption[]> {
  const res = await api.get('/departments/options')
  return res.data.data
}
