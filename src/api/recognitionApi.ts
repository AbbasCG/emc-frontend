/**
 * Recognition API — type definitions and endpoint contract.
 *
 * BACKEND REQUIREMENTS (not yet implemented):
 * ─────────────────────────────────────────────────────────────
 * GET  /api/members/recognitions?month=YYYY-MM
 *      Returns all recognitions for the given month.
 *      Response: { data: Recognition[] }
 *
 * POST /api/admin/members/recognitions
 *      Grants a new recognition.
 *      Body: GrantRecognitionPayload
 *      Response: { data: Recognition }
 *
 *      When recipient_type = "department":
 *        1. Record the department recognition.
 *        2. Resolve all active members in that department.
 *        3. Create inherited recognition records for each member.
 *        4. Return the recognition with resolved_member_ids populated.
 *
 * Permitted roles for POST: super_admin, admin, hr_manager, department_manager
 * ─────────────────────────────────────────────────────────────
 */

import apiClient from './axios'

export type RecipientType = 'member' | 'department' | 'team'

export type RecognitionTypeName =
  | 'individual'
  | 'department'
  | 'best_department'
  | 'achievement'
  | 'contribution'
  | 'tech_support'
  | 'leadership'
  | 'volunteer_award'

export interface Recognition {
  id: number
  recipient_type: RecipientType
  recipient_id: number | string
  recipient_name: string
  recognition_type: RecognitionTypeName
  month: string // YYYY-MM
  title: string
  reason: string | null
  icon: string | null
  visibility: 'public' | 'internal'
  awarded_by: number | string
  awarded_at: string
  /**
   * Populated when recipient_type = "department".
   * Contains the IDs of all active members who inherited this badge.
   */
  resolved_member_ids?: number[]
}

export interface RecognitionStats {
  month: string
  total: number
  top_department: { id: string | number; name: string; member_count: number } | null
  top_member: { id: number; name: string; recognition_type: string } | null
}

export interface GrantRecognitionPayload {
  recipient_type: RecipientType
  recipient_id: number | string
  recognition_type: RecognitionTypeName
  month: string // YYYY-MM
  title: string
  reason?: string
  visibility: 'public' | 'internal'
}

/** Fetch recognitions for a given month. Returns [] if backend is not yet implemented. */
export async function fetchRecognitions(_month: string): Promise<Recognition[]> {
  try {
    const res = await apiClient.get<unknown>(`/members/recognitions?month=${_month}`, {
      skipErrorToast: true,
    } as Record<string, unknown>)
    const inner = (res.data as Record<string, unknown>)?.data
    return Array.isArray(inner) ? (inner as Recognition[]) : []
  } catch {
    return []
  }
}

/** Grant a new recognition. Throws BACKEND_NOT_IMPLEMENTED if the endpoint doesn't exist. */
export async function grantRecognition(payload: GrantRecognitionPayload): Promise<Recognition> {
  const res = await apiClient.post<unknown>('/admin/members/recognitions', payload)
  const inner = (res.data as Record<string, unknown>)?.data ?? res.data
  return inner as Recognition
}
