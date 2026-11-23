import { useEffect, useState } from 'react'
import { ticketService } from '@/services/ticketService'
import type { TicketEstimateMode } from '@/lib/taskEstimate'

/**
 * The points each ticket size may be given (`meta().points_options`), for the ticket forms that do not already load
 * the meta for another reason. `pointsOptions` is null while loading and when the server sent none (an older one, or a
 * failed request): the form then falls back to the free number input, so nothing is ever blocked.
 */
export function useTicketPointsOptions(stored?: TicketEstimateMode['stored']): TicketEstimateMode {
  const [state, setState] = useState<{ done: boolean; options: TicketEstimateMode['pointsOptions'] }>({ done: false, options: null })

  useEffect(() => {
    let cancelled = false
    ticketService
      .getMeta()
      .then((meta) => {
        if (!cancelled) setState({ done: true, options: meta.points_options ?? null })
      })
      .catch(() => {
        if (!cancelled) setState({ done: true, options: null })
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { pointsOptions: state.options, pointsLoading: !state.done, stored }
}
