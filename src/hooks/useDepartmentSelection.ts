import { useCallback, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useDepartmentAccess } from '@/hooks/useDepartmentAccess'
import type { DepartmentOption } from '@/api/operationsReportsApi'
import { readRememberedDepartment, rememberDepartment, resolveDepartmentSelection, type DepartmentSelectionSource } from '@/utils/departmentSelection'

export interface DepartmentSelectionState {
  departments: DepartmentOption[]
  /** The department the page should show, or null while loading / when the user must choose / when there is none. */
  departmentId: number | null
  /** Why `departmentId` is what it is (or why it is null). */
  source: DepartmentSelectionSource | 'picked'
  loading: boolean
  error: boolean
  /** A user's own pick. Remembered per user for next time. */
  select: (id: number | null) => void
}

/**
 * The department an admin page is working on, from the user's authorized (read) departments.
 * An explicit pick always wins while it stays authorized; otherwise `resolveDepartmentSelection` decides.
 */
export function useDepartmentSelection(): DepartmentSelectionState {
  const { user } = useAuth()
  const { readableDepartments, manifest, loading, error } = useDepartmentAccess()
  const userId = user?.id ?? null
  const [picked, setPicked] = useState<number | null>(null)

  const resolved = useMemo(
    () => resolveDepartmentSelection({ readable: readableDepartments, primaryId: manifest?.primary_department_id ?? null, rememberedId: readRememberedDepartment(userId) }),
    [readableDepartments, manifest?.primary_department_id, userId],
  )
  const pickedValid = picked !== null && readableDepartments.some((d) => d.id === picked)

  const select = useCallback(
    (id: number | null) => {
      setPicked(id)
      rememberDepartment(userId, id)
    },
    [userId],
  )

  return {
    departments: readableDepartments,
    departmentId: loading || error ? null : pickedValid ? picked : resolved.id,
    source: pickedValid ? 'picked' : resolved.source,
    loading,
    error,
    select,
  }
}
