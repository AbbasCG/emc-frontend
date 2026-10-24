import { useCallback, useMemo } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'

/**
 * Which record's detail window is open, kept in the URL (`?view=<id>`) next to the list's own filters.
 *
 * Opening adds a history entry, so browser Back closes the window and Forward reopens it. Closing after an
 * open from the list is a step back (the history stays clean and the list is exactly as it was); closing after a
 * direct link just removes the parameter. Nothing else in the query string is touched.
 */
export function useDetailParam(name = 'view') {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const raw = params.get(name)
  const id = useMemo(() => {
    const n = raw === null ? NaN : Number(raw)

    return Number.isInteger(n) && n > 0 ? n : null
  }, [raw])

  const open = useCallback(
    (next: number) => {
      const p = new URLSearchParams(params)
      p.set(name, String(next))
      // The marker says "this entry was opened from the list in this tab", which is what makes Back the right close.
      setParams(p, { state: { detailOpenedFromList: true } })
    },
    [name, params, setParams],
  )

  const close = useCallback(() => {
    if ((location.state as { detailOpenedFromList?: boolean } | null)?.detailOpenedFromList) {
      navigate(-1)

      return
    }
    const p = new URLSearchParams(params)
    p.delete(name)
    setParams(p, { replace: true })
  }, [location.state, name, navigate, params, setParams])

  return { id, open, close }
}
