/**
 * Which department an admin page should open on, decided from what the server says the user may read.
 *
 * Precedence (first match wins):
 *   1. exactly one authorized department            -> that one
 *   2. several, and a reliable primary/default      -> the primary
 *   3. several, no default, a remembered choice     -> the remembered one, if it is still authorized
 *   4. several, nothing to go on                    -> the user must choose ('choose')
 *   5. none                                         -> there is nothing to show ('none')
 *
 * It is never "the first one the API returned" and never a hardcoded id. This is a convenience for the
 * screen only: the API authorizes every read and write on its own, whatever is selected here.
 */

export type DepartmentSelectionSource = 'single' | 'primary' | 'restored' | 'choose' | 'none'

export interface DepartmentSelection {
  id: number | null
  source: DepartmentSelectionSource
}

export function resolveDepartmentSelection(input: {
  readable: ReadonlyArray<{ id: number }>
  primaryId?: number | null
  rememberedId?: number | null
}): DepartmentSelection {
  const { readable, primaryId, rememberedId } = input
  const has = (id: number | null | undefined): id is number => id != null && readable.some((d) => d.id === id)

  if (readable.length === 0) return { id: null, source: 'none' }
  if (readable.length === 1) return { id: readable[0].id, source: 'single' }
  if (has(primaryId)) return { id: primaryId, source: 'primary' }
  if (has(rememberedId)) return { id: rememberedId, source: 'restored' }

  return { id: null, source: 'choose' }
}

const KEY = 'emc.admin.department'

/** The department this user picked last time. Storage is per user, may be unavailable, and is only a hint. */
export function readRememberedDepartment(userId: string | number | null | undefined): number | null {
  if (userId == null) return null
  try {
    const raw = window.localStorage.getItem(`${KEY}.${userId}`)
    const n = raw === null ? NaN : Number(raw)

    return Number.isInteger(n) && n > 0 ? n : null
  } catch {
    return null
  }
}

export function rememberDepartment(userId: string | number | null | undefined, departmentId: number | null): void {
  if (userId == null) return
  try {
    if (departmentId === null) window.localStorage.removeItem(`${KEY}.${userId}`)
    else window.localStorage.setItem(`${KEY}.${userId}`, String(departmentId))
  } catch {
    /* blocked storage: the next visit simply asks again */
  }
}
