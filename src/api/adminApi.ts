import axios from 'axios'
import apiClient from './axios'
import { unwrapData } from './unwrap'
import type { AdminDashboardData } from '../types'

/**
 * Admin dashboard API.
 *
 * Backend route (Laravel):
 *   GET  /api/dashboard/admin   →  routes/api.php
 *   Controller: App\Http\Controllers\Api\DashboardController@admin
 *   Middleware: auth:sanctum + role:admin
 *
 * Response shape: { success: true, message: 'OK', data: AdminDashboardData }
 * `unwrapData` strips the envelope; consumers receive the inner data object.
 */
export async function fetchAdminDashboard(): Promise<AdminDashboardData> {
  // `skipErrorToast` lets the page render its own inline error UI (cleaner
  // Arabic message + retry button) instead of double-firing a global toast.
  const res = await apiClient.get<{ data: AdminDashboardData }>('/dashboard/admin', {
    skipErrorToast: true,
  })
  return unwrapData<AdminDashboardData>(res.data)
}

/** Discriminant for the inline UI on `AdminDashboard.tsx`. */
export type AdminDashboardErrorKind =
  | 'forbidden'   // 403 — authenticated but lacks admin role
  | 'notfound'    // 404 — endpoint not deployed yet
  | 'network'     // no response (server down / CORS / offline)
  | 'server'      // 5xx
  | 'unknown'     // anything else

/** Classify an axios error into a stable kind the UI can branch on. */
export function classifyAdminDashboardError(err: unknown): AdminDashboardErrorKind {
  if (!axios.isAxiosError(err)) return 'unknown'
  const status = err.response?.status
  if (!status) return 'network'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'notfound'
  if (status >= 500) return 'server'
  return 'unknown'
}
