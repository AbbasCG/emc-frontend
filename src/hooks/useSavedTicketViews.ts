import { useCallback, useEffect, useState } from 'react'
import type { SavedTicketView } from '@/types/ticketOps'

const MAX_VIEWS = 12
const keyFor = (userId: number | string | null | undefined) => `emc.tickets.savedViews.v1:${userId ?? 'anon'}`

function read(key: string): SavedTicketView[] {
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? '[]') as unknown
    if (!Array.isArray(raw)) return []

    return raw
      .filter(
        (v): v is SavedTicketView =>
          !!v && typeof v === 'object' && typeof (v as SavedTicketView).id === 'string' && typeof (v as SavedTicketView).name === 'string' && typeof (v as SavedTicketView).query === 'string',
      )
      .slice(0, MAX_VIEWS)
  } catch {
    return []
  }
}

/**
 * Saved filter sets, kept in this browser for this user. A saved view stores filters ONLY: opening it
 * runs the normal query, so the server still decides what the person may see, and a view saved by
 * someone with wider access can never reveal anything to someone with less.
 */
export function useSavedTicketViews(userId: number | string | null | undefined) {
  const key = keyFor(userId)
  const [views, setViews] = useState<SavedTicketView[]>(() => read(key))

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reload when the signed-in user changes
    setViews(read(key))
  }, [key])

  const persist = useCallback(
    (next: SavedTicketView[]) => {
      setViews(next)
      try {
        localStorage.setItem(key, JSON.stringify(next))
      } catch {
        /* storage full or blocked: the view still works for this session */
      }
    },
    [key],
  )

  const add = useCallback(
    (name: string, query: string): SavedTicketView | null => {
      const clean = name.trim().slice(0, 40)
      if (!clean || views.length >= MAX_VIEWS) return null
      const view = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name: clean, query }
      persist([...views, view])

      return view
    },
    [persist, views],
  )

  const remove = useCallback((id: string) => persist(views.filter((v) => v.id !== id)), [persist, views])

  return { views, add, remove, isFull: views.length >= MAX_VIEWS, max: MAX_VIEWS }
}
