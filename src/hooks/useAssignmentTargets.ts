import { useCallback, useEffect, useState } from 'react'
import { ticketService } from '@/services/ticketService'
import type { DepartmentalUnit, TicketUser } from '@/types/ticket'
import type { PointsOptions } from '@/lib/taskEstimate'

type DepartmentResult = { key: string; ok: true; units: DepartmentalUnit[]; users: TicketUser[]; pointsOptions: PointsOptions | null } | { key: string; ok: false }
type UnitResult = { key: string; ok: true; users: TicketUser[] } | { key: string; ok: false }

export type AssignmentPhase = 'loading' | 'error' | 'ready'

/**
 * Who can a ticket be assigned to, for ONE department.
 *
 * A department may have technical units or may have none:
 *  - without units, the members the server returns for the department are the candidates right away
 *    (the same response that told us there are no units; no second request) and no unit is ever sent;
 *  - with units, a unit must be chosen first and the members of THAT unit are loaded.
 *
 * Three explicit states, never conflated: `loading`, `error` (retryable; a failed load is never read as
 * "no units"), `ready`.
 *
 * Race safety: every list is stored together with the key (department + unit + attempt) it was fetched
 * for and is only ever READ for the current key, and an effect that is no longer current ignores its
 * response. A slow answer for an earlier unit therefore can neither replace a newer list nor bring back a
 * stale assignee. Changing the unit keeps the chosen assignee only if that person is in the new unit's list.
 *
 * Reuse for another ticket/department: mount it with a `key` (the modals do), so nothing carries over.
 */
export function useAssignmentTargets(departmentId: number, initialUnitId?: number | null) {
  const [attempt, setAttempt] = useState(0)
  const [unitAttempt, setUnitAttempt] = useState(0)
  const [rawUnit, setRawUnit] = useState(initialUnitId ? String(initialUnitId) : '')
  const [assignee, setAssignee] = useState('')
  const [department, setDepartment] = useState<DepartmentResult | null>(null)
  const [unitResult, setUnitResult] = useState<UnitResult | null>(null)

  const departmentKey = `${departmentId}:${attempt}`

  useEffect(() => {
    let cancelled = false
    ticketService
      .getMeta({ department_id: departmentId })
      .then((meta) => {
        if (!cancelled) setDepartment({ key: departmentKey, ok: true, units: meta.tech_units ?? [], users: meta.users ?? [], pointsOptions: meta.points_options ?? null })
      })
      .catch(() => {
        if (!cancelled) setDepartment({ key: departmentKey, ok: false })
      })

    return () => {
      cancelled = true
    }
  }, [departmentId, departmentKey])

  const current = department && department.key === departmentKey ? department : null
  const phase: AssignmentPhase = !current ? 'loading' : current.ok ? 'ready' : 'error'
  const units = current && current.ok ? current.units : []
  const hasUnits = phase === 'ready' && units.length > 0
  // A unit only counts if the department really has it (e.g. the ticket's old unit may no longer be listed).
  const unitId = hasUnits && units.some((u) => String(u.id) === rawUnit) ? rawUnit : ''
  const unitKey = `${departmentKey}:${unitId}:${unitAttempt}`

  useEffect(() => {
    if (!unitId) return
    let cancelled = false
    ticketService
      .getMeta({ department_id: departmentId, unit_id: Number(unitId) })
      .then((meta) => {
        if (cancelled) return
        const list = meta.users ?? []
        setUnitResult({ key: unitKey, ok: true, users: list })
        // Keep the chosen person only if the new unit has them too.
        setAssignee((prev) => (prev && list.some((u) => String(u.id) === prev) ? prev : ''))
      })
      .catch(() => {
        if (!cancelled) setUnitResult({ key: unitKey, ok: false })
      })

    return () => {
      cancelled = true
    }
  }, [departmentId, unitId, unitKey])

  const unitCurrent = unitResult && unitResult.key === unitKey ? unitResult : null
  const unitPending = hasUnits && unitId !== '' && !unitCurrent
  const usersError = hasUnits && unitId !== '' && unitCurrent !== null && !unitCurrent.ok
  const users: TicketUser[] =
    phase !== 'ready' ? [] : !hasUnits ? (current && current.ok ? current.users : []) : unitCurrent && unitCurrent.ok ? unitCurrent.users : []

  // The assignee is only ever the one in the CURRENT list.
  const assigneeId = users.some((u) => String(u.id) === assignee) ? assignee : ''

  const setUnit = useCallback((value: string) => {
    setRawUnit(value)
    if (!value) setAssignee('')
  }, [])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  const retryUsers = useCallback(() => setUnitAttempt((n) => n + 1), [])

  // The same meta answer carries the points options of the ticket forms: no extra request.
  const pointsOptions: PointsOptions | null = current && current.ok ? current.pointsOptions : null

  return {
    phase,
    pointsOptions,
    units,
    hasUnits,
    unitId,
    setUnit,
    users,
    usersLoading: unitPending,
    usersError,
    assigneeId,
    setAssignee,
    retry,
    retryUsers,
    /** Everything the assignment itself needs is in place. */
    canSubmit: phase === 'ready' && (!hasUnits || unitId !== '') && !unitPending && assigneeId !== '',
  }
}

export type AssignmentTargets = ReturnType<typeof useAssignmentTargets>
