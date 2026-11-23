import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ticketService } from '@/services/ticketService'
import { useAuth } from '@/contexts/AuthContext'
import type { MyWorkMeta, MyWorkTicket, TicketStatus } from '@/types/ticket'

interface Override {
  status: TicketStatus
  /** The request number current when the change was made: only a LATER, successful read replaces it. */
  atSeq: number
}

/**
 * The tickets assigned to the current user (GET /v1/tickets/my-work), kept honest:
 *  - the server answers for the signed-in user only, so a reassigned ticket simply disappears from the old
 *    assignee's next read and appears (pending) in the new assignee's;
 *  - after an action the new status is shown AT ONCE (`applyLocal`) and then confirmed by a re-read, so the card
 *    never waits for the network and never keeps a status the server no longer has;
 *  - overlapping reads are ordered: a late answer of an older read can never overwrite a newer one;
 *  - a failed read is reported (`error`), never presented as an empty list.
 */
export function useMyTickets() {
  const { user } = useAuth()
  const userId = user?.id
  const [rows, setRows] = useState<MyWorkTicket[]>([])
  const [meta, setMeta] = useState<MyWorkMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [overrides, setOverrides] = useState<Record<number, Override>>({})
  const seq = useRef(0)

  const refresh = useCallback(async (): Promise<boolean> => {
    const id = ++seq.current
    try {
      const data = await ticketService.getMyWork()
      if (id !== seq.current) return true
      setRows(data.tickets)
      setMeta(data.meta)
      setError(false)
      // The server has spoken after these changes were made: it is the truth now.
      setOverrides((cur) => {
        const next: Record<number, Override> = {}
        for (const [k, v] of Object.entries(cur)) if (v.atSeq >= id) next[Number(k)] = v

        return next
      })

      return true
    } catch {
      if (id === seq.current) setError(true)

      return false
    } finally {
      if (id === seq.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount / user change; the loading flag is re-armed for the new user
    setLoading(true)
    setOverrides({})
    void refresh()
  }, [refresh, userId])

  /** Show a status we already know the server holds (the accept call succeeded) before the re-read confirms it. */
  const applyLocal = useCallback((ticketId: number, status: TicketStatus) => {
    setOverrides((cur) => ({ ...cur, [ticketId]: { status, atSeq: seq.current } }))
  }, [])

  const tickets = useMemo<MyWorkTicket[]>(
    () =>
      rows.map((t) => {
        const o = overrides[t.id]
        if (!o) return t

        return { ...t, status: o.status, capabilities: { ...t.capabilities, can_accept: false, can_reject: false } }
      }),
    [rows, overrides],
  )

  /** `truncated`: the server cut the list short, so more tickets exist than are shown. */
  return { tickets, meta, truncated: meta?.truncated === true, loading, error, refresh, applyLocal }
}
