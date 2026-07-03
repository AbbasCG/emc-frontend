import apiClient from './axios'

const silent = { skipErrorToast: true as const }

// Dashboard
export async function fetchQualityDashboard() {
  const res = await apiClient.get<any>('/quality/dashboard', silent)
  return res.data?.data ?? null
}

// Workshop requests (quality view)
export async function fetchQualityWorkshops(params?: Record<string, string>) {
  const res = await apiClient.get<any>('/quality/workshops', { ...silent, params })
  return res.data?.data ?? { data: [], meta: {} }
}

// Reviews
export async function fetchQualityReviews(params?: Record<string, string>) {
  const res = await apiClient.get<any>('/quality/reviews', { ...silent, params })
  return res.data?.data ?? { data: [], meta: {} }
}

export async function createQualityReview(body: Record<string, unknown>) {
  const res = await apiClient.post<any>('/quality/reviews', body)
  return res.data?.data
}

export async function updateQualityReview(id: number, body: Record<string, unknown>) {
  const res = await apiClient.patch<any>(`/quality/reviews/${id}`, body)
  return res.data?.data
}

export async function approveQualityReview(id: number) {
  const res = await apiClient.post<any>(`/quality/reviews/${id}/approve`)
  return res.data?.data
}

// Incidents
export async function fetchQualityIncidents(params?: Record<string, string>) {
  const res = await apiClient.get<any>('/quality/incidents', { ...silent, params })
  return res.data?.data ?? { data: [], meta: {} }
}

export async function createQualityIncident(body: Record<string, unknown>) {
  const res = await apiClient.post<any>('/quality/incidents', body)
  return res.data?.data
}

export async function updateQualityIncident(id: number, body: Record<string, unknown>) {
  const res = await apiClient.patch<any>(`/quality/incidents/${id}`, body)
  return res.data?.data
}

// Corrective Actions
export async function fetchCorrectiveActions(params?: Record<string, string>) {
  const res = await apiClient.get<any>('/quality/corrective-actions', { ...silent, params })
  return res.data?.data ?? { data: [], meta: {} }
}

export async function createCorrectiveAction(body: Record<string, unknown>) {
  const res = await apiClient.post<any>('/quality/corrective-actions', body)
  return res.data?.data
}

export async function updateCorrectiveAction(id: number, body: Record<string, unknown>) {
  const res = await apiClient.patch<any>(`/quality/corrective-actions/${id}`, body)
  return res.data?.data
}

// Team
export async function fetchQualityTeam() {
  const res = await apiClient.get<any>('/quality/team', silent)
  return res.data?.data ?? []
}

// Audit Logs
export async function fetchQualityAuditLogs(params?: Record<string, string>) {
  const res = await apiClient.get<any>('/quality/audit-logs', { ...silent, params })
  return res.data?.data ?? { data: [], meta: {} }
}

// Compliance
export async function fetchQualityCompliance() {
  const res = await apiClient.get<any>('/quality/compliance', silent)
  return res.data?.data ?? null
}
