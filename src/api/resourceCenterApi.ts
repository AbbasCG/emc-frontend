import apiClient from './axios'

export interface ResourceCenterCourse {
  id: number
  title: string
  slug: string
  short_description?: string | null
  description?: string | null
  status: string
  program_type: string
  course_image?: string | null
  course_thumbnail?: string | null
  duration?: string | null
  training_hours?: number | null
  created_at?: string | null
  registrations_count?: number
  active_registrations_count?: number
  effective_enrollment_count?: number | null
  instructor?: { id: number; user?: { name?: string | null } | null } | null
  track?: { id: number; title?: string | null } | null
  public_url: string
  is_favorite: boolean
}

export interface ResourceCenterFilters {
  search?: string
  status?: string
  program_type?: string
  instructor_id?: number
  track_id?: number
  sort?: 'title_asc' | 'title_desc' | 'latest' | 'oldest'
  per_page?: number
  page?: number
}

export interface ResourceCenterListResponse {
  data: ResourceCenterCourse[]
  meta: { total: number; current_page: number; last_page: number; per_page: number }
  summary: Record<string, number>
}

export async function fetchResourceCenterCourses(filters: ResourceCenterFilters): Promise<ResourceCenterListResponse> {
  const res = await apiClient.get<ResourceCenterListResponse>('/admin/resource-center/courses', { params: filters })
  return res.data
}

export async function fetchResourceCenterFavorites(): Promise<number[]> {
  const res = await apiClient.get<{ success: boolean; data: number[] }>('/admin/resource-center/favorites')
  return res.data.data
}

export async function toggleResourceCenterFavorite(courseId: number): Promise<boolean> {
  const res = await apiClient.post<{ success: boolean; data: { is_favorite: boolean } }>(
    `/admin/resource-center/courses/${courseId}/favorite`,
  )
  return res.data.data.is_favorite
}

export async function exportResourceCenterCourses(
  format: 'csv' | 'xlsx',
  filters: ResourceCenterFilters,
  selectedIds?: number[],
): Promise<void> {
  const params: Record<string, unknown> = { ...filters, format }
  if (selectedIds && selectedIds.length > 0) {
    params.selected = selectedIds
  }
  const res = await apiClient.get('/admin/resource-center/export', {
    params,
    responseType: 'blob',
    skipErrorToast: true,
  })
  const disposition = res.headers['content-disposition'] as string | undefined
  const match = disposition ? /filename="?([^";]+)"?/i.exec(disposition) : null
  const filename = match?.[1] ?? `course-library-${new Date().toISOString().slice(0, 10)}.${format}`

  const url = URL.createObjectURL(res.data as Blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
