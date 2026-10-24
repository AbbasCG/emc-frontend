import type { ReporterTicket, Ticket } from '@/types/ticket'
import { fetchTicketDetail } from './ticketOpsService'

/**
 * A tiny, safe cache for ticket details.
 *
 *  - Memory only, never written to storage.
 *  - Keyed by the signed-in user as well as the ticket: what one person was allowed to see is never served to
 *    another, and the whole cache is dropped the moment the user changes (sign-out, impersonation, switch).
 *  - Short lived (20 s): it exists to make "hover, then click" and "reopen what I just closed" instant, not to
 *    be a source of truth. Any change made through the UI invalidates the ticket's entry.
 *  - Requests in flight are shared, so a hover prefetch followed by a click makes ONE request.
 *  - Failed requests are never cached.
 */

export type TicketDetail = Ticket | ReporterTicket

const TTL_MS = 20_000
const MAX_ENTRIES = 30

type Entry = { at: number; promise: Promise<TicketDetail> }

let owner: string | null = null
const entries = new Map<number, Entry>()

function own(userKey: string | number | null | undefined): boolean {
  const key = userKey == null ? null : String(userKey)
  if (key === null) {
    entries.clear()
    owner = null

    return false
  }
  if (owner !== key) {
    entries.clear()
    owner = key
  }

  return true
}

/** The ticket's details for this user: from the cache when fresh, otherwise one shared request. */
export function loadTicketDetail(userKey: string | number | null | undefined, id: number, opts: { force?: boolean } = {}): Promise<TicketDetail> {
  if (!own(userKey)) return fetchTicketDetail(id)

  const hit = entries.get(id)
  if (hit && !opts.force && Date.now() - hit.at < TTL_MS) return hit.promise

  const promise = fetchTicketDetail(id)
  const entry: Entry = { at: Date.now(), promise }
  entries.set(id, entry)
  if (entries.size > MAX_ENTRIES) entries.delete(entries.keys().next().value as number)
  // A failure must not stay cached.
  promise.catch(() => {
    if (entries.get(id) === entry) entries.delete(id)
  })

  return promise
}

/** Warm the cache for a ticket the user is about to open. Errors are swallowed: the real open reports them. */
export function prefetchTicketDetail(userKey: string | number | null | undefined, id: number): void {
  void loadTicketDetail(userKey, id).catch(() => {})
}

/** Forget one ticket (after a change) or everything. */
export function invalidateTicketDetail(id?: number): void {
  if (id === undefined) entries.clear()
  else entries.delete(id)
}

/** Whether a fresh entry exists (used by tests and the hover prefetch to avoid redundant work). */
export function hasFreshTicketDetail(userKey: string | number | null | undefined, id: number): boolean {
  const key = userKey == null ? null : String(userKey)
  const hit = entries.get(id)

  return key !== null && owner === key && !!hit && Date.now() - hit.at < TTL_MS
}
