import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import type { TicketFilters, TicketView } from '@/types/ticketOps'
import { DEFAULT_FILTERS, mergeIntoParams, parseFilters, parseTicketParam, parseView, withFilters } from '@/utils/ticketFilters'

type UpdateOpts = {
  /** Replace the current history entry instead of adding one (typing in the search box). */
  replace?: boolean
  /**
   * Also switch the view in the SAME update. Two separate updates in one tick do not chain (the second
   * is computed from the same starting query string and would overwrite the first), so anything that
   * changes filters and the view together must use this.
   */
  view?: TicketView
}

/**
 * The work queue's filters, view mode and open ticket, kept in the URL.
 *
 * The URL is the single source of truth: a refresh, the back and forward buttons and a pasted link
 * all restore the same screen, and nothing is read from it unvalidated (see parseFilters).
 *
 * Every update merges into the CURRENT query string, so changing one thing never erases another:
 * changing the page keeps every filter, and changing a filter returns to page 1 only because a
 * filter changed. Parameters that are not filters (`view`, `ticket`, `days`) are never touched by a
 * filter change.
 */
export function useTicketFilters() {
  const [params, setParams] = useSearchParams()

  const filters = useMemo(() => parseFilters(params), [params])
  const view = useMemo(() => parseView(params), [params])
  const ticketId = useMemo(() => parseTicketParam(params), [params])
  const days = useMemo(() => {
    const d = Number(params.get('days'))

    return [7, 14, 30, 90].includes(d) ? d : 30
  }, [params])

  /** Merge a patch into the filters (page resets to 1 unless the patch is only the page). */
  const update = useCallback(
    (patch: Partial<TicketFilters>, opts: UpdateOpts = {}) => {
      setParams(
        (prev) => {
          const next = mergeIntoParams(prev, withFilters(parseFilters(prev), patch))
          if (opts.view) {
            if (opts.view === 'table') next.delete('view')
            else next.set('view', opts.view)
            next.delete('ticket')
          }

          return next
        },
        { replace: opts.replace ?? false },
      )
    },
    [setParams],
  )

  /** Clear every filter; keeps the view mode and the open ticket. Sorting and page size go back to default too. */
  const reset = useCallback(() => {
    setParams((prev) => mergeIntoParams(prev, DEFAULT_FILTERS))
  }, [setParams])

  const setView = useCallback(
    (next: TicketView) => {
      setParams((prev) => {
        const p = new URLSearchParams(prev)
        if (next === 'table') p.delete('view')
        else p.set('view', next)
        p.delete('ticket')

        return p
      })
    },
    [setParams],
  )

  const setDays = useCallback(
    (next: number) => {
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          if (next === 30) p.delete('days')
          else p.set('days', String(next))

          return p
        },
        { replace: true },
      )
    },
    [setParams],
  )

  /** Opening adds a history entry (back closes the drawer); closing replaces it, so no dead entries pile up. */
  const openTicket = useCallback(
    (id: number) => {
      setParams((prev) => {
        const p = new URLSearchParams(prev)
        p.set('ticket', String(id))

        return p
      })
    },
    [setParams],
  )

  const closeTicket = useCallback(() => {
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        p.delete('ticket')

        return p
      },
      { replace: true },
    )
  }, [setParams])

  /** The exact current query string, handed to the detail page as "back" state. */
  const search = params.toString()

  return { filters, view, ticketId, days, search, update, reset, setView, setDays, openTicket, closeTicket }
}
