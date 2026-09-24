import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { fetchMyPageAccess, type EffectivePageAccessRow } from '@/api/accessControlApi'
import { useAuth } from '@/contexts/AuthContext'
import { findPageForPath, isPathAllowed } from '@/utils/pageAccessMatch'

/**
 * EFFECTIVE PAGE ACCESS — the frontend's single source of page visibility.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THE BACKEND IS AUTHORITATIVE
 * ─────────────────────────────────────────────────────────────────────────
 * This context holds a CACHE of a decision the backend made, never a decision
 * of its own. It contains no role list, no department logic and no precedence
 * rules; it fetches /auth/me/page-access once per session and reads the answer.
 * Hiding a page here protects nothing on its own — every endpoint behind it
 * enforces its own authorization on every request, and always will.
 *
 * PAGE ACCESS != BUSINESS AUTHORIZATION: a visible page never implies that the
 * actions inside it are permitted.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * NOTHING IS PERSISTED
 * ─────────────────────────────────────────────────────────────────────────
 * The manifest lives in memory for the lifetime of the tab and is deliberately
 * NOT written to localStorage or sessionStorage. Persisted authorization can be
 * edited by the user, survives a revocation, and outlives the session it was
 * issued for. It is re-fetched whenever the authenticated identity changes.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * FAILURE IS NEVER A GRANT
 * ─────────────────────────────────────────────────────────────────────────
 * `status` distinguishes "still loading" from "loaded" from "failed", so a
 * consumer can hold rendering rather than briefly showing a page the user may
 * not have. A network failure leaves the manifest empty, which grants nothing.
 */

export type PageAccessStatus = 'idle' | 'loading' | 'ready' | 'error'

export type PageAccessContextValue = {
  status: PageAccessStatus
  /** Every catalog capability with the backend's decision and provenance. */
  pages: EffectivePageAccessRow[]
  /** Fast membership set for the allowed capabilities. */
  allowedKeys: ReadonlySet<string>
  /** True once a decision is available to act on. */
  isReady: boolean
  /** May this capability key be opened? Unknown keys are not allowed. */
  canAccessKey: (key: string) => boolean
  /**
   * May this URL be opened? `null` means no catalog capability owns the path,
   * which is not the same as a denial — see pageAccessMatch.isPathAllowed.
   */
  canAccessPath: (pathname: string) => boolean | null
  /** The capability owning a path, for labels and denial reasons. */
  pageForPath: (pathname: string) => EffectivePageAccessRow | null
  refresh: () => Promise<void>
}

const PageAccessContext = createContext<PageAccessContextValue | null>(null)

export function PageAccessProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth()
  const [pages, setPages] = useState<EffectivePageAccessRow[]>([])
  const [status, setStatus] = useState<PageAccessStatus>('idle')

  // Guards against a slow response for a previous identity overwriting a newer
  // one — switching accounts must never resolve to the old user's access.
  const requestRef = useRef(0)

  const load = useCallback(async () => {
    const requestId = ++requestRef.current
    setStatus('loading')

    try {
      const manifest = await fetchMyPageAccess()
      if (requestId !== requestRef.current) return
      setPages(manifest.pages)
      setStatus('ready')
    } catch {
      if (requestId !== requestRef.current) return
      // Deliberately clear: a failed manifest must not leave stale grants in
      // place, and an empty manifest grants nothing.
      setPages([])
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      requestRef.current++
      setPages([])
      setStatus('idle')
      return
    }

    void load()
  }, [isAuthenticated, user?.id, load])

  const value = useMemo<PageAccessContextValue>(() => {
    const allowedKeys = new Set(pages.filter((p) => p.allowed).map((p) => p.key))

    return {
      status,
      pages,
      allowedKeys,
      isReady: status === 'ready',
      canAccessKey: (key: string) => allowedKeys.has(key),
      canAccessPath: (pathname: string) => isPathAllowed(pages, pathname),
      pageForPath: (pathname: string) => findPageForPath(pages, pathname),
      refresh: load,
    }
  }, [pages, status, load])

  return <PageAccessContext.Provider value={value}>{children}</PageAccessContext.Provider>
}

export function usePageAccess(): PageAccessContextValue {
  const ctx = useContext(PageAccessContext)

  if (!ctx) {
    throw new Error('usePageAccess must be used within a PageAccessProvider')
  }

  return ctx
}
