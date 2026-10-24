import { useCallback, useEffect, useRef, useState } from 'react'
import { invalidateTicketDetail, loadTicketDetail, type TicketDetail } from '@/services/ticketDetailCache'
import { httpStatus } from '@/services/ticketOpsService'

export interface TicketDetailState {
  data: TicketDetail | null
  /** True until the first answer for THIS ticket arrives. */
  loading: boolean
  /** True while a refresh is in flight (the previous data stays on screen). */
  refreshing: boolean
  error: unknown
  reload: () => void
}

/**
 * The details of one ticket, for the modal.
 *
 * The request starts the moment `ticketId` is set, through the shared cache (so a hover prefetch is used
 * instead of repeated). Never returns another ticket's data while a new one loads: data is only exposed when
 * its id matches. A late answer for a ticket the user already left is discarded. `reload()` bypasses the cache
 * and keeps the current data visible meanwhile.
 */
export function useTicketDetail(userKey: string | number | null | undefined, ticketId: number | null): TicketDetailState {
  const [state, setState] = useState<{ id: number | null; data: TicketDetail | null; error: unknown; loading: boolean; refreshing: boolean }>({
    id: null,
    data: null,
    error: null,
    loading: ticketId !== null,
    refreshing: false,
  })
  const seq = useRef(0)

  const run = useCallback(
    (id: number, force: boolean) => {
      const mine = ++seq.current
      if (force) invalidateTicketDetail(id)
      loadTicketDetail(userKey, id, { force })
        .then((data) => {
          if (mine === seq.current) setState({ id, data, error: null, loading: false, refreshing: false })
        })
        .catch((error) => {
          if (mine === seq.current) // A refresh that fails keeps what was on screen, except when the server says this user may no longer see the
          // ticket (403/404): then nothing of it may stay visible.
          setState((s) => ({ id, data: s.id === id && httpStatus(error) !== 403 && httpStatus(error) !== 404 ? s.data : null, error, loading: false, refreshing: false }))
        })
    },
    [userKey],
  )

  useEffect(() => {
    if (ticketId === null) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a new ticket resets to the loading state before its request starts
    setState({ id: ticketId, data: null, error: null, loading: true, refreshing: false })
    run(ticketId, false)

    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps -- a counter, not a DOM ref: bumping it discards any answer still in flight
      seq.current++
    }
  }, [ticketId, run])

  const reload = useCallback(() => {
    if (ticketId === null) return
    setState((s) => ({ ...s, error: null, refreshing: true, loading: s.data === null }))
    run(ticketId, true)
  }, [ticketId, run])

  const mine = ticketId !== null && state.id === ticketId
  const data = mine ? state.data : null

  return {
    data,
    loading: ticketId !== null && (!mine || state.loading) && data === null && !(mine && state.error),
    refreshing: mine && state.refreshing,
    error: mine ? state.error : null,
    reload,
  }
}
