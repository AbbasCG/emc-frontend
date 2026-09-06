import { useEffect, useState } from 'react'
import { fetchMyDepartmentAccess, type DepartmentAccessManifest } from '@/api/operationsReportsApi'

type DepartmentAccessState = {
  manifest: DepartmentAccessManifest | null
  loading: boolean
  error: boolean
  /** Set only when the user has exactly one allowed department (locked-field case). */
  soleDepartmentId: number | null
}

/**
 * Fetches the current user's department scope once per page — one allowed
 * department (locked field), several (limited dropdown), or global (full
 * selector). Shared by every operations screen that lets a user pick a
 * department, so the restriction logic lives in one place, not per-page.
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

  return { manifest, loading, error, soleDepartmentId }
}
