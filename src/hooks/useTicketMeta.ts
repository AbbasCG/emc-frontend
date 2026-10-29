import { useMemo } from 'react'
import { ticketService } from '@/services/ticketService'
import type { Department, TicketUser } from '@/types/ticket'
import { useAbortableResource } from './useAbortableResource'

/**
 * Lookup data for the filters: the active departments (everyone may read them) and, once a
 * department is chosen, its assignable employees. The server returns the employee list only to
 * people who may manage that department, so for anyone else the assignee list is simply empty.
 */
export function useTicketMeta(departmentId: number | null) {
  const base = useAbortableResource(() => ticketService.getMeta(), 'base')
  const scoped = useAbortableResource(() => ticketService.getMeta({ department_id: departmentId ?? undefined }), `dept:${departmentId}`, departmentId !== null)

  const departments: Department[] = useMemo(() => base.data?.departments ?? [], [base.data])
  const users: TicketUser[] = useMemo(() => (departmentId !== null ? (scoped.data?.users ?? []) : []), [departmentId, scoped.data])

  return { departments, users, usersLoading: departmentId !== null && scoped.loading }
}
