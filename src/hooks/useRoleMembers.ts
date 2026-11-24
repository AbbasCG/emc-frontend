import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchRoleMembers, type RoleMember } from '@/api/roleMembersApi'
import { getApiErrorMessage } from '@/api/apiErrors'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

const PER_PAGE = 15

/**
 * Members of one role, straight from `GET /admin/roles/{role}/users`: server-side search and
 * pagination. A failed load sets `error` — it NEVER degrades to an empty list, so «no members»
 * always means the server said so.
 */
export function useRoleMembers(roleSlug: string, enabled = true) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<RoleMember[]>([])
  const [total, setTotal] = useState(0)
  const [lastPage, setLastPage] = useState(1)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const requestId = useRef(0)

  const term = useDebouncedValue(search.trim(), 300)

  // A new search term or role starts from the first page — adjusted during render, not in an effect.
  const [seen, setSeen] = useState({ term, roleSlug })
  if (seen.term !== term || seen.roleSlug !== roleSlug) {
    setSeen({ term, roleSlug })
    setPage(1)
  }

  useEffect(() => {
    if (!enabled) return
    const id = ++requestId.current
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the loading flag must flip before the request starts, whenever its inputs change
    setLoading(true)
    setError(null)

    fetchRoleMembers(roleSlug, { search: term, page, perPage: PER_PAGE })
      .then((res) => {
        if (id !== requestId.current) return
        setItems(res.items)
        setTotal(res.total)
        setLastPage(res.lastPage)
      })
      .catch((e: unknown) => {
        if (id !== requestId.current) return
        setItems([])
        setTotal(0)
        setError(getApiErrorMessage(e))
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false)
      })
  }, [roleSlug, term, page, nonce, enabled])

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  return { search, setSearch, page, setPage, lastPage, items, total, loading, error, reload, perPage: PER_PAGE }
}
