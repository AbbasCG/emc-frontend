import { useEffect, useState } from 'react'
import apiClient from '@/api/axios'
import { unwrapData } from '@/api/unwrap'

export type ServerRoleSlugsState = {
  /** Slugs of the `roles` table of this environment; `null` while loading or when the request failed. */
  slugs: ReadonlySet<string> | null
  /** True when the request failed: the static catalogue is used and the admin is warned (not blocked). */
  failed: boolean
}

/** Pulls the role slugs out of `GET /admin/roles/options` → `{ data: [{ value, label }] }` (also a bare array). */
export function parseRoleOptionSlugs(payload: unknown): Set<string> | null {
  const inner = unwrapData<unknown>(payload)
  if (!Array.isArray(inner)) return null
  const slugs = new Set<string>()
  for (const row of inner) {
    const raw = row && typeof row === 'object' ? (row as { value?: unknown }).value : row
    if (typeof raw === 'string' && raw.trim() !== '') slugs.add(raw.trim().toLowerCase())
  }
  return slugs
}

/**
 * The roles the server can actually assign in this environment. The front end offers a static catalogue, but the server
 * refuses any role whose row is missing from its `roles` table, so the forms cross-check against this list.
 * A failed request never blocks the page: `failed` lets the form warn and fall back to the static catalogue.
 */
export function useServerRoleSlugs(enabled = true): ServerRoleSlugsState {
  const [state, setState] = useState<ServerRoleSlugsState>({ slugs: null, failed: false })

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    apiClient
      .get<unknown>('/admin/roles/options', { skipErrorToast: true })
      .then((res) => {
        if (cancelled) return
        const slugs = parseRoleOptionSlugs(res.data)
        setState(slugs ? { slugs, failed: false } : { slugs: null, failed: true })
      })
      .catch(() => {
        if (!cancelled) setState({ slugs: null, failed: true })
      })
    return () => {
      cancelled = true
    }
  }, [enabled])

  return state
}
