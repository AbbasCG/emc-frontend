import { useEffect, useState } from 'react'
import {
  fetchMyDepartmentAccess,
  type DepartmentAccessManifest,
  type DepartmentOption,
} from '@/api/operationsReportsApi'

type DepartmentAccessState = {
  manifest: DepartmentAccessManifest | null
  loading: boolean
  error: boolean
  /** Set only when the user has exactly one allowed department (locked-field case). */
  soleDepartmentId: number | null
  /** Departments the user may BROWSE/FILTER (read scope) — never implies create rights. */
  readableDepartments: DepartmentOption[]
  /** True when a department browse/filter control is meaningful for this user. */
  canViewMultipleDepartments: boolean
}

/**
 * Fetches the current user's department scope once per page — one allowed
 * department (locked field), several (limited dropdown), or global (full
 * selector). Shared by every operations screen that lets a user pick a
 * department, so the restriction logic lives in one place, not per-page.
 *
 * Read scope is exposed separately from create scope: a read-only global
 * user (quality) can browse every department while being unable to create.
 */
export function useDepartmentAccess(): DepartmentAccessState {
  const [manifest, setManifest] = useState<DepartmentAccessManifest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let alive = true
    void fetchMyDepartmentAccess()
      .then((data) => {
        if (alive) setManifest(data)
      })
      .catch(() => {
        if (alive) setError(true)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const soleDepartmentId =
    manifest && !manifest.can_select_any_department && manifest.allowed_departments.length === 1
      ? manifest.allowed_departments[0].id
      : null

  // An older backend without read-scope fields: its browsable set was the
  // create scope, so fall back to that rather than inventing access.
  const readableDepartments = manifest?.readable_departments ?? manifest?.allowed_departments ?? []
  const canViewMultipleDepartments =
    manifest?.can_view_multiple_departments ?? readableDepartments.length > 1

  return { manifest, loading, error, soleDepartmentId, readableDepartments, canViewMultipleDepartments }
}
