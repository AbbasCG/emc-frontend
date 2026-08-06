import apiClient from './axios'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProductUpdateCategory = 'feature' | 'fix' | 'improvement' | 'security' | 'announcement'
export type ProductUpdateStatus   = 'draft' | 'published' | 'archived'

export type UpdateType =
  | 'information'
  | 'new_feature'
  | 'improvement'
  | 'redesign'
  | 'bug_fix'
  | 'announcement'
  | 'maintenance'
  | 'security_update'
  | 'action_required'
  | 'mandatory_update'

export type MaintenanceSeverity = 'low' | 'medium' | 'high' | 'critical'
export type Priority            = 'low' | 'medium' | 'high' | 'critical'

export type ProductUpdate = {
  id: number
  title: string
  body: string
  category: ProductUpdateCategory
  update_type: UpdateType
  status: ProductUpdateStatus
  target_roles: string[] | null
  notify_in_app: boolean
  notify_email: boolean
  published_at: string | null
  scheduled_at: string | null
  created_at: string
  updated_at: string
  created_by?: { id: number; name: string }
  is_read: boolean
  reads_count: number
  // CTA
  cta_label: string | null
  cta_url: string | null
  cta_external: boolean
  // Images
  image_url: string | null
  image_before_url: string | null
  image_after_url: string | null
  // Maintenance
  maintenance_start: string | null
  maintenance_end: string | null
  affected_services: string[] | null
  maintenance_severity: MaintenanceSeverity | null
  // Action / Security
  due_date: string | null
  assigned_to_roles: string[] | null
  priority: Priority | null
  requires_acknowledgement: boolean
  // Bug fix
  problem_description: string | null
  fix_description: string | null
  affected_users: string | null
  // Misc
  related_page_url: string | null
}

export type ProductUpdateStats = {
  total: number
  published: number
  draft: number
  archived: number
}

export type ProductUpdatePayload = {
  title: string
  body: string
  category: ProductUpdateCategory
  update_type: UpdateType
  target_roles?: string[] | null
  notify_in_app?: boolean
  notify_email?: boolean
  scheduled_at?: string | null
  // CTA
  cta_label?: string | null
  cta_url?: string | null
  cta_external?: boolean
  // Images
  image_url?: string | null
  image_before_url?: string | null
  image_after_url?: string | null
  // Maintenance
  maintenance_start?: string | null
  maintenance_end?: string | null
  affected_services?: string[] | null
  maintenance_severity?: MaintenanceSeverity | null
  // Action / Security
  due_date?: string | null
  assigned_to_roles?: string[] | null
  priority?: Priority | null
  requires_acknowledgement?: boolean
  // Bug fix
  problem_description?: string | null
  fix_description?: string | null
  affected_users?: string | null
  // Misc
  related_page_url?: string | null
}

type ListParams = {
  page?: number
  per_page?: number
  status?: ProductUpdateStatus
  category?: ProductUpdateCategory
  q?: string
}

type ListResponse = {
  success: boolean
  data: ProductUpdate[]
  meta: { current_page: number; last_page: number; total: number; per_page: number }
}

const silent = { skipErrorToast: true as const }

// ─── Public (any authenticated user) ─────────────────────────────────────────

export async function fetchProductUpdates(params: ListParams = {}): Promise<ListResponse> {
  const res = await apiClient.get<ListResponse>('/product-updates', { params })
  return res.data
}

export async function fetchProductUpdate(id: number): Promise<ProductUpdate> {
  const res = await apiClient.get<{ success: boolean; data: ProductUpdate }>(`/product-updates/${id}`)
  return res.data.data
}

export async function fetchWhatsNew(): Promise<ProductUpdate[]> {
  try {
    const res = await apiClient.get<{ success: boolean; data: ProductUpdate[] }>(
      '/product-updates/whats-new',
      silent,
    )
    return res.data.data ?? []
  } catch {
    return []
  }
}

export async function fetchUnreadCount(): Promise<number> {
  try {
    const res = await apiClient.get<{ success: boolean; count: number }>(
      '/product-updates/unread-count',
      silent,
    )
    return res.data.count ?? 0
  } catch {
    return 0
  }
}

export async function markProductUpdateRead(id: number): Promise<void> {
  await apiClient.post(`/product-updates/${id}/read`, {}, silent)
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function fetchProductUpdateStats(): Promise<ProductUpdateStats | null> {
  try {
    const res = await apiClient.get<{ success: boolean; data: ProductUpdateStats }>(
      '/product-updates/admin-stats',
      silent,
    )
    return res.data.data ?? null
  } catch {
    return null
  }
}

export async function createProductUpdate(payload: ProductUpdatePayload): Promise<ProductUpdate> {
  const res = await apiClient.post<{ success: boolean; data: ProductUpdate }>(
    '/product-updates',
    payload,
  )
  return res.data.data
}

export async function updateProductUpdate(
  id: number,
  payload: Partial<ProductUpdatePayload>,
): Promise<ProductUpdate> {
  const res = await apiClient.patch<{ success: boolean; data: ProductUpdate }>(
    `/product-updates/${id}`,
    payload,
  )
  return res.data.data
}

export async function publishProductUpdate(id: number): Promise<ProductUpdate> {
  const res = await apiClient.post<{ success: boolean; data: ProductUpdate }>(
    `/product-updates/${id}/publish`,
  )
  return res.data.data
}

export async function deleteProductUpdate(id: number): Promise<void> {
  await apiClient.delete(`/product-updates/${id}`)
}
